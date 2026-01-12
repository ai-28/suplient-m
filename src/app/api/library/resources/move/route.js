import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption";
import { userRepo } from "@/app/lib/db/userRepo";
import { updateResource } from "@/app/lib/db/resourceRepo";
import { sql } from "@/app/lib/db/postgresql";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;
    const user = await userRepo.getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { resourceIds, folderId } = body;

    if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
      return NextResponse.json(
        { message: "resourceIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Verify all resources belong to the user
    const resources = await sql`
      SELECT id, "coachId" FROM "Resource"
      WHERE id = ANY(${resourceIds})
    `;

    if (resources.length !== resourceIds.length) {
      return NextResponse.json(
        { message: "Some resources were not found" },
        { status: 404 }
      );
    }

    const unauthorizedResources = resources.filter(
      r => r.coachId !== user.id && user.role !== 'admin'
    );

    if (unauthorizedResources.length > 0) {
      return NextResponse.json(
        { message: "Some resources are not accessible" },
        { status: 403 }
      );
    }

    // If folderId is provided, verify it exists and belongs to the user
    if (folderId) {
      const folder = await sql`
        SELECT id, "coachId" FROM "ResourceFolder"
        WHERE id = ${folderId}
      `;

      if (folder.length === 0) {
        return NextResponse.json(
          { message: "Folder not found" },
          { status: 404 }
        );
      }

      if (folder[0].coachId !== user.id && user.role !== 'admin') {
        return NextResponse.json(
          { message: "Folder is not accessible" },
          { status: 403 }
        );
      }
    }

    // Update all resources
    const updatePromises = resourceIds.map(resourceId =>
      updateResource(resourceId, { folderId: folderId || null })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      status: true,
      message: `${resourceIds.length} file(s) moved successfully`
    });
  } catch (error) {
    console.error('Error moving files:', error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

