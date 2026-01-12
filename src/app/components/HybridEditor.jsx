"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { MessageWithLinks } from "@/app/components/MessageWithLinks";
import { Loader2, Send, Edit2, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Helper function to extract formatted text from nested JSON structures
function extractDocumentText(data) {
  // If it's a string, try to parse it as JSON
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return extractDocumentText(parsed);
    } catch (e) {
      // Not JSON, return as-is (it's already formatted text)
      return data;
    }
  }
  
  // If it's an object with a content field
  if (data && typeof data === 'object' && data.content !== undefined) {
    // If content is a string, try to parse it
    if (typeof data.content === 'string') {
      try {
        // Try to parse the content string as JSON
        const parsedContent = JSON.parse(data.content);
        // If parsed successfully and has a content field, extract that
        if (parsedContent && typeof parsedContent === 'object' && parsedContent.content) {
          // The inner content is the formatted text
          return parsedContent.content;
        }
        // If no inner content field, return the parsed content as string
        return typeof parsedContent === 'string' ? parsedContent : JSON.stringify(parsedContent);
      } catch (e) {
        // If parsing fails, the content string is the formatted text
        return data.content;
      }
    } else {
      // Content is not a string, recursively extract
      return extractDocumentText(data.content);
    }
  }
  
  // Fallback: stringify the object
  return typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
}

