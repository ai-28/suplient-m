import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
});

// Stripe configuration
export const STRIPE_CONFIG = {
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};

// Validate required configuration
if (!STRIPE_CONFIG.monthlyPriceId) {
    console.warn('⚠️ STRIPE_MONTHLY_PRICE_ID is not set. Subscription creation will fail.');
}


export default stripe;

