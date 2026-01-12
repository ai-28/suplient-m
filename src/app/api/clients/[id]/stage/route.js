import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Await params as required by Next.js
        const { id } = await params;
        const { stage } = await request.json();

        if (!stage) {
            return NextResponse.json(
                { error: 'Stage is required' },
                { status: 400 }
            );
        }

        // Update client stageId
        await sql`
      UPDATE "Client"
      SET "stageId" = ${stage}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${id} AND "coachId" = ${session.user.id}
    `;

        return NextResponse.json({
            success: true,
            message: 'Client stage updated successfully'
        });

    } catch (error) {
        console.error('Error updating client stage:', error);
        return NextResponse.json(
            { error: 'Failed to update client stage' },
            { status: 500 }
        );
    }
}

