import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add timeout wrapper for database operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 10000); // 10 second timeout
    });

    // Get groups based on user role
    let groups;

    if (session.user.role === 'coach') {
      // Coach sees all groups they manage
      groups = await Promise.race([
        sql`
        SELECT 
          g.id,
          g.name,
          g.description,
          g."memberCount",
          g.capacity,
          g."focusArea",
          g.stage,
          g."coachId",
          g."createdAt",
          g."selectedMembers",
          array_length(g."selectedMembers", 1) as "actualMemberCount"
        FROM "Group" g
        WHERE g."coachId" = ${session.user.id}
        ORDER BY g."createdAt" DESC
      `,
        timeoutPromise
      ]);
    } else if (session.user.role === 'client') {
      // Client sees all available groups (both joined and available to join)

      // Get the client record for this user to get the clientId
      const clientRecord = await sql`SELECT id as "clientId", "userId" FROM "Client" WHERE "userId" = ${session.user.id}`;

      const clientId = clientRecord.length > 0 ? clientRecord[0].clientId : null;

      if (clientId) {
        // Check if current client is in any groups
        const clientInGroups = await sql`SELECT id, name, "selectedMembers" FROM "Group" WHERE ${clientId} = ANY("selectedMembers")`;
      }

      groups = await Promise.race([
        sql`
        SELECT 
          g.id,
          g.name,
          g.description,
          g."memberCount",
          g.capacity,
          g."focusArea",
          g.stage,
          g."coachId",
          g."createdAt",
          g."selectedMembers",
          array_length(g."selectedMembers", 1) as "actualMemberCount",
          CASE 
            WHEN ${clientId} = ANY(g."selectedMembers") THEN true 
            ELSE false 
          END as "isJoined"
        FROM "Group" g
        ORDER BY g."createdAt" DESC
      `,
        timeoutPromise
      ]);
    } else {
      // Admin sees all groups
      groups = await sql`
        SELECT 
          g.id,
          g.name,
          g.description,
          g."memberCount",
          g.capacity,
          g."focusArea",
          g.stage,
          g."coachId",
          g."createdAt",
          g."selectedMembers",
          array_length(g."selectedMembers", 1) as "actualMemberCount"
        FROM "Group" g
        ORDER BY g."createdAt" DESC
      `;
    }

    // Format the response
    const formattedGroups = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      members: group.actualMemberCount || 0,
      maxMembers: group.capacity,
      focusArea: group.focusArea,
      stage: group.stage,
      coachId: group.coachId,
      createdAt: group.createdAt,
      isJoined: group.isJoined || false,
      unreadMessages: 0,
      groupType: 'open',
      frequency: 'weekly',
      duration: '60',
      location: 'Online',
      avatars: [],
      lastComment: null // TODO: Implement last comment fetching
    }));

    return NextResponse.json({
      success: true,
      groups: formattedGroups
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only coaches can create groups
    if (session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can create groups' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, capacity, focusArea, stage, selectedMembers } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    // Validate capacity is a valid integer
    let validCapacity = 10; // default value
    if (capacity !== undefined && capacity !== null) {
      const parsedCapacity = parseInt(capacity);
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        return NextResponse.json({ error: 'Capacity must be a positive integer' }, { status: 400 });
      }
      validCapacity = parsedCapacity;
    }

    // Validate stage is a valid value
    const validStages = ['upcoming', 'ongoing', 'completed', 'inactive'];
    let validStage = 'upcoming'; // default value
    if (stage !== undefined && stage !== null) {
      if (!validStages.includes(stage)) {
        return NextResponse.json({
          error: `Invalid stage. Must be one of: ${validStages.join(', ')}`
        }, { status: 400 });
      }
      validStage = stage;
    }

    // Create the group
    const result = await sql`
            INSERT INTO "Group" (
                name, 
                description, 
                capacity, 
                "focusArea", 
                stage, 
                "coachId", 
                "selectedMembers",
                "memberCount",
                "createdAt",
                "updatedAt"
            ) VALUES (
                ${name},
                ${description},
                ${validCapacity},
                ${focusArea || 'General'},
                ${validStage},
                ${session.user.id},
                ${selectedMembers || []},
                ${Array.isArray(selectedMembers) ? selectedMembers.length : 0},
                NOW(),
                NOW()
            )
            RETURNING id, name, description, capacity, "focusArea", stage, "coachId", "selectedMembers", "memberCount", "createdAt"
        `;

    const newGroup = result[0];

    return NextResponse.json({
      success: true,
      group: {
        id: newGroup.id,
        name: newGroup.name,
        description: newGroup.description,
        members: newGroup.memberCount || 0,
        maxMembers: newGroup.capacity,
        focusArea: newGroup.focusArea,
        stage: newGroup.stage,
        coachId: newGroup.coachId,
        createdAt: newGroup.createdAt,
        isJoined: false,
        unreadMessages: 0,
        groupType: 'open',
        frequency: 'weekly',
        duration: '60',
        location: 'Online',
        avatars: [],
        lastComment: null
      }
    });

  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}