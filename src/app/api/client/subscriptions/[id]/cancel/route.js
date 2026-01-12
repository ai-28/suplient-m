import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// POST /api/client/subscriptions/[id]/cancel - Cancel a subscription
export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = session.user.id;
        const subscriptionId = params.id;

        // Verify subscription belongs to client
        const subscription = await sql`
            SELECT "stripeSubscriptionId", "coachId"
            FROM "ClientSubscription"
            WHERE "clientId" = ${clientId}
            AND "stripeSubscriptionId" = ${subscriptionId}
            LIMIT 1
        `;

        if (subscription.length === 0) {
            return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        // Get coach's Connect account
        const coachAccount = await sql`
            SELECT sa."stripeConnectAccountId"
            FROM "StripeAccount" sa
            WHERE sa."userId" = ${subscription[0].coachId}
            LIMIT 1
        `;

        if (coachAccount.length === 0 || !coachAccount[0].stripeConnectAccountId) {
            return NextResponse.json({ error: 'Coach account not found' }, { status: 404 });
        }

        // Cancel subscription on coach's Connect account (cancel at period end)
        const updatedSubscription = await stripe.subscriptions.update(
            subscriptionId,
            { cancel_at_period_end: true },
            { stripeAccount: coachAccount[0].stripeConnectAccountId }
        );

        // Update database - keep status as active but mark for cancellation at period end
        // The webhook will handle the final cancellation when the period ends
        await sql`
            UPDATE "ClientSubscription"
            SET 
                "cancelAtPeriodEnd" = true,
                "status" = ${updatedSubscription.status},  -- Keep current status (usually 'active')
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "stripeSubscriptionId" = ${subscriptionId}
            AND "clientId" = ${clientId}
        `;

        return NextResponse.json({
            success: true,
            message: 'Subscription will be canceled at the end of the billing period'
        });

    } catch (error) {
        console.error('Error canceling subscription:', error);
        return NextResponse.json(
            { error: 'Failed to cancel subscription', details: error.message },
            { status: 500 }
        );
    }
}

