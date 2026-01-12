import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db/postgresql';

// GET - Fetch platform settings (public, no auth required)
export async function GET() {
  try {
    const [settings] = await sql`
      SELECT 
        "platformName",
        "supportEmail",
        "maxClientsPerCoach",
        "language",
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
          language: 'en'
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        maxClientsPerCoach: settings.maxClientsPerCoach,
        language: settings.language
      }
    });
  } catch (error) {
    console.error('Error fetching public platform settings:', error);
    return NextResponse.json(
      { 
        success: true,
        settings: {
          platformName: 'Mental Coach Platform',
          supportEmail: 'support@mentalcoach.com',
          maxClientsPerCoach: 20,
          language: 'en'
        }
      },
      { status: 200 }
    );
  }
}
