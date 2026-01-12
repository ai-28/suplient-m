"use client"

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useAuth(requireAuth = false, redirectTo = "/login") {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (requireAuth && status === "unauthenticated") {
            router.push(redirectTo);
        }
    }, [requireAuth, status, router, redirectTo]);

    return {
        session,
        status,
        user: session?.user,
        isAuthenticated: status === "authenticated",
        isLoading: status === "loading",
        isUnauthenticated: status === "unauthenticated",
    };
}
