import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption";
import { userRepo } from "@/app/lib/db/userRepo";
import { getFoldersByType, createFolder, getFolderTree } from "@/app/lib/db/folderRepo";

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get('resourceType'); // video, image, article, sound
    const parentFolderId = searchParams.get('parentFolderId') || null;
    const tree = searchParams.get('tree') === 'true'; // Return tree structure

    if (!resourceType) {
      return NextResponse.json({ message: "resourceType is required" }, { status: 400 });
    }

    let folders;
    if (tree) {
      folders = await getFolderTree(user.id, resourceType);
    } else {
      const parentId = parentFolderId === 'null' || parentFolderId === '' ? null : parentFolderId;
      folders = await getFoldersByType(user.id, resourceType, parentId);
    }

    return NextResponse.json({ status: true, folders });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

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
    const { name, resourceType, parentFolderId, color, icon } = body;

    if (!name || !resourceType) {
      return NextResponse.json({ message: "name and resourceType are required" }, { status: 400 });
    }

    const folder = await createFolder(
      user.id, 
      name, 
      resourceType, 
      parentFolderId || null, 
      color || null, 
      icon || null
    );

    return NextResponse.json({ status: true, folder });
  } catch (error) {
    console.error('Error creating folder:', error);
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ message: "Folder with this name already exists in this location" }, { status: 409 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

