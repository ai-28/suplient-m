import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/programs/[id] - Get a specific program enrollment (active program instance) by ID
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
        }

        // Get the program enrollment with template data
        const enrollmentResult = await sql`
            SELECT 
                pe.*,
                pt.name,
                pt.description,
                pt.duration,
                pt."coachId" as "templateCoachId"
            FROM "ProgramEnrollment" pe
            JOIN "ProgramTemplate" pt ON pe."programTemplateId" = pt.id
            WHERE pe.id = ${id}
        `;

        if (enrollmentResult.length === 0) {
            return NextResponse.json({ error: 'Program not found' }, { status: 404 });
        }

        const enrollment = enrollmentResult[0];

        // Check if user has access to this program
        if (enrollment.coachId !== session.user.id && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get elements for the template
        const elementsResult = await sql`
            SELECT * FROM "ProgramTemplateElement"
            WHERE "programTemplateId" = ${enrollment.programTemplateId}
            ORDER BY week, day
        `;

        // Parse elementData for each element
        const elements = elementsResult.map(element => {
            let elementData = element.elementData || {};
            if (typeof elementData === 'string') {
                try {
                    elementData = JSON.parse(elementData);
                } catch (e) {
                    console.error('Error parsing elementData:', e);
                    elementData = {};
                }
            }
            return {
                ...element,
                data: elementData
            };
        });

        const program = {
            ...enrollment,
            elements: elements
        };

        return NextResponse.json({ program });

    } catch (error) {
        console.error('Error fetching program enrollment:', error);
        return NextResponse.json(
            { error: 'Failed to fetch program enrollment' },
            { status: 500 }
        );
    }
}

// PUT /api/programs/[id] - Update a program enrollment
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
        }

        // Get the existing enrollment to check ownership
        const enrollmentResult = await sql`
            SELECT * FROM "ProgramEnrollment" 
            WHERE id = ${id}
        `;

        if (enrollmentResult.length === 0) {
            return NextResponse.json({ error: 'Program enrollment not found' }, { status: 404 });
        }

        const enrollment = enrollmentResult[0];

        // Check if user has access to this program
        if (enrollment.coachId !== session.user.id && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Note: Program enrollments are read-only instances of templates
        // To update the program content, update the template instead
        // This endpoint can be used to update enrollment status, completedElements, etc.
        const { status, completedElements } = body;

        if (status === undefined && completedElements === undefined) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        // Build update query conditionally
        let result;
        if (status !== undefined && completedElements !== undefined) {
            result = await sql`
                UPDATE "ProgramEnrollment"
                SET 
                    status = ${status},
                    "completedElements" = ${completedElements}::uuid[],
                    "updatedAt" = NOW()
                WHERE id = ${id}
                RETURNING *
            `;
        } else if (status !== undefined) {
            result = await sql`
                UPDATE "ProgramEnrollment"
                SET 
                    status = ${status},
                    "updatedAt" = NOW()
                WHERE id = ${id}
                RETURNING *
            `;
        } else {
            result = await sql`
                UPDATE "ProgramEnrollment"
                SET 
                    "completedElements" = ${completedElements}::uuid[],
                    "updatedAt" = NOW()
                WHERE id = ${id}
                RETURNING *
            `;
        }

        // Get updated program with template data
        const updatedEnrollment = await sql`
            SELECT 
                pe.*,
                pt.name,
                pt.description,
                pt.duration,
                pt."coachId" as "templateCoachId"
            FROM "ProgramEnrollment" pe
            JOIN "ProgramTemplate" pt ON pe."programTemplateId" = pt.id
            WHERE pe.id = ${id}
        `;

        // Get elements
        const elementsResult = await sql`
            SELECT * FROM "ProgramTemplateElement"
            WHERE "programTemplateId" = ${updatedEnrollment[0].programTemplateId}
            ORDER BY week, day
        `;

        const elements = elementsResult.map(element => {
            let elementData = element.elementData || {};
            if (typeof elementData === 'string') {
                try {
                    elementData = JSON.parse(elementData);
                } catch (e) {
                    elementData = {};
                }
            }
            return {
                ...element,
                data: elementData
            };
        });

        const program = {
            ...updatedEnrollment[0],
            elements: elements
        };

        return NextResponse.json({
            message: 'Program enrollment updated successfully',
            program
        });

    } catch (error) {
        console.error('Error updating program enrollment:', error);
        return NextResponse.json(
            { error: 'Failed to update program enrollment' },
            { status: 500 }
        );
    }
}

