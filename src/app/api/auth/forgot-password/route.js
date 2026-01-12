import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db/postgresql';
import { sendPasswordResetEmail } from '@/app/lib/email';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const [user] = await sql`
      SELECT id, name, email
      FROM "User"
      WHERE LOWER(email) = LOWER(${normalizedEmail})
    `;

    // Don't reveal if email exists or not (security best practice)
    // Always return success, but only send email if user exists
    if (user) {
      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Set expiration to 1 hour from now
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1);

      // Save token and expiration to database
      await sql`
        UPDATE "User"
        SET 
          "passwordResetToken" = ${resetToken},
          "passwordResetExpires" = ${resetExpires},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${user.id}
      `;

      // Send password reset email
      try {
        await sendPasswordResetEmail({
          name: user.name,
          email: user.email,
          resetToken: resetToken
        });
        console.log(`✅ Password reset email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`❌ Error sending password reset email to ${user.email}:`, emailError);
        // Don't fail the request if email fails
      }
    }

    // Always return success (don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Error processing forgot password request:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

