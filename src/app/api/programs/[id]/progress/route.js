import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { markEnrollmentElementComplete, updateEnrollmentStatus } from '@/app/lib/db/programRepo';

// PUT /api/programs/[id]/progress - Update program progress
export async function PUT(request, { params }) {
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
        const { action, elementId, status } = body;

        if (!id) {
            return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
        }

        let result;

        switch (action) {
            case 'markElementComplete':
                if (!elementId) {
                    return NextResponse.json({ error: 'Element ID is required' }, { status: 400 });
                }
                result = await markEnrollmentElementComplete(id, elementId, session.user.id);
                break;

            case 'updateStatus':
                if (!status) {
                    return NextResponse.json({ error: 'Status is required' }, { status: 400 });
                }
                result = await updateEnrollmentStatus(id, status, session.user.id);
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({
            message: 'Program progress updated successfully',
            result
        });

    } catch (error) {
        console.error('Error updating program progress:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update program progress' },
            { status: 500 }
        );
    }
}
