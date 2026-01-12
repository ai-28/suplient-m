// Integration services for different platforms
export class GoogleCalendarService {
    constructor(integration) {
        this.integration = integration;
        this.accessToken = integration.accessToken;
        this.refreshToken = integration.refreshToken;
        this.tokenExpiresAt = integration.tokenExpiresAt;
    }

    async ensureValidToken() {
        // Check if token is expired or will expire in the next 5 minutes
        const now = new Date();
        const expiresAt = new Date(this.tokenExpiresAt);
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        if (expiresAt <= fiveMinutesFromNow) {
            await this.refreshAccessToken();
        }
    }

    async refreshAccessToken() {
        try {

            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    refresh_token: this.refreshToken,
                    grant_type: 'refresh_token',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Google Calendar token refresh failed:', errorData);

                // If refresh token is invalid, mark integration as inactive
                if (errorData.error === 'invalid_grant') {
                    const { integrationRepo } = await import('@/app/lib/db/integrationSchema');
                    await integrationRepo.deactivateIntegration(this.integration.coachId, 'google_calendar');
                }

                throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error}`);
            }

            const tokenData = await response.json();
            const { access_token, expires_in } = tokenData;


            // Validate token data
            if (!access_token) {
                throw new Error('No access token received from Google Calendar');
            }

            if (!expires_in || typeof expires_in !== 'number' || expires_in <= 0) {
                console.warn('⚠️ Invalid expires_in value:', expires_in, 'using default 3600 seconds');
                expires_in = 3600; // Default to 1 hour
            }

            // Update the integration with new token
            this.accessToken = access_token;
            this.tokenExpiresAt = new Date(Date.now() + expires_in * 1000);


            // Update in database
            const { integrationRepo } = await import('@/app/lib/db/integrationSchema');
            await integrationRepo.updateIntegrationToken(
                this.integration.id,
                this.accessToken,
                this.tokenExpiresAt
            );

            return {
                accessToken: access_token,
                expiresAt: this.tokenExpiresAt,
                tokenType: 'Bearer'
            };
        } catch (error) {
            console.error('❌ Error refreshing Google Calendar token:', error);
            throw error;
        }
    }

    async createEvent(eventData) {
        try {
            await this.ensureValidToken();


            // Format the event data for Google Calendar API
            // Build start/end in the provided time zone rather than coercing to UTC
            const tz = eventData.timeZone || 'UTC';
            const startLocal = `${eventData.sessionDate}T${eventData.sessionTime}:00`;
            const toEndHHMM = (hhmm, addMinutes) => {
                try {
                    const [h, m] = hhmm.split(':').map(Number);
                    const d = new Date(0, 0, 0, h, m || 0);
                    d.setMinutes(d.getMinutes() + addMinutes);
                    const eh = d.getHours().toString().padStart(2, '0');
                    const em = d.getMinutes().toString().padStart(2, '0');
                    return `${eh}:${em}:00`;
                } catch {
                    return hhmm + ':00';
                }
            };
            const endLocal = `${eventData.sessionDate}T${toEndHHMM(eventData.sessionTime, (eventData.duration || 60))}`;

            // Extract reminder time from integration settings
            // Values are stored as strings: "30"=30min, "60"=1hr, "120"=2hr, "24"=24hr, "48"=48hr, "none"=no reminder
            const reminderTimeValue = eventData.integrationSettings?.reminderTime || "24";
            // Map UI values to Google Calendar minutes
            // 30, 60, 120 are minutes; 24 and 48 represent hours; "none" disables email reminder
            const reminderMap = {
                "30": 30,
                "60": 60,
                "120": 120,
                "24": 24 * 60,
                "48": 48 * 60,
                "none": 0,
            };
            const reminderTimeMinutes = reminderMap[reminderTimeValue] ?? 24 * 60;


            // Build description with meeting link if provided
            let description = eventData.description || '';
            if (eventData.meetingLink && eventData.platform !== 'google_calendar') {
                // For Zoom/Teams, add meeting link to description
                description = description ? `${description}\n\nMeeting Link: ${eventData.meetingLink}` : `Meeting Link: ${eventData.meetingLink}`;
            }

            const googleEvent = {
                summary: eventData.title || 'Session',
                description: description,
                start: {
                    dateTime: startLocal,
                    timeZone: tz,
                },
                end: {
                    dateTime: endLocal,
                    timeZone: tz,
                },
                conferenceData: eventData.platform === 'google_calendar' ? {
                    createRequest: {
                        requestId: `meet-${Date.now()}`,
                        conferenceSolutionKey: {
                            type: 'hangoutsMeet'
                        }
                    }
                } : undefined,
                attendees: (eventData.attendees || []).map(email => ({
                    email: email,
                    responseStatus: 'needsAction'
                })),
                reminders: {
                    useDefault: false,
                    overrides: [
                        // Add email reminder only if not "none"
                        ...(reminderTimeMinutes > 0 ? [{ method: 'email', minutes: reminderTimeMinutes }] : []),
                        // Always include 10-minute reminder
                        { method: 'popup', minutes: 10 },
                    ],
                },
                sendUpdates: 'all', // Send invitations to all attendees
                guestsCanInviteOthers: false,
                guestsCanModify: false,
                guestsCanSeeOtherGuests: true
            };


            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(googleEvent),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Google Calendar API error:', errorData);

                // If it's an auth error, try refreshing token once more
                if (response.status === 401) {
                    await this.refreshAccessToken();

                    // Retry the request
                    const retryResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(googleEvent),
                    });

                    if (!retryResponse.ok) {
                        const retryErrorData = await retryResponse.json();
                        console.error('❌ Google Calendar API retry failed:', retryErrorData);
                        return {
                            success: false,
                            error: `Failed to create Google Calendar event: ${retryErrorData.error?.message || 'Unknown error'}`
                        };
                    }

                    const retryResult = await retryResponse.json();

                    // For Google Calendar events, update the description to include the meeting link
                    if (eventData.platform === 'google_calendar' && retryResult.conferenceData?.entryPoints?.[0]?.uri) {
                        const meetingLink = retryResult.conferenceData.entryPoints[0].uri;

                        // Check if description already contains the meeting link to avoid duplicates
                        const hasMeetingLink = description && description.includes(meetingLink);

                        if (!hasMeetingLink) {
                            const updatedDescription = description
                                ? `${description}\n\nMeeting Link: ${meetingLink}`
                                : `Meeting Link: ${meetingLink}`;

                            // Update the event with the meeting link in description
                            try {
                                const updateResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${retryResult.id}?sendUpdates=all`, {
                                    method: 'PATCH',
                                    headers: {
                                        'Authorization': `Bearer ${this.accessToken}`,
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        description: updatedDescription
                                    }),
                                });

                                if (updateResponse.ok) {
                                    const updatedResult = await updateResponse.json();
                                    return this.formatEventResponse(updatedResult);
                                } else {
                                    console.warn('⚠️ Failed to update event description with meeting link, but event was created');
                                }
                            } catch (updateError) {
                                console.warn('⚠️ Error updating event description with meeting link:', updateError);
                            }
                        }
                    }

                    return this.formatEventResponse(retryResult);
                }

                return {
                    success: false,
                    error: `Failed to create Google Calendar event: ${errorData.error?.message || 'Unknown error'}`
                };
            }

            const result = await response.json();

            // For Google Calendar events, update the description to include the meeting link
            if (eventData.platform === 'google_calendar' && result.conferenceData?.entryPoints?.[0]?.uri) {
                const meetingLink = result.conferenceData.entryPoints[0].uri;

                // Check if description already contains the meeting link to avoid duplicates
                const hasMeetingLink = description && description.includes(meetingLink);

                if (!hasMeetingLink) {
                    const updatedDescription = description
                        ? `${description}\n\nMeeting Link: ${meetingLink}`
                        : `Meeting Link: ${meetingLink}`;

                    // Update the event with the meeting link in description
                    try {
                        const updateResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${result.id}?sendUpdates=all`, {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${this.accessToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                description: updatedDescription
                            }),
                        });

                        if (updateResponse.ok) {
                            const updatedResult = await updateResponse.json();
                            return this.formatEventResponse(updatedResult);
                        } else {
                            console.warn('⚠️ Failed to update event description with meeting link, but event was created');
                        }
                    } catch (updateError) {
                        console.warn('⚠️ Error updating event description with meeting link:', updateError);
                    }
                }
            }

            return this.formatEventResponse(result);
        } catch (error) {
            console.error('❌ Error creating Google Calendar event:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    formatEventResponse(googleEvent) {
        return {
            success: true,
            eventId: googleEvent.id,
            meetingLink: googleEvent.conferenceData?.entryPoints?.[0]?.uri || googleEvent.htmlLink,
            eventUrl: googleEvent.htmlLink,
            platform: 'google_calendar',
            data: googleEvent
        };
    }

    async getEventsForDate(date, timeZone = 'UTC') {
        try {
            await this.ensureValidToken();
            
            // Handle date parameter - can be Date object or date string (YYYY-MM-DD)
            let dateObj;
            if (typeof date === 'string') {
                dateObj = new Date(date + 'T00:00:00');
            } else {
                dateObj = new Date(date);
            }
            
            // Get start and end of the day in the specified timezone
            const startOfDay = new Date(dateObj);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(dateObj);
            endOfDay.setHours(23, 59, 59, 999);
            
            // Format for Google Calendar API
            const timeMin = startOfDay.toISOString();
            const timeMax = endOfDay.toISOString();
            
            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
                `timeMin=${encodeURIComponent(timeMin)}&` +
                `timeMax=${encodeURIComponent(timeMax)}&` +
                `singleEvents=true&` +
                `orderBy=startTime`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Failed to fetch calendar events:', errorData);
                return { success: false, events: [], error: errorData };
            }
            
            const data = await response.json();
            const events = (data.items || []).map(event => {
                const start = event.start?.dateTime || event.start?.date;
                const end = event.end?.dateTime || event.end?.date;
                
                return {
                    id: event.id,
                    title: event.summary || 'Untitled Event',
                    start: start,
                    end: end,
                    allDay: !event.start?.dateTime, // All-day events don't have dateTime
                };
            });
            
            return { success: true, events };
        } catch (error) {
            console.error('❌ Error fetching calendar events:', error);
            return { success: false, events: [], error: error.message };
        }
    }

    async updateEvent(eventId, eventData) {
        try {
            await this.ensureValidToken();

            const startDateTime = new Date(`${eventData.sessionDate}T${eventData.sessionTime}:00`);
            const endDateTime = new Date(startDateTime.getTime() + (eventData.duration || 60) * 60 * 1000);

            // Build description with meeting link if provided
            let description = eventData.description || '';
            if (eventData.meetingLink) {
                description = description
                    ? `${description}\n\nMeeting Link: ${eventData.meetingLink}`
                    : `Meeting Link: ${eventData.meetingLink}`;
            }

            const googleEvent = {
                summary: eventData.title || 'Session',
                description: description,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'UTC',
                },
                attendees: (eventData.attendees || []).map(email => ({
                    email: email,
                    responseStatus: 'needsAction'
                })),
                sendUpdates: 'all', // Send updates to all attendees
            };

            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(googleEvent),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Google Calendar update error:', errorData);
                return {
                    success: false,
                    error: `Failed to update Google Calendar event: ${errorData.error?.message || 'Unknown error'}`
                };
            }

            const result = await response.json();

            return {
                success: true,
                eventId: result.id,
                eventUrl: result.htmlLink,
                data: result
            };
        } catch (error) {
            console.error('❌ Error updating Google Calendar event:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async deleteEvent(eventId) {
        try {
            await this.ensureValidToken();


            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Google Calendar delete error:', errorData);
                return {
                    success: false,
                    error: `Failed to delete Google Calendar event: ${errorData.error?.message || 'Unknown error'}`
                };
            }

            return {
                success: true,
                eventId
            };
        } catch (error) {
            console.error('❌ Error deleting Google Calendar event:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async updateEvent(eventData, existingMeetingLink) {
        try {
            await this.ensureValidToken();

            // Validate and format the date/time
            let startDateTime, endDateTime;
            try {
                // Handle different date formats
                if (eventData.sessionDate.includes('T')) {
                    // sessionDate is already a full ISO string, but we need to update the time if sessionTime is provided
                    const baseDate = new Date(eventData.sessionDate);
                    if (eventData.sessionTime) {
                        // Extract time components from sessionTime (HH:MM:SS)
                        const [hours, minutes, seconds] = eventData.sessionTime.split(':').map(Number);
                        baseDate.setHours(hours, minutes, seconds || 0, 0);
                    }
                    startDateTime = baseDate;
                } else {
                    // sessionDate is just a date, combine with sessionTime
                    const dateTimeString = `${eventData.sessionDate}T${eventData.sessionTime}`;
                    startDateTime = new Date(dateTimeString);
                }

                if (isNaN(startDateTime.getTime())) {
                    throw new Error(`Invalid date/time: ${eventData.sessionDate} ${eventData.sessionTime}`);
                }

                endDateTime = new Date(startDateTime.getTime() + (eventData.duration || 60) * 60 * 1000);
            } catch (dateError) {
                console.error('❌ Date parsing error:', dateError);
                throw new Error(`Invalid date/time format: ${eventData.sessionDate} ${eventData.sessionTime}`);
            }

            // Search for events around the session time (wider range to catch the event)
            const timeMin = new Date(startDateTime.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days before
            const timeMax = new Date(endDateTime.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days after

            const searchResponse = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!searchResponse.ok) {
                const errorText = await searchResponse.text();
                throw new Error(`Failed to search for existing events: ${searchResponse.status} ${errorText}`);
            }

            const searchData = await searchResponse.json();
            let eventToUpdate = null;

            // Find the event that contains our meeting link or matches the session title
            for (const event of searchData.items || []) {
                // Try multiple matching strategies
                const hasMeetingLink = event.description && event.description.includes(existingMeetingLink);
                const hasGoogleMeetLink = event.conferenceData?.entryPoints?.some(entry =>
                    entry.uri && entry.uri.includes(existingMeetingLink)
                );
                // Check if the existing meeting link is a Google Calendar event URL and match by event ID
                const isGoogleCalendarEventUrl = existingMeetingLink.includes('google.com/calendar/event');
                const hasMatchingEventId = isGoogleCalendarEventUrl && event.htmlLink &&
                    event.htmlLink.includes(existingMeetingLink.split('eid=')[1]?.split('&')[0]);
                const hasMatchingTitle = event.summary && event.summary.toLowerCase().includes(eventData.title?.toLowerCase());
                const hasSimilarTime = event.start?.dateTime &&
                    Math.abs(new Date(event.start.dateTime).getTime() - startDateTime.getTime()) < 2 * 60 * 60 * 1000; // Within 2 hours

                if (hasMeetingLink || hasGoogleMeetLink || hasMatchingEventId || (hasMatchingTitle && hasSimilarTime)) {
                    eventToUpdate = event;
                    break;
                }
            }

            if (!eventToUpdate) {
                throw new Error('No existing calendar event found to update. Please check if the original meeting was created properly.');
            }

            // Update the existing event
            const updatedEvent = {
                ...eventToUpdate,
                summary: eventData.title || 'Session',
                description: `${eventData.description || ''}\n\nMeeting Link: ${existingMeetingLink}`,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'UTC',
                },
                // Don't update attendees - let Google Calendar handle them automatically
                // This prevents cancellation issues
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 10 },
                        { method: 'email', minutes: 10 }
                    ],
                },
            };

            const updateResponse = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventToUpdate.id}?sendUpdates=all`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedEvent),
                }
            );

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(`Google Calendar event update failed: ${errorData.error?.message || 'Unknown error'}`);
            }

            const updatedEventData = await updateResponse.json();

            return {
                success: true,
                eventId: updatedEventData.id,
                eventUrl: updatedEventData.htmlLink,
                data: updatedEventData
            };
        } catch (error) {
            console.error('❌ Error updating Google Calendar event:', error);
            throw error;
        }
    }
}

