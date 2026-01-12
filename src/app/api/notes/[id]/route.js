import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { noteRepo } from '@/app/lib/db/noteRepo';

// GET /api/notes/[id] - Get note by ID
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const note = await noteRepo.getNoteById(id);

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Note fetched successfully',
            note: note
        });

    } catch (error) {
        console.error('Get note by ID error:', error);
        return NextResponse.json(
            { error: 'Failed to get note' },
            { status: 500 }
        );
    }
}

// PUT /api/notes/[id] - Update note
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { title, description } = body;

        // Validate required fields
        if (!title) {
            return NextResponse.json({
                error: 'Title is required'
            }, { status: 400 });
        }

        const noteData = {
            title,
            description: description || ''
        };

        const updatedNote = await noteRepo.updateNote(id, noteData);

        if (!updatedNote) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Note updated successfully',
            note: updatedNote
        });

    } catch (error) {
        console.error('Update note error:', error);
        return NextResponse.json(
            { error: 'Failed to update note' },
            { status: 500 }
        );
    }
}

// DELETE /api/notes/[id] - Delete note
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const deletedNote = await noteRepo.deleteNote(id);

        if (!deletedNote) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Note deleted successfully',
            noteId: deletedNote.id
        });

    } catch (error) {
        console.error('Delete note error:', error);
        return NextResponse.json(
            { error: 'Failed to delete note' },
            { status: 500 }
        );
    }
}
