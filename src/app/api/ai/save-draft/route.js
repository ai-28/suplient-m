import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programData, questionnaireData, draftId, name } = await request.json();
    const coachId = session.user.id;

    if (!programData || !questionnaireData) {
      return NextResponse.json(
        { error: 'Program data and questionnaire data are required' },
        { status: 400 }
      );
    }

    // Use program name from questionnaire as default name if not provided
    const draftName = name || questionnaireData.programName || 'Untitled Draft';

    if (draftId) {
      // Update existing draft
      const result = await sql`
        UPDATE "ProgramDraft"
        SET 
          "programData" = ${JSON.stringify(programData)}::JSONB,
          "questionnaireData" = ${JSON.stringify(questionnaireData)}::JSONB,
          name = ${draftName},
          "lastSavedAt" = NOW(),
          "updatedAt" = NOW()
        WHERE id = ${draftId} AND "coachId" = ${coachId}
        RETURNING id, name, "lastSavedAt", "createdAt"
      `;

      if (result.length === 0) {
        return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        draft: result[0],
        message: 'Draft updated successfully'
      });
    } else {
      // Create new draft
      const result = await sql`
        INSERT INTO "ProgramDraft" ("coachId", "programData", "questionnaireData", name, "lastSavedAt", "createdAt", "updatedAt")
        VALUES (${coachId}, ${JSON.stringify(programData)}::JSONB, ${JSON.stringify(questionnaireData)}::JSONB, ${draftName}, NOW(), NOW(), NOW())
        RETURNING id, name, "lastSavedAt", "createdAt"
      `;

      return NextResponse.json({
        success: true,
        draft: result[0],
        message: 'Draft saved successfully'
      });
    }
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save draft' },
      { status: 500 }
    );
  }
}

