"use client"
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react';

function AccessDeniedContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const reasonParam = searchParams.get('reason');
        const messageParam = searchParams.get('message');
        
        setReason(reasonParam || 'coach_subscription_inactive');
        setMessage(messageParam || 'Access is temporarily unavailable.');
    }, [searchParams]);

    const getReasonDetails = () => {
        switch (reason) {
            case 'coach_subscription_inactive':
                return {
                    title: 'Access Temporarily Unavailable',
                    icon: <AlertCircle className="h-12 w-12 text-orange-500" />,
                    description: 'Your coach\'s subscription is currently inactive. This may be due to an expired subscription, payment issue, or cancellation.'
                };
            case 'no_coach_assigned':
                return {
                    title: 'No Coach Assigned',
                    icon: <AlertCircle className="h-12 w-12 text-blue-500" />,
                    description: 'You don\'t have a coach assigned to your account. Please contact support for assistance.'
                };
            case 'client_not_found':
                return {
                    title: 'Account Issue',
                    icon: <AlertCircle className="h-12 w-12 text-red-500" />,
                    description: 'There was an issue verifying your account. Please contact support.'
                };
            case 'error':
                return {
                    title: 'Verification Error',
                    icon: <AlertCircle className="h-12 w-12 text-red-500" />,
                    description: 'Unable to verify your access. Please contact support for assistance.'
                };
            default:
                return {
                    title: 'Access Denied',
                    icon: <AlertCircle className="h-12 w-12 text-orange-500" />,
                    description: message || 'Access is temporarily unavailable.'
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
                        {details.description}
                    </CardDescription>
                    {message && message !== details.description && (
                        <CardDescription className="mt-2 text-sm">
                            {message}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            <strong>What you can do:</strong>
                        </p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                            <li>Contact your coach to resolve the subscription issue</li>
                            <li>Reach out to our support team for assistance</li>
                            <li>Check back later once the issue is resolved</li>
                        </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button 
                            variant="outline"
                            onClick={() => router.back()}
                            className="w-full"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Go Back
                        </Button>
                        <Button 
                            asChild
                            variant="secondary"
                            className="w-full"
                        >
                            <Link href="/contact">
                                <Mail className="mr-2 h-4 w-4" />
                                Contact Support
                            </Link>
                        </Button>
                    </div>
                    <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                        <p>
                            We apologize for the inconvenience. Access will be restored once your coach's subscription is active.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AccessDeniedPage() {
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
            <AccessDeniedContent />
        </Suspense>
    );
}

