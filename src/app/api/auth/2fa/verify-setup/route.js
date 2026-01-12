import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { verifyToken, generateBackupCodes, hashBackupCode } from '@/app/lib/auth/twoFactor';
import { sql } from '@/app/lib/db/postgresql';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.error('2FA verify-setup: No session or user ID');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body;
        try {
            body = await request.json();
        } catch (error) {
            console.error('2FA verify-setup: JSON parse error', error);
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        const { secret, token } = body;

        console.log('2FA verify-setup request:', {
            userId: session.user.id,
            hasSecret: !!secret,
            hasToken: !!token,
            tokenLength: token?.length
        });

        if (!secret || !token) {
            console.error('2FA verify-setup: Missing secret or token', { 
                secret: !!secret, 
                token: !!token,
                secretValue: secret,
                tokenValue: token
            });
            return NextResponse.json(
                { error: 'Secret and token are required' },
                { status: 400 }
            );
        }

        if (typeof secret !== 'string' || typeof token !== 'string') {
            console.error('2FA verify-setup: Invalid types', { 
                secretType: typeof secret, 
                tokenType: typeof token,
                secretValue: secret,
                tokenValue: token
            });
            return NextResponse.json(
                { error: 'Secret and token must be strings' },
                { status: 400 }
            );
        }

        if (secret.trim().length === 0 || token.trim().length === 0) {
            console.error('2FA verify-setup: Empty secret or token');
            return NextResponse.json(
                { error: 'Secret and token cannot be empty' },
                { status: 400 }
            );
        }

        if (token.length !== 6) {
            console.error('2FA verify-setup: Invalid token length', { tokenLength: token.length });
            return NextResponse.json(
                { error: 'Token must be exactly 6 digits' },
                { status: 400 }
            );
        }

        // Verify the token
        const isValid = verifyToken(secret, token);

        console.log('2FA verify-setup: Token verification result', { isValid });

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid verification code. Please try again.' },
                { status: 400 }
            );
        }

        const userId = session.user.id;

        // Generate backup codes
        const backupCodes = generateBackupCodes(10);
        const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code));

        // Save 2FA to database
        await sql`
      UPDATE "User"
      SET 
        "twoFactorSecret" = ${secret},
        "twoFactorEnabled" = true,
        "twoFactorBackupCodes" = ${hashedBackupCodes},
        "twoFactorSetupDate" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `;

        // Return backup codes (only shown once)
        return NextResponse.json({
            success: true,
            message: '2FA enabled successfully',
            backupCodes // Send plain codes - user must save these
        });
    } catch (error) {
        console.error('Error verifying 2FA setup:', error);
        return NextResponse.json(
            { error: 'Failed to enable 2FA' },
            { status: 500 }
        );
    }
}

