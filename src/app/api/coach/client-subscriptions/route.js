import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// GET /api/coach/client-subscriptions - Get all client subscriptions for the coach
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== 'coach') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const coachId = session.user.id;

        // Get coach's Connect account ID
        const accountData = await sql`
            SELECT "stripeConnectAccountId"
            FROM "StripeAccount"
            WHERE "userId" = ${coachId}
        `;

        if (accountData.length === 0 || !accountData[0].stripeConnectAccountId) {
            return NextResponse.json({
                success: true,
                subscriptions: []
            });
        }

        const stripeConnectAccountId = accountData[0].stripeConnectAccountId;

        // Get all client subscriptions for this coach from database
        const dbSubscriptions = await sql`
            SELECT 
                cs.id,
                cs."stripeSubscriptionId",
                cs."clientId",
                cs."productType",
                cs.status,
                cs."currentPeriodStart",
                cs."currentPeriodEnd",
                cs."createdAt",
                u.name as "clientName",
                u.email as "clientEmail"
            FROM "ClientSubscription" cs
            JOIN "User" u ON u.id = cs."clientId"
            WHERE cs."coachId" = ${coachId}
            ORDER BY cs."createdAt" DESC
        `;

        // Fetch additional details from Stripe (using Connect account)
        const subscriptions = await Promise.all(
            dbSubscriptions.map(async (sub) => {
                if (!sub.stripeSubscriptionId) {
                    return {
                        id: sub.id,
                        stripeSubscriptionId: sub.stripeSubscriptionId,
                        clientId: sub.clientId,
                        clientName: sub.clientName,
                        clientEmail: sub.clientEmail,
                        productType: sub.productType,
                        status: sub.status,
                        amount: 0,
                        currentPeriodStart: sub.currentPeriodStart,
                        currentPeriodEnd: sub.currentPeriodEnd,
                        createdAt: sub.createdAt,
                    };
                }

                try {
                    // Retrieve subscription from Connect account
                    const stripeSubscription = await stripe.subscriptions.retrieve(
                        sub.stripeSubscriptionId,
                        {
                            stripeAccount: stripeConnectAccountId,
                        }
                    );

                    return {
                        id: sub.id,
                        stripeSubscriptionId: sub.stripeSubscriptionId,
                        clientId: sub.clientId,
                        clientName: sub.clientName,
                        clientEmail: sub.clientEmail,
                        productType: sub.productType,
                        status: stripeSubscription.status,
                        amount: stripeSubscription.items.data[0]?.price.unit_amount || 0,
                        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                        createdAt: sub.createdAt || new Date(stripeSubscription.created * 1000).toISOString(),
                    };
                } catch (error) {
                    console.error(`Error fetching subscription ${sub.stripeSubscriptionId}:`, error);
                    return {
                        id: sub.id,
                        stripeSubscriptionId: sub.stripeSubscriptionId,
                        clientId: sub.clientId,
                        clientName: sub.clientName,
                        clientEmail: sub.clientEmail,
                        productType: sub.productType,
                        status: sub.status || 'unknown',
                        amount: 0,
                        currentPeriodStart: sub.currentPeriodStart,
                        currentPeriodEnd: sub.currentPeriodEnd,
                        createdAt: sub.createdAt,
                    };
                }
            })
        );

        return NextResponse.json({
            success: true,
            subscriptions: subscriptions
        });

    } catch (error) {
        console.error('Error fetching client subscriptions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscriptions', details: error.message },
            { status: 500 }
        );
    }
}

