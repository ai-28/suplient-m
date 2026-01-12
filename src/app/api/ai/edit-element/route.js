import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/lib/authoption';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'coach') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { element, editRequest, elementType, language = 'en' } = await request.json();

        if (!element || !editRequest) {
            return NextResponse.json(
                { error: 'Element and edit request are required' },
                { status: 400 }
            );
        }

        // Build prompt based on element type
        let contentToEdit = '';
        if (elementType === 'message') {
            contentToEdit = element.data?.message || element.message || '';
        } else if (elementType === 'task') {
            contentToEdit = `${element.data?.title || element.title || ''}\n\n${element.data?.description || element.description || ''}`;
        } else if (elementType === 'document') {
            contentToEdit = element.content || '';
        } else {
            contentToEdit = JSON.stringify(element);
        }

        const systemPrompt = `You are a professional coaching content editor. You help coaches refine their program content.
Your writing style should be warm, supportive, educational, and accessible. You write in ${language === 'da' ? 'Danish' : 'English'}.
Maintain the original intent while making the requested modifications.`;

        const userPrompt = `Original content:
${contentToEdit}

Edit request: ${editRequest}

Please modify the content according to the request while maintaining:
- Professional quality
- Appropriate tone
- Clear structure
- Practical value

Return the modified content in the same format as the original. If it's a message, return just the message text. If it's a task, return JSON with title and description. If it's a document, return the full document content.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_completion_tokens: 5000,
        });

        let modifiedContent = completion.choices[0].message.content;

        // Parse response based on element type
        let result;
        if (elementType === 'task') {
            try {
                // Remove markdown code blocks if present
                let jsonString = modifiedContent.trim();
                if (jsonString.startsWith('```json')) {
                    jsonString = jsonString.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
                } else if (jsonString.startsWith('```')) {
                    jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                result = JSON.parse(jsonString);
            } catch {
                // If not JSON, create structure from text
                const lines = modifiedContent.split('\n').filter(l => l.trim());
                result = {
                    title: lines[0] || element.data?.title || element.title,
                    description: lines.slice(1).join('\n') || element.data?.description || element.description
                };
            }
        } else if (elementType === 'message') {
            result = { message: modifiedContent };
        } else if (elementType === 'document') {
            result = { content: modifiedContent };
        } else {
            result = { content: modifiedContent };
        }

        return NextResponse.json({
            success: true,
            modifiedContent: result
        });
    } catch (error) {
        console.error('AI edit error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to edit element' },
            { status: 500 }
        );
    }
}

