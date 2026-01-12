import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sessionRepo } from '@/app/lib/db/sessionRepo';

// GET /api/sessions - Get sessions for the logged-in coach
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const coachId = session.user.id;
        const sessions = await sessionRepo.getSessionsByCoach(coachId);

        return NextResponse.json({
            message: 'Sessions fetched successfully',
            sessions
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sessions' },
            { status: 500 }
        );
    }
}

// POST /api/sessions - Create a new session
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            title,
            description,
            sessionDate,
            sessionTime,
            duration,
            sessionType,
            clientId,
            groupId,
            location,
            meetingLink,
            status,
            mood,
            notes,
            timeZone
        } = body;

        // Validate required fields
        if (!title || !sessionDate || !sessionTime || !sessionType) {
            return NextResponse.json(
                { error: 'Title, session date, session time, and session type are required' },
                { status: 400 }
            );
        }

        // Validate session type and related fields
        if (sessionType === 'individual' && !clientId) {
            return NextResponse.json(
                { error: 'Client ID is required for individual sessions' },
                { status: 400 }
            );
        }

        if (sessionType === 'group' && !groupId) {
            return NextResponse.json(
                { error: 'Group ID is required for group sessions' },
                { status: 400 }
            );
        }

        const coachId = session.user.id;

        // Convert submitted local date/time (in provided timeZone) to UTC for storage
        const localWallTimeToUtc = (dateStr, timeHHMM, tz) => {
            try {
                const [y, m, d] = dateStr.split('-').map(Number);
                const [hh, mm] = timeHHMM.substring(0, 5).split(':').map(Number);
                const utcGuess = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0));
                const fmt = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz || 'UTC',
                    hour12: false,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const parts = Object.fromEntries(fmt.formatToParts(utcGuess).map(p => [p.type, p.value]));
                const renderedLocalMs = Date.UTC(
                    Number(parts.year),
                    Number(parts.month) - 1,
                    Number(parts.day),
                    Number(parts.hour),
                    Number(parts.minute)
                );
                const desiredLocalMs = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
                const diff = desiredLocalMs - renderedLocalMs;
                return new Date(utcGuess.getTime() + diff);
            } catch {
                return new Date(`${dateStr}T${timeHHMM}:00Z`);
            }
        };

        const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const utcInstant = localWallTimeToUtc(sessionDate, sessionTime, tz);
        const utcDateStr = utcInstant.toISOString().slice(0, 10);
        const utcTimeStr = utcInstant.toISOString().slice(11, 16);

        const sessionData = {
            title,
            description: description || null,
            sessionDate: new Date(utcDateStr),
            sessionTime: utcTimeStr,
            duration: duration ? parseInt(duration) : 60,
            sessionType,
            coachId,
            clientId: clientId || null,
            groupId: groupId || null,
            location: location || null,
            meetingLink: meetingLink || null,
            status: status || 'scheduled',
            mood: mood || 'neutral',
            notes: notes || null
        };

        // Prevent overlapping sessions for the same coach (server-side guard)
        try {
            // Fetch a wider UTC window to capture possible local day overlaps
            const utcDay = new Date(utcDateStr);
            const startDate = new Date(utcDay);
            startDate.setDate(startDate.getDate() - 1);
            const endDate = new Date(utcDay);
            endDate.setDate(endDate.getDate() + 1);
            const nearbySessions = await sessionRepo.getSessionsByDateRange(coachId, startDate, endDate);

            const toMinutes = (hhmm) => {
                if (!hhmm) return 0;
                const [h, m] = hhmm.substring(0, 5).split(':').map(Number);
                return (h * 60) + (m || 0);
            };

            // Convert stored UTC sessions to the submitted local date/time and compare
            const utcStoredToLocal = (dateStr, timeStr, tzName) => {
                const iso = `${dateStr}T${timeStr}:00Z`;
                const d = new Date(iso);
                const fmt = new Intl.DateTimeFormat('en-CA', {
                    timeZone: tzName || 'UTC',
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', hour12: false
                });
                const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
                return {
                    localDate: `${parts.year}-${parts.month}-${parts.day}`,
                    localTime: `${parts.hour}:${parts.minute}`
                };
            };

            const desiredLocalDate = sessionDate; // original date string selected by coach
            const newStart = toMinutes(sessionTime);
            const newEnd = newStart + (sessionData.duration || 60);

            const conflicts = nearbySessions.filter((s) => {
                const storedDateStr = (s.sessionDate instanceof Date)
                    ? s.sessionDate.toISOString().slice(0, 10)
                    : String(s.sessionDate).slice(0, 10);
                const storedTimeStr = (s.sessionTime || '').substring(0, 5);
                const { localDate, localTime } = utcStoredToLocal(storedDateStr, storedTimeStr, tz);
                if (localDate !== desiredLocalDate) return false;
                const sStart = toMinutes(localTime);
                const sEnd = sStart + (s.duration || 60);
                return (newStart < sEnd) && (newEnd > sStart);
            });

            if (conflicts.length > 0) {
                return NextResponse.json({
                    error: 'Time slot conflicts with existing session(s).',
                    conflicts: conflicts.map(c => ({
                        id: c.id,
                        title: c.title,
                        sessionTime: (c.sessionTime || '').substring(0, 5),
                        duration: c.duration
                    }))
                }, { status: 409 });
            }
        } catch (conflictCheckError) {
            console.warn('Session overlap check failed:', conflictCheckError);
            // Do not block creation on check failure
        }

        const newSession = await sessionRepo.createSession(sessionData);

        return NextResponse.json({
            message: 'Session created successfully',
            session: newSession
        });
    } catch (error) {
        console.error('Create session error:', error);
        return NextResponse.json(
            { error: 'Failed to create session' },
            { status: 500 }
        );
    }
}
