"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/app/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { LanguageSelector } from "@/app/components/LanguageSelector";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Globe,
  Key,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Users2,
  Edit2,
  Edit3,
  Minus,
  Loader2,
  Camera,
  X,
  CreditCard,
  CheckCircle,
  AlertCircle,
  LogOut,
  Copy,
  Target
} from "lucide-react";
import { PageHeader } from "@/app/components/PageHeader";
import { useTranslation } from "@/app/context/LanguageContext";
import { TwoFactorSettings } from "@/app/components/TwoFactorSettings";
import { GoalHabitTemplateManager } from "@/app/components/GoalHabitTemplateManager";

export default function Settings() {
  const { data: session } = useSession();
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coachData, setCoachData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    license: ''
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [pipelineStages, setPipelineStages] = useState([
    { id: "light", name: "Light", color: "bg-blue-500", isVisible: false },
    { id: "group", name: "Group", color: "bg-yellow-500", isVisible: false },
    { id: "personal", name: "Personal", color: "bg-purple-500", isVisible: false },
    { id: "completed", name: "Completed", color: "bg-green-500", isVisible: false },
    { id: "inactive", name: "Inactive", color: "bg-red-500", isVisible: false }
  ]);

  const [groupPipelineStages, setGroupPipelineStages] = useState([
    { id: "upcoming", name: "Upcoming", color: "bg-blue-500", description: "Groups scheduled to start", isVisible: false },
    { id: "ongoing", name: "Ongoing", color: "bg-green-500", description: "Active groups", isVisible: false },
    { id: "completed", name: "Completed", color: "bg-purple-500", description: "Finished groups", isVisible: false },
    { id: "inactive", name: "Inactive", color: "bg-gray-500", description: "Paused groups", isVisible: false }
  ]);

  const [showAddClientStageDialog, setShowAddClientStageDialog] = useState(false);
  const [showEditClientStageDialog, setShowEditClientStageDialog] = useState(false);
  const [showAddGroupStageDialog, setShowAddGroupStageDialog] = useState(false);
  const [showEditGroupStageDialog, setShowEditGroupStageDialog] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('bg-blue-500');
  const [newStageDescription, setNewStageDescription] = useState('');
  const [savingClientPipeline, setSavingClientPipeline] = useState(false);
  const [savingGroupPipeline, setSavingGroupPipeline] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Billing/Stripe state
  const [billingLoading, setBillingLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [connectStatus, setConnectStatus] = useState(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [updatingPrice, setUpdatingPrice] = useState(null);
  const [customPaymentLink, setCustomPaymentLink] = useState('');
  const [creatingProducts, setCreatingProducts] = useState(false);
  const [clientSubscriptions, setClientSubscriptions] = useState([]);
  const [clientSubscriptionsLoading, setClientSubscriptionsLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  // Pipeline stage handlers
  const colorOptions = [
    { value: 'bg-blue-500', label: 'Blue' },
    { value: 'bg-green-500', label: 'Green' },
    { value: 'bg-yellow-500', label: 'Yellow' },
    { value: 'bg-purple-500', label: 'Purple' },
    { value: 'bg-red-500', label: 'Red' },
    { value: 'bg-pink-500', label: 'Pink' },
    { value: 'bg-orange-500', label: 'Orange' },
    { value: 'bg-gray-500', label: 'Gray' },
  ];

  const handleAddClientStage = async () => {
    if (!newStageName.trim()) {
      toast.error(t('settings.pipeline.enterStageName', 'Please enter a stage name'));
      return;
    }

    try {
      const newStage = {
        id: newStageName.toLowerCase().replace(/\s+/g, '_'),
        name: newStageName,
        color: newStageColor,
        isVisible: true
      };

      // Update local state
      const updatedStages = [...pipelineStages, newStage];
      setPipelineStages(updatedStages);

      // Save to database
      const response = await fetch('/api/pipeline/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stages: updatedStages }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || t('settings.pipeline.addStageFailed', 'Failed to add stage'));
        // Revert local state on error
        setPipelineStages(pipelineStages);
        return;
      }

      setNewStageName('');
      setNewStageColor('bg-blue-500');
      setShowAddClientStageDialog(false);
      toast.success(t('settings.pipeline.stageAdded', 'Stage added successfully'));
    } catch (error) {
      console.error('Error adding stage:', error);
      toast.error(t('settings.pipeline.addStageFailed', 'Failed to add stage'));
      // Revert local state on error
      setPipelineStages(pipelineStages);
    }
  };

  const handleEditClientStage = async () => {
    if (!newStageName.trim()) {
      toast.error(t('settings.pipeline.enterStageName', 'Please enter a stage name'));
      return;
    }

    try {
      // Update local state
      const updatedStages = pipelineStages.map(stage =>
        stage.id === editingStage.id
          ? { ...stage, name: newStageName, color: newStageColor }
          : stage
      );
      
      setPipelineStages(updatedStages);

      // Save to database
      const response = await fetch('/api/pipeline/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stages: updatedStages }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || t('settings.pipeline.updateStageFailed', 'Failed to update stage'));
        return;
      }

      setEditingStage(null);
      setNewStageName('');
      setNewStageColor('bg-blue-500');
      setShowEditClientStageDialog(false);
      toast.success(t('settings.pipeline.stageUpdated', 'Stage updated successfully'));
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error(t('settings.pipeline.updateStageFailed', 'Failed to update stage'));
    }
  };

  const handleDeleteClientStage = async (stageId) => {
    try {
      // Update local state
      const updatedStages = pipelineStages.filter(stage => stage.id !== stageId);
      setPipelineStages(updatedStages);

      // Save to database
      const response = await fetch('/api/pipeline/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stages: updatedStages }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || t('settings.pipeline.deleteStageFailed', 'Failed to delete stage'));
        // Revert local state on error
        setPipelineStages(pipelineStages);
        return;
      }

      toast.success(t('settings.pipeline.stageDeleted', 'Stage deleted successfully'));
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error(t('settings.pipeline.deleteStageFailed', 'Failed to delete stage'));
      // Revert local state on error
      setPipelineStages(pipelineStages);
    }
  };

  const handleAddGroupStage = async () => {
    if (!newStageName.trim()) {
      toast.error(t('settings.pipeline.enterStageName', 'Please enter a stage name'));
      return;
    }

    try {
      const newStage = {
        id: newStageName.toLowerCase().replace(/\s+/g, '_'),
        name: newStageName,
        color: newStageColor,
        description: newStageDescription,
        isVisible: true
      };

      // Update local state
      const updatedStages = [...groupPipelineStages, newStage];
      setGroupPipelineStages(updatedStages);

      // Save to database
      const response = await fetch('/api/pipeline/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stages: updatedStages }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || t('settings.pipeline.addStageFailed', 'Failed to add stage'));
        // Revert local state on error
        setGroupPipelineStages(groupPipelineStages);
        return;
      }

      setNewStageName('');
      setNewStageColor('bg-blue-500');
      setNewStageDescription('');
      setShowAddGroupStageDialog(false);
      toast.success(t('settings.pipeline.stageAdded', 'Stage added successfully'));
    } catch (error) {
      console.error('Error adding stage:', error);
      toast.error(t('settings.pipeline.addStageFailed', 'Failed to add stage'));
      // Revert local state on error
      setGroupPipelineStages(groupPipelineStages);
    }
  };

  const handleEditGroupStage = async () => {
    if (!newStageName.trim()) {
      toast.error(t('settings.pipeline.enterStageName', 'Please enter a stage name'));
      return;
    }

    try {
      // Update local state
      const updatedStages = groupPipelineStages.map(stage =>
        stage.id === editingStage.id
          ? { ...stage, name: newStageName, color: newStageColor, description: newStageDescription }
          : stage
      );
      
      setGroupPipelineStages(updatedStages);

      // Save to database
      const response = await fetch('/api/pipeline/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stages: updatedStages }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || t('settings.pipeline.updateStageFailed', 'Failed to update stage'));
        return;
      }

      setEditingStage(null);
      setNewStageName('');
      setNewStageColor('bg-blue-500');
      setNewStageDescription('');
      setShowEditGroupStageDialog(false);
      toast.success(t('settings.pipeline.stageUpdated', 'Stage updated successfully'));
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error(t('settings.pipeline.updateStageFailed', 'Failed to update stage'));
    }
  };

  const handleDeleteGroupStage = async (stageId) => {
    try {
      // Update local state
      const updatedStages = groupPipelineStages.filter(stage => stage.id !== stageId);
      setGroupPipelineStages(updatedStages);

      // Save to database
      const response = await fetch('/api/pipeline/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stages: updatedStages }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || t('settings.pipeline.deleteStageFailed', 'Failed to delete stage'));
        // Revert local state on error
        setGroupPipelineStages(groupPipelineStages);
        return;
      }

      toast.success(t('settings.pipeline.stageDeleted', 'Stage deleted successfully'));
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error(t('settings.pipeline.deleteStageFailed', 'Failed to delete stage'));
      // Revert local state on error
      setGroupPipelineStages(groupPipelineStages);
    }
  };

  const handleToggleClientStageVisibility = (stageId, isVisible) => {
    setPipelineStages(pipelineStages.map(stage =>
      stage.id === stageId ? { ...stage, isVisible } : stage
    ));
  };

  const handleToggleGroupStageVisibility = (stageId, isVisible) => {
    setGroupPipelineStages(groupPipelineStages.map(stage =>
      stage.id === stageId ? { ...stage, isVisible } : stage
    ));
  };

  const handleSaveClientPipeline = async () => {
    try {
      setSavingClientPipeline(true);
      const response = await fetch('/api/pipeline/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stages: pipelineStages }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Client pipeline saved successfully!');
      } else {
        toast.error(data.error || t('settings.pipeline.savePipelineFailed', 'Failed to save pipeline'));
      }
    } catch (error) {
      console.error('Error saving pipeline:', error);
      toast.error(t('settings.pipeline.savePipelineFailed', 'Failed to save pipeline'));
    } finally {
      setSavingClientPipeline(false);
    }
  };

  const handleSaveGroupPipeline = async () => {
    try {
      setSavingGroupPipeline(true);
      const response = await fetch('/api/pipeline/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stages: groupPipelineStages }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Group pipeline saved successfully!');
      } else {
        toast.error(data.error || t('settings.pipeline.savePipelineFailed', 'Failed to save pipeline'));
      }
    } catch (error) {
      console.error('Error saving pipeline:', error);
      toast.error(t('settings.pipeline.savePipelineFailed', 'Failed to save pipeline'));
    } finally {
      setSavingGroupPipeline(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.user?.id) {
      toast.error(t('common.messages.mustBeLoggedIn', 'You must be logged in to delete your account'));
      return;
    }

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('settings.security.accountDeleted', 'Account deleted successfully'));
        // Redirect to login page or sign out
        window.location.href = '/auth/signin';
      } else {
        toast.error(data.error || t('settings.security.deleteAccountFailed', 'Failed to delete account'));
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(t('settings.security.deleteAccountFailed', 'Failed to delete account'));
    }
  };

  // Fetch coach data on component mount
  useEffect(() => {
    const fetchCoachData = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/user/profile');
        const data = await response.json();

        if (data.success && data.user) {
          console.log('Coach data loaded:', data.user);
          setCoachData(data.user);

          // Update form data with real coach data
          setFormData({
            fullName: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            license: data.user.license || ''
          });
          
          // Set avatar preview if exists
          if (data.user.avatar) {
            setAvatarPreview(data.user.avatar);
          }

          // Load notification preference from database
          if (data.user.notificationsEnabled !== undefined) {
            setNotificationsEnabled(data.user.notificationsEnabled !== false);
            // Also sync to localStorage for backward compatibility
            localStorage.setItem('notificationsEnabled', (data.user.notificationsEnabled !== false).toString());
        } else {
            // Fallback to localStorage if database doesn't have it yet
            const savedNotificationPreference = localStorage.getItem('notificationsEnabled');
            if (savedNotificationPreference !== null) {
              setNotificationsEnabled(savedNotificationPreference === 'true');
            }
          }
        } else {
          toast.error(t('common.messages.loadFailed', 'Failed to load coach data'));
        }
      } catch (error) {
        console.error('Error fetching coach data:', error);
        toast.error('Failed to load coach data');
      } finally {
        setLoading(false);
      }
    };

    fetchCoachData();
  }, [session?.user?.id]);

  // Fetch subscription status
  const fetchSubscriptionStatus = async () => {
    if (!session?.user?.id || session.user.role !== 'coach') return;

    try {
      setBillingLoading(true);
      const response = await fetch('/api/stripe/subscription/status');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchConnectStatus();
    fetchProducts();
    fetchClientSubscriptions();
    fetchPayments();
  }, [session?.user?.id]);

  // Handle URL params for billing tab (success/error messages)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const warning = urlParams.get('warning');

    if (tab === 'billing') {
      // You can set active tab here if needed
      if (success) {
        if (success === 'subscription_created') {
          toast.success(t('settings.billing.subscriptionCreated', 'Subscription created successfully!'));
        } else if (success === 'already_subscribed') {
          toast.info(t('settings.billing.alreadySubscribed', 'You already have an active subscription.'));
        } else if (success === 'onboarding_complete') {
          toast.success('Payment account set up successfully!');
          fetchConnectStatus();
          fetchProducts();
        }
        // Refresh subscription status
        setTimeout(() => {
          window.location.href = '/coach/settings?tab=billing';
        }, 2000);
      }
      if (error) {
        toast.error(t('settings.billing.error', 'An error occurred') + ': ' + error);
      }
      if (warning) {
        toast.warning(t('settings.billing.warning', 'Warning') + ': ' + warning);
      }
    }
  }, []);

  // Handle Stripe Subscription Checkout (coach pays admin)
  const handleConnectStripe = async () => {
    try {
      setConnectingStripe(true);
      const response = await fetch('/api/stripe/subscription/create-checkout', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout (coach enters payment method)
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(t('settings.billing.noCheckoutUrl', 'Failed to get checkout URL'));
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(error.message || t('settings.billing.connectFailed', 'Failed to start checkout'));
    } finally {
      setConnectingStripe(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    try {
      setCancelingSubscription(true);
      const response = await fetch('/api/coach/subscription/cancel', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel subscription');
      }

      const data = await response.json();
      toast.success(data.message || 'Subscription will be canceled at the end of the billing period');
      
      // Refresh subscription status
      fetchSubscriptionStatus();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setCancelingSubscription(false);
    }
  };

  // Fetch Connect account status
  const fetchConnectStatus = async () => {
    try {
      setConnectLoading(true);
      const response = await fetch('/api/stripe/connect/status');
      if (response.ok) {
        const data = await response.json();
        setConnectStatus(data);
      }
    } catch (error) {
      console.error('Error fetching Connect status:', error);
    } finally {
      setConnectLoading(false);
    }
  };

  // Fetch coach products
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const response = await fetch('/api/coach/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Fetch client subscriptions
  const fetchClientSubscriptions = async () => {
    if (!session?.user?.id || session.user.role !== 'coach') return;
    
    try {
      setClientSubscriptionsLoading(true);
      const response = await fetch('/api/coach/client-subscriptions');
      if (response.ok) {
        const data = await response.json();
        setClientSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Error fetching client subscriptions:', error);
    } finally {
      setClientSubscriptionsLoading(false);
    }
  };

  // Fetch payments received
  const fetchPayments = async () => {
    if (!session?.user?.id || session.user.role !== 'coach') return;
    
    try {
      setPaymentsLoading(true);
      const response = await fetch('/api/coach/payments');
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Handle Connect account creation
  const handleCreateConnectAccount = async () => {
    try {
      setConnectLoading(true);
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create Connect account');
      }

      const data = await response.json();
      
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else if (data.onboardingComplete) {
        toast.success('Payment account is already set up!');
        fetchConnectStatus();
        fetchProducts();
      }
    } catch (error) {
      console.error('Error creating Connect account:', error);
      toast.error(error.message || 'Failed to create Connect account');
    } finally {
      setConnectLoading(false);
    }
  };

  // Handle product price update
  const handleUpdateProductPrice = async (productType, newAmount) => {
    try {
      setUpdatingPrice(productType);
      const response = await fetch('/api/coach/products/update-price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType,
          amount: Math.round(newAmount * 100), // Convert to øre
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update price');
      }

      const data = await response.json();
      
      // Show success message with subscription update info
      if (data.subscriptionsUpdated !== undefined) {
        if (data.subscriptionsUpdated > 0) {
          toast.success(
            `Price updated successfully! ${data.subscriptionsUpdated} subscription(s) will use the new price from their next billing cycle.`,
            { duration: 5000 }
          );
        } else {
          toast.success('Price updated successfully! New price will apply to future subscriptions.');
        }
        
        if (data.subscriptionsFailed > 0) {
          toast.warning(
            `Price updated, but ${data.subscriptionsFailed} subscription(s) could not be updated. Please check manually.`,
            { duration: 6000 }
          );
        }
      } else {
        toast.success('Price updated successfully');
      }
      
      fetchProducts();
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error(error.message || 'Failed to update price');
    } finally {
      setUpdatingPrice(null);
    }
  };

  // Handle manual product creation
  const handleCreateProducts = async () => {
    // Prevent multiple simultaneous requests
    if (creatingProducts || productsLoading) {
      return;
    }

    try {
      setCreatingProducts(true);
      setProductsLoading(true);
      const response = await fetch('/api/coach/products/create', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create products');
      }

      const data = await response.json();
      
      // Check if products were already created
      if (data.message && data.message.includes('already exist')) {
        toast.info(data.message || 'Products already exist');
      } else {
        toast.success(data.message || 'Products created successfully!');
      }
      
      fetchProducts(); // Refresh the products list
    } catch (error) {
      console.error('Error creating products:', error);
      toast.error(error.message || 'Failed to create products');
    } finally {
      setCreatingProducts(false);
      setProductsLoading(false);
    }
  };

  // Generate custom payment link with coach ID
  useEffect(() => {
    if (session?.user?.id) {
      const coachId = session.user.id;
      const link = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/client/custom-payment?coach=${coachId}`;
      setCustomPaymentLink(link);
    }
  }, [session]);

  const handleCopyPaymentLink = () => {
    if (customPaymentLink) {
      navigator.clipboard.writeText(customPaymentLink);
      toast.success('Payment link copied to clipboard!');
    }
  };

  // Fetch pipeline stages from database
  useEffect(() => {
    const fetchPipelineStages = async () => {
      if (!session?.user?.id) return;

      try {
        // Fetch client pipeline stages
        const clientResponse = await fetch('/api/pipeline/client');
        const clientData = await clientResponse.json();
        
        if (clientData.success && clientData.stages && clientData.stages.length > 0) {
          setPipelineStages(clientData.stages);
        }

        // Fetch group pipeline stages
        const groupResponse = await fetch('/api/pipeline/group');
        const groupData = await groupResponse.json();
        
        if (groupData.success && groupData.stages && groupData.stages.length > 0) {
          setGroupPipelineStages(groupData.stages);
        }
      } catch (error) {
        console.error('Error fetching pipeline stages:', error);
      }
    };

    fetchPipelineStages();
  }, [session?.user?.id]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle notification toggle
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
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          notificationsEnabled: enabled
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Also save to localStorage for backward compatibility
      localStorage.setItem('notificationsEnabled', enabled.toString());
      
      toast.success(
        enabled ? t('settings.notifications.enabled', 'Notifications enabled') : t('settings.notifications.disabled', 'Notifications disabled'),
        {
          description: enabled 
            ? t('settings.notifications.enabledDescription', "You'll receive notifications for messages, tasks, and sessions")
            : t('settings.notifications.disabledDescription', "You won't receive any notifications")
        }
      );
      } else {
        throw new Error(data.error || 'Failed to save notification preference');
      }
    } catch (error) {
      console.error('Error saving notification preference:', error);
      toast.error(t('settings.notifications.saveFailed', 'Failed to save notification preference'));
      // Revert state on error
      setNotificationsEnabled(!enabled);
    }
  };

  // Handle password input changes
  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle password update
  const handlePasswordUpdate = async () => {
    if (!session?.user?.id) {
      toast.error(t('common.messages.mustBeLoggedIn', 'You must be logged in to update password'));
      return;
    }

    // Validate passwords
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error(t('settings.profile.fillAllPasswordFields', 'Please fill in all password fields'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('settings.profile.passwordsDoNotMatch', 'New passwords do not match'));
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error(t('settings.profile.passwordMinLength', 'New password must be at least 6 characters long'));
      return;
    }

    try {
      setPasswordLoading(true);
      
      const requestBody = {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      };
      
      console.log('Sending password change request:', { 
        hasCurrentPassword: !!requestBody.currentPassword, 
        hasNewPassword: !!requestBody.newPassword 
      });
      
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        toast.success(t('settings.profile.passwordUpdated', 'Password updated successfully!'));
        // Clear password fields
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(data.error || t('settings.profile.passwordUpdateFailed', 'Failed to update password'));
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(t('settings.profile.passwordUpdateFailed', 'Failed to update password'));
    } finally {
      setPasswordLoading(false);
    }
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
        let errorMessage = t('settings.profile.avatarUploadFailed', 'Failed to upload avatar');
        let errorDetails = null;
        
        try {
          const errorData = await initiateResponse.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || null;
        } catch (e) {
          errorMessage = `${t('settings.profile.avatarUploadFailed', 'Failed to upload avatar')} (${initiateResponse.status} ${initiateResponse.statusText})`;
        }
        
        toast.error(errorMessage, {
          description: errorDetails || `File: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`
        });
        return;
      }

      const initiateResult = await initiateResponse.json();
      
      if (!initiateResult.success) {
        toast.error(initiateResult.error || t('settings.profile.avatarUploadFailed', 'Failed to upload avatar'), {
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
        let errorMessage = t('settings.profile.avatarUploadFailed', 'Failed to upload avatar');
        try {
          const errorData = await completeResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `${t('settings.profile.avatarUploadFailed', 'Failed to upload avatar')} (${completeResponse.status})`;
        }
        toast.error(errorMessage);
        return;
      }

      const completeResult = await completeResponse.json();

      if (completeResult.success) {
        toast.success(t('settings.profile.avatarUploaded', 'Avatar uploaded successfully!'));
        // Clear selected file and preview
        setSelectedFile(null);
        setAvatarPreview(null);
        // Clear file input
        const fileInput = document.getElementById('avatar-upload');
        if (fileInput) fileInput.value = '';
        // Update coach data with new avatar
        setCoachData(prev => ({
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
        toast.error(completeResult.error || t('settings.profile.avatarUploadFailed', 'Failed to upload avatar'));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      
      let errorMessage = t('settings.profile.avatarUploadFailed', 'Failed to upload avatar');
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
        toast.success(t('settings.profile.avatarRemoved', 'Avatar removed successfully!'));
        setAvatarPreview(null);
        // Update coach data
        setCoachData(prev => ({
          ...prev,
          avatar: null
        }));
        // Refresh session
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        toast.error(data.error || t('settings.profile.avatarRemoveFailed', 'Failed to remove avatar'));
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error(t('settings.profile.avatarRemoveFailed', 'Failed to remove avatar'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to save changes');
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.fullName.trim(),
          email: formData.email,
          phone: formData.phone,
          license: formData.license
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('settings.profile.profileUpdated', 'Profile updated successfully!'));
        // Update coach data with new values
        setCoachData(prev => ({
          ...prev,
          name: formData.fullName.trim(),
          email: formData.email,
          phone: formData.phone,
          license: formData.license
        }));
      } else {
        toast.error(data.error || t('settings.profile.profileUpdateFailed', 'Failed to update profile'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('settings.profile.profileUpdateFailed', 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <PageHeader 
        title={t('navigation.settings')} 
        subtitle={t('settings.subtitle', 'Manage your settings')}
      />

      <Tabs defaultValue="profile" className={isMobile ? 'space-y-4' : 'space-y-6'}>
        <TabsList className={`${isMobile ? 'grid grid-cols-3' : 'grid w-full grid-cols-6'} bg-muted ${isMobile ? 'h-auto p-1' : ''}`}>
          <TabsTrigger 
            value="profile" 
            className={`data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${isMobile ? 'text-xs px-2 py-2' : ''}`}
          >
            {t('profile.title')}
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className={`data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${isMobile ? 'text-xs px-2 py-2' : ''}`}
          >
            {t('settings.notifications.title', 'Notifications')}
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className={`data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${isMobile ? 'text-xs px-2 py-2' : ''}`}
          >
            {t('settings.security.title', 'Security')}
          </TabsTrigger>
          <TabsTrigger 
            value="pipeline" 
            className={`data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${isMobile ? 'text-xs px-2 py-2' : ''}`}
          >
            {t('settings.pipeline.title', 'Pipeline')}
          </TabsTrigger>
          <TabsTrigger 
            value="templates" 
            className={`data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${isMobile ? 'text-xs px-2 py-2' : ''}`}
          >
            Templates
          </TabsTrigger>
          <TabsTrigger 
            value="billing" 
            className={`data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${isMobile ? 'text-xs px-2 py-2' : ''}`}
          >
            {t('settings.billing.title', 'Billing')}
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <Card className="card-standard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {t('profile.personalInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      {avatarPreview || coachData?.avatar ? (
                        <AvatarImage 
                          src={avatarPreview || coachData?.avatar} 
                          alt={coachData?.name || 'Profile'} 
                          key={coachData?.avatar || 'no-avatar'} 
                        />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {coachData?.name ? 
                          coachData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                          'DR'
                        }
                      </AvatarFallback>
                    </Avatar>
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-full">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*,.heic,.heif"
                        className="hidden"
                        onChange={handleAvatarFileSelect}
                        disabled={uploadingAvatar}
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        disabled={uploadingAvatar}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {avatarPreview ? t('settings.profile.changePhoto', 'Change Photo') : t('settings.profile.uploadPhoto', 'Upload Photo')}
                      </Button>
                      {avatarPreview && (
                        <>
                          <Button 
                            variant="outline"
                            onClick={handleAvatarUpload}
                            disabled={uploadingAvatar}
                          >
                            {uploadingAvatar ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t('settings.profile.uploading', 'Uploading...')}
                              </>
                            ) : (
                              t('settings.profile.savePhoto', 'Save Photo')
                            )}
                          </Button>
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAvatarPreview(coachData?.avatar || null);
                              setSelectedFile(null);
                              const fileInput = document.getElementById('avatar-upload');
                              if (fileInput) fileInput.value = '';
                            }}
                            disabled={uploadingAvatar}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {coachData?.avatar && !avatarPreview && (
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={handleAvatarRemove}
                          disabled={uploadingAvatar}
                        >
                          {t('settings.profile.remove', 'Remove')}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('settings.profile.avatarFormat', 'JPG, PNG, WebP, GIF, or HEIC. Max 10MB. HEIC files will be automatically converted to JPEG.')}
                    </p>
                  </div>
                </div>

                  <div>
                  <Label htmlFor="fullName">{t('common.labels.fullName', 'Full Name')}</Label>
                  <Input 
                    id="fullName" 
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    disabled={loading}
                    placeholder={t('settings.profile.enterFullName', 'Enter your full name')}
                  />
                </div>

                <div>
                  <Label htmlFor="email">{t('common.labels.email')}</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={loading}
                    placeholder={t('settings.profile.enterEmail', 'Enter your email')}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">{t('common.labels.phone')}</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={loading}
                    placeholder={t('settings.profile.enterPhone', 'Enter your phone number')}
                  />
                </div>

                <div>
                  <Label htmlFor="license">{t('settings.profile.license', 'Professional License')}</Label>
                  <Input 
                    id="license" 
                    value={formData.license}
                    onChange={(e) => handleInputChange('license', e.target.value)}
                    disabled={loading}
                    placeholder={t('settings.profile.enterLicense', 'Enter your professional license')}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSaveChanges}
                  disabled={loading || saving}
                >
                  {saving ? t('common.messages.loading') : t('common.buttons.saveChanges')}
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Language Settings - moved to bottom for better UX */}
          <div className="lg:col-span-2 mt-6">
            <Card className="card-standard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  {t('settings.language.title', 'Language')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LanguageSelector variant="compact" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card className="card-standard">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                {t('settings.notifications.title', 'Notifications')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t('settings.notifications.description', 'Choose what notifications you receive')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.notifications.enable', 'Enable Notifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.notifications.description', 'Receive notifications for messages, tasks, sessions, and updates')}
                  </p>
                </div>
                <Switch 
                  checked={notificationsEnabled} 
                  onCheckedChange={handleNotificationToggle}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-standard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  {t('settings.security.passwordAuth', 'Password Authentication')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">{t('settings.profile.currentPassword', 'Current Password')}</Label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    disabled={passwordLoading}
                    placeholder={t('settings.profile.enterCurrentPassword', 'Enter your current password')}
                  />
                </div>

                <div>
                  <Label htmlFor="newPassword">{t('settings.profile.newPassword', 'New Password')}</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    disabled={passwordLoading}
                    placeholder={t('settings.profile.enterNewPassword', 'Enter your new password (min. 8 characters)')}
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">{t('settings.profile.confirmNewPassword', 'Confirm New Password')}</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    disabled={passwordLoading}
                    placeholder={t('settings.profile.confirmNewPassword', 'Confirm new password')}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handlePasswordUpdate}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? t('settings.profile.updating', 'Updating...') : t('settings.profile.updatePassword', 'Update Password')}
                </Button>

              </CardContent>
            </Card>

            <TwoFactorSettings />

            <Card className="card-standard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {t('settings.security.accountManagement', 'Account Management')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        {t('settings.security.deleteAccount', 'Delete Account')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.security.deleteAccount', 'Delete Account')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('settings.security.deleteAccountConfirm', 'Are you sure you want to delete your account? This action cannot be undone. All your data, including client information, sessions, and settings will be permanently deleted.')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('settings.security.deleteAccount', 'Delete Account')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {t('settings.security.deleteAccountWarning', 'This action cannot be undone. All your data will be permanently deleted.')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pipeline Settings */}
        <TabsContent value="pipeline">
          <div className="space-y-6">
            {/* Client Pipeline Settings */}
            <Card className="card-standard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-primary" />
                  {t('settings.pipeline.clientStages', 'Client Pipeline Stages')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">{t('settings.pipeline.stages', 'Stages')}</Label>
                      <p className="text-sm text-muted-foreground">{t('settings.pipeline.setClientStages', 'Set the stages for your client pipeline')}</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="gap-2"
                      onClick={() => setShowAddClientStageDialog(true)}
                    >
                      <Plus className="h-4 w-4" />
                      {t('settings.pipeline.addStage', 'Add Stage')}
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {pipelineStages.map((stage) => (
                      <div key={stage.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${stage.color}`} />
                          <span className="font-medium">{stage.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingStage(stage);
                              setNewStageName(stage.name);
                              setNewStageColor(stage.color);
                              setShowEditClientStageDialog(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteClientStage(stage.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">{t('settings.pipeline.defaultVisibility', 'Default Column Visibility')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.pipeline.setColumnVisibility', 'Set which columns are visible by default')}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {pipelineStages.map((stage) => (
                      <div key={stage.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                          <Label>{stage.name}</Label>
                        </div>
                        <Switch 
                          checked={stage.isVisible} 
                          onCheckedChange={(checked) => handleToggleClientStageVisibility(stage.id, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full"
                    onClick={handleSaveClientPipeline}
                    disabled={savingClientPipeline}
                  >
                    {savingClientPipeline ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.messages.loading')}
                      </>
                    ) : (
                      t('settings.pipeline.saveClientPipeline', 'Save Client Pipeline')
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Group Pipeline Settings */}
            <Card className="card-standard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-primary" />
                  {t('settings.pipeline.groupStages', 'Group Pipeline Stages')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">{t('settings.pipeline.stages', 'Stages')}</Label>
                      <p className="text-sm text-muted-foreground">{t('settings.pipeline.setGroupStages', 'Set the stages for your group pipeline')}</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="gap-2"
                      onClick={() => setShowAddGroupStageDialog(true)}
                    >
                      <Plus className="h-4 w-4" />
                      {t('settings.pipeline.addStage', 'Add Stage')}
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {groupPipelineStages.map((stage) => (
                      <div key={stage.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${stage.color}`} />
                          <div>
                            <span className="font-medium">{stage.name}</span>
                            <p className="text-xs text-muted-foreground">{stage.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingStage(stage);
                              setNewStageName(stage.name);
                              setNewStageColor(stage.color);
                              setNewStageDescription(stage.description || '');
                              setShowEditGroupStageDialog(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteGroupStage(stage.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">{t('settings.pipeline.defaultFunnel', 'Default Funnel Settings')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.pipeline.setDefaultFunnel', 'Set the default funnel settings for your pipeline')}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {groupPipelineStages.map((stage) => (
                      <div key={stage.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                          <Label>{stage.name}</Label>
                        </div>
                        <Switch 
                          checked={stage.isVisible} 
                          onCheckedChange={(checked) => handleToggleGroupStageVisibility(stage.id, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full"
                    onClick={handleSaveGroupPipeline}
                    disabled={savingGroupPipeline}
                  >
                    {savingGroupPipeline ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.messages.loading')}
                      </>
                    ) : (
                      t('settings.pipeline.saveGroupPipeline', 'Save Group Pipeline')
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Settings */}
        {/* Templates Settings */}
        <TabsContent value="templates">
          <div className="space-y-6">
            <Card className="card-standard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Goal & Habit Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GoalHabitTemplateManager />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="space-y-6">
            <Card className="card-standard">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  {t('settings.billing.title', 'Billing & Subscription')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {billingLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">
                      {t('settings.billing.loading', 'Loading subscription status...')}
                    </span>
                  </div>
                ) : !subscriptionStatus?.connected ? (
                  // Not connected to Stripe
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">
                        {t('settings.billing.connectStripe', 'Connect Your Stripe Account')}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        {t('settings.billing.connectDescription', 'Subscribe to access all platform features. You will be redirected to enter your payment information. Your subscription will be automatically created after payment.')}
                      </p>
                      <Button
                        onClick={handleConnectStripe}
                        disabled={connectingStripe}
                        size="lg"
                        className="gap-2"
                      >
                        {connectingStripe ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('settings.billing.connecting', 'Connecting...')}
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            {t('settings.billing.connectButton', 'Connect to Stripe')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : subscriptionStatus?.subscription ? (
                  // Has subscription
                  <div className="space-y-6">
                    {/* Subscription Status */}
                    <div className="p-6 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {subscriptionStatus.subscription.status === 'active' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : subscriptionStatus.subscription.status === 'past_due' ? (
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                          <h3 className="text-lg font-semibold">
                            {t('settings.billing.subscriptionStatus', 'Subscription Status')}
                          </h3>
                        </div>
                        <Badge
                          variant={
                            subscriptionStatus.subscription.status === 'active'
                              ? 'default'
                              : subscriptionStatus.subscription.status === 'past_due'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {subscriptionStatus.subscription.status === 'active'
                            ? t('settings.billing.active', 'Active')
                            : subscriptionStatus.subscription.status === 'past_due'
                            ? t('settings.billing.pastDue', 'Past Due')
                            : subscriptionStatus.subscription.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('settings.billing.amount', 'Amount')}
                          </p>
                          <p className="text-lg font-semibold">
                            ${subscriptionStatus.subscription.amount?.toFixed(2) || '0.00'} / {subscriptionStatus.subscription.interval || 'month'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('settings.billing.nextBilling', 'Next Billing Date')}
                          </p>
                          <p className="text-lg font-semibold">
                            {subscriptionStatus.subscription.currentPeriodEnd
                              ? new Date(subscriptionStatus.subscription.currentPeriodEnd).toLocaleDateString()
                              : t('settings.billing.notAvailable', 'N/A')}
                          </p>
                        </div>
                      </div>

                      {subscriptionStatus.subscription.cancelAtPeriodEnd && (
                        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <p className="text-sm text-orange-800 dark:text-orange-200">
                            {t('settings.billing.cancelingAtPeriodEnd', 'Your subscription will be canceled at the end of the current billing period.')}
                          </p>
                        </div>
                      )}

                      {subscriptionStatus.subscription.status === 'past_due' && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            {t('settings.billing.paymentFailed', 'Your last payment failed. Please update your payment method.')}
                          </p>
                        </div>
                      )}

                      {/* Cancel Subscription Button */}
                      {subscriptionStatus.subscription.status === 'active' && 
                       !subscriptionStatus.subscription.cancelAtPeriodEnd && (
                        <div className="mt-4 pt-4 border-t">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                disabled={cancelingSubscription}
                                className="w-full"
                              >
                                {cancelingSubscription ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Canceling...
                                  </>
                                ) : (
                                  'Cancel Subscription'
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel your subscription? Your subscription will remain active until the end of the current billing period ({subscriptionStatus.subscription.currentPeriodEnd ? new Date(subscriptionStatus.subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}), and you will continue to have access to all features until then.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleCancelSubscription}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancel Subscription
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>

                    {/* Account Info */}
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-semibold mb-2">
                        {t('settings.billing.accountInfo', 'Account Information')}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>
                            {t('settings.billing.connected', 'Subscription Active')}
                          </span>
                        </div>
                        {subscriptionStatus.account?.customerId && (
                          <div className="text-xs text-muted-foreground">
                            {t('settings.billing.customerId', 'Customer ID')}: {subscriptionStatus.account.customerId.substring(0, 20)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Connected but no subscription (shouldn't happen with automatic creation)
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                    <h3 className="text-lg font-semibold mb-2">
                      {t('settings.billing.noSubscription', 'No Active Subscription')}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('settings.billing.noSubscriptionDescription', 'Your Stripe account is connected, but no subscription was found. Please contact support.')}
                    </p>
                  </div>
                )}

                {/* Stripe Connect Account Section */}
                <div className="mt-8 pt-8 border-t">
                  <h3 className="text-lg font-semibold mb-4">
                    {t('settings.billing.connectAccount', 'Payment Account (Receive Payments)')}
                  </h3>
                  
                  {connectLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  ) : connectStatus?.connected && connectStatus?.onboardingComplete ? (
                    <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-semibold text-green-800 dark:text-green-200">
                          Connect Account Active
                        </span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        You can now receive payments from clients. Payouts are processed daily.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-4">
                        Set up your payment account to receive payments from clients for sessions, programs, and group memberships.
                      </p>
                      <Button
                        onClick={handleCreateConnectAccount}
                        disabled={connectLoading}
                        variant="outline"
                      >
                        {connectLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Set Up Payment Account
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Product Management Section */}
                  {connectStatus?.onboardingComplete && (
                    <div className="mt-8 pt-8 border-t">
                      <h3 className="text-lg font-semibold mb-4">
                        {t('settings.billing.productPrices', 'Product Prices')}
                      </h3>
                      
                      {productsLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Loading products...</span>
                        </div>
                      ) : products.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">
                            No products found. Create default products?
                          </p>
                          <Button 
                            onClick={handleCreateProducts}
                            disabled={productsLoading || creatingProducts || products.length > 0}
                            variant="outline"
                          >
                            {productsLoading || creatingProducts ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Products
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {products.map((product) => (
                            <div key={product.id} className="p-4 rounded-lg border bg-muted/30">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold">
                                    {product.productType === 'one_to_one' && '1-to-1 Session'}
                                    {product.productType === 'program' && 'Program Subscription'}
                                    {product.productType === 'group' && 'Group Membership'}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {product.productType === 'one_to_one' ? 'One-time payment per session' : 'Monthly subscription'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-semibold">
                                    {(product.amount / 100).toFixed(0)} DKK
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-3">
                                <Input
                                  type="number"
                                  placeholder="New price (DKK)"
                                  className="w-32"
                                  data-product={product.productType}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newAmount = parseFloat(e.target.value);
                                      if (newAmount > 0) {
                                        handleUpdateProductPrice(product.productType, newAmount);
                                        e.target.value = '';
                                      }
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const input = document.querySelector(`input[data-product="${product.productType}"]`);
                                    const newAmount = parseFloat(input?.value);
                                    if (newAmount > 0) {
                                      handleUpdateProductPrice(product.productType, newAmount);
                                      input.value = '';
                                    }
                                  }}
                                  disabled={updatingPrice === product.productType}
                                >
                                  {updatingPrice === product.productType ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Update'
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Client Subscriptions Section */}
                  {connectStatus?.onboardingComplete && (
                    <div className="mt-8 pt-8 border-t">
                      <h3 className="text-lg font-semibold mb-4">
                        Client Subscriptions
                      </h3>
                      {clientSubscriptionsLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Loading subscriptions...</span>
                        </div>
                      ) : clientSubscriptions.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground text-sm">
                            No client subscriptions yet.
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                          {clientSubscriptions.map((sub) => (
                            <div key={sub.id} className="p-4 rounded-lg border bg-muted/30">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold">
                                    {sub.clientName || sub.clientEmail}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {sub.productType === 'program' && 'Program Subscription'}
                                    {sub.productType === 'group' && 'Group Membership'}
                                  </p>
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
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment History Section */}
                  {connectStatus?.onboardingComplete && (
                    <div className="mt-8 pt-8 border-t">
                      <h3 className="text-lg font-semibold mb-4">
                        Payment History
                      </h3>
                      {paymentsLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Loading payments...</span>
                        </div>
                      ) : payments.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground text-sm">
                            No payment history yet.
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                          {payments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                              <div>
                                <p className="font-medium">{payment.description || `${payment.productType === 'one_to_one' ? 'Session Payment' : 'Custom Payment'}`}</p>
                                <p className="text-xs text-muted-foreground">
                                  {payment.clientName || payment.clientEmail} • {new Date(payment.createdAt).toLocaleDateString()}
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
                    </div>
                  )}

                  {/* Custom Payment Link Section */}
                  {connectStatus?.onboardingComplete && (
                    <div className="mt-8 pt-8 border-t">
                      <h3 className="text-lg font-semibold mb-4">
                        {t('settings.billing.customPayment', 'Custom Payment Link')}
                      </h3>
                      <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                        <div>
                          <Label htmlFor="customPaymentLink">Share this link with your clients</Label>
                          <p className="text-sm text-muted-foreground mb-2">
                            Clients can use this link to make custom payments. Each client can enter their own amount.
                          </p>
                          <div className="flex gap-2">
                            <Input
                              id="customPaymentLink"
                              readOnly
                              value={customPaymentLink}
                              className="flex-1"
                            />
                            <Button
                              onClick={handleCopyPaymentLink}
                              variant="outline"
                              size="icon"
                              title="Copy link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Client Stage Dialog */}
      <Dialog open={showAddClientStageDialog} onOpenChange={setShowAddClientStageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.pipeline.addClientStage', 'Add Client Stage')}</DialogTitle>
            <DialogDescription>{t('settings.pipeline.createClientStage', 'Create a new stage for your client pipeline')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="stageName">{t('settings.pipeline.stageName', 'Stage Name')}</Label>
              <Input
                id="stageName"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder={t('settings.pipeline.enterStageNamePlaceholder', 'Enter stage name')}
              />
            </div>
            <div>
              <Label htmlFor="stageColor">{t('settings.pipeline.color', 'Color')}</Label>
              <Select value={newStageColor} onValueChange={setNewStageColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${color.value}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddClientStageDialog(false)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button onClick={handleAddClientStage}>{t('settings.pipeline.addStage', 'Add Stage')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Stage Dialog */}
      <Dialog open={showEditClientStageDialog} onOpenChange={setShowEditClientStageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.pipeline.editClientStage', 'Edit Client Stage')}</DialogTitle>
            <DialogDescription>{t('settings.pipeline.updateStageDetails', 'Update the stage details')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editStageName">{t('settings.pipeline.stageName', 'Stage Name')}</Label>
              <Input
                id="editStageName"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder={t('settings.pipeline.enterStageNamePlaceholder', 'Enter stage name')}
              />
            </div>
            <div>
              <Label htmlFor="editStageColor">{t('settings.pipeline.color', 'Color')}</Label>
              <Select value={newStageColor} onValueChange={setNewStageColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${color.value}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditClientStageDialog(false)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button onClick={handleEditClientStage}>{t('common.buttons.saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Group Stage Dialog */}
      <Dialog open={showAddGroupStageDialog} onOpenChange={setShowAddGroupStageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.pipeline.addGroupStage', 'Add Group Stage')}</DialogTitle>
            <DialogDescription>{t('settings.pipeline.createGroupStage', 'Create a new stage for your group pipeline')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="groupStageName">{t('settings.pipeline.stageName', 'Stage Name')}</Label>
              <Input
                id="groupStageName"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder={t('settings.pipeline.enterStageNamePlaceholder', 'Enter stage name')}
              />
            </div>
            <div>
              <Label htmlFor="groupStageDescription">{t('common.labels.description')}</Label>
              <Input
                id="groupStageDescription"
                value={newStageDescription}
                onChange={(e) => setNewStageDescription(e.target.value)}
                placeholder={t('settings.pipeline.enterStageDescription', 'Enter stage description')}
              />
            </div>
            <div>
              <Label htmlFor="groupStageColor">{t('settings.pipeline.color', 'Color')}</Label>
              <Select value={newStageColor} onValueChange={setNewStageColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${color.value}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGroupStageDialog(false)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button onClick={handleAddGroupStage}>{t('settings.pipeline.addStage', 'Add Stage')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Stage Dialog */}
      <Dialog open={showEditGroupStageDialog} onOpenChange={setShowEditGroupStageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.pipeline.editGroupStage', 'Edit Group Stage')}</DialogTitle>
            <DialogDescription>{t('settings.pipeline.updateStageDetails', 'Update the stage details')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editGroupStageName">{t('settings.pipeline.stageName', 'Stage Name')}</Label>
              <Input
                id="editGroupStageName"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder={t('settings.pipeline.enterStageNamePlaceholder', 'Enter stage name')}
              />
            </div>
            <div>
              <Label htmlFor="editGroupStageDescription">{t('common.labels.description')}</Label>
              <Input
                id="editGroupStageDescription"
                value={newStageDescription}
                onChange={(e) => setNewStageDescription(e.target.value)}
                placeholder={t('settings.pipeline.enterStageDescription', 'Enter stage description')}
              />
            </div>
            <div>
              <Label htmlFor="editGroupStageColor">{t('settings.pipeline.color', 'Color')}</Label>
              <Select value={newStageColor} onValueChange={setNewStageColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${color.value}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditGroupStageDialog(false)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button onClick={handleEditGroupStage}>{t('common.buttons.saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Section */}
      <div className="mt-8 pt-6 border-t border-border">
        <Card className="card-standard">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t('settings.logout.title', 'Log Out')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('settings.logout.description', 'Sign out of your account')}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                {t('settings.logout.button', 'Log Out')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
