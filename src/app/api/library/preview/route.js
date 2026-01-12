import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption";
import { getCdnUrl } from "@/app/lib/s3Client";

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const filePath = searchParams.get('path');

        if (!filePath) {
            return NextResponse.json({ message: "File path is required" }, { status: 400 });
        }

        // Since files are now publicly accessible, redirect to direct URL instead of proxying
        // This is much faster and doesn't load files into server memory
        let directUrl;

        if (filePath.startsWith('http')) {
            // If it's already a full URL, use it directly
            directUrl = filePath;
        } else if (filePath.includes('library/')) {
            // If it's a key path (starts with library/), generate the public URL
            directUrl = getCdnUrl(filePath);
        } else {
            // Try to extract key from URL or assume it's a key path
            try {
                const url = new URL(filePath);
                const pathParts = url.pathname.substring(1).split('/').filter(part => part);
                // For DigitalOcean Spaces URLs, the key is the path after the domain
                const key = pathParts.join('/');
                directUrl = getCdnUrl(key);
            } catch (error) {
                // If URL parsing fails, assume it's a key path
                directUrl = getCdnUrl(filePath);
            }
        }

        return NextResponse.redirect(directUrl, 302);

    } catch (error) {
        console.error('Preview error:', error);
        return NextResponse.json({
            message: "Failed to preview file",
            error: error.message
        }, { status: 500 });
    }
}
