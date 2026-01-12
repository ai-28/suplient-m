import { sql } from "@/app/lib/db/postgresql";

// Create a new program template
export async function createProgramTemplate(programData) {
    try {
        const {
            name,
            description,
            duration,
            coachId,
            elements = []
        } = programData;


        // Validate required fields
        if (!name) {
            throw new Error('Program name is required');
        }
        if (!duration) {
            throw new Error('Program duration is required');
        }
        if (!coachId) {
            throw new Error('Coach ID is required');
        }

        // Start a transaction
        const result = await sql`
      INSERT INTO "ProgramTemplate" (name, description, duration, "coachId", "createdAt", "updatedAt")
      VALUES (${name}, ${description}, ${duration}, ${coachId}, NOW(), NOW())
      RETURNING id, name, description, duration, "coachId", "createdAt"
    `;

        const program = result[0];
        // Insert program elements if provided
        if (elements.length > 0) {
            // Use Promise.all for concurrent inserts (better than sequential)
            await Promise.all(
                elements.map(element =>
                    sql`
                        INSERT INTO "ProgramTemplateElement" (
                            "programTemplateId", type, title, week, day, 
                            "scheduledTime", "elementData", "createdAt", "updatedAt"
                        )
                        VALUES (
                            ${program.id}, 
                            ${element.type || 'exercise'}, 
                            ${element.title || 'Untitled Element'}, 
                            ${element.week || 1}, 
                            ${element.day || 1}, 
                            ${element.scheduledTime || '09:00:00'}, 
                            ${JSON.stringify(element.data || {})}, 
                            NOW(), 
                            NOW()
                        )
                    `
                )
            );
        }

        return program;
    } catch (error) {
        console.error('Error creating program template:', error);
        throw error;
    }
}

// Get program template by ID with elements
export async function getProgramTemplateById(id) {
    try {
        const programResult = await sql`
      SELECT p.*, u.name as "coachName"
      FROM "ProgramTemplate" p
      LEFT JOIN "User" u ON p."coachId" = u.id
      WHERE p.id = ${id}
    `;

        if (programResult.length === 0) {
            return null;
        }

        const program = programResult[0];

        // Get program template elements
        const elementsResult = await sql`
      SELECT * FROM "ProgramTemplateElement"
      WHERE "programTemplateId" = ${id}
      ORDER BY week, day
    `;

        program.elements = elementsResult;

        return program;
    } catch (error) {
        console.error('Error getting program template by ID:', error);
        throw error;
    }
}

// Get all program templates for a coach
export async function getProgramTemplatesByCoach(coachId, options = {}) {
    try {
        const { limit = 50, offset = 0 } = options;

        const programs = await sql`
      SELECT p.*, u.name as "coachName",
             (SELECT COUNT(*) FROM "ProgramTemplateElement" WHERE "programTemplateId" = p.id) as "elementCount"
      FROM "ProgramTemplate" p
      LEFT JOIN "User" u ON p."coachId" = u.id
      WHERE p."coachId" = ${coachId}
      ORDER BY p."createdAt" DESC LIMIT ${limit} OFFSET ${offset}
    `;

        return programs;
    } catch (error) {
        console.error('Error getting program templates by coach:', error);
        throw error;
    }
}

