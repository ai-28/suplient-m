import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET - Fetch platform settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [settings] = await sql`
      SELECT 
        "platformName",
        "supportEmail",
        "maxClientsPerCoach",
        "language",
        "twoFactorAuthEnabled",
        "updatedAt"
      FROM "PlatformSettings"
      LIMIT 1
    `;

    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json({
        success: true,
        settings: {
          platformName: 'Mental Coach Platform',
          supportEmail: 'support@mentalcoach.com',
          maxClientsPerCoach: 20,
          language: 'en',
          twoFactorAuthEnabled: false
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update platform settings
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      platformName,
      supportEmail,
      maxClientsPerCoach,
      language,
      twoFactorAuthEnabled
    } = body;

    // Validate required fields
    if (platformName === undefined || !platformName.trim()) {
      return NextResponse.json(
        { error: 'Platform name is required' },
        { status: 400 }
      );
    }

    if (supportEmail === undefined || !supportEmail.trim()) {
      return NextResponse.json(
        { error: 'Support email is required' },
        { status: 400 }
      );
    }

    if (maxClientsPerCoach === undefined || maxClientsPerCoach < 1) {
      return NextResponse.json(
        { error: 'Max clients per coach must be at least 1' },
        { status: 400 }
      );
    }

    // Check if settings exist
    const existing = await sql`SELECT id FROM "PlatformSettings" LIMIT 1`;

    if (existing.length === 0) {
      // Insert new settings
      const [newSettings] = await sql`
        INSERT INTO "PlatformSettings" (
          "platformName",
          "supportEmail",
          "maxClientsPerCoach",
          "language",
          "twoFactorAuthEnabled",
          "updatedAt"
        )
        VALUES (
          ${platformName.trim()},
          ${supportEmail.trim()},
          ${maxClientsPerCoach},
          ${language || 'en'},
          ${twoFactorAuthEnabled || false},
          NOW()
        )
        RETURNING *
      `;

      return NextResponse.json({
        success: true,
        settings: newSettings
      });
    } else {
      // Update existing settings
      const [updatedSettings] = await sql`
        UPDATE "PlatformSettings"
        SET 
          "platformName" = ${platformName.trim()},
          "supportEmail" = ${supportEmail.trim()},
          "maxClientsPerCoach" = ${maxClientsPerCoach},
          "language" = ${language || 'en'},
          "twoFactorAuthEnabled" = ${twoFactorAuthEnabled || false},
          "updatedAt" = NOW()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;

      return NextResponse.json({
        success: true,
        settings: updatedSettings
      });
    }
  } catch (error) {
    console.error('Error updating platform settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
