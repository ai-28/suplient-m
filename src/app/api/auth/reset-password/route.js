import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db/postgresql';
import crypto from 'crypto';

const HASH_ITERATIONS = 10000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = 'sha512';

function generateSalt() {
  return crypto.randomBytes(16).toString('base64');
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('base64');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Find user with this token
    const [user] = await sql`
      SELECT id, "passwordResetExpires", salt
      FROM "User"
      WHERE "passwordResetToken" = ${token}
    `;

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(user.passwordResetExpires);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Generate new salt and hash password
    const newSalt = generateSalt();
    const hashedPassword = hashPassword(password, newSalt);

    // Update password and clear reset token
    await sql`
      UPDATE "User"
      SET 
        password = ${hashedPassword},
        salt = ${newSalt},
        "passwordResetToken" = NULL,
        "passwordResetExpires" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
    `;

    console.log(`✅ Password reset successful for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

