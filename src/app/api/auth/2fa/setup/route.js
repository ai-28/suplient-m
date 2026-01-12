import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { generateSecret } from '@/app/lib/auth/twoFactor';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user email and platform name
    const [user] = await sql`
      SELECT email FROM "User" WHERE id = ${userId}
    `;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get platform name from settings
    const [settings] = await sql`
      SELECT "platformName" FROM "PlatformSettings" LIMIT 1
    `;
    const platformName = settings?.platformName || 'Mental Coach Platform';

    // Generate secret and QR code
    const { secret, otpauth_url, qrCode } = await generateSecret(user.email, platformName);

    // Store secret temporarily (we'll save it after verification)
    // For now, we'll return it and the frontend will send it back for verification
    // In production, you might want to store it in a temporary session/cache

    return NextResponse.json({
      success: true,
      secret, // Send secret to frontend for verification step
      otpauth_url,
      qrCode
    });
  } catch (error) {
    console.error('Error generating 2FA setup:', error);
    return NextResponse.json(
      { error: 'Failed to generate 2FA setup' },
      { status: 500 }
    );
  }
}

