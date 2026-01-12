import { sql } from './postgresql';

export const groupRepo = {
    createGroup,
    getGroupsByCoach,
    getGroupById,
    updateGroup,
    deleteGroup,
};

async function createGroup(groupData) {
    try {
        const {
            name,
            description,
            capacity,
            focusArea,
            coachId,
            selectedMembers = [],
            stage = 'upcoming'
        } = groupData;

        // Create the group with selectedMembers array
        const result = await sql`
            INSERT INTO "Group" (
                name,
                description,
                capacity,
                "focusArea",
                "coachId",
                "selectedMembers",
                "memberCount",
                stage,
                "createdAt",
                "updatedAt"
            )
            VALUES (
                ${name},
                ${description || null},
                ${capacity || null},
                ${focusArea || null},
                ${coachId},
                ${selectedMembers.length > 0 ? selectedMembers : []},
                ${selectedMembers.length},
                ${stage},
                NOW(),
                NOW()
            )
            RETURNING *
        `;

        return result[0];
    } catch (error) {
        console.error("Create group error:", error);
        throw error;
    }
}

async function getGroupsByCoach(coachId) {
    try {
        const result = await sql`
            SELECT *
            FROM "Group"
            WHERE "coachId" = ${coachId}
            ORDER BY "createdAt" DESC
        `;
        return result;
    } catch (error) {
        console.error("Get groups by coach error:", error);
        throw error;
    }
}

async function getGroupById(groupId, coachId) {
    try {
        // Get group basic info
        const groupResult = await sql`
            SELECT *
            FROM "Group"
            WHERE id = ${groupId} AND "coachId" = ${coachId}
        `;

        if (groupResult.length === 0) {
            return null;
        }

        const group = groupResult[0];

        // Get group members with their details
        const membersResult = await sql`
            SELECT 
                c.id,
                c.name,
                c.email,
                c.status,
                c."lastActive",
                c."createdAt" as "joinDate",
                u.name as "userName",
                u.avatar
            FROM "Client" c
            LEFT JOIN "User" u ON c."userId" = u.id
            WHERE c.id = ANY(${group.selectedMembers})
            ORDER BY c."createdAt" ASC
        `;

        // Get sessions for this group
        const sessionsResult = await sql`
            SELECT 
                s.id,
                s.title,
                s.description,
                s."sessionDate",
                s."sessionTime",
                s.duration,
                s.location,
                s.status,
                s.mood,
                s.notes,
                s."createdAt"
            FROM "Session" s
            WHERE s."groupId" = ${groupId}
            ORDER BY s."sessionDate" DESC, s."sessionTime" DESC
        `;
        // Calculate attendance for each member
        const membersWithAttendance = await Promise.all(
            membersResult.map(async (member) => {
                // Get attendance data for this member
                const attendanceResult = await sql`
                    SELECT 
                        COUNT(*) as "totalSessions",
                        COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as "attendedSessions"
                    FROM "Session" s
                    WHERE s."groupId" = ${groupId}
                    AND s."sessionDate" <= NOW()
                `;

                const attendance = attendanceResult[0];
                const attendanceRate = attendance.totalSessions > 0
                    ? Math.round((attendance.attendedSessions / attendance.totalSessions) * 100)
                    : 0;

                // Generate initials from name
                const initials = member.name
                    ? member.name.split(' ').map(n => n[0]).join('').toUpperCase()
                    : 'U';

                return {
                    id: member.id,
                    name: member.name,
                    email: member.email,
                    avatar: member.avatar,
                    initials,
                    status: member.status || 'active',
                    joinDate: member.joinDate,
                    attendance: `${attendanceRate}%`,
                    attendanceRate,
                    lastActive: member.lastActive
                };
            })
        );

        // Get next session
        const nextSessionResult = await sql`
            SELECT 
                s."sessionDate",
                s."sessionTime",
                s.title,
                s.duration,
                s.location
            FROM "Session" s
            WHERE s."groupId" = ${groupId}
            AND s."sessionDate" >= CURRENT_DATE
            AND s.status = 'scheduled'
            ORDER BY s."sessionDate" ASC, s."sessionTime" ASC
            LIMIT 1
        `;

        const nextSession = nextSessionResult.length > 0 ? nextSessionResult[0] : null;

        // Calculate group statistics
        const totalSessions = sessionsResult.length;
        const completedSessions = sessionsResult.filter(s => s.status === 'completed').length;
        return {
            ...group,
            members: membersWithAttendance,
            sessions: sessionsResult,
            nextSession: nextSession ? {
                date: nextSession.sessionDate,
                time: nextSession.sessionTime,
                title: nextSession.title,
                duration: nextSession.duration,
                location: nextSession.location
            } : null,
            totalSessions,
            completedSessions,
            memberCount: membersWithAttendance.length
        };
    } catch (error) {
        console.error("Get group by ID error:", error);
        throw error;
    }
}

async function updateGroup(groupId, updateData) {
    try {
        // Build dynamic SET clause based on provided fields
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        // Helper function to add a field to the SET clause
        const addField = (fieldName, value, dbFieldName = null) => {
            if (value !== undefined) {
                const dbField = dbFieldName || fieldName;
                setClauses.push(`"${dbField}" = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        };

        // Add fields that are provided in updateData
        addField('name', updateData.name);
        addField('description', updateData.description);
        addField('capacity', updateData.capacity);
        addField('focusArea', updateData.focusArea, 'focusArea');
        addField('stage', updateData.stage);
        addField('selectedMembers', updateData.selectedMembers, 'selectedMembers');

        // Calculate member count if selectedMembers is being updated
        if (updateData.selectedMembers !== undefined) {
            addField('memberCount', updateData.selectedMembers.length, 'memberCount');
        }

        // Always update the updatedAt timestamp
        setClauses.push(`"updatedAt" = NOW()`);

        // Add the groupId as the last parameter
        values.push(groupId);

        if (setClauses.length === 1) { // Only updatedAt
            throw new Error('No fields provided for update');
        }

        // Build the dynamic query
        const query = `
            UPDATE "Group" 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await sql.unsafe(query, values);

        return result[0];
    } catch (error) {
        console.error("Update group error:", error);
        throw error;
    }
}

async function deleteGroup(groupId) {
    try {
        const result = await sql`
            DELETE FROM "Group" 
            WHERE id = ${groupId}
            RETURNING *
        `;

        return result[0];
    } catch (error) {
        console.error("Delete group error:", error);
        throw error;
    }
}
