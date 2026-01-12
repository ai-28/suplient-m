import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/client/subscriptions/check?productType=group|program
// Check if client has active subscription for a specific product type
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const productType = searchParams.get('productType');

        if (!productType || !['group', 'program'].includes(productType)) {
            return NextResponse.json({ 
                error: 'Invalid product type. Must be "group" or "program"' 
            }, { status: 400 });
        }

        const clientId = session.user.id;

        // Get client's active subscription for this product type
        const subscription = await sql`
            SELECT 
                cs.id,
                cs."stripeSubscriptionId",
                cs."coachId",
                cs."productType",
                cs.status,
                cs."currentPeriodStart",
                cs."currentPeriodEnd",
                cs."cancelAtPeriodEnd"
            FROM "ClientSubscription" cs
            WHERE cs."clientId" = ${clientId}
            AND cs."productType" = ${productType}
            AND cs.status IN ('active', 'trialing', 'past_due')
            ORDER BY cs."createdAt" DESC
            LIMIT 1
        `;

        if (subscription.length === 0) {
            return NextResponse.json({
                success: true,
                hasActiveSubscription: false,
                message: `No active ${productType} subscription found`
            });
        }

        const sub = subscription[0];
        const now = new Date();
        const periodEnd = new Date(sub.currentPeriodEnd);

        // Check if subscription period has ended (unless it's past_due which might have grace period)
        if (periodEnd < now && sub.status !== 'past_due') {
            return NextResponse.json({
                success: true,
                hasActiveSubscription: false,
                message: `Your ${productType} subscription has expired`
            });
        }

        return NextResponse.json({
            success: true,
            hasActiveSubscription: true,
            subscription: {
                id: sub.id,
                productType: sub.productType,
                status: sub.status,
                currentPeriodEnd: sub.currentPeriodEnd,
                cancelAtPeriodEnd: sub.cancelAtPeriodEnd
            }
        });

    } catch (error) {
        console.error('Error checking subscription status:', error);
        return NextResponse.json(
            { error: 'Failed to check subscription status', details: error.message },
            { status: 500 }
        );
    }
}

