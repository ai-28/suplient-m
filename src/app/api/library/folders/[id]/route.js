import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption";
import { userRepo } from "@/app/lib/db/userRepo";
import {
  getFolderById,
  updateFolder,
  deleteFolder,
  moveFolder,
  getFolderPath,
  getFolderWithCount
} from "@/app/lib/db/folderRepo";
import { deleteFileFromS3, extractFilePathFromUrl } from "@/app/lib/s3Client";
import { deleteResource } from "@/app/lib/db/resourceRepo";

export async function GET(request, { params }) {
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

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const withCount = searchParams.get('withCount') === 'true';
    const withPath = searchParams.get('withPath') === 'true';

    let folder;
    if (withCount) {
      folder = await getFolderWithCount(id);
    } else {
      folder = await getFolderById(id);
    }

    if (!folder) {
      return NextResponse.json({ message: "Folder not found" }, { status: 404 });
    }

    // Check ownership
    if (folder.coachId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const result = { folder };

    if (withPath) {
      result.path = await getFolderPath(id);
    }

    return NextResponse.json({ status: true, ...result });
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
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

    const { id } = await params;
    const body = await request.json();
    const { name, color, icon, parentFolderId } = body;

    // Check ownership
    const folder = await getFolderById(id);
    if (!folder) {
      return NextResponse.json({ message: "Folder not found" }, { status: 404 });
    }

    if (folder.coachId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Handle move operation separately
    if (parentFolderId !== undefined && parentFolderId !== folder.parentFolderId) {
      const movedFolder = await moveFolder(id, parentFolderId);
      return NextResponse.json({ status: true, folder: movedFolder });
    }

    // Update other fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    const updatedFolder = await updateFolder(id, updates);

    return NextResponse.json({ status: true, folder: updatedFolder });
  } catch (error) {
    console.error('Error updating folder:', error);
    if (error.message.includes('Cannot move folder')) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ message: "Folder with this name already exists in this location" }, { status: 409 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
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

    const { id } = await params;

    // Check ownership
    const folder = await getFolderById(id);
    if (!folder) {
      return NextResponse.json({ message: "Folder not found" }, { status: 404 });
    }

    if (folder.coachId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const result = await deleteFolder(id);

    // Delete all resources in the folder from S3 and database
    if (result.resources && result.resources.length > 0) {
      for (const resource of result.resources) {
        try {
          // Delete from S3
          if (resource.url) {
            const filePath = extractFilePathFromUrl(resource.url);
            if (filePath) {
              await deleteFileFromS3(filePath);
            }
          }
          // Delete from database
          await deleteResource(resource.id);
        } catch (error) {
          console.error(`Error deleting resource ${resource.id}:`, error);
          // Continue deleting other resources even if one fails
        }
      }
    }

    return NextResponse.json({ status: true, message: "Folder and all files deleted successfully" });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

