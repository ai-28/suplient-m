import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { sendCoachDenialEmail } from '@/app/lib/email';

export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        // Verify admin access
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 401 }
            );
        }

        const { coachId } = params;
        const body = await request.json();
        const { reason } = body || {};

        // Get coach details
        const [coach] = await sql`
            SELECT id, name, email, "approvalStatus"
            FROM "User"
            WHERE id = ${coachId} AND role = 'coach'
        `;

        if (!coach) {
            return NextResponse.json(
                { error: 'Coach not found' },
                { status: 404 }
            );
        }

        // Send denial email first (before deleting)
        try {
            await sendCoachDenialEmail({
                name: coach.name,
                email: coach.email,
                reason: reason || null
            });
            console.log(`✅ Denial email sent to ${coach.email}`);
        } catch (emailError) {
            console.error('Error sending denial email:', emailError);
            // Continue with deletion even if email fails
        }

        // Get clients assigned to this coach before deletion
        const clients = await sql`
            SELECT id FROM "User" WHERE "coachId" = ${coachId} AND role = 'client'
        `;

        // Delete all clients assigned to this coach
        if (clients.length > 0) {
            await sql`
                DELETE FROM "User" 
                WHERE "coachId" = ${coachId} AND role = 'client'
            `;
        }

        // Delete the coach from the database
        await sql`
            DELETE FROM "User" 
            WHERE id = ${coachId} AND role = 'coach'
        `;

        return NextResponse.json({
            success: true,
            message: 'Coach denied and removed successfully',
            deletedClients: clients.length
        });

    } catch (error) {
        console.error('Error denying coach:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

