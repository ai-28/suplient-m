import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { getClientProgramsWithTemplates } from '@/app/lib/db/programRepo';

// GET /api/programs/client/[id] - Get all programs for a specific client
export async function GET(request, { params }) {
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

        if (!id) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
        }

        // Get client programs with template data
        const programs = await getClientProgramsWithTemplates(id, session.user.id);

        return NextResponse.json({
            programs,
            clientId: id
        });

    } catch (error) {
        console.error('Error fetching client programs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch client programs' },
            { status: 500 }
        );
    }
}
