import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get group pipeline stages for the coach
        const stages = await sql`
      SELECT * FROM "GroupPipelineStage" 
      WHERE "coachId" = ${session.user.id}
      ORDER BY "order" ASC
    `;

        return NextResponse.json({
            success: true,
            stages
        });
    } catch (error) {
        console.error('Error fetching group pipeline stages:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pipeline stages' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { stages } = await request.json();

        if (!stages || !Array.isArray(stages)) {
            return NextResponse.json(
                { error: 'Stages array is required' },
                { status: 400 }
            );
        }

        // Use transaction to ensure atomicity
        await sql.begin(async (sql) => {
            // Delete existing stages for this coach
            await sql`
        DELETE FROM "GroupPipelineStage" 
        WHERE "coachId" = ${session.user.id}
      `;

            // Insert new stages
            for (let i = 0; i < stages.length; i++) {
                const stage = stages[i];
                await sql`
          INSERT INTO "GroupPipelineStage" 
          ("coachId", id, name, color, description, "isVisible", "order")
          VALUES (
            ${session.user.id},
            ${stage.id},
            ${stage.name},
            ${stage.color},
            ${stage.description || null},
            ${stage.isVisible !== undefined ? stage.isVisible : true},
            ${i}
          )
        `;
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Group pipeline stages saved successfully'
        });
    } catch (error) {
        console.error('Error saving group pipeline stages:', error);
        return NextResponse.json(
            { error: 'Failed to save pipeline stages' },
            { status: 500 }
        );
    }
}

