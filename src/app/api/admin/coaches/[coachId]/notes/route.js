import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET - Get all notes for a coach
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coachId } = await params;

    // Verify coach exists
    const coach = await sql`
      SELECT id, name FROM "User" 
      WHERE id = ${coachId} AND role = 'coach' AND "isActive" = true
    `;

    if (coach.length === 0) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    // Get notes for this coach
    const notes = await sql`
      SELECT 
        n.id,
        n.title,
        n.description,
        n."coachId",
        n."createdBy",
        n."createdAt",
        n."updatedAt",
        u.name as "createdByName"
      FROM "Note" n
      LEFT JOIN "User" u ON n."createdBy" = u.id
      WHERE n."coachId" = ${coachId}
      ORDER BY n."createdAt" DESC
    `;

    return NextResponse.json({
      success: true,
      notes: notes
    });
  } catch (error) {
    console.error('Error fetching coach notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new note for a coach
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coachId } = await params;
    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Verify coach exists
    const coach = await sql`
      SELECT id, name FROM "User" 
      WHERE id = ${coachId} AND role = 'coach' AND "isActive" = true
    `;

    if (coach.length === 0) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    // Create note
    const [note] = await sql`
      INSERT INTO "Note" (title, description, "coachId", "createdBy", "createdAt", "updatedAt")
      VALUES (${title}, ${description || ''}, ${coachId}, ${session.user.id}, NOW(), NOW())
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      note: note
    });
  } catch (error) {
    console.error('Error creating coach note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
