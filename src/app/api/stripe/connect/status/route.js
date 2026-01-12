import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// GET /api/stripe/connect/status - Get Connect account status for coach
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'coach') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Get Connect account info
        const accountData = await sql`
            SELECT 
                "stripeConnectAccountId",
                "stripeConnectOnboardingComplete",
                "stripeConnectOnboardingUrl",
                "chargesEnabled",
                "payoutsEnabled",
                "detailsSubmitted"
            FROM "StripeAccount"
            WHERE "userId" = ${userId}
        `;

        if (accountData.length === 0 || !accountData[0].stripeConnectAccountId) {
            return NextResponse.json({
                connected: false,
                onboardingComplete: false,
                account: null
            });
        }

        const account = accountData[0];

        // Fetch latest status from Stripe
        try {
            const stripeAccount = await stripe.accounts.retrieve(account.stripeConnectAccountId);
            
            const onboardingComplete = stripeAccount.charges_enabled && 
                                      stripeAccount.payouts_enabled && 
                                      stripeAccount.details_submitted;

            // Update database with latest status
            await sql`
                UPDATE "StripeAccount"
                SET 
                    "stripeConnectOnboardingComplete" = ${onboardingComplete},
                    "chargesEnabled" = ${stripeAccount.charges_enabled || false},
                    "payoutsEnabled" = ${stripeAccount.payouts_enabled || false},
                    "detailsSubmitted" = ${stripeAccount.details_submitted || false},
                    "updatedAt" = CURRENT_TIMESTAMP
                WHERE "userId" = ${userId}
            `;

            return NextResponse.json({
                connected: true,
                onboardingComplete: onboardingComplete,
                account: {
                    accountId: stripeAccount.id,
                    chargesEnabled: stripeAccount.charges_enabled,
                    payoutsEnabled: stripeAccount.payouts_enabled,
                    detailsSubmitted: stripeAccount.details_submitted,
                    country: stripeAccount.country,
                },
                onboardingUrl: account.stripeConnectOnboardingUrl
            });
        } catch (error) {
            console.error('Error fetching Connect account from Stripe:', error);
            // Return database status if Stripe fetch fails
            return NextResponse.json({
                connected: true,
                onboardingComplete: account.stripeConnectOnboardingComplete,
                account: {
                    chargesEnabled: account.chargesEnabled,
                    payoutsEnabled: account.payoutsEnabled,
                    detailsSubmitted: account.detailsSubmitted,
                },
                onboardingUrl: account.stripeConnectOnboardingUrl
            });
        }

    } catch (error) {
        console.error('Error fetching Connect status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch Connect status', details: error.message },
            { status: 500 }
        );
    }
}

