import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '../components/providers/SocketProvider';

export function useChat(conversationId) {
  const { data: session } = useSession();
  const { socket, isConnected, globalOnlineUsers, joinConversation, leaveConversation, sendMessage, startTyping, stopTyping } = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingMessages, setPendingMessages] = useState(new Set()); // Track pending messages

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pageRef = useRef(0);
  const pageSize = 50;

  // Load messages from API
  const loadMessages = useCallback(async (page = 0, append = false) => {
    if (!conversationId || !session?.user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/chat/conversations/${conversationId}/messages?limit=${pageSize}&offset=${page * pageSize}`);

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();

      if (data.success) {
        const newMessages = (data.messages || []).map(msg => {
          // Parse timestamp - server sends UTC timestamps as ISO strings (ending with 'Z')
          let timestamp = msg.timestamp || msg.createdAt;
          if (typeof timestamp === 'string') {
            const trimmed = timestamp.trim();
            // If no timezone info, append 'Z' to force UTC interpretation
            if (!trimmed.endsWith('Z') && !trimmed.match(/[+-]\d{2}:?\d{2}$/)) {
              const normalized = trimmed.replace(/\s+/, 'T');
              timestamp = new Date(normalized + 'Z');
            } else {
              timestamp = new Date(trimmed);
            }
          } else {
            timestamp = new Date(timestamp);
          }

          return {
            ...msg,
            timestamp,
            // Keep readBy data from database for persistence
            readBy: msg.readBy || []
          };
        });

        if (append) {
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
        }

        setHasMore(newMessages.length === pageSize);
        pageRef.current = page;
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId, session?.user]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(() => {
    if (hasMore && !loading) {
      loadMessages(pageRef.current + 1, true);
    }
  }, [hasMore, loading, loadMessages]);

  // Send message
  const sendChatMessage = useCallback(async (content, type = 'text', options = {}) => {
    if (!conversationId || !session?.user || sending) return;

    try {
      setSending(true);
      setError(null);

      // Optimistically add message to UI
      const messageKey = `${session.user.id}-${Date.now()}-${Math.random()}`;
      const tempMessage = {
        id: `temp-${messageKey}`,
        messageKey, // Add unique key for tracking
        content,
        type,
        senderId: session.user.id,
        senderName: session.user.name,
        senderRole: session.user.role,
        timestamp: new Date(), // Use local Date object to preserve local time
        status: 'sending',
        ...options
      };

      setMessages(prev => [...prev, tempMessage]);
      setPendingMessages(prev => new Set([...prev, messageKey]));

      // Send via API - it will handle persistence and socket emission
      // Removed socket.emit('send_message') to prevent duplicates
      // The API route emits the socket event with full message data
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          type,
          ...options
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      if (data.success) {
        // Update the temp message with database response
        setMessages(prev => {
          return prev.map(msg => {
            if (msg.messageKey === tempMessage.messageKey) {
              return {
                ...msg, // Keep existing message data
                id: data.message.id, // Use database ID
                status: 'sent',
                timestamp: msg.timestamp, // Keep the original local timestamp
                content: data.message.content || msg.content,
                replyToId: data.message.replyToId || msg.replyToId,
                replyTo: data.message.replyTo || msg.replyTo, // Preserve replyTo data
                readBy: data.message.readBy || msg.readBy || []
              };
            }
            return msg;
          });
        });

        // Remove from pending messages
        setPendingMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempMessage.messageKey);
          return newSet;
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message);

      // Update temp message to show error
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id
          ? { ...msg, status: 'error' }
          : msg
      ));

      // Remove from pending messages on error
      setPendingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempMessage.messageKey);
        return newSet;
      });
    } finally {
      setSending(false);
    }
  }, [conversationId, session?.user, sending, sendMessage]);

  // Handle typing
  const handleTyping = useCallback(() => {
    if (!conversationId) return;

    startTyping(conversationId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId);
    }, 2000);
  }, [conversationId, startTyping, stopTyping]);


  // Socket event handlers
  useEffect(() => {
    if (!socket || !conversationId) return;

    // Join conversation when socket connects
    if (isConnected) {
      joinConversation(conversationId);
    }

    // Message events
    const handleNewMessage = (message) => {
      setMessages(prev => {
        // For messages sent by current user, check if we have a temp message with same content
        if (message.senderId === session?.user?.id) {
          // First try to match by ID (if API response already updated temp message with real ID)
          const idMatchIndex = prev.findIndex(msg =>
            msg.id && message.id && String(msg.id) === String(message.id)
          );

          if (idMatchIndex !== -1) {
            // Message already exists with this ID, just update it
            const newMessages = [...prev];
            newMessages[idMatchIndex] = {
              ...newMessages[idMatchIndex],
              ...message,
              messageKey: newMessages[idMatchIndex].messageKey, // Preserve the message key
              status: 'delivered',
              timestamp: newMessages[idMatchIndex].timestamp, // Keep the original local timestamp
            };
            return newMessages;
          }

          // Then try to match by temp message key/content
          const tempMessageIndex = prev.findIndex(msg =>
            msg.messageKey &&
            (msg.content === message.content || msg.content === (message.content || message.text)) &&
            String(msg.senderId) === String(message.senderId) &&
            pendingMessages.has(msg.messageKey)
          );

          if (tempMessageIndex !== -1) {
            const newMessages = [...prev];
            newMessages[tempMessageIndex] = {
              ...message,
              messageKey: prev[tempMessageIndex].messageKey, // Preserve the message key
              status: 'delivered', // Socket confirmation means delivered
              timestamp: prev[tempMessageIndex].timestamp, // Keep the original local timestamp
              content: message.content || message.text || '[Message received]',
              replyToId: message.replyToId || prev[tempMessageIndex].replyToId,
              replyTo: message.replyTo || prev[tempMessageIndex].replyTo // Preserve replyTo data
            };
            return newMessages;
          }

          // If no temp message found, skip this socket message for current user
          // (it will be handled by API response)
          return prev;
        }

        // For messages from other users, check if message already exists
        const exists = prev.some(msg => {
          // If both have IDs, compare by ID (handle both UUID and string formats)
          if (msg.id && message.id) {
            const msgIdStr = String(msg.id);
            const messageIdStr = String(message.id);
            // Exact ID match
            if (msgIdStr === messageIdStr) {
              return true;
            }
            // Handle temp IDs that might match
            if (msgIdStr.startsWith('temp-') && messageIdStr.startsWith('temp-')) {
              // Compare the key part after 'temp-'
              const msgKey = msgIdStr.replace('temp-', '');
              const messageKey = messageIdStr.replace('temp-', '');
              if (msgKey === messageKey) {
                return true;
              }
            }
          }

          // If no IDs or different ID formats, compare by content, sender, and timestamp
          // Also check replyToId to distinguish replies
          const msgTime = msg.timestamp || msg.createdAt;
          const messageTime = message.timestamp || message.createdAt;
          const timeDiff = Math.abs(new Date(msgTime) - new Date(messageTime));

          const msgContent = msg.content || msg.text || '';
          const messageContent = message.content || message.text || '';
          const sameContent = msgContent === messageContent && msgContent.trim() !== '';
          const sameSender = String(msg.senderId) === String(message.senderId);
          const sameReplyTo = String(msg.replyToId || '') === String(message.replyToId || '');

          // Consider it a duplicate if content, sender, and replyTo match within 5 seconds
          // Reduced from 10 seconds to be more strict
          return sameContent && sameSender && sameReplyTo && timeDiff < 5000;
        });

        if (exists) {
          return prev;
        }

        // Parse timestamp - server sends UTC timestamps as ISO strings (ending with 'Z')
        let timestamp = message.timestamp || message.createdAt;
        if (typeof timestamp === 'string') {
          const trimmed = timestamp.trim();
          // If no timezone info, append 'Z' to force UTC interpretation
          if (!trimmed.endsWith('Z') && !trimmed.match(/[+-]\d{2}:?\d{2}$/)) {
            const normalized = trimmed.replace(/\s+/, 'T');
            timestamp = new Date(normalized + 'Z');
          } else {
            timestamp = new Date(trimmed);
          }
        } else {
          timestamp = new Date(timestamp);
        }

        const newMessage = {
          ...message,
          status: 'received',
          timestamp,
          content: message.content || message.text || '[Message received]',
          replyToId: message.replyToId,
          replyTo: message.replyTo // Preserve replyTo data from socket/API
        };
        return [...prev, newMessage];
      });
    };

    // Typing events
    const handleUserTyping = (data) => {
      if (data.conversationId === conversationId) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            return [...prev.filter(user => user.userId !== data.userId), {
              userId: data.userId,
              userName: data.userName
            }];
          } else {
            return prev.filter(user => user.userId !== data.userId);
          }
        });
      }
    };

    // Handle message edited event
    const handleMessageEdited = (data) => {
      // Compare as strings to handle UUID format differences
      const eventConvId = String(data.conversationId || '');
      const currentConvId = String(conversationId || '');

      if (eventConvId === currentConvId) {
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === data.messageId);
          if (!messageExists) {
            return prev;
          }

          return prev.map(msg =>
            msg.id === data.messageId
              ? {
                ...msg,
                content: data.content,
                isEdited: true,
                editedAt: data.editedAt,
                updatedAt: data.editedAt
              }
              : msg
          );
        });
      }
    };

    // Handle message deleted event - update to show deleted placeholder
    const handleMessageDeleted = (data) => {
      console.log('🗑️ Received message_deleted event:', data, 'Current conversationId:', conversationId);
      // Compare as strings to handle UUID format differences
      const eventConvId = String(data.conversationId || '');
      const currentConvId = String(conversationId || '');

      if (eventConvId === currentConvId) {
        console.log('✅ Updating deleted message in UI:', data.messageId);
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === data.messageId);
          if (!messageExists) {
            console.warn('⚠️ Message not found in current messages:', data.messageId);
            return prev;
          }

          const updated = prev.map(msg =>
            msg.id === data.messageId
              ? {
                ...msg,
                content: data.content || '[This message was deleted]',
                isDeleted: true,
                deletedAt: data.deletedAt
              }
              : msg
          );
          console.log('🗑️ Updated deleted message:', updated.find(m => m.id === data.messageId));
          return updated;
        });
      } else {
        console.log('❌ Conversation ID mismatch. Event:', eventConvId, 'Current:', currentConvId, 'Types:', typeof data.conversationId, typeof conversationId);
      }
    };

    // Online/offline events are now handled globally in useSocket hook

    // Global online/offline events are now handled in useSocket hook



    // Register event listeners
    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);

    // Cleanup
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);

      if (isConnected) {
        leaveConversation(conversationId);
      }
    };
  }, [socket, conversationId, isConnected, joinConversation, leaveConversation, session?.user?.id]);

  // Load initial messages
  useEffect(() => {
    if (conversationId && session?.user) {
      loadMessages(0, false);
    }
  }, [conversationId, session?.user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    setMessages,
    loading,
    error,
    sending,
    typingUsers,
    onlineUsers: globalOnlineUsers,
    hasMore,
    isConnected,
    loadMoreMessages,
    sendMessage: sendChatMessage,
    handleTyping,
    messagesEndRef
  };
}

