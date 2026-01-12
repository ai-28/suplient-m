import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// POST /api/coach/subscription/cancel - Cancel a coach's subscription (coach to platform)
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'coach') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const coachId = session.user.id;

        // Get coach's subscription from database
        const accountData = await sql`
            SELECT "stripeSubscriptionId", "stripeSubscriptionStatus", "stripeSubscriptionCancelAtPeriodEnd"
            FROM "StripeAccount"
            WHERE "userId" = ${coachId}
            LIMIT 1
        `;

        if (accountData.length === 0 || !accountData[0].stripeSubscriptionId) {
            return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
        }

        const subscriptionId = accountData[0].stripeSubscriptionId;
        const currentStatus = accountData[0].stripeSubscriptionStatus;
        const alreadyCanceling = accountData[0].stripeSubscriptionCancelAtPeriodEnd;

        // Check if subscription is already canceled or canceling
        if (currentStatus === 'canceled' || alreadyCanceling) {
            return NextResponse.json({ 
                error: 'Subscription is already canceled or scheduled for cancellation' 
            }, { status: 400 });
        }

        // Cancel subscription in Stripe (platform account - no stripeAccount parameter)
        // This will cancel at period end, not immediately
        const updatedSubscription = await stripe.subscriptions.update(
            subscriptionId,
            { cancel_at_period_end: true }
        );

        console.log(`✅ Coach subscription canceled: ${subscriptionId} for coach ${coachId}`);

        // Update database - keep status as active but mark for cancellation at period end
        // The webhook will handle the final cancellation when the period ends
        await sql`
            UPDATE "StripeAccount"
            SET 
                "stripeSubscriptionCancelAtPeriodEnd" = true,
                "stripeSubscriptionStatus" = ${updatedSubscription.status},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "stripeSubscriptionId" = ${subscriptionId}
            AND "userId" = ${coachId}
        `;

        return NextResponse.json({
            success: true,
            message: 'Subscription will be canceled at the end of the billing period',
            subscription: {
                id: updatedSubscription.id,
                status: updatedSubscription.status,
                cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
                currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString()
            }
        });

    } catch (error) {
        console.error('Error canceling coach subscription:', error);
        return NextResponse.json(
            { error: 'Failed to cancel subscription', details: error.message },
            { status: 500 }
        );
    }
}

