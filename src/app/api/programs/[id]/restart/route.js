import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { restartEnrollment } from '@/app/lib/db/programRepo';

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: 'Enrollment ID is required' }, { status: 400 });
        }

        const result = await restartEnrollment(id, session.user.id);

        return NextResponse.json({
            success: true,
            enrollment: result
        });

    } catch (error) {
        console.error('Error restarting enrollment:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to restart program' },
            { status: 500 }
        );
    }
}
