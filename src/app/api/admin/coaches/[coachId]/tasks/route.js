import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET - Get all tasks assigned to a coach by admin
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

    // Get tasks assigned by admin to this coach
    const tasks = await sql`
      SELECT 
        t.id,
        t.title,
        t.description,
        t."dueDate",
        t."taskType",
        t."coachId",
        t."assignedBy",
        t.status,
        t."createdAt",
        t."updatedAt",
        u.name as "assignedByName"
      FROM "Task" t
      LEFT JOIN "User" u ON t."assignedBy" = u.id
      WHERE t."coachId" = ${coachId}
      AND t."assignedBy" IS NOT NULL
      ORDER BY t."createdAt" DESC
    `;

    return NextResponse.json({
      success: true,
      tasks: tasks
    });
  } catch (error) {
    console.error('Error fetching coach tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new task assigned to a coach by admin
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coachId } = await params;
    const { title, description, dueDate } = await request.json();

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

    // Create task
    const [task] = await sql`
      INSERT INTO "Task" (
        title, 
        description, 
        "dueDate", 
        "taskType", 
        "coachId", 
        "assignedBy", 
        status, 
        "createdAt", 
        "updatedAt"
      )
      VALUES (
        ${title}, 
        ${description || ''}, 
        ${dueDate ? new Date(dueDate) : null}, 
        'admin_assigned', 
        ${coachId}, 
        ${session.user.id}, 
        'pending', 
        NOW(), 
        NOW()
      )
      RETURNING *
    `;

    // Send notification to coach about new task assigned by admin
    try {
      const { NotificationService } = require('@/app/lib/services/NotificationService');
      
      await NotificationService.notifyAdminTaskAssigned(
        coachId,
        session.user.id,
        session.user.name,
        title,
        task.id
      );
      console.log('✅ Task assignment notification sent to coach:', coach[0].name);
    } catch (notificationError) {
      console.error('❌ Error creating task assignment notification:', notificationError);
      // Don't fail task creation if notification fails
    }

    return NextResponse.json({
      success: true,
      task: task
    });
  } catch (error) {
    console.error('Error creating coach task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
