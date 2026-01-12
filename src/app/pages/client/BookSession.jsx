"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Calendar } from "@/app/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { ArrowLeft, Clock, User, CheckCircle, Video, Calendar as CalendarIcon, Loader2, AlertCircle, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/context/LanguageContext";
import { useClientCoach } from "@/app/hooks/useClientCoach";
import { useSession } from "next-auth/react";
import { toast } from 'sonner';
import { format } from "date-fns";
import { timezones, getTimezoneOffset } from "@/app/lib/timezones";

// Time slots available (same as coach side)
// Generate time slots from 01:00 to 23:30 (30-minute intervals)
const generateTimeSlots = () => {
  const slots = [];
  // Hours 1-22: each has :00 and :30
  for (let hour = 1; hour < 23; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  // Hour 23: has :00 and :30
  slots.push('23:00');
  slots.push('23:30');
  return slots;
};

const timeSlots = generateTimeSlots();

// Meeting type options
const meetingTypes = [
  { 
    id: "none", 
    name: "No Meeting Link", 
    description: "Schedule without creating a meeting link",
    icon: CalendarIcon,
    color: "text-gray-500"
  },
  { 
    id: "google_meet", 
    name: "Google Meet", 
    description: "Create Google Calendar event with Meet link",
    icon: Video,
    color: "text-blue-500"
  },
  { 
    id: "zoom", 
    name: "Zoom Meeting", 
    description: "Create Zoom meeting with join link",
    icon: Video,
    color: "text-blue-600"
  },
  { 
    id: "teams", 
    name: "Microsoft Teams", 
    description: "Create Teams meeting with join link",
    icon: Video,
    color: "text-purple-500"
  }
];

export default function BookSession() {
  const router = useRouter();
  const t = useTranslation();
  const { data: session } = useSession();
  const { coach, loading: coachLoading, error: coachError } = useClientCoach();
  
  const [selectedDate, setSelectedDate] = useState();
  const [selectedTime, setSelectedTime] = useState("");
  const [sessionTopic, setSessionTopic] = useState("");
  const [acceptedConditions, setAcceptedConditions] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [meetingType, setMeetingType] = useState("none");
  const [duration, setDuration] = useState("60");
  const [selectedTimezone, setSelectedTimezone] = useState("UTC");
  
  // Payment state
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [sessionPrice, setSessionPrice] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Availability state
  const [availableTimes, setAvailableTimes] = useState([]);
  const [timesLoading, setTimesLoading] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [coachSessions, setCoachSessions] = useState([]);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState([]);

  // Set current date after hydration
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  // Set default timezone to coach's timezone when coach loads
  useEffect(() => {
    if (coach?.timezone) {
      setSelectedTimezone(coach.timezone);
    } else {
      // Fallback to browser timezone
      setSelectedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    }
  }, [coach?.timezone]);

  // Check payment requirement and handle payment success callback
  useEffect(() => {
    const checkPaymentRequirement = async () => {
      if (!coach?.id || !session?.user?.id) return;

      try {
        // Check URL params for payment success
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        const coachIdFromUrl = urlParams.get('coachId');

        if (paymentStatus === 'success' && coachIdFromUrl === coach.id) {
          // Payment was successful, get payment intent ID from recent payment
          setCheckingPayment(true);
          const paymentResponse = await fetch(`/api/client/payments?coachId=${coach.id}&productType=one_to_one&limit=1`);
          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            if (paymentData.payments && paymentData.payments.length > 0) {
              const latestPayment = paymentData.payments[0];
              if (latestPayment.status === 'succeeded') {
                setPaymentIntentId(latestPayment.paymentIntentId);
                setPaymentRequired(false); // Payment completed
                toast.success('Payment successful! You can now book your session.');
                // Clean URL
                window.history.replaceState({}, '', window.location.pathname);
              }
            }
          }
          setCheckingPayment(false);
          return;
        }

        if (paymentStatus === 'canceled') {
          toast.error('Payment was canceled. Please complete payment to book a session.');
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        }

        // Check if payment is required
        const productResponse = await fetch(`/api/client/coach/products`);
        if (productResponse.ok) {
          const productData = await productResponse.json();
          const oneToOneProduct = productData.products?.find(p => p.productType === 'one_to_one');
          
          if (oneToOneProduct && oneToOneProduct.amount > 0) {
            setPaymentRequired(true);
            setSessionPrice(oneToOneProduct.amount / 100); // Convert from øre to DKK
            
            // Check if client has a successful payment for this session
            const paymentCheck = await fetch(`/api/client/payments?coachId=${coach.id}&productType=one_to_one&status=succeeded&limit=1`);
            if (paymentCheck.ok) {
              const paymentData = await paymentCheck.json();
              if (paymentData.payments && paymentData.payments.length > 0) {
                const latestPayment = paymentData.payments[0];
                // Check if payment is recent (within last hour) and not linked to a session
                const paymentDate = new Date(latestPayment.createdAt);
                const now = new Date();
                const hoursDiff = (now - paymentDate) / (1000 * 60 * 60);
                
                if (hoursDiff < 1 && !latestPayment.sessionId) {
                  setPaymentIntentId(latestPayment.paymentIntentId);
                  setPaymentRequired(false); // Payment already completed
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking payment requirement:', error);
      }
    };

    checkPaymentRequirement();
  }, [coach?.id, session?.user?.id]);

  // Fetch coach's available times when date changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDate || !coach?.id) {
        setAvailableTimes([]);
        return;
      }

      setTimesLoading(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const response = await fetch(
          `/api/integrations/calendar/availability/coach?date=${dateStr}&coachId=${coach.id}`
        );

        if (response.ok) {
          const data = await response.json();
          setCoachSessions(data.coachSessions || []);
          setGoogleCalendarEvents(data.googleCalendarEvents || []);
          setCalendarConnected(data.calendarConnected || false);
          
          // Compute available times
          computeAvailableTimes(data.coachSessions || [], data.googleCalendarEvents || []);
        } else {
          setAvailableTimes([]);
        }
      } catch (error) {
        console.error('Failed to fetch availability:', error);
        setAvailableTimes([]);
      } finally {
        setTimesLoading(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, coach?.id, duration, selectedTimezone]);

  const computeAvailableTimes = (dbSessions, calendarEvents) => {
    if (!selectedDate || !selectedTimezone) {
      setAvailableTimes([]);
      return;
    }

    const dateStr = selectedDate.toISOString().split('T')[0];
    const viewerTZ = selectedTimezone; // Use selected timezone instead of browser timezone

    // Convert UTC to local for database sessions
    const utcToLocalParts = (dateStrUTC, timeHHMMUTC) => {
      try {
        const iso = `${String(dateStrUTC).slice(0,10)}T${(timeHHMMUTC||'').substring(0,5)}:00Z`;
        const d = new Date(iso);
        const fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: viewerTZ,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false
        });
        const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
        return { localDate: `${parts.year}-${parts.month}-${parts.day}`, localTime: `${parts.hour}:${parts.minute}` };
      } catch {
        return { localDate: String(dateStrUTC).slice(0,10), localTime: (timeHHMMUTC||'').substring(0,5) };
      }
    };

    const daySessions = dbSessions
      .map(s => {
        const { localDate, localTime } = utcToLocalParts(s.sessionDate, s.sessionTime);
        return { ...s, _localDate: localDate, _localTime: localTime };
      })
      .filter(s => s._localDate === dateStr);

    // Convert Google Calendar events to time slots (with proper timezone conversion)
    const calendarBusySlots = calendarEvents
      .filter(event => {
        if (event.allDay) return true;
        try {
          // Convert event start to selected timezone for date comparison
          const eventStart = new Date(event.start);
          const fmt = new Intl.DateTimeFormat('en-CA', {
            timeZone: viewerTZ,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
          });
          const parts = Object.fromEntries(fmt.formatToParts(eventStart).map(p => [p.type, p.value]));
          const eventDate = `${parts.year}-${parts.month}-${parts.day}`;
          return eventDate === dateStr;
        } catch {
          return false;
        }
      })
      .map(event => {
        if (event.allDay) {
          return { start: 0, end: 24 * 60 };
        }
        try {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);
          
          // Convert to selected timezone for hour/minute extraction
          const startFmt = new Intl.DateTimeFormat('en-US', {
            timeZone: viewerTZ,
            hour: '2-digit', minute: '2-digit', hour12: false
          });
          const endFmt = new Intl.DateTimeFormat('en-US', {
            timeZone: viewerTZ,
            hour: '2-digit', minute: '2-digit', hour12: false
          });
          
          const startParts = Object.fromEntries(startFmt.formatToParts(eventStart).map(p => [p.type, p.value]));
          const endParts = Object.fromEntries(endFmt.formatToParts(eventEnd).map(p => [p.type, p.value]));
          
          const startMinutes = parseInt(startParts.hour) * 60 + parseInt(startParts.minute);
          const endMinutes = parseInt(endParts.hour) * 60 + parseInt(endParts.minute);
          
          return { start: startMinutes, end: endMinutes };
        } catch {
          return null;
        }
      })
      .filter(slot => slot !== null);

    const toMinutes = (hhmm) => {
      if (!hhmm) return 0;
      const [h, m] = hhmm.substring(0, 5).split(':').map(Number);
      return (h * 60) + (m || 0);
    };

    const overlaps = (start, dur) => {
      const end = start + dur;
      
      // Check database sessions
      const dbOverlap = daySessions.some(s => {
        const sStart = toMinutes((s._localTime||'').substring(0,5));
        const sEnd = sStart + (s.duration || 60);
        return (start < sEnd) && (end > sStart);
      });
      
      if (dbOverlap) return true;
      
      // Check Google Calendar events
      const calendarOverlap = calendarBusySlots.some(slot => {
        return (start < slot.end) && (end > slot.start);
      });
      
      return calendarOverlap;
    };

    const dur = parseInt(duration || '60', 10);
    const slots = timeSlots.filter(t => {
      const start = toMinutes(t);
      return !overlaps(start, dur);
    });

    setAvailableTimes(slots);

    // Clear selected time if it's no longer available
    if (selectedTime && !slots.includes(selectedTime)) {
      setSelectedTime("");
    }
  };

  const handlePayment = async () => {
    if (!coach?.id) {
      toast.error("Coach information not available. Please try again.");
      return;
    }

    setProcessingPayment(true);

    try {
      const response = await fetch('/api/payments/create-session-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coachId: coach.id,
          returnUrl: '/client/book-session'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
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
      setProcessingPayment(false);
    }
  };

  const handleBookSession = async () => {
    if (!selectedDate || !selectedTime || !sessionTopic.trim() || !acceptedConditions) {
      toast.error("Please fill in all required fields and accept the conditions.");
      return;
    }

    if (!coach?.id) {
      toast.error("Coach information not available. Please try again.");
      return;
    }

    // Check if payment is required but not completed - redirect to payment instead of showing error
    if (paymentRequired && !paymentIntentId) {
      if (sessionPrice) {
        toast.info(`Please complete payment of ${sessionPrice.toFixed(2)} DKK to book your session.`);
        await handlePayment();
      } else {
        toast.error("Payment is required but price information is not available. Please try again.");
      }
      return;
    }

    setIsBooking(true);

    try {
      const sessionData = {
        title: sessionTopic || `Session with ${coach.name}`,
        description: sessionTopic,
        sessionDate: selectedDate.toISOString().split('T')[0],
        sessionTime: selectedTime,
        duration: parseInt(duration),
        meetingType: meetingType,
        notes: sessionTopic,
        timeZone: selectedTimezone,
        paymentIntentId: paymentIntentId // Include payment intent ID if available
      };

      const response = await fetch('/api/sessions/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If payment is required, redirect to payment instead of showing error
        if (response.status === 402 && errorData.requiresPayment) {
          setIsBooking(false);
          if (sessionPrice) {
            toast.info(`Please complete payment of ${sessionPrice.toFixed(2)} DKK to book your session.`);
            await handlePayment();
          } else {
            toast.error(errorData.message || 'Payment is required before booking');
            setPaymentRequired(true);
          }
          return;
        }
        
        throw new Error(errorData.error || 'Failed to book session');
      }

      const result = await response.json();

      if (result.success) {
        setIsBooking(false);
        setIsBooked(true);
        toast.success("Session booked successfully!");

        // Navigate back after showing success
        setTimeout(() => {
          router.push('/client');
        }, 3000);
      } else {
        throw new Error('Failed to book session');
      }
    } catch (error) {
      console.error('Error booking session:', error);
      toast.error(error.message || 'Failed to book session. Please try again.');
      setIsBooking(false);
    }
  };

  // Loading state
  if (coachLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Error state
  if (coachError || !coach) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Coach Assigned</h2>
            <p className="text-muted-foreground mb-4">
              {coachError || "You don't have a coach assigned. Please contact support."}
            </p>
            <Button onClick={() => router.push('/client')}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isBooked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('sessions.booked', 'Session Booked!')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('sessions.bookedSuccess', "Your session has been scheduled successfully. You'll receive a confirmation email shortly.")}
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>{t('common.labels.date', 'Date')}:</strong> {selectedDate?.toLocaleDateString()}</p>
              <p><strong>{t('common.labels.time', 'Time')}:</strong> {selectedTime}</p>
              <p><strong>{t('navigation.coaches', 'Coach')}:</strong> {coach.name}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => router.push('/client')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="ml-4 text-xl font-semibold flex items-center gap-2">
          <Video className="h-5 w-5" />
          {t('sessions.bookVideoCall', 'Book 1-1 Video Call')}
        </h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Coach Info */}
        <Card>
          <CardHeader>
            <CardTitle>Your Coach</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={coach.avatar} />
                <AvatarFallback>{coach.name?.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{coach.name}</p>
                <p className="text-sm text-muted-foreground">{coach.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Select Date */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sessions.selectDate', 'Select Date')}</CardTitle>
            <CardDescription>{t('sessions.chooseDate', 'Choose your preferred date')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar 
              mode="single" 
              selected={selectedDate} 
              onSelect={setSelectedDate} 
              disabled={date => date < new Date()} 
              className="rounded-md border" 
            />
          </CardContent>
        </Card>

        {/* Timezone Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Timezone</CardTitle>
            <CardDescription>Select timezone for scheduling (defaults to coach's timezone)</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
              <SelectTrigger>
                <SelectValue>
                  {timezones.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone} ({getTimezoneOffset(selectedTimezone)})
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {timezones.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label} ({tz.offset})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {coach?.timezone && selectedTimezone === coach.timezone && (
              <p className="text-xs text-muted-foreground mt-2">
                Using coach's timezone: {coach.timezone}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Select Time */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('sessions.selectTime', 'Select Time')}</CardTitle>
                <CardDescription>{t('sessions.chooseTime', 'Choose your preferred time slot')}</CardDescription>
              </div>
              {calendarConnected && selectedDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Synced with Coach's Calendar</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Please select a date first
              </p>
            ) : timesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading available times...</span>
              </div>
            ) : availableTimes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No available times for this date. Please select another date.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {availableTimes.map(slot => (
                    <Button 
                      key={slot} 
                      variant={selectedTime === slot ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setSelectedTime(slot)} 
                      className={`justify-center h-12 transition-all duration-200 ${
                        selectedTime === slot 
                          ? "shadow-lg scale-105 bg-primary hover:bg-primary/90" 
                          : "hover:bg-muted hover:scale-102 hover:shadow-md"
                      }`}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="font-medium">{slot}</span>
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Times shown in {timezones.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone} ({getTimezoneOffset(selectedTimezone)})
                </p>
              </>
            )}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                {t('sessions.durationNotice', '💡 Sessions are 50 minutes long. Please be ready at your scheduled time.')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Duration */}
        <Card>
          <CardHeader>
            <CardTitle>Session Duration</CardTitle>
            <CardDescription>How long should this session be?</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">120 minutes</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Meeting Type */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Link</CardTitle>
            <CardDescription>Choose how you'd like to meet (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {meetingTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = meetingType === type.id;
                
                return (
                  <div 
                    key={type.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setMeetingType(type.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className={`h-5 w-5 ${type.color}`} />
                      <div>
                        <div className="text-sm font-medium">{type.name}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      isSelected ? "border-primary bg-primary" : "border-gray-300"
                    }`} />
                  </div>
                );
              })}
            </div>
            {meetingType !== 'none' && (
              <p className="mt-3 text-xs text-muted-foreground">
                Note: Meeting link will be created using your coach's calendar integration.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Session Topic */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sessions.discussTopic', 'What would you like to discuss?')}</CardTitle>
            <CardDescription>{t('sessions.topicDescription', 'Brief topic to help me prepare for our session')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder={t('sessions.topicPlaceholder', 'e.g., Work anxiety and coping strategies')} 
              value={sessionTopic} 
              onChange={e => setSessionTopic(e.target.value)} 
              className="w-full min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sessions.conditions', 'Session Conditions')}</CardTitle>
            <CardDescription>{t('sessions.conditionsDescription', 'Please review and accept the terms for your 1-1 video session request.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">{t('sessions.details', 'Session Details')}:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t('sessions.duration', 'Duration')}: {duration} minutes</li>
                  <li>• {t('sessions.price', 'Price')}: {sessionPrice ? `${sessionPrice.toFixed(2)} DKK` : (paymentRequired ? 'Price will be shown after loading...' : 'Free')}</li>
                  <li>• {t('sessions.cancellation', 'Cancellation')}: {t('sessions.cancellationNotice', '24 hours notice required')}</li>
                </ul>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="conditions" 
                  checked={acceptedConditions} 
                  onCheckedChange={async (checked) => {
                    setAcceptedConditions(checked);
                    // If payment is required and conditions are accepted, redirect to payment
                    if (checked && paymentRequired && !paymentIntentId && sessionPrice) {
                      await handlePayment();
                    }
                  }} 
                />
                <Label 
                  htmlFor="conditions" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {paymentRequired && sessionPrice 
                    ? `I accept the conditions for the paid 1-1 session (${sessionPrice.toFixed(2)} DKK)`
                    : t('sessions.acceptConditions', "I accept the conditions for the paid 1-1 session")}
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Section */}
        {paymentRequired && (
          <Card className={paymentIntentId ? "border-green-500" : "border-orange-500"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {paymentIntentId ? "Payment Completed" : "Payment Required"}
              </CardTitle>
              <CardDescription>
                {paymentIntentId 
                  ? "Payment completed! You can now book your session."
                  : sessionPrice 
                    ? `Payment of ${sessionPrice.toFixed(2)} DKK is required before booking a 1-to-1 session. Click "Accept Conditions" above or the button below to proceed to payment.`
                    : "Loading payment information..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentIntentId ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Payment Successful</span>
                </div>
              ) : sessionPrice ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePayment}
                  disabled={processingPayment || checkingPayment}
                >
                  {processingPayment || checkingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay {sessionPrice.toFixed(2)} DKK
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading payment information...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Book Button */}
        <div style = {{marginBottom: '100px'}}>
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleBookSession} 
            disabled={
              !selectedDate || 
              !selectedTime || 
              !sessionTopic.trim() || 
              !acceptedConditions || 
              isBooking || 
              (paymentRequired && !paymentIntentId) ||
              checkingPayment
            }
          >
            {isBooking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('sessions.booking', 'Booking...')}
              </>
            ) : (
              t('sessions.bookVideoCall', 'Book Video Call')
            )}
          </Button>
          {paymentRequired && !paymentIntentId && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Please complete payment above to book your session
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
