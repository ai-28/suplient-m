import { sql } from './postgresql.js';

// Video operations
export async function saveVideo(title, coachId, resourceType, url, description = '', author = '', fileSize = null, fileType = null, folderId = null) {
    try {
        // Extract filename from URL for fileName field
        const fileName = url.split('/').pop() || title;

        const result = await sql`
      INSERT INTO "Resource" (title, description, "resourceType", url, "fileName", "fileSize", "fileType", "coachId", author, "folderId")
      VALUES (${title}, ${description}, ${resourceType}, ${url}, ${fileName}, ${fileSize}, ${fileType}, ${coachId}, ${author}, ${folderId})
      RETURNING *
    `;
        return result[0];
    } catch (error) {
        console.error('Error saving video:', error);
        throw error;
    }
}

export async function getAllVideos() {
    try {
        const result = await sql`
      SELECT r.*, u.name as "coachName"
      FROM "Resource" r
      LEFT JOIN "User" u ON r."coachId" = u.id
      WHERE r."resourceType" = 'video'
      ORDER BY r."createdAt" DESC
    `;
        return result;
    } catch (error) {
        console.error('Error fetching videos:', error);
        throw error;
    }
}

export async function getAllVideosForCoach(coachId = null, folderId = null) {
    try {
        let query;
        if (coachId) {
            if (folderId !== null && folderId !== undefined) {
                // Get resources in specific folder
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'video'
                    AND r."coachId" = ${coachId}
                    AND r."folderId" = ${folderId}
                  ORDER BY r."createdAt" DESC
                `;
            } else if (folderId === null) {
                // Get resources at root level (no folder)
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'video'
                    AND r."coachId" = ${coachId}
                    AND r."folderId" IS NULL
                  ORDER BY r."createdAt" DESC
                `;
            } else {
                // Get all resources for coach (no folder filter)
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'video'
                    AND r."coachId" = ${coachId}
                  ORDER BY r."createdAt" DESC
                `;
            }
        } else {
            // Original behavior - all videos
            query = sql`
              SELECT r.*, u.name as "coachName"
              FROM "Resource" r
              LEFT JOIN "User" u ON r."coachId" = u.id
              WHERE r."resourceType" = 'video'
              ORDER BY r."createdAt" DESC
            `;
        }
        const result = await query;
        return result;
    } catch (error) {
        console.error('Error fetching videos for coach:', error);
        throw error;
    }
}

export async function getAllVideosForClinic() {
    try {
        const result = await sql`
      SELECT r.*, u.name as "coachName"
      FROM "Resource" r
      LEFT JOIN "User" u ON r."coachId" = u.id
      WHERE r."resourceType" = 'video'
      ORDER BY r."createdAt" DESC
    `;
        return result;
    } catch (error) {
        console.error('Error fetching videos for clinic:', error);
        throw error;
    }
}

// Image operations
export async function saveImage(title, coachId, resourceType, url, description = '', author = '', fileSize = null, fileType = null, folderId = null) {
    try {
        // Extract filename from URL for fileName field
        const fileName = url.split('/').pop() || title;

        const result = await sql`
      INSERT INTO "Resource" (title, description, "resourceType", url, "fileName", "fileSize", "fileType", "coachId", author, "folderId")
      VALUES (${title}, ${description}, ${resourceType}, ${url}, ${fileName}, ${fileSize}, ${fileType}, ${coachId}, ${author}, ${folderId})
      RETURNING *
    `;
        return result[0];
    } catch (error) {
        console.error('Error saving image:', error);
        throw error;
    }
}

export async function getAllImages() {
    try {
        const result = await sql`
      SELECT r.*, u.name as "coachName"
      FROM "Resource" r
      LEFT JOIN "User" u ON r."coachId" = u.id
      WHERE r."resourceType" = 'image'
      ORDER BY r."createdAt" DESC
    `;
        return result;
    } catch (error) {
        console.error('Error fetching images:', error);
        throw error;
    }
}

export async function getAllImagesForCoach(coachId = null, folderId = null) {
    try {
        let query;
        if (coachId) {
            if (folderId !== null && folderId !== undefined) {
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'image'
                    AND r."coachId" = ${coachId}
                    AND r."folderId" = ${folderId}
                  ORDER BY r."createdAt" DESC
                `;
            } else if (folderId === null) {
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'image'
                    AND r."coachId" = ${coachId}
                    AND r."folderId" IS NULL
                  ORDER BY r."createdAt" DESC
                `;
            } else {
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'image'
                    AND r."coachId" = ${coachId}
                  ORDER BY r."createdAt" DESC
                `;
            }
        } else {
            query = sql`
              SELECT r.*, u.name as "coachName"
              FROM "Resource" r
              LEFT JOIN "User" u ON r."coachId" = u.id
              WHERE r."resourceType" = 'image'
              ORDER BY r."createdAt" DESC
            `;
        }
        const result = await query;
        return result;
    } catch (error) {
        console.error('Error fetching images for coach:', error);
        throw error;
    }
}

// Article/PDF operations
export async function savePDF(title, coachId, resourceType, url, description = '', author = '', fileSize = null, fileType = null, folderId = null) {
    try {
        // Extract filename from URL for fileName field
        const fileName = url.split('/').pop() || title;

        const result = await sql`
      INSERT INTO "Resource" (title, description, "resourceType", url, "fileName", "fileSize", "fileType", "coachId", author, "folderId")
      VALUES (${title}, ${description}, ${resourceType}, ${url}, ${fileName}, ${fileSize}, ${fileType}, ${coachId}, ${author}, ${folderId})
      RETURNING *
    `;
        return result[0];
    } catch (error) {
        console.error('Error saving PDF:', error);
        throw error;
    }
}

