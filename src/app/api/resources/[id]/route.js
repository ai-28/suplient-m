import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { getResourceById } from '@/app/lib/db/resourceRepo';

// GET /api/resources/[id] - Get resource by ID (for coaches)
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
    }

    // Get resource
    const resource = await getResourceById(id);

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Check if coach owns the resource
    if (session.user.role === 'coach' && resource.coachId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        resourceType: resource.resourceType,
        url: resource.url,
        fileName: resource.fileName,
        fileSize: resource.fileSize,
        fileType: resource.fileType,
        author: resource.author,
        coachId: resource.coachId
      }
    });
  } catch (error) {
    console.error('Error fetching resource:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch resource' },
      { status: 500 }
    );
  }
}

