"use client"

import { AppSidebar } from "@/app/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/app/components/ui/sidebar";
import { NotificationBell } from "@/app/components/NotificationBell";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/app/components/ui/avatar";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { ImpersonationBanner } from "@/app/components/ImpersonationBanner";
import { useTranslation } from "@/app/context/LanguageContext";
import SubscriptionGuard from "@/app/components/SubscriptionGuard";

const Layout = ({ children }) => {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const t = useTranslation();
    
    const [mounted, setMounted] = useState(false);
    const [platformName, setPlatformName] = useState('Mental Coach Platform');
    
    // Only show sidebar for coach and admin routes, not for client routes
    const shouldShowSidebar = pathname.startsWith('/coach') || pathname.startsWith('/admin');
    const isClientRoute = pathname.startsWith('/client');

    // Prevent hydration mismatch by only rendering after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch platform name
    useEffect(() => {
        const fetchPlatformName = async () => {
            try {
                const response = await fetch('/api/platform/settings/public');
                const data = await response.json();
                if (data.success && data.settings?.platformName) {
                    setPlatformName(data.settings.platformName);
                }
            } catch (error) {
                console.error('Error fetching platform name:', error);
            }
        };
        if (mounted) {
            fetchPlatformName();
        }
    }, [mounted]);

    // For client routes, just render children without any main layout wrapper
    if (isClientRoute) {
        return <>{children}</>;
    }

    // Prevent hydration mismatch by showing loading state
    if (!mounted) {
        return (
            <div className="min-h-screen flex w-full bg-background">
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <SubscriptionGuard>
        <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          {/* Conditionally render sidebar only for coach/admin routes */}
          {shouldShowSidebar && <AppSidebar />}
          
          <div className={`flex-1 flex flex-col ${shouldShowSidebar ? '' : 'w-full'}`}>
            {/* Impersonation Banner */}
            {!isClientRoute && <ImpersonationBanner />}
            
            {/* Header - show for all routes except client (client has its own navigation) */}
            {!isClientRoute && (
              <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 shadow-soft">
                <div className="flex items-center gap-2 md:gap-4">
                  {/* Sidebar Trigger - visible on mobile */}
                  {shouldShowSidebar && (
                    <SidebarTrigger className="md:hidden" />
                  )}
                  <div className={shouldShowSidebar ? "md:ml-4" : "ml-4"}>
                    <h1 className="text-lg md:text-xl font-semibold text-foreground">
                      {user?.name ? `${t('common.greeting', 'Hi')} ${user.name}` : platformName}
                    </h1>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 md:gap-4">
                    <NotificationBell userRole={pathname.startsWith('/admin') ? 'admin' : 'coach'} />
                  <ThemeToggle />
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all duration-200 p-0 cursor-pointer"
                    onClick={() => {
                      // Navigate to Settings based on role
                      if (user?.role === 'admin') {
                        router.push('/admin/settings');
                      } else if (user?.role === 'coach') {
                        router.push('/coach/settings');
                      }
                    }}
                  >
                    <Avatar className="h-10 w-10 md:h-12 md:w-12 rounded-lg border-2 border-gray-200">
                      {user?.avatar && (
                        <AvatarImage 
                          src={user.avatar} 
                          alt={user?.name || 'Profile'} 
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="flex justify-center items-center h-full w-full text-xl md:text-3xl text-gray-700 font-bold bg-gray-100">
                        {user?.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </div>
              </header>
            )}
            
            {/* Main Content */}
            <main className={`flex-1 ${isClientRoute ? 'p-0' : 'p-0'} bg-background md:px-[30px]`}>
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
      </SubscriptionGuard>
    )
}

export default Layout;