'use client'
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const { data: session } = useSession();

  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/profile`);
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      } else {
        signOut();
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      signOut();
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      // Refetch user data when session changes, especially after impersonation stops
      // Watch for changes in user ID, email, or impersonation status
      fetchUserData();
    }
  }, [session?.user?.id, session?.user?.email, session?.user?.isImpersonating, fetchUserData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
