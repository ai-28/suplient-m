import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption";
import { userRepo } from "@/app/lib/db/userRepo";
import { verifyFileExists, getCdnUrl, setFilePublic } from "@/app/lib/s3Client";
import { saveVideo, saveImage, savePDF, saveSound } from "@/app/lib/db/resourceRepo.js";

// Map categories to save functions
const SAVE_FUNCTIONS = {
    videos: saveVideo,
    images: saveImage,
    articles: savePDF,
    sounds: saveSound,
};

// Map categories to resource types
const RESOURCE_TYPES = {
    videos: 'video',
    images: 'image',
    articles: 'article',
    sounds: 'sound',
};

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { filePath, fileName, title, description, author, category, fileSize, fileType, folderId } = body;

        // Validate required fields
        if (!filePath || !fileName || !title || !description || !category) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: filePath, fileName, title, description, category' },
                { status: 400 }
            );
        }

        // Validate category
        const validCategories = ['videos', 'images', 'articles', 'sounds'];
        if (!validCategories.includes(category)) {
            return NextResponse.json(
                { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
                { status: 400 }
            );
        }

        // Verify file exists in S3
        const fileExists = await verifyFileExists(filePath);
        if (!fileExists) {
            return NextResponse.json(
                { success: false, error: 'File not found in storage. Upload may have failed.' },
                { status: 404 }
            );
        }

        // Ensure file is publicly readable (fix ACL if needed)
        await setFilePublic(filePath);

        // Get user
        const email = session.user.email;
        const user = await userRepo.getUserByEmail(email);
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Generate public URL
        const publicUrl = getCdnUrl(filePath);

        // Get the appropriate save function
        const saveFunction = SAVE_FUNCTIONS[category];
        const resourceType = RESOURCE_TYPES[category];

        if (!saveFunction) {
            return NextResponse.json(
                { success: false, error: 'Invalid category' },
                { status: 400 }
            );
        }

        // Save to database
        let resource;
        if (category === 'articles') {
            resource = await saveFunction(
                title,
                user.id,
                resourceType,
                publicUrl,
                description,
                author || '',
                fileSize || null,
                fileType || null,
                folderId || null
            );
        } else {
            resource = await saveFunction(
                title,
                user.id,
                resourceType,
                publicUrl,
                description,
                '',
                fileSize || null,
                fileType || null,
                folderId || null
            );
        }

        return NextResponse.json({
            success: true,
            status: true,
            message: `${category.charAt(0).toUpperCase() + category.slice(1)} uploaded successfully`,
            data: {
                url: publicUrl,
                filename: fileName,
                [category.slice(0, -1)]: resource // video, image, article, sound
            }
        });
    } catch (error) {
        console.error('Error completing upload:', error);
        return NextResponse.json(
            {
                success: false,
                status: false,
                message: 'Failed to complete upload',
                error: error.message
            },
            { status: 500 }
        );
    }
}

