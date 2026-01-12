import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// POST /api/payments/create-subscription
// Create subscription checkout for program or group
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { coachId, productType } = await request.json();
        const clientId = session.user.id;

        if (!coachId || !productType) {
            return NextResponse.json({ error: 'Coach ID and product type are required' }, { status: 400 });
        }

        if (!['program', 'group'].includes(productType)) {
            return NextResponse.json({ error: 'Invalid product type. Must be program or group' }, { status: 400 });
        }

        // Verify client-coach relationship
        const relationship = await sql`
            SELECT "coachId" FROM "User"
            WHERE id = ${clientId} AND "coachId" = ${coachId}
        `;

        if (relationship.length === 0) {
            return NextResponse.json({ error: 'Invalid coach-client relationship' }, { status: 403 });
        }

        // Get coach's product and Connect account
        const productData = await sql`
            SELECT 
                cp."stripePriceId",
                cp."amount",
                sa."stripeConnectAccountId"
            FROM "CoachProduct" cp
            JOIN "StripeAccount" sa ON sa."userId" = cp."coachId"
            WHERE cp."coachId" = ${coachId}
            AND cp."productType" = ${productType}
            AND cp."isActive" = true
        `;

        if (productData.length === 0) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const { stripePriceId, amount, stripeConnectAccountId } = productData[0];

        if (!stripeConnectAccountId) {
            return NextResponse.json({ error: 'Coach has not set up payment account' }, { status: 400 });
        }

        // Get or create Stripe customer for client on coach's Connect account
        let customerId;
        const customerData = await sql`
            SELECT "stripeCustomerId" FROM "ClientPaymentMethod"
            WHERE "clientId" = ${clientId}
            AND "stripeCustomerId" IS NOT NULL
            LIMIT 1
        `;

        if (customerData.length > 0 && customerData[0].stripeCustomerId) {
            try {
                await stripe.customers.retrieve(customerData[0].stripeCustomerId, {
                    stripeAccount: stripeConnectAccountId,
                });
                customerId = customerData[0].stripeCustomerId;
            } catch (error) {
                customerId = null;
            }
        }

        if (!customerId) {
            const clientInfo = await sql`
                SELECT email, name FROM "User"
                WHERE id = ${clientId}
            `;

            if (clientInfo.length === 0) {
                return NextResponse.json({ error: 'Client not found' }, { status: 404 });
            }

            const customer = await stripe.customers.create({
                email: clientInfo[0].email,
                name: clientInfo[0].name,
                metadata: {
                    clientId: clientId,
                    coachId: coachId,
                },
            }, {
                stripeAccount: stripeConnectAccountId,
            });

            customerId = customer.id;

            // Update any existing payment method records for this client with the customer ID
            // The customer ID will be properly saved when a payment method is added via webhook
            await sql`
                UPDATE "ClientPaymentMethod"
                SET "stripeCustomerId" = ${customerId},
                    "updatedAt" = CURRENT_TIMESTAMP
                WHERE "clientId" = ${clientId}
                AND ("stripeCustomerId" IS NULL OR "stripeCustomerId" != ${customerId})
            `;
        }

        // Create Checkout Session on coach's Connect account
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: stripePriceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/profile?tab=billing&success=subscription_created`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/profile?tab=billing&canceled=true`,
            metadata: {
                clientId: clientId,
                coachId: coachId,
                productType: productType,
            },
            subscription_data: {
                metadata: {
                    clientId: clientId,
                    coachId: coachId,
                    productType: productType,
                },
            },
        }, {
            stripeAccount: stripeConnectAccountId,
        });

        return NextResponse.json({
            checkoutUrl: checkoutSession.url,
            sessionId: checkoutSession.id
        });

    } catch (error) {
        console.error('Error creating subscription checkout:', error);
        return NextResponse.json(
            { error: 'Failed to create subscription checkout', details: error.message },
            { status: 500 }
        );
    }
}

