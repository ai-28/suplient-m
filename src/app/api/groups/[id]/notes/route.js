import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { noteRepo } from '@/app/lib/db/noteRepo';

// GET /api/groups/[id]/notes - Get notes for a group
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        // Get notes for this group
        const notes = await noteRepo.getNotesByGroupId(id);

        return NextResponse.json({
            message: 'Group notes fetched successfully',
            notes: notes
        });

    } catch (error) {
        console.error('Get group notes error:', error);
        return NextResponse.json(
            { error: 'Failed to get group notes' },
            { status: 500 }
        );
    }
}

// POST /api/groups/[id]/notes - Create a new group note
export async function POST(request, { params }) {
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
            description: description || '',
            groupId: id
        };

        const newNote = await noteRepo.createGroupNote(noteData);

        return NextResponse.json({
            message: 'Group note created successfully',
            note: newNote
        }, { status: 201 });

    } catch (error) {
        console.error('Create group note error:', error);
        return NextResponse.json(
            { error: 'Failed to create group note' },
            { status: 500 }
        );
    }
}
