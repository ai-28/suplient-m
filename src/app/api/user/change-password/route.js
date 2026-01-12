import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import crypto from 'crypto';

const HASH_ITERATIONS = 10000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = 'sha512';

function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('base64');
}

export async function POST(request) {
    try {
        console.log('Password change request received');

        const session = await getServerSession(authOptions);
        console.log('Session:', session?.user?.id);

        if (!session?.user?.id) {
            console.log('No session found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Request body:', { currentPassword: !!body.currentPassword, newPassword: !!body.newPassword });

        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            console.log('Missing password fields');
            return NextResponse.json(
                { error: 'Current password and new password are required' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            console.log('Password too short');
            return NextResponse.json(
                { error: 'New password must be at least 6 characters long' },
                { status: 400 }
            );
        }

        // Get current user's password hash and salt from database
        console.log('Fetching user from database...');
        const [user] = await sql`
      SELECT password, salt FROM "User" WHERE id = ${session.user.id}
    `;

        if (!user) {
            console.log('User not found in database');
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        console.log('User found, verifying current password...');
        // Verify current password using PBKDF2
        const inputHash = hashPassword(currentPassword, user.salt);

        if (inputHash !== user.password) {
            console.log('Current password is incorrect');
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 400 }
            );
        }

        console.log('Password verified, hashing new password...');
        // Hash new password using PBKDF2 with existing salt
        const hashedNewPassword = hashPassword(newPassword, user.salt);

        console.log('Updating password in database...');
        // Update password in database
        await sql`
      UPDATE "User" 
      SET password = ${hashedNewPassword}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${session.user.id}
    `;

        console.log('Password updated successfully');
        return NextResponse.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Error updating password:', error);
        return NextResponse.json(
            { error: 'Failed to update password' },
            { status: 500 }
        );
    }
}
