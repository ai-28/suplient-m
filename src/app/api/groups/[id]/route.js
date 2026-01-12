import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { groupRepo } from '@/app/lib/db/groupRepo';

// GET /api/groups/[id] - Get group by ID with members and sessions
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        // Get group with members and sessions
        const group = await groupRepo.getGroupById(id, session.user.id);

        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Group data fetched successfully',
            group: group
        });

    } catch (error) {
        console.error('Get group by ID error:', error);
        return NextResponse.json(
            { error: 'Failed to get group data' },
            { status: 500 }
        );
    }
}

// PUT /api/groups/[id] - Update a group
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Validate group ID
        if (!id) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        // Define allowed fields with validation rules
        const allowedFields = {
            name: {
                type: 'string',
                maxLength: 255,
                transform: (value) => value?.trim() || null
            },
            description: {
                type: 'string',
                maxLength: 1000,
                transform: (value) => value?.trim() || null
            },
            capacity: {
                type: 'number',
                min: 1,
                max: 100,
                transform: (value) => parseInt(value)
            },
            focusArea: {
                type: 'string',
                maxLength: 255,
                transform: (value) => value?.trim() || null
            },
            stage: {
                type: 'string',
                allowedValues: ['upcoming', 'ongoing', 'completed', 'inactive'],
                transform: (value) => value || null
            },
            selectedMembers: {
                type: 'array',
                transform: (value) => value || []
            }
        };

        // Build update data dynamically
        const updateData = {};
        const errors = [];

        // Process only the fields provided in the request body
        for (const [fieldName, value] of Object.entries(body)) {
            // Check if field is allowed
            if (!allowedFields[fieldName]) {
                errors.push(`Field '${fieldName}' is not allowed`);
                continue;
            }

            const fieldConfig = allowedFields[fieldName];

            // Skip undefined values (not provided)
            if (value === undefined) {
                continue;
            }

            // Type validation
            if (fieldConfig.type === 'string' && typeof value !== 'string') {
                errors.push(`Field '${fieldName}' must be a string`);
                continue;
            }

            if (fieldConfig.type === 'number' && typeof value !== 'number' && typeof value !== 'string') {
                errors.push(`Field '${fieldName}' must be a number`);
                continue;
            }

            if (fieldConfig.type === 'array' && !Array.isArray(value)) {
                errors.push(`Field '${fieldName}' must be an array`);
                continue;
            }

            // Length validation for strings
            if (fieldConfig.type === 'string' && fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
                errors.push(`Field '${fieldName}' must be no more than ${fieldConfig.maxLength} characters`);
                continue;
            }

            // Range validation for numbers
            if (fieldConfig.type === 'number') {
                const numValue = fieldConfig.transform(value);
                if (isNaN(numValue)) {
                    errors.push(`Field '${fieldName}' must be a valid number`);
                    continue;
                }
                if (fieldConfig.min !== undefined && numValue < fieldConfig.min) {
                    errors.push(`Field '${fieldName}' must be at least ${fieldConfig.min}`);
                    continue;
                }
                if (fieldConfig.max !== undefined && numValue > fieldConfig.max) {
                    errors.push(`Field '${fieldName}' must be no more than ${fieldConfig.max}`);
                    continue;
                }
            }

            // Allowed values validation
            if (fieldConfig.allowedValues && !fieldConfig.allowedValues.includes(value)) {
                errors.push(`Field '${fieldName}' must be one of: ${fieldConfig.allowedValues.join(', ')}`);
                continue;
            }

            // Transform and add to update data
            const transformedValue = fieldConfig.transform(value);
            updateData[fieldName] = transformedValue;
        }

        // Return validation errors if any
        if (errors.length > 0) {
            return NextResponse.json({
                error: 'Validation failed',
                details: errors
            }, { status: 400 });
        }

        // Check if any fields were provided for update
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({
                error: 'No valid fields provided for update'
            }, { status: 400 });
        }

        const coachId = session.user.id;

        // Update the group
        const updatedGroup = await groupRepo.updateGroup(id, updateData);

        if (!updatedGroup) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Group updated successfully',
            group: updatedGroup
        });
    } catch (error) {
        console.error('Update group error:', error);
        return NextResponse.json(
            { error: 'Failed to update group' },
            { status: 500 }
        );
    }
}

// DELETE /api/groups/[id] - Delete a group
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        const deletedGroup = await groupRepo.deleteGroup(id);

        if (!deletedGroup) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Group deleted successfully',
            group: deletedGroup
        });
    } catch (error) {
        console.error('Delete group error:', error);
        return NextResponse.json(
            { error: 'Failed to delete group' },
            { status: 500 }
        );
    }
}
