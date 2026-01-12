import { sql } from './postgresql';

export async function getClientById(clientId, coachId) {
    try {
        // Fetch client data with user information
        const clientData = await sql`
            SELECT 
                c.id,
                c."userId",
                u.name,
                u.email,
                u.phone,
                u.role,
                u."isActive",
                u."dateofBirth",
                u."address",
                u."coachId",
                u.avatar,
                u."createdAt",
                u."updatedAt",
                c.type,
                c.status,
                c.mood,
                c."lastActive",
                c."referralSource",
                c."primaryConcerns",
                c."groupId",
                -- Get next scheduled session
                (
                    SELECT (s."sessionDate" + s."sessionTime") as "scheduledDate"
                    FROM "Session" s
                    WHERE s."clientId" = c.id 
                    AND s.status = 'scheduled'
                    AND (s."sessionDate" + s."sessionTime") > NOW()
                    ORDER BY (s."sessionDate" + s."sessionTime") ASC
                    LIMIT 1
                ) as "nextSession",
                -- Get group information if client is in a group
                g.name as "groupName",
                g.description as "groupDescription"
            FROM "User" u
            LEFT JOIN "Client" c ON u.id = c."userId"
            LEFT JOIN "Group" g ON c."groupId" = g.id
            WHERE c.id = ${clientId}
            AND u.role = 'client'
            AND u."coachId" = ${coachId}
        `;

        if (clientData.length === 0) {
            return null;
        }

        const client = clientData[0];

        // Fetch client's tasks
        const tasks = await sql`
            SELECT 
                t.id,
                t.title,
                t.description,
                t."dueDate",
                t.status,
                t."taskType",
                t."createdAt"
            FROM "Task" t
            WHERE t."clientId" = ${clientId}
            ORDER BY t."createdAt" DESC
            LIMIT 20
        `;

        // Fetch client's sessions
        const sessions = await sql`
            SELECT 
                s.id,
                s.title,
                s.description,
                s."sessionDate",
                s."sessionTime",
                s.duration,
                s.status,
                s.mood,
                s.notes
            FROM "Session" s
            WHERE s."clientId" = ${clientId}
            ORDER BY s."sessionDate" DESC, s."sessionTime" DESC
            LIMIT 10
        `;

        // Fetch client's group memberships
        const groupMemberships = await sql`
            SELECT 
                g.id,
                g.name,
                g.description,
                g."memberCount",
                g.capacity,
                g.stage,
                g."createdAt" as "joinedDate"
            FROM "Group" g
            WHERE ${clientId} = ANY(g."selectedMembers")
            AND g.stage IN ('ongoing', 'upcoming')
        `;

        // Format the response
        return {
            client: {
                id: client.id,
                userId: client.userId,
                name: client.name,
                email: client.email,
                phone: client.phone,
                role: client.role,
                isActive: client.isActive,
                dateofBirth: client.dateofBirth,
                address: client.address,
                coachId: client.coachId,
                avatar: client.avatar,
                createdAt: client.createdAt,
                updatedAt: client.updatedAt,
                type: client.type,
                status: client.status,
                mood: client.mood,
                lastActive: client.lastActive,
                referralSource: client.referralSource,
                primaryConcerns: client.primaryConcerns,
                groupId: client.groupId,
                groupName: client.groupName,
                groupDescription: client.groupDescription,
                nextSession: client.nextSession
            },
            tasks: tasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                status: task.status,
                taskType: task.taskType,
                createdAt: task.createdAt,
                completed: task.status === 'completed'
            })),
            sessions: sessions.map(session => ({
                id: session.id,
                title: session.title,
                description: session.description,
                sessionDate: session.sessionDate,
                sessionTime: session.sessionTime,
                duration: session.duration,
                status: session.status,
                mood: session.mood,
                notes: session.notes
            })),
            groupMemberships: groupMemberships.map(group => ({
                id: group.id,
                name: group.name,
                description: group.description,
                memberCount: group.memberCount,
                capacity: group.capacity,
                frequency: group.frequency,
                stage: group.stage,
                joinedDate: group.joinedDate
            }))
        };

    } catch (error) {
        console.error('Error in getClientById:', error);
        throw error;
    }
}
