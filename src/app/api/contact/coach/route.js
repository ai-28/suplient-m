import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sendClientToCoachEmail } from '@/app/lib/email';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { message, coachEmail, coachName, clientName } = body;

        console.log('Contact coach request data:', {
            message: message ? 'Present' : 'Missing',
            coachEmail: coachEmail || 'Missing',
            coachName: coachName || 'Missing',
            clientName: clientName || 'Missing',
            clientEmail: session.user.email || 'Missing'
        });

        // Validate required fields
        if (!message || !coachEmail || !coachName || !clientName) {
            return NextResponse.json(
                { error: 'Message, coach email, coach name, and client name are required' },
                { status: 400 }
            );
        }

        // Send email to coach
        await sendClientToCoachEmail({
            clientName,
            coachName,
            coachEmail,
            message,
            clientEmail: session.user.email || 'client@example.com'
        });

        return NextResponse.json({
            success: true,
            message: 'Message sent to coach successfully'
        });

    } catch (error) {
        console.error('Error sending message to coach:', error);
        return NextResponse.json(
            { error: 'Failed to send message to coach' },
            { status: 500 }
        );
    }
}
