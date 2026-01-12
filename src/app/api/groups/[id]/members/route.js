import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

// GET /api/groups/[id]/members - Get group members
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: groupId } = await params;

        if (!groupId) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        // Verify the group exists and user has access (coach owns it OR client is a member)
        const groupResult = await sql`
            SELECT g.id, g.name, g."selectedMembers", g."coachId"
            FROM "Group" g
            WHERE g.id = ${groupId}
        `;

        if (groupResult.length === 0) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const group = groupResult[0];

        // Check access: coach owns it OR client is a member
        const isCoachOwner = session.user.role === 'coach' && group.coachId === session.user.id;
        let isClientMember = false;

        if (session.user.role === 'client') {
            const clientRecord = await sql`
                SELECT id FROM "Client" WHERE "userId" = ${session.user.id}
            `;
            if (clientRecord.length > 0) {
                const clientId = clientRecord[0].id;
                isClientMember = group.selectedMembers && group.selectedMembers.includes(clientId);
            }
        }

        if (!isCoachOwner && !isClientMember) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const memberIds = group.selectedMembers || [];

        if (memberIds.length === 0) {
            return NextResponse.json({
                group: {
                    id: group.id,
                    name: group.name,
                    memberCount: 0
                },
                members: []
            });
        }

        // Get detailed information about each member with avatars
        const membersResult = await sql`
            SELECT 
                c.id,
                c."userId",
                u.name,
                u.email,
                u.avatar,
                c.status,
                c."createdAt",
                c."updatedAt"
            FROM "Client" c
            LEFT JOIN "User" u ON c."userId" = u.id
            WHERE c.id = ANY(${memberIds})
            ORDER BY u.name ASC
        `;

        // Transform the data to match expected format
        const members = membersResult.map(client => ({
            id: client.id,
            userId: client.userId, // Include userId for notifications
            name: client.name,
            email: client.email,
            avatar: client.avatar, // Include avatar
            initial: client.name.charAt(0).toUpperCase(),
            status: client.status === 'active' ? 'active' : 'inactive',
            joinDate: new Date(client.createdAt).toISOString().split('T')[0],
            createdAt: client.createdAt,
            updatedAt: client.updatedAt
        }));

        return NextResponse.json({
            group: {
                id: group.id,
                name: group.name,
                memberCount: members.length
            },
            members
        });

    } catch (error) {
        console.error('Get group members error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// PUT /api/groups/[id]/members - Add members to a group
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: groupId } = await params;
        const body = await request.json();
        const { clientIds } = body;

        if (!groupId) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return NextResponse.json({ error: 'Client IDs are required' }, { status: 400 });
        }

        // Verify the group belongs to the current coach
        const groupResult = await sql`
            SELECT g.id, g.name, g."selectedMembers", g."coachId"
            FROM "Group" g
            WHERE g.id = ${groupId} AND g."coachId" = ${session.user.id}
        `;

        if (groupResult.length === 0) {
            return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 });
        }

        const group = groupResult[0];
        const currentMembers = group.selectedMembers || [];

        // Verify all clients belong to the coach
        const clientsResult = await sql`
            SELECT c.id, c.name, c.email
            FROM "Client" c
            WHERE c.id = ANY(${clientIds}) AND c."coachId" = ${session.user.id}
        `;

        if (clientsResult.length !== clientIds.length) {
            return NextResponse.json({
                error: 'Some clients not found or don\'t belong to you'
            }, { status: 400 });
        }

        // Check for duplicates
        const duplicateIds = clientIds.filter(id => currentMembers.includes(id));
        if (duplicateIds.length > 0) {
            return NextResponse.json({
                error: 'Some clients are already members of this group'
            }, { status: 400 });
        }

        // Add new members to the group
        const updatedMembers = [...currentMembers, ...clientIds];

        const updatedGroup = await sql`
            UPDATE "Group"
            SET 
                "selectedMembers" = ${updatedMembers},
                "memberCount" = ${updatedMembers.length},
                "updatedAt" = NOW()
            WHERE id = ${groupId}
            RETURNING *
        `;

        return NextResponse.json({
            message: 'Members added successfully',
            group: {
                id: updatedGroup[0].id,
                name: updatedGroup[0].name,
                memberCount: updatedGroup[0].memberCount,
                selectedMembers: updatedGroup[0].selectedMembers
            },
            addedClients: clientsResult.map(client => ({
                id: client.id,
                name: client.name,
                email: client.email
            }))
        });

    } catch (error) {
        console.error('Add members to group error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// DELETE /api/groups/[id]/members - Remove members from a group
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: groupId } = await params;
        const body = await request.json();
        const { clientIds } = body;

        if (!groupId) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return NextResponse.json({ error: 'Client IDs are required' }, { status: 400 });
        }

        // Verify the group belongs to the current coach
        const groupResult = await sql`
            SELECT g.id, g.name, g."selectedMembers", g."coachId"
            FROM "Group" g
            WHERE g.id = ${groupId} AND g."coachId" = ${session.user.id}
        `;

        if (groupResult.length === 0) {
            return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 });
        }

        const group = groupResult[0];
        const currentMembers = group.selectedMembers || [];

        // Remove specified members from the group
        const updatedMembers = currentMembers.filter(id => !clientIds.includes(id));

        // Check if any members were actually removed
        if (updatedMembers.length === currentMembers.length) {
            return NextResponse.json({
                error: 'No members were removed. Members may not exist in the group.'
            }, { status: 400 });
        }

        // Update the group with the new member list
        const updatedGroup = await sql`
            UPDATE "Group"
            SET 
                "selectedMembers" = ${updatedMembers},
                "memberCount" = ${updatedMembers.length},
                "updatedAt" = NOW()
            WHERE id = ${groupId}
            RETURNING *
        `;

        // Get information about removed clients for response
        const removedClientsResult = await sql`
            SELECT c.id, c.name, c.email
            FROM "Client" c
            WHERE c.id = ANY(${clientIds})
        `;

        return NextResponse.json({
            message: 'Members removed successfully',
            group: {
                id: updatedGroup[0].id,
                name: updatedGroup[0].name,
                memberCount: updatedGroup[0].memberCount,
                selectedMembers: updatedGroup[0].selectedMembers
            },
            removedClients: removedClientsResult.map(client => ({
                id: client.id,
                name: client.name,
                email: client.email
            }))
        });

    } catch (error) {
        console.error('Remove members from group error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}