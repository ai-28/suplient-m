import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is admin
        if (!session?.user?.id || session?.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, clientIds, coachIds } = await request.json();

        if (!message || !message.trim()) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        if ((!clientIds || clientIds.length === 0) && (!coachIds || coachIds.length === 0)) {
            return NextResponse.json(
                { error: 'At least one recipient is required' },
                { status: 400 }
            );
        }

        const recipientIds = [...(clientIds || []), ...(coachIds || [])];
        let successCount = 0;
        let failCount = 0;

        // Generate a batch ID to group all notifications sent together
        const batchId = crypto.randomUUID();
        const sentAt = new Date().toISOString();

        // Create notifications for all recipients
        for (const userId of recipientIds) {
            try {
                // Check if notifications are enabled for this user
                const userCheck = await sql`
                    SELECT "notificationsEnabled" 
                    FROM "User" 
                    WHERE id = ${userId}
                `;

                // Skip if user doesn't exist or notifications are disabled
                if (userCheck.length === 0) {
                    console.log(`⚠️ User ${userId} not found, skipping admin notification`);
                    failCount++;
                    continue;
                }

                // Check if notifications are enabled (default to true if column doesn't exist yet)
                const notificationsEnabled = userCheck[0].notificationsEnabled !== false;
                if (!notificationsEnabled) {
                    console.log(`🔕 Notifications disabled for user ${userId}, skipping admin notification`);
                    failCount++;
                    continue;
                }

                // Store batch info in data field
                const notificationData = {
                    batchId,
                    sentBy: session.user.id,
                    sentAt,
                    recipientType: clientIds.includes(userId) ? 'client' : 'coach'
                };

                // Insert notification into database and get the actual ID
                const insertedNotification = await sql`
          INSERT INTO "Notification" 
          ("userId", type, title, message, "isRead", priority, data, "createdAt")
          VALUES (
            ${userId},
            'system',
            'Admin Notification',
            ${message.trim()},
            false,
            'high',
            ${JSON.stringify(notificationData)},
            CURRENT_TIMESTAMP
          )
          RETURNING *
        `;

                // Try to send real-time notification if socket is available
                if (insertedNotification.length > 0) {
                    try {
                        if (global.globalSocketIO) {
                            const notification = insertedNotification[0];
                            // Convert notification to proper format for socket emission
                            const socketNotification = {
                                id: notification.id,
                                userId: notification.userId,
                                type: notification.type,
                                title: notification.title,
                                message: notification.message,
                                isRead: notification.isRead,
                                priority: notification.priority,
                                createdAt: notification.createdAt ? new Date(notification.createdAt).toISOString() : new Date().toISOString(),
                                data: notificationData
                            };

                            // Emit to user's notification room
                            global.globalSocketIO.to(`notifications_${userId}`).emit('new_notification', socketNotification);
                            console.log(`✅ Real-time notification sent to user ${userId} with ID: ${notification.id}`);
                        }
                    } catch (socketError) {
                        console.warn(`⚠️ Socket emission failed for user ${userId}, but notification saved:`, socketError.message);
                    }
                }

                successCount++;
            } catch (error) {
                console.error(`❌ Failed to create notification for user ${userId}:`, error);
                failCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Notification sent successfully`,
            recipientCount: successCount,
            failedCount: failCount,
            details: {
                totalRecipients: recipientIds.length,
                sent: successCount,
                failed: failCount,
            }
        });

    } catch (error) {
        console.error('Error sending notifications:', error);
        return NextResponse.json(
            { error: 'Failed to send notifications', details: error.message },
            { status: 500 }
        );
    }
}

