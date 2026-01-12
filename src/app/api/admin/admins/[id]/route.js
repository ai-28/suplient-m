import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import crypto from 'crypto';

// PUT - Update admin user
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is admin
        if (!session?.user?.id || session?.user?.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { name, email, phone, isActive, isSuperAdmin, password, currentPassword } = await request.json();

        // Check if user is updating their own account
        const isUpdatingSelf = id === session.user.id;

        // Validate password if provided
        if (password && password.trim() && password.length < 8) {
            return NextResponse.json(
                { success: false, error: '❌ Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Always verify current password when changing any password (for security)
        if (password && password.trim()) {
            if (!currentPassword) {
                return NextResponse.json(
                    { success: false, error: '❌ Your current password is required to change any password' },
                    { status: 400 }
                );
            }

            // Get the CURRENT USER's password and salt (the one making the change)
            const userAuth = await sql`
                SELECT password, salt FROM "User" WHERE id = ${session.user.id}
            `;

            if (userAuth.length === 0) {
                return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
            }

            const { password: storedPassword, salt } = userAuth[0];

            // Verify current user's password
            const hashPassword = (password, salt) => crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('base64');
            const hashedCurrentPassword = hashPassword(currentPassword, salt);

            if (hashedCurrentPassword !== storedPassword) {
                console.error('Password verification failed for user:', session.user.id);
                return NextResponse.json(
                    { success: false, error: '❌ Your current password is incorrect. Please try again.' },
                    { status: 400 }
                );
            }
        }

        // Get current admin's super admin status
        const currentAdmin = await sql`
      SELECT "isSuperAdmin" FROM "User" WHERE id = ${session.user.id}
    `;

        const isCurrentUserSuperAdmin = currentAdmin[0]?.isSuperAdmin;

        // Get target admin's super admin status
        const targetAdmin = await sql`
      SELECT "isSuperAdmin" FROM "User" WHERE id = ${id} AND role = 'admin'
    `;

        if (targetAdmin.length === 0) {
            return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });
        }

        const isTargetSuperAdmin = targetAdmin[0]?.isSuperAdmin;

        // Regular admins cannot update super admins
        if (!isCurrentUserSuperAdmin && isTargetSuperAdmin) {
            return NextResponse.json(
                { success: false, error: '❌ You do not have permission to update super admins' },
                { status: 403 }
            );
        }

        // Regular admins cannot make someone a super admin
        if (!isCurrentUserSuperAdmin && isSuperAdmin) {
            return NextResponse.json(
                { success: false, error: '❌ You do not have permission to create super admins' },
                { status: 403 }
            );
        }

        // If password is provided, hash it
        let hashedPassword = null;
        let salt = null;
        if (password && password.trim()) {
            const generateSalt = () => crypto.randomBytes(16).toString('hex');
            const hashPassword = (password, salt) => crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('base64');

            salt = generateSalt();
            hashedPassword = hashPassword(password.trim(), salt);
        }

        // Update admin - conditionally update password
        if (hashedPassword && salt) {
            await sql`
        UPDATE "User"
        SET 
          name = ${name},
          email = ${email},
          phone = ${phone || null},
          "isActive" = ${isActive},
          "isSuperAdmin" = ${isSuperAdmin || false},
          password = ${hashedPassword},
          salt = ${salt},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${id} AND role = 'admin'
      `;
        } else {
            await sql`
        UPDATE "User"
        SET 
          name = ${name},
          email = ${email},
          phone = ${phone || null},
          "isActive" = ${isActive},
          "isSuperAdmin" = ${isSuperAdmin || false},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${id} AND role = 'admin'
      `;
        }

        return NextResponse.json({
            success: true,
            message: 'Admin updated successfully'
        });

    } catch (error) {
        console.error('Error updating admin:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update admin' },
            { status: 500 }
        );
    }
}

// DELETE - Delete admin user
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is admin
        if (!session?.user?.id || session?.user?.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Get current admin's super admin status
        const currentAdmin = await sql`
      SELECT "isSuperAdmin" FROM "User" WHERE id = ${session.user.id}
    `;

        const isCurrentUserSuperAdmin = currentAdmin[0]?.isSuperAdmin;

        // Get target admin's super admin status
        const targetAdmin = await sql`
      SELECT "isSuperAdmin" FROM "User" WHERE id = ${id} AND role = 'admin'
    `;

        if (targetAdmin.length === 0) {
            return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });
        }

        const isTargetSuperAdmin = targetAdmin[0]?.isSuperAdmin;

        // Regular admins cannot delete super admins
        if (!isCurrentUserSuperAdmin && isTargetSuperAdmin) {
            return NextResponse.json(
                { success: false, error: '❌ You do not have permission to delete super admins' },
                { status: 403 }
            );
        }

        // Prevent deleting yourself
        if (id === session.user.id) {
            return NextResponse.json(
                { success: false, error: '❌ You cannot delete your own account' },
                { status: 400 }
            );
        }

        // Delete admin
        await sql`
      DELETE FROM "User"
      WHERE id = ${id} AND role = 'admin'
    `;

        return NextResponse.json({
            success: true,
            message: 'Admin deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting admin:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete admin' },
            { status: 500 }
        );
    }
}