export class ZoomService {
    constructor(integration) {
        this.integration = integration;
        this.accessToken = integration.accessToken;
        this.refreshToken = integration.refreshToken;
        this.tokenExpiresAt = integration.tokenExpiresAt;
    }

    async ensureValidToken() {
        // Check if token is expired or will expire in the next 5 minutes
        const now = new Date();
        const expiresAt = new Date(this.tokenExpiresAt);
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        if (expiresAt <= fiveMinutesFromNow) {
            await this.refreshAccessToken();
        }
    }

    async refreshAccessToken() {
        try {

            const response = await fetch('https://zoom.us/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken,
                    client_id: process.env.ZOOM_CLIENT_ID,
                    client_secret: process.env.ZOOM_CLIENT_SECRET,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Zoom token refresh failed:', errorData);

                // If refresh token is invalid, mark integration as inactive
                if (errorData.error === 'invalid_grant') {
                    const { integrationRepo } = await import('@/app/lib/db/integrationSchema');
                    await integrationRepo.deactivateIntegration(this.integration.coachId, 'zoom');
                }

                throw new Error(`Zoom token refresh failed: ${errorData.error_description || errorData.error}`);
            }

            const tokenData = await response.json();
            const { access_token, expires_in } = tokenData;


            // Validate token data
            if (!access_token) {
                throw new Error('No access token received from Zoom');
            }

            if (!expires_in || typeof expires_in !== 'number' || expires_in <= 0) {
                console.warn('⚠️ Invalid expires_in value:', expires_in, 'using default 3600 seconds');
                expires_in = 3600; // Default to 1 hour
            }

            // Update the integration with new token
            this.accessToken = access_token;
            this.tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

            console.log('🔄 Zoom token expires at:', this.tokenExpiresAt.toISOString());

            // Update in database
            const { integrationRepo } = await import('@/app/lib/db/integrationSchema');
            await integrationRepo.updateIntegrationToken(
                this.integration.id,
                this.accessToken,
                this.tokenExpiresAt
            );

            return {
                accessToken: access_token,
                expiresAt: this.tokenExpiresAt,
                tokenType: 'Bearer'
            };
        } catch (error) {
            console.error('❌ Error refreshing Zoom token:', error);
            throw error;
        }
    }

