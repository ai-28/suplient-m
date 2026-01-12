"use client"

import { SessionProvider } from "next-auth/react";

export default function AuthSessionProvider({ children }) {
  return (
    <SessionProvider
      // Prevent session refresh on tab visibility change
      refetchInterval={0} // Disable automatic session refresh
      refetchOnWindowFocus={false} // Disable refresh when window gains focus
      refetchWhenOffline={false} // Disable refresh when going offline
    >
      {children}
    </SessionProvider>
  );
}
