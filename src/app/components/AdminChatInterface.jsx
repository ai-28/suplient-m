"use client"

import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile, Settings } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card } from "@/app/components/ui/card";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Separator } from "@/app/components/ui/separator";
import { Badge } from "@/app/components/ui/badge";
import { MessageActions } from "./MessageActions";
import { EmojiPickerComponent } from "./EmojiPicker";
import { FileAttachmentButton } from "./FileAttachmentButton";
import { VoiceRecorder } from "./VoiceRecorder";
import { VoiceMessage } from "./VoiceMessage";
import { FileAttachmentPreview } from "./FileAttachmentPreview";
import { ReplyPreview } from "./ReplyPreview";
import { RepliedMessage } from "./RepliedMessage";
import { MessageWithLinks } from "./MessageWithLinks";
import { useSession } from "next-auth/react";

export function AdminChatInterface({ 
  participantName, 
  participantInitials, 
  participantType,
  chatId,
  title,
  className = ""
}) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  const handleEditMessage = async (messageId, newContent) => {
    try {
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with demo messages for admin chat
    const demoMessages = [
      {
        id: "admin-1",
        senderId: "admin",
        senderName: "Admin",
        content: `Admin chat with ${participantName}. Messages sent here appear as system notifications.`,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        type: "system",
        status: "read",
        isCoach: false,
        isSystemMessage: true,
        systemType: "info"
      },
      {
        id: "admin-2",
        senderId: "admin",
        senderName: "Admin",
        content: "Platform maintenance scheduled for tonight 11 PM - 1 AM",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        type: "text",
        status: "read",
        isCoach: false
      },
      {
        id: "admin-3",
        senderId: participantType === "coach" ? "coach" : "client",
        senderName: participantName,
        content: "Thanks for the update. I'll inform my clients accordingly.",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        type: "text",
        status: "read",
        isCoach: participantType === "coach"
      }
    ];
    setMessages(demoMessages);
  }, [participantName, participantType]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: `admin-msg-${Date.now()}`,
      senderId: "admin",
      senderName: "Admin",
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: "text",
      status: "sent",
      isCoach: false,
      replyTo: replyingTo?.id
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
    setReplyingTo(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  // Helper: Parse UTC timestamp correctly
  const parseAsUTC = (input) => {
    if (!input) return new Date();
    if (input instanceof Date) return input;
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (trimmed.endsWith('Z') || trimmed.match(/[+-]\d{2}:?\d{2}$/)) {
        return new Date(trimmed);
      }
      const normalized = trimmed.replace(/\s+/, 'T');
      return new Date(normalized + 'Z');
    }
    return new Date(input);
  };

  const formatTimestamp = (timestamp) => {
    // Parse as UTC first (server sends UTC timestamps)
    const date = parseAsUTC(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      // toLocaleTimeString automatically converts UTC to local timezone
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // toLocaleDateString automatically converts UTC to local timezone
      return date.toLocaleDateString();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {participantInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">
              {title || `Admin Chat - ${participantName}`}
            </h3>
            <p className="text-sm text-muted-foreground capitalize">
              {participantType} Communication
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.senderId === "admin";
            const repliedMessage = message.replyTo ? messages.find(m => m.id === message.replyTo) : null;

            return (
              <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                  {!isOwnMessage && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {message.senderName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  )}
                  
                  <div className={`relative group ${isOwnMessage ? 'ml-auto' : ''}`}>
                    {repliedMessage && <RepliedMessage repliedMessage={repliedMessage} />}
                    
                    <Card className={`p-3 ${
                      message.isSystemMessage 
                        ? 'bg-muted border-muted-foreground/20' 
                        : isOwnMessage 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                    }`}>
                      {message.type === "voice" && message.audioUrl ? (
                        <VoiceMessage
                          audioUrl={message.audioUrl}
                          duration={message.duration || 0}
                          waveformData={message.waveformData || []}
                          isOwnMessage={isOwnMessage}
                        />
                      ) : message.type === "file" || message.type === "document" ? (
                        <FileAttachmentPreview
                          fileName={message.fileName || ""}
                          fileSize={message.fileSize}
                          fileType={message.fileType}
                          fileUrl={message.fileUrl}
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.isDeleted ? (
                            <span className="italic opacity-70">This message was deleted</span>
                          ) : (
                            <MessageWithLinks messageText={message.content} />
                          )}
                        </p>
                      )}
                      {message.isEdited && !message.isDeleted && (
                        <span className="text-xs opacity-70 italic mt-1 block">
                          (edited)
                        </span>
                      )}
                    </Card>


                    <MessageActions
                      message={message}
                      onReply={() => setReplyingTo(message)}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                      currentUserId={session?.user?.id}
                    />
                  </div>

                  {isOwnMessage && (
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {message.status}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      <Separator />

      {/* Message Input */}
      <div className="p-4 bg-card">
        {replyingTo && (
          <ReplyPreview
            replyToMessage={replyingTo}
            onCancel={() => setReplyingTo(null)}
          />
        )}
        
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileAttachmentButton onFileSelect={() => {}} />
              <VoiceRecorder
                onSendVoiceMessage={(audioUrl, duration, waveformData) => {
                    const message = {
                    id: `voice-${Date.now()}`,
                    senderId: "admin",
                    senderName: "Admin",
                    content: "",
                    timestamp: new Date().toISOString(),
                    type: "voice",
                    status: "sent",
                    isCoach: false,
                    audioUrl,
                    duration,
                    waveformData
                  };
                  setMessages(prev => [...prev, message]);
                }}
                onCancel={() => {}}
              />
            </div>
            
            <div className="relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Type message to ${participantName} or /system for system notification...`}
                className="pr-12"
              />
              
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="h-8 w-8 p-0"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
              
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 z-50">
                  <EmojiPickerComponent
                    onEmojiClick={(emoji) => {
                      setNewMessage(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          
          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          Tip: Start your message with "/system" to send as a system notification
        </p>
      </div>
    </div>
  );
}