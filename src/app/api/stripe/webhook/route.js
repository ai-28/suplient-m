import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db/postgresql';
import { stripe, STRIPE_CONFIG } from '@/app/lib/stripe';
import { headers } from 'next/headers';
import { createCoachProducts } from '@/app/lib/stripe/connect-helpers';

// POST /api/stripe/webhook - Handle Stripe webhooks
export async function POST(request) {
    try {
        const body = await request.text();
        const headersList = await headers();
        const signature = headersList.get('stripe-signature');
        console.log("request", request);
        if (!signature) {
            return NextResponse.json(
                { error: 'No signature provided' },
                { status: 400 }
            );
        }

        let event;
        const platformSecret = STRIPE_CONFIG.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
        const connectSecret = process.env.STRIPE_WEBHOOK_SECRET_CONNECT;
        let secretUsed = 'platform';

        // Try platform account webhook secret first
        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature,
                platformSecret
            );
        } catch (err) {
            // If platform secret fails, try Connect account secret
            if (connectSecret) {
                try {
                    event = stripe.webhooks.constructEvent(
                        body,
                        signature,
                        connectSecret
                    );
                    secretUsed = 'connect';
                } catch (connectErr) {
                    console.error('Webhook signature verification failed for both secrets:', {
                        platform: err.message,
                        connect: connectErr.message
                    });
                    return NextResponse.json(
                        { error: `Webhook Error: Signature verification failed` },
                        { status: 400 }
                    );
                }
            } else {
                console.error('Webhook signature verification failed:', err.message);
                return NextResponse.json(
                    { error: `Webhook Error: ${err.message}` },
                    { status: 400 }
                );
            }
        }

        // Log webhook event received
        console.log(`✅ Webhook received [${secretUsed}]: ${event.type}`, {
            eventId: event.id,
            account: event.account || 'platform',
            metadata: event.data.object.metadata || {}
        });

        // Handle different event types
        switch (event.type) {
            // Coach to Admin subscription events
            case 'checkout.session.completed':
                const session = event.data.object;
                // Check if it's a subscription (has subscription field) or payment (has payment_intent)
                if (session.mode === 'subscription' && session.metadata?.clientId && session.metadata?.coachId) {
                    // Client subscription to coach
                    await handleClientSubscriptionCheckout(session);
                } else if (session.mode === 'subscription') {
                    // Coach subscription to admin
                    await handleCheckoutCompleted(session);
                } else if (session.mode === 'payment' && session.payment_intent) {
                    // One-time payment (one_to_one or custom) - payment_intent.succeeded will handle it
                    // This event is just for logging/confirmation
                    console.log(`✅ Checkout completed for payment: ${session.payment_intent}`);
                }
                break;

            case 'customer.subscription.created':
                // Check if it's a client subscription to coach (has clientId in metadata)
                if (event.data.object.metadata?.clientId) {
                    await handleClientSubscriptionCreated(event.data.object);
                } else {
                    await handleSubscriptionCreated(event.data.object);
                }
                break;

            case 'customer.subscription.updated':
                // Check if it's a client subscription to coach
                if (event.data.object.metadata?.clientId) {
                    await handleClientSubscriptionUpdated(event.data.object);
                } else {
                    await handleSubscriptionUpdated(event.data.object);
                }
                break;

            case 'customer.subscription.deleted':
                // Check if it's a client subscription to coach
                if (event.data.object.metadata?.clientId) {
                    await handleClientSubscriptionDeleted(event.data.object);
                } else {
                    await handleSubscriptionDeleted(event.data.object);
                }
                break;

            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;

            // Stripe Connect events
            case 'account.updated':
                await handleAccountUpdated(event.data.object);
                break;

            // Client payment events
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;

            default:
                // Unhandled event type
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed', details: error.message },
            { status: 500 }
        );
    }
}

// Handle checkout.session.completed event
async function handleCheckoutCompleted(session) {
    try {
        const userId = session.metadata?.userId;
        if (!userId) return;
        console.log("session", session);
        // Get the subscription from the checkout session
        const subscriptionId = session.subscription;
        if (!subscriptionId) return;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Update or create StripeAccount record
        await sql`
            INSERT INTO "StripeAccount" (
                "userId",
                "stripeCustomerId",
                "stripeSubscriptionId",
                "stripeSubscriptionStatus",
                "stripeSubscriptionCurrentPeriodStart",
                "stripeSubscriptionCurrentPeriodEnd",
                "onboardingComplete",
                "createdAt",
                "updatedAt"
            )
            VALUES (
                ${userId},
                ${subscription.customer},
                ${subscription.id},
                ${subscription.status},
                ${new Date(subscription.current_period_start * 1000).toISOString()},
                ${new Date(subscription.current_period_end * 1000).toISOString()},
                true,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT ("userId") DO UPDATE SET
                "stripeCustomerId" = ${subscription.customer},
                "stripeSubscriptionId" = ${subscription.id},
                "stripeSubscriptionStatus" = ${subscription.status},
                "stripeSubscriptionCurrentPeriodStart" = ${new Date(subscription.current_period_start * 1000).toISOString()},
                "stripeSubscriptionCurrentPeriodEnd" = ${new Date(subscription.current_period_end * 1000).toISOString()},
                "onboardingComplete" = true,
                "updatedAt" = CURRENT_TIMESTAMP
        `;
    } catch (error) {
        console.error('Error handling checkout.completed:', error);
    }
}

