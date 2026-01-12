import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption";
import { configureCORS } from "@/app/lib/s3Client";

// This endpoint should be called once to configure CORS on the DigitalOcean Spaces bucket
// Only accessible by admins
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Only allow admins to configure CORS
        if (session.user.role !== 'admin') {
            return NextResponse.json({ message: "Forbidden - Admin only" }, { status: 403 });
        }

        const success = await configureCORS();

        if (success) {
            return NextResponse.json({
                success: true,
                message: 'CORS configured successfully for DigitalOcean Spaces bucket'
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Failed to configure CORS. Check server logs for details.'
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error configuring CORS:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to configure CORS',
                details: error.message
            },
            { status: 500 }
        );
    }
}

