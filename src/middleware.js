import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;
        const isApiRoute = req.nextUrl.pathname.startsWith('/api/');

        // Skip subscription check for public routes
        if (req.nextUrl.pathname.startsWith("/login") ||
            req.nextUrl.pathname.startsWith("/register") ||
            req.nextUrl.pathname.startsWith("/forgot-password") ||
            req.nextUrl.pathname.startsWith("/reset-password") ||
            req.nextUrl.pathname.startsWith("/setup-2fa") ||
            req.nextUrl.pathname.startsWith("/subscription-error") ||
            req.nextUrl.pathname.startsWith("/access-denied") ||
            req.nextUrl.pathname.startsWith("/client/custom-payment") ||
            req.nextUrl.pathname === "/") {
            return NextResponse.next();
        }

        // Skip subscription check for admins
        if (token?.role === 'admin') {
            return NextResponse.next();
        }

        // Skip subscription check if admin is impersonating
        if (token?.originalAdminId) {
            return NextResponse.next();
        }

        // Skip subscription check for public API routes (like webhooks, auth endpoints, and our check endpoint)
        if (isApiRoute && (
            req.nextUrl.pathname.startsWith('/api/auth/') ||
            req.nextUrl.pathname.startsWith('/api/stripe/webhook') ||
            req.nextUrl.pathname.startsWith('/api/platform/settings/public') ||
            req.nextUrl.pathname.startsWith('/api/subscription/check') ||
            req.nextUrl.pathname.startsWith('/api/coach/info')
        )) {
            return NextResponse.next();
        }

        // Note: Subscription checks are done in API routes and page layouts
        // because middleware runs in Edge Runtime which can't access the database.
        // The subscription check API route (/api/subscription/check) handles this.
        // For page routes, subscription is checked in layout components.

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                // Allow access to public API routes (no auth required)
                if (req.nextUrl.pathname.startsWith('/api/stripe/webhook') ||
                    req.nextUrl.pathname.startsWith('/api/auth/') ||
                    req.nextUrl.pathname.startsWith('/api/platform/settings/public') ||
                    req.nextUrl.pathname.startsWith('/api/subscription/check') ||
                    req.nextUrl.pathname.startsWith('/api/coach/info')) {
                    return true;
                }

                // Allow access to login page and other public routes
                if (req.nextUrl.pathname.startsWith("/login") ||
                    req.nextUrl.pathname.startsWith("/register") ||
                    req.nextUrl.pathname.startsWith("/forgot-password") ||
                    req.nextUrl.pathname.startsWith("/reset-password") ||
                    req.nextUrl.pathname.startsWith("/setup-2fa") ||
                    req.nextUrl.pathname.startsWith("/client/custom-payment") ||
                    req.nextUrl.pathname === "/") {
                    return true;
                }

                // Check if user is authenticated
                if (!token) {
                    return false;
                }

                const userRole = token.role;
                const isAdminImpersonating = !!token.originalAdminId;

                // Role-based route protection with impersonation support
                if (req.nextUrl.pathname.startsWith("/admin")) {
                    // Admin routes: accessible by admins or admins impersonating others
                    return userRole === 'admin' || isAdminImpersonating;
                }

                if (req.nextUrl.pathname.startsWith("/coach")) {
                    // Coach routes: accessible by coaches or admins impersonating coaches
                    return userRole === 'coach' || isAdminImpersonating;
                }

                if (req.nextUrl.pathname.startsWith("/client")) {
                    // Custom payment page is public (handled above)
                    if (req.nextUrl.pathname.startsWith("/client/custom-payment")) {
                        return true;
                    }
                    // Other client routes: accessible by clients or admins impersonating clients
                    return userRole === 'client' || isAdminImpersonating;
                }

                if (req.nextUrl.pathname.startsWith("/dashboard")) {
                    // Dashboard can be accessed by any authenticated user
                    return true;
                }

                return true;
            },
        },
        pages: {
            signIn: '/login',
        },
    }
);

export const config = {
    matcher: [
        "/coach/:path*",
        "/admin/:path*",
        "/client/:path*",
        "/dashboard/:path*",
        "/api/:path*",  // Add this to check API routes too
    ],
};