// Handle customer.subscription.created event
async function handleSubscriptionCreated(subscription) {
    try {
        // Get customer to find userId
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.userId;
        if (!userId) return;
        console.log("subscription", subscription);
        await sql`
            UPDATE "StripeAccount"
            SET 
                "stripeSubscriptionId" = ${subscription.id},
                "stripeSubscriptionStatus" = ${subscription.status},
                "stripeSubscriptionCurrentPeriodStart" = ${new Date(subscription.current_period_start * 1000).toISOString()},
                "stripeSubscriptionCurrentPeriodEnd" = ${new Date(subscription.current_period_end * 1000).toISOString()},
                "stripeSubscriptionCancelAtPeriodEnd" = ${subscription.cancel_at_period_end || false},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "userId" = ${userId}
        `;
    } catch (error) {
        console.error('Error handling subscription.created:', error);
    }
}

// Handle customer.subscription.updated event
async function handleSubscriptionUpdated(subscription) {
    try {
        console.log("subscription", subscription);
        await sql`
            UPDATE "StripeAccount"
            SET 
                "stripeSubscriptionStatus" = ${subscription.status},
                "stripeSubscriptionCurrentPeriodStart" = ${new Date(subscription.current_period_start * 1000).toISOString()},
                "stripeSubscriptionCurrentPeriodEnd" = ${new Date(subscription.current_period_end * 1000).toISOString()},
                "stripeSubscriptionCancelAtPeriodEnd" = ${subscription.cancel_at_period_end || false},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "stripeSubscriptionId" = ${subscription.id}
        `;
    } catch (error) {
        console.error('Error handling subscription.updated:', error);
    }
}

// Handle customer.subscription.deleted event
async function handleSubscriptionDeleted(subscription) {
    try {
        console.log("subscription", subscription);
        await sql`
            UPDATE "StripeAccount"
            SET 
                "stripeSubscriptionStatus" = 'canceled',
                "stripeSubscriptionId" = NULL,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "stripeSubscriptionId" = ${subscription.id}
        `;
    } catch (error) {
        console.error('Error handling subscription.deleted:', error);
    }
}

// Handle invoice.payment_succeeded event
async function handleInvoicePaymentSucceeded(invoice) {
    try {
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) return;

        // Get subscription to update status
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        console.log("invoice", invoice);
        await sql`
            UPDATE "StripeAccount"
            SET 
                "stripeSubscriptionStatus" = ${subscription.status},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "stripeSubscriptionId" = ${subscriptionId}
        `;
    } catch (error) {
        console.error('Error handling invoice.payment_succeeded:', error);
    }
}

// Handle invoice.payment_failed event
async function handleInvoicePaymentFailed(invoice) {
    try {
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) return;

        console.log("invoice", invoice);
        await sql`
            UPDATE "StripeAccount"
            SET 
                "stripeSubscriptionStatus" = 'past_due',
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "stripeSubscriptionId" = ${subscriptionId}
        `;
    } catch (error) {
        console.error('Error handling invoice.payment_failed:', error);
    }
}

// Handle account.updated event (Stripe Connect)
async function handleAccountUpdated(account) {
    try {
        const userId = account.metadata?.userId;
        if (!userId) return;

        const chargesEnabled = account.charges_enabled || false;
        const payoutsEnabled = account.payouts_enabled || false;
        const detailsSubmitted = account.details_submitted || false;

        // Check if onboarding is complete
        const onboardingComplete = chargesEnabled && payoutsEnabled && detailsSubmitted;

        await sql`
            UPDATE "StripeAccount"
            SET 
                "stripeConnectOnboardingComplete" = ${onboardingComplete},
                "chargesEnabled" = ${chargesEnabled},
                "payoutsEnabled" = ${payoutsEnabled},
                "detailsSubmitted" = ${detailsSubmitted},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "stripeConnectAccountId" = ${account.id}
        `;

        // If onboarding is complete and products don't exist, create them
        if (onboardingComplete) {
            const existingProducts = await sql`
                SELECT COUNT(*) as count
                FROM "CoachProduct"
                WHERE "coachId" = ${userId}
            `;

            if (existingProducts[0].count === 0) {
                // Double-check to prevent race conditions (if webhook fires multiple times)
                const doubleCheck = await sql`
                    SELECT COUNT(*) as count
                    FROM "CoachProduct"
                    WHERE "coachId" = ${userId}
                `;

                if (doubleCheck[0].count === 0) {
                    // Auto-create products (database constraint will prevent duplicates)
                    await createCoachProducts(userId, account.id);
                    console.log(`✅ Auto-created products for coach ${userId}`);
                } else {
                    console.log(`⚠️ Products were already created for coach ${userId} (race condition prevented)`);
                }
            }
        }
    } catch (error) {
        console.error('Error handling account.updated:', error);
    }
}

