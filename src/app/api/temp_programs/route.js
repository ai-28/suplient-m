import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import {
    createProgramTemplate,
    getProgramTemplatesByCoach,
    getProgramTemplateStats
} from '@/app/lib/db/programRepo';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/temp_programs - Get all program templates for the authenticated coach
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure user is a coach
        if (session.user.role !== 'coach' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied. Coaches only.' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 50;
        const offset = parseInt(searchParams.get('offset')) || 0;

        // Get program templates for the coach
        const programs = await getProgramTemplatesByCoach(session.user.id, {
            limit,
            offset
        });

        // Get elements for each program template
        const programsWithElements = await Promise.all(
            programs.map(async (program) => {
                const elementsResult = await sql`
                    SELECT * FROM "ProgramTemplateElement"
                    WHERE "programTemplateId" = ${program.id}
                    ORDER BY week, day
                `;
                return {
                    ...program,
                    elements: elementsResult
                };
            })
        );

        // Get program template statistics
        const stats = await getProgramTemplateStats(session.user.id);

        return NextResponse.json({
            programs: programsWithElements,
            stats,
            pagination: {
                limit,
                offset,
                total: programsWithElements.length
            }
        });

    } catch (error) {
        console.error('Error fetching program templates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch program templates' },
            { status: 500 }
        );
    }
}

// POST /api/temp_programs - Create a new program template
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure user is a coach
        if (session.user.role !== 'coach' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied. Coaches only.' }, { status: 403 });
        }

        const body = await request.json();
        const {
            name,
            description,
            duration,
            elements = []
        } = body;

        // Validation
        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Program template name is required' },
                { status: 400 }
            );
        }

        if (!duration || duration < 1 || duration > 52) {
            return NextResponse.json(
                { error: 'Duration must be between 1 and 52 weeks' },
                { status: 400 }
            );
        }

        // Create the program template
        const program = await createProgramTemplate({
            name: name.trim(),
            description: description?.trim() || '',
            duration: parseInt(duration),
            coachId: session.user.id,
            elements: Array.isArray(elements) ? elements : []
        });

        return NextResponse.json({
            message: 'Program template created successfully',
            program
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating program template:', error);
        return NextResponse.json(
            { error: 'Failed to create program template' },
            { status: 500 }
        );
    }
}
