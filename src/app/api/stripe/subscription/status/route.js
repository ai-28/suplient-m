import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// GET /api/stripe/subscription/status - Get subscription status for coach
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify user is a coach
        if (session.user.role !== 'coach') {
            return NextResponse.json(
                { error: 'Unauthorized. Only coaches can view subscription status.' },
                { status: 403 }
            );
        }

        const userId = session.user.id;

        // Get StripeAccount for this user
        const stripeAccount = await sql`
            SELECT * FROM "StripeAccount"
            WHERE "userId" = ${userId}
            LIMIT 1
        `;

        if (stripeAccount.length === 0) {
            return NextResponse.json({
                connected: false,
                subscription: null,
                account: null
            });
        }

        const account = stripeAccount[0];

        // If subscription exists, fetch latest from Stripe
        let subscription = null;
        if (account.stripeSubscriptionId) {
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(
                    account.stripeSubscriptionId,
                    {
                        expand: ['latest_invoice', 'items.data.price.product']
                    }
                );

                // Get subscription amount
                const price = stripeSubscription.items.data[0]?.price;
                const amount = price ? (price.unit_amount / 100) : 0;
                const currency = price?.currency?.toUpperCase() || 'USD';

                subscription = {
                    id: stripeSubscription.id,
                    status: stripeSubscription.status,
                    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                    amount: amount,
                    currency: currency,
                    interval: price?.recurring?.interval || 'month',
                    latestInvoice: stripeSubscription.latest_invoice?.status,
                };

                // Update database with latest status
                await sql`
                    UPDATE "StripeAccount"
                    SET 
                        "stripeSubscriptionStatus" = ${stripeSubscription.status},
                        "stripeSubscriptionCurrentPeriodStart" = ${new Date(stripeSubscription.current_period_start * 1000).toISOString()},
                        "stripeSubscriptionCurrentPeriodEnd" = ${new Date(stripeSubscription.current_period_end * 1000).toISOString()},
                        "stripeSubscriptionCancelAtPeriodEnd" = ${stripeSubscription.cancel_at_period_end || false},
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "userId" = ${userId}
                `;
            } catch (error) {
                console.error('Error fetching subscription from Stripe:', error);
                // Return database status if Stripe fetch fails
                subscription = {
                    id: account.stripeSubscriptionId,
                    status: account.stripeSubscriptionStatus,
                    currentPeriodStart: account.stripeSubscriptionCurrentPeriodStart,
                    currentPeriodEnd: account.stripeSubscriptionCurrentPeriodEnd,
                    cancelAtPeriodEnd: account.stripeSubscriptionCancelAtPeriodEnd,
                };
            }
        }

        return NextResponse.json({
            connected: !!subscription, // Has active subscription = connected
            subscription: subscription,
            account: {
                customerId: account.stripeCustomerId,
                hasSubscription: !!subscription,
            }
        });

    } catch (error) {
        console.error('Error fetching subscription status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscription status', details: error.message },
            { status: 500 }
        );
    }
}

