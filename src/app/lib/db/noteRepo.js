import { sql } from './postgresql';

export const noteRepo = {
    // Create a new note
    async createNote(noteData) {
        try {
            const { title, description, clientId } = noteData;

            const result = await sql`
                INSERT INTO "Note" (title, description, "clientId", "createdAt", "updatedAt")
                VALUES (${title}, ${description}, ${clientId}, NOW(), NOW())
                RETURNING *
            `;

            return result[0];
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    },

    // Create a new group note
    async createGroupNote(noteData) {
        try {
            const { title, description, groupId } = noteData;

            const result = await sql`
                INSERT INTO "Note" (title, description, "groupId", "createdAt", "updatedAt")
                VALUES (${title}, ${description}, ${groupId}, NOW(), NOW())
                RETURNING *
            `;

            return result[0];
        } catch (error) {
            console.error('Error creating group note:', error);
            throw error;
        }
    },

    // Get notes by client ID
    async getNotesByClientId(clientId) {
        try {
            const notes = await sql`
                SELECT 
                    n.id,
                    n.title,
                    n.description,
                    n."clientId",
                    n."createdAt",
                    n."updatedAt"
                FROM "Note" n
                WHERE n."clientId" = ${clientId}
                ORDER BY n."createdAt" DESC
            `;

            return notes;
        } catch (error) {
            console.error('Error fetching notes by client ID:', error);
            throw error;
        }
    },

    // Get notes by group ID
    async getNotesByGroupId(groupId) {
        try {
            const notes = await sql`
                SELECT 
                    n.id,
                    n.title,
                    n.description,
                    n."groupId",
                    n."createdAt",
                    n."updatedAt"
                FROM "Note" n
                WHERE n."groupId" = ${groupId}
                ORDER BY n."createdAt" DESC
            `;

            return notes;
        } catch (error) {
            console.error('Error fetching notes by group ID:', error);
            throw error;
        }
    },

    // Get note by ID
    async getNoteById(noteId) {
        try {
            const result = await sql`
                SELECT 
                    n.id,
                    n.title,
                    n.description,
                    n."clientId",
                    n."createdAt",
                    n."updatedAt"
                FROM "Note" n
                WHERE n.id = ${noteId}
            `;

            return result[0] || null;
        } catch (error) {
            console.error('Error fetching note by ID:', error);
            throw error;
        }
    },

    // Update a note
    async updateNote(noteId, noteData) {
        try {
            const { title, description } = noteData;

            const result = await sql`
                UPDATE "Note" 
                SET title = ${title}, 
                    description = ${description}, 
                    "updatedAt" = NOW()
                WHERE id = ${noteId}
                RETURNING *
            `;

            return result[0] || null;
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    },

    // Delete a note
    async deleteNote(noteId) {
        try {
            const result = await sql`
                DELETE FROM "Note" 
                WHERE id = ${noteId}
                RETURNING id
            `;

            return result[0] || null;
        } catch (error) {
            console.error('Error deleting note:', error);
            throw error;
        }
    }
};
