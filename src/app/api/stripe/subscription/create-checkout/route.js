import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe, STRIPE_CONFIG } from '@/app/lib/stripe';

// POST /api/stripe/subscription/create-checkout - Create checkout session for coach subscription
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== 'coach') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Check if subscription already exists and is active
        const existingAccount = await sql`
            SELECT "stripeSubscriptionId", "stripeSubscriptionStatus"
            FROM "StripeAccount"
            WHERE "userId" = ${userId}
            LIMIT 1
        `;

        if (existingAccount.length > 0 &&
            existingAccount[0].stripeSubscriptionId &&
            existingAccount[0].stripeSubscriptionStatus === 'active') {
            return NextResponse.json({
                error: 'Active subscription already exists'
            }, { status: 400 });
        }

        // Get or create Stripe Customer
        let customerId;
        const accountRecord = await sql`
            SELECT "stripeCustomerId" FROM "StripeAccount" WHERE "userId" = ${userId} LIMIT 1
        `;

        if (accountRecord.length > 0 && accountRecord[0].stripeCustomerId) {
            // Verify customer exists in Stripe
            try {
                await stripe.customers.retrieve(accountRecord[0].stripeCustomerId);
                customerId = accountRecord[0].stripeCustomerId;
            } catch (error) {
                // Customer doesn't exist in Stripe (deleted or from different account), create a new one
                console.log('Customer not found in Stripe, creating new customer:', error.message);
                const customer = await stripe.customers.create({
                    email: session.user.email,
                    name: session.user.name,
                    metadata: {
                        userId: userId,
                    },
                });
                customerId = customer.id;

                // Update database with new customer ID
                await sql`
                    UPDATE "StripeAccount"
                    SET "stripeCustomerId" = ${customerId}, "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "userId" = ${userId}
                `;
            }
        } else {
            // Create new Stripe Customer
            const customer = await stripe.customers.create({
                email: session.user.email,
                name: session.user.name,
                metadata: {
                    userId: userId,
                },
            });
            customerId = customer.id;

            // Save customer ID
            await sql`
                INSERT INTO "StripeAccount" ("userId", "stripeCustomerId", "createdAt", "updatedAt")
                VALUES (${userId}, ${customerId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT ("userId") DO UPDATE SET
                    "stripeCustomerId" = ${customerId},
                    "updatedAt" = CURRENT_TIMESTAMP
            `;
        }

        // Create Checkout Session
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: STRIPE_CONFIG.monthlyPriceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/coach/settings?tab=billing&success=subscription_created`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/coach/settings?tab=billing&canceled=true`,
            metadata: {
                userId: userId,
            },
        });

        return NextResponse.json({
            checkoutUrl: checkoutSession.url,
            sessionId: checkoutSession.id
        });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session', details: error.message },
            { status: 500 }
        );
    }
}

