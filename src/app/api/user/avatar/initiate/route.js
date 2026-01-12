import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { generatePresignedUrl, getCdnUrl, configureCORS } from '@/app/lib/s3Client';
import { v4 as uuidv4 } from 'uuid';

// Track if CORS has been configured (to avoid repeated calls)
let corsConfigured = false;

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
            return NextResponse.json(
                { success: false, error: 'Server configuration error: Missing S3 credentials' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { fileName, fileSize, fileType } = body;

        // Validate required fields
        if (!fileName || !fileSize || !fileType) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: fileName, fileSize, fileType' },
                { status: 400 }
            );
        }

        // Get file information
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

        // Validate file type
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        const isValidMimeType = ALLOWED_MIME_TYPES.includes(fileType);
        const isValidExtension = allowedExtensions.includes(fileExtension);

        if (!isValidMimeType && !isValidExtension) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid file type (${fileType || 'unknown'}). Please upload a JPG, PNG, WebP, or GIF image.`,
                    details: `File: ${fileName}, Type: ${fileType}, Extension: ${fileExtension}, Size: ${fileSizeMB}MB`
                },
                { status: 400 }
            );
        }

        // Validate file size
        if (fileSize > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    success: false,
                    error: `File size too large (${fileSizeMB}MB). Maximum size is 10MB.`,
                    details: `File: ${fileName}, Size: ${fileSizeMB}MB, Max: 10MB. Please compress or resize your image.`
                },
                { status: 400 }
            );
        }

        // Configure CORS if not already configured (one-time setup)
        if (!corsConfigured) {
            try {
                await configureCORS();
                corsConfigured = true;
                console.log('✅ CORS configured automatically for avatar uploads');
            } catch (corsError) {
                console.warn('⚠️ Could not auto-configure CORS. Please configure manually in DigitalOcean dashboard:', corsError.message);
                // Continue anyway - user might have configured it manually
            }
        }

        // Generate unique filename
        const finalExtension = fileExtension || 'jpg';
        const uniqueFileName = `avatar-${session.user.id}-${uuidv4()}.${finalExtension}`;
        const filePath = `avatars/${uniqueFileName}`;

        // Generate presigned URL for direct S3 upload
        const presignedUrl = await generatePresignedUrl(filePath, fileType, fileSize, 3600);

        return NextResponse.json({
            success: true,
            presignedUrl,
            filePath,
            fileName: uniqueFileName,
            publicUrl: getCdnUrl(filePath),
            expiresIn: 3600, // 1 hour
        });
    } catch (error) {
        console.error('Error generating presigned URL for avatar:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to generate upload URL',
                details: error.message
            },
            { status: 500 }
        );
    }
}

