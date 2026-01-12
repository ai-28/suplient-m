import { S3Client, PutObjectCommand, HeadObjectCommand, PutBucketCorsCommand, PutObjectAclCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

// Initialize S3 client for DigitalOcean Spaces
export const s3Client = new S3Client({
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
// DigitalOcean Spaces supports both formats, but virtual-hosted-style is standard for public URLs
export const getCdnUrl = (filePath) => {
    if (process.env.DO_SPACES_CDN_ENABLED === 'true') {
        // CDN format: https://bucket.region.cdn.endpoint/path
        return `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.cdn.${process.env.DO_SPACES_ENDPOINT}/${filePath}`;
    }
    // Standard public URL format: https://bucket.region.endpoint/path
    return `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.${process.env.DO_SPACES_ENDPOINT}/${filePath}`;
};

// Generate presigned URL for direct S3 upload
export async function generatePresignedUrl(filePath, contentType, fileSize, expiresIn = 3600) {
    const command = new PutObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: filePath,
        ContentType: contentType,
        ACL: 'public-read',
        ContentLength: fileSize,
        CacheControl: 'max-age=31536000', // Cache for 1 year
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return presignedUrl;
}

// Verify file exists in S3
export async function verifyFileExists(filePath) {
    try {
        const command = new HeadObjectCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: filePath,
        });
        await s3Client.send(command);
        return true;
    } catch (error) {
        console.error('File verification error:', error);
        return false;
    }
}

// Configure CORS for the bucket (call this once to set up CORS)
export async function configureCORS() {
    try {
        const command = new PutBucketCorsCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                        AllowedOrigins: ['*'], // In production, replace with your domain
                        ExposeHeaders: ['ETag'],
                        MaxAgeSeconds: 3600,
                    },
                ],
            },
        });
        await s3Client.send(command);
        console.log('✅ CORS configured successfully');
        return true;
    } catch (error) {
        console.error('❌ Error configuring CORS:', error);
        return false;
    }
}

// Fix ACL for an uploaded file (make it publicly readable)
export async function setFilePublic(filePath) {
    try {
        const command = new PutObjectAclCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: filePath,
            ACL: 'public-read',
        });
        await s3Client.send(command);
        console.log(`✅ File ACL set to public-read: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`❌ Error setting file ACL: ${filePath}`, error);
        return false;
    }
}

// Initiate multipart upload
export async function createMultipartUpload(filePath, contentType) {
    try {
        const command = new CreateMultipartUploadCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: filePath,
            ContentType: contentType,
            ACL: 'public-read',
            CacheControl: 'max-age=31536000',
        });
        const response = await s3Client.send(command);
        return response.UploadId;
    } catch (error) {
        console.error('Error creating multipart upload:', error);
        throw error;
    }
}

// Generate presigned URL for uploading a part
export async function generatePartPresignedUrl(filePath, uploadId, partNumber, expiresIn = 3600) {
    try {
        const command = new UploadPartCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: filePath,
            UploadId: uploadId,
            PartNumber: partNumber,
        });
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        return presignedUrl;
    } catch (error) {
        console.error('Error generating part presigned URL:', error);
        throw error;
    }
}

// Complete multipart upload
export async function completeMultipartUpload(filePath, uploadId, parts) {
    try {
        const command = new CompleteMultipartUploadCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: filePath,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
            },
        });
        const response = await s3Client.send(command);
        return response;
    } catch (error) {
        console.error('Error completing multipart upload:', error);
        throw error;
    }
}

// Abort multipart upload (cleanup on failure)
export async function abortMultipartUpload(filePath, uploadId) {
    try {
        const command = new AbortMultipartUploadCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: filePath,
            UploadId: uploadId,
        });
        await s3Client.send(command);
        console.log(`✅ Aborted multipart upload: ${filePath}`);
    } catch (error) {
        console.error(`❌ Error aborting multipart upload: ${filePath}`, error);
    }
}

// Extract file path from CDN URL
export function extractFilePathFromUrl(url) {
    if (!url) return null;
    
    try {
        // Handle CDN format: https://bucket.region.cdn.endpoint/path
        // Or standard format: https://bucket.region.endpoint/path
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        
        // Remove leading slash
        return pathname.startsWith('/') ? pathname.slice(1) : pathname;
    } catch (error) {
        console.error('Error extracting file path from URL:', error);
        return null;
    }
}

// Delete file from S3
export async function deleteFileFromS3(filePath) {
    try {
        if (!filePath) {
            console.warn('⚠️ No file path provided for deletion');
            return false;
        }

        const command = new DeleteObjectCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: filePath,
        });
        
        await s3Client.send(command);
        console.log(`✅ File deleted from S3: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`❌ Error deleting file from S3: ${filePath}`, error);
        return false;
    }
}

