import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import {
    getProgramTemplateById,
    updateProgramTemplate,
    deleteProgramTemplate,
    duplicateProgramTemplate
} from '@/app/lib/db/programRepo';

// GET /api/temp_programs/[id] - Get a specific program template by ID
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Program template ID is required' }, { status: 400 });
        }

        // Get the program template
        const program = await getProgramTemplateById(id);

        if (!program) {
            return NextResponse.json({ error: 'Program not found' }, { status: 404 });
        }

        // Check if user has access to this program
        if (program.coachId !== session.user.id && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({ program });

    } catch (error) {
        console.error('Error fetching program template:', error);
        return NextResponse.json(
            { error: 'Failed to fetch program template' },
            { status: 500 }
        );
    }
}

// PUT /api/temp_programs/[id] - Update a program template
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Program template ID is required' }, { status: 400 });
        }

        // Get the existing program template to check ownership
        const existingProgram = await getProgramTemplateById(id);
        if (!existingProgram) {
            return NextResponse.json({ error: 'Program template not found' }, { status: 404 });
        }

        // Check if user has access to this program
        if (existingProgram.coachId !== session.user.id && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const {
            name,
            description,
            duration,
            elements
        } = body;

        // Validation
        if (name !== undefined && (!name || name.trim().length === 0)) {
            return NextResponse.json(
                { error: 'Program template name cannot be empty' },
                { status: 400 }
            );
        }

        if (duration !== undefined && (duration < 1 || duration > 52)) {
            return NextResponse.json(
                { error: 'Duration must be between 1 and 52 weeks' },
                { status: 400 }
            );
        }

        // Update the program template
        const updatedProgram = await updateProgramTemplate(id, {
            name: name?.trim(),
            description: description?.trim(),
            duration: duration ? parseInt(duration) : undefined,
            elements: Array.isArray(elements) ? elements : undefined
        });

        return NextResponse.json({
            message: 'Program template updated successfully',
            program: updatedProgram
        });

    } catch (error) {
        console.error('Error updating program template:', error);
        return NextResponse.json(
            { error: 'Failed to update program template' },
            { status: 500 }
        );
    }
}

// DELETE /api/temp_programs/[id] - Delete a program template
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Program template ID is required' }, { status: 400 });
        }

        // Get the existing program template to check ownership
        const existingProgram = await getProgramTemplateById(id);
        if (!existingProgram) {
            return NextResponse.json({ error: 'Program template not found' }, { status: 404 });
        }

        // Check if user has access to this program
        if (existingProgram.coachId !== session.user.id && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Delete the program template
        const deleted = await deleteProgramTemplate(id);

        if (!deleted) {
            return NextResponse.json({ error: 'Failed to delete program template' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Program template deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting program template:', error);
        return NextResponse.json(
            { error: 'Failed to delete program template' },
            { status: 500 }
        );
    }
}
