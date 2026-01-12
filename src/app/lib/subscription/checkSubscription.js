import { sql } from '@/app/lib/db/postgresql';
import { stripe } from '@/app/lib/stripe';

/**
 * Check if a coach has an active subscription
 * @param {string} userId - The coach's user ID
 * @returns {Promise<Object>} Subscription status object
 */
export async function checkCoachSubscriptionStatus(userId) {
    try {
        // Validate input
        if (!userId) {
            return {
                hasActiveSubscription: false,
                reason: 'invalid_user_id',
                message: 'Invalid user ID provided.',
                endDate: null
            };
        }

        // Get subscription from database
        const account = await sql`
      SELECT 
        "stripeSubscriptionId",
        "stripeSubscriptionStatus",
        "stripeSubscriptionCurrentPeriodEnd",
        "stripeSubscriptionCancelAtPeriodEnd"
      FROM "StripeAccount"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

        // No subscription record - allow access for first-time coaches who haven't connected Stripe yet
        if (account.length === 0 || !account[0].stripeSubscriptionId) {
            return {
                hasActiveSubscription: true,
                reason: 'no_stripe_connection',
                message: 'You can use the platform until you connect your Stripe payment. Please connect Stripe to continue after your first connection.',
                endDate: null
            };
        }

        const subscriptionStatus = account[0].stripeSubscriptionStatus;
        const periodEnd = account[0].stripeSubscriptionCurrentPeriodEnd;
        const cancelAtPeriodEnd = account[0].stripeSubscriptionCancelAtPeriodEnd || false;
        const now = new Date();

        // Handle null/undefined subscription status
        if (!subscriptionStatus) {
            return {
                hasActiveSubscription: false,
                reason: 'invalid_status',
                message: 'Subscription status is invalid. Please contact support for assistance.',
                endDate: periodEnd || null
            };
        }

        // Check if subscription is active
        if (subscriptionStatus === 'active') {
            // If periodEnd is null, deny access (fail closed for security)
            if (!periodEnd) {
                console.warn('Active subscription with null periodEnd for user:', userId);
                return {
                    hasActiveSubscription: false,
                    reason: 'invalid_period',
                    message: 'Subscription period information is missing. Please contact support.',
                    endDate: null
                };
            }

            // Verify it's not expired
            const endDate = new Date(periodEnd);

            if (endDate < now) {
                return {
                    hasActiveSubscription: false,
                    reason: 'expired',
                    message: 'Your subscription has expired. Please renew to continue using the platform.',
                    endDate: periodEnd
                };
            }

            // Even if cancel_at_period_end is true, allow access until periodEnd
            // (they paid for this period)
            return {
                hasActiveSubscription: true,
                reason: cancelAtPeriodEnd ? 'scheduled_cancellation' : null,
                message: cancelAtPeriodEnd
                    ? `Your subscription will be canceled at the end of the current billing period (${endDate.toLocaleDateString()}).`
                    : null,
                endDate: periodEnd
            };
        }

        // Handle grace period for past_due
        if (subscriptionStatus === 'past_due') {
            const gracePeriodDays = 7; // 7-day grace period

            // If periodEnd is null, use current time + grace period
            if (!periodEnd) {
                const gracePeriodEnd = new Date(now.getTime() + (gracePeriodDays * 24 * 60 * 60 * 1000));
                return {
                    hasActiveSubscription: true, // Allow during grace period
                    reason: 'past_due_grace_period',
                    message: `Your payment failed. Please update your payment method within ${gracePeriodDays} days to avoid service interruption.`,
                    endDate: gracePeriodEnd
                };
            }

            const periodEndDate = new Date(periodEnd);
            // Allow access until periodEnd (they paid for this period)
            if (now < periodEndDate) {
                return {
                    hasActiveSubscription: true,
                    reason: 'past_due_grace_period',
                    message: `Your payment failed. Please update your payment method. You have access until ${periodEndDate.toLocaleDateString()}.`,
                    endDate: periodEndDate
                };
            }

            // Period has ended, check grace period from periodEnd
            const gracePeriodEnd = new Date(periodEndDate.getTime() + (gracePeriodDays * 24 * 60 * 60 * 1000));

            if (now < gracePeriodEnd) {
                return {
                    hasActiveSubscription: true, // Allow during grace period
                    reason: 'past_due_grace_period',
                    message: `Your payment failed and your subscription period has ended. Please update your payment method within ${Math.ceil((gracePeriodEnd - now) / (24 * 60 * 60 * 1000))} days to avoid service interruption.`,
                    endDate: gracePeriodEnd
                };
            } else {
                return {
                    hasActiveSubscription: false,
                    reason: 'past_due',
                    message: 'Your payment failed and the grace period has ended. Please update your payment method to continue using the platform.',
                    endDate: gracePeriodEnd
                };
            }
        }

        // Handle other statuses
        const statusMessages = {
            'canceled': 'Your subscription has been canceled. Please resubscribe to continue using the platform.',
            'unpaid': 'Your subscription payment is overdue. Please update your payment method to continue using the platform.',
            'incomplete': 'Your subscription setup is incomplete. Please complete your subscription to continue using the platform.',
            'incomplete_expired': 'Your subscription setup expired. Please create a new subscription to continue using the platform.',
            'trialing': {
                hasActiveSubscription: true, // Allow during trial
                reason: null,
                message: null,
                endDate: periodEnd || null
            }
        };

        const statusInfo = statusMessages[subscriptionStatus];

        if (typeof statusInfo === 'object' && statusInfo.hasActiveSubscription) {
            return statusInfo;
        }

        return {
            hasActiveSubscription: false,
            reason: subscriptionStatus,
            message: statusInfo || 'Your subscription is not active. Please contact support for assistance.',
            endDate: periodEnd || null
        };

    } catch (error) {
        console.error('Error checking subscription status:', error);
        // Fail closed for security - deny access on error
        // You might want to add alerting/monitoring here
        return {
            hasActiveSubscription: false,
            reason: 'error',
            message: 'Unable to verify subscription status. Please contact support for assistance.',
            endDate: null
        };
    }
}

