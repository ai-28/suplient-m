"use client"
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Calendar } from "@/app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Badge } from "@/app/components/ui/badge";
import { Checkbox } from "@/app/components/ui/checkbox";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Calendar as CalendarIcon, Clock, Users, AlertCircle, Bell, Video, ExternalLink, Loader2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/app/lib/utils";
import { toast } from 'sonner';
import { useClients } from "@/app/hooks/useClients";
import { useGroups } from "@/app/hooks/useGroups";
import { timezones, getTimezoneOffset } from "@/app/lib/timezones";


export function ScheduleSessionDialog({ 
  open, 
  onOpenChange, 
  onSessionCreated,
  groupName, 
  groupMembers 
}) {
  const { data: session } = useSession();
  const [date, setDate] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [fetchedGroupMembers, setFetchedGroupMembers] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  
  // Mobile detection
  useEffect(() => {
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 640);
      }
    };

    checkScreenSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);
  
  // Fetch real data
  const { availableClients, loading: clientsLoading } = useClients();
  const { groups, loading: groupsLoading } = useGroups();
  
  const [formData, setFormData] = useState({
    title: "",
    time: "",
    duration: "60",
    sessionType: "",
    notes: "",
    reminderTime: "24",
    meetingType: "none",
  });

  // Availability for time selection
  const [coachSessions, setCoachSessions] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [timesLoading, setTimesLoading] = useState(false);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState([]);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    if (typeof window !== 'undefined') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
    return 'UTC';
  });

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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Load coach sessions once when dialog opens
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        if (res.ok && data.sessions) setCoachSessions(data.sessions);
      } catch (e) {
        console.warn('Failed to load sessions for availability:', e);
      }
    };
    if (open) {
      loadSessions();
    }
  }, [open]);

  // Fetch Google Calendar events when date changes
  useEffect(() => {
    const fetchGoogleCalendarEvents = async () => {
      if (!date) {
        setGoogleCalendarEvents([]);
        setCalendarConnected(false);
        return;
      }
      
      try {
        const dateStr = date.toISOString().split('T')[0];
        const response = await fetch(
          `/api/integrations/calendar/availability?date=${dateStr}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setGoogleCalendarEvents(data.events || []);
          setCalendarConnected(data.connected || false);
        } else {
          setGoogleCalendarEvents([]);
          setCalendarConnected(false);
        }
      } catch (error) {
        console.error('Failed to fetch Google Calendar events:', error);
        setGoogleCalendarEvents([]);
        setCalendarConnected(false);
      }
    };
    
    fetchGoogleCalendarEvents();
  }, [date]);

  // Recompute available times whenever date, duration or session list changes
  useEffect(() => {
    const computeAvailable = () => {
      if (!date) { setAvailableTimes([]); return; }
      setTimesLoading(true);
      try {
        const dateStr = date.toISOString().split('T')[0];

        // Convert stored UTC date/time to local date/time for comparison and overlap checks
        const viewerTZ = selectedTimezone || 'UTC';
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

        const daySessions = coachSessions
          .map(s => {
            const { localDate, localTime } = utcToLocalParts(s.sessionDate, s.sessionTime);
            return { ...s, _localDate: localDate, _localTime: localTime };
          })
          .filter(s => s._localDate === dateStr);

        // Convert Google Calendar events to time slots (with proper timezone conversion)
        const calendarBusySlots = googleCalendarEvents
          .filter(event => {
            if (event.allDay) return true; // Block all-day events
            
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
              // All-day event blocks entire day
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
          const [h,m] = hhmm.substring(0,5).split(':').map(Number);
          return (h*60) + (m||0);
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

        const dur = parseInt(formData.duration || '60', 10);
        const slots = timeSlots.filter(t => {
          const start = toMinutes(t);
          return !overlaps(start, dur);
        });
        setAvailableTimes(slots);

        // If current time is no longer valid, clear it
        if (formData.time && !slots.includes(formData.time)) {
          setFormData(prev => ({ ...prev, time: '' }));
        }
      } finally {
        setTimesLoading(false);
      }
    };

    computeAvailable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, formData.duration, coachSessions, googleCalendarEvents, selectedTimezone]);

  // Fetch group members when group is selected
  const fetchGroupMembers = async (groupId) => {
    if (!groupId) {
      setFetchedGroupMembers([]);
      return;
    }

    try {
      const response = await fetch(`/api/groups/${groupId}/members`);
      if (response.ok) {
        const data = await response.json();
        setFetchedGroupMembers(data.members || []);
      } else {
        console.error('Failed to fetch group members');
        setFetchedGroupMembers([]);
      }
    } catch (error) {
      console.error('Error fetching group members:', error);
      setFetchedGroupMembers([]);
    }
  };

  // Check if user has existing connections when dialog opens
  useEffect(() => {
    if (open) {
      checkExistingConnections();
    }
  }, [open]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleConnected = urlParams.get('google_connected');
    const zoomConnected = urlParams.get('zoom_connected');
    
    if (googleConnected === 'true') {
      toast.success('Google Meet connected successfully!');
      // Immediately update localStorage with Google connection
      const currentConnections = JSON.parse(localStorage.getItem('integrationConnections') || '{}');
      currentConnections.google_meet = {
        connected: true,
        email: 'Connected', // Will be updated by checkExistingConnections
        name: 'Google Meet'
      };
      localStorage.setItem('integrationConnections', JSON.stringify(currentConnections));
      checkExistingConnections();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (zoomConnected === 'true') {
      toast.success('Zoom connected successfully!');
      // Immediately update localStorage with Zoom connection
      const currentConnections = JSON.parse(localStorage.getItem('integrationConnections') || '{}');
      currentConnections.zoom = {
        connected: true,
        email: 'Connected', // Will be updated by checkExistingConnections
        name: 'Zoom'
      };
      localStorage.setItem('integrationConnections', JSON.stringify(currentConnections));
      checkExistingConnections();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkExistingConnections = async () => {
    try {
      // Fetch from server to get latest data (only active integrations are returned)
      const response = await fetch('/api/integrations');
      if (response.ok) {
        const data = await response.json();
        const integrations = data.integrations || [];
        
        // Set connection status for each platform (only active ones are returned)
        const status = {};
        integrations.forEach(integration => {
          // Map google_calendar to google_meet for UI consistency
          const platformKey = integration.platform === 'google_calendar' ? 'google_meet' : integration.platform;
          status[platformKey] = {
            connected: true,
            email: integration.platformEmail,
            name: integration.platformName
          };
        });
        
        // Use server data as the source of truth (don't merge with stale cache)
        // This ensures disconnected platforms are removed
        setConnectionStatus(status);
        
        // Update localStorage with latest data
        localStorage.setItem('integrationConnections', JSON.stringify(status));
      } else {
        console.error('Failed to fetch integrations:', response.status);
        // If server fails, try to use cached data
        const cachedConnections = localStorage.getItem('integrationConnections');
        if (cachedConnections) {
          try {
            const cachedStatus = JSON.parse(cachedConnections);
            setConnectionStatus(cachedStatus);
          } catch (e) {
            console.warn('Failed to parse cached connections:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error checking connections:', error);
      // If there's an error, try to use cached data
      const cachedConnections = localStorage.getItem('integrationConnections');
      if (cachedConnections) {
        try {
          const cachedStatus = JSON.parse(cachedConnections);
          setConnectionStatus(cachedStatus);
        } catch (e) {
          console.warn('Failed to use cached connections:', e);
        }
      }
    }
  };

  const handleConnectPlatform = async (platform) => {
    setIsConnecting(true);
    try {
      if (platform === 'google_meet') {
        // Redirect to Google OAuth for calendar integration
        const authUrl = `/api/integrations/oauth/google/authorize?callbackUrl=${encodeURIComponent(window.location.href)}`;
        window.location.href = authUrl;
        return;
      }
      
      if (platform === 'zoom') {
        // Redirect to Zoom OAuth for meeting integration
        const authUrl = `/api/integrations/oauth/zoom/authorize?callbackUrl=${encodeURIComponent(window.location.href)}`;
        window.location.href = authUrl;
        return;
      }
      
      // For Teams, show instructions or implement their OAuth
      toast.info(`${platform} OAuth integration coming soon`);
      
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect platform');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleReconnectPlatform = async (platform) => {
    setIsConnecting(true);
    try {
      // Map UI platform names to API platform names
      const platformMap = {
        'google_meet': 'google_calendar',
        'zoom': 'zoom',
        'teams': 'teams'
      };
      
      const apiPlatform = platformMap[platform] || platform;
      
      // Call the reconnect API
      const response = await fetch('/api/integrations/reconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform: apiPlatform }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reconnect');
      }

      const result = await response.json();
      
      if (result.success && result.reconnectUrl) {
        // Redirect to the reconnect URL
        window.location.href = result.reconnectUrl;
      } else {
        toast.error('Failed to get reconnect URL');
      }
      
    } catch (error) {
      console.error('Reconnection error:', error);
      toast.error(`Failed to reconnect ${platform}: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectPlatform = async (platform) => {
    setIsConnecting(true);
    try {
      // Map UI platform names to API platform names
      const platformMap = {
        'google_meet': 'google_calendar',
        'zoom': 'zoom',
        'teams': 'teams'
      };
      
      const apiPlatform = platformMap[platform] || platform;
      
      // Call the disconnect API
      const response = await fetch('/api/integrations/reconnect', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform: apiPlatform }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`${platform} integration disconnected successfully`);
        // Refresh the connection status
        await checkExistingConnections();
      } else {
        toast.error('Failed to disconnect integration');
      }
      
    } catch (error) {
      console.error('Disconnection error:', error);
      toast.error(`Failed to disconnect ${platform}: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!date || !formData.time || !formData.sessionType) {
      toast.error("Please fill in the date, time, and session type.");
      return;
    }

    if (formData.sessionType === 'individual' && !selectedClient) {
      toast.error("Please select a client for individual sessions.");
      return;
    }

    // Check if meeting type requires connection
    if (formData.meetingType !== 'none' && !connectionStatus[formData.meetingType]?.connected) {
      toast.error(`Please connect ${formData.meetingType === 'google_meet' ? 'Google Meet' : formData.meetingType} first`);
      return;
    }

    setIsLoading(true);
    
    try {
      // Prepare session data
      const sessionData = {
        title: formData.title || (formData.sessionType === 'individual' ? `${selectedClient.name} Session` : `${selectedGroup.name} Session`),
        description: formData.notes || null,
        sessionDate: date.toISOString().split('T')[0], // YYYY-MM-DD format
        sessionTime: formData.time,
        timeZone: selectedTimezone || 'UTC',
        duration: parseInt(formData.duration),
        sessionType: formData.sessionType,
        clientId: formData.sessionType === 'individual' ? selectedClient.id : null,
        groupId: formData.sessionType === 'group' ? selectedGroup.id : null,
        coachId: session?.user?.id, // Add coachId for integration services
        meetingLink: null,
        status: 'scheduled',
        mood: 'neutral',
        notes: formData.notes || null,
        meetingType: formData.meetingType,
        integrationSettings: {
          reminderTime: formData.reminderTime
        }
      };

      // Create session via API
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          const conflictList = (errorData.conflicts || [])
            .map(c => `${(c.sessionTime || '').substring(0,5)}–${(() => { try { const [h,m]=(c.sessionTime||'').substring(0,5).split(':').map(Number); const end=new Date(0,0,0,h,m||0); end.setMinutes(end.getMinutes() + (c.duration||60)); return `${end.getHours().toString().padStart(2,'0')}:${end.getMinutes().toString().padStart(2,'0')}`;} catch { return ''; }})()} (${c.title || 'Session'})`)
            .join('\n');
          toast.error('This time conflicts with another session.', {
            description: conflictList || 'Please choose a different time.'
          });
          throw new Error('Time conflict');
        }
        throw new Error(errorData.error || 'Failed to create session');
      }

      const result = await response.json();

      
      // If meeting type is selected, create external meeting
      if (formData.meetingType !== 'none') {
        
        try {
          // Add client email to attendees if it's an individual session
          if (formData.sessionType === 'individual' && selectedClient?.email) {
            sessionData.attendees = [selectedClient.email];
          }
          
          // Add group member emails to attendees if it's a group session
          if (formData.sessionType === 'group' && fetchedGroupMembers.length > 0) {
            sessionData.attendees = fetchedGroupMembers.map(member => member.email).filter(email => email);
          }
          
          // Always add coach email to attendees so they receive calendar invitation
          if (session?.user?.email && sessionData.attendees) {
            if (!sessionData.attendees.includes(session.user.email)) {
              sessionData.attendees.push(session.user.email);
            }
          } else if (session?.user?.email) {
            sessionData.attendees = [session.user.email];
          }
          
          let integrationResult;
          
          // For all meeting types, use the original logic
            const platformForAPI = formData.meetingType === 'google_meet' ? 'google_calendar' : formData.meetingType;
            integrationResult = await createExternalMeeting(result.session.id, sessionData, platformForAPI);

          
          // Check if any integrations failed due to missing connections
          const failedIntegrations = Object.entries(integrationResult.results || {})
            .filter(([platform, result]) => !result.success && result.error?.includes('integration not found'))
            .map(([platform]) => platform);
          
          if (failedIntegrations.length > 0) {
            const platformNames = failedIntegrations.map(p => p === 'google_calendar' ? 'Google Meet' : p).join(', ');
            toast.error(`Session created but ${platformNames} integration is not connected. Please connect ${platformNames} first.`);
          }
          
          // Update session with meeting link
          try {
            let meetingLinkToSave = null;
            let locationToSave = null;
            
            if (formData.meetingType === 'zoom' && integrationResult.results?.zoom?.meetingLink) {
              meetingLinkToSave = integrationResult.results.zoom.meetingLink;
              locationToSave = `Zoom Meeting - Password: ${integrationResult.results.zoom.password || 'No password required'}`;
            } else if (formData.meetingType === 'google_meet' && integrationResult.results?.google_calendar?.meetingLink) {
              meetingLinkToSave = integrationResult.results.google_calendar.meetingLink;
              locationToSave = 'Google Meet';
            } else if (formData.meetingType === 'teams' && integrationResult.results?.teams?.meetingUrl) {
              meetingLinkToSave = integrationResult.results.teams.meetingUrl;
              locationToSave = 'Microsoft Teams';
            }
            
            if (meetingLinkToSave) {
              const updateResponse = await fetch(`/api/sessions/${result.session.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  updateMeetingLink: meetingLinkToSave,
                  updateLocation: locationToSave
                }),
              });
              
              if (updateResponse.ok) {
              } else {
                const errorData = await updateResponse.json();
                console.error('Failed to update session meeting link:', {
                  status: updateResponse.status,
                  statusText: updateResponse.statusText,
                  error: errorData
                });
              }
            }
          } catch (updateError) {
            console.error('Error updating session meeting link:', updateError);
            // Don't fail the session creation if meeting link update fails
          }
          
          // Show success message with meeting details
          if (formData.meetingType === 'zoom' && integrationResult.results?.zoom?.meetingLink) {
            const clientMessage = formData.sessionType === 'individual' && selectedClient ? 
              `Client ${selectedClient.name} will receive calendar invitation with Zoom meeting link and notification.` : 
              formData.sessionType === 'group' && fetchedGroupMembers.length > 0 ?
              `${fetchedGroupMembers.length} group members will receive calendar invitations with Zoom meeting link and notifications.` :
              'Zoom meeting created and added to your calendar.';
            
            toast.success(`Session scheduled successfully!`, {
              description: `${clientMessage} Zoom link: ${integrationResult.results.zoom.meetingLink}`,
              duration: 8000,
            });
          } else if (integrationResult.results && integrationResult.results[formData.meetingType === 'google_meet' ? 'google_calendar' : formData.meetingType]) {
            const platformForAPI = formData.meetingType === 'google_meet' ? 'google_calendar' : formData.meetingType;
            const meetingResult = integrationResult.results[platformForAPI];
            if (meetingResult.meetingLink) {
              const clientMessage = formData.sessionType === 'individual' && selectedClient ? 
                `Client ${selectedClient.name} will receive calendar invitation and notification.` : 
                formData.sessionType === 'group' && fetchedGroupMembers.length > 0 ?
                `${fetchedGroupMembers.length} group members will receive calendar invitations and notifications.` :
                'Google Meet link created and added to your calendar.';
              
              toast.success(`Session scheduled successfully!`, {
                description: `${clientMessage} Meet link: ${meetingResult.meetingLink}`,
                duration: 8000,
              });
            } else {
              toast.success("Session scheduled successfully! Calendar event created.");
            }
          } else {
            toast.success("Session scheduled successfully! Calendar event created.");
          }
        } catch (integrationError) {
          console.error('Integration error:', integrationError);
          toast.warning('Session created but meeting link failed');
        }
      } else {
        console.log('🎯 No meeting type selected - skipping integration');
        toast.success("Session scheduled successfully!");
      }
      
      // Create a notification for the session creation
      try {
        
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
            body: JSON.stringify({
              userId: session?.user?.id,
              type: 'system',
              title: 'Session Scheduled',
              message: `Your session "${sessionData.title}" has been scheduled for ${sessionData.sessionDate} at ${sessionData.sessionTime}`,
              data: {
                sessionId: result.session.id,
                sessionTitle: sessionData.title,
                sessionDate: sessionData.sessionDate,
                sessionTime: sessionData.sessionTime
              },
              priority: 'normal'
            }),
        });
        
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't fail the session creation if notification fails
      }
      
      // Create notification for client if it's an individual session
      if (formData.sessionType === 'individual' && selectedClient?.userId) {
        try {
          
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: selectedClient.userId,
              type: 'system',
              title: 'New Session Scheduled',
              message: `Your coach has scheduled a session "${sessionData.title}" for ${sessionData.sessionDate} at ${sessionData.sessionTime}`,
              data: {
                sessionId: result.session.id,
                sessionTitle: sessionData.title,
                sessionDate: sessionData.sessionDate,
                sessionTime: sessionData.sessionTime,
                meetingLink: formData.meetingType !== 'none' ? 'Check your calendar for meeting link' : null
              },
              priority: 'high'
            }),
          });
          
          console.log('Client notification created successfully');
        } catch (clientNotificationError) {
          console.error('Failed to create client notification:', clientNotificationError);
          // Don't fail the session creation if client notification fails
        }
      }
      
      // Create notifications for all group members if it's a group session
      if (formData.sessionType === 'group' && fetchedGroupMembers.length > 0) {
        console.log('Creating notifications for group members:', fetchedGroupMembers.length);
        
        // Create notifications for each group member
        const notificationPromises = fetchedGroupMembers.map(async (member) => {
          try {
            // Use userId directly from member data (already included in group members API)
            const userId = member.userId;
            
            if (userId) {
              await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: userId,
                  type: 'system',
                  title: 'New Group Session Scheduled',
                  message: `Your coach has scheduled a group session "${sessionData.title}" for ${sessionData.sessionDate} at ${sessionData.sessionTime}`,
                  data: {
                    sessionId: result.session.id,
                    sessionTitle: sessionData.title,
                    sessionDate: sessionData.sessionDate,
                    sessionTime: sessionData.sessionTime,
                    groupName: selectedGroup?.name,
                    meetingLink: formData.meetingType !== 'none' ? 'Check your calendar for meeting link' : null
                  },
                  priority: 'high'
                }),
              });
            } else {
              console.warn(`No userId found for group member ${member.name} (client ID: ${member.id})`);
            }
          } catch (error) {
            console.error(`Failed to create notification for group member ${member.name}:`, error);
          }
        });
        
        // Wait for all notifications to be created
        try {
          await Promise.all(notificationPromises);
          console.log('All group member notifications created successfully');
        } catch (error) {
          console.error('Some group member notifications failed:', error);
        }
      }
      
      // Reset form
      setDate(undefined);
      setSelectedClient(null);
      setSelectedGroup(null);
      setFetchedGroupMembers([]);
      setFormData({
        title: "",
        time: "",
        duration: "60",
        sessionType: "",
        notes: "",
        reminderTime: "24",
        meetingType: "none",
      });
      
      // Notify parent component
      if (onSessionCreated) {
        onSessionCreated();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error(error.message || 'Failed to schedule session');
    } finally {
      setIsLoading(false);
    }
  };

  const createExternalMeeting = async (sessionId, sessionData, platform) => {
      try {
        // Convert sessionDate and sessionTime to proper startTime and endTime
        const sessionDateTime = new Date(`${sessionData.sessionDate}T${sessionData.sessionTime}`);
        const endDateTime = new Date(sessionDateTime.getTime() + (sessionData.duration * 60000));
        
        const formattedSessionData = {
          ...sessionData,
          startTime: sessionDateTime.toISOString(),
          endTime: endDateTime.toISOString()
        };
        
        console.log('Creating external meeting with data:', formattedSessionData);
        
        const response = await fetch('/api/sessions/create-with-integration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            sessionData: formattedSessionData,
            platforms: [platform]
          }),
        });

        if (!response.ok) {
        throw new Error(`Failed to create ${platform} meeting`);
        }

        return await response.json();
      } catch (error) {
      console.error(`Error creating ${platform} meeting:`, error);
        throw error;
      }
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-full mx-2' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader className={isMobile ? 'px-4 py-3' : ''}>
          <DialogTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-2xl'} break-words`}>
            <CalendarIcon className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'} text-primary`} />
            Schedule Session
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className={isMobile ? 'space-y-3 px-4' : 'space-y-6'}>
          {/* Session Details */}
          <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
            <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground break-words`}>Session Details</h3>
            
            <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
              <Label htmlFor="title" className={isMobile ? 'text-xs' : ''}>Session Title</Label>
              <Input
                id="title"
                placeholder={`${groupName} - Group Session`}
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className={isMobile ? 'text-xs h-8' : ''}
              />
            </div>

            <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
              <Label htmlFor="sessionType" className={isMobile ? 'text-xs' : ''}>Session Type *</Label>
              <Select onValueChange={(value) => {
                handleInputChange("sessionType", value);
                setSelectedClient(null);
                setSelectedGroup(null);
                setFetchedGroupMembers([]);
              }}>
                <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
                  <SelectValue placeholder="Select session type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Session</SelectItem>
                  <SelectItem value="group">Group Session</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Client Selection for Individual Sessions */}
            {formData.sessionType === 'individual' && (
              <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                <Label htmlFor="client" className={isMobile ? 'text-xs' : ''}>Select Client *</Label>
                <Select onValueChange={(value) => {
                  if (value === "loading" || value === "no-clients") return;
                  const client = availableClients.find(c => c.id === value);
                  setSelectedClient(client);
                }}>
                  <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsLoading ? (
                      <SelectItem value="loading" disabled>Loading clients...</SelectItem>
                    ) : availableClients.length === 0 ? (
                      <SelectItem value="no-clients" disabled>No clients available</SelectItem>
                    ) : (
                      availableClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Group Selection for Group Sessions */}
            {formData.sessionType === 'group' && (
              <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                <Label htmlFor="group" className={isMobile ? 'text-xs' : ''}>Select Group *</Label>
                <Select onValueChange={(value) => {
                  if (value === "loading" || value === "no-groups") return;
                  const group = groups.find(g => g.id === value);
                  setSelectedGroup(group);
                  fetchGroupMembers(value);
                }}>
                  <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupsLoading ? (
                      <SelectItem value="loading" disabled>Loading groups...</SelectItem>
                    ) : groups.length === 0 ? (
                      <SelectItem value="no-groups" disabled>No groups available</SelectItem>
                    ) : (
                      groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} ({group.memberCount} members)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
            <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground break-words`}>Date & Time</h3>
            
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
              <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                <Label className={isMobile ? 'text-xs' : ''}>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      className={cn(
                        `w-full justify-start text-left font-normal ${isMobile ? 'text-xs h-8' : ''}`,
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className={`${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={`w-auto p-0 ${isMobile ? 'mx-2' : ''}`} align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                <div className="flex items-center justify-between">
                  <Label htmlFor="time" className={isMobile ? 'text-xs' : ''}>Time *</Label>
                  {calendarConnected && date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className={isMobile ? 'text-[10px]' : ''}>Synced with Google Calendar</span>
                    </div>
                  )}
                </div>
                <Select onValueChange={(value) => handleInputChange("time", value)} value={formData.time}>
                  <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
                    <SelectValue placeholder={timesLoading ? 'Loading...' : (date ? 'Select time' : 'Pick a date first')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(!date || timesLoading) && (
                      <SelectItem value="placeholder" disabled>
                        {timesLoading ? 'Loading...' : 'Pick a date first'}
                      </SelectItem>
                    )}
                    {date && !timesLoading && availableTimes.length === 0 && (
                      <SelectItem value="no-times" disabled>
                        No available times
                      </SelectItem>
                    )}
                    {date && !timesLoading && availableTimes.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
              <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                <Label htmlFor="duration" className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                  <Clock className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                  Duration (minutes)
                </Label>
                <Select
                  onValueChange={(value) => handleInputChange("duration", value)}
                  value={formData.duration}
                >
                  <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                    <SelectItem value="150">150 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                <Label htmlFor="timezone" className={isMobile ? 'text-xs' : ''}>Timezone</Label>
                <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                  <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Times shown in {getTimezoneOffset(selectedTimezone)}
                </p>
              </div>
            </div>

          </div>

          {/* Settings */}
          <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
            <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground break-words`}>Settings</h3>

            <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
              <Label htmlFor="reminderTime" className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                <Bell className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                Email Reminder
              </Label>
              <Select onValueChange={(value) => handleInputChange("reminderTime", value)} defaultValue="24">
                <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="120">2 hours before</SelectItem>
                  <SelectItem value="24">24 hours before</SelectItem>
                  <SelectItem value="48">48 hours before</SelectItem>
                  <SelectItem value="none">No email reminder</SelectItem>
                </SelectContent>
              </Select>
              <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>
                Note: A popup reminder will always be sent 10 minutes before the session.
              </p>
            </div>
          </div>

          {/* Meeting Type Selection */}
            <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
            <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground break-words`}>Meeting Link</h3>
              
              <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
              {meetingTypes.map((meetingType) => {
                const Icon = meetingType.icon;
                const isConnected = connectionStatus[meetingType.id]?.connected;
                const isSelected = formData.meetingType === meetingType.id;
                
                return (
                  <div 
                    key={meetingType.id}
                    className={cn(
                      `flex items-center justify-between ${isMobile ? 'p-2' : 'p-3'} border rounded-lg cursor-pointer transition-all`,
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                    onClick={() => handleInputChange('meetingType', meetingType.id)}
                  >
                    <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'} flex-1 min-w-0`}>
                      <Icon className={cn(`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} flex-shrink-0`, meetingType.color)} />
                      <div className="flex-1 min-w-0">
                        <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium break-words`}>{meetingType.name}</div>
                        <div className={`${isMobile ? 'text-[10px]' : 'text-sm'} text-muted-foreground break-words`}>{meetingType.description}</div>
                      </div>
                </div>

                    <div className={`flex items-center ${isMobile ? 'gap-1 flex-col' : 'gap-2'}`}>
                      {meetingType.id === 'none' ? (
                        <div className={cn(`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} rounded-full border-2 flex-shrink-0`, isSelected ? "border-primary bg-primary" : "border-gray-300")} />
                      ) : (
                        <>
                          {isConnected ? (
                            <div className={`flex items-center ${isMobile ? 'gap-1 flex-col' : 'gap-1'}`}>
                              <CheckCircle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-green-500 flex-shrink-0`} />
                              <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-green-600 break-words`}>{connectionStatus[meetingType.id]?.email}</span>
                              <div className={`flex ${isMobile ? 'flex-col gap-1' : 'gap-1'}`}>
                                <Button
                                  size={isMobile ? "sm" : "sm"}
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReconnectPlatform(meetingType.id);
                                  }}
                                  disabled={isConnecting}
                                  className={isMobile ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-xs'}
                                >
                                  {isConnecting ? (
                                    <Loader2 className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} animate-spin`} />
                                  ) : (
                                    "Reconnect"
                                  )}
                                </Button>
                                <Button
                                  size={isMobile ? "sm" : "sm"}
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDisconnectPlatform(meetingType.id);
                                  }}
                                  disabled={isConnecting}
                                  className={isMobile ? 'h-5 px-1.5 text-[10px] text-red-600 hover:text-red-700' : 'h-6 px-2 text-xs text-red-600 hover:text-red-700'}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size={isMobile ? "sm" : "sm"}
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConnectPlatform(meetingType.id);
                              }}
                              disabled={isConnecting}
                              className={isMobile ? 'text-xs h-7 px-2' : ''}
                            >
                              {isConnecting ? (
                                <Loader2 className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} animate-spin`} />
                              ) : (
                                "Connect"
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                          </div>
                        );
                      })}
                    </div>

            {formData.meetingType !== 'none' && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                  A meeting link will be automatically created and added to the session.
                        </AlertDescription>
                      </Alert>
                    )}

            {/* Info about reconnecting for new permissions */}
            {formData.meetingType !== 'none' && connectionStatus[formData.meetingType]?.connected && (
                      <Alert className="border-blue-200 bg-blue-50">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-xs text-blue-700">
                  <strong>New Feature:</strong> Email invitations and calendar integration are now available! 
                  Click "Reconnect" to get the latest permissions for enhanced functionality.
                        </AlertDescription>
                      </Alert>
                    )}

            {/* Zoom-specific configuration info */}
            {formData.meetingType === 'zoom' && !connectionStatus[formData.meetingType]?.connected && (
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-xs text-yellow-700">
                  <strong>Zoom App Setup:</strong> To use Zoom integration:
                  <br />1. Create a Zoom app in Zoom Marketplace or Developer Console
                  <br />2. Enable "meeting:write" scope (or let Zoom use default scopes)
                  <br />3. Set redirect URI to: <code>{window.location.origin}/api/integrations/oauth/zoom/callback</code>
                  <br />4. Add ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET to environment variables
                  <br />5. Note: CSP warnings in console are normal and don't affect functionality
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

          {/* Additional Notes */}
          <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
            <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground break-words`}>Additional Information</h3>
            
            <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
              <Label htmlFor="notes" className={isMobile ? 'text-xs' : ''}>Session Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions, topics to cover, materials needed, etc."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={isMobile ? 2 : 3}
                className={isMobile ? 'text-xs min-h-[60px]' : ''}
              />
            </div>

            <div className={`flex items-start gap-2 ${isMobile ? 'p-2' : 'p-3'} bg-accent/10 rounded-lg border border-accent/20`}>
              <AlertCircle className={`${isMobile ? 'h-3 w-3' : 'h-5 w-5'} text-accent mt-0.5 flex-shrink-0`} />
              <div className={isMobile ? 'text-xs' : 'text-sm'}>
                <p className={`font-medium text-accent ${isMobile ? 'text-xs' : ''} break-words`}>Important Reminders:</p>
                <ul className={`${isMobile ? 'mt-0.5 text-[10px]' : 'mt-1 text-sm'} text-muted-foreground list-disc list-inside ${isMobile ? 'space-y-0.5' : 'space-y-1'}`}>
                  <li className="break-words">All group members will be notified about this session</li>
                  <li className="break-words">Session materials should be prepared in advance</li>
                  <li className="break-words">Check room availability and setup requirements</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex ${isMobile ? 'flex-col-reverse gap-2' : 'justify-end gap-3'} ${isMobile ? 'pt-2' : 'pt-4'} border-t`}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={isMobile ? 'w-full text-xs h-8' : ''}
              size={isMobile ? "sm" : "default"}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={`bg-gradient-primary text-[#1A2D4D] hover:shadow-medium ${isMobile ? 'w-full text-xs h-8' : ''}`}
              size={isMobile ? "sm" : "default"}
            >
              <CalendarIcon className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
              {isLoading ? "Scheduling..." : "Schedule Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}