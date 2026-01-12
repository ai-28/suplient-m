import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/client/coach/products - Get coach's products for the client
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = session.user.id;

        // Get client's coach ID
        const clientData = await sql`
            SELECT "coachId" FROM "User"
            WHERE id = ${clientId} AND role = 'client'
            LIMIT 1
        `;

        if (clientData.length === 0 || !clientData[0].coachId) {
            return NextResponse.json({ 
                error: 'No coach assigned',
                products: []
            }, { status: 404 });
        }

        const coachId = clientData[0].coachId;

        // Get coach's products (program, group, and one_to_one)
        const products = await sql`
            SELECT 
                id,
                "productType",
                "stripeProductId",
                "stripePriceId",
                "amount",
                "currency",
                "isActive",
                "createdAt",
                "updatedAt"
            FROM "CoachProduct"
            WHERE "coachId" = ${coachId}
            AND "productType" IN ('program', 'group', 'one_to_one')
            AND "isActive" = true
            ORDER BY 
                CASE "productType"
                    WHEN 'program' THEN 1
                    WHEN 'group' THEN 2
                    WHEN 'one_to_one' THEN 3
                END
        `;

        return NextResponse.json({
            success: true,
            products: products,
            coachId: coachId
        });

    } catch (error) {
        console.error('Error fetching coach products:', error);
        return NextResponse.json(
            { error: 'Failed to fetch products', details: error.message },
            { status: 500 }
        );
    }
}

