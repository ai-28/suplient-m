import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET - Get all admin-assigned tasks for coach
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const coachId = session.user.id;

    // Get admin-assigned tasks
    const tasks = await sql`
      SELECT 
        t.id,
        t.title,
        t.description,
        t."dueDate",
        t.status,
        t."taskType",
        t."createdAt",
        t."updatedAt",
        u.name as "assignedByName",
        u.id as "assignedById"
      FROM "Task" t
      JOIN "User" u ON t."assignedBy" = u.id
      WHERE t."coachId" = ${coachId}
      AND t."assignedBy" IS NOT NULL
      ORDER BY t."createdAt" DESC
    `;

    // Calculate stats
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status !== 'completed').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        const dueDate = new Date(t.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      }).length
    };

    return NextResponse.json({
      success: true,
      tasks: tasks,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching admin tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
