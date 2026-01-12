import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { sql } from '@/app/lib/db/postgresql';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({
                success: false,
                error: 'Unauthorized. Only admins can export clients.'
            }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const coachId = searchParams.get('coachId');

        if (!coachId) {
            return NextResponse.json({
                success: false,
                error: 'Coach ID is required'
            }, { status: 400 });
        }

        // Verify the coach exists
        const coach = await sql`
            SELECT id, name FROM "User" WHERE id = ${coachId} AND role = 'coach'
        `;

        if (coach.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Coach not found'
            }, { status: 404 });
        }

        // Fetch clients for this coach
        const clients = await sql`
            SELECT 
                u.name,
                u.email,
                u.phone,
                u.address,
                u."dateofBirth",
                c."primaryConcerns" as notes,
                u."createdAt",
                u."isActive"
            FROM "User" u
            LEFT JOIN "Client" c ON u.id = c."userId"
            WHERE u.role = 'client' 
            AND u."coachId" = ${coachId}
            ORDER BY u.name ASC
        `;

        // Convert to CSV format
        const headers = ['Name', 'Email', 'Phone', 'Address', 'Date of Birth', 'Notes', 'Status', 'Created At'];

        const csvRows = [
            headers.join(','),
            ...clients.map(client => {
                const row = [
                    escapeCSV(client.name || ''),
                    escapeCSV(client.email || ''),
                    escapeCSV(client.phone || ''),
                    escapeCSV(client.address || ''),
                    client.dateofBirth ? new Date(client.dateofBirth).toISOString().split('T')[0] : '',
                    escapeCSV(client.notes || ''),
                    client.isActive ? 'Active' : 'Inactive',
                    client.createdAt ? new Date(client.createdAt).toISOString() : ''
                ];
                return row.join(',');
            })
        ];

        const csvContent = csvRows.join('\n');

        // Generate filename
        const coachName = coach[0].name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `clients_${coachName}_${dateStr}.csv`;

        // Return CSV file
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error('Export clients error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to export clients'
        }, { status: 500 });
    }
}

// Helper function to escape CSV fields
function escapeCSV(value) {
    if (value === null || value === undefined) {
        return '';
    }

    const stringValue = String(value);

    // If the value contains comma, newline, or quote, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

