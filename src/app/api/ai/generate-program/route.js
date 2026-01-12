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

        const questionnaireData = await request.json();
        const {
            programName,
            programDescription,
            duration,
            targetAudience,
            tonePreference,
            contentDepth,
            messageFrequency,
            taskTypes,
            documentStructure,
            specificTopics,
            specialInstructions,
            language = 'en'
        } = questionnaireData;

        if (!programName || !duration) {
            return NextResponse.json(
                { error: 'Program name and duration are required' },
                { status: 400 }
            );
        }

        // Build comprehensive prompt
        const systemPrompt = `You are a professional coaching program builder creating a ${duration}-week online program. 
Your writing style should be warm, supportive, educational, and accessible. You write in ${language === 'da' ? 'Danish' : 'English'}.
You use real-world examples, practical exercises, and reflection questions. Your tone should be ${tonePreference || 'supportive and warm'}.

Key principles:
- Use real-world case studies with specific scenarios when appropriate
- Explain concepts simply but professionally
- Include practical, actionable exercises
- Ask reflection questions for self-awareness
- Provide encouragement throughout
- Adapt content depth to: ${contentDepth || 'moderate'}
- Maintain professional quality standards
- Use emojis sparingly and appropriately (1-2 per message/document, only when they add value and warmth)
- Emojis should feel natural and not overwhelming

Always return valid JSON.`;

        const userPrompt = `Create a comprehensive ${duration}-week program called "${programName}".

${programDescription ? `Program Description: ${programDescription}` : ''}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${specificTopics ? `Specific Topics to Include: ${specificTopics}` : ''}
${specialInstructions ? `Special Instructions: ${specialInstructions}` : ''}

Content Requirements:
- Tone: ${tonePreference || 'Supportive and warm'}
- Content Depth: ${contentDepth || 'Moderate detail'}
- Document Structure: ${documentStructure || 'Moderate (sections + exercises)'}
- Message Frequency: ${messageFrequency || 'Every 2-3 days'}
- Task Types: ${taskTypes?.join(', ') || 'Reflection exercises, Action items'}

Generate:
1. **Messages**: Create messages distributed according to frequency (${messageFrequency || 'Every 2-3 days'}). 
   Each message should be warm, supportive, and include references to documents or exercises.
   Use 1-2 emojis per message sparingly (like 😊, 💚, 🙌, 💪, ❤️) to add warmth without being excessive.
   Distribute them across all ${duration} weeks.

2. **Tasks**: Create tasks based on selected types: ${taskTypes?.join(', ') || 'Reflection exercises, Action items'}.
   Use emojis very sparingly in task titles or descriptions (0-1 per task, only when appropriate).
   Distribute them across weeks, ensuring variety.

3. **Weekly Documents**: Create one document per week (${duration} documents total).
   Each document should match the structure preference: ${documentStructure || 'Moderate (sections + exercises)'}.
   Include: week overview, key concepts, exercises, and reflection questions.
   Use emojis very sparingly (1-2 per document total, only in headings or key sections for emphasis).

4. **Messages Document**: Create one compiled document containing all text messages.

Return a JSON object with this exact structure:
{
  "elements": [
    {
      "type": "message",
      "week": 1,
      "day": 1,
      "title": "Message Title",
      "data": {
        "message": "Full message text...",
        "isAutomatic": true
      }
    },
    {
      "type": "task",
      "week": 1,
      "day": 3,
      "title": "Task Title",
      "data": {
        "title": "Task Title",
        "description": "Task description...",
        "assignedTo": "client"
      }
    }
  ],
  "documents": [
    {
      "week": 1,
      "title": "Week 1: [Theme]",
      "content": "Full markdown content for week 1 guide..."
    }
  ],
  "messagesDocument": {
    "title": "All Program Messages - ${programName}",
    "content": "Compiled document with all messages..."
  }
}

Ensure:
- Messages are distributed according to frequency
- Tasks match selected types
- Documents match structure preference
- Content depth matches requirement
- Tone matches preference
- All content is in ${language === 'da' ? 'Danish' : 'English'}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        // Debug: Log completion structure
        console.log('Completion object:', JSON.stringify(completion, null, 2));
        console.log('Choices length:', completion.choices?.length);
        console.log('First choice:', completion.choices?.[0]);

        // Check if choices exist
        if (!completion.choices || completion.choices.length === 0) {
            console.error('No choices in completion:', completion);
            throw new Error('No choices returned from OpenAI API');
        }

        // Check if response was truncated
        const finishReason = completion.choices[0]?.finish_reason;
        if (finishReason === 'length') {
            console.warn('OpenAI response was truncated due to token limit');
        }

        // Get the response content
        const responseContent = completion.choices[0]?.message?.content;

        if (!responseContent) {
            console.error('No content in response. Full completion:', JSON.stringify(completion, null, 2));
            console.error('Finish reason:', finishReason);
            console.error('Message object:', completion.choices[0]?.message);
            throw new Error(`No content received from OpenAI. Finish reason: ${finishReason || 'unknown'}`);
        }

        // Try to parse JSON, with better error handling
        let generatedData;
        try {
            // Clean the response content (remove any markdown code blocks if present)
            let cleanedContent = responseContent.trim();
            if (cleanedContent.startsWith('```json')) {
                cleanedContent = cleanedContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanedContent.startsWith('```')) {
                cleanedContent = cleanedContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            generatedData = JSON.parse(cleanedContent);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Response content length:', responseContent.length);
            console.error('Response content (first 500 chars):', responseContent.substring(0, 500));
            console.error('Finish reason:', finishReason);

            // If response was truncated, suggest increasing token limit
            if (finishReason === 'length') {
                throw new Error(`Response was truncated. Try increasing max_completion_tokens. Partial response: ${responseContent.substring(0, 200)}...`);
            }

            throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
        }

        // Validate structure
        if (!generatedData.elements || !Array.isArray(generatedData.elements)) {
            generatedData.elements = [];
        }
        if (!generatedData.documents || !Array.isArray(generatedData.documents)) {
            generatedData.documents = [];
        }
        if (!generatedData.messagesDocument) {
            generatedData.messagesDocument = {
                title: `All Program Messages - ${programName}`,
                content: "Messages will be compiled here."
            };
        }

        return NextResponse.json(generatedData);
    } catch (error) {
        console.error('AI generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate program' },
            { status: 500 }
        );
    }
}

