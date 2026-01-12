"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/app/components/ui/alert-dialog";
import { GroupOverviewModal } from "@/app/components/GroupOverviewModal";
import { MembershipRequestDialog } from "@/app/components/MembershipRequestDialog";
import { IconPicker } from "@/app/components/IconPicker";
import { ColorPicker } from "@/app/components/ColorPicker";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  Bell,
  Target,
  TrendingUp,
  Users,
  Clock,
  UserPlus,
  MessageCircle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  TrendingDown,
  Camera,
  X,
  Loader2,
  LogOut,
  UserX,
  CreditCard,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useGroups } from "@/app/hooks/useGroups";
import { toast } from "sonner";

// Demo data for goals and habits
const demoGoals = [
  {
    id: 1,
    name: "Exercise Regularly",
    description: "Work out at least 3 times per week",
    isActive: true,
    isCustom: false,
    category: "health",
    targetValue: 3,
    currentValue: 2,
    unit: "times per week",
    progress: 67
  },
  {
    id: 2,
    name: "Meditate Daily",
    description: "Practice mindfulness meditation for 10 minutes daily",
    isActive: true,
    isCustom: false,
    category: "mindfulness",
    targetValue: 7,
    currentValue: 5,
    unit: "days per week",
    progress: 71
  },
  {
    id: 3,
    name: "Read Books",
    description: "Read for at least 30 minutes every day",
    isActive: false,
    isCustom: true,
    category: "learning",
    targetValue: 7,
    currentValue: 4,
    unit: "days per week",
    progress: 57
  },
  {
    id: 4,
    name: "Drink More Water",
    description: "Drink at least 8 glasses of water daily",
    isActive: true,
    isCustom: true,
    category: "health",
    targetValue: 8,
    currentValue: 6,
    unit: "glasses per day",
    progress: 75
  }
];

const demoBadHabits = [
  {
    id: 1,
    name: "Smoking",
    description: "Reduce cigarette consumption",
    isActive: true,
    isCustom: false,
    category: "health",
    targetValue: 0,
    currentValue: 2,
    unit: "cigarettes per day",
    progress: 80 // 80% reduction
  },
  {
    id: 2,
    name: "Late Night Snacking",
    description: "Avoid eating after 9 PM",
    isActive: true,
    isCustom: true,
    category: "health",
    targetValue: 0,
    currentValue: 3,
    unit: "nights per week",
    progress: 57 // 57% reduction
  },
  {
    id: 3,
    name: "Excessive Screen Time",
    description: "Limit phone usage to 2 hours per day",
    isActive: false,
    isCustom: true,
    category: "productivity",
    targetValue: 2,
    currentValue: 4,
    unit: "hours per day",
    progress: 50
  }
];

// Custom hook for goal tracking
const useGoalTracking = () => {
  const [goals, setGoals] = useState([]);
  const [badHabits, setBadHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch goals data from API
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/client/goals');
        const data = await response.json();

        if (data.success) {
          setGoals(data.goals);
          setBadHabits(data.badHabits);
        } else {
          setError('Failed to load goals data');
          // Fallback to demo data
          setGoals(demoGoals);
          setBadHabits(demoBadHabits);
        }
      } catch (err) {
        console.error('Error fetching goals:', err);
        setError('Failed to load goals data');
        // Fallback to demo data
        setGoals(demoGoals);
        setBadHabits(demoBadHabits);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  const toggleGoal = async (goalId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    try {
      const response = await fetch('/api/client/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goalId,
          type: 'goal',
          isActive: !goal.isActive
        })
      });

      const data = await response.json();
      if (data.success) {
        setGoals(prev => prev.map(g => 
          g.id === goalId ? { ...g, isActive: !g.isActive } : g
        ));
      } else {
        throw new Error(data.error || 'Failed to update goal');
      }
    } catch (error) {
      console.error('Error toggling goal:', error);
      throw error;
    }
  };

  const toggleBadHabit = async (habitId) => {
    const habit = badHabits.find(h => h.id === habitId);
    if (!habit) return;

    try {
      const response = await fetch('/api/client/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: habitId,
          type: 'habit',
          isActive: !habit.isActive
        })
      });

      const data = await response.json();
      if (data.success) {
        setBadHabits(prev => prev.map(h => 
          h.id === habitId ? { ...h, isActive: !h.isActive } : h
        ));
      } else {
        throw new Error(data.error || 'Failed to update habit');
      }
    } catch (error) {
      console.error('Error toggling habit:', error);
      throw error;
    }
  };

  const addCustomGoal = async (name, icon = '🎯', color = '#3B82F6') => {
    try {
      const response = await fetch('/api/client/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'goal',
          name,
          icon,
          color
        })
      });

      const data = await response.json();
      if (data.success) {
        setGoals(prev => [...prev, data.goal]);
        return data.goal;
      } else {
        throw new Error(data.error || 'Failed to create goal');
      }
    } catch (error) {
      console.error('Error adding custom goal:', error);
      throw error;
    }
  };

  const removeCustomGoal = async (goalId) => {
    try {
      const response = await fetch(`/api/client/goals?id=${goalId}&type=goal`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setGoals(prev => prev.filter(goal => goal.id !== goalId));
      } else {
        throw new Error(data.error || 'Failed to delete goal');
      }
    } catch (error) {
      console.error('Error removing custom goal:', error);
      throw error;
    }
  };

  const addCustomBadHabit = async (name, icon = '📱', color = '#EF4444') => {
    try {
      const response = await fetch('/api/client/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'habit',
          name,
          icon,
          color
        })
      });

      const data = await response.json();
      if (data.success) {
        setBadHabits(prev => [...prev, data.habit]);
        return data.habit;
      } else {
        throw new Error(data.error || 'Failed to create habit');
      }
    } catch (error) {
      console.error('Error adding custom habit:', error);
      throw error;
    }
  };

  const removeCustomBadHabit = async (habitId) => {
    try {
      const response = await fetch(`/api/client/goals?id=${habitId}&type=habit`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setBadHabits(prev => prev.filter(habit => habit.id !== habitId));
      } else {
        throw new Error(data.error || 'Failed to delete habit');
      }
    } catch (error) {
      console.error('Error removing custom habit:', error);
      throw error;
    }
  };

  const calculateOverallScore = () => {
    const activeGoals = goals.filter(goal => goal.isActive);
    if (activeGoals.length === 0) return 0;
    
    const totalScore = activeGoals.reduce((sum, goal) => sum + (goal.currentScore || 0), 0);
    return Math.round((totalScore / (activeGoals.length * 5)) * 100);
  };

  return {
    goals,
    badHabits,
    toggleGoal,
    toggleBadHabit,
    addCustomGoal,
    removeCustomGoal,
    addCustomBadHabit,
    removeCustomBadHabit,
    calculateOverallScore,
    loading,
    error
  };
};

