import { sql } from '@/app/lib/db/postgresql';

// Default client pipeline stages (all visible by default)
const DEFAULT_CLIENT_STAGES = [
    { id: "light", name: "Light", color: "bg-blue-500", isVisible: true },
    { id: "group", name: "Group", color: "bg-yellow-500", isVisible: true },
    { id: "personal", name: "Personal", color: "bg-purple-500", isVisible: true },
    { id: "completed", name: "Completed", color: "bg-green-500", isVisible: true },
    { id: "inactive", name: "Inactive", color: "bg-red-500", isVisible: true }
];

// Default group pipeline stages (all visible by default)
const DEFAULT_GROUP_STAGES = [
    { id: "upcoming", name: "Upcoming", color: "bg-blue-500", description: "Groups scheduled to start", isVisible: true },
    { id: "ongoing", name: "Ongoing", color: "bg-green-500", description: "Active groups", isVisible: true },
    { id: "completed", name: "Completed", color: "bg-purple-500", description: "Finished groups", isVisible: true },
    { id: "inactive", name: "Inactive", color: "bg-gray-500", description: "Paused groups", isVisible: true }
];

/**
 * Initialize default pipeline stages for a new coach
 * @param {string} coachId - The UUID of the coach
 */
export async function initializeDefaultPipelines(coachId) {
    try {
        // Insert default client pipeline stages
        for (let i = 0; i < DEFAULT_CLIENT_STAGES.length; i++) {
            const stage = DEFAULT_CLIENT_STAGES[i];
            await sql`
        INSERT INTO "ClientPipelineStage" 
        ("coachId", id, name, color, "isVisible", "order")
        VALUES (
          ${coachId},
          ${stage.id},
          ${stage.name},
          ${stage.color},
          ${stage.isVisible},
          ${i}
        )
        ON CONFLICT ("coachId", id) DO NOTHING
      `;
        }

        // Insert default group pipeline stages
        for (let i = 0; i < DEFAULT_GROUP_STAGES.length; i++) {
            const stage = DEFAULT_GROUP_STAGES[i];
            await sql`
        INSERT INTO "GroupPipelineStage" 
        ("coachId", id, name, color, description, "isVisible", "order")
        VALUES (
          ${coachId},
          ${stage.id},
          ${stage.name},
          ${stage.color},
          ${stage.description || null},
          ${stage.isVisible},
          ${i}
        )
        ON CONFLICT ("coachId", id) DO NOTHING
      `;
        }

        console.log(`✅ Default pipelines initialized for coach ${coachId}`);
        return true;
    } catch (error) {
        console.error('Error initializing default pipelines:', error);
        throw error;
    }
}

