import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { sendCoachApprovalEmail } from '@/app/lib/email';
import { initializeDefaultPipelines } from '@/app/lib/db/pipelineRepo';

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

        // Get coach details
        const [coach] = await sql`
            SELECT id, name, email, "approvalStatus", "isActive"
            FROM "User"
            WHERE id = ${coachId} AND role = 'coach'
        `;

        if (!coach) {
            return NextResponse.json(
                { error: 'Coach not found' },
                { status: 404 }
            );
        }

        if (coach.approvalStatus === 'approved') {
            return NextResponse.json(
                { error: 'Coach is already approved' },
                { status: 400 }
            );
        }

        // Approve coach
        await sql`
            UPDATE "User"
            SET 
                "approvalStatus" = 'approved',
                "isActive" = true,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = ${coachId}
        `;

        // Initialize default pipeline stages for the approved coach
        try {
            await initializeDefaultPipelines(coachId);
        } catch (pipelineError) {
            console.error('❌ Error initializing default pipelines:', pipelineError);
            // Don't fail approval if pipeline init fails
        }

        // Send approval email
        try {
            await sendCoachApprovalEmail({
                name: coach.name,
                email: coach.email,
                tempPassword: null // Coach already has their password
            });
            console.log(`✅ Approval email sent to ${coach.email}`);
        } catch (emailError) {
            console.error('Error sending approval email:', emailError);
            // Don't fail the approval if email fails
        }

        return NextResponse.json({
            success: true,
            message: 'Coach approved successfully'
        });

    } catch (error) {
        console.error('Error approving coach:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