function ClientBillingTab({ loading, subscriptions, payments, paymentMethods, onCancelSubscription, onRefresh, isMobile, userData }) {
  const { data: session } = useSession();
  const [creatingSubscription, setCreatingSubscription] = useState(null);
  const [coachProducts, setCoachProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Fetch coach's products
  useEffect(() => {
    const fetchCoachProducts = async () => {
      try {
        setProductsLoading(true);
        const response = await fetch('/api/client/coach/products');
        if (response.ok) {
          const data = await response.json();
          setCoachProducts(data.products || []);
        }
      } catch (error) {
        console.error('Error fetching coach products:', error);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchCoachProducts();
  }, []);

  const handleCreateSubscription = async (coachId, productType) => {
    try {
      setCreatingSubscription(`${coachId}-${productType}`);
      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId, productType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create subscription');
      }

      const data = await response.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error(error.message || 'Failed to create subscription');
    } finally {
      setCreatingSubscription(null);
    }
  };

  // Check if client has active subscription for a product type
  const hasActiveSubscription = (productType) => {
    return subscriptions.some(
      sub => sub.productType === productType && 
      (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due')
    );
  };

  // Get coach ID
  const coachId = userData?.coachId || session?.user?.coachId;

  // Get product by type
  const getProduct = (productType) => {
    return coachProducts.find(p => p.productType === productType);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading billing information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Available Subscriptions */}
      {coachId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Subscribe to Services
            </CardTitle>
            <CardDescription>Subscribe to your coach's programs or groups</CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading products...</span>
              </div>
            ) : coachProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  Your coach hasn't set up subscription products yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Program Subscription */}
                {getProduct('program') && (
                  <div className={`p-4 rounded-lg border ${isMobile ? 'p-3' : ''}`}>
                    <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>Program Subscription</h4>
                        <p className={`text-muted-foreground mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          Access to your coach's program
                        </p>
                        <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                          {(getProduct('program').amount / 100).toFixed(0)} {getProduct('program').currency?.toUpperCase() || 'DKK'}/month
                        </p>
                      </div>
                      <Button
                        onClick={() => handleCreateSubscription(coachId, 'program')}
                        disabled={creatingSubscription?.includes('program') || hasActiveSubscription('program')}
                        className={isMobile ? 'w-full mt-2' : 'ml-4'}
                        size={isMobile ? 'sm' : 'default'}
                      >
                        {creatingSubscription?.includes('program') ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : hasActiveSubscription('program') ? (
                          'Already Subscribed'
                        ) : (
                          'Subscribe'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Group Subscription */}
                {getProduct('group') && (
                  <div className={`p-4 rounded-lg border ${isMobile ? 'p-3' : ''}`}>
                    <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>Group Membership</h4>
                        <p className={`text-muted-foreground mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          Join your coach's group sessions
                        </p>
                        <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                          {(getProduct('group').amount / 100).toFixed(0)} {getProduct('group').currency?.toUpperCase() || 'DKK'}/month
                        </p>
                      </div>
                      <Button
                        onClick={() => handleCreateSubscription(coachId, 'group')}
                        disabled={creatingSubscription?.includes('group') || hasActiveSubscription('group')}
                        className={isMobile ? 'w-full mt-2' : 'ml-4'}
                        size={isMobile ? 'sm' : 'default'}
                      >
                        {creatingSubscription?.includes('group') ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : hasActiveSubscription('group') ? (
                          'Already Subscribed'
                        ) : (
                          'Subscribe'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Active Subscriptions
          </CardTitle>
          <CardDescription>Your active subscriptions to coach services</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active subscriptions</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">
                        {sub.productType === 'program' && 'Program Subscription'}
                        {sub.productType === 'group' && 'Group Membership'}
                      </h4>
                      <p className="text-sm text-muted-foreground">Coach: {sub.coachName}</p>
                    </div>
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                      {sub.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-semibold">{(sub.amount / 100).toFixed(0)} DKK/month</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Next billing</p>
                      <p className="text-sm">
                        {sub.currentPeriodEnd 
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {sub.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => onCancelSubscription(sub.stripeSubscriptionId)}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your recent payments</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payment history</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{payment.description || 'Payment'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{(payment.amount / 100).toFixed(0)} DKK</p>
                    <Badge variant={payment.status === 'succeeded' ? 'default' : 'secondary'} className="text-xs">
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Payment */}
      {coachId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Custom Payment
            </CardTitle>
            <CardDescription>Make a custom payment to your coach</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground mb-4">
                Need to make a custom payment? Enter any amount you'd like to pay to your coach.
              </p>
              <Button
                onClick={() => window.location.href = '/client/custom-payment'}
                className="w-full"
                variant="outline"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Make Custom Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Your saved payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payment methods saved</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {method.brand?.toUpperCase()} •••• {method.last4}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires {method.expMonth}/{method.expYear}
                      </p>
                    </div>
                  </div>
                  {method.isDefault && (
                    <Badge variant="outline">Default</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientProfile() {
  const { data: session } = useSession();
  const router = useRouter();
  const { 
    goals, 
    badHabits, 
    toggleGoal, 
    toggleBadHabit, 
    addCustomGoal, 
    removeCustomGoal,
    addCustomBadHabit,
    removeCustomBadHabit,
    calculateOverallScore,
    loading: goalsLoading,
    error: goalsError
  } = useGoalTracking();

  // Get real groups data
  const { groups, loading: groupsLoading, error: groupsError } = useGroups();

  // Group overview modal state
  const [groupOverviewOpen, setGroupOverviewOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // Membership request dialog state
  const [membershipRequestOpen, setMembershipRequestOpen] = useState(false);
  const [selectedGroupForRequest, setSelectedGroupForRequest] = useState(null);

  // User data state
  const [userData, setUserData] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    birthdate: "",
    bio: ""
  });

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Deactivate profile state
  const [deactivating, setDeactivating] = useState(false);

  // Billing state
  const [billingLoading, setBillingLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [activeTab, setActiveTab] = useState('personal');

  // Fetch billing data
  const fetchBillingData = async () => {
    if (!session?.user?.id) return;
    
    try {
      setBillingLoading(true);
      
      // Fetch subscriptions
      const subsResponse = await fetch('/api/client/subscriptions');
      if (subsResponse.ok) {
        const subsData = await subsResponse.json();
        setSubscriptions(subsData.subscriptions || []);
      }

      // Fetch payments
      const paymentsResponse = await fetch('/api/client/payments');
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setPayments(paymentsData.payments || []);
      }

      // Fetch payment methods
      const methodsResponse = await fetch('/api/client/payment-methods');
      if (methodsResponse.ok) {
        const methodsData = await methodsResponse.json();
        setPaymentMethods(methodsData.paymentMethods || []);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setBillingLoading(false);
    }
  };

  // Handle URL params for billing tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (tab === 'billing') {
        setActiveTab('billing');
      }
    }
  }, []);

  // Fetch billing data when billing tab is accessed or on mount
  useEffect(() => {
    if (session?.user?.id && activeTab === 'billing') {
      fetchBillingData();
    }
  }, [activeTab, session?.user?.id]);

  // Handle subscription cancellation
  const handleCancelSubscription = async (subscriptionId) => {
    try {
      const response = await fetch(`/api/client/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel subscription');
      }

      toast.success('Subscription will be canceled at the end of the billing period');
      fetchBillingData();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error(error.message || 'Failed to cancel subscription');
    }
  };

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/user/profile');
        const data = await response.json();

        if (data.success && data.user) {
          console.log('User data loaded:', data.user);
          console.log('Coach data:', {
            coachId: data.user.coachId,
            coachName: data.user.coachName,
            coachEmail: data.user.coachEmail,
            coachPhone: data.user.coachPhone
          });
          setUserData(data.user);

          // Update form data with real user data
          const formattedBirthdate = data.user.dateofBirth ? 
            (data.user.dateofBirth.includes('T') ? data.user.dateofBirth.split('T')[0] : data.user.dateofBirth) : '';
          
          console.log('Formatted birthdate:', formattedBirthdate);
          
          setFormData({
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            birthdate: formattedBirthdate,
            bio: data.user.bio || ''
          });
          
          // Set avatar preview if exists
          if (data.user.avatar) {
            setAvatarPreview(data.user.avatar);
          }

          // Load notification preference from database
          if (data.user.notificationsEnabled !== undefined) {
            setNotificationsEnabled(data.user.notificationsEnabled !== false);
            // Also sync to localStorage for backward compatibility (only on client)
            if (typeof window !== 'undefined') {
              localStorage.setItem('notificationsEnabled', (data.user.notificationsEnabled !== false).toString());
            }
          } else {
            // Fallback to localStorage if database doesn't have it yet (only on client)
            if (typeof window !== 'undefined') {
              const savedNotificationPreference = localStorage.getItem('notificationsEnabled');
              if (savedNotificationPreference !== null) {
                setNotificationsEnabled(savedNotificationPreference === 'true');
              }
            }
          }
        } else {
          toast.error('Failed to load user data');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [session?.user?.id]);


  const [showCustomGoalDialog, setShowCustomGoalDialog] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalIcon, setNewGoalIcon] = useState("🎯");
  const [newGoalColor, setNewGoalColor] = useState("#3B82F6");
  
  const [showCustomBadHabitDialog, setShowCustomBadHabitDialog] = useState(false);
  const [newBadHabitName, setNewBadHabitName] = useState("");
  const [newBadHabitIcon, setNewBadHabitIcon] = useState("📱");
  const [newBadHabitColor, setNewBadHabitColor] = useState("#EF4444");

  // Contact therapist dialog state
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Mobile detection with more breakpoints
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640); // sm breakpoint
      setIsTablet(width >= 640 && width < 1024); // md breakpoint
    };

    // Check on mount
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleAddCustomGoal = async () => {
    if (!newGoalName.trim()) {
      toast.error("Please enter a goal name");
      return;
    }
    
    try {
      await addCustomGoal(newGoalName.trim(), newGoalIcon, newGoalColor);
      setNewGoalName("");
      setNewGoalIcon("🎯");
      setNewGoalColor("#3B82F6");
      setShowCustomGoalDialog(false);
      toast.success("Custom goal added successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to add custom goal");
    }
  };

  const handleAddCustomBadHabit = async () => {
    if (!newBadHabitName.trim()) {
      toast.error("Please enter a habit name");
      return;
    }
    
    try {
      await addCustomBadHabit(newBadHabitName.trim(), newBadHabitIcon, newBadHabitColor);
      setNewBadHabitName("");
      setNewBadHabitIcon("📱");
      setNewBadHabitColor("#EF4444");
      setShowCustomBadHabitDialog(false);
      toast.success("Custom habit added successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to add custom habit");
    }
  };

  const handleToggleGoal = async (goalId) => {
    try {
      await toggleGoal(goalId);
      toast.success("Goal updated successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to update goal");
    }
  };

  const handleToggleBadHabit = async (habitId) => {
    try {
      await toggleBadHabit(habitId);
      toast.success("Habit tracking updated!");
    } catch (error) {
      toast.error(error.message || "Failed to update habit");
    }
  };

  const handleRemoveCustomGoal = async (goalId, goalName) => {
    try {
      await removeCustomGoal(goalId);
      toast.success(`"${goalName}" removed successfully!`);
    } catch (error) {
      toast.error(error.message || "Failed to remove goal");
    }
  };

  const handleRemoveCustomBadHabit = async (habitId, habitName) => {
    try {
      await removeCustomBadHabit(habitId);
      toast.success(`"${habitName}" removed successfully!`);
    } catch (error) {
      toast.error(error.message || "Failed to remove habit");
    }
  };

  const handleNotificationToggle = async (enabled) => {
    setNotificationsEnabled(enabled);
    
    try {
      // Save notification preference to database
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          birthdate: formData.birthdate,
          bio: formData.bio,
          notificationsEnabled: enabled
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Also save to localStorage for backward compatibility
      localStorage.setItem('notificationsEnabled', enabled.toString());
      
      toast.success(
        enabled ? "Notifications enabled" : "Notifications disabled",
        {
          description: enabled 
            ? "You'll receive notifications for messages, tasks, and sessions"
            : "You won't receive any notifications"
        }
      );
      } else {
        throw new Error(data.error || 'Failed to save notification preference');
      }
    } catch (error) {
      console.error('Error saving notification preference:', error);
      toast.error("Failed to save notification preference");
      // Revert state on error
      setNotificationsEnabled(!enabled);
    }
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle opening group overview modal
  const handleViewGroup = (group) => {
    setSelectedGroup(group);
    setGroupOverviewOpen(true);
  };

  // Handle avatar file selection
  const handleAvatarFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Check if file is HEIC/HEIF
      const isHeic = file.type === 'image/heic' || 
                     file.type === 'image/heif' || 
                     file.name.toLowerCase().endsWith('.heic') || 
                     file.name.toLowerCase().endsWith('.heif');

      let fileToUse = file;

      // Convert HEIC to JPEG if needed
      if (isHeic) {
        try {
          // Dynamically import heic2any only on client side
          if (typeof window === 'undefined') {
            toast.error('HEIC conversion is not available on server side');
            return;
          }
          
          const heic2any = (await import('heic2any')).default;
          toast.info('Converting HEIC image to JPEG...', { duration: 2000 });
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9
          });
          
          // heic2any returns an array, get the first item
          const convertedFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          
          // Create a File object from the blob
          fileToUse = new File([convertedFile], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          toast.success('HEIC image converted successfully', { duration: 2000 });
        } catch (conversionError) {
          const errorDetails = {
            message: conversionError.message,
            name: conversionError.name,
            stack: conversionError.stack,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          };
          console.error('Error converting HEIC:', errorDetails);
          toast.error('Failed to convert HEIC image', {
            description: conversionError.message || 'Please try converting it to JPEG first, or use a different image format.'
          });
          return;
        }
      }

      // Validate file type (after conversion)
      if (!fileToUse.type.startsWith('image/')) {
        const fileSizeMB = (fileToUse.size / (1024 * 1024)).toFixed(2);
        const errorDetails = `File type: ${fileToUse.type || 'unknown'}, Size: ${fileSizeMB}MB, Name: ${fileToUse.name}`;
        console.error('Invalid file type:', errorDetails);
        toast.error(`Invalid file type (${fileToUse.type || 'unknown'}). Please select a JPG, PNG, WebP, GIF, or HEIC image.`, {
          description: `File: ${fileToUse.name} (${fileSizeMB}MB)`
        });
        return;
      }

      // Validate file size (10MB max)
      if (fileToUse.size > 10 * 1024 * 1024) {
        const fileSizeMB = (fileToUse.size / (1024 * 1024)).toFixed(2);
        const errorDetails = `File: ${fileToUse.name}, Type: ${fileToUse.type}, Size: ${fileSizeMB}MB (max: 10MB)`;
        console.error('File too large:', errorDetails);
        toast.error(`Image too large (${fileSizeMB}MB). Maximum size is 10MB.`, {
          description: `Please compress or resize your image. File: ${fileToUse.name}`
        });
        return;
      }

      // Store the file for upload
      setSelectedFile(fileToUse);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(fileToUse);
    } catch (error) {
      const errorDetails = {
        message: error.message,
        name: error.name,
        fileName: file?.name,
        fileType: file?.type,
        fileSize: file?.size
      };
      console.error('Error processing image:', errorDetails, error);
      toast.error('Failed to process image', {
        description: error.message || 'An unexpected error occurred. Please try again or use a different image.'
      });
    }
  };

  // Upload file using presigned URL (bypasses Next.js body size limit)
  const uploadWithPresignedUrl = async (presignedUrl, file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      // Set timeout (5 minutes for avatar uploads)
      xhr.timeout = 5 * 60 * 1000;

      // Start upload
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  // Handle avatar upload
  const handleAvatarUpload = async () => {
    // Use the selected file (which may have been converted from HEIC)
    const file = selectedFile;
    
    if (!file) {
      toast.error('Please select an image file');
      return;
    }

    try {
      setUploadingAvatar(true);

      // Step 1: Get presigned URL
      const initiateResponse = await fetch('/api/user/avatar/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      });

      if (!initiateResponse.ok) {
        let errorMessage = 'Failed to initiate avatar upload';
        let errorDetails = null;
        
        try {
          const errorData = await initiateResponse.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || null;
        } catch (e) {
          errorMessage = `Failed to initiate upload (${initiateResponse.status} ${initiateResponse.statusText})`;
        }
        
        toast.error(errorMessage, {
          description: errorDetails || `File: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`
        });
        return;
      }

      const initiateResult = await initiateResponse.json();
      
      if (!initiateResult.success) {
        toast.error(initiateResult.error || 'Failed to initiate upload', {
          description: initiateResult.details || `File: ${file.name}`
        });
        return;
      }

      // Step 2: Upload file directly to S3 using presigned URL
      await uploadWithPresignedUrl(
        initiateResult.presignedUrl,
        file,
        (progress) => {
          // Optional: Update progress if needed
          console.log(`Upload progress: ${progress.toFixed(0)}%`);
        }
      );

      // Step 3: Complete upload (update user record)
      const completeResponse = await fetch('/api/user/avatar/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: initiateResult.filePath,
        }),
      });

      if (!completeResponse.ok) {
        let errorMessage = 'Failed to complete avatar upload';
        try {
          const errorData = await completeResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Failed to complete upload (${completeResponse.status})`;
        }
        toast.error(errorMessage);
        return;
      }

      const completeResult = await completeResponse.json();

      if (completeResult.success) {
        toast.success('Avatar uploaded successfully!');
        // Clear selected file and preview
        setSelectedFile(null);
        setAvatarPreview(null);
        // Clear file input
        if (typeof document !== 'undefined') {
          const fileInput = document.getElementById('avatar-upload-client');
          if (fileInput) fileInput.value = '';
        }
        // Update user data with new avatar
        setUserData(prev => ({
          ...prev,
          avatar: completeResult.avatarUrl
        }));
        // Refresh session to get updated avatar
        if (typeof window !== 'undefined') {
          // Small delay to ensure state is updated before reload
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      } else {
        toast.error(completeResult.error || 'Failed to complete avatar upload');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      
      let errorMessage = 'Failed to upload avatar';
      let errorDescription = null;
      
      if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
        errorMessage = 'Network error';
        errorDescription = 'Please check your internet connection and try again.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Connection failed';
        errorDescription = 'Unable to connect to server. Please check your connection and try again later.';
      } else if (error.message) {
        errorMessage = error.message;
        errorDescription = `File: ${file?.name || 'unknown'}`;
      } else {
        errorDescription = `File: ${file?.name || 'unknown'}. Please try again.`;
      }
      
      toast.error(errorMessage, {
        description: errorDescription
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle avatar removal
  const handleAvatarRemove = async () => {
    try {
      setUploadingAvatar(true);

      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Avatar removed successfully!');
        setAvatarPreview(null);
        // Update user data
        setUserData(prev => ({
          ...prev,
          avatar: null
        }));
        // Refresh session
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        toast.error(data.error || 'Failed to remove avatar');
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Failed to remove avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle save profile
  const handleSaveProfile = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update userData with the response
        setUserData(data.user);
        toast.success('Profile updated successfully!');
      } else {
        throw new Error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle deactivate profile
  const handleDeactivateProfile = async () => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to deactivate your profile');
      return;
    }

    try {
      setDeactivating(true);
      const response = await fetch('/api/user/deactivate-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Profile deactivated successfully');
        // Sign out after deactivation
        setTimeout(() => {
          signOut({ callbackUrl: '/login' });
        }, 2000);
      } else {
        toast.error(data.error || 'Failed to deactivate profile');
      }
    } catch (error) {
      console.error('Error deactivating profile:', error);
      toast.error('Failed to deactivate profile');
    } finally {
      setDeactivating(false);
    }
  };

  // Get assigned therapist from user data
  const assignedTherapist = userData?.coachId ? {
    name: userData.coachName || "Your Coach", 
    specialization: "Mental Health Professional", 
    since: "Recently",
    email: userData.coachEmail || "stevenjohn201315@gmail.com", // Use real coach email
    phone: userData.coachPhone || "+1 (555) 000-0000"
  } : {
    name: "Dr. Steven Johnson", 
    specialization: "Mental Health Professional", 
    since: "Recently",
    email: "stevenjohn201315@gmail.com", // Your actual coach email
    phone: "+1 (555) 000-0000"
  };

  // Get real groups data - joined groups and available groups
  const joinedGroups = groups.filter(group => group.isJoined);
  const availableGroups = groups.filter(group => !group.isJoined);
  
  // Transform joined groups to include additional data
  const transformedJoinedGroups = joinedGroups.map(group => ({
    id: group.id,
    name: group.name,
    description: group.description,
    members: group.members || 0,
    maxMembers: group.maxMembers || 15,
    joinedDate: "Recently", // We could calculate this from actual join date
    nextSession: "TBD", // We could get this from sessions API
    sessionFrequency: group.sessionFrequency || "Weekly",
    status: group.status || "Active",
    attendance: 0 // Default to 0 until we implement real attendance calculation
  }));

  const handleJoinRequest = (group) => {
    setSelectedGroupForRequest(group);
    setMembershipRequestOpen(true);
  };

  // Handle contact therapist
  const handleContactTherapist = () => {
    setShowContactDialog(true);
  };

  const handleSendMessage = async () => {
    if (!contactMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    console.log('Sending message with data:', {
      message: contactMessage.trim(),
      coachEmail: assignedTherapist.email,
      coachName: assignedTherapist.name,
      clientName: userData?.name || 'Client',
      userDataCoachEmail: userData?.coachEmail,
      userDataCoachId: userData?.coachId
    });

    try {
      setSendingMessage(true);
      
      const response = await fetch('/api/contact/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: contactMessage.trim(),
          coachEmail: assignedTherapist.email,
          coachName: assignedTherapist.name,
          clientName: userData?.name || 'Client'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Message sent successfully!');
        setContactMessage("");
        setShowContactDialog(false);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className={`${isMobile ? 'px-4 pb-24' : 'pb-6'}`}>
        <div className={`space-y-6 ${isMobile ? 'space-y-4' : 'space-y-8'} max-w-6xl mx-auto`}>
          <div className={`${isMobile ? 'text-center pt-4' : 'pt-6'}`}>
            <h1 className={`font-bold tracking-tight ${isMobile ? 'text-2xl' : 'text-3xl'}`}>My Profile</h1>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm mt-1' : 'mt-2'}`}>
              Loading your profile...
            </p>
          </div>
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground text-sm">Please wait while we load your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'px-4 pb-24' : 'pb-6'}`}>
      <div className={`space-y-6 ${isMobile ? 'space-y-4' : 'space-y-8'} max-w-6xl mx-auto`}>
        <div className={`${isMobile ? 'text-center pt-4' : 'pt-6'} flex items-start justify-between`}>
          <div>
            <h1 className={`font-bold tracking-tight ${isMobile ? 'text-2xl' : 'text-3xl'}`}>My Profile</h1>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm mt-1' : 'mt-2'}`}>
              Manage your personal information and preferences.
            </p>
          </div>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="personal" className="space-y-4">
        <TabsList className={`w-full ${isMobile ? 'grid grid-cols-2 gap-1 h-auto p-1' : isTablet ? 'grid grid-cols-5 gap-1 h-auto p-2' : 'grid grid-cols-5'}`}>
          <TabsTrigger 
            value="personal" 
            className={`${isMobile ? 'h-14 text-xs px-1 py-2' : isTablet ? 'h-12 text-sm px-2 py-2' : 'flex-1'}`}
          >
            <div className={`flex items-center gap-1 ${isMobile ? 'flex-col' : 'flex-row'}`}>
              <User className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                {isMobile ? "Profile" : isTablet ? "Profile" : "Personal Info"}
              </span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="goals" 
            className={`${isMobile ? 'h-14 text-xs px-1 py-2' : isTablet ? 'h-12 text-sm px-2 py-2' : 'flex-1'}`}
          >
            <div className={`flex items-center gap-1 ${isMobile ? 'flex-col' : 'flex-row'}`}>
              <Target className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                {isMobile ? "Goals" : isTablet ? "Goals" : "Goals & Progress"}
              </span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="group" 
            className={`${isMobile ? 'h-14 text-xs px-1 py-2' : isTablet ? 'h-12 text-sm px-2 py-2' : 'flex-1'}`}
          >
            <div className={`flex items-center gap-1 ${isMobile ? 'flex-col' : 'flex-row'}`}>
              <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                {isMobile ? "Groups" : isTablet ? "Groups" : "My Group"}
              </span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className={`${isMobile ? 'h-14 text-xs px-1 py-2' : isTablet ? 'h-12 text-sm px-2 py-2' : 'flex-1'}`}
          >
            <div className={`flex items-center gap-1 ${isMobile ? 'flex-col' : 'flex-row'}`}>
              <Shield className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Settings</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="billing" 
            className={`${isMobile ? 'h-14 text-xs px-1 py-2' : isTablet ? 'h-12 text-sm px-2 py-2' : 'flex-1'}`}
          >
            <div className={`flex items-center gap-1 ${isMobile ? 'flex-col' : 'flex-row'}`}>
              <CreditCard className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Billing</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'md:grid-cols-3'}`}>
            {/* Profile Picture */}
            <Card className={`${isMobile ? 'order-2' : ''}`}>
              <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
                <CardTitle className={`${isMobile ? 'text-lg' : ''}`}>Profile Picture</CardTitle>
              </CardHeader>
              <CardContent className={`text-center space-y-4 ${isMobile ? 'py-4' : ''}`}>
                <div className="relative mx-auto inline-block">
                  <Avatar className={`${isMobile ? 'h-20 w-20' : 'h-24 w-24'}`}>
                    {avatarPreview || userData?.avatar ? (
                      <AvatarImage 
                        src={avatarPreview || userData?.avatar} 
                        alt={userData?.name || 'Profile'} 
                        key={userData?.avatar || 'no-avatar'} 
                      />
                    ) : null}
                    <AvatarFallback className={`bg-primary text-primary-foreground ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                      {userData ? 
                        (userData.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U') 
                        : 'U'
                      }
                    </AvatarFallback>
                  </Avatar>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-full">
                      <Loader2 className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} animate-spin text-primary`} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    id="avatar-upload-client"
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={handleAvatarFileSelect}
                    disabled={uploadingAvatar}
                  />
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size={isMobile ? "sm" : "sm"} 
                      className="w-full"
                      onClick={() => {
                        if (typeof document !== 'undefined') {
                          document.getElementById('avatar-upload-client')?.click();
                        }
                      }}
                      disabled={uploadingAvatar}
                    >
                      <Camera className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                      {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    {avatarPreview && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={handleAvatarUpload}
                          disabled={uploadingAvatar}
                          className="flex-1"
                        >
                          {uploadingAvatar ? (
                            <>
                              <Loader2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2 animate-spin`} />
                              Uploading...
                            </>
                          ) : (
                            'Save Photo'
                          )}
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAvatarPreview(userData?.avatar || null);
                            setSelectedFile(null);
                            if (typeof document !== 'undefined') {
                              const fileInput = document.getElementById('avatar-upload-client');
                              if (fileInput) fileInput.value = '';
                            }
                          }}
                          disabled={uploadingAvatar}
                        >
                          <X className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                        </Button>
                      </div>
                    )}
                    {userData?.avatar && !avatarPreview && (
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={handleAvatarRemove}
                        disabled={uploadingAvatar}
                        className="w-full text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className={`text-xs text-muted-foreground ${isMobile ? 'text-xs' : ''}`}>
                    JPG, PNG, WebP, GIF, or HEIC. Max 10MB. HEIC files will be automatically converted to JPEG.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <div className={`${isMobile ? 'order-1' : ''} ${isMobile ? '' : isTablet ? 'col-span-2' : 'md:col-span-2'}`}>
              <Card>
                <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
                  <CardTitle className={`${isMobile ? 'text-lg' : ''}`}>Personal Information</CardTitle>
                  <CardDescription className={`${isMobile ? 'text-sm' : ''}`}>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
                  <div className="space-y-2">
                    <Label htmlFor="name" className={`${isMobile ? 'text-sm' : ''}`}>Full Name *</Label>
                    <Input 
                      id="name" 
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`${isMobile ? 'h-10' : ''}`}
                      disabled={loading}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className={`${isMobile ? 'text-sm' : ''}`}>Email *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`${isMobile ? 'h-10' : ''}`}
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className={`${isMobile ? 'text-sm' : ''}`}>Phone</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`${isMobile ? 'h-10' : ''}`}
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="birthdate" className={`${isMobile ? 'text-sm' : ''}`}>Date of Birth</Label>
                    <Input 
                      id="birthdate" 
                      type="date" 
                      value={formData.birthdate}
                      onChange={(e) => handleInputChange('birthdate', e.target.value)}
                      className={`${isMobile ? 'h-10' : ''}`}
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio" className={`${isMobile ? 'text-sm' : ''}`}>About Me</Label>
                    <Textarea 
                      id="bio" 
                      placeholder="Tell us a bit about yourself..."
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      className={`${isMobile ? 'min-h-20' : 'min-h-24'}`}
                      disabled={loading}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={saving || loading}
                    className={`w-full ${isMobile ? 'h-10' : ''}`}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Assigned Therapist Section - Integrated into Personal Info */}
          <Card>
            <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
              <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
                <User className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                My Therapist
              </CardTitle>
              <CardDescription className={`${isMobile ? 'text-sm' : ''}`}>Your assigned mental health professional (full access)</CardDescription>
            </CardHeader>
            <CardContent className={`${isMobile ? 'p-3' : ''}`}>
              <div className={`${isMobile ? 'flex flex-col space-y-3 p-3' : 'flex items-center justify-between p-4'} border rounded-lg bg-muted/30`}>
                <div className={`flex items-center ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
                  <Avatar className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'}`}>
                    <AvatarFallback className={`bg-primary text-primary-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
                      {assignedTherapist.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`${isMobile ? 'flex-1' : ''}`}>
                    <h3 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{assignedTherapist.name}</h3>
                    <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>{assignedTherapist.specialization}</p>
                    <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-xs'}`}>Working together since {assignedTherapist.since}</p>
                  </div>
                </div>
                <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
                  <Button 
                    variant="outline" 
                    size={isMobile ? "sm" : "sm"} 
                    className={`${isMobile ? 'flex-1' : ''}`}
                    onClick={handleContactTherapist}
                  >
                    <MessageCircle className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-1'}`} />
                    Contact
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
          {/* Loading State */}
          {goalsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading goals...</span>
            </div>
          )}

          {/* Error State */}
          {goalsError && (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-red-500 mb-2">⚠️</div>
                <p className="text-muted-foreground">{goalsError}</p>
                <p className="text-sm text-muted-foreground mt-2">Using demo data as fallback</p>
              </CardContent>
            </Card>
          )}

          {/* Overall Progress */}
          {!goalsLoading && (
            <>
            <Card>
            <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
              <CardTitle className={`${isMobile ? 'text-lg' : ''}`}>Overall Progress</CardTitle>
              <CardDescription className={`${isMobile ? 'text-sm' : ''}`}>Your current goal achievement level</CardDescription>
            </CardHeader>
            <CardContent className={`${isMobile ? 'p-4' : ''}`}>
              <div className={`text-center space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
                <div className={`font-bold text-primary ${isMobile ? 'text-3xl' : 'text-4xl'}`}>
                  {calculateOverallScore()}%
                </div>
                <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
                  Based on {goals.filter(g => g.isActive).length} active goals
                </p>
                <div className={`w-full bg-secondary rounded-full ${isMobile ? 'h-2' : 'h-3'}`}>
                  <div 
                    className={`bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 ${isMobile ? 'h-2' : 'h-3'}`}
                    style={{ width: `${calculateOverallScore()}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Life Area Goals */}
          <Card>
            <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
              <CardTitle className={`flex items-center justify-between ${isMobile ? 'flex-col items-start gap-2' : ''}`}>
                <div className={`flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
                  <Target className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  Life Area Goals
                </div>
                <Badge variant="outline" className={`${isMobile ? 'text-xs' : ''}`}>
                  {goals.filter(g => g.isActive).length} / {goals.length} active
                </Badge>
              </CardTitle>
              <CardDescription className={`${isMobile ? 'text-sm' : ''}`}>
                Activate goals you want to track daily
              </CardDescription>
            </CardHeader>
            <CardContent className={`${isMobile ? 'p-3' : ''}`}>
              <div className={`space-y-3 ${isMobile ? 'space-y-2' : 'space-y-4'}`}>
                {goals.map((goal) => (
                  <div key={goal.id} className={`${isMobile ? 'flex flex-col space-y-3 p-3' : 'flex items-center justify-between p-4'} border rounded-lg`}>
                    <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'} flex-1`}>
                      <div className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>{goal.icon}</div>
                      <div className="flex-1">
                        <div className={`flex items-center gap-2 mb-1 ${isMobile ? 'flex-wrap' : ''}`}>
                          <h3 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{goal.name}</h3>
                          {goal.isCustom && (
                            <Badge variant="secondary" className={`${isMobile ? 'text-xs px-1 py-0' : 'text-xs'}`}>Custom</Badge>
                          )}
                        </div>
                        {goal.isActive && (
                          <div className={`mt-2 ${isMobile ? 'mt-1' : ''}`}>
                            <div className={`flex items-center gap-2 text-muted-foreground ${isMobile ? 'text-xs' : 'text-xs'}`}>
                              <span>Current: {goal.currentScore}/5</span>
                              <div className={`bg-secondary rounded-full ${isMobile ? 'w-12 h-1' : 'w-16 h-1'}`}>
                                <div 
                                  className={`rounded-full transition-all ${isMobile ? 'h-1' : 'h-1'}`}
                                  style={{ 
                                    width: `${(goal.currentScore / 5) * 100}%`,
                                    backgroundColor: goal.color
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 ${isMobile ? 'justify-between' : ''}`}>
                      {goal.isCustom && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCustomGoal(goal.id, goal.name)}
                          className={`text-destructive hover:text-destructive ${isMobile ? 'h-7 w-7' : 'h-8 w-8'}`}
                        >
                          <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                        </Button>
                      )}
                      <Switch
                        checked={goal.isActive}
                        onCheckedChange={() => handleToggleGoal(goal.id)}
                        className={`${isMobile ? 'ml-auto' : ''}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Add Custom Goal Button */}
              <div className={`mt-4 pt-4 border-t ${isMobile ? 'mt-3 pt-3' : ''}`}>
                {!showCustomGoalDialog ? (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCustomGoalDialog(true)}
                    className={`w-full ${isMobile ? 'h-10' : ''}`}
                  >
                    <Plus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                    Add Custom Goal
                  </Button>
                ) : (
                  <div className={`space-y-3 p-4 border rounded-lg bg-muted/20 ${isMobile ? 'space-y-2 p-3' : ''}`}>
                    <div className="space-y-2">
                      <Label className={`${isMobile ? 'text-sm' : ''}`}>Goal Name</Label>
                      <Input
                        placeholder="e.g., Learn a new skill"
                        value={newGoalName}
                        onChange={(e) => setNewGoalName(e.target.value)}
                        className={`${isMobile ? 'h-10' : ''}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={`${isMobile ? 'text-sm' : ''}`}>Icon</Label>
                      <IconPicker
                        value={newGoalIcon}
                        onChange={setNewGoalIcon}
                        placeholder="🎯"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={`${isMobile ? 'text-sm' : ''}`}>Color</Label>
                      <ColorPicker
                        value={newGoalColor}
                        onChange={setNewGoalColor}
                      />
                    </div>
                    <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                      <Button onClick={handleAddCustomGoal} size={isMobile ? "sm" : "sm"} className={`${isMobile ? 'w-full h-10' : ''}`}>
                        Add Goal
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowCustomGoalDialog(false);
                          setNewGoalName("");
                          setNewGoalIcon("🎯");
                          setNewGoalColor("#3B82F6");
                        }}
                        size={isMobile ? "sm" : "sm"}
                        className={`${isMobile ? 'w-full h-10' : ''}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bad Habits Tracking */}
          <Card>
            <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
              <CardTitle className={`flex items-center justify-between ${isMobile ? 'flex-col items-start gap-2' : ''}`}>
                <div className={`flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
                  <TrendingDown className={`text-destructive ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  Habits to Reduce
                </div>
                <Badge variant="outline" className={`${isMobile ? 'text-xs' : ''}`}>
                  {badHabits.filter(h => h.isActive).length} / {badHabits.length} tracking
                </Badge>
              </CardTitle>
              <CardDescription className={`${isMobile ? 'text-sm' : ''}`}>
                Select habits you want to track and reduce
              </CardDescription>
            </CardHeader>
            <CardContent className={`${isMobile ? 'p-3' : ''}`}>
              <div className={`space-y-3 ${isMobile ? 'space-y-2' : 'space-y-4'}`}>
                {badHabits.map((habit) => (
                  <div key={habit.id} className={`${isMobile ? 'flex flex-col space-y-3 p-3' : 'flex items-center justify-between p-4'} border rounded-lg`}>
                    <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'} flex-1`}>
                      <div className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>{habit.icon}</div>
                      <div className="flex-1">
                        <div className={`flex items-center gap-2 mb-1 ${isMobile ? 'flex-wrap' : ''}`}>
                          <h3 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{habit.name}</h3>
                          {habit.isCustom && (
                            <Badge variant="secondary" className={`${isMobile ? 'text-xs px-1 py-0' : 'text-xs'}`}>Custom</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 ${isMobile ? 'justify-between' : ''}`}>
                      {habit.isCustom && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCustomBadHabit(habit.id, habit.name)}
                          className={`text-destructive hover:text-destructive ${isMobile ? 'h-7 w-7' : 'h-8 w-8'}`}
                        >
                          <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                        </Button>
                      )}
                      <Switch
                        checked={habit.isActive}
                        onCheckedChange={() => handleToggleBadHabit(habit.id)}
                        className={`${isMobile ? 'ml-auto' : ''}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Add Custom Bad Habit Button */}
              <div className={`mt-4 pt-4 border-t ${isMobile ? 'mt-3 pt-3' : ''}`}>
                {!showCustomBadHabitDialog ? (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCustomBadHabitDialog(true)}
                    className={`w-full ${isMobile ? 'h-10' : ''}`}
                  >
                    <Plus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                    Add Custom Habit to Reduce
                  </Button>
                ) : (
                  <div className={`space-y-3 p-4 border rounded-lg bg-muted/20 ${isMobile ? 'space-y-2 p-3' : ''}`}>
                    <div className="space-y-2">
                      <Label className={`${isMobile ? 'text-sm' : ''}`}>Habit Name</Label>
                      <Input
                        placeholder="e.g., Excessive screen time"
                        value={newBadHabitName}
                        onChange={(e) => setNewBadHabitName(e.target.value)}
                        className={`${isMobile ? 'h-10' : ''}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={`${isMobile ? 'text-sm' : ''}`}>Icon</Label>
                      <IconPicker
                        value={newBadHabitIcon}
                        onChange={setNewBadHabitIcon}
                        placeholder="📱"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={`${isMobile ? 'text-sm' : ''}`}>Color</Label>
                      <ColorPicker
                        value={newBadHabitColor}
                        onChange={setNewBadHabitColor}
                      />
                    </div>
                    <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                      <Button onClick={handleAddCustomBadHabit} size={isMobile ? "sm" : "sm"} className={`${isMobile ? 'w-full h-10' : ''}`}>
                        Add Habit
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowCustomBadHabitDialog(false);
                          setNewBadHabitName("");
                          setNewBadHabitIcon("📱");
                          setNewBadHabitColor("#EF4444");
                        }}
                        size={isMobile ? "sm" : "sm"}
                        className={`${isMobile ? 'w-full h-10' : ''}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        <TabsContent value="group" className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
          {/* Loading State */}
          {groupsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading groups...</span>
            </div>
          )}

          {/* Error State */}
          {groupsError && (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-red-500 mb-2">⚠️</div>
                <p className="text-muted-foreground">{groupsError}</p>
                <p className="text-sm text-muted-foreground mt-2">Unable to load groups data</p>
              </CardContent>
            </Card>
          )}

          {/* Groups Content */}
          {!groupsLoading && !groupsError && (
            <>
              {/* My Groups Section */}
              {transformedJoinedGroups.length > 0 ? (
                <Card>
                  <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
                    <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
                      <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      My Groups ({transformedJoinedGroups.length})
                    </CardTitle>
                    <CardDescription className={`${isMobile ? 'text-sm' : ''}`}>Support groups you're currently participating in</CardDescription>
                  </CardHeader>
                  <CardContent className={`${isMobile ? 'p-3' : ''}`}>
                    <div className="space-y-4">
                      {transformedJoinedGroups.map((group, index) => (
                        <div key={group.id} className={`p-4 border rounded-lg bg-muted/30 ${isMobile ? 'p-3' : ''}`}>
                          <div className={`flex ${isMobile ? 'flex-col space-y-3' : isTablet ? 'flex-col space-y-3' : 'items-start justify-between'} mb-3`}>
                            <div className="flex-1">
                              <div className={`flex items-center gap-2 mb-1 ${isMobile ? 'flex-wrap' : ''}`}>
                                <h3 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{group.name}</h3>
                                <Badge variant="default" className={`${isMobile ? 'text-xs px-1 py-0' : ''}`}>{group.status}</Badge>
                              </div>
                              <p className={`text-muted-foreground mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>{group.description}</p>
                              <div className={`flex ${isMobile ? 'flex-col gap-2' : isTablet ? 'flex-col gap-2' : 'flex-wrap gap-4'} text-muted-foreground ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                <div className="flex items-center gap-1">
                                  <Calendar className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                                  <span>Joined {group.joinedDate}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                                  <span>{group.sessionFrequency}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                                  <span>{group.members}/{group.maxMembers} members</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                                  <span>{group.attendance}% attendance</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className={`flex ${isMobile ? 'flex-col gap-2' : isTablet ? 'flex-col gap-2' : 'items-center justify-between'}`}>
                            <div className={`text-sm ${isMobile ? 'text-xs' : ''}`}>
                              <span className="font-medium">Next session: </span>
                              <span className="text-muted-foreground">{group.nextSession}</span>
                            </div>
                            <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
                              <Button 
                                variant="outline" 
                                size={isMobile ? "sm" : "sm"} 
                                className={`${isMobile ? 'flex-1 h-10' : ''}`}
                                onClick={() => handleViewGroup(group)}
                              >
                                View Group
                              </Button>
                              <Button 
                                variant="outline" 
                                size={isMobile ? "sm" : "sm"} 
                                className={`${isMobile ? 'flex-1 h-10' : ''}`}
                                onClick={() => router.push(`/client/group/${group.id}?groupName=${encodeURIComponent(group.name)}`)}
                              >
                                <MessageCircle className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-1'}`} />
                                Chat
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-muted-foreground mb-4">
                      <Users className="h-12 w-12 mx-auto mb-2" />
                      <h3 className="text-lg font-medium">No Groups Yet</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      You haven't joined any support groups yet. Browse available groups to get started.
                    </p>
                    <Button 
                      onClick={() => router.push('/client/groups')}
                      className="w-full"
                    >
                      Browse All Groups
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Available Groups Section */}
              {availableGroups.length > 0 && (
                <Card>
                  <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
                    <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
                      <UserPlus className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      Available Groups ({availableGroups.length})
                    </CardTitle>
                    <CardDescription className={`${isMobile ? 'text-sm' : ''}`}>Join new support groups that match your interests</CardDescription>
                  </CardHeader>
                  <CardContent className={`${isMobile ? 'p-3' : ''}`}>
                    <div className={`space-y-3 ${isMobile ? 'space-y-2' : 'space-y-4'}`}>
                      {availableGroups.map((group) => (
                        <div key={group.id} className={`p-4 border rounded-lg ${isMobile ? 'p-3' : ''}`}>
                          <div className={`flex ${isMobile ? 'flex-col space-y-3' : isTablet ? 'flex-col space-y-3' : 'items-start justify-between'} mb-3`}>
                            <div className="flex-1">
                              <h3 className={`font-medium mb-1 ${isMobile ? 'text-sm' : ''}`}>{group.name}</h3>
                              <p className={`text-muted-foreground mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>{group.description}</p>
                              <div className={`flex ${isMobile ? 'flex-col gap-2' : isTablet ? 'flex-col gap-2' : 'flex-wrap gap-4'} text-muted-foreground ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                <div className="flex items-center gap-1">
                                  <Clock className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                                  <span>{group.sessionFrequency || 'Weekly'} • {group.duration || '8 weeks'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                                  <span>{group.members?.length || 0}/{group.maxMembers || 15} members</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                                  <span>Starts {group.nextSession || 'TBD'}</span>
                                </div>
                              </div>
                            </div>
                            {!isMobile && !isTablet && (
                              <div className="ml-4">
                                <Badge variant="secondary" className="mb-2">
                                  {(group.maxMembers || 15) - (group.members?.length || 0)} seats left
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className={`flex ${isMobile ? 'flex-col gap-2' : isTablet ? 'flex-col gap-2' : 'items-center justify-between'}`}>
                            <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {group.members?.length || 0}/{group.maxMembers || 15} members
                              {(isMobile || isTablet) && (
                                <Badge variant="secondary" className={`ml-2 ${isMobile ? 'text-xs px-1 py-0' : ''}`}>
                                  {(group.maxMembers || 15) - (group.members?.length || 0)} seats left
                                </Badge>
                              )}
                            </div>
                            <Button 
                              onClick={() => handleJoinRequest(group)}
                              className={`flex items-center gap-2 ${isMobile ? 'w-full h-10' : ''}`}
                              size={isMobile ? "sm" : "sm"}
                            >
                              <UserPlus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                              Request to Join
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>


        <TabsContent value="settings" className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
            {/* Notification Settings */}
            <Card>
              <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
                <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
                  <Bell className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  Notifications
                </CardTitle>
                <CardDescription className={`${isMobile ? 'text-sm' : ''}`}>Choose what notifications you receive</CardDescription>
              </CardHeader>
              <CardContent className={`space-y-4 ${isMobile ? 'space-y-3 p-3' : ''}`}>
                <div className={`flex items-center justify-between ${isMobile ? 'flex-col items-start gap-2' : ''}`}>
                  <div className="space-y-0.5">
                    <Label className={`${isMobile ? 'text-sm' : ''}`}>Enable Notifications</Label>
                    <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      Receive notifications for messages, tasks, sessions, and updates
                    </p>
                  </div>
                  <Switch 
                    checked={notificationsEnabled} 
                    onCheckedChange={handleNotificationToggle}
                    className={`${isMobile ? 'self-end' : ''}`} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deactivate Profile and Logout Section */}
          <div className={`mt-6 pt-6 border-t border-border space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
            {/* Deactivate Profile */}
            <Card>
              <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
                <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
                  <UserX className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  Deactivate Profile
                </CardTitle>
              </CardHeader>
              <CardContent className={`space-y-4 ${isMobile ? 'space-y-3 p-3' : ''}`}>
                <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Deactivating your profile will disable your account. You can contact your coach to reactivate it later.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className={`gap-2 ${isMobile ? 'w-full text-sm' : ''}`} 
                      disabled={deactivating}
                      size={isMobile ? "sm" : "default"}
                    >
                      <UserX className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      Deactivate Profile
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className={isMobile ? 'mx-4' : ''}>
                    <AlertDialogHeader>
                      <AlertDialogTitle className={isMobile ? 'text-lg' : ''}>Deactivate Profile</AlertDialogTitle>
                      <AlertDialogDescription className={isMobile ? 'text-sm' : ''}>
                        Are you sure you want to deactivate your profile? Your account will be disabled and you will be signed out. You can contact your coach to reactivate it later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
                      <AlertDialogCancel className={isMobile ? 'w-full' : ''}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeactivateProfile}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={deactivating}
                      >
                        {deactivating ? 'Deactivating...' : 'Deactivate'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Logout Section */}
            <Card>
              <CardContent className={`pt-6 ${isMobile ? 'p-3' : ''}`}>
                <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-4' : ''}`}>
                  <div>
                    <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>Log Out</h3>
                    <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      Sign out of your account
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className={`gap-2 ${isMobile ? 'w-full text-sm' : ''}`}
                    size={isMobile ? "sm" : "default"}
                  >
                    <LogOut className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    Log Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
          <ClientBillingTab 
            loading={billingLoading}
            subscriptions={subscriptions}
            payments={payments}
            paymentMethods={paymentMethods}
            onCancelSubscription={handleCancelSubscription}
            onRefresh={fetchBillingData}
            isMobile={isMobile}
            userData={userData}
          />
        </TabsContent>
      </Tabs>

      {/* Contact Therapist Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className={`${isMobile ? 'mx-4' : ''}`}>
          <DialogHeader>
            <DialogTitle className={`${isMobile ? 'text-lg' : ''}`}>Contact Your Therapist</DialogTitle>
            <DialogDescription className={`${isMobile ? 'text-sm' : ''}`}>
              Send a message to {assignedTherapist.name}. They will receive an email notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-message" className={`${isMobile ? 'text-sm' : ''}`}>Your Message</Label>
              <Textarea
                id="contact-message"
                placeholder="Type your message here..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                className={`${isMobile ? 'min-h-24' : 'min-h-32'}`}
                disabled={sendingMessage}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowContactDialog(false);
                  setContactMessage("");
                }}
                disabled={sendingMessage}
                size={isMobile ? "sm" : "sm"}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendMessage}
                disabled={sendingMessage || !contactMessage.trim()}
                size={isMobile ? "sm" : "sm"}
              >
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Overview Modal */}
      <GroupOverviewModal
        open={groupOverviewOpen}
        onOpenChange={setGroupOverviewOpen}
        groupData={selectedGroup}
      />

      {/* Membership Request Dialog */}
      <MembershipRequestDialog
        open={membershipRequestOpen}
        onOpenChange={setMembershipRequestOpen}
        group={selectedGroupForRequest}
        clientId={session?.user?.id}
        clientName={session?.user?.name}
        clientEmail={session?.user?.email}
      />
      </div>
    </div>
  );
}
