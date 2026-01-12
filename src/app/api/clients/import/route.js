import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';
import { hashPasswordAsync } from '@/app/lib/auth/passwordUtils';
import { sendClientRegistrationEmail } from '@/app/lib/email';

// Remove BOM (Byte Order Mark) and ensure UTF-8 encoding
function normalizeText(text) {
    if (!text) return '';
    // Remove UTF-8 BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }
    return text;
}

// CSV parser that handles multi-line quoted fields (server-side)
function parseCSV(text) {
    if (!text || text.trim().length === 0) return { headers: [], rows: [] };

    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote (double quote)
                currentField += '"';
                i += 2;
                continue;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
                continue;
            }
        }

        if (char === ',' && !inQuotes) {
            // Field separator
            currentRow.push(currentField.trim());
            currentField = '';
            i++;
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            // Row separator (only when not in quotes)
            if (char === '\r' && nextChar === '\n') {
                // Handle Windows line endings (\r\n)
                i += 2;
            } else {
                i++;
            }

            // Add current field to row
            if (currentField.length > 0 || currentRow.length > 0) {
                currentRow.push(currentField.trim());
                if (currentRow.some(field => field.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
            }
            continue;
        }

        // Regular character
        currentField += char;
        i++;
    }

    // Handle last field and row
    if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
            rows.push(currentRow);
        }
    }

    if (rows.length === 0) return { headers: [], rows: [] };

    const headers = rows[0];
    const dataRows = rows.slice(1);

    return { headers, rows: dataRows };
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone (at least 10 digits)
function isValidPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || (session.user.role !== 'coach' && session.user.role !== 'admin')) {
            return NextResponse.json({
                success: false,
                error: 'Unauthorized. Only coaches and admins can import clients.'
            }, { status: 401 });
        }

        const formData = await request.formData();
        const csvFile = formData.get('csv');
        const mappingJson = formData.get('mapping');
        const targetCoachId = formData.get('targetCoachId'); // For admin importing clients for a specific coach

        if (!csvFile) {
            return NextResponse.json({
                success: false,
                error: 'No CSV file provided'
            }, { status: 400 });
        }

        if (!mappingJson) {
            return NextResponse.json({
                success: false,
                error: 'Column mapping is required'
            }, { status: 400 });
        }

        const mapping = JSON.parse(mappingJson);

        // Validate required mappings
        if (!mapping.name || !mapping.email || !mapping.phone) {
            return NextResponse.json({
                success: false,
                error: 'Missing required column mappings (name, email, phone)'
            }, { status: 400 });
        }

        // Read CSV file as UTF-8 to handle Danish characters (æ, ø, å)
        let text = await csvFile.text();
        // Normalize text (remove BOM if present)
        text = normalizeText(text);
        const { headers, rows } = parseCSV(text);

        if (headers.length === 0 || rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'CSV file is empty or invalid'
            }, { status: 400 });
        }

        // Get column indices (ignore __none__ placeholder)
        const nameIndex = headers.indexOf(mapping.name);
        const emailIndex = headers.indexOf(mapping.email);
        const phoneIndex = headers.indexOf(mapping.phone);
        const addressIndex = (mapping.address && mapping.address !== '__none__') ? headers.indexOf(mapping.address) : -1;
        const dateOfBirthIndex = (mapping.dateOfBirth && mapping.dateOfBirth !== '__none__') ? headers.indexOf(mapping.dateOfBirth) : -1;
        const notesIndex = (mapping.notes && mapping.notes !== '__none__') ? headers.indexOf(mapping.notes) : -1;

        if (nameIndex === -1 || emailIndex === -1 || phoneIndex === -1) {
            return NextResponse.json({
                success: false,
                error: 'One or more mapped columns not found in CSV'
            }, { status: 400 });
        }

        // Check max clients per coach limit
        const [platformSettings] = await sql`
      SELECT "maxClientsPerCoach" FROM "PlatformSettings" LIMIT 1
    `;
        const maxClients = platformSettings?.maxClientsPerCoach || 20;

        // Determine which coach to assign clients to
        // If admin is importing, use targetCoachId; otherwise use session user id
        const coachIdForImport = (session.user.role === 'admin' && targetCoachId)
            ? targetCoachId
            : session.user.id;

        // Verify the target coach exists (for admin imports)
        if (session.user.role === 'admin' && targetCoachId) {
            const targetCoach = await sql`
                SELECT id, role FROM "User" WHERE id = ${targetCoachId} AND role = 'coach'
            `;
            if (targetCoach.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: 'Target coach not found'
                }, { status: 404 });
            }
        }

        const currentClientCount = await sql`
      SELECT COUNT(*) as count 
      FROM "User" 
      WHERE "coachId" = ${coachIdForImport} AND role = 'client' AND "isActive" = true
    `;
        const currentCount = parseInt(currentClientCount[0]?.count || 0);

        const results = {
            successful: 0,
            failed: 0,
            errors: []
        };

        // Track emails seen in this CSV import to detect duplicates within the file
        const seenEmailsInCSV = new Set();

        // Process each row
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Skip empty rows
            if (row.length === 0 || row.every(cell => !cell || cell.trim() === '')) {
                continue;
            }

            try {
                const name = row[nameIndex]?.trim();
                const email = row[emailIndex]?.trim().toLowerCase();
                const phone = row[phoneIndex]?.trim();
                const address = addressIndex !== -1 ? row[addressIndex]?.trim() : null;
                const dateOfBirthRaw = dateOfBirthIndex !== -1 ? row[dateOfBirthIndex]?.trim() : null;
                const concerns = notesIndex !== -1 ? row[notesIndex]?.trim() : null;

                // Parse date of birth (handle various formats)
                let dateOfBirth = null;
                if (dateOfBirthRaw) {
                    try {
                        // Try to parse the date
                        const parsedDate = new Date(dateOfBirthRaw);
                        if (!isNaN(parsedDate.getTime())) {
                            // Format as YYYY-MM-DD for database
                            dateOfBirth = parsedDate.toISOString().split('T')[0];
                        }
                    } catch (e) {
                        // If parsing fails, leave as null
                        console.warn(`Could not parse date of birth for row ${i + 2}: ${dateOfBirthRaw}`);
                    }
                }

                // Validate required fields
                if (!name || name.length < 2) {
                    results.failed++;
                    results.errors.push({
                        row: i + 2, // +2 because row 1 is header, and we're 0-indexed
                        error: 'Name is required and must be at least 2 characters'
                    });
                    continue;
                }

                if (!email || !isValidEmail(email)) {
                    results.failed++;
                    results.errors.push({
                        row: i + 2,
                        error: 'Valid email is required'
                    });
                    continue;
                }

                if (!phone || !isValidPhone(phone)) {
                    results.failed++;
                    results.errors.push({
                        row: i + 2,
                        error: 'Valid phone number is required (at least 10 digits)'
                    });
                    continue;
                }

                // Check for duplicate email within the CSV file
                if (seenEmailsInCSV.has(email)) {
                    results.failed++;
                    results.errors.push({
                        row: i + 2,
                        error: `Duplicate email in CSV file: ${email}`
                    });
                    continue;
                }

                // Check if email already exists in database (case-insensitive)
                const existingUser = await sql`
          SELECT id FROM "User" WHERE LOWER(email) = LOWER(${email})
        `;

                if (existingUser.length > 0) {
                    results.failed++;
                    results.errors.push({
                        row: i + 2,
                        error: `Email ${email} already exists in the system`
                    });
                    continue;
                }

                // Mark this email as seen in CSV
                seenEmailsInCSV.add(email);

                // Check client limit
                if (currentCount + results.successful >= maxClients) {
                    results.failed++;
                    results.errors.push({
                        row: i + 2,
                        error: `Maximum client limit reached (${maxClients} clients)`
                    });
                    continue;
                }

                // Generate temporary password
                const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
                const { hashedPassword, salt } = await hashPasswordAsync(tempPassword);

                // Create client user
                const [newUser] = await sql`
          INSERT INTO "User" (name, email, password, salt, phone, role, "createdAt", "isActive", "dateofBirth", address, "coachId")
          VALUES (${name}, ${email}, ${hashedPassword}, ${salt}, ${phone}, 'client', NOW(), true, ${dateOfBirth}, ${address}, ${coachIdForImport})
          RETURNING id, name, email, phone, role
        `;

                // Create client record
                const [newClient] = await sql`
          INSERT INTO "Client" ("userId", "coachId", "name", "email", "type", "status", "primaryConcerns", "createdAt", "updatedAt")
          VALUES (${newUser.id}, ${coachIdForImport}, ${name}, ${email}, 'personal', 'active', ${concerns}, NOW(), NOW())
          RETURNING id, name, email
        `;

                // Create default goals and habits for the new client
                try {
                    const { createDefaultGoalsAndHabitsForClient } = await import('@/app/lib/db/goalsHabitsHelpers');
                    await createDefaultGoalsAndHabitsForClient(newClient.id);
                } catch (goalsError) {
                    console.error('❌ Error creating default goals and habits for imported client:', goalsError);
                    // Don't fail the import if goals/habits creation fails
                }

                // Send registration email
                try {
                    await sendClientRegistrationEmail({
                        name: newUser.name,
                        email: newUser.email,
                        tempPassword: tempPassword
                    });
                } catch (emailError) {
                    console.error(`Error sending email to ${newUser.email}:`, emailError);
                    // Don't fail the import if email fails
                }

                // Create signup activity
                try {
                    const { activityHelpers } = await import('@/app/lib/db/activitySchema');
                    await activityHelpers.createSignupActivity(newUser.id, newClient.id, {
                        nameProvided: true,
                        userName: newUser.name,
                        clientName: newClient.name
                    });
                } catch (activityError) {
                    console.error(`Error creating signup activity for ${newUser.email}:`, activityError);
                    // Don't fail the import if activity creation fails
                }

                results.successful++;

            } catch (error) {
                console.error(`Error processing row ${i + 2}:`, error);
                results.failed++;
                results.errors.push({
                    row: i + 2,
                    error: error.message || 'Unknown error'
                });
            }
        }

        return NextResponse.json({
            success: true,
            ...results
        });

    } catch (error) {
        console.error('CSV import error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to import clients'
        }, { status: 500 });
    }
}

