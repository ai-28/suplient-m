import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// PUT /api/coach/products/update-price
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'coach') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { productType, amount } = await request.json(); // amount in øre

        if (!productType || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid product type or amount' }, { status: 400 });
        }

        if (!['one_to_one', 'program', 'group'].includes(productType)) {
            return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
        }

        const coachId = session.user.id;

        // Get coach's Connect account and product
        const productData = await sql`
            SELECT 
                cp."stripeProductId",
                cp."stripePriceId",
                sa."stripeConnectAccountId"
            FROM "CoachProduct" cp
            JOIN "StripeAccount" sa ON sa."userId" = cp."coachId"
            WHERE cp."coachId" = ${coachId}
            AND cp."productType" = ${productType}
        `;

        if (productData.length === 0) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const { stripeProductId, stripePriceId, stripeConnectAccountId } = productData[0];

        if (!stripeConnectAccountId) {
            return NextResponse.json({ error: 'Connect account not set up' }, { status: 400 });
        }

        // Determine if recurring
        const isRecurring = productType === 'program' || productType === 'group';
        
        // Create new price (Stripe doesn't allow updating prices, create new one)
        const priceData = {
            product: stripeProductId,
            currency: 'dkk',
            unit_amount: amount,
        };

        if (isRecurring) {
            priceData.recurring = { interval: 'month' };
        }

        const newPrice = await stripe.prices.create(priceData, {
            stripeAccount: stripeConnectAccountId,
        });

        // Update database
        await sql`
            UPDATE "CoachProduct"
            SET 
                "stripePriceId" = ${newPrice.id},
                "amount" = ${amount},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "coachId" = ${coachId}
            AND "productType" = ${productType}
        `;

        // If this is a recurring product (program or group), update all existing subscriptions
        const updateResults = {
            success: 0,
            failed: 0,
            errors: []
        };

        if (isRecurring) {
            // Find ALL subscriptions for this product type (not just active ones)
            // This ensures that if inactive subscribers reactivate, they'll use the updated price
            // Note: Fully cancelled subscriptions can't be updated in Stripe, but new subscriptions
            // will automatically use the updated price from the database
            const allSubscriptions = await sql`
                SELECT "stripeSubscriptionId", "status"
                FROM "ClientSubscription"
                WHERE "coachId" = ${coachId}
                AND "productType" = ${productType}
            `;

            // Update each subscription to use the new price (applies from next billing cycle)
            for (const sub of allSubscriptions) {
                try {
                    // Retrieve the subscription from Stripe
                    const subscription = await stripe.subscriptions.retrieve(
                        sub.stripeSubscriptionId,
                        { stripeAccount: stripeConnectAccountId }
                    );

                    // Skip if subscription is fully cancelled and ended (can't be updated)
                    // But try to update if it's cancelled but still in current period
                    if (subscription.status === 'canceled' && !subscription.cancel_at_period_end) {
                        console.log(`⏭️ Skipping fully cancelled subscription ${sub.stripeSubscriptionId} (will use new price if reactivated)`);
                        continue;
                    }

                    // Get the subscription item (there should be only one for this product)
                    const subscriptionItem = subscription.items.data[0];

                    if (subscriptionItem) {
                        // Update the subscription to use the new price
                        // proration_behavior: 'none' means new price applies from next billing cycle
                        await stripe.subscriptions.update(
                            sub.stripeSubscriptionId,
                            {
                                items: [{
                                    id: subscriptionItem.id,
                                    price: newPrice.id, // Use the new price
                                }],
                                proration_behavior: 'none', // Apply new price from next billing cycle
                            },
                            { stripeAccount: stripeConnectAccountId }
                        );

                        updateResults.success++;
                        console.log(`✅ Updated subscription ${sub.stripeSubscriptionId} (status: ${subscription.status}) to new price ${newPrice.id}`);
                    }
                } catch (error) {
                    // Handle different error types gracefully
                    if (error.code === 'resource_missing' || error.message?.includes('No such subscription')) {
                        // Subscription doesn't exist in Stripe anymore (fully deleted)
                        console.log(`⏭️ Subscription ${sub.stripeSubscriptionId} no longer exists in Stripe (will use new price if reactivated)`);
                        continue;
                    } else if (error.code === 'resource_already_exists' || error.message?.includes('already canceled')) {
                        // Subscription is already cancelled and can't be updated
                        console.log(`⏭️ Subscription ${sub.stripeSubscriptionId} is already cancelled (will use new price if reactivated)`);
                        continue;
                    } else {
                        // Other errors - log and count
                        console.error(`❌ Error updating subscription ${sub.stripeSubscriptionId}:`, error);
                        updateResults.failed++;
                        updateResults.errors.push({
                            subscriptionId: sub.stripeSubscriptionId,
                            error: error.message
                        });
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            productType,
            newPriceId: newPrice.id,
            amount,
            subscriptionsUpdated: updateResults.success,
            subscriptionsFailed: updateResults.failed,
            errors: updateResults.errors.length > 0 ? updateResults.errors : undefined
        });

    } catch (error) {
        console.error('Error updating product price:', error);
        return NextResponse.json(
            { error: 'Failed to update price', details: error.message },
            { status: 500 }
        );
    }
}