export async function getAllPDFs() {
    try {
        const result = await sql`
      SELECT r.*, u.name as "coachName"
      FROM "Resource" r
      LEFT JOIN "User" u ON r."coachId" = u.id
      WHERE r."resourceType" = 'article'
      ORDER BY r."createdAt" DESC
    `;
        return result;
    } catch (error) {
        console.error('Error fetching PDFs:', error);
        throw error;
    }
}

export async function getAllPDFsForCoach(coachId = null, folderId = null) {
    try {
        let query;
        if (coachId) {
            if (folderId !== null && folderId !== undefined) {
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'article'
                    AND r."coachId" = ${coachId}
                    AND r."folderId" = ${folderId}
                  ORDER BY r."createdAt" DESC
                `;
            } else if (folderId === null) {
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'article'
                    AND r."coachId" = ${coachId}
                    AND r."folderId" IS NULL
                  ORDER BY r."createdAt" DESC
                `;
            } else {
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'article'
                    AND r."coachId" = ${coachId}
                  ORDER BY r."createdAt" DESC
                `;
            }
        } else {
            query = sql`
              SELECT r.*, u.name as "coachName"
              FROM "Resource" r
              LEFT JOIN "User" u ON r."coachId" = u.id
              WHERE r."resourceType" = 'article'
              ORDER BY r."createdAt" DESC
            `;
        }
        const result = await query;
        return result;
    } catch (error) {
        console.error('Error fetching PDFs for coach:', error);
        throw error;
    }
}

// Sound operations
export async function saveSound(title, coachId, resourceType, url, description = '', author = '', fileSize = null, fileType = null, folderId = null) {
    try {
        // Extract filename from URL for fileName field
        const fileName = url.split('/').pop() || title;

        const result = await sql`
      INSERT INTO "Resource" (title, description, "resourceType", url, "fileName", "fileSize", "fileType", "coachId", author, "folderId")
      VALUES (${title}, ${description}, ${resourceType}, ${url}, ${fileName}, ${fileSize}, ${fileType}, ${coachId}, ${author}, ${folderId})
      RETURNING *
    `;
        return result[0];
    } catch (error) {
        console.error('Error saving sound:', error);
        throw error;
    }
}

export async function getAllSounds() {
    try {
        const result = await sql`
      SELECT r.*, u.name as "coachName"
      FROM "Resource" r
      LEFT JOIN "User" u ON r."coachId" = u.id
      WHERE r."resourceType" = 'sound'
      ORDER BY r."createdAt" DESC
    `;
        return result;
    } catch (error) {
        console.error('Error fetching sounds:', error);
        throw error;
    }
}

export async function getAllSoundsForCoach(coachId = null, folderId = null) {
    try {
        let query;
        if (coachId) {
            if (folderId !== null && folderId !== undefined) {
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'sound'
                    AND r."coachId" = ${coachId}
                    AND r."folderId" = ${folderId}
                  ORDER BY r."createdAt" DESC
                `;
            } else if (folderId === null) {
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'sound'
                    AND r."coachId" = ${coachId}
                    AND r."folderId" IS NULL
                  ORDER BY r."createdAt" DESC
                `;
            } else {
                query = sql`
                  SELECT r.*, u.name as "coachName"
                  FROM "Resource" r
                  LEFT JOIN "User" u ON r."coachId" = u.id
                  WHERE r."resourceType" = 'sound'
                    AND r."coachId" = ${coachId}
                  ORDER BY r."createdAt" DESC
                `;
            }
        } else {
            query = sql`
              SELECT r.*, u.name as "coachName"
              FROM "Resource" r
              LEFT JOIN "User" u ON r."coachId" = u.id
              WHERE r."resourceType" = 'sound'
              ORDER BY r."createdAt" DESC
            `;
        }
        const result = await query;
        return result;
    } catch (error) {
        console.error('Error fetching sounds for coach:', error);
        throw error;
    }
}

// Optimized functions for AddElementDialog - only fetch required fields and filter by coachId
export async function getResourcesForDialog(coachId) {
    try {
        const result = await sql`
            SELECT 
                id,
                "fileName",
                title,
                "resourceType",
                "fileSize",
                url
            FROM "Resource"
            WHERE "coachId" = ${coachId}
            ORDER BY "createdAt" DESC
        `;
        return result;
    } catch (error) {
        console.error('Error fetching resources for dialog:', error);
        throw error;
    }
}

// General resource operations
export async function getResourceById(id) {
    try {
        const result = await sql`
      SELECT r.*, u.name as "coachName"
      FROM "Resource" r
      LEFT JOIN "User" u ON r."coachId" = u.id
      WHERE r.id = ${id}
    `;
        return result[0];
    } catch (error) {
        console.error('Error fetching resource by ID:', error);
        throw error;
    }
}

export async function deleteResource(id) {
    try {
        const result = await sql`
      DELETE FROM "Resource" WHERE id = ${id}
      RETURNING *
    `;
        return result[0];
    } catch (error) {
        console.error('Error deleting resource:', error);
        throw error;
    }
}

export async function updateResource(id, updates) {
    try {
        const keys = Object.keys(updates);
        if (keys.length === 0) {
            throw new Error('No fields to update');
        }

        // Build SET clause with positional parameters
        const setClause = keys
            .map((key, index) => `"${key}" = $${index + 2}`)
            .join(', ');

        const values = Object.values(updates);
        const query = `UPDATE "Resource" SET ${setClause}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;

        const result = await sql.unsafe(query, [id, ...values]);
        return result[0];
    } catch (error) {
        console.error('Error updating resource:', error);
        throw error;
    }
}
