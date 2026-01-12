import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find user with this token and check if it's not expired
    const [user] = await sql`
      SELECT id, "passwordResetExpires"
      FROM "User"
      WHERE "passwordResetToken" = ${token}
    `;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(user.passwordResetExpires);

    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('Error validating reset token:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

