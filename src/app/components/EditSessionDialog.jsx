"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Calendar } from "@/app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/app/lib/utils";

export function EditSessionDialog({ 
  open, 
  onOpenChange, 
  session, 
  onSessionUpdated 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm();

  // Initialize form when session changes
  useEffect(() => {
    if (session && open) {
      // Parse session date and time
      const sessionDate = new Date(session.sessionDate);
      setSelectedDate(sessionDate);
      setSelectedTime(session.sessionTime.substring(0, 5)); // HH:MM format
      
      
      // Set form values
      setValue("title", session.title || "");
      setValue("description", session.description || "");
      setValue("duration", session.duration || 60);
    }
  }, [session, open, setValue]);

  const onSubmit = async (data) => {
    if (!session) return;
    
    setIsLoading(true);
    
    try {
      // Validate required fields
      if (!selectedDate) {
        toast.error("Please select a date");
        return;
      }
      
      if (!selectedTime) {
        toast.error("Please select a time");
        return;
      }
      

      // Prepare session data
      const sessionData = {
        title: data.title,
        description: data.description,
        sessionDate: selectedDate.toISOString(),
        sessionTime: selectedTime + ":00", // Convert to HH:MM:SS format
        duration: parseInt(data.duration)
      };

      // Make API call to update session
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update session');
      }

      // Update calendar integrations and send notifications
      try {
        
        // Refresh tokens automatically if needed
        await refreshTokensIfNeeded();
        
        // Get attendees for the session using original session data
        let attendees = [];
        
        if (session.clientId) {
          // Get client email
          try {
            const clientResponse = await fetch(`/api/clients/${session.clientId}`);
            if (clientResponse.ok) {
              const clientData = await clientResponse.json();
              if (clientData.data?.client?.email) {
                attendees.push(clientData.data.client.email);
              } else {
                console.log('🔍❌ NO CLIENT EMAIL FOUND IN RESPONSE');
              }
            } else {
              console.log('🔍❌ CLIENT API FAILED:', clientResponse.status, clientResponse.statusText);
            }
          } catch (clientError) {
            console.error('🔍❌ ERROR FETCHING CLIENT:', clientError);
          }
        } else if (session.groupId) {
          // Get group member emails
          try {
            const groupResponse = await fetch(`/api/groups/${session.groupId}/members`);
            if (groupResponse.ok) {
              const groupData = await groupResponse.json();
              const groupMembers = groupData.members || [];
              attendees = groupMembers.map(member => member.email).filter(email => email);
            } else {
              console.error('Failed to fetch group members:', groupResponse.status);
            }
          } catch (groupError) {
            console.error('Error fetching group members:', groupError);
          }
        }
        
        // Add coach's email to attendees list
        try {
          const coachResponse = await fetch('/api/user/profile');
          if (coachResponse.ok) {
            const coachData = await coachResponse.json();
            if (coachData.user?.email && !attendees.includes(coachData.user.email)) {
              attendees.push(coachData.user.email);
            }
          }
        } catch (coachError) {
          console.error('Error fetching coach email:', coachError);
        }

        
        const integrationResponse = await fetch(`/api/sessions/${session.id}/update-integrations`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionData: {
              title: sessionData.title,
              description: sessionData.description,
              sessionDate: sessionData.sessionDate,
              sessionTime: sessionData.sessionTime,
              duration: sessionData.duration,
              meetingLink: session.meetingLink, // Use existing meeting link
              location: sessionData.location
            },
            attendees: attendees
          }),
        });

        if (integrationResponse.ok) {
          const integrationResult = await integrationResponse.json();
          
          if (integrationResult.notificationsSent > 0) {
            toast.success(`Session updated successfully! ${integrationResult.notificationsSent} attendee(s) notified and calendar events updated.`);
          } else {
            toast.success("Session updated successfully! Calendar events updated.");
          }
        } else {
          const errorData = await integrationResponse.json();
          console.error('❌ Failed to update integrations:', errorData);
          toast.success("Session updated successfully! (Calendar sync failed)");
        }
      } catch (integrationError) {
        console.error('Error updating integrations:', integrationError);
        toast.success("Session updated successfully! (Calendar sync failed)");
      }

      onSessionUpdated?.();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error(error.message || "Failed to update session");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle automatic token refresh
  const refreshTokensIfNeeded = async () => {
    try {
      
      // Get available integrations
      const integrationsResponse = await fetch('/api/integrations');
      if (!integrationsResponse.ok) {
        return false;
      }
      
      const integrationsData = await integrationsResponse.json();
      const integrations = integrationsData.integrations || [];
      
      if (integrations.length === 0) {
        return false;
      }
      
      // Refresh tokens for each platform
      const refreshPromises = integrations.map(async (integration) => {
        try {
          const refreshResponse = await fetch('/api/integrations/refresh-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              platform: integration.platform
            }),
          });
          
          if (refreshResponse.ok) {
            const result = await refreshResponse.json();
            return { platform: integration.platform, success: true };
          } else {
            const error = await refreshResponse.json();
            console.error(`Failed to refresh ${integration.platform} token:`, error);
            return { platform: integration.platform, success: false, error: error.error };
          }
        } catch (error) {
          console.error(`Error refreshing ${integration.platform} token:`, error);
          return { platform: integration.platform, success: false, error: error.message };
        }
      });
      
      const results = await Promise.all(refreshPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      return successful.length > 0;
      
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      return false;
    }
  };

  const getClientName = (clientId) => {
    return "Client"; // Simplified since we're not showing client selection
  };

  const getGroupName = (groupId) => {
    return "Group"; // Simplified since we're not showing group selection
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Edit Session
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">



          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Session Title</label>
            <Input
              {...register("title", { required: "Title is required" })}
              placeholder="Enter session title"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              {...register("description")}
              placeholder="Enter session description"
              rows={3}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Time</label>
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Duration and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input
                {...register("duration", { 
                  required: "Duration is required",
                  min: { value: 15, message: "Minimum 15 minutes" },
                  max: { value: 480, message: "Maximum 8 hours" }
                })}
                type="number"
                min="15"
                max="480"
                placeholder="60"
              />
              {errors.duration && (
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              )}
            </div>

          </div>





          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Session...
                </>
              ) : (
                "Update Session"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

