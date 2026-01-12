import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { userRepo } from "@/app/lib/db/userRepo";
import { checkUser2FAStatus, verifyToken, verifyBackupCode, removeUsedBackupCode } from "@/app/lib/auth/twoFactor";
import { sql } from "@/app/lib/db/postgresql";
import { checkCoachSubscriptionStatus } from "@/app/lib/subscription/checkSubscription";
import { checkClientAccess } from "@/app/lib/subscription/checkClientAccess";

const authOptions = {
    providers: [
        CredentialsProvider({
            id: 'credentials',
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                twoFactorToken: { label: "2FA Token", type: "text", optional: true },
                skip2FA: { label: "Skip 2FA", type: "text", optional: true }, // Internal flag for 2FA-verified logins
            },
            async authorize(credentials) {
                if (!credentials) {
                    return null;
                }
                const { email, password, twoFactorToken, skip2FA } = credentials;

                try {
                    // Normalize email to lowercase before authentication
                    const normalizedEmail = email.toLowerCase().trim();
                    const user = await userRepo.authenticate(normalizedEmail, password);

                    if (!user) {
                        return null;
                    }

                    // Check subscription status for coaches (payment control)
                    // Note: isActive (admin control) is already checked in userRepo.authenticate
                    if (user.role === 'coach') {
                        const subscriptionStatus = await checkCoachSubscriptionStatus(user.id);
                        
                        if (!subscriptionStatus.hasActiveSubscription) {
                            // Throw error with specific message for subscription issues
                            throw new Error(`SUBSCRIPTION_REQUIRED: ${subscriptionStatus.message}`);
                        }
                    }

                    // Check client access (if their coach's subscription is inactive)
                    if (user.role === 'client') {
                        const clientAccess = await checkClientAccess(user.id);
                        
                        if (!clientAccess.hasAccess) {
                            throw new Error(`ACCESS_DENIED: ${clientAccess.message}`);
                        }
                    }

                    // Check 2FA status
                    const twoFAStatus = await checkUser2FAStatus(user.id);

                    // If user has 2FA enabled, require verification (unless already verified)
                    if (twoFAStatus.has2FA && !skip2FA) {
                        // Trim and uppercase token to handle whitespace and case
                        const trimmedToken = typeof twoFactorToken === 'string' ? twoFactorToken.trim().toUpperCase() : '';

                        // More explicit check for missing/empty token
                        // Accept 6-digit TOTP codes or 8-character backup codes
                        const hasValidToken = trimmedToken &&
                            (trimmedToken.length === 6 || trimmedToken.length === 8);

                        console.log('2FA Check - has2FA:', twoFAStatus.has2FA, 'twoFactorToken type:', typeof twoFactorToken, 'twoFactorToken value:', JSON.stringify(twoFactorToken), 'trimmedToken:', trimmedToken, 'hasValidToken:', hasValidToken);

                        if (!hasValidToken) {
                            console.log('Throwing 2FA_VERIFICATION_REQUIRED - token is missing or invalid');
                            throw new Error("2FA_VERIFICATION_REQUIRED");
                        }

                        // Get user's 2FA secret and backup codes
                        const [userData] = await sql`
                            SELECT "twoFactorSecret", "twoFactorBackupCodes"
                            FROM "User"
                            WHERE id = ${user.id}
                        `;

                        if (!userData || !userData.twoFactorSecret) {
                            throw new Error("2FA not configured");
                        }

                        // Try TOTP verification first (only for 6-digit codes)
                        let totpValid = false;
                        if (trimmedToken.length === 6) {
                            totpValid = verifyToken(userData.twoFactorSecret, trimmedToken);
                        }

                        if (totpValid) {
                            // TOTP verified - proceed with login
                        } else if (userData.twoFactorBackupCodes && userData.twoFactorBackupCodes.length > 0) {
                            // Try backup code
                            const backupValid = verifyBackupCode(userData.twoFactorBackupCodes, trimmedToken);

                            if (backupValid) {
                                // Remove used backup code
                                const updatedBackupCodes = removeUsedBackupCode(userData.twoFactorBackupCodes, trimmedToken);

                                await sql`
                                    UPDATE "User"
                                    SET "twoFactorBackupCodes" = ${updatedBackupCodes}
                                    WHERE id = ${user.id}
                                `;
                            } else {
                                console.log('Backup code verification failed');
                                throw new Error("Invalid 2FA code");
                            }
                        } else {
                            console.log('TOTP verification failed, no backup codes available');
                            throw new Error("Invalid 2FA code");
                        }
                    }

                    // All checks passed
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        phone: user.phone,
                    };
                } catch (error) {
                    console.log("Authentication error:", error);
                    // Throw the specific error message to be handled by NextAuth
                    throw new Error(error.message);
                }
            }
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: "openid email profile"
                }
            }
        })
    ],
    pages: {
        error: '/login',
        signIn: '/login',
        signOut: '/login',
    },
    session: {
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
    callbacks: {
        async signIn({ user, account, profile }) {
            // Update lastActive for clients on sign-in
            if (user?.role === 'client' && user?.id) {
                try {
                    const clientResult = await sql`
                        SELECT c.id, c."lastActive"
                        FROM "Client" c
                        WHERE c."userId" = ${user.id}
                        LIMIT 1
                    `;

                    if (clientResult.length > 0) {
                        const client = clientResult[0];
                        const now = new Date();
                        
                        // Only update if lastActive is NULL or older than 1 hour (server-side throttling)
                        const shouldUpdate = !client.lastActive || 
                            (new Date(client.lastActive).getTime() < (now.getTime() - 60 * 60 * 1000));

                        if (shouldUpdate) {
                            // Store as UTC timestamp explicitly
                            await sql`
                                UPDATE "Client"
                                SET "lastActive" = (NOW() AT TIME ZONE 'UTC'),
                                    "updatedAt" = (NOW() AT TIME ZONE 'UTC')
                                WHERE id = ${client.id}
                            `;
                            console.log('✅ Updated lastActive for client on signIn:', user.id);
                        }
                    }
                } catch (error) {
                    // Don't fail sign-in if lastActive update fails
                    console.error('Error updating lastActive on signIn:', error);
                }
            }
            return true; // Allow sign-in to proceed
        },
        async jwt({ token, account, user, trigger, session: jwtSession }) {
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
            }
            if (user) {
                token.name = user.name;
                token.email = user.email;
                token.role = user.role;
                token.phone = user.phone;
                token.sub = user.id;
            }

            // Handle impersonation updates
            if (trigger === "update" && jwtSession?.impersonate) {
                const { targetUserId, targetUserRole, targetUserName, targetUserEmail } = jwtSession.impersonate;
                if (targetUserId) {
                    // Store original admin info
                    token.originalAdminId = token.originalAdminId || token.sub;
                    token.originalAdminRole = token.originalAdminRole || token.role;
                    token.originalAdminName = token.originalAdminName || token.name;
                    token.originalAdminEmail = token.originalAdminEmail || token.email; // Store original admin email
                    // Set active user (impersonated)
                    token.sub = targetUserId;
                    token.role = targetUserRole;
                    token.name = targetUserName;
                    token.email = targetUserEmail;
                } else {
                    // Stop impersonation - restore original admin
                    if (token.originalAdminId) {
                        token.sub = token.originalAdminId;
                        token.role = token.originalAdminRole;
                        token.name = token.originalAdminName;
                        token.email = token.originalAdminEmail; // Restore original admin email
                        delete token.originalAdminId;
                        delete token.originalAdminRole;
                        delete token.originalAdminName;
                        delete token.originalAdminEmail; // Clean up stored email
                    }
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub;
                session.user.name = token.name;
                session.user.email = token.email;
                session.user.role = token.role;
                session.user.phone = token.phone;
                session.accessToken = token.accessToken;
                session.refreshToken = token.refreshToken;
                session.expiresAt = token.expiresAt;

                // Add impersonation info if active
                if (token.originalAdminId) {
                    session.user.originalAdminId = token.originalAdminId;
                    session.user.originalAdminRole = token.originalAdminRole;
                    session.user.originalAdminName = token.originalAdminName;
                    session.user.isImpersonating = true;
                } else {
                    session.user.isImpersonating = false;
                }
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            // If the URL is relative, prepend the base URL
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            // If the URL is already absolute, return it
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
    },
};

export default authOptions;