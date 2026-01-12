import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

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
        // Remove leading slash from pathname
        return urlObj.pathname.substring(1);
    } catch {
        return null;
    }
};

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check S3 credentials and configuration
        if (!process.env.DO_SPACES_KEY ||
            !process.env.DO_SPACES_SECRET ||
            !process.env.DO_SPACES_BUCKET ||
            !process.env.DO_SPACES_REGION ||
            !process.env.DO_SPACES_ENDPOINT) {
            console.error('❌ Missing DigitalOcean Spaces credentials!');
            console.error('Missing env vars:', {
                hasKey: !!process.env.DO_SPACES_KEY,
                hasSecret: !!process.env.DO_SPACES_SECRET,
                hasBucket: !!process.env.DO_SPACES_BUCKET,
                hasRegion: !!process.env.DO_SPACES_REGION,
                hasEndpoint: !!process.env.DO_SPACES_ENDPOINT
            });
            return NextResponse.json(
                { success: false, error: 'Server configuration error: Missing S3 credentials' },
                { status: 500 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('avatar');

        if (!file) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'No file provided',
                    details: 'Please select an image file to upload.'
                },
                { status: 400 }
            );
        }

        // Get file information for error reporting
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const fileInfo = {
            fileName: file.name,
            fileType: file.type,
            fileExtension: fileExtension,
            fileSize: file.size,
            fileSizeMB: fileSizeMB
        };

        // Validate file type - check MIME type first, then fallback to file extension
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        const isValidMimeType = ALLOWED_MIME_TYPES.includes(file.type);
        const isValidExtension = allowedExtensions.includes(fileExtension);

        if (!isValidMimeType && !isValidExtension) {
            // Provide more detailed error message
            const detectedType = file.type || 'unknown';
            const detectedExtension = fileExtension || 'none';
            console.error('❌ Invalid file type:', fileInfo);

            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid file type (${detectedType || 'unknown'}). Please upload a JPG, PNG, WebP, or GIF image.`,
                    details: `File: ${file.name}, Type: ${detectedType}, Extension: ${detectedExtension}, Size: ${fileSizeMB}MB. HEIC files should be converted to JPEG first.`
                },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            console.error('❌ File too large:', fileInfo);
            return NextResponse.json(
                {
                    success: false,
                    error: `File size too large (${fileSizeMB}MB). Maximum size is 5MB.`,
                    details: `File: ${file.name}, Size: ${fileSizeMB}MB, Max: 5MB. Please compress or resize your image.`
                },
                { status: 400 }
            );
        }

        // Get current user to check for existing avatar
        const userResult = await sql`
            SELECT avatar FROM "User" WHERE id = ${session.user.id}
        `;

        const oldAvatarUrl = userResult[0]?.avatar;

        // Generate unique filename with proper extension (use the already extracted fileExtension)
        const finalExtension = fileExtension || 'jpg';
        const fileName = `avatar-${session.user.id}-${uuidv4()}.${finalExtension}`;
        const filePath = `avatars/${fileName}`;

        // Convert file to buffer
        const buffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(buffer);

        // Upload to DigitalOcean Spaces
        try {
            const command = new PutObjectCommand({
                Bucket: process.env.DO_SPACES_BUCKET,
                Key: filePath,
                Body: fileBuffer,
                ContentType: file.type,
                ACL: 'public-read',
                ContentLength: file.size,
                CacheControl: 'max-age=31536000', // Cache for 1 year
            });

            await s3Client.send(command);
            console.log('✅ File uploaded to S3:', filePath);
        } catch (s3Error) {
            console.error('❌ S3 upload error:', {
                error: s3Error.message,
                code: s3Error.code,
                fileName: file.name,
                filePath: filePath,
                fileSize: file.size
            });
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to upload image to storage',
                    details: `S3 Error: ${s3Error.message || 'Unknown error'}. File: ${file.name} (${fileSizeMB}MB)`
                },
                { status: 500 }
            );
        }

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
        const errorDetails = {
            message: error.message,
            name: error.name,
            code: error.code,
            stack: error.stack
        };
        console.error('❌ Error uploading avatar:', errorDetails);
        console.error('Full error object:', error);

        // Provide detailed error information
        let errorMessage = 'Failed to upload avatar';
        let errorDescription = null;

        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            errorMessage = 'Connection error';
            errorDescription = 'Unable to connect to storage service. Please try again later.';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Upload timeout';
            errorDescription = 'The upload took too long. Please try again with a smaller file.';
        } else if (error.message) {
            errorMessage = error.message;
            errorDescription = 'An unexpected error occurred during upload.';
        }

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                details: errorDescription || `Error: ${error.name || 'Unknown error'}`
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get current user avatar URL
        const userResult = await sql`
            SELECT avatar FROM "User" WHERE id = ${session.user.id}
        `;

        const avatarUrl = userResult[0]?.avatar;

        // Remove avatar from database
        await sql`
            UPDATE "User"
            SET avatar = NULL, "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = ${session.user.id}
        `;

        // Delete avatar from S3 if it exists
        if (avatarUrl) {
            try {
                const filePath = extractFilePathFromUrl(avatarUrl);
                if (filePath && filePath.includes('avatars/')) {
                    const deleteCommand = new DeleteObjectCommand({
                        Bucket: process.env.DO_SPACES_BUCKET,
                        Key: filePath,
                    });
                    await s3Client.send(deleteCommand);
                    console.log('✅ Avatar deleted from S3:', filePath);
                }
            } catch (deleteError) {
                console.warn('⚠️ Failed to delete avatar from S3:', deleteError);
                // Don't fail if deletion fails
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Avatar deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting avatar:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete avatar' },
            { status: 500 }
        );
    }
}

