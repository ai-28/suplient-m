"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Loader2, CreditCard, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomPaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [coachName, setCoachName] = useState('');
  const [coachId, setCoachId] = useState(null);
  const [hasCoach, setHasCoach] = useState(true);
  const [loadingCoach, setLoadingCoach] = useState(true);

  useEffect(() => {
    // Only redirect non-clients if authenticated (allow unauthenticated users to view page)
    if (status === 'authenticated' && session?.user?.role !== 'client') {
      router.push('/access-denied');
    }
  }, [status, session, router]);

  useEffect(() => {
    // Check for coach parameter in URL first, then fall back to logged-in client's coach
    const fetchCoachInfo = async () => {
      try {
        setLoadingCoach(true);
        
        // Check URL for coach parameter
        const urlParams = new URLSearchParams(window.location.search);
        const coachIdFromUrl = urlParams.get('coach');
        
        let coachData = null;
        
        if (coachIdFromUrl) {
          // Fetch coach by ID from URL parameter (public endpoint)
          const response = await fetch(`/api/coach/info?coachId=${coachIdFromUrl}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.coach) {
              coachData = data.coach;
              setCoachId(coachIdFromUrl);
            }
          }
        }
        
        // If no coach from URL, try to get from logged-in client's assigned coach
        if (!coachData && session?.user?.id && session?.user?.role === 'client') {
          const response = await fetch('/api/client/coach');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.coach && data.coach.id) {
              coachData = data.coach;
              setCoachId(data.coach.id);
            }
          }
        }
        
        if (coachData && coachData.name) {
          setCoachName(coachData.name);
          setHasCoach(true);
        } else {
          setHasCoach(false);
        }
      } catch (error) {
        console.error('Error fetching coach info:', error);
        setHasCoach(false);
      } finally {
        setLoadingCoach(false);
      }
    };

    // Fetch coach info regardless of auth status (page is public)
    fetchCoachInfo();
  }, [session, status]);

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Require login before payment
    if (status === 'unauthenticated' || session?.user?.role !== 'client') {
      toast.error('Please login to make a payment');
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }

    if (!coachId) {
      toast.error('Coach information not available');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/client/custom-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(parseFloat(amount) * 100), // Convert to øre
          description: description || 'Custom payment',
          coachId: coachId, // Include coach ID from URL or assigned coach
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment');
      }

      const data = await response.json();

      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loadingCoach) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!hasCoach) {
    const urlParams = new URLSearchParams(window.location.search);
    const coachIdFromUrl = urlParams.get('coach');
    const isLoggedIn = status === 'authenticated' && session?.user?.role === 'client';
    
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        {isLoggedIn && (
          <Button
            variant="ghost"
            onClick={() => router.push('/client/profile?tab=billing')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Custom Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {coachIdFromUrl 
                  ? 'Coach not found or payment account not set up. Please contact the coach directly or check the payment link.'
                  : isLoggedIn
                    ? 'You don\'t have a coach assigned. Please contact support to get assigned to a coach.'
                    : 'Please use a valid payment link with a coach parameter, or login if you have an account.'}
              </p>
              {isLoggedIn ? (
                <Button onClick={() => router.push('/client/profile?tab=billing')}>
                  Go to Profile
                </Button>
              ) : (
                <Button onClick={() => router.push('/login')}>
                  Login
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoggedIn = status === 'authenticated' && session?.user?.role === 'client';

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      {isLoggedIn && (
        <Button
          variant="ghost"
          onClick={() => router.push('/client/profile?tab=billing')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Custom Payment
          </CardTitle>
          <CardDescription>
            Make a custom payment to {coachName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="amount">Amount (DKK) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="0.01"
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter the amount you want to pay
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Payment description or note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          {status === 'unauthenticated' && (
            <div className="p-4 rounded-lg border bg-muted/30 mb-4">
              <p className="text-sm text-muted-foreground mb-3">
                Please login to make a payment. You'll be redirected to login after clicking the button.
              </p>
            </div>
          )}

          <Button
            onClick={handlePayment}
            disabled={processing || !amount || parseFloat(amount) <= 0 || !coachId}
            className="w-full"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                {status === 'unauthenticated' ? 'Login to Pay' : `Pay ${amount ? `${parseFloat(amount).toFixed(2)} DKK` : ''}`}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

