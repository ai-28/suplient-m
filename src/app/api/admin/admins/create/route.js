import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is admin
        if (!session?.user?.id || session?.user?.role !== 'admin') {
            console.error('Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let { name, email, password, phone, isSuperAdmin } = await request.json();

        // Normalize email to lowercase
        email = email.toLowerCase().trim();

        console.log('Creating admin with data:', { name, email, phone, isSuperAdmin: !!isSuperAdmin });

        // Validate required fields
        if (!name || !email || !password) {
            console.error('Missing required fields:', { name: !!name, email: !!email, password: !!password });
            return NextResponse.json(
                { error: 'Name, email, and password are required' },
                { status: 400 }
            );
        }

        // Get current admin's super admin status
        const currentAdmin = await sql`
      SELECT "isSuperAdmin" FROM "User" WHERE id = ${session.user.id}
    `;

        const isCurrentUserSuperAdmin = currentAdmin[0]?.isSuperAdmin;
        console.log('Current user is super admin:', isCurrentUserSuperAdmin);

        // Regular admins cannot create super admins
        if (!isCurrentUserSuperAdmin && isSuperAdmin) {
            console.error('Regular admin trying to create super admin');
            return NextResponse.json(
                { error: 'You do not have permission to create super admins' },
                { status: 403 }
            );
        }

        // Check if email already exists (case-insensitive)
        const existingUser = await sql`
      SELECT id FROM "User" WHERE LOWER(email) = LOWER(${email})
    `;

        if (existingUser.length > 0) {
            console.error('Email already exists:', email);
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 400 }
            );
        }

        // Hash password using the same method as seed
        const generateSalt = () => crypto.randomBytes(16).toString('hex');
        const hashPassword = (password, salt) => crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('base64');

        const salt = generateSalt();
        const hashedPassword = hashPassword(password, salt);

        // Create admin user (store email in lowercase)
        console.log('Attempting to insert admin into database...');
        const newAdmin = await sql`
      INSERT INTO "User" 
      (name, email, password, salt, phone, role, "isActive", "isSuperAdmin", "createdAt", "updatedAt")
      VALUES (
        ${name},
        ${email},
        ${hashedPassword},
        ${salt},
        ${phone || null},
        'admin',
        true,
        ${isSuperAdmin || false},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING id, name, email, phone, role, "isActive", "isSuperAdmin", "createdAt"
    `;

        console.log('Admin created successfully:', newAdmin[0].id);

        return NextResponse.json({
            success: true,
            message: 'Admin created successfully',
            admin: newAdmin[0]
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating admin:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        return NextResponse.json(
            {
                error: 'Failed to create admin',
                details: error.message
            },
            { status: 500 }
        );
    }
}

