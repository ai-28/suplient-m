import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

/**
 * Create default products for a coach after Connect account is set up
 * @param {string} coachId - The coach's user ID
 * @param {string} connectAccountId - The Stripe Connect account ID
 * @returns {Promise<Array>} Array of created products
 */
export async function createCoachProducts(coachId, connectAccountId) {
    const defaultProducts = [
        { 
            type: 'one_to_one', 
            name: '1-to-1 Session', 
            amount: 100000 // 1000 DKK in øre
        },
        { 
            type: 'program', 
            name: 'Program Subscription', 
            amount: 100000, // 1000 DKK/month
            recurring: 'month' 
        },
        { 
            type: 'group', 
            name: 'Group Membership', 
            amount: 50000, // 500 DKK/month
            recurring: 'month' 
        },
    ];

    const createdProducts = [];

    for (const product of defaultProducts) {
        try {
            // Create product in Stripe (on Connect account)
            const stripeProduct = await stripe.products.create({
                name: product.name,
                metadata: {
                    coachId: coachId,
                    productType: product.type,
                },
            }, {
                stripeAccount: connectAccountId, // Create on Connect account
            });

            // Create price
            const priceData = {
                product: stripeProduct.id,
                currency: 'dkk',
                unit_amount: product.amount,
            };

            if (product.recurring) {
                priceData.recurring = { interval: product.recurring };
            }

            const stripePrice = await stripe.prices.create(priceData, {
                stripeAccount: connectAccountId,
            });

            // Check if product already exists before inserting (additional safety)
            const existingProduct = await sql`
                SELECT id FROM "CoachProduct"
                WHERE "coachId" = ${coachId} AND "productType" = ${product.type}
                LIMIT 1
            `;

            if (existingProduct.length > 0) {
                // Product already exists, update it instead
                await sql`
                    UPDATE "CoachProduct"
                    SET 
                        "stripeProductId" = ${stripeProduct.id},
                        "stripePriceId" = ${stripePrice.id},
                        "amount" = ${product.amount},
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "coachId" = ${coachId} AND "productType" = ${product.type}
                `;
                console.log(`Product ${product.type} already exists, updated instead of creating duplicate`);
            } else {
                // Save to database (ON CONFLICT will prevent duplicates even in race conditions)
                await sql`
                    INSERT INTO "CoachProduct" (
                        "coachId",
                        "productType",
                        "stripeProductId",
                        "stripePriceId",
                        "amount",
                        "currency",
                        "isActive",
                        "createdAt",
                        "updatedAt"
                    )
                    VALUES (
                        ${coachId},
                        ${product.type},
                        ${stripeProduct.id},
                        ${stripePrice.id},
                        ${product.amount},
                        'dkk',
                        true,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    ON CONFLICT ("coachId", "productType") DO UPDATE SET
                        "stripeProductId" = ${stripeProduct.id},
                        "stripePriceId" = ${stripePrice.id},
                        "amount" = ${product.amount},
                        "updatedAt" = CURRENT_TIMESTAMP
                `;
            }

            createdProducts.push({
                type: product.type,
                productId: stripeProduct.id,
                priceId: stripePrice.id,
            });
        } catch (error) {
            console.error(`Error creating product ${product.type} for coach ${coachId}:`, error);
        }
    }

    return createdProducts;
}

