import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/coach/info?coachId=UUID - Get coach information by ID (public endpoint for payment links)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const coachId = searchParams.get('coachId');

        if (!coachId) {
            return NextResponse.json({ error: 'Coach ID is required' }, { status: 400 });
        }

        // Get coach information
        const coachData = await sql`
            SELECT 
                id,
                name,
                email,
                role
            FROM "User"
            WHERE id = ${coachId} AND role = 'coach' AND "isActive" = true
            LIMIT 1
        `;

        if (coachData.length === 0) {
            return NextResponse.json({ 
                success: false,
                error: 'Coach not found' 
            }, { status: 404 });
        }

        // Check if coach has Connect account set up
        const accountData = await sql`
            SELECT "stripeConnectAccountId", "stripeConnectOnboardingComplete"
            FROM "StripeAccount"
            WHERE "userId" = ${coachId}
            LIMIT 1
        `;

        const coach = {
            id: coachData[0].id,
            name: coachData[0].name,
            email: coachData[0].email,
            hasPaymentAccount: accountData.length > 0 && 
                              accountData[0].stripeConnectAccountId && 
                              accountData[0].stripeConnectOnboardingComplete
        };

        return NextResponse.json({
            success: true,
            coach: coach
        });

    } catch (error) {
        console.error('Error fetching coach info:', error);
        return NextResponse.json(
            { error: 'Failed to fetch coach information', details: error.message },
            { status: 500 }
        );
    }
}

