import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Disable 2FA for user
        await sql`
      UPDATE "User"
      SET 
        "twoFactorSecret" = NULL,
        "twoFactorEnabled" = false,
        "twoFactorBackupCodes" = NULL,
        "twoFactorSetupDate" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `;

        return NextResponse.json({
            success: true,
            message: '2FA disabled successfully'
        });
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        return NextResponse.json(
            { error: 'Failed to disable 2FA' },
            { status: 500 }
        );
    }
}

