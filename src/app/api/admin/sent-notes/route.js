import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is admin
        if (!session?.user?.id || session?.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all admin notifications grouped by batchId (if exists) or by message + timestamp
        const sentNotes = await sql`
            WITH grouped_notes AS (
                SELECT 
                    COALESCE(n.data->>'batchId', 
                        CONCAT(n.message, '_', DATE_TRUNC('second', n."createdAt")::text)
                    ) as "groupKey",
                    n.message,
                    n.data->>'sentBy' as "sentBy",
                    n.data->>'sentAt' as "sentAtData",
                    COUNT(*) as "totalRecipients",
                    COUNT(CASE WHEN n."isRead" = true THEN 1 END) as "readCount",
                    COUNT(CASE WHEN n."isRead" = false THEN 1 END) as "unreadCount",
                    MIN(n."createdAt") as "sentAt",
                    MAX(n."readAt") as "lastReadAt"
                FROM "Notification" n
                WHERE n.type = 'system' 
                    AND n.title = 'Admin Notification'
                    AND (
                        n.data->>'sentBy' = ${session.user.id}
                        OR (n.data->>'sentBy' IS NULL AND n."createdAt" > NOW() - INTERVAL '30 days')
                    )
                GROUP BY 
                    COALESCE(n.data->>'batchId', 
                        CONCAT(n.message, '_', DATE_TRUNC('second', n."createdAt")::text)
                    ),
                    n.message,
                    n.data->>'sentBy',
                    n.data->>'sentAt'
            )
            SELECT * FROM grouped_notes
            ORDER BY "sentAt" DESC
            LIMIT 50
        `;

        // Get recipient details for each group
        const notesWithRecipients = await Promise.all(
            sentNotes.map(async (note) => {
                // Find all notifications in this group
                const notifications = await sql`
                    SELECT n.id, n."userId", n."isRead", n."readAt"
                    FROM "Notification" n
                    WHERE n.type = 'system' 
                        AND n.title = 'Admin Notification'
                        AND (
                            (n.data->>'batchId' = ${note.groupKey})
                            OR (
                                n.data->>'batchId' IS NULL 
                                AND n.message = ${note.message}
                                AND DATE_TRUNC('second', n."createdAt") = DATE_TRUNC('second', ${note.sentAt}::timestamp)
                            )
                        )
                `;

                // Get user details for each notification
                const recipientDetails = await Promise.all(
                    notifications.map(async (notif) => {
                        const user = await sql`
                            SELECT id, name, email, role
                            FROM "User"
                            WHERE id = ${notif.userId}
                        `;
                        return {
                            id: notif.userId,
                            name: user[0]?.name || 'Unknown',
                            email: user[0]?.email || '',
                            role: user[0]?.role || 'unknown',
                            isRead: notif.isRead,
                            readAt: notif.readAt
                        };
                    })
                );

                return {
                    groupKey: note.groupKey,
                    message: note.message,
                    sentBy: note.sentBy,
                    sentAt: note.sentAt,
                    totalRecipients: parseInt(note.totalRecipients),
                    readCount: parseInt(note.readCount),
                    unreadCount: parseInt(note.unreadCount),
                    lastReadAt: note.lastReadAt,
                    recipients: recipientDetails
                };
            })
        );

        return NextResponse.json({
            success: true,
            notes: notesWithRecipients,
            total: notesWithRecipients.length
        });

    } catch (error) {
        console.error('Error fetching sent notes:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sent notes', details: error.message },
            { status: 500 }
        );
    }
}

