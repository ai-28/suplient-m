import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/coach/products - Get all products for the coach
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'coach') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const coachId = session.user.id;

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
            ORDER BY 
                CASE "productType"
                    WHEN 'one_to_one' THEN 1
                    WHEN 'program' THEN 2
                    WHEN 'group' THEN 3
                END
        `;

        return NextResponse.json({
            success: true,
            products: products
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json(
            { error: 'Failed to fetch products', details: error.message },
            { status: 500 }
        );
    }
}

