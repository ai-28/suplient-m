import { NextResponse } from 'next/server';
import { verifyToken, verifyBackupCode, removeUsedBackupCode, checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/app/lib/auth/twoFactor';
import { sql } from '@/app/lib/db/postgresql';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, token } = body;

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'User ID and token are required' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many failed attempts. Please try again later.',
          resetAt: rateLimit.resetAt
        },
        { status: 429 }
      );
    }

    // Get user's 2FA secret and backup codes
    const [user] = await sql`
      SELECT "twoFactorSecret", "twoFactorBackupCodes"
      FROM "User"
      WHERE id = ${userId}
    `;

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA not configured for this user' },
        { status: 400 }
      );
    }

    // Try TOTP verification first
    const totpValid = verifyToken(user.twoFactorSecret, token);

    if (totpValid) {
      // Clear rate limit on success
      clearRateLimit(userId);
      return NextResponse.json({
        success: true,
        verified: true,
        method: 'totp'
      });
    }

    // If TOTP failed, try backup code
    if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
      const backupValid = verifyBackupCode(user.twoFactorBackupCodes, token);

      if (backupValid) {
        // Remove used backup code
        const updatedBackupCodes = removeUsedBackupCode(user.twoFactorBackupCodes, token);
        
        await sql`
          UPDATE "User"
          SET "twoFactorBackupCodes" = ${updatedBackupCodes}
          WHERE id = ${userId}
        `;

        // Clear rate limit on success
        clearRateLimit(userId);
        return NextResponse.json({
          success: true,
          verified: true,
          method: 'backup',
          remainingBackupCodes: updatedBackupCodes.length
        });
      }
    }

    // Both failed - record attempt
    recordFailedAttempt(userId);
    
    return NextResponse.json(
      { error: 'Invalid verification code' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error verifying 2FA login:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA code' },
      { status: 500 }
    );
  }
}