    async createMeeting(meetingData) {
        try {
            await this.ensureValidToken();


            const duration = meetingData.duration || 60;
            const tz = meetingData.timeZone || 'UTC';

            const zoomMeeting = {
                topic: meetingData.title || 'Session',
                type: 2, // Scheduled meeting
                start_time: `${meetingData.sessionDate}T${meetingData.sessionTime}:00`,
                duration: duration,
                timezone: tz,
                agenda: meetingData.description || '',
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false,
                    mute_upon_entry: true,
                    waiting_room: true,
                    auto_recording: 'none',
                    use_pmi: false,
                    enforce_login: false,
                    enforce_login_domains: '',
                    alternative_hosts: '',
                    close_registration: false,
                    show_share_button: true,
                    allow_multiple_devices: true,
                    registrants_confirmation_email: true,
                    waiting_room_settings: {
                        participants_to_place_in_waiting_room: 0,
                        who_can_admit_participants_from_waiting_room: 1
                    }
                },
                // Add attendees if provided
                ...(meetingData.attendees && meetingData.attendees.length > 0 && {
                    registrants: meetingData.attendees.map(email => ({
                        email: email,
                        first_name: email.split('@')[0], // Use email prefix as first name
                        last_name: ''
                    }))
                })
            };

            const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(zoomMeeting),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Zoom API error:', errorData);

                // If it's an auth error, try refreshing token once more
                if (response.status === 401) {
                    console.log('🔄 Auth error, attempting token refresh...');
                    await this.refreshAccessToken();

                    // Retry the request
                    const retryResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(zoomMeeting),
                    });

