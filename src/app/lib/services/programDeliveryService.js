import { sql } from '@/app/lib/db/postgresql';
import { chatRepo } from '@/app/lib/db/chatSchema';
import { taskRepo } from '@/app/lib/db/taskRepo';

/**
 * Calculate program day from start date (date-based, not time-based)
 * @param {Date|string} startDate - Program start date
 * @param {Date} targetDate - Target date (defaults to today)
 * @returns {number} Program day (1, 2, 3, etc.)
 */
export function calculateProgramDay(startDate, targetDate = new Date()) {
    const start = new Date(startDate);
    const target = new Date(targetDate);

    // Reset to midnight UTC for date-only calculation
    start.setUTCHours(0, 0, 0, 0);
    target.setUTCHours(0, 0, 0, 0);

    const diffTime = target - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Day 1 is the start date
    return diffDays + 1;
}

/**
 * Get all active enrollments that need delivery today
 * @param {Date} targetDate - Target date (defaults to today)
 * @returns {Promise<Array>} Array of enrollments with calculated program day
 */
export async function getEnrollmentsNeedingDeliveryToday(targetDate = new Date()) {
    const today = new Date(targetDate);
    today.setUTCHours(0, 0, 0, 0);

    // Get all active enrollments
    const enrollments = await sql`
    SELECT 
      pe.id as "enrollmentId",
      pe."startDate",
      pe."clientId",
      pe."programTemplateId",
      pe."coachId",
      pt.duration
    FROM "ProgramEnrollment" pe
    JOIN "ProgramTemplate" pt ON pe."programTemplateId" = pt.id
    WHERE pe.status = 'active'
      AND pe."startDate" IS NOT NULL
      AND pe."startDate" <= ${today}
  `;

    // Calculate program day for each enrollment
    const enrollmentsWithDay = enrollments.map(enrollment => {
        const programDay = calculateProgramDay(enrollment.startDate, today);
        return {
            ...enrollment,
            programDay
        };
    });

    // Filter out enrollments beyond program duration
    return enrollmentsWithDay.filter(e => e.programDay <= e.duration * 7);
}

/**
 * Get elements for a specific program day
 * @param {string} templateId - Program template ID
 * @param {number} programDay - Program day (1, 2, 3, etc.)
 * @returns {Promise<Array>} Array of elements for that day
 */
export async function getElementsForProgramDay(templateId, programDay) {
    // Calculate which week/day this programDay corresponds to
    const week = Math.ceil(programDay / 7);
    const day = ((programDay - 1) % 7) + 1;

    const elements = await sql`
    SELECT *
    FROM "ProgramTemplateElement"
    WHERE "programTemplateId" = ${templateId}
      AND week = ${week}
      AND day = ${day}
    ORDER BY type, "scheduledTime"
  `;

    // Parse elementData if it's a string (JSONB from PostgreSQL)
    return elements.map(element => {
        let elementData = element.elementData || {};

        // If elementData is a string, parse it
        if (typeof elementData === 'string') {
            try {
                elementData = JSON.parse(elementData);
            } catch (e) {
                console.error('Error parsing elementData for element:', element.id, e);
                elementData = {};
            }
        }

        // Ensure elementData is an object
        if (!elementData || typeof elementData !== 'object' || Array.isArray(elementData)) {
            elementData = {};
        }

        // Debug logging for message elements
        if (element.type === 'message') {
            console.log('[Program Delivery] Message element:', {
                id: element.id,
                title: element.title,
                elementDataType: typeof element.elementData,
                elementData: elementData,
                messageContent: elementData?.message,
                willUse: elementData?.message || element.title
            });
        }

        return {
            ...element,
            elementData
        };
    });
}

/**
 * Check if elements already delivered for a day
 * @param {string} enrollmentId - Enrollment ID
 * @param {Array<string>} elementIds - Array of element IDs
 * @param {number} programDay - Program day
 * @param {Date} deliveryDate - Delivery date
 * @returns {Promise<Array<string>>} Array of already delivered element IDs
 */
export async function checkElementsDelivered(enrollmentId, elementIds, programDay, deliveryDate) {
    if (elementIds.length === 0) return [];

    const delivered = await sql`
    SELECT "elementId"
    FROM "ProgramElementDelivery"
    WHERE "enrollmentId" = ${enrollmentId}
      AND "programDay" = ${programDay}
      AND "deliveredDate" = ${deliveryDate}
      AND "elementId" = ANY(${elementIds})
  `;

    return delivered.map(d => d.elementId);
}

/**
 * Format combined message from elements
 * @param {Array} elements - Array of program elements
 * @param {number} programDay - Program day
 * @returns {string} Formatted message content
 */