// Update program template
export async function updateProgramTemplate(id, programData) {
    try {
        const {
            name,
            description,
            duration,
            elements
        } = programData;

        // Validate required fields
        if (!name) {
            throw new Error('Program name is required');
        }
        if (!duration) {
            throw new Error('Program duration is required');
        }

        // Update program template
        const result = await sql`
      UPDATE "ProgramTemplate"
      SET name = ${name}, description = ${description || ''}, duration = ${duration}, "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

        if (result.length === 0) {
            throw new Error('Program not found');
        }

        // If elements are provided, replace all elements
        if (elements && elements.length > 0) {

            // Delete existing elements
            await sql`DELETE FROM "ProgramTemplateElement" WHERE "programTemplateId" = ${id}`;

            // Insert new elements
            for (const element of elements) {

                await sql`
          INSERT INTO "ProgramTemplateElement" (
            "programTemplateId", type, title, week, day, 
            "scheduledTime", "elementData", "createdAt", "updatedAt"
          )
          VALUES (
            ${id}, 
            ${element.type || 'exercise'}, 
            ${element.title || 'Untitled Element'}, 
            ${element.week || 1}, 
            ${element.day || 1}, 
            ${element.scheduledTime || '09:00:00'}, 
            ${JSON.stringify(element.data || {})}, 
            NOW(), 
            NOW()
          )
        `;
            }
        }

        return result[0];
    } catch (error) {
        console.error('Error updating program template:', error);
        throw error;
    }
}

// Delete program template
export async function deleteProgramTemplate(id) {
    try {
        const result = await sql`
      DELETE FROM "ProgramTemplate"
      WHERE id = ${id}
      RETURNING id
    `;

        return result.length > 0;
    } catch (error) {
        console.error('Error deleting program template:', error);
        throw error;
    }
}

// Duplicate program template
export async function duplicateProgramTemplate(originalId, newName, coachId) {
    try {
        const originalProgram = await getProgramTemplateById(originalId);
        if (!originalProgram) {
            throw new Error('Original program template not found');
        }


        // Create new program template with duplicated data
        const duplicatedProgram = await createProgramTemplate({
            name: newName,
            description: originalProgram.description || '',
            duration: originalProgram.duration,
            coachId,
            elements: originalProgram.elements || []
        });

        return duplicatedProgram;
    } catch (error) {
        console.error('Error duplicating program template:', error);
        throw error;
    }
}

// Get program template statistics
export async function getProgramTemplateStats(coachId) {
    try {
        const stats = await sql`
      SELECT 
        COUNT(*) as "totalProgramTemplates",
        AVG(duration) as "averageDuration",
        (
            SELECT COUNT(DISTINCT pe."clientId") 
            FROM "ProgramEnrollment" pe 
            WHERE pe."coachId" = ${coachId} 
            AND pe.status = 'enrolled'
        ) as "enrolledClients",
        (
            SELECT COUNT(DISTINCT pe."clientId") 
            FROM "ProgramEnrollment" pe 
            WHERE pe."coachId" = ${coachId} 
            AND pe.status = 'completed'
        ) as "completedClients"
      FROM "ProgramTemplate"
      WHERE "coachId" = ${coachId}
    `;

        return stats[0];
    } catch (error) {
        console.error('Error getting program template stats:', error);
        throw error;
    }
}

// Create program enrollment (link client to template)
export async function createProgramEnrollment(templateId, clientId, coachId) {
    try {

        // Check if enrollment already exists
        const existingEnrollment = await sql`
            SELECT id FROM "ProgramEnrollment" 
            WHERE "programTemplateId" = ${templateId} AND "clientId" = ${clientId}
        `;

        if (existingEnrollment.length > 0) {
            throw new Error('Client is already enrolled in this program');
        }

        // Create enrollment with 'enrolled' status (program will start when coach clicks "Start Program")
        const result = await sql`
            INSERT INTO "ProgramEnrollment" (
                "programTemplateId", "clientId", "coachId", 
                status, "completedElements", "startDate", 
                "createdAt", "updatedAt"
            )
            VALUES (
                ${templateId}, 
                ${clientId}, 
                ${coachId}, 
                'enrolled',
                '{}',
                NULL,
                NOW(), 
                NOW()
            )
            RETURNING id, "programTemplateId", "clientId", "coachId", status, "completedElements", "startDate", "createdAt"
        `;

        return result[0];
    } catch (error) {
        console.error('Error creating program enrollment:', error);
        throw error;
    }
}

// Get client programs with template data
export async function getClientProgramsWithTemplates(clientId, coachId) {
    try {

        const enrollments = await sql`
            SELECT 
                pe.*,
                pt.name,
                pt.description,
                pt.duration,
                pt."coachId" as "templateCoachId"
            FROM "ProgramEnrollment" pe
            JOIN "ProgramTemplate" pt ON pe."programTemplateId" = pt.id
            WHERE pe."clientId" = ${clientId} AND pe."coachId" = ${coachId}
            ORDER BY pe."createdAt" DESC
        `;

        // Get elements for each template
        const programsWithElements = await Promise.all(
            enrollments.map(async (enrollment) => {
                const elementsResult = await sql`
                    SELECT * FROM "ProgramTemplateElement"
                    WHERE "programTemplateId" = ${enrollment.programTemplateId}
                    ORDER BY week, day
                `;
                return {
                    ...enrollment,
                    elements: elementsResult
                };
            })
        );

        return programsWithElements;
    } catch (error) {
        console.error('Error fetching client programs with templates:', error);
        throw error;
    }
}

// Mark element complete for enrollment
export async function markEnrollmentElementComplete(enrollmentId, elementId, coachId) {
    try {
        // Verify the enrollment belongs to the coach
        const enrollment = await sql`
            SELECT * FROM "ProgramEnrollment" 
            WHERE id = ${enrollmentId} AND "coachId" = ${coachId}
        `;

        if (enrollment.length === 0) {
            throw new Error('Enrollment not found or access denied');
        }

        // Check if element is already completed
        const completedElements = enrollment[0].completedElements || [];
        if (completedElements.includes(elementId)) {
            throw new Error('Element is already completed');
        }

        // Verify element exists in template
        const elementExists = await sql`
            SELECT id FROM "ProgramTemplateElement" 
            WHERE "programTemplateId" = ${enrollment[0].programTemplateId} AND id = ${elementId}
        `;

        if (elementExists.length === 0) {
            throw new Error('Element not found in this program template');
        }

        // Add element to completed elements array
        const result = await sql`
            UPDATE "ProgramEnrollment" 
            SET "completedElements" = array_append("completedElements", ${elementId}),
                "updatedAt" = NOW()
            WHERE id = ${enrollmentId}
            RETURNING "completedElements"
        `;

        return result[0];
    } catch (error) {
        console.error('Error marking enrollment element complete:', error);
        throw error;
    }
}

// Update enrollment status
export async function updateEnrollmentStatus(enrollmentId, status, coachId) {
    try {
        console.log('updateEnrollmentStatus called with:', { enrollmentId, status, coachId });

        // Verify the enrollment belongs to the coach
        const enrollment = await sql`
            SELECT * FROM "ProgramEnrollment" 
            WHERE id = ${enrollmentId} AND "coachId" = ${coachId}
        `;

        if (enrollment.length === 0) {
            throw new Error('Enrollment not found or access denied');
        }


        const result = await sql`
            UPDATE "ProgramEnrollment" 
            SET status = ${status}, "updatedAt" = NOW()
            WHERE id = ${enrollmentId}
            RETURNING id, status, "updatedAt"
        `;

        return result[0];
    } catch (error) {
        console.error('Error updating enrollment status:', error);
        throw error;
    }
}

// Start an enrollment (set startDate and change status to active)
export async function startEnrollment(enrollmentId, coachId) {
    try {

        // Check if enrollment exists and belongs to coach
        const enrollment = await sql`
            SELECT id, status, "startDate" FROM "ProgramEnrollment" 
            WHERE id = ${enrollmentId} AND "coachId" = ${coachId}
        `;

        if (enrollment.length === 0) {
            throw new Error('Enrollment not found or access denied');
        }

        if (enrollment[0].status !== 'enrolled') {
            throw new Error('Enrollment is not in enrolled status');
        }

        if (enrollment[0].startDate !== null) {
            throw new Error('Enrollment has already been started');
        }

        // Set startDate to today (date only, no time)
        const startDate = new Date();
        startDate.setUTCHours(0, 0, 0, 0);

        // Start the enrollment by setting status to active and startDate to today
        const result = await sql`
            UPDATE "ProgramEnrollment" 
            SET status = 'active', "startDate" = ${startDate}, "updatedAt" = NOW()
            WHERE id = ${enrollmentId} AND "coachId" = ${coachId}
            RETURNING id, status, "startDate", "updatedAt"
        `;

        // Send Day 1 elements immediately (asynchronously, don't block enrollment)
        if (result.length > 0) {
            // Import delivery service dynamically to avoid circular dependencies
            import('@/app/lib/services/programDeliveryService').then(({ deliverProgramElements }) => {
                deliverProgramElements(enrollmentId, 1, startDate)
                    .then(result => {
                        if (result.delivered) {
                            console.log(`Day 1 elements delivered to enrollment ${enrollmentId}`);
                        } else {
                            console.log(`Day 1 elements skipped for enrollment ${enrollmentId}: ${result.reason}`);
                        }
                    })
                    .catch(error => {
                        console.error(`Error sending Day 1 elements to enrollment ${enrollmentId}:`, error);
                        // Don't fail enrollment if delivery fails
                    });
            }).catch(error => {
                console.error('Error importing delivery service:', error);
            });
        }

        return result[0];
    } catch (error) {
        console.error('Error starting enrollment:', error);
        throw error;
    }
}

// Restart an enrollment (reset to initial state)
export async function restartEnrollment(enrollmentId, coachId) {
    try {

        // Verify the enrollment belongs to the coach
        const enrollment = await sql`
            SELECT * FROM "ProgramEnrollment" 
            WHERE id = ${enrollmentId} AND "coachId" = ${coachId}
        `;

        if (enrollment.length === 0) {
            throw new Error('Enrollment not found or access denied');
        }

        // Check if program is completed
        if (enrollment[0].status !== 'completed') {
            throw new Error('Only completed programs can be restarted');
        }

        const result = await sql`
            UPDATE "ProgramEnrollment" 
            SET 
                status = 'enrolled',
                "completedElements" = ${[]},
                "startDate" = NULL,
                "updatedAt" = NOW()
            WHERE id = ${enrollmentId}
            RETURNING id, status, "completedElements", "startDate"
        `;

        return result[0];
    } catch (error) {
        console.error('Error restarting enrollment:', error);
        throw error;
    }
}

// Get enrolled clients for a specific program template
export async function getEnrolledClientsForTemplate(templateId, coachId) {
    try {

        const result = await sql`
            SELECT 
                pe.id as "enrollmentId",
                pe.status,
                pe."completedElements",
                pe."startDate",
                pe."createdAt" as "enrolledDate",
                pe."updatedAt",
                c.id as "clientId",
                c."userId",
                u.name as "clientName",
                u.email as "clientEmail",
                u.avatar as "clientAvatar",
                pt.id as "templateId",
                pt.name as "templateName",
                pt.description as "templateDescription",
                pt.duration as "templateDuration",
                COUNT(pte.id) as "totalElements"
            FROM "ProgramEnrollment" pe
            JOIN "Client" c ON pe."clientId" = c.id
            LEFT JOIN "User" u ON c."userId" = u.id
            JOIN "ProgramTemplate" pt ON pe."programTemplateId" = pt.id
            LEFT JOIN "ProgramTemplateElement" pte ON pt.id = pte."programTemplateId"
            WHERE pe."programTemplateId" = ${templateId} 
            AND pe."coachId" = ${coachId}
            GROUP BY 
                pe.id, pe.status, pe."completedElements", pe."startDate", 
                pe."createdAt", pe."updatedAt", c.id, c."userId", u.name, u.email, u.avatar,
                pt.id, pt.name, pt.description, pt.duration
            ORDER BY pe."createdAt" DESC
        `;

        return result;
    } catch (error) {
        console.error('Error getting enrolled clients for template:', error);
        throw error;
    }
}
