import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// POST /api/payments/create-custom-payment
// Create custom payment link with variable amount
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'coach') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { amount, description, clientId } = await request.json();
        const coachId = session.user.id;

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Get coach's Connect account
        const accountData = await sql`
            SELECT "stripeConnectAccountId"
            FROM "StripeAccount"
            WHERE "userId" = ${coachId}
        `;

        if (accountData.length === 0 || !accountData[0].stripeConnectAccountId) {
            return NextResponse.json({ error: 'Connect account not set up' }, { status: 400 });
        }

        const stripeConnectAccountId = accountData[0].stripeConnectAccountId;

        // If clientId is provided, verify relationship
        let customerId = null;
        if (clientId) {
            const relationship = await sql`
                SELECT "coachId" FROM "User"
                WHERE id = ${clientId} AND "coachId" = ${coachId}
            `;

            if (relationship.length === 0) {
                return NextResponse.json({ error: 'Invalid coach-client relationship' }, { status: 403 });
            }

            // Get or create customer
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

                if (clientInfo.length > 0) {
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

                    await sql`
                        INSERT INTO "ClientPaymentMethod" (
                            "clientId",
                            "stripeCustomerId",
                            "createdAt",
                            "updatedAt"
                        )
                        VALUES (
                            ${clientId},
                            ${customerId},
                            CURRENT_TIMESTAMP,
                            CURRENT_TIMESTAMP
                        )
                        ON CONFLICT ("stripeCustomerId") DO UPDATE SET
                            "clientId" = ${clientId},
                            "updatedAt" = CURRENT_TIMESTAMP
                    `;
                }
            }
        }

        // Create Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // in øre
            currency: 'dkk',
            customer: customerId,
            payment_method_types: ['card'],
            setup_future_usage: customerId ? 'off_session' : undefined,
            metadata: {
                coachId: coachId,
                clientId: clientId || null,
                productType: 'custom',
                description: description || '',
            },
            description: description || 'Custom payment',
            application_fee_amount: 0,
            transfer_data: {
                destination: stripeConnectAccountId,
            },
        }, {
            stripeAccount: stripeConnectAccountId,
        });

        // Save payment intent to database
        if (clientId) {
            await sql`
                INSERT INTO "ClientPayment" (
                    "clientId",
                    "coachId",
                    "productType",
                    "stripePaymentIntentId",
                    "amount",
                    "currency",
                    "status",
                    "description",
                    "createdAt",
                    "updatedAt"
                )
                VALUES (
                    ${clientId},
                    ${coachId},
                    'custom',
                    ${paymentIntent.id},
                    ${amount},
                    'dkk',
                    ${paymentIntent.status},
                    ${description || null},
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT ("stripePaymentIntentId") DO UPDATE SET
                    "status" = ${paymentIntent.status},
                    "updatedAt" = CURRENT_TIMESTAMP
            `;
        }

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });

    } catch (error) {
        console.error('Error creating custom payment:', error);
        return NextResponse.json(
            { error: 'Failed to create custom payment', details: error.message },
            { status: 500 }
        );
    }
}

