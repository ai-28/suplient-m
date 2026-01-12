import { SidebarProvider, SidebarTrigger } from "@/app/components/ui/sidebar";
import { AppSidebar } from "@/app/components/AppSidebar";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { RoleSwitcher } from "@/app/components/RoleSwitcher";
import { NotificationSystem } from "@/app/components/NotificationSystem";

export default function Layout({ children }) {
  
  return (
    <SidebarProvider>
      <div className="max-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shadow-soft">
            <div className="flex items-center">
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-foreground">{t('common:platform.name')}</h1>
              </div>
            </div>
            
            
            <div className="flex items-center gap-4">
              <NotificationSystem userRole="coach" />
              <RoleSwitcher />
              <ThemeToggle />
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}