export function formatCombinedMessage(elements, programDay) {
    const parts = [];

    // Add day header
    parts.push(`📅 **Day ${programDay} of Your Program**\n`);

    // Message elements
    const messages = elements.filter(e => e.type === 'message');
    messages.forEach(msg => {
        const content = msg.elementData?.message || msg.title;
        if (content) {
            parts.push(content);
        }
    });

    // Task elements
    const tasks = elements.filter(e => e.type === 'task');
    if (tasks.length > 0) {
        parts.push('\n📋 **Your Tasks for Today:**\n');
        tasks.forEach(task => {
            parts.push(`• **${task.title}**`);
            if (task.elementData?.description) {
                parts.push(`  ${task.elementData.description}`);
            }
        });
    }

    // File/Resource elements
    const files = elements.filter(e => e.type === 'content' || e.type === 'file');
    if (files.length > 0) {
        files.forEach(file => {
            // Use elementData.title if available (new schema), fallback to file.title
            const fileTitle = file.elementData?.title || file.title;

            if (file.elementData?.url || file.elementData?.fileUrl) {
                const url = file.elementData.url || file.elementData.fileUrl;
                parts.push(`\n📄 You can find the detailed guide [${fileTitle}](${url}) in your Library.`);
            } else {
                parts.push(`\n📄 **${fileTitle}**`);
            }
        });
    }

    return parts.join('\n');
}

/**
 * Create task from program element
 * @param {string} clientId - Client ID
 * @param {string} coachId - Coach ID
 * @param {Object} taskElement - Task element from program
 * @returns {Promise<Object>} Created task
 */
async function createTaskFromElement(clientId, coachId, taskElement) {
    try {
        const taskData = {
            title: taskElement.title,
            description: taskElement.elementData?.description || '',
            taskType: 'client',
            coachId,
            clientId,
            groupId: null,
            isRepetitive: false,
            status: 'pending'
        };

        const task = await taskRepo.createTask(taskData);
        return task;
    } catch (error) {
        console.error('Error creating task from element:', error);
        throw error;
    }
}

/**
 * Deliver program elements to client
 * @param {string} enrollmentId - Enrollment ID
 * @param {number} programDay - Program day
 * @param {Date} deliveryDate - Delivery date
 * @returns {Promise<Object>} Delivery result
 */
export async function deliverProgramElements(enrollmentId, programDay, deliveryDate) {
    try {
        // 1. Get enrollment with template
        const enrollmentResult = await sql`
      SELECT pe.*, pt.duration
      FROM "ProgramEnrollment" pe
      JOIN "ProgramTemplate" pt ON pe."programTemplateId" = pt.id
      WHERE pe.id = ${enrollmentId}
    `;

        if (enrollmentResult.length === 0) {
            return { delivered: false, reason: 'Enrollment not found' };
        }

        const enrollment = enrollmentResult[0];

        // 2. Get elements for this program day
        const elements = await getElementsForProgramDay(enrollment.programTemplateId, programDay);

        if (elements.length === 0) {
            return { delivered: false, reason: 'No elements for this day' };
        }

        // 3. Check if already delivered
        const elementIds = elements.map(e => e.id);
        const deliveredIds = await checkElementsDelivered(enrollmentId, elementIds, programDay, deliveryDate);
        const undeliveredElements = elements.filter(e => !deliveredIds.includes(e.id));

        if (undeliveredElements.length === 0) {
            return { delivered: false, reason: 'Already delivered' };
        }

        // 4. Get client's userId from clientId
        const clientUser = await sql`
      SELECT "userId" FROM "Client" WHERE id = ${enrollment.clientId}
    `;

        if (clientUser.length === 0) {
            throw new Error('Client not found');
        }

        const clientUserId = clientUser[0].userId;

        // 5. Get or create client's conversation with coach
        const conversationId = await chatRepo.createPersonalConversation(
            enrollment.coachId,
            clientUserId
        );

        // 6. Format combined message
        const messageContent = formatCombinedMessage(undeliveredElements, programDay);

        // 7. Send message via chat system
        const message = await chatRepo.sendMessage(
            conversationId,
            enrollment.coachId,
            messageContent,
            'text'
        );

        // 8. Create tasks if needed
        const tasks = undeliveredElements.filter(e => e.type === 'task');
        for (const taskElement of tasks) {
            try {
                await createTaskFromElement(enrollment.clientId, enrollment.coachId, taskElement);
            } catch (error) {
                console.error('Error creating task:', error);
                // Continue even if task creation fails
            }
        }

        // 9. Record delivery for all elements
        const deliveryDateStr = deliveryDate.toISOString().split('T')[0];
        for (const element of undeliveredElements) {
            await sql`
        INSERT INTO "ProgramElementDelivery" (
          "enrollmentId", "elementId", "programDay", 
          "deliveredDate", "messageId"
        )
        VALUES (
          ${enrollmentId}, ${element.id}, ${programDay},
          ${deliveryDateStr}, ${message.id}
        )
        ON CONFLICT ("enrollmentId", "elementId", "programDay") DO NOTHING
      `;
        }

        return {
            delivered: true,
            messageId: message.id,
            elementsCount: undeliveredElements.length
        };
    } catch (error) {
        console.error('Error delivering program elements:', error);
        throw error;
    }
}

