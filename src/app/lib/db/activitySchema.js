import { sql } from './postgresql';

// Activity Database Operations
export const activitySchema = {
    // Create a new activity
    async createActivity(activityData) {
        try {
            const {
                userId,
                clientId,
                type,
                title,
                description = null,
                activityData: additionalData = null,
                pointsEarned = 0,
                isVisible = true
            } = activityData || {};

            // Validate required fields and coerce optional ones to safe values
            if (!userId || !type || !title) {
                return { success: false, error: 'Missing required activity fields (userId, type, title)' };
            }

            const safeClientId = clientId ?? null;
            const safeDescription = description ?? null;
            const safeAdditionalData = additionalData ? JSON.stringify(additionalData) : null;
            const safePoints = typeof pointsEarned === 'number' ? pointsEarned : 0;
            const safeIsVisible = typeof isVisible === 'boolean' ? isVisible : true;

            const result = await sql`
        INSERT INTO "Activity" (
          "userId",
          "clientId", 
          type,
          title,
          description,
          "activityData",
          "pointsEarned",
          "isVisible"
        )
        VALUES (
          ${userId},
          ${safeClientId},
          ${type},
          ${title},
          ${safeDescription},
          ${safeAdditionalData},
          ${safePoints},
          ${safeIsVisible}
        )
        RETURNING *
      `;

            return { success: true, data: result[0] };
        } catch (error) {
            console.error('Error creating activity:', error);
            return { success: false, error: error.message };
        }
    },

    // Get activities for a specific user
    async getUserActivities(userId, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                type = null,
                isVisible = true,
                orderBy = 'createdAt',
                orderDirection = 'DESC'
            } = options;

            let query = sql`
        SELECT 
          a.*,
          u.name as "userName",
          c.name as "clientName"
        FROM "Activity" a
        LEFT JOIN "User" u ON a."userId" = u.id
        LEFT JOIN "Client" c ON a."clientId" = c.id
        WHERE a."userId" = ${userId}
      `;

            if (type) {
                query = sql`
          ${query}
          AND a.type = ${type}
        `;
            }

            if (isVisible !== null) {
                query = sql`
          ${query}
          AND a."isVisible" = ${isVisible}
        `;
            }

            query = sql`
        ${query}
        ORDER BY a."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

            const result = await query;
            return { success: true, data: result };
        } catch (error) {
            console.error('Error getting user activities:', error);
            return { success: false, error: error.message };
        }
    },

    // Get activities for all clients of a specific coach
    async getCoachClientActivities(coachId, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                type = null,
                isVisible = true,
                orderBy = 'createdAt',
                orderDirection = 'DESC'
            } = options;

            let query = sql`
        SELECT 
          a.*,
          u.name as "userName",
          c.name as "clientName"
        FROM "Activity" a
        LEFT JOIN "User" u ON a."userId" = u.id
        LEFT JOIN "Client" c ON a."clientId" = c.id
        WHERE c."coachId" = ${coachId}
      `;

            if (type) {
                query = sql`
          ${query}
          AND a.type = ${type}
        `;
            }

            if (isVisible !== null) {
                query = sql`
          ${query}
          AND a."isVisible" = ${isVisible}
        `;
            }

            query = sql`
        ${query}
        ORDER BY a."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

            const result = await query;
            return { success: true, data: result };
        } catch (error) {
            console.error('Error getting coach client activities:', error);
            return { success: false, error: error.message };
        }
    },

    // Get activities for a specific client
    async getClientActivities(clientId, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                type = null,
                isVisible = true,
                orderBy = 'createdAt',
                orderDirection = 'DESC'
            } = options;

            let query = sql`
        SELECT 
          a.*,
          u.name as "userName",
          c.name as "clientName"
        FROM "Activity" a
        LEFT JOIN "User" u ON a."userId" = u.id
        LEFT JOIN "Client" c ON a."clientId" = c.id
        WHERE a."clientId" = ${clientId}
      `;

            if (type) {
                query = sql`
          ${query}
          AND a.type = ${type}
        `;
            }

            if (isVisible !== null) {
                query = sql`
          ${query}
          AND a."isVisible" = ${isVisible}
        `;
            }

            query = sql`
        ${query}
        ORDER BY a."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

            const result = await query;
            return { success: true, data: result };
        } catch (error) {
            console.error('Error getting client activities:', error);
            return { success: false, error: error.message };
        }
    },

    // Get activities by type
    async getActivitiesByType(type, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                isVisible = true,
                orderBy = 'createdAt',
                orderDirection = 'DESC'
            } = options;

            const result = await sql`
        SELECT 
          a.*,
          u.name as "userName",
          c.name as "clientName"
        FROM "Activity" a
        LEFT JOIN "User" u ON a."userId" = u.id
        LEFT JOIN "Client" c ON a."clientId" = c.id
        WHERE a.type = ${type}
        AND a."isVisible" = ${isVisible}
        ORDER BY a."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

            return { success: true, data: result };
        } catch (error) {
            console.error('Error getting activities by type:', error);
            return { success: false, error: error.message };
        }
    },

    // Get activity statistics
    async getActivityStats(userId = null, clientId = null) {
        try {
            let whereClause = '';
            let params = [];

            if (userId) {
                whereClause = 'WHERE a."userId" = $1';
                params.push(userId);
            } else if (clientId) {
                whereClause = 'WHERE a."clientId" = $1';
                params.push(clientId);
            }

            const result = await sql`
        SELECT 
          type,
          COUNT(*) as count,
          SUM("pointsEarned") as total_points,
          AVG("pointsEarned") as avg_points,
          MIN("createdAt") as first_activity,
          MAX("createdAt") as last_activity
        FROM "Activity" a
        ${userId ? sql`WHERE a."userId" = ${userId}` : ''}
        ${clientId ? sql`WHERE a."clientId" = ${clientId}` : ''}
        GROUP BY type
        ORDER BY count DESC
      `;

            return { success: true, data: result };
        } catch (error) {
            console.error('Error getting activity stats:', error);
            return { success: false, error: error.message };
        }
    },

    // Update activity visibility
    async updateActivityVisibility(activityId, isVisible) {
        try {
            const result = await sql`
        UPDATE "Activity"
        SET "isVisible" = ${isVisible}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${activityId}
        RETURNING *
      `;

            if (result.length === 0) {
                return { success: false, error: 'Activity not found' };
            }

            return { success: true, data: result[0] };
        } catch (error) {
            console.error('Error updating activity visibility:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete activity (soft delete by setting isVisible to false)
    async deleteActivity(activityId) {
        try {
            const result = await sql`
        UPDATE "Activity"
        SET "isVisible" = false, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${activityId}
        RETURNING *
      `;

            if (result.length === 0) {
                return { success: false, error: 'Activity not found' };
            }

            return { success: true, data: result[0] };
        } catch (error) {
            console.error('Error deleting activity:', error);
            return { success: false, error: error.message };
        }
    },

    // Get recent activities across all users (for admin/coach dashboard)
    async getRecentActivities(options = {}) {
        try {
            const {
                limit = 100,
                offset = 0,
                type = null,
                isVisible = true,
                orderBy = 'createdAt',
                orderDirection = 'DESC'
            } = options;

            let query = sql`
        SELECT 
          a.*,
          u.name as "userName",
          u.email as "userEmail",
          c.name as "clientName"
        FROM "Activity" a
        LEFT JOIN "User" u ON a."userId" = u.id
        LEFT JOIN "Client" c ON a."clientId" = c.id
        WHERE a."isVisible" = ${isVisible}
      `;

            if (type) {
                query = sql`
          ${query}
          AND a.type = ${type}
        `;
            }

            query = sql`
        ${query}
        ORDER BY a."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

            const result = await query;
            return { success: true, data: result };
        } catch (error) {
            console.error('Error getting recent activities:', error);
            return { success: false, error: error.message };
        }
    }
};

// Helper functions for common activity types
export const activityHelpers = {
    // Helper to fetch user/client names if not provided
    async fetchNames(userId, clientId = null) {
        let userName = null;
        let clientName = null;

        try {
            if (userId) {
                const userResult = await sql`SELECT name FROM "User" WHERE id = ${userId} LIMIT 1`;
                if (userResult.length > 0) {
                    userName = userResult[0].name;
                }
            }

            if (clientId) {
                const clientResult = await sql`SELECT name FROM "Client" WHERE id = ${clientId} LIMIT 1`;
                if (clientResult.length > 0) {
                    clientName = clientResult[0].name;
                }
            }
        } catch (error) {
            console.warn('Error fetching names for activity:', error);
        }

        return { userName, clientName };
    },

    // Create signup activity
    async createSignupActivity(userId, clientId = null, options = {}) {
        const { userName, clientName } = options.nameProvided
            ? { userName: options.userName, clientName: options.clientName }
            : await this.fetchNames(userId, clientId);

        const displayName = userName || clientName || 'User';

        return await activitySchema.createActivity({
            userId,
            clientId,
            type: 'signup',
            title: 'New Account Created',
            description: `${displayName} successfully created their account`,
            pointsEarned: 10,
            activityData: {
                event: 'account_creation',
                timestamp: new Date().toISOString()
            }
        });
    },

    // Create task completion activity
    async createTaskCompletionActivity(userId, clientId, taskData, options = {}) {
        const { userName, clientName } = options.nameProvided
            ? { userName: options.userName, clientName: options.clientName }
            : await this.fetchNames(userId, clientId);

        const displayName = userName || clientName || 'User';

        return await activitySchema.createActivity({
            userId,
            clientId,
            type: 'task_completed',
            title: `Task Completed: ${taskData.title || 'Untitled Task'}`,
            description: taskData.description || `${displayName} completed a task`,
            pointsEarned: taskData.points || 5,
            activityData: {
                taskId: taskData.id,
                taskTitle: taskData.title,
                taskDescription: taskData.description,
                completedAt: new Date().toISOString()
            }
        });
    },

    // Create daily check-in activity
    async createDailyCheckinActivity(userId, clientId, checkinData, options = {}) {
        const { userName, clientName } = options.nameProvided
            ? { userName: options.userName, clientName: options.clientName }
            : await this.fetchNames(userId, clientId);

        const displayName = userName || clientName || 'User';

        return await activitySchema.createActivity({
            userId,
            clientId,
            type: 'daily_checkin',
            title: 'Daily Check-in Completed',
            description: `${displayName} completed their daily check-in`,
            pointsEarned: 3,
            activityData: {
                checkinId: checkinData.id,
                responses: checkinData.responses,
                mood: checkinData.mood,
                completedAt: new Date().toISOString()
            }
        });
    },

    // Create session attendance activity
    async createSessionAttendanceActivity(userId, clientId, sessionData, options = {}) {
        const { userName, clientName } = options.nameProvided
            ? { userName: options.userName, clientName: options.clientName }
            : await this.fetchNames(userId, clientId);

        const displayName = userName || clientName || 'User';

        return await activitySchema.createActivity({
            userId,
            clientId,
            type: 'session_attended',
            title: `Session Attended: ${sessionData.title || 'Session'}`,
            description: `${displayName} attended a coaching session`,
            pointsEarned: 15,
            activityData: {
                sessionId: sessionData.id,
                sessionTitle: sessionData.title,
                sessionType: sessionData.type,
                attendedAt: new Date().toISOString()
            }
        });
    },

    // Create goal achievement activity
    async createGoalAchievementActivity(userId, clientId, goalData, options = {}) {
        const { userName, clientName } = options.nameProvided
            ? { userName: options.userName, clientName: options.clientName }
            : await this.fetchNames(userId, clientId);

        const displayName = userName || clientName || 'User';

        return await activitySchema.createActivity({
            userId,
            clientId,
            type: 'goal_achieved',
            title: `Goal Achieved: ${goalData.title || 'Goal'}`,
            description: `${displayName} achieved a personal goal`,
            pointsEarned: 25,
            activityData: {
                goalId: goalData.id,
                goalTitle: goalData.title,
                goalDescription: goalData.description,
                achievedAt: new Date().toISOString()
            }
        });
    }
};