                    if (!retryResponse.ok) {
                        const retryErrorData = await retryResponse.json();
                        console.error('❌ Zoom API retry failed:', retryErrorData);
                        return {
                            success: false,
                            error: `Failed to create Zoom meeting: ${retryErrorData.message || 'Unknown error'}`
                        };
                    }

                    const retryResult = await retryResponse.json();
                    return this.formatMeetingResponse(retryResult);
                }

                return {
                    success: false,
                    error: `Failed to create Zoom meeting: ${errorData.message || 'Unknown error'}`
                };
            }

            const result = await response.json();

            // Send calendar invitations to attendees (Gmail API not working, so use calendar only)
            if (meetingData.attendees && meetingData.attendees.length > 0) {
                try {
                    const calendarResult = await this.createCalendarEvent({
                        ...meetingData,
                        meetingLink: result.join_url,
                        meetingId: result.id
                    });
                    if (calendarResult.success) {
                    } else {
                        console.log('⚠️ Calendar invitation failed:', calendarResult.error);
                    }
                } catch (inviteError) {
                    console.error('❌ Error sending calendar invitations:', inviteError);
                    // Don't fail the entire operation if invitations fail
                }
            }

            return this.formatMeetingResponse(result);
        } catch (error) {
            console.error('❌ Error creating Zoom meeting:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    formatMeetingResponse(zoomMeeting) {
        return {
            success: true,
            meetingId: zoomMeeting.id,
            meetingLink: zoomMeeting.join_url,
            password: zoomMeeting.password || null,
            platform: 'zoom',
            data: zoomMeeting
        };
    }

    async sendMeetingInvitations(meetingId, attendees, meetingData) {
        try {

            // Get Google Calendar integration for sending emails
            const { integrationRepo } = await import('../db/integrationSchema');
            const googleIntegration = await integrationRepo.getCoachIntegration(meetingData.coachId, 'google_calendar');

            if (!googleIntegration || !googleIntegration.isActive) {
                console.log('⚠️ No Google Calendar integration found, cannot send email invitations');
                return { success: false, error: 'No Google Calendar integration' };
            }

            // Use Gmail API to send invitations
            const startDateTime = new Date(`${meetingData.sessionDate}T${meetingData.sessionTime}:00`);
            const endDateTime = new Date(startDateTime.getTime() + (meetingData.duration || 60) * 60 * 1000);

            const emailSubject = `Meeting Invitation: ${meetingData.title}`;
            const emailBody = `
Hello!

You are invited to a Zoom meeting:

Meeting: ${meetingData.title}
Date: ${startDateTime.toLocaleDateString()}
Time: ${startDateTime.toLocaleTimeString()}
Duration: ${meetingData.duration || 60} minutes

Join Zoom Meeting:
${meetingData.meetingLink}

Meeting ID: ${meetingId}
${meetingData.password ? `Password: ${meetingData.password}` : ''}

${meetingData.description ? `Description: ${meetingData.description}` : ''}

Best regards,
Your Coach
            `.trim();

            // Send email to each attendee
            let emailsSent = 0;
            let emailsFailed = 0;

            for (const attendeeEmail of attendees) {
                try {
                    const emailMessage = {
                        raw: Buffer.from(
                            `To: ${attendeeEmail}\r\n` +
                            `From: ${googleIntegration.platformEmail}\r\n` +
                            `Subject: ${emailSubject}\r\n` +
                            `Content-Type: text/plain; charset="UTF-8"\r\n` +
                            `\r\n` +
                            `${emailBody}`
                        ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                    };

                    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${googleIntegration.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(emailMessage),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error(`❌ Failed to send email to ${attendeeEmail}:`, errorData);
                        emailsFailed++;

                        // Check if it's a Gmail API permission error
                        if (errorData.error && errorData.error.code === 403) {
                            console.log('⚠️ Gmail API not enabled. Calendar invitations will be sent instead.');
                        }
                    } else {
                        console.log(`✅ Email invitation sent to ${attendeeEmail}`);
                        emailsSent++;
                    }
                } catch (emailError) {
                    console.error(`❌ Error sending email to ${attendeeEmail}:`, emailError);
                    emailsFailed++;
                }
            }

            // Report results
            if (emailsSent > 0) {
                console.log(`✅ ${emailsSent} email invitation(s) sent successfully`);
            }
            if (emailsFailed > 0) {
                console.log(`⚠️ ${emailsFailed} email invitation(s) failed (Gmail API not enabled)`);
            }

            return { success: true };
        } catch (error) {
            console.error('❌ Error sending Zoom invitations:', error);
            throw error;
        }
    }

    async createCalendarEvent(meetingData) {
        try {

            // Get Google Calendar integration for the coach
            const { integrationRepo } = await import('../db/integrationSchema');
            const googleIntegration = await integrationRepo.getCoachIntegration(meetingData.coachId, 'google_calendar');

            if (!googleIntegration || !googleIntegration.isActive) {
                return { success: false, error: 'No Google Calendar integration' };
            }

            // Create Google Calendar service instance
            const googleService = new GoogleCalendarService(googleIntegration);

            // Create calendar event with Zoom meeting details
            const calendarEventData = {
                ...meetingData,
                meetingLink: meetingData.meetingLink, // Zoom meeting link
                platform: 'zoom'
            };

            const calendarResult = await googleService.createEvent(calendarEventData);

            if (calendarResult.success) {
                return calendarResult;
            } else {
                console.error('❌ Failed to create calendar event:', calendarResult.error);
                return calendarResult;
            }
        } catch (error) {
            console.error('❌ Error creating calendar event for Zoom meeting:', error);
            return { success: false, error: error.message };
        }
    }

    async updateMeeting(meetingId, meetingData) {
        try {
            await this.ensureValidToken();

            const startDateTime = new Date(`${meetingData.sessionDate}T${meetingData.sessionTime}:00`);
            const duration = meetingData.duration || 60;

            const zoomMeeting = {
                topic: meetingData.title || 'Session',
                start_time: startDateTime.toISOString(),
                duration: duration,
                timezone: 'UTC',
                agenda: meetingData.description || '',
            };

            const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(zoomMeeting),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Zoom update error:', errorData);
                return {
                    success: false,
                    error: `Failed to update Zoom meeting: ${errorData.message || 'Unknown error'}`
                };
            }

            return {
                success: true,
                meetingId: meetingId,
                joinUrl: `https://zoom.us/j/${meetingId}`,
                password: meetingData.password || null,
                data: zoomMeeting
            };
        } catch (error) {
            console.error('❌ Error updating Zoom meeting:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async deleteMeeting(meetingId) {
        try {
            await this.ensureValidToken();

            const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Zoom delete error:', errorData);
                return {
                    success: false,
                    error: `Failed to delete Zoom meeting: ${errorData.message || 'Unknown error'}`
                };
            }

            return {
                success: true,
                meetingId
            };
        } catch (error) {
            console.error('❌ Error deleting Zoom meeting:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async updateMeeting(meetingData, existingMeetingLink) {
        try {
            await this.ensureValidToken();

            // Extract meeting ID from existing meeting link
            let meetingId = null;
            if (existingMeetingLink) {
                // Try multiple patterns for different Zoom link formats
                const patterns = [
                    /\/j\/(\d+)/,           // /j/123456789
                    /meeting\/(\d+)/,       // meeting/123456789
                    /\/j\/(\d+)\?/,         // /j/123456789?pwd=...
                    /meeting\/(\d+)\?/      // meeting/123456789?pwd=...
                ];

                for (const pattern of patterns) {
                    const match = existingMeetingLink.match(pattern);
                    if (match) {
                        meetingId = match[1];
                        break;
                    }
                }

                if (!meetingId) {
                    console.log('❌ No meeting ID found in link:', existingMeetingLink);
                }
            } else {
                console.log('❌ No existing meeting link provided');
            }

            if (!meetingId) {
                return await this.createMeeting(meetingData);
            }

            // Validate and format the date/time
            let startDateTime;
            try {
                // Handle different date formats
                if (meetingData.sessionDate.includes('T')) {
                    // sessionDate is already a full ISO string, but we need to update the time if sessionTime is provided
                    const baseDate = new Date(meetingData.sessionDate);
                    if (meetingData.sessionTime) {
                        // Extract time components from sessionTime (HH:MM:SS)
                        const [hours, minutes, seconds] = meetingData.sessionTime.split(':').map(Number);
                        baseDate.setHours(hours, minutes, seconds || 0, 0);
                    }
                    startDateTime = baseDate;
                } else {
                    // sessionDate is just a date, combine with sessionTime
                    const dateTimeString = `${meetingData.sessionDate}T${meetingData.sessionTime}`;
                    startDateTime = new Date(dateTimeString);
                }

                if (isNaN(startDateTime.getTime())) {
                    throw new Error(`Invalid date/time: ${meetingData.sessionDate} ${meetingData.sessionTime}`);
                }

            } catch (dateError) {
                console.error('❌ Date parsing error:', dateError);
                throw new Error(`Invalid date/time format: ${meetingData.sessionDate} ${meetingData.sessionTime}`);
            }

            const duration = parseInt(meetingData.duration) || 60;

            const updateData = {
                topic: meetingData.title || 'Session',
                type: 2, // Scheduled meeting
                start_time: startDateTime.toISOString().replace('Z', ''), // Remove Z suffix for Zoom API
                duration: duration,
                timezone: 'UTC',
                agenda: meetingData.description || '',
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false,
                    mute_upon_entry: true,
                    waiting_room: true,
                    auto_recording: 'none',
                    enforce_login: false,
                    enforce_login_domains: '',
                    alternative_hosts: '',
                    close_registration: false,
                    show_share_button: true,
                    allow_multiple_devices: true,
                    registrants_confirmation_email: true,
                    waiting_room_settings: {
                        participants_to_place_in_waiting_room: 0,
                        who_can_admit_participants_from_waiting_room: 0,
                        who_can_admit_participants_from_waiting_room: 0
                    }
                }
            };


            const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });


            if (!response.ok) {
                let errorData;
                try {
                    const responseText = await response.text();
                    console.log('❌ Zoom API error response:', responseText);
                    errorData = responseText ? JSON.parse(responseText) : { message: 'Unknown error' };
                } catch (parseError) {
                    console.error('❌ Failed to parse Zoom error response:', parseError);
                    errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
                }
                console.error('❌ Zoom meeting update failed:', errorData);
                throw new Error(`Zoom meeting update failed: ${errorData.message || 'Unknown error'}`);
            }

            let result;
            try {
                const responseText = await response.text();
                result = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
                console.error('❌ Failed to parse Zoom success response:', parseError);
                throw new Error('Failed to parse Zoom API response');
            }

            // Update Google Calendar event with new meeting details
            try {
                // Get Google Calendar integration for the coach
                const { integrationRepo } = await import('../db/integrationSchema');
                const googleIntegration = await integrationRepo.getCoachIntegration(meetingData.coachId, 'google_calendar');

                if (!googleIntegration || !googleIntegration.isActive) {
                } else {
                    // Create Google Calendar service instance
                    const googleService = new GoogleCalendarService(googleIntegration);

                    // Update the existing calendar event
                    const calendarResult = await googleService.updateEvent({
                        ...meetingData,
                        meetingLink: result.join_url || existingMeetingLink,
                        meetingId: meetingId
                    }, existingMeetingLink);

                    if (calendarResult.success) {
                        console.log('✅ Google Calendar event updated successfully');
                    } else {
                        console.log('⚠️ Google Calendar update failed:', calendarResult.error);
                    }
                }
            } catch (calendarError) {
                console.error('❌ Error updating calendar event:', calendarError);
            }

            return {
                success: true,
                meetingId: meetingId,
                meetingLink: result.join_url || existingMeetingLink,
                password: result.password,
                data: result
            };
        } catch (error) {
            console.error('❌ Error updating Zoom meeting:', error);
            throw error;
        }
    }
}

