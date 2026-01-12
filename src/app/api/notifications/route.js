import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption.js';
import { notificationSchema } from '@/app/lib/db/notificationSchema';

// GET /api/notifications - Get notifications for the current user
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 50;
        const offset = parseInt(searchParams.get('offset')) || 0;
        const isRead = searchParams.get('isRead');
        const type = searchParams.get('type');
        const priority = searchParams.get('priority');

        const options = {
            limit,
            offset,
            isRead: isRead !== null ? isRead === 'true' : null,
            type,
            priority
        };

        // Use relationship-based filtering
        const result = await notificationSchema.getUserNotificationsWithRelations(
            session.user.id,
            session.user.role,
            options
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Get unread count
        const unreadResult = await notificationSchema.getUnreadCount(session.user.id);
        const unreadCount = unreadResult.success ? unreadResult.data : 0;

        return NextResponse.json({
            notifications: result.data,
            unreadCount,
            total: result.data.length
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/notifications - Create a new notification
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userId, type, title, message, data, priority } = body;

        // Validate required fields
        if (!userId || !type || !title || !message) {
            return NextResponse.json({
                error: 'Missing required fields: userId, type, title, message'
            }, { status: 400 });
        }

        // Validate that userId exists in User table and check notification preference
        const { sql } = await import('@/app/lib/db/postgresql');
        const userCheck = await sql`
            SELECT id, "notificationsEnabled" 
            FROM "User" 
            WHERE id = ${userId} 
            LIMIT 1
        `;

        if (userCheck.length === 0) {
            console.error(`❌ Notification creation failed: User ID ${userId} does not exist in User table`);
            return NextResponse.json({
                error: `User with ID ${userId} does not exist`
            }, { status: 400 });
        }

        // Check if notifications are enabled (default to true if column doesn't exist yet)
        const notificationsEnabled = userCheck[0].notificationsEnabled !== false;
        if (!notificationsEnabled) {
            console.log(`🔕 Notifications disabled for user ${userId}, skipping notification creation`);
            return NextResponse.json({
                success: false,
                message: 'Notifications are disabled for this user',
                notificationSkipped: true
            }, { status: 200 }); // Return 200 to indicate success but notification was skipped
        }

        const notificationData = {
            userId,
            type,
            title,
            message,
            data,
            priority: priority || 'normal'
        };

        const result = await notificationSchema.createNotification(notificationData);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Emit real-time notification via socket
        try {
            if (global.globalSocketIO) {
                const roomName = `notifications_${userId}`;
                global.globalSocketIO.to(roomName).emit('new_notification', result.data);
                console.log(`✅ Real-time notification sent to user ${userId} via socket`);
            } else {
                console.warn('⚠️ Global socket not available, notification saved but not emitted in real-time');
            }
        } catch (socketError) {
            console.warn('⚠️ Socket emission failed, notification saved but not emitted in real-time:', socketError.message);
        }

        return NextResponse.json(result.data);
    } catch (error) {
        console.error('Error creating notification:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
