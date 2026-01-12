import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Start a transaction to delete all related data
        await sql.begin(async (sql) => {
            // Delete notifications
            await sql`DELETE FROM "Notification" WHERE "userId" = ${userId}`;

            // Delete activities
            await sql`DELETE FROM "Activity" WHERE "userId" = ${userId}`;

            // Delete conversation participants
            await sql`DELETE FROM "ConversationParticipant" WHERE "userId" = ${userId}`;

            // Delete messages sent by this user
            await sql`DELETE FROM "Message" WHERE "senderId" = ${userId}`;

            // Delete conversations created by this user
            await sql`DELETE FROM "Conversation" WHERE "createdBy" = ${userId}`;

            // Delete client relationships (if user is a coach)
            await sql`DELETE FROM "Client" WHERE "coachId" = ${userId}`;

            // Delete groups created by this user
            await sql`DELETE FROM "Group" WHERE "coachId" = ${userId}`;

            // Delete tasks assigned by this user
            await sql`DELETE FROM "Task" WHERE "coachId" = ${userId}`;

            // Delete sessions created by this user
            await sql`DELETE FROM "Session" WHERE "coachId" = ${userId}`;

            // Finally, delete the user
            await sql`DELETE FROM "User" WHERE id = ${userId}`;
        });

        return NextResponse.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting account:', error);
        return NextResponse.json(
            { error: 'Failed to delete account' },
            { status: 500 }
        );
    }
}
