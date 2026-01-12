import { sql } from "@/app/lib/db/postgresql";
import { hashPasswordAsync } from "@/app/lib/auth/passwordUtils";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption";
import { sendClientRegistrationEmail } from "@/app/lib/email";

export async function POST(request) {
    try {
        // Get the current session to verify the coach
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'coach') {
            return Response.json({
                success: false,
                error: 'Unauthorized. Only coaches can create clients.'
            }, { status: 401 });
        }

        const body = await request.json();
        let {
            name,
            email,
            phone,
            dateOfBirth,
            address,
            concerns
        } = body;

        // Normalize email to lowercase
        email = email.toLowerCase().trim();

        // Validate required fields
        if (!name || !email) {
            return Response.json({
                success: false,
                error: 'Name and email are required'
            }, { status: 400 });
        }

        // Check if email already exists (case-insensitive)
        const existingUser = await sql`SELECT id FROM "User" WHERE LOWER(email) = LOWER(${email})`;
        if (existingUser.length > 0) {
            return Response.json({
                success: false,
                error: 'Email already registered'
            }, { status: 400 });
        }

        // Check max clients per coach limit
        const [platformSettings] = await sql`
            SELECT "maxClientsPerCoach" FROM "PlatformSettings" LIMIT 1
        `;

        const maxClients = platformSettings?.maxClientsPerCoach || 20;

        // Count current clients for this coach
        const clientCount = await sql`
            SELECT COUNT(*) as count 
            FROM "User" 
            WHERE "coachId" = ${session.user.id} AND role = 'client' AND "isActive" = true
        `;

        const currentClientCount = parseInt(clientCount[0]?.count || 0);

        if (currentClientCount >= maxClients) {
            return Response.json({
                success: false,
                error: `Maximum client limit reached. You can only have ${maxClients} active clients. Please contact admin to increase the limit.`
            }, { status: 400 });
        }

        // Generate a temporary password for the client
        const tempPassword = 'password123';
        // const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const { hashedPassword, salt } = await hashPasswordAsync(tempPassword);

        // Create the client user
        const [newUser] = await sql`
      INSERT INTO "User" (name, email, password, salt, phone, role, "createdAt", "isActive", "dateofBirth", address, "coachId")
      VALUES (${name}, ${email}, ${hashedPassword}, ${salt}, ${phone}, 'client', NOW(), true, ${dateOfBirth}, ${address}, ${session.user.id})
      RETURNING id, name, email, phone, role
    `;
        const [newClient] = await sql`
      INSERT INTO "Client" ("userId", "coachId","name","email","type","status", "primaryConcerns", "createdAt", "updatedAt")
      VALUES (${newUser.id}, ${session.user.id}, ${name}, ${email}, ${'personal'}, ${'active'}, ${concerns}, NOW(), NOW())
      RETURNING id, name, email
    `;
        
        // Create default goals and habits for the new client
        try {
            const { createDefaultGoalsAndHabitsForClient } = await import('@/app/lib/db/goalsHabitsHelpers');
            await createDefaultGoalsAndHabitsForClient(newClient.id);
            console.log('✅ Default goals and habits created for new client:', newClient.id);
        } catch (goalsError) {
            console.error('❌ Error creating default goals and habits:', goalsError);
            // Don't fail the registration if goals/habits creation fails
        }
        
        // Send welcome email for clients
        await sendClientRegistrationEmail({
            name: newUser.name,
            email: newUser.email,
            tempPassword: tempPassword
        });
        // Create signup activity
        try {
            const { activityHelpers } = await import('@/app/lib/db/activitySchema');
            await activityHelpers.createSignupActivity(newUser.id, newClient.id, {
                nameProvided: true,
                userName: newUser.name,
                clientName: newClient.name
            });
        } catch (activityError) {
            console.error('❌ Error creating signup activity:', activityError);
            // Don't fail the registration if activity creation fails
        }

        // Create signup notification for coach
        try {
            const { NotificationService } = require('@/app/lib/services/NotificationService');
            await NotificationService.notifyClientSignup(newClient.id, session.user.id, newUser.name);
        } catch (notificationError) {
            console.error('❌ Error creating signup notification:', notificationError);
            // Don't fail the registration if notification creation fails
        }

        // Notify all admins about new client signup
        try {
            // Get all admins
            const admins = await sql`
                SELECT id FROM "User" WHERE role = 'admin' AND "isActive" = true
            `;

            // Get coach name for the notification
            const coach = await sql`
                SELECT name FROM "User" WHERE id = ${session.user.id}
            `;
            const coachName = coach[0]?.name || 'Unknown Coach';

            // Create notifications for all admins
            for (const admin of admins) {
                // Insert notification and get the actual ID
                const insertedNotifications = await sql`
                    INSERT INTO "Notification" 
                    ("userId", type, title, message, "isRead", priority, data, "createdAt")
                    VALUES (
                        ${admin.id},
                        'client_signup',
                        'New Client Signup',
                        ${`${newUser.name} (${newUser.email}) was registered by coach ${coachName}.`},
                        false,
                        'normal',
                        ${JSON.stringify({
                    clientId: newClient.id,
                    clientName: newUser.name,
                    clientEmail: newUser.email,
                    coachId: session.user.id,
                    coachName: coachName
                })},
                        CURRENT_TIMESTAMP
                    )
                    RETURNING *
                `;

                // Send real-time notification via socket
                if (insertedNotifications.length > 0) {
                    try {
                        if (global.globalSocketIO) {
                            const notification = insertedNotifications[0];
                            const socketNotification = {
                                id: notification.id,
                                userId: notification.userId,
                                type: notification.type,
                                title: notification.title,
                                message: notification.message,
                                isRead: notification.isRead,
                                priority: notification.priority,
                                createdAt: notification.createdAt ? new Date(notification.createdAt).toISOString() : new Date().toISOString(),
                                data: notification.data ? (typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data) : null
                            };
                            global.globalSocketIO.to(`notifications_${admin.id}`).emit('new_notification', socketNotification);
                            console.log(`✅ Admin notification sent to ${admin.id} for client signup with ID: ${notification.id}`);
                        }
                    } catch (socketError) {
                        console.warn(`⚠️ Socket emission failed for admin ${admin.id}:`, socketError.message);
                    }
                }
            }
            console.log(`📧 Notified ${admins.length} admin(s) about new client signup`);
        } catch (notificationError) {
            console.error('❌ Error creating admin notifications:', notificationError);
            // Don't fail registration if notification fails
        }

        return Response.json({
            success: true,
            message: 'Client created successfully',
            client: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                tempPassword: tempPassword // Include temp password for coach to share with client
            }
        });

    } catch (error) {
        console.error('Client registration error:', error);
        return Response.json({
            success: false,
            error: 'Failed to create client'
        }, { status: 500 });
    }
}