export class TeamsService {
    constructor(integration) {
        this.integration = integration;
        this.accessToken = integration.accessToken;
        this.refreshToken = integration.refreshToken;
        this.tokenExpiresAt = integration.tokenExpiresAt;
    }

    async ensureValidToken() {
        // Check if token is expired or will expire in the next 5 minutes
        const now = new Date();
        const expiresAt = new Date(this.tokenExpiresAt);
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        if (expiresAt <= fiveMinutesFromNow) {
            await this.refreshAccessToken();
        }
    }

    async refreshAccessToken() {
        try {

            const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: process.env.MICROSOFT_CLIENT_ID,
                    client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                    refresh_token: this.refreshToken,
                    grant_type: 'refresh_token',
                    scope: 'https://graph.microsoft.com/OnlineMeetings.ReadWrite'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Teams token refresh failed:', errorData);
                throw new Error(`Teams token refresh failed: ${errorData.error_description || errorData.error}`);
            }

            const tokenData = await response.json();
            const { access_token, expires_in } = tokenData;

            // Validate token data
            if (!access_token) {
                throw new Error('No access token received from Teams');
            }

            if (!expires_in || typeof expires_in !== 'number' || expires_in <= 0) {
                console.warn('⚠️ Invalid expires_in value:', expires_in, 'using default 3600 seconds');
                expires_in = 3600; // Default to 1 hour
            }

            // Update the integration with new token
            this.accessToken = access_token;
            this.tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

            // Update in database
            const { integrationRepo } = await import('@/app/lib/db/integrationSchema');
            await integrationRepo.updateIntegrationToken(
                this.integration.id,
                this.accessToken,
                this.tokenExpiresAt
            );

            return {
                accessToken: access_token,
                expiresAt: this.tokenExpiresAt,
                tokenType: 'Bearer'
            };
        } catch (error) {
            console.error('❌ Error refreshing Teams token:', error);
            throw error;
        }
    }

    async createMeeting(meetingData) {
        try {
            await this.ensureValidToken();


            const startDateTime = new Date(`${meetingData.sessionDate}T${meetingData.sessionTime}:00`);
            const endDateTime = new Date(startDateTime.getTime() + (meetingData.duration || 60) * 60 * 1000);

            const teamsMeeting = {
                subject: meetingData.title || 'Session',
                startDateTime: startDateTime.toISOString(),
                endDateTime: endDateTime.toISOString(),
                isOnlineMeeting: true,
                onlineMeetingProvider: 'teamsForBusiness',
                // Add attendees if provided
                ...(meetingData.attendees && meetingData.attendees.length > 0 && {
                    attendees: meetingData.attendees.map(email => ({
                        emailAddress: {
                            address: email,
                            name: email.split('@')[0] // Use email prefix as name
                        },
                        type: 'required'
                    }))
                })
            };

            const response = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(teamsMeeting),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Teams API error:', errorData);

                // If it's an auth error, try refreshing token once more
                if (response.status === 401) {
                    await this.refreshAccessToken();

                    // Retry the request
                    const retryResponse = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(teamsMeeting),
                    });

                    if (!retryResponse.ok) {
                        const retryErrorData = await retryResponse.json();
                        console.error('❌ Teams API retry failed:', retryErrorData);
                        return {
                            success: false,
                            error: `Failed to create Teams meeting: ${retryErrorData.error?.message || 'Unknown error'}`
                        };
                    }

                    const retryResult = await retryResponse.json();
                    return this.formatMeetingResponse(retryResult);
                }

                return {
                    success: false,
                    error: `Failed to create Teams meeting: ${errorData.error?.message || 'Unknown error'}`
                };
            }

            const result = await response.json();

            // Send email invitations to attendees
            if (meetingData.attendees && meetingData.attendees.length > 0) {
                try {
                    await this.sendMeetingInvitations(result.id, meetingData.attendees, meetingData);
                } catch (inviteError) {
                    console.error('❌ Error sending Teams invitations:', inviteError);
                    // Don't fail the entire operation if invitations fail
                }
            }

            // Calendar invitations are already sent via sendMeetingInvitations
            // No need to create another calendar event here

            return this.formatMeetingResponse(result);
        } catch (error) {
            console.error('❌ Error creating Teams meeting:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    formatMeetingResponse(teamsMeeting) {
        return {
            success: true,
            meetingId: teamsMeeting.id,
            meetingLink: teamsMeeting.joinWebUrl,
            conferenceId: teamsMeeting.conferenceId,
            platform: 'teams',
            data: teamsMeeting
        };
    }

    async sendMeetingInvitations(meetingId, attendees, meetingData) {
        try {

            // Teams automatically sends invitations when attendees are included in the meeting creation
            // But we can also send additional invitations via the calendar event
            return { success: true };
        } catch (error) {
            console.error('❌ Error sending Teams invitations:', error);
            throw error;
        }
    }

    async createCalendarEvent(meetingData) {
        try {

            // Get Google Calendar integration for the coach
            const { integrationRepo } = await import('../db/integrationSchema');
            const googleIntegration = await integrationRepo.getCoachIntegration(meetingData.coachId, 'google_calendar');

            if (!googleIntegration || !googleIntegration.isActive) {
                return { success: false, error: 'No Google Calendar integration' };
            }

            // Create Google Calendar service instance
            const googleService = new GoogleCalendarService(googleIntegration);

            // Create calendar event with Teams meeting details
            const calendarEventData = {
                ...meetingData,
                meetingLink: meetingData.meetingLink, // Teams meeting link
                platform: 'teams'
            };

            const calendarResult = await googleService.createEvent(calendarEventData);

            if (calendarResult.success) {
                return calendarResult;
            } else {
                console.error('❌ Failed to create calendar event:', calendarResult.error);
                return calendarResult;
            }
        } catch (error) {
            console.error('❌ Error creating calendar event for Teams meeting:', error);
            return { success: false, error: error.message };
        }
    }

    async updateMeeting(meetingId, meetingData) {
        try {
            await this.ensureValidToken();

            const startDateTime = new Date(`${meetingData.sessionDate}T${meetingData.sessionTime}:00`);
            const endDateTime = new Date(startDateTime.getTime() + (meetingData.duration || 60) * 60 * 1000);

            const teamsMeeting = {
                subject: meetingData.title || 'Session',
                startDateTime: startDateTime.toISOString(),
                endDateTime: endDateTime.toISOString(),
            };

            const response = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(teamsMeeting),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Teams update error:', errorData);
                return {
                    success: false,
                    error: `Failed to update Teams meeting: ${errorData.error?.message || 'Unknown error'}`
                };
            }

            const result = await response.json();

            return {
                success: true,
                meetingId: result.id,
                joinUrl: result.joinWebUrl,
                conferenceId: result.conferenceId,
                data: result
            };
        } catch (error) {
            console.error('❌ Error updating Teams meeting:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async deleteMeeting(meetingId) {
        try {
            await this.ensureValidToken();

            const response = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Teams delete error:', errorData);
                return {
                    success: false,
                    error: `Failed to delete Teams meeting: ${errorData.error?.message || 'Unknown error'}`
                };
            }

            return {
                success: true,
                meetingId
            };
        } catch (error) {
            console.error('❌ Error deleting Teams meeting:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async updateMeeting(meetingData, existingMeetingLink) {
        try {

            await this.ensureValidToken();

            // Extract meeting ID from existing meeting link
            // Teams meeting links typically contain the meeting ID
            let meetingId = null;
            if (existingMeetingLink) {
                const match = existingMeetingLink.match(/\/meetup-join\/([^\/]+)/);
                if (match) {
                    meetingId = match[1];
                }
            }

            if (!meetingId) {
                return await this.createMeeting(meetingData);
            }

            // Validate and format the date/time
            let startDateTime, endDateTime;
            try {
                // Handle different date formats
                if (meetingData.sessionDate.includes('T')) {
                    // sessionDate is already a full ISO string, use it directly
                    startDateTime = new Date(meetingData.sessionDate);
                } else {
                    // sessionDate is just a date, combine with sessionTime
                    const dateTimeString = `${meetingData.sessionDate}T${meetingData.sessionTime}`;
                    startDateTime = new Date(dateTimeString);
                }

                if (isNaN(startDateTime.getTime())) {
                    throw new Error(`Invalid date/time: ${meetingData.sessionDate} ${meetingData.sessionTime}`);
                }

                endDateTime = new Date(startDateTime.getTime() + (meetingData.duration || 60) * 60 * 1000);
            } catch (dateError) {
                console.error('❌ Date parsing error:', dateError);
                throw new Error(`Invalid date/time format: ${meetingData.sessionDate} ${meetingData.sessionTime}`);
            }

            const updateData = {
                subject: meetingData.title || 'Session',
                startDateTime: startDateTime.toISOString(),
                endDateTime: endDateTime.toISOString(),
                participants: {
                    attendees: meetingData.attendees?.map(email => ({
                        identity: {
                            user: {
                                id: email
                            }
                        }
                    })) || []
                }
            };


            const response = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Teams meeting update failed:', errorData);
                throw new Error(`Teams meeting update failed: ${errorData.error?.message || 'Unknown error'}`);
            }

            const result = await response.json();

            // Send updated invitations
            if (meetingData.attendees && meetingData.attendees.length > 0) {
                try {
                    await this.sendMeetingInvitations(meetingId, meetingData.attendees, meetingData);
                } catch (invitationError) {
                    console.error('❌ Failed to send updated invitations:', invitationError);
                }
            }

            return {
                success: true,
                meetingId: meetingId,
                meetingLink: result.joinWebUrl || existingMeetingLink,
                data: result
            };
        } catch (error) {
            console.error('❌ Error updating Teams meeting:', error);
            throw error;
        }
    }
}

// Utility function to get the appropriate service based on platform
export function getIntegrationService(platform, integration) {
    switch (platform) {
        case 'google_calendar':
            return new GoogleCalendarService(integration);
        case 'zoom':
            return new ZoomService(integration);
        case 'teams':
            return new TeamsService(integration);
        default:
            throw new Error(`Unsupported integration platform: ${platform}`);
    }
}

