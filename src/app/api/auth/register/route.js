import { NextResponse } from 'next/server';
import { userRepo } from '@/app/lib/db/userRepo';
import { sendCoachPendingEmail } from '@/app/lib/email';
import { sql } from '@/app/lib/db/postgresql';

export async function POST(request) {
    try {
        const body = await request.json();
        let {
            name,
            email,
            password,
            phone,
            role = 'coach',
            expectedPlatformBestAt,
            currentClientsPerMonth,
            currentPlatform
        } = body;

        // Normalize email to lowercase
        email = email.toLowerCase().trim();

        // Validate required fields
        if (!name || !email || !password || !phone) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Validate password strength (minimum 8 characters)
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Check if email already exists (email is already normalized)
        const emailExists = await userRepo.checkEmailExists(email);
        if (emailExists) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 409 }
            );
        }

        // Register the user
        const newUser = await userRepo.register({
            name,
            email,
            password,
            phone,
            role,
            expectedPlatformBestAt,
            currentClientsPerMonth,
            currentPlatform
        });

        // Send pending email for coaches (since they need approval)
        if (role === 'coach') {
            console.log('Sending coach pending email');
            await sendCoachPendingEmail({
                name: newUser.name,
                email: newUser.email
            });

            // Notify all admins about new coach signup
            try {
                // Get all admins
                const admins = await sql`
                    SELECT id FROM "User" WHERE role = 'admin' AND "isActive" = true
                `;

                // Create notifications for all admins
                for (const admin of admins) {
                    // Insert notification and get the actual ID
                    const insertedNotifications = await sql`
                        INSERT INTO "Notification" 
                        ("userId", type, title, message, "isRead", priority, data, "createdAt")
                        VALUES (
                            ${admin.id},
                            'system',
                            'New Coach Signup',
                            ${`${newUser.name} (${newUser.email}) has registered as a coach and is pending approval.`},
                            false,
                            'normal',
                            ${JSON.stringify({ coachId: newUser.id, coachName: newUser.name, coachEmail: newUser.email })},
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
                                console.log(`✅ Admin notification sent to ${admin.id} for coach signup with ID: ${notification.id}`);
                            }
                        } catch (socketError) {
                            console.warn(`⚠️ Socket emission failed for admin ${admin.id}:`, socketError.message);
                        }
                    }
                }
                console.log(`📧 Notified ${admins.length} admin(s) about new coach signup`);
            } catch (notificationError) {
                console.error('❌ Error creating admin notifications:', notificationError);
                // Don't fail registration if notification fails
            }
        }

        return NextResponse.json({
            success: true,
            message: 'User registered successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
