import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        // Only admins can impersonate (including super admins)
        // Check if user is admin - allow both regular admin role and superAdmin
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify admin role in database (more reliable than session check)
        const adminCheck = await sql`
            SELECT id, role, "isSuperAdmin" 
            FROM "User" 
            WHERE id = ${session.user.id} AND (role = 'admin' OR "isSuperAdmin" = true)
        `;

        if (adminCheck.length === 0) {
            return NextResponse.json(
                { error: 'Unauthorized. Only admins can impersonate users.' },
                { status: 403 }
            );
        }

        // Get the original admin ID (if already impersonating, use original; otherwise use current)
        const originalAdminId = session.user.originalAdminId || session.user.id;

        const { targetUserId } = await request.json();

        if (!targetUserId) {
            return NextResponse.json(
                { error: 'Target user ID is required' },
                { status: 400 }
            );
        }

        // Fetch target user details
        const targetUser = await sql`
            SELECT id, name, email, role, phone, avatar
            FROM "User"
            WHERE id = ${targetUserId}
        `;

        if (targetUser.length === 0) {
            return NextResponse.json(
                { error: 'Target user not found' },
                { status: 404 }
            );
        }

        const user = targetUser[0];

        // Validate target user role (can only impersonate coach or client)
        if (user.role !== 'coach' && user.role !== 'client') {
            return NextResponse.json(
                { error: 'Can only impersonate coaches or clients' },
                { status: 400 }
            );
        }

        // Log impersonation start (for audit trail - could be saved to DB)
        console.log(`[IMPERSONATION] Admin ${originalAdminId} started impersonating ${user.role} ${targetUserId}`);

        // Return success - the session update will happen client-side
        return NextResponse.json({
            success: true,
            message: `Successfully impersonating ${user.name}`,
            targetUser: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Error starting impersonation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        // Only admins can stop impersonation
        if (!session?.user?.id || !session.user.isImpersonating) {
            return NextResponse.json(
                { error: 'Not currently impersonating' },
                { status: 400 }
            );
        }

        const originalAdminId = session.user.originalAdminId;

        if (!originalAdminId) {
            return NextResponse.json(
                { error: 'Original admin ID not found' },
                { status: 400 }
            );
        }

        // Log impersonation end
        console.log(`[IMPERSONATION] Admin ${originalAdminId} stopped impersonating`);

        // Return success - session update will happen client-side
        return NextResponse.json({
            success: true,
            message: 'Stopped impersonation successfully'
        });

    } catch (error) {
        console.error('Error stopping impersonation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

