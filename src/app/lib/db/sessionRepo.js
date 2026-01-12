import { sql } from './postgresql';

export const sessionRepo = {
    // Create a new session
    async createSession(sessionData) {
        try {
            const {
                title,
                description,
                sessionDate,
                sessionTime,
                duration,
                sessionType,
                coachId,
                clientId,
                groupId,
                location,
                meetingLink,
                status = 'scheduled',
                mood = 'neutral',
                notes
            } = sessionData;

            const result = await sql`
                INSERT INTO "Session" (
                    title, description, "sessionDate", "sessionTime", duration, "sessionType", 
                    "coachId", "clientId", "groupId", location, "meetingLink", status, mood, notes,
                    "createdAt", "updatedAt"
                )
                VALUES (
                    ${title}, ${description || null}, ${sessionDate}, ${sessionTime}, ${duration || 60}, 
                    ${sessionType}, ${coachId}, ${clientId || null}, ${groupId || null}, 
                    ${location || null}, ${meetingLink || null}, ${status}, ${mood}, ${notes || null},
                    NOW(), NOW()
                )
                RETURNING *
            `;
            return result[0];
        } catch (error) {
            console.error("Create session error:", error);
            throw error;
        }
    },

    // Get session by ID
    async getSessionById(sessionId) {
        try {
            const result = await sql`
                SELECT s.*, 
                       u1.name as "clientName",
                       u1.avatar as "clientAvatar",
                       g.name as "groupName"
                FROM "Session" s
                LEFT JOIN "Client" c ON s."clientId" = c.id
                LEFT JOIN "User" u1 ON c."userId" = u1.id
                LEFT JOIN "Group" g ON s."groupId" = g.id
                WHERE s.id = ${sessionId}
            `;
            return result[0] || null;
        } catch (error) {
            console.error("Get session by ID error:", error);
            throw error;
        }
    },

    // Get sessions by coach ID
    async getSessionsByCoach(coachId) {
        try {
            const result = await sql`
                SELECT s.*, 
                       u1.name as "clientName",
                       u1.avatar as "clientAvatar",
                       g.name as "groupName"
                FROM "Session" s
                LEFT JOIN "Client" c ON s."clientId" = c.id
                LEFT JOIN "User" u1 ON c."userId" = u1.id
                LEFT JOIN "Group" g ON s."groupId" = g.id
                WHERE s."coachId" = ${coachId}
                ORDER BY s."sessionDate" DESC, s."sessionTime" DESC
            `;
            return result;
        } catch (error) {
            console.error("Get sessions by coach error:", error);
            throw error;
        }
    },

    // Get upcoming sessions by coach ID
    async getUpcomingSessionsByCoach(coachId) {
        try {
            const result = await sql`
                SELECT s.*, 
                       u1.name as "clientName",
                       u1.avatar as "clientAvatar",
                       g.name as "groupName"
                FROM "Session" s
                LEFT JOIN "Client" c ON s."clientId" = c.id
                LEFT JOIN "User" u1 ON c."userId" = u1.id
                LEFT JOIN "Group" g ON s."groupId" = g.id
                WHERE s."coachId" = ${coachId}
                  AND s."sessionDate" >= CURRENT_DATE
                  AND s.status IN ('scheduled', 'in_progress')
                ORDER BY s."sessionDate" ASC, s."sessionTime" ASC
            `;
            return result;
        } catch (error) {
            console.error("Get upcoming sessions by coach error:", error);
            throw error;
        }
    },

    // Update session
    async updateSession(sessionId, updateData) {
        try {
            const setClauses = [];
            const values = [];
            let paramIndex = 1;

            const addField = (fieldName, value, dbFieldName = null) => {
                if (value !== undefined) {
                    const dbField = dbFieldName || fieldName;
                    setClauses.push(`"${dbField}" = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            };

            addField('title', updateData.title);
            addField('description', updateData.description);
            addField('sessionDate', updateData.sessionDate);
            addField('sessionTime', updateData.sessionTime);
            addField('duration', updateData.duration);
            addField('sessionType', updateData.sessionType);
            addField('clientId', updateData.clientId);
            addField('groupId', updateData.groupId);
            addField('location', updateData.location);
            addField('meetingLink', updateData.meetingLink);
            addField('status', updateData.status);
            addField('mood', updateData.mood);
            addField('notes', updateData.notes);

            setClauses.push(`"updatedAt" = NOW()`);
            values.push(sessionId);

            if (setClauses.length === 1) { // Only updatedAt
                throw new Error('No fields provided for update');
            }

            const query = `UPDATE "Session" SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
            const result = await sql.unsafe(query, values);
            return result[0];
        } catch (error) {
            console.error("Update session error:", error);
            throw error;
        }
    },

    // Delete session
    async deleteSession(sessionId) {
        try {
            const result = await sql`
                DELETE FROM "Session" 
                WHERE id = ${sessionId}
                RETURNING *
            `;
            return result[0];
        } catch (error) {
            console.error("Delete session error:", error);
            throw error;
        }
    },

    // Get sessions by date range
    async getSessionsByDateRange(coachId, startDate, endDate) {
        try {
            const result = await sql`
                SELECT s.*, 
                       u1.name as "clientName",
                       u1.avatar as "clientAvatar",
                       g.name as "groupName"
                FROM "Session" s
                LEFT JOIN "Client" c ON s."clientId" = c.id
                LEFT JOIN "User" u1 ON c."userId" = u1.id
                LEFT JOIN "Group" g ON s."groupId" = g.id
                WHERE s."coachId" = ${coachId}
                  AND s."sessionDate" >= ${startDate}
                  AND s."sessionDate" <= ${endDate}
                ORDER BY s."sessionDate" ASC, s."sessionTime" ASC
            `;
            return result;
        } catch (error) {
            console.error("Get sessions by date range error:", error);
            throw error;
        }
    }
};
