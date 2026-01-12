import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { getEnrolledClientsForTemplate } from '@/app/lib/db/programRepo';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
        }

        const enrolledClients = await getEnrolledClientsForTemplate(id, session.user.id);

        console.log('🔍 Raw enrolledClients from DB:', JSON.stringify(enrolledClients, null, 2));

        // Transform the data to match the expected format
        const transformedClients = enrolledClients.map(client => {
            // Handle potential case sensitivity issues with PostgreSQL column names
            const clientName = client.clientName || client["clientName"] || null;
            const clientEmail = client.clientEmail || client["clientEmail"] || null;
            const clientAvatar = client.clientAvatar || client["clientAvatar"] || null;
            const enrolledDate = client.enrolledDate || client["enrolledDate"] || null;
            const clientId = client.clientId || client["clientId"] || null;
            const enrollmentId = client.enrollmentId || client["enrollmentId"] || null;
            const status = client.status || client["status"] || 'enrolled';
            const completedElements = client.completedElements || client["completedElements"] || [];
            const totalElements = client.totalElements || client["totalElements"] || 0;
            const startDate = client.startDate || client["startDate"] || null;

            console.log('🔍 Processing client - All properties:', Object.keys(client));
            console.log('🔍 Processing client:', {
                clientId,
                clientName,
                clientEmail,
                clientAvatar,
                enrolledDate,
                status,
                completedElements,
                totalElements,
                startDate
            });

            const completedElementsCount = Array.isArray(completedElements)
                ? completedElements.length
                : (typeof completedElements === 'number' ? completedElements : 0);

            // Calculate current day based on start date
            let currentDay = 0;
            if (startDate) {
                const start = new Date(startDate);
                const today = new Date();
                const diffTime = Math.abs(today - start);
                currentDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            return {
                id: clientId,
                enrollmentId: enrollmentId,
                name: clientName || 'Unknown Client',
                email: clientEmail || 'No email',
                avatar: clientAvatar || null,
                enrolledDate: enrolledDate ? new Date(enrolledDate) : null,
                status: status || 'enrolled',
                progress: {
                    completedElements: completedElementsCount,
                    totalElements: parseInt(totalElements) || 0,
                    currentDay: currentDay,
                    status: status || 'enrolled',
                    completionRate: totalElements > 0
                        ? Math.round((completedElementsCount / totalElements) * 100)
                        : 0
                }
            };
        });

        return NextResponse.json({
            success: true,
            clients: transformedClients
        });

    } catch (error) {
        console.error('Error fetching enrolled clients:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch enrolled clients' },
            { status: 500 }
        );
    }
}
