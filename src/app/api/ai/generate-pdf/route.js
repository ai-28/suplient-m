import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { jsPDF } from 'jspdf';
import { s3Client, getCdnUrl } from '@/app/lib/s3Client';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// Helper function to convert markdown/text to PDF using jsPDF
async function generatePDF(title, content, coachId) {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Set margins
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const maxWidth = pageWidth - (margin * 2);
        let yPos = margin;

        // Add title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        const titleLines = doc.splitTextToSize(title, maxWidth);
        doc.text(titleLines, margin, yPos, { align: 'left' });
        yPos += titleLines.length * 8 + 10;

        // Add content
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        const lines = content.split('\n');

        lines.forEach((line) => {
            const trimmed = line.trim();

            if (!trimmed) {
                yPos += 5;
                return;
            }

            // Check if we need a new page
            if (yPos > pageHeight - margin - 20) {
                doc.addPage();
                yPos = margin;
            }

            if (trimmed.startsWith('# ')) {
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                const textLines = doc.splitTextToSize(trimmed.substring(2), maxWidth);
                doc.text(textLines, margin, yPos);
                yPos += textLines.length * 7 + 5;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
            } else if (trimmed.startsWith('## ')) {
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                const textLines = doc.splitTextToSize(trimmed.substring(3), maxWidth);
                doc.text(textLines, margin, yPos);
                yPos += textLines.length * 7 + 5;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
            } else if (trimmed.startsWith('### ')) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                const textLines = doc.splitTextToSize(trimmed.substring(4), maxWidth);
                doc.text(textLines, margin, yPos);
                yPos += textLines.length * 6 + 4;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                const textLines = doc.splitTextToSize(`• ${trimmed.substring(2)}`, maxWidth - 10);
                doc.text(textLines, margin + 10, yPos);
                yPos += textLines.length * 5 + 3;
            } else {
                const textLines = doc.splitTextToSize(trimmed, maxWidth);
                doc.text(textLines, margin, yPos);
                yPos += textLines.length * 5 + 3;
            }
        });

        // Generate PDF buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        // Upload to S3
        const timestamp = Date.now();
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);
        const fileName = `${coachId}/${timestamp}-${sanitizedTitle}.pdf`;
        const filePath = `library/articles/${fileName}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: filePath,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
            ACL: 'public-read',
            CacheControl: 'max-age=31536000',
        }));

        const publicUrl = getCdnUrl(filePath);
        return { url: publicUrl, filePath, size: pdfBuffer.length };
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, content, coachId } = await request.json();

        if (!title || !content || !coachId) {
            return NextResponse.json(
                { error: 'Title, content, and coachId are required' },
                { status: 400 }
            );
        }

        // Verify coachId matches session
        if (session.user.id !== coachId && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const pdfInfo = await generatePDF(title, content, coachId);

        return NextResponse.json({
            success: true,
            url: pdfInfo.url,
            filePath: pdfInfo.filePath,
            size: pdfInfo.size
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate PDF' },
            { status: 500 }
        );
    }
}

