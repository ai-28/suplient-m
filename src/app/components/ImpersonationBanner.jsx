"use client"

import { useSession } from 'next-auth/react';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Shield, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function ImpersonationBanner() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [isExiting, setIsExiting] = useState(false);

    if (!session?.user?.isImpersonating) {
        return null;
    }

    const handleExitImpersonation = async () => {
        try {
            setIsExiting(true);
            const response = await fetch('/api/admin/impersonate', {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                // Update session to clear impersonation
                await update({
                    impersonate: {} // Clear impersonation
                });

                // Force a session refresh to ensure all components get updated session
                await update(); // This triggers a session refresh

                toast.success('Stopped impersonation', {
                    description: 'You are now back to your admin account'
                });

                // Small delay to ensure session is updated before redirect
                setTimeout(() => {
                    router.push('/admin/dashboard');
                }, 100);
            } else {
                throw new Error(data.error || 'Failed to stop impersonation');
            }
        } catch (error) {
            console.error('Error exiting impersonation:', error);
            toast.error('Failed to exit impersonation', {
                description: error.message
            });
        } finally {
            setIsExiting(false);
        }
    };

    const impersonatedName = session.user.name;
    const impersonatedRole = session.user.role;
    const adminName = session.user.originalAdminName || 'Admin';

    return (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20 border-l-4 mb-0 rounded-none">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 flex-1">
                    <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <AlertDescription className="text-orange-800 dark:text-orange-200 font-medium">
                        You are viewing as <strong>{impersonatedName}</strong> ({impersonatedRole})
                        {adminName && (
                            <span className="text-orange-600 dark:text-orange-400 ml-2">
                                · Logged in as {adminName}
                            </span>
                        )}
                    </AlertDescription>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExitImpersonation}
                    disabled={isExiting}
                    className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-900"
                >
                    {isExiting ? (
                        <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600 mr-2"></div>
                            Exiting...
                        </>
                    ) : (
                        <>
                            <X className="h-3 w-3 mr-2" />
                            Exit Impersonation
                        </>
                    )}
                </Button>
            </div>
        </Alert>
    );
}

