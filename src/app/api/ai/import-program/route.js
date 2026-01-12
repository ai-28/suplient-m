import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import { createProgramTemplate } from '@/app/lib/db/programRepo';
import { savePDF } from '@/app/lib/db/resourceRepo';
import { s3Client, getCdnUrl } from '@/app/lib/s3Client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { jsPDF } from 'jspdf';

// Helper function to generate PDF using jsPDF
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
    if (!session?.user || session.user.role !== 'coach') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programData, formData } = await request.json();
    const coachId = session.user.id;

    if (!programData || !formData) {
      return NextResponse.json(
        { error: 'Program data and form data are required' },
        { status: 400 }
      );
    }

    // Step 1: Generate PDFs for documents (parallel)
    const documentResources = [];
    const pdfPromises = [];

    // Generate weekly documents
    for (const doc of programData.documents || []) {
      pdfPromises.push(
        generatePDF(doc.title, doc.content, coachId)
          .then(async (pdfInfo) => {
            try {
              const resource = await savePDF(
                doc.title,
                coachId,
                'article',
                pdfInfo.url,
                `AI-generated weekly guide for ${formData.programName}`,
                '',
                pdfInfo.size,
                'application/pdf'
              );
              return { ...resource, week: doc.week };
            } catch (error) {
              console.error(`Error saving PDF for ${doc.title}:`, error);
              return null;
            }
          })
          .catch(error => {
            console.error(`Error generating PDF for ${doc.title}:`, error);
            return null;
          })
      );
    }

    // Generate messages document
    let messagesResource = null;
    if (programData.messagesDocument) {
      pdfPromises.push(
        generatePDF(
          programData.messagesDocument.title,
          programData.messagesDocument.content,
          coachId
        )
          .then(async (pdfInfo) => {
            try {
              messagesResource = await savePDF(
                programData.messagesDocument.title,
                coachId,
                'article',
                pdfInfo.url,
                `AI-generated messages document for ${formData.programName}`,
                '',
                pdfInfo.size,
                'application/pdf'
              );
              return messagesResource;
            } catch (error) {
              console.error('Error saving messages PDF:', error);
              return null;
            }
          })
          .catch(error => {
            console.error('Error generating messages PDF:', error);
            return null;
          })
      );
    }

    // Wait for all PDFs to be generated
    const pdfResults = await Promise.all(pdfPromises);
    documentResources.push(...pdfResults.filter(r => r && r.week !== undefined));
    if (pdfResults.find(r => r && !r.week)) {
      messagesResource = pdfResults.find(r => r && !r.week);
    }

    // Step 2: Prepare program elements
    const elements = [];

    // Create a map of week -> document resource for easy lookup
    const weekDocumentMap = {};
    for (const docResource of documentResources) {
      if (docResource && docResource.id && docResource.week) {
        weekDocumentMap[docResource.week] = docResource;
      }
    }

    // Track which weeks have messages on Day 1 (first day of each week)
    const weeksWithDay1Messages = new Set();

    // Add message and task elements, and link PDFs to messages on Day 1 of each week
    for (const element of programData.elements || []) {
      const week = element.week || 1;
      const day = element.day || 1;

      // If this is a message on Week N Day 1 (first day of week), and we have a PDF for that week, add the link
      if (element.type === 'message' && day === 1 && weekDocumentMap[week]) {
        const docResource = weekDocumentMap[week];
        weeksWithDay1Messages.add(week); // Mark that this week has a message on Day 1

        // Add PDF reference to message data
        const messageData = element.data || {};
        const messageText = messageData.message || '';

        // Get PDF URL from the resource
        const pdfUrl = docResource.url || '';

        // Append PDF reference with clickable link format
        // Using markdown-style link format: [text](url) - URL is hidden, only text is shown and clickable
        const pdfReference = `\n\n📄 You can find the detailed guide [${docResource.title}](${pdfUrl}) in your Library.`;
        elements.push({
          type: element.type,
          title: element.title,
          week: week,
          day: day,
          scheduledTime: '09:00:00',
          data: {
            ...messageData,
            message: messageText + pdfReference,
            // Also store PDF link in message data for programmatic access
            linkedDocumentId: docResource.id,
            linkedDocumentName: docResource.title,
            linkedDocumentUrl: pdfUrl
          }
        });
      } else {
        // Regular element (not a message on Day 1, or not a message)
        elements.push({
          type: element.type,
          title: element.title,
          week: week,
          day: day,
          scheduledTime: '09:00:00',
          data: element.data || {}
        });
      }
    }

    // Create messages for weeks that don't have a Day 1 message but have a PDF
    // Every week's first day (Day 1) should contain the PDF link
    for (const docResource of documentResources) {
      if (docResource && docResource.id && docResource.week) {
        const week = docResource.week;

        // If there's no message on Day 1 of this week, create one with PDF reference
        if (!weeksWithDay1Messages.has(week)) {
          // Get PDF URL from the resource
          const pdfUrl = docResource.url || '';

          // Create message with clickable PDF link using markdown format
          const pdfReference = `📄 Welcome to Week ${week}! You can find the detailed guide [${docResource.title}](${pdfUrl}) in your Library.`;
          elements.push({
            type: 'message',
            title: `Week ${week} Guide Available`,
            week: week,
            day: 1, // First day of the week
            scheduledTime: '09:00:00',
            data: {
              message: pdfReference,
              isAutomatic: true,
              linkedDocumentId: docResource.id,
              linkedDocumentName: docResource.title,
              linkedDocumentUrl: pdfUrl
            }
          });
        }
      }
    }

    // Step 3: Create program template
    const program = await createProgramTemplate({
      name: formData.programName,
      description: formData.programDescription || '',
      duration: formData.duration,
      coachId: coachId,
      elements: elements
    });

    return NextResponse.json({
      success: true,
      programId: program.id,
      message: 'Program imported successfully',
      stats: {
        elementsCreated: elements.length,
        documentsCreated: documentResources.length + (messagesResource ? 1 : 0),
        messagesCount: elements.filter(e => e.type === 'message').length,
        tasksCount: elements.filter(e => e.type === 'task').length
      }
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import program' },
      { status: 500 }
    );
  }
}

