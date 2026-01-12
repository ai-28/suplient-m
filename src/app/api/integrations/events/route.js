import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { integrationRepo } from '@/app/lib/db/integrationSchema';

// GET /api/integrations/events - Get integration events for a session
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const platform = searchParams.get('platform');

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        const events = await integrationRepo.getSessionIntegrationEvents(sessionId);

        // Filter by platform if specified
        const filteredEvents = platform
            ? events.filter(event => event.platform === platform)
            : events;

        return NextResponse.json({
            message: 'Integration events fetched successfully',
            events: filteredEvents
        });
    } catch (error) {
        console.error('Get integration events error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch integration events' },
            { status: 500 }
        );
    }
}

// POST /api/integrations/events - Create an integration event
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            sessionId,
            integrationId,
            platformEventId,
            platformMeetingId,
            meetingUrl,
            meetingPassword,
            calendarEventId,
            status = 'active'
        } = body;

        if (!sessionId || !integrationId || !platformEventId) {
            return NextResponse.json(
                { error: 'Session ID, integration ID, and platform event ID are required' },
                { status: 400 }
            );
        }

        const eventData = {
            sessionId,
            integrationId,
            platformEventId,
            platformMeetingId,
            meetingUrl,
            meetingPassword,
            calendarEventId,
            status
        };

        const event = await integrationRepo.createIntegrationEvent(eventData);

        return NextResponse.json({
            message: 'Integration event created successfully',
            event
        });
    } catch (error) {
        console.error('Create integration event error:', error);
        return NextResponse.json(
            { error: 'Failed to create integration event' },
            { status: 500 }
        );
    }
}

// PUT /api/integrations/events - Update an integration event
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            eventId,
            platformEventId,
            platformMeetingId,
            meetingUrl,
            meetingPassword,
            calendarEventId,
            status
        } = body;

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            );
        }

        const updateData = {
            platformEventId,
            platformMeetingId,
            meetingUrl,
            meetingPassword,
            calendarEventId,
            status
        };

        const event = await integrationRepo.updateIntegrationEvent(eventId, updateData);

        if (!event) {
            return NextResponse.json(
                { error: 'Integration event not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Integration event updated successfully',
            event
        });
    } catch (error) {
        console.error('Update integration event error:', error);
        return NextResponse.json(
            { error: 'Failed to update integration event' },
            { status: 500 }
        );
    }
}

// DELETE /api/integrations/events - Delete an integration event
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json(
                { error: 'Event ID is required' },
                { status: 400 }
            );
        }

        const event = await integrationRepo.deleteIntegrationEvent(eventId);

        if (!event) {
            return NextResponse.json(
                { error: 'Integration event not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Integration event deleted successfully',
            event
        });
    } catch (error) {
        console.error('Delete integration event error:', error);
        return NextResponse.json(
            { error: 'Failed to delete integration event' },
            { status: 500 }
        );
    }
}
