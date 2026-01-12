import { sql } from '@/app/lib/db/postgresql';

/**
 * Creates default goals and habits for a newly created client
 * @param {string} clientId - The UUID of the client
 * @returns {Promise<{success: boolean}>}
 */
export async function createDefaultGoalsAndHabitsForClient(clientId) {
    try {
        // Check if default goals already exist for this client
        const existingGoals = await sql`
      SELECT id FROM "Goal" 
      WHERE "clientId" = ${clientId} AND "isDefault" = true
      LIMIT 1
    `;

        if (existingGoals.length === 0) {
            // Insert default goals
            await sql`
        INSERT INTO "Goal" ("clientId", name, icon, color, "isActive", "isCustom", "isDefault", "order")
        VALUES
          (${clientId}, 'Sleep Quality', '🌙', '#3B82F6', true, false, true, 1),
          (${clientId}, 'Nutrition', '🥗', '#10B981', true, false, true, 2),
          (${clientId}, 'Physical Activity', '🏃‍♂️', '#F59E0B', true, false, true, 3),
          (${clientId}, 'Learning', '📚', '#8B5CF6', true, false, true, 4),
          (${clientId}, 'Maintaining Relationships', '❤️', '#EC4899', true, false, true, 5)
      `;
            console.log(`✅ Default goals created for client ${clientId}`);
        }

        // Check if default habits already exist for this client
        const existingHabits = await sql`
      SELECT id FROM "Habit" 
      WHERE "clientId" = ${clientId} AND "isDefault" = true
      LIMIT 1
    `;

        if (existingHabits.length === 0) {
            // Insert default habits
            await sql`
        INSERT INTO "Habit" ("clientId", name, icon, color, "isActive", "isCustom", "isDefault", "order")
        VALUES
          (${clientId}, 'Excessive Social Media', '📱', '#EF4444', true, false, true, 1),
          (${clientId}, 'Procrastination', '⏰', '#F97316', true, false, true, 2),
          (${clientId}, 'Negative Thinking', '☁️', '#6B7280', true, false, true, 3)
      `;
            console.log(`✅ Default habits created for client ${clientId}`);
        }

        return { success: true };
    } catch (error) {
        console.error('Error creating default goals and habits:', error);
        throw error;
    }
}

