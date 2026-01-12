import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// GET /api/client/subscriptions - Get all client subscriptions
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = session.user.id;

        // Get client's subscriptions from database
        const dbSubscriptions = await sql`
            SELECT 
                cs.id,
                cs."stripeSubscriptionId",
                cs."coachId",
                cs."productType",
                cs.status,
                cs."currentPeriodStart",
                cs."currentPeriodEnd",
                cs."createdAt",
                u.name as "coachName"
            FROM "ClientSubscription" cs
            JOIN "User" u ON u.id = cs."coachId"
            WHERE cs."clientId" = ${clientId}
            ORDER BY cs."createdAt" DESC
        `;

        // Fetch additional details from Stripe (using Connect account)
        const subscriptions = await Promise.all(
            dbSubscriptions.map(async (sub) => {
                if (!sub.stripeSubscriptionId) {
                    return {
                        id: sub.id,
                        stripeSubscriptionId: sub.stripeSubscriptionId,
                        coachId: sub.coachId,
                        coachName: sub.coachName,
                        productType: sub.productType,
                        status: sub.status,
                        amount: 0,
                        currentPeriodStart: sub.currentPeriodStart,
                        currentPeriodEnd: sub.currentPeriodEnd,
                        createdAt: sub.createdAt,
                    };
                }

                try {
                    // Get coach's Connect account ID
                    const accountData = await sql`
                        SELECT "stripeConnectAccountId"
                        FROM "StripeAccount"
                        WHERE "userId" = ${sub.coachId}
                    `;

                    if (accountData.length === 0 || !accountData[0].stripeConnectAccountId) {
                        throw new Error('Connect account not found');
                    }

                    // Retrieve subscription from Connect account
                    const stripeSubscription = await stripe.subscriptions.retrieve(
                        sub.stripeSubscriptionId,
                        {
                            stripeAccount: accountData[0].stripeConnectAccountId,
                        }
                    );

                    return {
                        id: sub.id,
                        stripeSubscriptionId: sub.stripeSubscriptionId,
                        coachId: sub.coachId,
                        coachName: sub.coachName,
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
                        coachId: sub.coachId,
                        coachName: sub.coachName,
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

