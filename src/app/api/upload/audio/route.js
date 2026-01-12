import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';

// Create a custom HTTPS agent with debug logging
const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 50,
    rejectUnauthorized: true,
    timeout: 30000,
    proxy: false
});

// Add debug logging to the agent
httpsAgent.on('error', (err) => {
    console.error('HTTPS Agent Error:', err);
});

// Initialize S3 client for DigitalOcean Spaces (same config as library uploads)
const s3Client = new S3Client({
    endpoint: `https://${process.env.DO_SPACES_REGION}.${process.env.DO_SPACES_ENDPOINT}`,
    region: process.env.DO_SPACES_REGION,
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
    },
    forcePathStyle: true,
    maxAttempts: 3,
    requestTimeout: 30000,
    connectTimeout: 10000,
    logger: console,
    tls: true,
    useDualstackEndpoint: false,
    useGlobalEndpoint: false,
    requestHandler: {
        httpsAgent
    }
});

// Helper function to generate CDN URL
const getCdnUrl = (filePath) => {
    if (process.env.DO_SPACES_CDN_ENABLED === 'true') {
        return `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.cdn.${process.env.DO_SPACES_ENDPOINT}/${filePath}`;
    }
    return `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.${process.env.DO_SPACES_ENDPOINT}/${filePath}`;
};

export async function POST(request) {
    try {
        console.log('🚀 Voice message upload started');

        // Check environment variables
        if (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
            console.error('❌ Missing DigitalOcean Spaces credentials!');
            return NextResponse.json({
                success: false,
                error: 'Server configuration error: Missing S3 credentials'
            }, { status: 500 });
        }

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.error('❌ Unauthorized upload attempt');
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        console.log('✅ User authenticated:', session.user.email);

        const formData = await request.formData();
        const audioFile = formData.get('audio');

        if (!audioFile) {
            console.error('❌ No audio file in form data');
            return NextResponse.json({
                success: false,
                error: 'No audio file provided'
            }, { status: 400 });
        }

        console.log('📦 Received audio file:', {
            name: audioFile.name,
            type: audioFile.type,
            size: audioFile.size
        });

        // Validate file type
        if (!audioFile.type.startsWith('audio/')) {
            console.error('❌ Invalid file type:', audioFile.type);
            return NextResponse.json({
                success: false,
                error: 'Invalid file type'
            }, { status: 400 });
        }

        // Validate file size (max 10MB for voice messages)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (audioFile.size > maxSize) {
            console.error('❌ File too large:', audioFile.size);
            return NextResponse.json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            }, { status: 400 });
        }

        // Generate unique filename with proper extension
        let fileExtension = 'webm'; // Default
        if (audioFile.type.includes('webm')) {
            fileExtension = 'webm';
        } else if (audioFile.type.includes('ogg')) {
            fileExtension = 'ogg';
        } else if (audioFile.type.includes('wav')) {
            fileExtension = 'wav';
        } else {
            // Extract from mime type
            fileExtension = audioFile.type.split('/')[1]?.split(';')[0] || 'webm';
        }

        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = `chat/voice-messages/${fileName}`;

        console.log('📁 Uploading voice message to S3:', {
            filePath,
            type: audioFile.type,
            size: audioFile.size,
            sizeKB: (audioFile.size / 1024).toFixed(2) + ' KB'
        });

        // Convert file to buffer
        const buffer = await audioFile.arrayBuffer();
        const fileBuffer = Buffer.from(buffer);

        console.log('☁️ Starting S3 upload:', {
            bucket: process.env.DO_SPACES_BUCKET,
            region: process.env.DO_SPACES_REGION,
            endpoint: process.env.DO_SPACES_ENDPOINT,
            key: filePath,
            size: fileBuffer.length,
            contentType: audioFile.type
        });

        // Upload to DigitalOcean Spaces
        const command = new PutObjectCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: filePath,
            Body: fileBuffer,
            ContentType: audioFile.type,
            ACL: 'public-read',
            ContentLength: audioFile.size,
            CacheControl: 'max-age=31536000', // Cache for 1 year
        });

        try {
            await s3Client.send(command);

            // Generate public URL using CDN if enabled
            const publicUrl = getCdnUrl(filePath);

            console.log('✅ Voice message uploaded successfully:', fileName, 'Size:', fileBuffer.length, 'bytes');
            console.log('🔗 Audio URL:', publicUrl);

            return NextResponse.json({
                success: true,
                filePath: publicUrl, // Main URL field for consistency with frontend
                audioUrl: publicUrl, // Backward compatibility
                fileName,
                fileSize: fileBuffer.length,
                fileType: audioFile.type
            });
        } catch (uploadError) {
            console.error('Upload error details:', {
                error: uploadError,
                message: uploadError.message,
                code: uploadError.code,
                endpoint: s3Client.config.endpoint,
                bucket: process.env.DO_SPACES_BUCKET,
                fileSize: audioFile.size,
                fileType: audioFile.type
            });
            throw uploadError;
        }

    } catch (error) {
        console.error('Upload error:', {
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to upload audio file',
                details: error.message
            },
            { status: 500 }
        );
    }
}
