import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';
import { createCoachProducts } from '@/app/lib/stripe/connect-helpers';

// POST /api/stripe/connect/create-account
// Create Standard Connect account for coach
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'coach') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Check if Connect account already exists
        const existingAccount = await sql`
            SELECT "stripeConnectAccountId", "stripeConnectOnboardingComplete"
            FROM "StripeAccount"
            WHERE "userId" = ${userId}
        `;

        if (existingAccount.length > 0 && existingAccount[0].stripeConnectAccountId) {
            // Account exists, check if onboarding is complete
            if (existingAccount[0].stripeConnectOnboardingComplete) {
                return NextResponse.json({
                    accountId: existingAccount[0].stripeConnectAccountId,
                    onboardingComplete: true
                });
            } else {
                // Generate new onboarding link
                const accountLink = await stripe.accountLinks.create({
                    account: existingAccount[0].stripeConnectAccountId,
                    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?tab=billing&refresh=true`,
                    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?tab=billing&success=onboarding_complete`,
                    type: 'account_onboarding',
                });

                await sql`
                    UPDATE "StripeAccount"
                    SET "stripeConnectOnboardingUrl" = ${accountLink.url},
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "userId" = ${userId}
                `;

                return NextResponse.json({
                    accountId: existingAccount[0].stripeConnectAccountId,
                    onboardingUrl: accountLink.url,
                    onboardingComplete: false
                });
            }
        }

        // Create new Standard Connect account
        const account = await stripe.accounts.create({
            type: 'standard',
            country: 'DK', // Denmark
            email: session.user.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            metadata: {
                userId: userId,
            },
            settings: {
                payouts: {
                    schedule: {
                        interval: 'daily', // Daily payouts
                    },
                },
            },
        });

        // Save to database
        await sql`
            INSERT INTO "StripeAccount" (
                "userId",
                "stripeConnectAccountId",
                "stripeConnectOnboardingComplete",
                "createdAt",
                "updatedAt"
            )
            VALUES (
                ${userId},
                ${account.id},
                false,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT ("userId") DO UPDATE SET
                "stripeConnectAccountId" = ${account.id},
                "stripeConnectOnboardingComplete" = false,
                "updatedAt" = CURRENT_TIMESTAMP
        `;

        // Create onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?tab=billing&refresh=true`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach/settings?tab=billing&success=onboarding_complete`,
            type: 'account_onboarding',
        });

        await sql`
            UPDATE "StripeAccount"
            SET "stripeConnectOnboardingUrl" = ${accountLink.url},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "userId" = ${userId}
        `;

        return NextResponse.json({
            accountId: account.id,
            onboardingUrl: accountLink.url,
            onboardingComplete: false
        });

    } catch (error) {
        console.error('Error creating Connect account:', error);
        return NextResponse.json(
            { error: 'Failed to create Connect account', details: error.message },
            { status: 500 }
        );
    }
}

