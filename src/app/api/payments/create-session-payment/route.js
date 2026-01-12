import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// POST /api/payments/create-session-payment
// Create Stripe Checkout session for 1-to-1 session payment
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { coachId, returnUrl } = await request.json();
        const clientId = session.user.id;

        if (!coachId) {
            return NextResponse.json({ error: 'Coach ID is required' }, { status: 400 });
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
            AND cp."productType" = 'one_to_one'
            AND cp."isActive" = true
        `;

        if (productData.length === 0) {
            return NextResponse.json({ error: '1-to-1 session product not found. Please contact your coach.' }, { status: 404 });
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
            // Verify customer exists on the Connect account
            try {
                await stripe.customers.retrieve(customerData[0].stripeCustomerId, {
                    stripeAccount: stripeConnectAccountId,
                });
                customerId = customerData[0].stripeCustomerId;
            } catch (error) {
                // Customer doesn't exist, create new one
                customerId = null;
            }
        }

        if (!customerId) {
            // Get client info
            const clientInfo = await sql`
                SELECT email, name FROM "User"
                WHERE id = ${clientId}
            `;

            if (clientInfo.length === 0) {
                return NextResponse.json({ error: 'Client not found' }, { status: 404 });
            }

            // Create customer on coach's Connect account
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
            // For one-time payments, the customer ID will be saved when payment method is added via webhook
            // We just update existing records if they exist
            const updateResult = await sql`
                UPDATE "ClientPaymentMethod"
                SET "stripeCustomerId" = ${customerId},
                    "updatedAt" = CURRENT_TIMESTAMP
                WHERE "clientId" = ${clientId}
                AND ("stripeCustomerId" IS NULL OR "stripeCustomerId" != ${customerId})
            `;

            // If no records were updated, that's fine - the webhook will handle it when payment succeeds
        }

        // Build success and cancel URLs
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const successUrl = returnUrl
            ? `${baseUrl}${returnUrl}?payment=success&coachId=${coachId}`
            : `${baseUrl}/client/book-session?payment=success&coachId=${coachId}`;
        const cancelUrl = returnUrl
            ? `${baseUrl}${returnUrl}?payment=canceled`
            : `${baseUrl}/client/book-session?payment=canceled`;

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
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                clientId: clientId,
                coachId: coachId,
                productType: 'one_to_one',
            },
            payment_intent_data: {
                metadata: {
                    clientId: clientId,
                    coachId: coachId,
                    productType: 'one_to_one',
                },
            },
        }, {
            stripeAccount: stripeConnectAccountId,
        });

        // Payment will be saved via webhook when checkout is completed

        return NextResponse.json({
            checkoutUrl: checkoutSession.url,
            sessionId: checkoutSession.id
        });

    } catch (error) {
        console.error('Error creating session payment:', error);
        return NextResponse.json(
            { error: 'Failed to create payment', details: error.message },
            { status: 500 }
        );
    }
}

