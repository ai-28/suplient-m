import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { getClientById } from '@/app/lib/db/clientRepo';

// GET /api/clients/[id] - Get client by ID
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Get client data using repository function
        const response = await getClientById(id, session.user.id);

        if (!response) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Client data fetched successfully',
            data: response
        });

    } catch (error) {
        console.error('Get client by ID error:', error);
        return NextResponse.json(
            { error: 'Failed to get client data' },
            { status: 500 }
        );
    }
}
