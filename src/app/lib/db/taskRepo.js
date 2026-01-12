import { sql } from './postgresql';

export const taskRepo = {
    createTask,
    getTasksByCoach,
    getTasksByClientId,
    updateTask,
    deleteTask,
    getTaskById,
    getGroupTasksWithCompletions,
};

async function createTask(taskData) {
    try {
        const {
            title,
            description,
            dueDate,
            taskType,
            coachId,
            clientId,
            groupId,
            isRepetitive,
            repetitiveFrequency,
            repetitiveCount,
            status = 'pending'
        } = taskData;

        const result = await sql`
      INSERT INTO "Task" (
        title, 
        description, 
        "dueDate", 
        "taskType", 
        "coachId", 
        "clientId", 
        "groupId", 
        "isRepetitive", 
        "repetitiveFrequency", 
        "repetitiveCount", 
        status, 
        "createdAt", 
        "updatedAt"
      )
      VALUES (
        ${title}, 
        ${description || null}, 
        ${dueDate || null}, 
        ${taskType}, 
        ${coachId}, 
        ${clientId || null}, 
        ${groupId || null}, 
        ${isRepetitive || false}, 
        ${repetitiveFrequency || null}, 
        ${repetitiveCount || null}, 
        ${status}, 
        NOW(), 
        NOW()
      )
      RETURNING *
    `;

        return result[0];
    } catch (error) {
        console.error("Create task error:", error);
        throw error;
    }
}

async function getTasksByClientId(clientId) {
    try {
        const result = await sql`
            SELECT 
                t.id,
                t.title,
                t.description,
                t."dueDate",
                t.status,
                t."taskType",
                t."isRepetitive",
                t."repetitiveFrequency",
                t."repetitiveCount",
                t."createdAt",
                t."updatedAt",
                tc."completedAt",
                CASE 
                    WHEN tc."completedAt" IS NOT NULL THEN true
                    ELSE false
                END as "isCompleted"
            FROM "Task" t
            LEFT JOIN "TaskCompletion" tc ON t.id = tc."taskId" AND tc."clientId" = ${clientId}
            WHERE (
                t."clientId" = ${clientId} 
                OR (t."groupId" IS NOT NULL AND ${clientId} = ANY(
                    SELECT unnest(g."selectedMembers")
                    FROM "Group" g
                    WHERE g.id = t."groupId"
                ))
            )
            AND t.status != 'deleted'
            ORDER BY 
                CASE WHEN tc."completedAt" IS NULL THEN 0 ELSE 1 END,
                t."dueDate" ASC NULLS LAST,
                t."createdAt" DESC
        `;

        return result;
    } catch (error) {
        console.error("Get tasks by client ID error:", error);
        throw error;
    }
}

async function getTasksByCoach(coachId) {
    try {
        let query = sql`
      SELECT *
      FROM "Task"
      WHERE "coachId" = ${coachId}
    `;

        const result = await query;
        return result;
    } catch (error) {
        console.error("Get tasks by coach error:", error);
        throw error;
    }
}

async function updateTask(taskId, updateData) {
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
        addField('dueDate', updateData.dueDate);
        addField('status', updateData.status);
        addField('isRepetitive', updateData.isRepetitive);
        addField('repetitiveFrequency', updateData.repetitiveFrequency);
        addField('repetitiveCount', updateData.repetitiveCount);

        setClauses.push(`"updatedAt" = NOW()`);
        values.push(taskId);

        if (setClauses.length === 1) { // Only updatedAt
            throw new Error('No fields provided for update');
        }

        const query = `UPDATE "Task" SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await sql.unsafe(query, values);
        return result[0];
    } catch (error) {
        console.error("Update task error:", error);
        throw error;
    }
}

async function deleteTask(taskId) {
    try {
        const result = await sql`
      DELETE FROM "Task" 
      WHERE id = ${taskId}
      RETURNING *
    `;

        return result[0];
    } catch (error) {
        console.error("Delete task error:", error);
        throw error;
    }
}

async function getTaskById(taskId) {
    try {
        const result = await sql`
      SELECT t.*, 
             u.name as "coachName",
             c.name as "clientName",
             g.name as "groupName",
             g."memberCount" as "groupMemberCount"
      FROM "Task" t
      LEFT JOIN "User" u ON t."coachId" = u.id
      LEFT JOIN "User" c ON t."clientId" = c.id
      LEFT JOIN "Group" g ON t."groupId" = g.id
      WHERE t.id = ${taskId}
    `;

        return result[0];
    } catch (error) {
        console.error("Get task by ID error:", error);
        throw error;
    }
}

// Get all group tasks with member completion data (NEW FUNCTION - doesn't affect existing APIs)
async function getGroupTasksWithCompletions(groupId, coachId) {
    try {
        // Get group tasks
        const tasksResult = await sql`
            SELECT 
                t.id,
                t.title,
                t.description,
                t."dueDate",
                t.status,
                t."createdAt",
                t."updatedAt"
            FROM "Task" t
            WHERE t."groupId" = ${groupId}
            AND t."coachId" = ${coachId}
            AND t."taskType" = 'group'
            ORDER BY t."dueDate" ASC, t."createdAt" DESC
        `;
        // Get group members
        const groupResult = await sql`
            SELECT g."selectedMembers"
            FROM "Group" g
            WHERE g.id = ${groupId} AND g."coachId" = ${coachId}
        `;

        if (groupResult.length === 0) {
            return [];
        }

        const memberIds = groupResult[0].selectedMembers || [];

        if (memberIds.length === 0) {
            return tasksResult.map(task => ({
                ...task,
                assignedCount: 0,
                completedCount: 0,
                completions: []
            }));
        }

        // Get member details
        const membersResult = await sql`
            SELECT 
                c.id,
                c.name,
                c.email
            FROM "Client" c
            WHERE c.id = ANY(${memberIds})
            ORDER BY c."createdAt" ASC
        `;

        // Get task completions
        const completionsResult = await sql`
            SELECT 
                tc."taskId",
                tc."clientId",
                tc."completedAt"
            FROM "TaskCompletion" tc
            WHERE tc."taskId" = ANY(${tasksResult.map(t => t.id)})
        `;

        // Transform data to match expected format
        const tasksWithCompletions = tasksResult.map(task => {
            const taskCompletions = completionsResult.filter(c => c.taskId === task.id);

            const completions = membersResult.map(member => {
                const completion = taskCompletions.find(c => c.clientId === member.id);
                const initials = member.name
                    ? member.name.split(' ').map(n => n[0]).join('').toUpperCase()
                    : 'U';

                return {
                    memberId: member.id,
                    memberName: member.name,
                    memberInitials: initials,
                    completed: !!completion,
                    completedAt: completion?.completedAt || null
                };
            });

            const completedCount = completions.filter(c => c.completed).length;

            return {
                id: task.id,
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                assignedCount: membersResult.length,
                completedCount,
                completions
            };
        });

        return tasksWithCompletions;
    } catch (error) {
        console.error("Get group tasks with completions error:", error);
        throw error;
    }
}

