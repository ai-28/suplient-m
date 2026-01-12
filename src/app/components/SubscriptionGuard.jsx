"use client"

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

/**
 * Client component that checks subscription status and redirects/logs out if inactive
 * This should be used in layouts to protect pages for logged-in users
 * 
 * Checks subscription:
 * - On mount
 * - On route changes (pathname changes)
 * - Every 30 seconds while user is active
 */
export default function SubscriptionGuard({ children }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const checkIntervalRef = useRef(null);
    const isCheckingRef = useRef(false);

    useEffect(() => {
        // Skip check if not authenticated or session is loading
        if (status === 'loading' || !session?.user) {
            return;
        }

        // Skip check for public routes
        if (
            pathname.startsWith('/login') ||
            pathname.startsWith('/register') ||
            pathname.startsWith('/forgot-password') ||
            pathname.startsWith('/reset-password') ||
            pathname.startsWith('/setup-2fa') ||
            pathname.startsWith('/subscription-error') ||
            pathname.startsWith('/access-denied') ||
            pathname === '/'
        ) {
            // Clear interval if on public route
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
            return;
        }

        // Skip check for admins
        if (session.user.role === 'admin' || session.user.isImpersonating) {
            return;
        }

        // Only check for coaches and clients
        if (session.user.role !== 'coach' && session.user.role !== 'client') {
            return;
        }

        // Check subscription status
        const checkSubscription = async () => {
            // Prevent concurrent checks
            if (isCheckingRef.current) {
                return;
            }

            isCheckingRef.current = true;

            try {
                const response = await fetch('/api/subscription/check', {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store',
                });

                if (!response.ok) {
                    // If check fails, logout and redirect
                    if (checkIntervalRef.current) {
                        clearInterval(checkIntervalRef.current);
                    }
                    await signOut({ 
                        callbackUrl: '/subscription-error?reason=error&message=Unable+to+verify+subscription+status' 
                    });
                    return;
                }

                const result = await response.json();

                if (!result.hasAccess) {
                    // Subscription is inactive, logout and redirect to appropriate error page
                    if (checkIntervalRef.current) {
                        clearInterval(checkIntervalRef.current);
                    }
                    const errorPage = session.user.role === 'coach' 
                        ? `/subscription-error?reason=${encodeURIComponent(result.reason || 'inactive')}&message=${encodeURIComponent(result.message || 'Your subscription is not active.')}`
                        : `/access-denied?reason=${encodeURIComponent(result.reason || 'coach_subscription_inactive')}&message=${encodeURIComponent(result.message || 'Access is temporarily unavailable.')}`;
                    
                    await signOut({ callbackUrl: errorPage });
                }
            } catch (error) {
                console.error('Error checking subscription:', error);
                // On error, logout for security
                if (checkIntervalRef.current) {
                    clearInterval(checkIntervalRef.current);
                }
                await signOut({ 
                    callbackUrl: '/subscription-error?reason=error&message=Unable+to+verify+subscription+status' 
                });
            } finally {
                isCheckingRef.current = false;
            }
        };

        // Check immediately on mount/route change
        checkSubscription();

        // Set up periodic check every 30 seconds
        if (!checkIntervalRef.current) {
            checkIntervalRef.current = setInterval(() => {
                checkSubscription();
            }, 30000); // Check every 30 seconds
        }

        // Cleanup on unmount or route change
        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
        };
    }, [session, status, pathname]);

    return <>{children}</>;
}

