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

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';

        if (!query || query.trim().length < 2) {
            return NextResponse.json({
                results: {
                    clients: [],
                    notes: [],
                    resources: [],
                    groups: [],
                    sessions: [],
                    tasks: []
                },
                totalResults: 0
            });
        }

        const searchTerm = `%${query.trim()}%`;
        const userId = session.user.id;
        const userRole = session.user.role;

        const results = {
            clients: [],
            notes: [],
            resources: [],
            groups: [],
            sessions: [],
            tasks: []
        };

        // Search Clients (only for coaches and admins)
        if (userRole === 'coach' || userRole === 'admin') {
            try {
                let clientsQuery;
                if (userRole === 'coach') {
                    clientsQuery = sql`
            SELECT 
              c.id,
              u.name,
              u.email,
              c.type,
              c.status
            FROM "Client" c
            JOIN "User" u ON c."userId" = u.id
            WHERE (u.name ILIKE ${searchTerm} OR u.email ILIKE ${searchTerm})
              AND c."coachId" = ${userId}
            ORDER BY u.name ASC
            LIMIT 10
          `;
                } else {
                    // Admin sees all clients
                    clientsQuery = sql`
            SELECT 
              c.id,
              u.name,
              u.email,
              c.type,
              c.status
            FROM "Client" c
            JOIN "User" u ON c."userId" = u.id
            WHERE u.name ILIKE ${searchTerm} OR u.email ILIKE ${searchTerm}
            ORDER BY u.name ASC
            LIMIT 10
          `;
                }

                const clientsResult = await clientsQuery;

                if (clientsResult) {
                    results.clients = clientsResult.map(client => ({
                        id: client.id,
                        title: client.name,
                        description: client.email || `${client.type} - ${client.status}`,
                        url: userRole === 'admin' ? `/admin/clients/${client.id}` : `/coach/clients/${client.id}`,
                        category: 'Clients'
                    }));
                }
            } catch (error) {
                console.error('Error searching clients:', error);
            }
        }

        // Search Notes
        try {
            let notesQuery;
            if (userRole === 'coach') {
                notesQuery = sql`
          SELECT 
            n.id,
            n.title,
            n.description,
            n."clientId",
            n."groupId",
            c.name as "clientName",
            g.name as "groupName"
          FROM "Note" n
          LEFT JOIN "Client" c ON n."clientId" = c.id
          LEFT JOIN "Group" g ON n."groupId" = g.id
          WHERE (n.title ILIKE ${searchTerm} OR n.description ILIKE ${searchTerm})
            AND (n."clientId" IN (SELECT id FROM "Client" WHERE "coachId" = ${userId})
                 OR n."groupId" IN (SELECT id FROM "Group" WHERE "coachId" = ${userId}))
          ORDER BY n."createdAt" DESC
          LIMIT 10
        `;
            } else if (userRole === 'admin') {
                notesQuery = sql`
          SELECT 
            n.id,
            n.title,
            n.description,
            n."clientId",
            n."groupId",
            c.name as "clientName",
            g.name as "groupName"
          FROM "Note" n
          LEFT JOIN "Client" c ON n."clientId" = c.id
          LEFT JOIN "Group" g ON n."groupId" = g.id
          WHERE n.title ILIKE ${searchTerm} OR n.description ILIKE ${searchTerm}
          ORDER BY n."createdAt" DESC
          LIMIT 10
        `;
            }

            if (notesQuery) {
                const notesResult = await notesQuery;
                results.notes = notesResult.map(note => ({
                    id: note.id,
                    title: note.title,
                    description: note.description || (note.clientName ? `Client: ${note.clientName}` : note.groupName ? `Group: ${note.groupName}` : 'Note'),
                    url: userRole === 'admin'
                        ? `/admin/clients/${note.clientId || note.groupId}`
                        : note.clientId
                            ? `/coach/clients/${note.clientId}`
                            : `/coach/group/${note.groupId}`,
                    category: 'Notes'
                }));
            }
        } catch (error) {
            console.error('Error searching notes:', error);
        }

        // Search Resources (Library files)
        try {
            let resourcesQuery;
            if (userRole === 'coach') {
                resourcesQuery = sql`
          SELECT 
            r.id,
            r.title,
            r.description,
            r."fileName",
            r."resourceType",
            r.url
          FROM "Resource" r
          WHERE (r.title ILIKE ${searchTerm} 
                 OR r."fileName" ILIKE ${searchTerm} 
                 OR r.description ILIKE ${searchTerm})
            AND r."coachId" = ${userId}
          ORDER BY r."createdAt" DESC
          LIMIT 10
        `;
            } else if (userRole === 'admin') {
                resourcesQuery = sql`
          SELECT 
            r.id,
            r.title,
            r.description,
            r."fileName",
            r."resourceType",
            r.url
          FROM "Resource" r
          WHERE r.title ILIKE ${searchTerm} 
                 OR r."fileName" ILIKE ${searchTerm} 
                 OR r.description ILIKE ${searchTerm}
          ORDER BY r."createdAt" DESC
          LIMIT 10
        `;
            }

            if (resourcesQuery) {
                const resourcesResult = await resourcesQuery;
                results.resources = resourcesResult.map(resource => ({
                    id: resource.id,
                    title: resource.title || resource.fileName,
                    description: resource.description || `${resource.resourceType} file`,
                    url: userRole === 'admin' ? `/admin/library` : `/coach/library`,
                    category: 'Library'
                }));
            }
        } catch (error) {
            console.error('Error searching resources:', error);
        }

        // Search Groups
        try {
            let groupsQuery;
            if (userRole === 'coach') {
                groupsQuery = sql`
          SELECT 
            g.id,
            g.name,
            g.description
          FROM "Group" g
          WHERE (g.name ILIKE ${searchTerm} OR g.description ILIKE ${searchTerm})
            AND g."coachId" = ${userId}
          ORDER BY g."createdAt" DESC
          LIMIT 10
        `;
            } else if (userRole === 'admin') {
                groupsQuery = sql`
          SELECT 
            g.id,
            g.name,
            g.description
          FROM "Group" g
          WHERE g.name ILIKE ${searchTerm} OR g.description ILIKE ${searchTerm}
          ORDER BY g."createdAt" DESC
          LIMIT 10
        `;
            }

            if (groupsQuery) {
                const groupsResult = await groupsQuery;
                results.groups = groupsResult.map(group => ({
                    id: group.id,
                    title: group.name,
                    description: group.description || 'Group',
                    url: userRole === 'admin' ? `/admin/group/${group.id}` : `/coach/group/${group.id}`,
                    category: 'Groups'
                }));
            }
        } catch (error) {
            console.error('Error searching groups:', error);
        }

        // Search Sessions
        try {
            let sessionsQuery;
            if (userRole === 'coach') {
                sessionsQuery = sql`
          SELECT 
            s.id,
            s.title,
            s.description,
            s."sessionDate",
            s."sessionType",
            s."clientId",
            s."groupId",
            u.name as "clientName",
            g.name as "groupName"
          FROM "Session" s
          LEFT JOIN "Client" c ON s."clientId" = c.id
          LEFT JOIN "User" u ON c."userId" = u.id
          LEFT JOIN "Group" g ON s."groupId" = g.id
          WHERE (s.title ILIKE ${searchTerm} OR s.description ILIKE ${searchTerm})
            AND s."coachId" = ${userId}
          ORDER BY s."sessionDate" DESC
          LIMIT 10
        `;
            } else if (userRole === 'admin') {
                sessionsQuery = sql`
          SELECT 
            s.id,
            s.title,
            s.description,
            s."sessionDate",
            s."sessionType",
            s."clientId",
            s."groupId",
            u.name as "clientName",
            g.name as "groupName"
          FROM "Session" s
          LEFT JOIN "Client" c ON s."clientId" = c.id
          LEFT JOIN "User" u ON c."userId" = u.id
          LEFT JOIN "Group" g ON s."groupId" = g.id
          WHERE s.title ILIKE ${searchTerm} OR s.description ILIKE ${searchTerm}
          ORDER BY s."sessionDate" DESC
          LIMIT 10
        `;
            }

            if (sessionsQuery) {
                const sessionsResult = await sessionsQuery;
                results.sessions = sessionsResult.map(session => ({
                    id: session.id,
                    title: session.title,
                    description: session.description || `${session.sessionType === 'individual' ? session.clientName : session.groupName || 'Group'} session`,
                    url: userRole === 'admin' ? `/admin/sessions/${session.id}` : `/coach/sessions`,
                    category: 'Sessions'
                }));
            }
        } catch (error) {
            console.error('Error searching sessions:', error);
        }

        // Search Tasks
        try {
            let tasksQuery;
            if (userRole === 'coach') {
                tasksQuery = sql`
          SELECT 
            t.id,
            t.title,
            t.description,
            t."clientId",
            t."groupId",
            u.name as "clientName",
            g.name as "groupName"
          FROM "Task" t
          LEFT JOIN "Client" c ON t."clientId" = c.id
          LEFT JOIN "User" u ON c."userId" = u.id
          LEFT JOIN "Group" g ON t."groupId" = g.id
          WHERE (t.title ILIKE ${searchTerm} OR t.description ILIKE ${searchTerm})
            AND t."coachId" = ${userId}
          ORDER BY t."createdAt" DESC
          LIMIT 10
        `;
            } else if (userRole === 'admin') {
                tasksQuery = sql`
          SELECT 
            t.id,
            t.title,
            t.description,
            t."clientId",
            t."groupId",
            u.name as "clientName",
            g.name as "groupName"
          FROM "Task" t
          LEFT JOIN "Client" c ON t."clientId" = c.id
          LEFT JOIN "User" u ON c."userId" = u.id
          LEFT JOIN "Group" g ON t."groupId" = g.id
          WHERE t.title ILIKE ${searchTerm} OR t.description ILIKE ${searchTerm}
          ORDER BY t."createdAt" DESC
          LIMIT 10
        `;
            }

            if (tasksQuery) {
                const tasksResult = await tasksQuery;
                results.tasks = tasksResult.map(task => ({
                    id: task.id,
                    title: task.title,
                    description: task.description || (task.clientName ? `Client: ${task.clientName}` : task.groupName ? `Group: ${task.groupName}` : 'Task'),
                    url: userRole === 'admin' ? `/admin/tasks` : `/coach/tasks`,
                    category: 'Tasks'
                }));
            }
        } catch (error) {
            console.error('Error searching tasks:', error);
        }

        // Calculate total results
        const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

        return NextResponse.json({
            results,
            totalResults,
            query: query.trim()
        });

    } catch (error) {
        console.error('Error in global search:', error);
        return NextResponse.json(
            { error: 'Failed to perform search', details: error.message },
            { status: 500 }
        );
    }
}

