import { NextResponse } from 'next/server';
import { userRepo } from '@/app/lib/db/userRepo';
import { checkUser2FAStatus } from '@/app/lib/auth/twoFactor';
import { sql } from '@/app/lib/db/postgresql';
import { checkCoachSubscriptionStatus } from '@/app/lib/subscription/checkSubscription';
import { checkClientAccess } from '@/app/lib/subscription/checkClientAccess';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, twoFactorToken } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Authenticate user (verify password)
    // This already checks isActive (admin control)
    const user = await userRepo.authenticate(normalizedEmail, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check subscription status for coaches (payment control)
    if (user.role === 'coach') {
      const subscriptionStatus = await checkCoachSubscriptionStatus(user.id);
      
      if (!subscriptionStatus.hasActiveSubscription) {
        return NextResponse.json({
          success: false,
          subscriptionRequired: true,
          reason: subscriptionStatus.reason,
          message: subscriptionStatus.message,
          subscriptionEndDate: subscriptionStatus.endDate
        }, { status: 403 });
      }
    }

    // Check client access (if their coach's subscription is inactive)
    if (user.role === 'client') {
      const clientAccess = await checkClientAccess(user.id);
      
      if (!clientAccess.hasAccess) {
        return NextResponse.json({
          success: false,
          accessDenied: true,
          reason: clientAccess.reason,
          message: clientAccess.message
        }, { status: 403 });
      }
    }

    // Check 2FA status
    const twoFAStatus = await checkUser2FAStatus(user.id);

    // If platform 2FA is required but user hasn't set it up
    if (twoFAStatus.needsSetup) {
      return NextResponse.json({
        success: false,
        requires2FASetup: true,
        userId: user.id,
        message: '2FA setup required. Please set up two-factor authentication.'
      });
    }

    // If user has 2FA enabled, require verification
    if (twoFAStatus.has2FA) {
      if (!twoFactorToken) {
        return NextResponse.json({
          success: false,
          requires2FAVerification: true,
          userId: user.id,
          message: '2FA verification required'
        });
      }

      // Verify 2FA token
      const verifyResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/2fa/verify-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          token: twoFactorToken
        })
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResult.success || !verifyResult.verified) {
        return NextResponse.json(
          { error: 'Invalid 2FA code' },
          { status: 401 }
        );
      }
    }

    // Update lastActive for clients (after all checks pass)
    if (user.role === 'client') {
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
            console.log('✅ Updated lastActive for client on login:', user.id);
          }
        }
      } catch (error) {
        // Don't fail login if lastActive update fails
        console.error('Error updating lastActive on login:', error);
      }
    }

    // All checks passed - return user data for session creation
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}

