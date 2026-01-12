import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// GET /api/admin/coaches/subscriptions - Get all coach subscriptions
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all coaches with their subscription info
        const coaches = await sql`
            SELECT 
                u.id as "coachId",
                u.name as "coachName",
                u.email as "coachEmail",
                sa."stripeSubscriptionId",
                sa."stripeSubscriptionStatus" as status,
                sa."stripeSubscriptionCurrentPeriodStart" as "currentPeriodStart",
                sa."stripeSubscriptionCurrentPeriodEnd" as "currentPeriodEnd",
                sa."createdAt"
            FROM "User" u
            LEFT JOIN "StripeAccount" sa ON sa."userId" = u.id
            WHERE u.role = 'coach'
            ORDER BY sa."createdAt" DESC NULLS LAST
        `;

        // Fetch subscription details from Stripe for those with subscriptions
        const subscriptions = await Promise.all(
            coaches.map(async (coach) => {
                if (!coach.stripeSubscriptionId) {
                    return {
                        id: coach.coachId,
                        coachId: coach.coachId,
                        coachName: coach.coachName,
                        coachEmail: coach.coachEmail,
                        status: null,
                        amount: 0,
                        currentPeriodStart: null,
                        currentPeriodEnd: null,
                        createdAt: coach.createdAt,
                    };
                }

                try {
                    const subscription = await stripe.subscriptions.retrieve(
                        coach.stripeSubscriptionId,
                        {
                            expand: ['items.data.price.product']
                        }
                    );

                    const price = subscription.items.data[0]?.price;
                    const amount = price ? (price.unit_amount / 100) : 0;

                    return {
                        id: coach.coachId,
                        coachId: coach.coachId,
                        coachName: coach.coachName,
                        coachEmail: coach.coachEmail,
                        status: subscription.status,
                        amount: amount,
                        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                        createdAt: coach.createdAt || subscription.created * 1000,
                    };
                } catch (error) {
                    console.error(`Error fetching subscription for coach ${coach.coachId}:`, error);
                    return {
                        id: coach.coachId,
                        coachId: coach.coachId,
                        coachName: coach.coachName,
                        coachEmail: coach.coachEmail,
                        status: coach.status || 'unknown',
                        amount: 0,
                        currentPeriodStart: coach.currentPeriodStart,
                        currentPeriodEnd: coach.currentPeriodEnd,
                        createdAt: coach.createdAt,
                    };
                }
            })
        );

        return NextResponse.json({
            success: true,
            subscriptions: subscriptions
        });

    } catch (error) {
        console.error('Error fetching coach subscriptions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscriptions', details: error.message },
            { status: 500 }
        );
    }
}

