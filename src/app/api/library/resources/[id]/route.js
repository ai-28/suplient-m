import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption";
import { userRepo } from "@/app/lib/db/userRepo";
import { getResourceById, deleteResource } from "@/app/lib/db/resourceRepo";
import { deleteFileFromS3, extractFilePathFromUrl } from "@/app/lib/s3Client";

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

    // Get resource to verify ownership and get file URL
    const resource = await getResourceById(id);
    if (!resource) {
      return NextResponse.json({ message: "Resource not found" }, { status: 404 });
    }

    // Check ownership
    if (resource.coachId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Delete file from S3 if URL exists
    if (resource.url) {
      try {
        const filePath = extractFilePathFromUrl(resource.url);
        if (filePath) {
          await deleteFileFromS3(filePath);
        }
      } catch (s3Error) {
        console.error('Error deleting file from S3:', s3Error);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await deleteResource(id);

    return NextResponse.json({ 
      status: true, 
      message: "Resource deleted successfully" 
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