// Handle payment_intent.succeeded event (1-to-1 session or custom payment)
async function handlePaymentIntentSucceeded(paymentIntent) {
    try {
        const clientId = paymentIntent.metadata?.clientId;
        const coachId = paymentIntent.metadata?.coachId;
        const productType = paymentIntent.metadata?.productType;

        if (!clientId || !coachId) return;

        // Update or create payment record
        const updateResult = await sql`
            UPDATE "ClientPayment"
            SET 
                "status" = 'succeeded',
                "amount" = ${paymentIntent.amount},
                "description" = ${paymentIntent.metadata?.description || null},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "stripePaymentIntentId" = ${paymentIntent.id}
        `;

        // If no record was updated, create a new one (for custom payments via checkout)
        if (updateResult.count === 0) {
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
                    ${productType || 'custom'},
                    ${paymentIntent.id},
                    ${paymentIntent.amount},
                    ${paymentIntent.currency || 'dkk'},
                    'succeeded',
                    ${paymentIntent.metadata?.description || null},
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT ("stripePaymentIntentId") DO UPDATE SET
                    "status" = 'succeeded',
                    "amount" = ${paymentIntent.amount},
                    "description" = ${paymentIntent.metadata?.description || null},
                    "updatedAt" = CURRENT_TIMESTAMP
            `;
        }

        // Save payment method if setup_future_usage was set
        if (paymentIntent.setup_future_usage && paymentIntent.payment_method) {
            try {
                const paymentMethod = await stripe.paymentMethods.retrieve(
                    paymentIntent.payment_method
                );

                if (paymentMethod.type === 'card') {
                    await sql`
                        INSERT INTO "ClientPaymentMethod" (
                            "clientId",
                            "stripePaymentMethodId",
                            "stripeCustomerId",
                            "type",
                            "last4",
                            "brand",
                            "expMonth",
                            "expYear",
                            "isDefault",
                            "createdAt",
                            "updatedAt"
                        )
                        VALUES (
                            ${clientId},
                            ${paymentMethod.id},
                            ${paymentIntent.customer},
                            'card',
                            ${paymentMethod.card.last4},
                            ${paymentMethod.card.brand},
                            ${paymentMethod.card.exp_month},
                            ${paymentMethod.card.exp_year},
                            false,
                            CURRENT_TIMESTAMP,
                            CURRENT_TIMESTAMP
                        )
                        ON CONFLICT ("stripePaymentMethodId") DO UPDATE SET
                            "updatedAt" = CURRENT_TIMESTAMP
                    `;
                }
            } catch (error) {
                console.error('Error saving payment method:', error);
            }
        }

        console.log(`✅ Payment succeeded: ${paymentIntent.id} for client ${clientId} to coach ${coachId}`);
    } catch (error) {
        console.error('Error handling payment_intent.succeeded:', error);
    }
}

// Handle payment_intent.payment_failed event
async function handlePaymentIntentFailed(paymentIntent) {
    try {
        await sql`
            UPDATE "ClientPayment"
            SET 
                "status" = 'failed',
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "stripePaymentIntentId" = ${paymentIntent.id}
        `;
    } catch (error) {
        console.error('Error handling payment_intent.payment_failed:', error);
    }
}

// Handle client subscription checkout (client subscribing to coach)
async function handleClientSubscriptionCheckout(session) {
    try {
        const clientId = session.metadata?.clientId;
        const coachId = session.metadata?.coachId;
        const productType = session.metadata?.productType;

        console.log('🔍 handleClientSubscriptionCheckout:', {
            sessionId: session.id,
            subscriptionId: session.subscription,
            metadata: session.metadata,
            hasClientId: !!clientId,
            hasCoachId: !!coachId,
            hasProductType: !!productType
        });

        if (!clientId || !coachId || !productType) {
            console.warn('⚠️ Missing metadata in checkout session:', { clientId, coachId, productType });
            return;
        }

        const subscriptionId = session.subscription;
        if (!subscriptionId) return;

        // Get subscription details from Stripe
        // Note: We need to retrieve from the Connect account
        const accountData = await sql`
            SELECT "stripeConnectAccountId"
            FROM "StripeAccount"
            WHERE "userId" = ${coachId}
        `;

        if (accountData.length === 0 || !accountData[0].stripeConnectAccountId) {
            console.warn('⚠️ Connect account not found for coach:', coachId);
            return;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            stripeAccount: accountData[0].stripeConnectAccountId,
        });

        // Save client subscription
        await sql`
            INSERT INTO "ClientSubscription" (
                "clientId",
                "coachId",
                "productType",
                "stripeSubscriptionId",
                "status",
                "currentPeriodStart",
                "currentPeriodEnd",
                "cancelAtPeriodEnd",
                "createdAt",
                "updatedAt"
            )
            VALUES (
                ${clientId},
                ${coachId},
                ${productType},
                ${subscription.id},
                ${subscription.status},
                ${new Date(subscription.current_period_start * 1000).toISOString()},
                ${new Date(subscription.current_period_end * 1000).toISOString()},
                ${subscription.cancel_at_period_end || false},
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT ("stripeSubscriptionId") DO UPDATE SET
                "status" = ${subscription.status},
                "currentPeriodStart" = ${new Date(subscription.current_period_start * 1000).toISOString()},
                "currentPeriodEnd" = ${new Date(subscription.current_period_end * 1000).toISOString()},
                "cancelAtPeriodEnd" = ${subscription.cancel_at_period_end || false},
                "updatedAt" = CURRENT_TIMESTAMP
        `;

        console.log(`✅ Client subscription created: ${subscription.id} for client ${clientId} to coach ${coachId}`);
    } catch (error) {
        console.error('❌ Error handling client subscription checkout:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            sessionId: session?.id
        });
    }
}

// Handle client subscription.created event (from Connect account)
async function handleClientSubscriptionCreated(subscription) {
    try {
        const clientId = subscription.metadata?.clientId;
        const coachId = subscription.metadata?.coachId;
        const productType = subscription.metadata?.productType;

        console.log('🔍 handleClientSubscriptionCreated:', {
            subscriptionId: subscription.id,
            metadata: subscription.metadata,
            hasClientId: !!clientId,
            hasCoachId: !!coachId,
            hasProductType: !!productType
        });

        if (!clientId || !coachId || !productType) {
            console.warn('⚠️ Missing metadata in subscription:', { clientId, coachId, productType });
            return;
        }

        await sql`
            INSERT INTO "ClientSubscription" (
                "clientId",
                "coachId",
                "productType",
                "stripeSubscriptionId",
                "status",
                "currentPeriodStart",
                "currentPeriodEnd",
                "cancelAtPeriodEnd",
                "createdAt",
                "updatedAt"
            )
            VALUES (
                ${clientId},
                ${coachId},
                ${productType},
                ${subscription.id},
                ${subscription.status},
                ${new Date(subscription.current_period_start * 1000).toISOString()},
                ${new Date(subscription.current_period_end * 1000).toISOString()},
                ${subscription.cancel_at_period_end || false},
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT ("stripeSubscriptionId") DO UPDATE SET
                "status" = ${subscription.status},
                "currentPeriodStart" = ${new Date(subscription.current_period_start * 1000).toISOString()},
                "currentPeriodEnd" = ${new Date(subscription.current_period_end * 1000).toISOString()},
                "cancelAtPeriodEnd" = ${subscription.cancel_at_period_end || false},
                "updatedAt" = CURRENT_TIMESTAMP
        `;

        console.log(`✅ Client subscription saved to database: ${subscription.id}`);
    } catch (error) {
        console.error('❌ Error handling client subscription.created:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            subscriptionId: subscription?.id
        });
    }
}

// Handle client subscription.updated event (from Connect account)
async function handleClientSubscriptionUpdated(subscription) {
    try {
        await sql`
            UPDATE "ClientSubscription"
            SET 
                "status" = ${subscription.status},
                "currentPeriodStart" = ${new Date(subscription.current_period_start * 1000).toISOString()},
                "currentPeriodEnd" = ${new Date(subscription.current_period_end * 1000).toISOString()},
                "cancelAtPeriodEnd" = ${subscription.cancel_at_period_end || false},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "stripeSubscriptionId" = ${subscription.id}
        `;
    } catch (error) {
        console.error('Error handling client subscription.updated:', error);
    }
}

// Handle client subscription.deleted event (from Connect account)
async function handleClientSubscriptionDeleted(subscription) {
    try {
        await sql`
            UPDATE "ClientSubscription"
            SET 
                "status" = 'canceled',
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "stripeSubscriptionId" = ${subscription.id}
        `;
    } catch (error) {
        console.error('Error handling client subscription.deleted:', error);
    }
}

