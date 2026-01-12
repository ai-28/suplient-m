import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { verifyFileExists, setFilePublic } from '@/app/lib/s3Client';

// Initialize S3 client for DigitalOcean Spaces
const s3Client = new S3Client({
    endpoint: `https://${process.env.DO_SPACES_REGION}.${process.env.DO_SPACES_ENDPOINT}`,
    region: process.env.DO_SPACES_REGION,
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
    },
    forcePathStyle: true,
});

// Helper function to generate CDN URL
const getCdnUrl = (filePath) => {
    if (process.env.DO_SPACES_CDN_ENABLED === 'true') {
        return `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.cdn.${process.env.DO_SPACES_ENDPOINT}/${filePath}`;
    }
    return `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.${process.env.DO_SPACES_ENDPOINT}/${filePath}`;
};

// Extract file path from CDN URL for deletion
const extractFilePathFromUrl = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.substring(1);
    } catch {
        return null;
    }
};

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { filePath } = body;

        if (!filePath) {
            return NextResponse.json(
                { success: false, error: 'Missing filePath' },
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

        // Explicitly set file ACL to public-read (ensures file is accessible)
        try {
            await setFilePublic(filePath);
            console.log('✅ Avatar file ACL set to public-read:', filePath);
        } catch (aclError) {
            console.warn('⚠️ Failed to set file ACL (file may still be accessible):', aclError.message);
            // Continue anyway - file might already be public or ACL might be set via presigned URL
        }

        // Get current user to check for existing avatar
        const userResult = await sql`
            SELECT avatar FROM "User" WHERE id = ${session.user.id}
        `;

        const oldAvatarUrl = userResult[0]?.avatar;
        const avatarUrl = getCdnUrl(filePath);

        // Update user record with new avatar URL
        const updateResult = await sql`
            UPDATE "User"
            SET avatar = ${avatarUrl}, "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = ${session.user.id}
            RETURNING id, name, email, avatar
        `;

        // Delete old avatar from S3 if it exists
        if (oldAvatarUrl) {
            try {
                const oldFilePath = extractFilePathFromUrl(oldAvatarUrl);
                if (oldFilePath && oldFilePath.includes('avatars/')) {
                    const deleteCommand = new DeleteObjectCommand({
                        Bucket: process.env.DO_SPACES_BUCKET,
                        Key: oldFilePath,
                    });
                    await s3Client.send(deleteCommand);
                    console.log('✅ Old avatar deleted from S3:', oldFilePath);
                }
            } catch (deleteError) {
                console.warn('⚠️ Failed to delete old avatar:', deleteError);
                // Don't fail the upload if deletion fails
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatarUrl: avatarUrl,
            user: updateResult[0]
        });

    } catch (error) {
        console.error('Error completing avatar upload:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to complete avatar upload',
                details: error.message
            },
            { status: 500 }
        );
    }
}

