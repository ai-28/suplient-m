import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { chatRepo } from '@/app/lib/db/chatSchema';

// Helper function for admin-coach conversation lookup (admin side)
async function handleAdminCoachLookup(adminId, coachId, session, sql) {
    try {
        // Verify admin is making the request
        if (session.user.role !== 'admin' || session.user.id !== adminId) {
            return NextResponse.json({
                success: false,
                error: 'Only admins can lookup admin-coach conversations'
            }, { status: 403 });
        }

        // Verify coach exists
        const coachResult = await sql`
            SELECT id, role FROM "User" WHERE id = ${coachId} AND role = 'coach' AND "isActive" = true
        `;

        if (coachResult.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Coach not found'
            }, { status: 404 });
        }

        // Get or create conversation
        let conversationId = await chatRepo.getAdminCoachConversationId(adminId, coachId);
        
        if (!conversationId) {
            conversationId = await chatRepo.createAdminCoachConversation(adminId, coachId);
        }

        return NextResponse.json({
            success: true,
            conversationId: conversationId
        });
    } catch (error) {
        console.error('Error in admin-coach lookup:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to lookup admin-coach conversation',
            details: error.message
        }, { status: 500 });
    }
}

// Helper function for admin-coach conversation lookup (coach side)
async function handleCoachAdminLookup(coachId, sql) {
    try {
        // Find the admin-coach conversation for this coach
        const conversations = await sql`
            SELECT c.id, cp2."userId" as "adminId"
            FROM "Conversation" c
            JOIN "ConversationParticipant" cp1 ON c.id = cp1."conversationId" AND cp1."userId" = ${coachId} AND cp1."isActive" = true
            JOIN "ConversationParticipant" cp2 ON c.id = cp2."conversationId" AND cp2."isActive" = true AND cp2."userId" != ${coachId}
            JOIN "User" u ON cp2."userId" = u.id AND u.role = 'admin'
            WHERE c.type = 'admin_coach'
            AND c."isActive" = true
            LIMIT 1
        `;

        if (conversations.length > 0) {
            return NextResponse.json({
                success: true,
                conversationId: conversations[0].id
            });
        }

        // If no conversation exists, we need to find an admin to create one with
        // Get the first active admin
        const admin = await sql`
            SELECT id FROM "User" 
            WHERE role = 'admin' AND "isActive" = true 
            ORDER BY "createdAt" ASC 
            LIMIT 1
        `;

        if (admin.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No admin found'
            }, { status: 404 });
        }

        // Create conversation with the first admin
        const conversationId = await chatRepo.createAdminCoachConversation(admin[0].id, coachId);

        return NextResponse.json({
            success: true,
            conversationId: conversationId
        });
    } catch (error) {
        console.error('Error in coach-admin lookup:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to lookup admin-coach conversation',
            details: error.message
        }, { status: 500 });
    }
}

export async function GET(request) {
    try {

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');
        const coachId = searchParams.get('coachId');
        const adminId = searchParams.get('adminId');
        const targetCoachId = searchParams.get('targetCoachId');
        const coachLookingForAdmin = searchParams.get('coachLookingForAdmin'); // Coach side lookup

        // Check if this is an admin-coach lookup (admin side)
        if (adminId && targetCoachId) {
            return handleAdminCoachLookup(adminId, targetCoachId, session, sql);
        }

        // Check if this is an admin-coach lookup (coach side)
        if (coachLookingForAdmin === 'true' && session.user.role === 'coach') {
            return handleCoachAdminLookup(session.user.id, sql);
        }

        if (!clientId || !coachId) {
            return NextResponse.json({
                success: false,
                error: 'Client ID and Coach ID are required',
                receivedParams: { clientId, coachId }
            }, { status: 400 });
        }

        // Check if client exists
        const clientResult = await sql`
            SELECT id, "userId", "coachId" FROM "Client" WHERE "userId" = ${clientId}
        `;

        if (clientResult.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Client not found',
                clientId: clientId
            }, { status: 404 });
        }

        const clientData = clientResult[0];

        // Check if coach matches
        if (clientData.coachId !== coachId) {
            return NextResponse.json({
                success: false,
                error: 'Coach mismatch',
                clientCoachId: clientData.coachId,
                requestedCoachId: coachId
            }, { status: 403 });
        }

        const clientUserId = clientData.userId;

        // Look for existing conversation (simplified query)
        const existingConversation = await sql`
            SELECT c.id
            FROM "Conversation" c
            WHERE c.type = 'personal'
            AND c."createdBy" = ${coachId}
            AND c."isActive" = true
            AND EXISTS (
                SELECT 1 FROM "ConversationParticipant" cp1 
                WHERE cp1."conversationId" = c.id AND cp1."userId" = ${coachId}
            )
            AND EXISTS (
                SELECT 1 FROM "ConversationParticipant" cp2 
                WHERE cp2."conversationId" = c.id AND cp2."userId" = ${clientUserId}
            )
            LIMIT 1
        `;

        if (existingConversation.length > 0) {
            return NextResponse.json({
                success: true,
                conversationId: existingConversation[0].id
            });
        }

        // Create new conversation
        const newConversation = await sql`
            INSERT INTO "Conversation" (type, "createdBy", "isActive")
            VALUES ('personal', ${coachId}, true)
            RETURNING id
        `;

        const conversationId = newConversation[0].id;

        // Add participants with roles
        await sql`
            INSERT INTO "ConversationParticipant" ("conversationId", "userId", role, "isActive")
            VALUES (${conversationId}, ${coachId}, 'admin', true)
        `;

        await sql`
            INSERT INTO "ConversationParticipant" ("conversationId", "userId", role, "isActive")
            VALUES (${conversationId}, ${clientUserId}, 'member', true)
        `;

        return NextResponse.json({
            success: true,
            conversationId: conversationId
        });

    } catch (error) {
        console.error('❌ DEBUG: Error in conversation lookup:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to lookup conversation',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}