import { sql } from '@/app/lib/db/postgresql';
import { checkCoachSubscriptionStatus } from './checkSubscription';

/**
 * Check if a client has access based on their coach's subscription status
 * @param {string} userId - The client's user ID
 * @returns {Promise<Object>} Access status object
 */
export async function checkClientAccess(userId) {
  try {
    // Validate input
    if (!userId) {
      return {
        hasAccess: false,
        reason: 'invalid_user_id',
        message: 'Invalid user ID provided.'
      };
    }

    // Get client's coach
    const client = await sql`
      SELECT "coachId" FROM "User"
      WHERE id = ${userId} AND role = 'client'
      LIMIT 1
    `;

    if (client.length === 0) {
      // Client not found or not a client role
      return {
        hasAccess: false,
        reason: 'client_not_found',
        message: 'Client record not found. Please contact support for assistance.'
      };
    }

    if (!client[0].coachId) {
      // Client has no coach - deny access (or adjust based on your business logic)
      return {
        hasAccess: false,
        reason: 'no_coach_assigned',
        message: 'No coach assigned. Please contact support for assistance.'
      };
    }

    // Check coach's subscription
    const coachSubscription = await checkCoachSubscriptionStatus(client[0].coachId);

    if (!coachSubscription.hasActiveSubscription) {
      return {
        hasAccess: false,
        reason: 'coach_subscription_inactive',
        message: `Your coach's subscription is inactive. Access is temporarily unavailable. Please contact your coach or support for assistance.`,
        coachSubscriptionReason: coachSubscription.reason
      };
    }

    return { hasAccess: true, reason: null, message: null };

  } catch (error) {
    console.error('Error checking client access:', error);
    // Fail closed for security - deny access on error
    return {
      hasAccess: false,
      reason: 'error',
      message: 'Unable to verify access. Please contact support for assistance.'
    };
  }
}

