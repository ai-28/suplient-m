// Google OAuth Callback Handler
// This handles the OAuth callback from Google and stores the integration

import { NextResponse } from 'next/server';
import { integrationRepo } from '@/app/lib/db/integrationSchema';

// GET /api/integrations/oauth/google/callback - Handle Google OAuth callback
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            console.error('Google OAuth error:', error);
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/coach/sessions?error=oauth_cancelled`);
        }

        if (!code || !state) {
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/coach/sessions?error=oauth_invalid`);
        }

        const { userId, callbackUrl } = JSON.parse(state);

        // OAuth callback received

        // Exchange authorization code for access token

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/oauth/google/callback`,
            }),
        });


        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Token exchange error:', errorData);
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/coach/sessions?error=token_exchange_failed`);
        }

        const tokenData = await tokenResponse.json();
        const { access_token, refresh_token, expires_in } = tokenData;


        // Get user info from Google

        // Try Google People API first (more reliable)
        let userInfoResponse = await fetch('https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        });

        // If People API fails, try the old userinfo endpoint
        if (!userInfoResponse.ok) {
            userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            });
        }


        if (!userInfoResponse.ok) {
            const errorText = await userInfoResponse.text();
            console.error('Failed to get user info from Google:', {
                status: userInfoResponse.status,
                statusText: userInfoResponse.statusText,
                error: errorText
            });
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/coach/sessions?error=user_info_failed`);
        }


        const userInfo = await userInfoResponse.json();

        // Parse user info based on which API was used
        let platformUserId, platformEmail, platformName;

        if (userInfo.names && userInfo.emailAddresses) {
            // People API response
            platformUserId = userInfo.resourceName?.split('/').pop() || 'unknown';
            platformEmail = userInfo.emailAddresses?.[0]?.value || 'unknown@example.com';
            platformName = userInfo.names?.[0]?.displayName || 'Unknown User';
        } else {
            // Userinfo API response
            platformUserId = userInfo.id || 'unknown';
            platformEmail = userInfo.email || 'unknown@example.com';
            platformName = userInfo.name || 'Unknown User';
        }

        // Store integration in database
        const integrationData = {
            coachId: userId, // This should be a UUID string
            platform: 'google_calendar',
            accessToken: access_token,
            refreshToken: refresh_token,
            tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
            scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            platformUserId: platformUserId,
            platformEmail: platformEmail,
            platformName: platformName,
            settings: {
                calendarId: 'primary',
                timeZone: userInfo.locale || 'UTC'
            }
        };

        await integrationRepo.upsertCoachIntegration(integrationData);

        // Redirect back to the callback URL with success
        return NextResponse.redirect(`${callbackUrl}?google_connected=true`);
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/coach/sessions?error=oauth_callback_failed`);
    }
}
