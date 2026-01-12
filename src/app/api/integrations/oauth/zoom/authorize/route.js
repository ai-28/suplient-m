import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const callbackUrl = searchParams.get('callbackUrl') || '/coach/sessions';

        // Zoom OAuth 2.0 parameters - try standard OAuth first
        const zoomAuthUrl = new URL('https://zoom.us/oauth/authorize');
        zoomAuthUrl.searchParams.set('response_type', 'code');
        zoomAuthUrl.searchParams.set('client_id', process.env.ZOOM_CLIENT_ID);
        zoomAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/integrations/oauth/zoom/callback`);
        // Don't set scope - let Zoom use default scopes
        zoomAuthUrl.searchParams.set('state', JSON.stringify({
            userId: session.user.id,
            callbackUrl
        }));

        return NextResponse.redirect(zoomAuthUrl.toString());
    } catch (error) {
        console.error('Zoom OAuth authorization error:', error);
        return NextResponse.json(
            { error: 'Failed to start Zoom OAuth flow' },
            { status: 500 }
        );
    }
}
