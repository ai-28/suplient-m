import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/coach/payments - Get all payments received by the coach
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'coach') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const coachId = session.user.id;

        // Get coach's payments from database
        const payments = await sql`
            SELECT 
                cp.id,
                cp."stripePaymentIntentId",
                cp."clientId",
                cp."productType",
                cp.amount,
                cp.status,
                cp.description,
                cp."createdAt",
                u.name as "clientName",
                u.email as "clientEmail"
            FROM "ClientPayment" cp
            LEFT JOIN "User" u ON u.id = cp."clientId"
            WHERE cp."coachId" = ${coachId}
            ORDER BY cp."createdAt" DESC
            LIMIT 50
        `;

        return NextResponse.json({
            success: true,
            payments: payments.map(p => ({
                id: p.id,
                paymentIntentId: p.stripePaymentIntentId,
                clientId: p.clientId,
                clientName: p.clientName,
                clientEmail: p.clientEmail,
                productType: p.productType,
                amount: p.amount,
                status: p.status,
                description: p.description,
                createdAt: p.createdAt,
            }))
        });

    } catch (error) {
        console.error('Error fetching coach payments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payments', details: error.message },
            { status: 500 }
        );
    }
}

