import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db/postgresql';
import { sendCoachRegistrationEmail } from '@/app/lib/email';
import { hashPasswordAsync } from '@/app/lib/auth/passwordUtils';
import { initializeDefaultPipelines } from '@/app/lib/db/pipelineRepo';
const crypto = require('crypto');

const HASH_ITERATIONS = 10000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = 'sha512';

function generateSalt() {
    return crypto.randomBytes(16).toString('base64');
}

function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString('base64');
}

export async function POST(request) {
    try {
        const body = await request.json();
        let { name, email, phone, bio } = body;

        // Normalize email to lowercase
        email = email.toLowerCase().trim();

        // Validate required fields
        if (!name || !email) {
            return NextResponse.json(
                { error: 'Name and email are required' },
                { status: 400 }
            );
        }

        // Check if email already exists (case-insensitive)
        const existingUser = await sql`
      SELECT id FROM "User" WHERE LOWER(email) = LOWER(${email})
    `;

        if (existingUser.length > 0) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 409 }
            );
        }

        // Generate a temporary password (coaches will need to reset it)
        const tempPassword = Math.random().toString(36).slice(-8);
        const { hashedPassword, salt } = await hashPasswordAsync(tempPassword);

        // Create new coach
        const newCoach = await sql`
      INSERT INTO "User" (
        name, 
        email, 
        password, 
        salt, 
        phone, 
        bio, 
        role, 
        "isActive", 
        "createdAt", 
        "updatedAt"
      ) VALUES (
        ${name}, 
        ${email}, 
        ${hashedPassword}, 
        ${salt}, 
        ${phone || null}, 
        ${bio || null}, 
        'coach', 
        true, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP
      ) RETURNING id, name, email, phone, bio, role, "isActive", "createdAt"
    `;

        if (newCoach.length === 0) {
            return NextResponse.json(
                { error: 'Failed to create coach' },
                { status: 500 }
            );
        }

        const coach = newCoach[0];

        // Initialize default pipeline stages for the new coach
        try {
            await initializeDefaultPipelines(coach.id);
        } catch (pipelineError) {
            console.error('❌ Error initializing default pipelines:', pipelineError);
            // Don't fail coach creation if pipeline init fails
        }

        // Send registration email to coach with temporary password
        try {
            await sendCoachRegistrationEmail({
                name: coach.name,
                email: coach.email,
                tempPassword: tempPassword
            });
            console.log('✅ Registration email sent to coach:', coach.email);
        } catch (emailError) {
            console.error('❌ Error sending registration email to coach:', emailError);
            // Don't fail the creation if email fails
        }

        // Return coach data (without password)
        return NextResponse.json({
            success: true,
            coach: {
                id: coach.id,
                name: coach.name,
                email: coach.email,
                phone: coach.phone,
                bio: coach.bio,
                role: coach.role,
                isActive: coach.isActive,
                joinDate: coach.createdAt,
                status: coach.isActive ? 'Active' : 'Pending',
                clients: 0, // New coaches start with 0 clients
                // Add default values for display
                specialization: 'Not specified',
                experience: '0',
                qualifications: 'Not specified'
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating coach:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const coachId = searchParams.get('id');

        // If coachId is provided, return single coach
        if (coachId) {
            const [coach] = await sql`
                SELECT 
                    u.id, 
                    u.name, 
                    u.email, 
                    u.phone, 
                    u.bio, 
                    u.role, 
                    u."isActive", 
                    u."approvalStatus",
                    u."expectedPlatformBestAt",
                    u."currentClientsPerMonth",
                    u."currentPlatform",
                    u."createdAt",
                    u."updatedAt",
                    COUNT(c.id) as client_count
                FROM "User" u
                LEFT JOIN "User" c ON c."coachId" = u.id AND c.role = 'client'
                WHERE u.role = 'coach' AND u.id = ${coachId}
                GROUP BY u.id, u.name, u.email, u.phone, u.bio, u.role, u."isActive", u."approvalStatus", u."expectedPlatformBestAt", u."currentClientsPerMonth", u."currentPlatform", u."createdAt", u."updatedAt"
            `;

            if (!coach) {
                return NextResponse.json(
                    { error: 'Coach not found' },
                    { status: 404 }
                );
            }

            const coachData = {
                id: coach.id,
                name: coach.name,
                email: coach.email,
                phone: coach.phone,
                bio: coach.bio,
                role: coach.role,
                isActive: coach.isActive,
                approvalStatus: coach.approvalStatus || 'approved',
                expectedPlatformBestAt: coach.expectedPlatformBestAt,
                currentClientsPerMonth: coach.currentClientsPerMonth,
                currentPlatform: coach.currentPlatform,
                joinDate: coach.createdAt,
                status: coach.approvalStatus === 'pending' ? 'Pending Approval' : (coach.approvalStatus === 'denied' ? 'Denied' : (coach.isActive ? 'Active' : 'Inactive')),
                clients: parseInt(coach.client_count) || 0,
                specialization: 'Not specified',
                experience: '0',
                qualifications: 'Not specified'
            };

            return NextResponse.json({
                success: true,
                coach: coachData
            });
        }

        // Get all coaches with their client count
        const coaches = await sql`
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.phone, 
                u.bio, 
                u.role, 
                u."isActive", 
                u."approvalStatus",
                u."expectedPlatformBestAt",
                u."currentClientsPerMonth",
                u."currentPlatform",
                u."createdAt",
                u."updatedAt",
                COUNT(c.id) as client_count
            FROM "User" u
            LEFT JOIN "User" c ON c."coachId" = u.id AND c.role = 'client'
            WHERE u.role = 'coach'
            GROUP BY u.id, u.name, u.email, u.phone, u.bio, u.role, u."isActive", u."approvalStatus", u."expectedPlatformBestAt", u."currentClientsPerMonth", u."currentPlatform", u."createdAt", u."updatedAt"
            ORDER BY 
                CASE WHEN u."approvalStatus" = 'pending' THEN 0 ELSE 1 END,
                u."createdAt" DESC
        `;

        // Transform data for frontend
        const coachesData = coaches.map(coach => ({
            id: coach.id,
            name: coach.name,
            email: coach.email,
            phone: coach.phone,
            bio: coach.bio,
            role: coach.role,
            isActive: coach.isActive,
            approvalStatus: coach.approvalStatus || 'approved',
            expectedPlatformBestAt: coach.expectedPlatformBestAt,
            currentClientsPerMonth: coach.currentClientsPerMonth,
            currentPlatform: coach.currentPlatform,
            joinDate: coach.createdAt,
            status: coach.approvalStatus === 'pending' ? 'Pending Approval' : (coach.approvalStatus === 'denied' ? 'Denied' : (coach.isActive ? 'Active' : 'Inactive')),
            clients: parseInt(coach.client_count) || 0, // Actual client count from database
            // Add default values for display
            specialization: 'Not specified',
            experience: '0',
            qualifications: 'Not specified'
        }));

        return NextResponse.json({
            success: true,
            coaches: coachesData
        });

    } catch (error) {
        console.error('Error fetching coaches:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        let { id, name, email, phone, bio, status, password } = body;

        // Normalize email to lowercase if provided
        if (email) {
            email = email.toLowerCase().trim();
        }

        // Validate required fields
        if (!id || !name || !email) {
            return NextResponse.json(
                { error: 'ID, name and email are required' },
                { status: 400 }
            );
        }

        // Check if email already exists for another coach (case-insensitive)
        const existingUser = await sql`
            SELECT id FROM "User" WHERE LOWER(email) = LOWER(${email}) AND id != ${id}
        `;

        if (existingUser.length > 0) {
            return NextResponse.json(
                { error: 'Email already exists for another user' },
                { status: 409 }
            );
        }

        // Handle password update if provided
        let newSalt = null;
        let hashedPassword = null;
        if (password && password.trim() !== '') {
            // Validate password strength (minimum 8 characters)
            if (password.length < 8) {
                return NextResponse.json(
                    { error: 'Password must be at least 8 characters long' },
                    { status: 400 }
                );
            }
            // Generate new salt and hash password
            newSalt = generateSalt();
            hashedPassword = hashPassword(password, newSalt);
        }

        // Update coach - conditionally include password fields
        let updatedCoach;
        if (hashedPassword && newSalt) {
            updatedCoach = await sql`
                UPDATE "User" SET
                    name = ${name},
                    email = ${email},
                    phone = ${phone || null},
                    bio = ${bio || null},
                    password = ${hashedPassword},
                    salt = ${newSalt},
                    "isActive" = ${status === 'Active'},
                    "updatedAt" = CURRENT_TIMESTAMP
                WHERE id = ${id} AND role = 'coach'
                RETURNING id, name, email, phone, bio, role, "isActive", "createdAt", "updatedAt"
            `;
        } else {
            updatedCoach = await sql`
                UPDATE "User" SET
                    name = ${name},
                    email = ${email},
                    phone = ${phone || null},
                    bio = ${bio || null},
                    "isActive" = ${status === 'Active'},
                    "updatedAt" = CURRENT_TIMESTAMP
                WHERE id = ${id} AND role = 'coach'
                RETURNING id, name, email, phone, bio, role, "isActive", "createdAt", "updatedAt"
            `;
        }

        if (updatedCoach.length === 0) {
            return NextResponse.json(
                { error: 'Coach not found or update failed' },
                { status: 404 }
            );
        }

        const coach = updatedCoach[0];

        // Get client count for this coach
        const clientCount = await sql`
            SELECT COUNT(*) as count FROM "User" WHERE "coachId" = ${id} AND role = 'client'
        `;

        return NextResponse.json({
            success: true,
            coach: {
                id: coach.id,
                name: coach.name,
                email: coach.email,
                phone: coach.phone,
                bio: coach.bio,
                role: coach.role,
                isActive: coach.isActive,
                joinDate: coach.createdAt,
                status: coach.isActive ? 'Active' : 'Pending',
                clients: parseInt(clientCount[0].count) || 0,
                // Add default values for display
                specialization: 'Not specified',
                experience: '0',
                qualifications: 'Not specified'
            }
        });

    } catch (error) {
        console.error('Error updating coach:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Coach ID is required' },
                { status: 400 }
            );
        }

        // Get coach info and client count before deletion
        const coachInfo = await sql`
            SELECT id, name, email FROM "User" WHERE id = ${id} AND role = 'coach'
        `;

        if (coachInfo.length === 0) {
            return NextResponse.json(
                { error: 'Coach not found' },
                { status: 404 }
            );
        }

        const coach = coachInfo[0];

        // Get clients assigned to this coach
        const clients = await sql`
            SELECT id, name, email FROM "User" WHERE "coachId" = ${id} AND role = 'client'
        `;

        // Delete all clients assigned to this coach
        if (clients.length > 0) {
            await sql`
                DELETE FROM "User" 
                WHERE "coachId" = ${id} AND role = 'client'
            `;
        }

        // Delete the coach
        await sql`
            DELETE FROM "User" 
            WHERE id = ${id} AND role = 'coach'
        `;

        return NextResponse.json({
            success: true,
            message: `Coach ${coach.name} and ${clients.length} associated client${clients.length === 1 ? '' : 's'} deleted successfully`,
            deletedClients: clients.length
        });

    } catch (error) {
        console.error('Error deleting coach:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
