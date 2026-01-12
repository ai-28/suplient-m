"use client"
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { AlertCircle, CreditCard, ArrowLeft } from 'lucide-react';

function SubscriptionErrorContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const reasonParam = searchParams.get('reason');
        const messageParam = searchParams.get('message');
        
        setReason(reasonParam || 'inactive');
        setMessage(messageParam || 'Your subscription is not active.');
    }, [searchParams]);

    const getReasonDetails = () => {
        switch (reason) {
            case 'no_subscription':
                return {
                    title: 'No Active Subscription',
                    icon: <CreditCard className="h-12 w-12 text-orange-500" />,
                    actionText: 'Subscribe Now',
                    actionLink: '/coach/settings?tab=billing'
                };
            case 'expired':
                return {
                    title: 'Subscription Expired',
                    icon: <AlertCircle className="h-12 w-12 text-red-500" />,
                    actionText: 'Renew Subscription',
                    actionLink: '/coach/settings?tab=billing'
                };
            case 'canceled':
                return {
                    title: 'Subscription Canceled',
                    icon: <AlertCircle className="h-12 w-12 text-gray-500" />,
                    actionText: 'Resubscribe',
                    actionLink: '/coach/settings?tab=billing'
                };
            case 'past_due':
                return {
                    title: 'Payment Failed',
                    icon: <AlertCircle className="h-12 w-12 text-yellow-500" />,
                    actionText: 'Update Payment Method',
                    actionLink: '/coach/settings?tab=billing'
                };
            case 'error':
                return {
                    title: 'Verification Error',
                    icon: <AlertCircle className="h-12 w-12 text-red-500" />,
                    actionText: 'Contact Support',
                    actionLink: '/contact'
                };
            default:
                return {
                    title: 'Subscription Issue',
                    icon: <AlertCircle className="h-12 w-12 text-orange-500" />,
                    actionText: 'Manage Subscription',
                    actionLink: '/coach/settings?tab=billing'
                };
        }
    };

    const details = getReasonDetails();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        {details.icon}
                    </div>
                    <CardTitle className="text-2xl">{details.title}</CardTitle>
                    <CardDescription className="mt-2">
                        {message}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <Button 
                            asChild
                            className="w-full"
                        >
                            <Link href={details.actionLink}>
                                {details.actionText}
                            </Link>
                        </Button>
                        <Button 
                            variant="outline"
                            onClick={() => router.back()}
                            className="w-full"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Go Back
                        </Button>
                    </div>
                    <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                        <p>
                            Need help?{' '}
                            <Link href="/contact" className="text-primary hover:underline">
                                Contact Support
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function SubscriptionErrorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <AlertCircle className="h-12 w-12 text-orange-500 animate-pulse" />
                        </div>
                        <CardTitle className="text-2xl">Loading...</CardTitle>
                    </CardHeader>
                </Card>
            </div>
        }>
            <SubscriptionErrorContent />
        </Suspense>
    );
}

