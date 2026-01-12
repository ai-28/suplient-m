import { sql } from '../../../lib/db/postgresql';

async function createIntegrationTables() {
  try {
    // Check if User table exists first
    const userTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'User'
      );
    `;

    if (!userTableExists[0].exists) {
      throw new Error('User table does not exist. Please run the main seed first: /api/seed');
    }

    // 1. Create CoachIntegration table to store OAuth tokens and settings
    await sql`
      CREATE TABLE IF NOT EXISTS "CoachIntegration" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "coachId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL CHECK (platform IN ('google_calendar', 'zoom', 'teams')),
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "tokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "scope" TEXT,
        "platformUserId" VARCHAR(255), -- External platform user ID
        "platformEmail" VARCHAR(255), -- External platform email
        "platformName" VARCHAR(255), -- Display name from platform
        "isActive" BOOLEAN DEFAULT true,
        "settings" JSONB DEFAULT '{}', -- Platform-specific settings
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Ensure one integration per platform per coach
        CONSTRAINT uk_coach_platform UNIQUE("coachId", "platform")
      );
    `;

    // Check if Session table exists
    const sessionTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Session'
      );
    `;

    if (!sessionTableExists[0].exists) {
      throw new Error('Session table does not exist. Please run the main seed first: /api/seed');
    }

    // 2. Create IntegrationEvent table to track external calendar events
    await sql`
      CREATE TABLE IF NOT EXISTS "IntegrationEvent" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "sessionId" UUID NOT NULL REFERENCES "Session"(id) ON DELETE CASCADE,
        "integrationId" UUID NOT NULL REFERENCES "CoachIntegration"(id) ON DELETE CASCADE,
        "platformEventId" VARCHAR(255) NOT NULL, -- External platform event ID
        "platformMeetingId" VARCHAR(255), -- Meeting ID for video platforms
        "meetingUrl" TEXT, -- Meeting join URL
        "meetingPassword" VARCHAR(50), -- Meeting password if required
        "calendarEventId" VARCHAR(255), -- Google Calendar event ID
        "status" VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'updated')),
        "lastSyncAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Ensure one event per session per integration
        CONSTRAINT uk_session_integration UNIQUE("sessionId", "integrationId")
      );
    `;

    // 3. Add integration fields to Session table
    await sql`
      ALTER TABLE "Session" 
      ADD COLUMN IF NOT EXISTS "integrationPlatform" VARCHAR(50) CHECK ("integrationPlatform" IN ('google_calendar', 'zoom', 'teams', 'none')),
      ADD COLUMN IF NOT EXISTS "integrationSettings" JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "autoCreateMeeting" BOOLEAN DEFAULT false;
    `;

    // 4. Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_coach_integration_coach_id ON "CoachIntegration"("coachId")`;
    await sql`CREATE INDEX IF NOT EXISTS idx_coach_integration_platform ON "CoachIntegration"("platform")`;
    await sql`CREATE INDEX IF NOT EXISTS idx_integration_event_session_id ON "IntegrationEvent"("sessionId")`;
    await sql`CREATE INDEX IF NOT EXISTS idx_integration_event_integration_id ON "IntegrationEvent"("integrationId")`;

    // 5. Create triggers for updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_integration_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await sql`
      DROP TRIGGER IF EXISTS update_coach_integration_updated_at ON "CoachIntegration";
      CREATE TRIGGER update_coach_integration_updated_at 
        BEFORE UPDATE ON "CoachIntegration" 
        FOR EACH ROW EXECUTE FUNCTION update_integration_updated_at();
    `;

    await sql`
      DROP TRIGGER IF EXISTS update_integration_event_updated_at ON "IntegrationEvent";
      CREATE TRIGGER update_integration_event_updated_at 
        BEFORE UPDATE ON "IntegrationEvent" 
        FOR EACH ROW EXECUTE FUNCTION update_integration_updated_at();
    `;

  } catch (error) {
    console.error('Error creating integration tables:', error);
    throw error;
  }
}

export async function GET() {
  try {
    await createIntegrationTables();
    return new Response(JSON.stringify({
      message: 'Integration tables seeded successfully',
      details: 'CoachIntegration, IntegrationEvent tables created and Session table enhanced with integration fields'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Integration seeding error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Integration tables seeding failed',
      details: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Also support POST method for manual seeding
export async function POST() {
  return GET();
}