export function HybridEditor({ element, elementType, onSave, onCancel }) {
  const [activeTab, setActiveTab] = useState("manual");
  const [manualContent, setManualContent] = useState(getInitialContent());
  const [aiRequest, setAiRequest] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  function getInitialContent() {
    if (elementType === 'message') {
      return element.data?.message || element.message || '';
    } else if (elementType === 'task') {
      return `${element.data?.title || element.title || ''}\n\n${element.data?.description || element.description || ''}`;
    } else if (elementType === 'document' || elementType === 'documents' || elementType === 'messagesDocument') {
      // For documents, extract formatted text from nested JSON
      if (element.content) {
        return extractDocumentText(element.content);
      }
      return '';
    }
    // Fallback: if it's an object with content, use that
    if (element && typeof element === 'object' && element.content) {
      return extractDocumentText(element.content);
    }
    return '';
  }

  const handleManualSave = () => {
    let updatedElement;
    if (elementType === 'message') {
      updatedElement = { data: { ...element.data, message: manualContent } };
    } else if (elementType === 'task') {
      const lines = manualContent.split('\n\n');
      updatedElement = {
        data: {
          ...element.data,
          title: lines[0] || element.data?.title,
          description: lines.slice(1).join('\n\n') || element.data?.description
        }
      };
    } else if (elementType === 'document' || elementType === 'messagesDocument') {
      // For documents, preserve week and title if they exist, only update content
      updatedElement = {
        ...(element.week !== undefined && { week: element.week }),
        ...(element.title && { title: element.title }),
        content: manualContent
      };
    } else {
      updatedElement = { ...element, content: manualContent };
    }
    onSave(updatedElement);
  };

  const handleAISend = async () => {
    if (!aiRequest.trim()) {
      toast.error("Please enter a request");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/edit-element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          element,
          editRequest: aiRequest,
          elementType: elementType === 'messagesDocument' ? 'document' : elementType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to edit element');
      }

      const data = await response.json();
      
      // Ensure modifiedContent is properly parsed for tasks and documents
      let formattedResponse = data.modifiedContent;
      
      if (elementType === 'document' || elementType === 'documents' || elementType === 'messagesDocument') {
        // For documents, extract the formatted text from nested JSON
        // The API returns {content: "..."} where content might be a JSON string
        formattedResponse = extractDocumentText(formattedResponse);
        // Always ensure it's a string (extractDocumentText should return string, but double-check)
        formattedResponse = typeof formattedResponse === 'string' ? formattedResponse : String(formattedResponse);
      } else if (elementType === 'task' && typeof formattedResponse === 'string') {
        try {
          // Try to parse if it's a JSON string (might be wrapped in markdown code blocks)
          let jsonString = formattedResponse.trim();
          // Remove markdown code blocks if present
          if (jsonString.startsWith('```json')) {
            jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (jsonString.startsWith('```')) {
            jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          formattedResponse = JSON.parse(jsonString);
        } catch (e) {
          // If parsing fails, try to extract title and description from text
          const lines = formattedResponse.split('\n').filter(l => l.trim());
          formattedResponse = {
            title: lines[0] || '',
            description: lines.slice(1).join('\n') || ''
          };
        }
      }
      
      setAiResponse(formattedResponse);
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: aiRequest },
        { role: 'assistant', content: formattedResponse }
      ]);
      setAiRequest("");
    } catch (error) {
      console.error('AI edit error:', error);
      toast.error(error.message || 'Failed to edit element');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptAI = () => {
    if (!aiResponse) return;

    let updatedElement;
    if (elementType === 'message') {
      updatedElement = { data: { ...element.data, message: aiResponse.message || aiResponse.content || aiResponse } };
    } else if (elementType === 'task') {
      updatedElement = {
        data: {
          ...element.data,
          title: aiResponse.title || element.data?.title,
          description: aiResponse.description || element.data?.description
        }
      };
    } else if (elementType === 'document' || elementType === 'documents' || elementType === 'messagesDocument') {
      // For documents, preserve week and title, update content
      // aiResponse is already extracted formatted text (string) from extractDocumentText
      const content = typeof aiResponse === 'string' 
        ? aiResponse 
        : (typeof aiResponse === 'object' && aiResponse !== null
          ? (aiResponse.content || JSON.stringify(aiResponse, null, 2))
          : String(aiResponse));
      updatedElement = {
        ...(element.week !== undefined && { week: element.week }),
        ...(element.title && { title: element.title }),
        content: content
      };
    } else {
      updatedElement = { ...element, ...aiResponse };
    }
    onSave(updatedElement);
  };

  const suggestedPrompts = [
    "Make it more supportive",
    "Add specific examples",
    "Shorten to 2 paragraphs",
    "Make it more professional",
    "Add more detail",
    "Simplify the language"
  ];

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            Edit {elementType === 'message' ? 'Message' : elementType === 'task' ? 'Task' : 'Document'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Edit</TabsTrigger>
            <TabsTrigger value="ai">AI Assist</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              {(elementType === 'document' || elementType === 'documents' || elementType === 'messagesDocument') && element.title && (
                <div className="text-sm text-muted-foreground mb-2">
                  <strong>Title:</strong> {element.title}
                  {element.week !== undefined && <span className="ml-2">(Week {element.week})</span>}
                </div>
              )}
              <Textarea
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                rows={15}
                className={elementType === 'document' || elementType === 'documents' || elementType === 'messagesDocument' ? "text-sm" : "font-mono text-sm"}
                placeholder="Edit content here..."
              />
              {(elementType === 'document' || elementType === 'documents' || elementType === 'messagesDocument') && (
                <p className="text-xs text-muted-foreground">
                  Edit the formatted content above. Markdown formatting is supported.
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleManualSave} className="w-full sm:w-auto">
                Save Changes
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            {/* Chat History */}
            <div className="border rounded-lg p-3 sm:p-4 h-32 sm:h-40 overflow-y-auto space-y-3 sm:space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>What would you like to change?</p>
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="text-sm whitespace-pre-wrap">
                        {(() => {
                          // For documents, show the content directly (formatted text)
                          if (elementType === 'document' || elementType === 'documents' || elementType === 'messagesDocument') {
                            return extractDocumentText(msg.content);
                          }
                          // For messages, show message text with clickable links
                          if (elementType === 'message') {
                            const messageText = typeof msg.content === 'object'
                              ? (msg.content.message || msg.content.content || JSON.stringify(msg.content, null, 2))
                              : msg.content;
                            return <MessageWithLinks messageText={messageText} />;
                          }
                          // For tasks, show formatted
                          if (elementType === 'task') {
                            if (typeof msg.content === 'object' && msg.content !== null) {
                              const title = msg.content.title || '';
                              const description = msg.content.description || '';
                              if (title || description) {
                                return `${title}${title && description ? '\n\n' : ''}${description}`;
                              }
                              // Fallback if object doesn't have expected structure
                              return JSON.stringify(msg.content, null, 2);
                            }
                            // If it's a string, try to parse it
                            if (typeof msg.content === 'string') {
                              try {
                                let jsonString = msg.content.trim();
                                // Remove markdown code blocks if present
                                if (jsonString.startsWith('```json')) {
                                  jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                                } else if (jsonString.startsWith('```')) {
                                  jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
                                }
                                const parsed = JSON.parse(jsonString);
                                if (parsed.title || parsed.description) {
                                  return `${parsed.title || ''}\n\n${parsed.description || ''}`;
                                }
                              } catch (e) {
                                // If parsing fails, return as-is
                              }
                            }
                            return msg.content;
                          }
                          // Fallback
                          return typeof msg.content === 'object'
                            ? JSON.stringify(msg.content, null, 2)
                            : msg.content;
                        })()}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Suggested Prompts */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Suggested prompts:</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {suggestedPrompts.map((prompt, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => setAiRequest(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                value={aiRequest}
                onChange={(e) => setAiRequest(e.target.value)}
                placeholder="Type your edit request..."
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleAISend();
                  }
                }}
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Press Ctrl+Enter to send
              </p>
              <Button
                onClick={handleAISend}
                disabled={!aiRequest.trim() || isGenerating}
                className="w-full sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>

            {/* AI Response Preview */}
            {aiResponse && (
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium">AI Modified Version:</p>
                <div className="border rounded-lg p-4 bg-muted/50 max-h-40 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">
                    {(() => {
                      console.log('AI Modified Version - elementType:', elementType, 'aiResponse type:', typeof aiResponse);
                      // For documents, show the content directly (formatted text)
                      if (elementType === 'document' || elementType === 'documents' || elementType === 'messagesDocument') {
                        // Always extract formatted text, even if aiResponse is already processed
                        return extractDocumentText(aiResponse);
                      }
                      // For messages, show message text with clickable links
                      if (elementType === 'message') {
                        const messageText = typeof aiResponse === 'object'
                          ? (aiResponse.message || aiResponse.content || JSON.stringify(aiResponse, null, 2))
                          : aiResponse;
                        return <MessageWithLinks messageText={messageText} />;
                      }
                      // For tasks, show formatted
                      if (elementType === 'task') {
                        if (typeof aiResponse === 'object') {
                          return `${aiResponse.title || ''}\n\n${aiResponse.description || ''}`;
                        }
                        return aiResponse;
                      }
                      // Fallback
                      return typeof aiResponse === 'object'
                        ? JSON.stringify(aiResponse, null, 2)
                        : aiResponse;
                    })()}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button variant="outline" onClick={() => setAiResponse(null)} className="w-full sm:w-auto">
                    Try Again
                  </Button>
                  <Button onClick={handleAcceptAI} className="w-full sm:w-auto">
                    Accept Changes
                  </Button>
                  <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

