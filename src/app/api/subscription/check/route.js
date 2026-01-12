import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { checkCoachSubscriptionStatus } from '@/app/lib/subscription/checkSubscription';
import { checkClientAccess } from '@/app/lib/subscription/checkClientAccess';

/**
 * API route to check subscription status
 * This is called from middleware and must bypass middleware checks
 * to avoid circular dependencies
 */
export async function GET(request) {
    try {
        // Use getServerSession like other API routes for consistency
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.error('Subscription check: No session found');
            return NextResponse.json(
                { hasAccess: false, reason: 'unauthorized', message: 'Not authenticated' },
                { status: 401 }
            );
        }

        const userId = session.user.id;
        const role = session.user.role;

        console.log(`Subscription check: User ${userId}, Role: ${role}`);

        // Skip check for admins
        if (role === 'admin' || session.user.isImpersonating) {
            console.log('Subscription check: Admin or impersonating, allowing access');
            return NextResponse.json({ hasAccess: true });
        }

        // Check subscription for coaches
        if (role === 'coach') {
            console.log(`Subscription check: Checking coach subscription for user ${userId}`);
            try {
                const subscriptionStatus = await checkCoachSubscriptionStatus(userId);
                console.log(`Subscription check result:`, {
                    hasActiveSubscription: subscriptionStatus.hasActiveSubscription,
                    reason: subscriptionStatus.reason
                });
                return NextResponse.json({
                    hasAccess: subscriptionStatus.hasActiveSubscription,
                    reason: subscriptionStatus.reason,
                    message: subscriptionStatus.message,
                    subscriptionStatus
                });
            } catch (error) {
                console.error('Error checking coach subscription:', error);
                throw error;
            }
        }

        // Check subscription for clients (via their coach)
        if (role === 'client') {
            console.log(`Subscription check: Checking client access for user ${userId}`);
            try {
                const clientAccess = await checkClientAccess(userId);
                console.log(`Client access check result:`, {
                    hasAccess: clientAccess.hasAccess,
                    reason: clientAccess.reason
                });
                return NextResponse.json({
                    hasAccess: clientAccess.hasAccess,
                    reason: clientAccess.reason,
                    message: clientAccess.message,
                    clientAccess
                });
            } catch (error) {
                console.error('Error checking client access:', error);
                throw error;
            }
        }

        // Default: allow access for other roles
        return NextResponse.json({ hasAccess: true });

    } catch (error) {
        console.error('Error in subscription check API:', error);
        console.error('Error stack:', error.stack);
        // Fail closed for security
        return NextResponse.json(
            {
                hasAccess: false,
                reason: 'error',
                message: 'Unable to verify subscription status. Please contact support for assistance.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}

