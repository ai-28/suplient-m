import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { duplicateProgramTemplate } from '@/app/lib/db/programRepo';

// POST /api/temp_programs/[id]/duplicate - Duplicate a program template
export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure user is a coach
        if (session.user.role !== 'coach' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied. Coaches only.' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { newName } = body;

        // Validation
        if (!newName || newName.trim().length === 0) {
            return NextResponse.json(
                { error: 'New program template name is required' },
                { status: 400 }
            );
        }

        // Duplicate the program template
        const duplicatedProgram = await duplicateProgramTemplate(id, newName.trim(), session.user.id);

        return NextResponse.json({
            message: 'Program template duplicated successfully',
            program: duplicatedProgram
        }, { status: 201 });

    } catch (error) {
        console.error('Error duplicating program template:', error);
        return NextResponse.json(
            { error: 'Failed to duplicate program template' },
            { status: 500 }
        );
    }
}