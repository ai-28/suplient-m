import { sql } from './postgresql';

// Notification Database Operations
export const notificationSchema = {
    // Create a new notification
    async createNotification(notificationData) {
        try {
            const {
                userId,
                type,
                title,
                message,
                data = null,
                isRead = false,
                priority = 'normal' // low, normal, high, urgent
            } = notificationData;


            const result = await sql`
                INSERT INTO "Notification" (
                    "userId",
                    type,
                    title,
                    message,
                    data,
                    "isRead",
                    priority
                )
                VALUES (
                    ${userId},
                    ${type},
                    ${title},
                    ${message},
                    ${data ? JSON.stringify(data) : null},
                    ${isRead},
                    ${priority}
                )
                RETURNING *
            `;


            return { success: true, data: result[0] };
        } catch (error) {
            console.error('❌ Error creating notification:', error);
            return { success: false, error: error.message };
        }
    },

    // Get notifications for a user
    async getUserNotifications(userId, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                isRead = null,
                type = null,
                priority = null
            } = options;

            let query = sql`
                SELECT *
                FROM "Notification"
                WHERE "userId" = ${userId}
            `;

            if (isRead !== null) {
                query = sql`
                    ${query}
                    AND "isRead" = ${isRead}
                `;
            }

            if (type) {
                query = sql`
                    ${query}
                    AND type = ${type}
                `;
            }

            if (priority) {
                query = sql`
                    ${query}
                    AND priority = ${priority}
                `;
            }

            query = sql`
                ${query}
                ORDER BY "createdAt" DESC
                LIMIT ${limit} OFFSET ${offset}
            `;

            const result = await query;
            return { success: true, data: result };
        } catch (error) {
            console.error('Error getting user notifications:', error);
            return { success: false, error: error.message };
        }
    },

    // Get notifications for a user with relationship filtering
    async getUserNotificationsWithRelations(userId, userRole, options = {}) {
        try {

            const {
                limit = 50,
                offset = 0,
                isRead = null,
                type = null,
                priority = null
            } = options;

            let query;

            if (userRole === 'coach') {
                // For coaches: only show notifications for their own clients
                query = sql`
                    SELECT n.*
                    FROM "Notification" n
                    WHERE n."userId" = ${userId}
                `;
            } else if (userRole === 'client') {
                // For clients: only show notifications from their coach
                query = sql`
                    SELECT n.*
                    FROM "Notification" n
                    LEFT JOIN "Client" c ON c.id = ${userId}
                    WHERE n."userId" = ${userId}
                    AND (
                        n.type IN ('new_message', 'session_reminder', 'goal_achieved', 'system')
                        AND (
                            n.data->>'coachId' IS NULL 
                            OR (n.data->>'coachId')::uuid = c."coachId"
                        )
                    )
                `;
            } else {
                // For admin or other roles: show all notifications
                query = sql`
                    SELECT *
                    FROM "Notification"
                    WHERE "userId" = ${userId}
                `;
            }

            if (isRead !== null) {
                query = sql`
                    ${query}
                    AND "isRead" = ${isRead}
                `;
            }

            if (type) {
                query = sql`
                    ${query}
                    AND type = ${type}
                `;
            }

            if (priority) {
                query = sql`
                    ${query}
                    AND priority = ${priority}
                `;
            }

            query = sql`
                ${query}
                ORDER BY "createdAt" DESC
                LIMIT ${limit} OFFSET ${offset}
            `;

            const result = await query;
            if (result.length > 0) {
                console.log('🔍 DEBUG: Sample notification:', {
                    id: result[0].id,
                    userId: result[0].userId,
                    type: result[0].type,
                    title: result[0].title,
                    isRead: result[0].isRead
                });
            }
            return { success: true, data: result };
        } catch (error) {
            console.error('Error getting user notifications with relations:', error);
            return { success: false, error: error.message };
        }
    },

    // Mark notification as read
    async markAsRead(notificationId, userId) {
        try {
            const result = await sql`
                UPDATE "Notification"
                SET "isRead" = true, "readAt" = CURRENT_TIMESTAMP
                WHERE id = ${notificationId} AND "userId" = ${userId}
                RETURNING *
            `;

            return { success: true, data: result[0] };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete all notifications for a user
    async markAllAsRead(userId) {
        try {
            const result = await sql`
                DELETE FROM "Notification"
                WHERE "userId" = ${userId}
                RETURNING *
            `;

            return { success: true, data: result };
        } catch (error) {
            console.error('Error deleting all notifications:', error);
            return { success: false, error: error.message };
        }
    },

    // Get unread notification count
    async getUnreadCount(userId) {
        try {
            const result = await sql`
                SELECT COUNT(*) as count
                FROM "Notification"
                WHERE "userId" = ${userId} AND "isRead" = false
            `;

            return { success: true, data: parseInt(result[0].count) };
        } catch (error) {
            console.error('Error getting unread count:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete notification
    async deleteNotification(notificationId, userId) {
        try {
            const result = await sql`
                DELETE FROM "Notification"
                WHERE id = ${notificationId} AND "userId" = ${userId}
                RETURNING *
            `;

            return { success: true, data: result[0] };
        } catch (error) {
            console.error('Error deleting notification:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete old notifications (cleanup)
    async deleteOldNotifications(daysOld = 30) {
        try {
            const result = await sql`
                DELETE FROM "Notification"
                WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
                RETURNING *
            `;

            return { success: true, data: result };
        } catch (error) {
            console.error('Error deleting old notifications:', error);
            return { success: false, error: error.message };
        }
    }
};

// Notification Helper Functions
export const notificationHelpers = {
    // Create notification for client signup
    async createSignupNotification(clientId, coachId, clientName) {
        return await notificationSchema.createNotification({
            userId: coachId,
            type: 'client_signup',
            title: 'New Client Signup',
            message: `${clientName} has signed up and is ready to start their journey!`,
            data: { clientId, clientName },
            priority: 'high'
        });
    },

    // Create notification for task completion
    async createTaskCompletionNotification(clientId, coachId, clientName, taskTitle) {
        return await notificationSchema.createNotification({
            userId: coachId,
            type: 'task_completed',
            title: 'Task Completed',
            message: `${clientName} completed the task: "${taskTitle}"`,
            data: { clientId, clientName, taskTitle },
            priority: 'normal'
        });
    },

    // Create notification for daily check-in
    async createDailyCheckinNotification(clientId, coachId, clientName) {
        return await notificationSchema.createNotification({
            userId: coachId,
            type: 'daily_checkin',
            title: 'Daily Check-in',
            message: `${clientName} completed their daily check-in`,
            data: { clientId, clientName },
            priority: 'normal'
        });
    },

    // Create notification for new message
    async createMessageNotification(senderId, receiverId, senderName, messagePreview) {
        return await notificationSchema.createNotification({
            userId: receiverId,
            type: 'new_message',
            title: 'New Message',
            message: `${senderName}: ${messagePreview}`,
            data: { senderId, senderName, messagePreview },
            priority: 'high'
        });
    },

    // Create notification for session reminder
    async createSessionReminderNotification(userId, sessionTitle, sessionTime) {
        return await notificationSchema.createNotification({
            userId: userId,
            type: 'session_reminder',
            title: 'Session Reminder',
            message: `Your session "${sessionTitle}" is starting in 15 minutes`,
            data: { sessionTitle, sessionTime },
            priority: 'urgent'
        });
    },

    // Create notification for goal achievement
    async createGoalAchievementNotification(clientId, coachId, clientName, goalTitle) {
        return await notificationSchema.createNotification({
            userId: coachId,
            type: 'goal_achieved',
            title: 'Goal Achieved!',
            message: `${clientName} achieved their goal: "${goalTitle}"`,
            data: { clientId, clientName, goalTitle },
            priority: 'high'
        });
    },

    // Create notification for resource sharing
    async createResourceSharedNotification(userId, coachId, coachName, resourceTitle) {
        return await notificationSchema.createNotification({
            userId: userId,
            type: 'system',
            title: 'New Resource Shared',
            message: `${coachName} shared a new resource: "${resourceTitle}"`,
            data: { userId, coachId, coachName, resourceTitle, notificationType: 'resource_shared' },
            priority: 'normal'
        });
    }
};
