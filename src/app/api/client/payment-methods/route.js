import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

// GET /api/client/payment-methods - Get all client payment methods
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id || session.user.role !== 'client') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = session.user.id;

        // Get client's Stripe customer ID
        const account = await sql`
            SELECT "stripeCustomerId"
            FROM "StripeAccount"
            WHERE "userId" = ${clientId}
            LIMIT 1
        `;

        if (account.length === 0 || !account[0].stripeCustomerId) {
            return NextResponse.json({
                success: true,
                paymentMethods: []
            });
        }

        const customerId = account[0].stripeCustomerId;

        // Fetch payment methods from Stripe
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });

        // Get default payment method
        const customer = await stripe.customers.retrieve(customerId);
        const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

        const methods = paymentMethods.data.map(pm => ({
            id: pm.id,
            brand: pm.card?.brand,
            last4: pm.card?.last4,
            expMonth: pm.card?.exp_month,
            expYear: pm.card?.exp_year,
            isDefault: pm.id === defaultPaymentMethodId,
        }));

        return NextResponse.json({
            success: true,
            paymentMethods: methods
        });

    } catch (error) {
        console.error('Error fetching payment methods:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payment methods', details: error.message },
            { status: 500 }
        );
    }
}

