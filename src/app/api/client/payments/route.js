import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/client/payments - Get all client payments
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = session.user.id;

        // Get query parameters for filtering
        const { searchParams } = new URL(request.url);
        const coachId = searchParams.get('coachId');
        const productType = searchParams.get('productType');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');

        // Build query with filters
        let query = sql`
            SELECT 
                cp.id,
                cp."stripePaymentIntentId",
                cp."coachId",
                cp."productType",
                cp.amount,
                cp.status,
                cp.description,
                cp."sessionId",
                cp."createdAt",
                u.name as "coachName"
            FROM "ClientPayment" cp
            LEFT JOIN "User" u ON u.id = cp."coachId"
            WHERE cp."clientId" = ${clientId}
        `;

        if (coachId) {
            query = sql`${query} AND cp."coachId" = ${coachId}`;
        }

        if (productType) {
            query = sql`${query} AND cp."productType" = ${productType}`;
        }

        if (status) {
            query = sql`${query} AND cp.status = ${status}`;
        }

        query = sql`${query} ORDER BY cp."createdAt" DESC LIMIT ${limit}`;

        const payments = await query;

        return NextResponse.json({
            success: true,
            payments: payments.map(p => ({
                id: p.id,
                paymentIntentId: p.stripePaymentIntentId,
                coachId: p.coachId,
                coachName: p.coachName,
                productType: p.productType,
                amount: p.amount,
                status: p.status,
                description: p.description,
                sessionId: p.sessionId,
                createdAt: p.createdAt,
            }))
        });

    } catch (error) {
        console.error('Error fetching client payments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payments', details: error.message },
            { status: 500 }
        );
    }
}

