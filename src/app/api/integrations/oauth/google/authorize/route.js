// Google OAuth Integration Flow
// This creates a proper OAuth flow for Google Calendar integration

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';

// GET /api/integrations/oauth/google/authorize - Start Google OAuth flow
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const callbackUrl = searchParams.get('callbackUrl') || '/coach/sessions';

        // Google OAuth 2.0 parameters
        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
        googleAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/integrations/oauth/google/callback`);
        googleAuthUrl.searchParams.set('response_type', 'code');
        googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
        googleAuthUrl.searchParams.set('access_type', 'offline');
        googleAuthUrl.searchParams.set('prompt', 'consent');
        googleAuthUrl.searchParams.set('state', JSON.stringify({
            userId: session.user.id,
            callbackUrl
        }));

        return NextResponse.redirect(googleAuthUrl.toString());
    } catch (error) {
        console.error('Google OAuth authorization error:', error);
        return NextResponse.json(
            { error: 'Failed to start Google OAuth flow' },
            { status: 500 }
        );
    }
}
