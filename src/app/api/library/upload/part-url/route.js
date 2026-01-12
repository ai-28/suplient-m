import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption";
import { generatePartPresignedUrl } from "@/app/lib/s3Client";

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { filePath, uploadId, partNumber } = body;

        if (!filePath || !uploadId || !partNumber) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: filePath, uploadId, partNumber' },
                { status: 400 }
            );
        }

        if (partNumber < 1 || partNumber > 10000) {
            return NextResponse.json(
                { success: false, error: 'Part number must be between 1 and 10000' },
                { status: 400 }
            );
        }

        // Generate presigned URL for this part
        const presignedUrl = await generatePartPresignedUrl(filePath, uploadId, partNumber, 3600);

        return NextResponse.json({
            success: true,
            presignedUrl,
            partNumber,
            expiresIn: 3600,
        });
    } catch (error) {
        console.error('Error generating part presigned URL:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to generate part upload URL',
                details: error.message
            },
            { status: 500 }
        );
    }
}

