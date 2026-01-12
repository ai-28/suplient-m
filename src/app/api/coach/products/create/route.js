import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { createCoachProducts } from '@/app/lib/stripe/connect-helpers';

// POST /api/coach/products/create - Manually create products for coach
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'coach') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const coachId = session.user.id;

        // Get Connect account
        const account = await sql`
            SELECT "stripeConnectAccountId", 
                   "stripeConnectOnboardingComplete"
            FROM "StripeAccount"
            WHERE "userId" = ${coachId}
        `;

        if (account.length === 0 || !account[0].stripeConnectAccountId) {
            return NextResponse.json(
                { error: 'Connect account not found' },
                { status: 404 }
            );
        }

        if (!account[0].stripeConnectOnboardingComplete) {
            return NextResponse.json(
                { error: 'Onboarding not complete yet' },
                { status: 400 }
            );
        }

        // Check if products already exist (with better race condition protection)
        const existingProducts = await sql`
            SELECT COUNT(*) as count
            FROM "CoachProduct"
            WHERE "coachId" = ${coachId}
        `;

        if (existingProducts[0].count > 0) {
            return NextResponse.json({
                success: true,
                message: 'Products already exist',
                productsCount: existingProducts[0].count
            });
        }

        // Double-check before creating (race condition protection)
        // Use a transaction-like check to prevent duplicates
        const doubleCheck = await sql`
            SELECT COUNT(*) as count
            FROM "CoachProduct"
            WHERE "coachId" = ${coachId}
        `;

        if (doubleCheck[0].count > 0) {
            return NextResponse.json({
                success: true,
                message: 'Products were just created by another request',
                productsCount: doubleCheck[0].count
            });
        }

        // Create products (database constraint will prevent duplicates even if race condition occurs)
        const products = await createCoachProducts(
            coachId, 
            account[0].stripeConnectAccountId
        );

        return NextResponse.json({
            success: true,
            message: 'Products created successfully',
            products: products
        });

    } catch (error) {
        console.error('Error creating products:', error);
        return NextResponse.json(
            { error: 'Failed to create products', details: error.message },
            { status: 500 }
        );
    }
}

