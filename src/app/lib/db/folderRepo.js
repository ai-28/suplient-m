import { sql } from './postgresql.js';

// Get all folders for a coach and resource type (optionally filtered by parent)
export async function getFoldersByType(coachId, resourceType, parentFolderId = null) {
  try {
    const result = await sql`
      SELECT * FROM "ResourceFolder"
      WHERE "coachId" = ${coachId}
        AND "resourceType" = ${resourceType}
        AND (
          (${parentFolderId === null} AND "parentFolderId" IS NULL)
          OR (${parentFolderId !== null} AND "parentFolderId" = ${parentFolderId})
        )
      ORDER BY "order", name ASC
    `;
    return result;
  } catch (error) {
    console.error('Error fetching folders:', error);
    throw error;
  }
}

// Get folder tree (recursive structure)
export async function getFolderTree(coachId, resourceType) {
  try {
    // Get all folders for this type
    const allFolders = await sql`
      SELECT * FROM "ResourceFolder"
      WHERE "coachId" = ${coachId} AND "resourceType" = ${resourceType}
      ORDER BY "order", name ASC
    `;
    
    // Build tree structure
    const folderMap = new Map();
    const rootFolders = [];
    
    allFolders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });
    
    allFolders.forEach(folder => {
      if (folder.parentFolderId) {
        const parent = folderMap.get(folder.parentFolderId);
        if (parent) {
          parent.children.push(folderMap.get(folder.id));
        }
      } else {
        rootFolders.push(folderMap.get(folder.id));
      }
    });
    
    return rootFolders;
  } catch (error) {
    console.error('Error building folder tree:', error);
    throw error;
  }
}

// Get folder path (breadcrumb trail)
export async function getFolderPath(folderId) {
  try {
    const path = [];
    let currentFolderId = folderId;
    
    while (currentFolderId) {
      const result = await sql`
        SELECT id, name, "parentFolderId", "resourceType"
        FROM "ResourceFolder"
        WHERE id = ${currentFolderId}
      `;
      
      if (result.length === 0) break;
      
      const folder = result[0];
      path.unshift(folder);
      currentFolderId = folder.parentFolderId;
    }
    
    return path;
  } catch (error) {
    console.error('Error getting folder path:', error);
    throw error;
  }
}

// Create folder
export async function createFolder(coachId, name, resourceType, parentFolderId = null, color = null, icon = null) {
  try {
    const result = await sql`
      INSERT INTO "ResourceFolder" ("coachId", name, "resourceType", "parentFolderId", color, icon)
      VALUES (${coachId}, ${name}, ${resourceType}, ${parentFolderId}, ${color}, ${icon})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

// Update folder
export async function updateFolder(folderId, updates) {
  try {
    const setClause = Object.keys(updates)
      .map((key, index) => `"${key}" = $${index + 2}`)
      .join(', ');
    
    const values = Object.values(updates);
    const query = `UPDATE "ResourceFolder" SET ${setClause}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
    
    const result = await sql.unsafe(query, [folderId, ...values]);
    return result[0];
  } catch (error) {
    console.error('Error updating folder:', error);
    throw error;
  }
}

// Delete folder (cascade deletes subfolders and deletes all resources in folder)
export async function deleteFolder(folderId) {
  try {
    // First, recursively get all subfolders
    const getAllSubfolders = async (parentId) => {
      const subfolders = await sql`
        SELECT id FROM "ResourceFolder" WHERE "parentFolderId" = ${parentId}
      `;
      
      let allIds = [parentId];
      for (const subfolder of subfolders) {
        const childIds = await getAllSubfolders(subfolder.id);
        allIds = [...allIds, ...childIds];
      }
      
      return allIds;
    };
    
    const allFolderIds = await getAllSubfolders(folderId);
    
    // Get all resources in these folders (to delete from S3)
    const resources = await sql`
      SELECT id, url FROM "Resource" WHERE "folderId" = ANY(${allFolderIds})
    `;
    
    // Delete all folders (cascade will handle subfolders)
    const result = await sql`
      DELETE FROM "ResourceFolder" WHERE id = ${folderId} RETURNING *
    `;
    
    // Return folder info and resources for S3 deletion
    return {
      folder: result[0],
      resources: resources // Resources will be deleted from S3 by the API route
    };
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
}

// Get folder by ID
export async function getFolderById(folderId) {
  try {
    const result = await sql`
      SELECT * FROM "ResourceFolder" WHERE id = ${folderId}
    `;
    return result[0];
  } catch (error) {
    console.error('Error fetching folder:', error);
    throw error;
  }
}

// Move folder to new parent
export async function moveFolder(folderId, newParentFolderId) {
  try {
    // Prevent moving folder into itself or its descendants
    if (newParentFolderId) {
      const path = await getFolderPath(newParentFolderId);
      const pathIds = path.map(f => f.id);
      if (pathIds.includes(folderId)) {
        throw new Error('Cannot move folder into itself or its descendants');
      }
    }
    
    const result = await sql`
      UPDATE "ResourceFolder"
      SET "parentFolderId" = ${newParentFolderId}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${folderId}
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Error moving folder:', error);
    throw error;
  }
}

// Get folder with resource count
export async function getFolderWithCount(folderId) {
  try {
    const result = await sql`
      SELECT 
        f.*,
        COUNT(r.id) as "resourceCount"
      FROM "ResourceFolder" f
      LEFT JOIN "Resource" r ON r."folderId" = f.id
      WHERE f.id = ${folderId}
      GROUP BY f.id
    `;
    return result[0];
  } catch (error) {
    console.error('Error fetching folder with count:', error);
    throw error;
  }
}

