import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { createProgramEnrollment } from '@/app/lib/db/programRepo';

// POST /api/programs/enroll - Enroll a client in a program from a template
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
        const { templateId, clientId } = body;

        // Validation
        if (!templateId) {
            return NextResponse.json(
                { error: 'Template ID is required' },
                { status: 400 }
            );
        }

        if (!clientId) {
            return NextResponse.json(
                { error: 'Client ID is required' },
                { status: 400 }
            );
        }

        // Create the program enrollment
        const enrollment = await createProgramEnrollment(
            templateId,
            clientId,
            session.user.id
        );

        return NextResponse.json({
            message: 'Client enrolled in program successfully',
            enrollment
        }, { status: 201 });

    } catch (error) {
        console.error('Error enrolling client in program:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to enroll client in program' },
            { status: 500 }
        );
    }
}
