# AI Assist Program Builder - Setup Guide

## Overview
The AI Assist Program Builder allows all coaches to generate complete programs using AI. This feature includes:
- Multi-step questionnaire to capture program requirements
- AI-powered content generation (messages, tasks, documents)
- Hybrid editing (manual + AI chat)
- PDF generation and library integration
- Program template creation

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# DigitalOcean Spaces (S3) Configuration (already configured)
DO_SPACES_KEY=your_do_spaces_key
DO_SPACES_SECRET=your_do_spaces_secret
DO_SPACES_BUCKET=your_bucket_name
DO_SPACES_REGION=your_region
DO_SPACES_ENDPOINT=digitaloceanspaces.com
DO_SPACES_CDN_ENABLED=true  # Optional: enable CDN
```

## Required Dependencies

All dependencies are already installed:
- `openai` - OpenAI API client
- `pdfkit` - PDF generation
- `@aws-sdk/client-s3` - S3 client (already installed)

## API Endpoints

### 1. `/api/ai/generate-program` (POST)
Generates program content based on questionnaire answers.

**Request Body:**
```json
{
  "programName": "Anxiety Management Program",
  "programDescription": "Help clients manage anxiety...",
  "duration": 4,
  "targetAudience": "Individual clients",
  "tonePreference": "supportive",
  "contentDepth": "moderate",
  "messageFrequency": "every-2-3-days",
  "taskTypes": ["reflection", "action"],
  "documentStructure": "moderate",
  "specificTopics": "Include mindfulness exercises",
  "specialInstructions": "Keep language simple",
  "language": "en"
}
```

**Response:**
```json
{
  "elements": [...],
  "documents": [...],
  "messagesDocument": {...}
}
```

### 2. `/api/ai/edit-element` (POST)
Edits an element using AI chat.

**Request Body:**
```json
{
  "element": {...},
  "editRequest": "Make it more supportive",
  "elementType": "message"
}
```

### 3. `/api/ai/generate-pdf` (POST)
Generates PDF from content.

**Request Body:**
```json
{
  "title": "Week 1 Guide",
  "content": "Markdown content...",
  "coachId": "uuid"
}
```

### 4. `/api/ai/import-program` (POST)
Imports generated program to database.

**Request Body:**
```json
{
  "programData": {...},
  "formData": {...}
}
```

## Access Control

The AI Assist feature is available to all coaches:
- No subscription check required
- All coaches can access the feature from the sidebar
- Authentication check ensures only logged-in coaches can use it

## Frontend Components

### 1. `AIAssistProgramModal`
Main modal component that manages the workflow:
- Step 1: Questionnaire
- Step 2: Generation
- Step 3: Review & Edit

### 2. `QuestionnaireSteps`
Multi-step form with 4 steps:
- Step 1: Basic Information
- Step 2: Content Preferences
- Step 3: Structure Preferences
- Step 4: Customization

### 3. `ProgramReviewScreen`
Review interface with:
- Overview dashboard
- Element listing (messages, tasks, documents)
- Edit/Delete actions
- Import functionality

### 4. `HybridEditor`
Hybrid editing component with:
- Manual Edit tab (direct text editing)
- AI Assist tab (chat interface)
- Side-by-side comparison
- Suggested prompts

## Sidebar Integration

The AI Assist button appears in the sidebar for all coaches:
- Location: After "Programs" menu item
- Icon: Sparkles
- Visible for all coaches
- Opens the AI Assist modal

## Database Integration

The system uses existing database tables:
- `ProgramTemplate` - Stores program templates
- `ProgramTemplateElement` - Stores program elements
- `Resource` - Stores generated PDFs in library

## Workflow

1. **Coach clicks "AI Assist Program" in sidebar**
2. **Questionnaire** - Coach answers questions about program
3. **Generation** - AI generates program content (30-60 seconds)
4. **Review** - Coach reviews and edits content
5. **Import** - System creates program template and uploads PDFs (1-2 minutes)
6. **Complete** - Program appears in Programs list

## Quality Standards

The AI generation uses demo documents as quality reference:
- Professional writing quality
- Clear structure
- Practical exercises
- Realistic examples
- Supportive tone

Content adapts to coach's requirements:
- Tone preference
- Content depth
- Structure complexity
- Message frequency
- Task types

## Error Handling

All endpoints include:
- Premium subscription validation
- Error handling and logging
- User-friendly error messages
- Retry logic where appropriate

## Testing

To test the feature:
1. Log in as a coach
2. Click "AI Assist Program" in sidebar
3. Complete the questionnaire
4. Review generated content
5. Edit if needed
6. Import to create program

## Troubleshooting

**Issue: AI Assist button not showing**
- Ensure you're logged in as a coach
- Check that you're on a coach route (`/coach/*`)

**Issue: Generation fails**
- Check `OPENAI_API_KEY` is set
- Verify API key is valid
- Check console for error messages

**Issue: PDF generation fails**
- Check S3/DigitalOcean Spaces credentials
- Verify bucket permissions
- Check file size limits

**Issue: Import fails**
- Check database connection
- Verify program template creation
- Check S3 upload permissions

## Best Practices

1. **Prompt Engineering**: The system uses enhanced prompts that adapt to coach requirements
2. **Quality Control**: Generated content maintains professional standards
3. **Flexibility**: Content adapts to coach's specific needs
4. **Performance**: PDF generation runs in parallel for efficiency
5. **User Experience**: Clear progress indicators and error messages

## Future Enhancements

Potential improvements:
- Save questionnaire templates
- Allow coaches to customize questions
- A/B test different prompt strategies
- Learn from coach edits to improve prompts
- Support multiple languages
- Template library (save/duplicate generated programs)

