import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { startEnrollment } from '@/app/lib/db/programRepo';

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: enrollmentId } = await params;
        const coachId = session.user.id;

        console.log('Starting program with enrollmentId:', enrollmentId, 'coachId:', coachId);

        if (!enrollmentId) {
            return NextResponse.json({ error: 'Enrollment ID is required' }, { status: 400 });
        }

        const result = await startEnrollment(enrollmentId, coachId);
        console.log('Start enrollment result:', result);

        return NextResponse.json({
            success: true,
            program: result
        });

    } catch (error) {
        console.error('Error starting program:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to start program' },
            { status: 500 }
        );
    }
}
