const { NextRequest } = require('next/server');
const { Server } = require('socket.io');
const { createServer } = require('http');
const jwt = require('jsonwebtoken');
const { sql } = require('../db/postgresql');

// This will be used in your Next.js API route
class SocketManager {
  constructor() {
    this.io = null;
    this.activeUsers = new Map();
    this.userRooms = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupEventHandlers();
    return this.io;
  }

  setupEventHandlers() {
    // JWT verification middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        socket.userId = decoded.sub;
        socket.userRole = decoded.role;
        socket.userName = decoded.name;
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {

      // Add user to active users
      this.activeUsers.set(socket.userId, {
        socketId: socket.id,
        userId: socket.userId,
        userName: socket.userName,
        userRole: socket.userRole,
        connectedAt: new Date()
      });

      // Join user to their personal room
      socket.join(`user:${socket.userId}`);

      // Event handlers
      this.setupUserEvents(socket);
      this.setupConversationEvents(socket);
      this.setupMessageEvents(socket);
      this.setupTypingEvents(socket);
      this.setupNotificationEvents(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
    });
  }

  setupUserEvents(socket) {
    socket.on('join_conversations', async () => {
      try {
        const conversations = await this.getUserConversations(socket.userId);

        conversations.forEach(conversation => {
          socket.join(`conversation_${conversation.id}`);
          this.userRooms.set(socket.userId, [
            ...(this.userRooms.get(socket.userId) || []),
            `conversation_${conversation.id}`
          ]);
        });

        // Emit online status to all conversations
        conversations.forEach(conversation => {
          socket.to(`conversation_${conversation.id}`).emit('user_online', {
            userId: socket.userId,
            userName: socket.userName,
            conversationId: conversation.id
          });
        });

        socket.emit('conversations_joined', { count: conversations.length });
      } catch (error) {
        console.error('Error joining conversations:', error);
        socket.emit('error', { message: 'Failed to join conversations' });
      }
    });
  }

  setupConversationEvents(socket) {
    socket.on('join_conversation', async (data) => {
      try {
        const { conversationId } = data;

        const isParticipant = await this.verifyConversationParticipant(conversationId, socket.userId);

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
          return;
        }

        socket.join(`conversation_${conversationId}`);

        const currentRooms = this.userRooms.get(socket.userId) || [];
        if (!currentRooms.includes(`conversation_${conversationId}`)) {
          this.userRooms.set(socket.userId, [...currentRooms, `conversation_${conversationId}`]);
        }

        socket.to(`conversation_${conversationId}`).emit('user_online', {
          userId: socket.userId,
          userName: socket.userName,
          conversationId
        });

        socket.emit('conversation_joined', { conversationId });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    socket.on('leave_conversation', (data) => {
      const { conversationId } = data;
      socket.leave(`conversation_${conversationId}`);

      const currentRooms = this.userRooms.get(socket.userId) || [];
      this.userRooms.set(socket.userId, currentRooms.filter(room => room !== `conversation_${conversationId}`));

      socket.to(`conversation_${conversationId}`).emit('user_offline', {
        userId: socket.userId,
        userName: socket.userName,
        conversationId
      });

      socket.emit('conversation_left', { conversationId });
    });
  }

  setupMessageEvents(socket) {
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, type = 'text', replyToId, fileUrl, fileName, fileSize, fileType, audioUrl, audioDuration, waveformData } = data;

        const isParticipant = await this.verifyConversationParticipant(conversationId, socket.userId);
        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to send messages to this conversation' });
          return;
        }

        const message = await this.saveMessage({
          conversationId,
          senderId: socket.userId,
          content,
          type,
          replyToId,
          fileUrl,
          fileName,
          fileSize,
          fileType,
          audioUrl,
          audioDuration,
          waveformData
        });

        const messageData = {
          ...message,
          senderName: socket.userName,
          senderRole: socket.userRole
        };

        this.io.to(`conversation_${conversationId}`).emit('new_message', messageData);
        await this.updateConversationActivity(conversationId);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

  }

  setupTypingEvents(socket) {
    socket.on('typing_start', async (data) => {
      try {
        const { conversationId } = data;

        const isParticipant = await this.verifyConversationParticipant(conversationId, socket.userId);
        if (!isParticipant) return;

        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userName,
          conversationId,
          isTyping: true
        });
      } catch (error) {
        console.error('Error handling typing start:', error);
      }
    });

    socket.on('typing_stop', async (data) => {
      try {
        const { conversationId } = data;

        const isParticipant = await this.verifyConversationParticipant(conversationId, socket.userId);
        if (!isParticipant) return;

        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userName,
          conversationId,
          isTyping: false
        });
      } catch (error) {
        console.error('Error handling typing stop:', error);
      }
    });
  }


  handleDisconnection(socket) {

    this.activeUsers.delete(socket.userId);

    const rooms = this.userRooms.get(socket.userId) || [];
    rooms.forEach(room => {
      if (room.startsWith('conversation_')) {
        const conversationId = room.replace('conversation_', '');
        socket.to(room).emit('user_offline', {
          userId: socket.userId,
          userName: socket.userName,
          conversationId
        });
      }
    });

    this.userRooms.delete(socket.userId);
  }

  // Database helper methods
  async getUserConversations(userId) {
    const result = await sql`
      SELECT DISTINCT c.id
      FROM "Conversation" c
      JOIN "ConversationParticipant" cp ON c.id = cp."conversationId"
      WHERE cp."userId" = $1 AND cp."isActive" = true AND c."isActive" = true
    `;
    return result;
  }

  async verifyConversationParticipant(conversationId, userId) {
    const result = await sql`
      SELECT 1 FROM "ConversationParticipant"
      WHERE "conversationId" = $1 AND "userId" = $2 AND "isActive" = true
    `;
    return result.length > 0;
  }

  async verifyMessageAccess(messageId, userId) {
    const result = await sql`
      SELECT 1 FROM "Message" m
      JOIN "ConversationParticipant" cp ON m."conversationId" = cp."conversationId"
      WHERE m.id = $1 AND cp."userId" = $2 AND cp."isActive" = true
    `;
    return result.length > 0;
  }

  async saveMessage(messageData) {
    const {
      conversationId,
      senderId,
      content,
      type,
      replyToId,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      audioUrl,
      audioDuration,
      waveformData
    } = messageData;

    const result = await sql`
      INSERT INTO "Message" (
        "conversationId", "senderId", content, type, "replyToId",
        "fileUrl", "fileName", "fileSize", "fileType",
        "audioUrl", "audioDuration", "waveformData"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, "createdAt"
    `;

    return result[0];
  }

  async updateConversationActivity(conversationId) {
    await sql`
      UPDATE "Conversation" 
      SET "updatedAt" = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
  }



  async getMessageById(messageId) {
    const result = await sql`
      SELECT "conversationId" FROM "Message" WHERE id = $1
    `;
    return result[0];
  }


  // Health check methods
  getActiveUsersCount() {
    return this.activeUsers.size;
  }

  getActiveUsers() {
    return Array.from(this.activeUsers.values());
  }

  setupNotificationEvents(socket) {
    // Handle joining notification room
    socket.on('join_notifications', (userId) => {
      socket.join(`notifications_${userId}`);
    });

    // Handle leaving notification room
    socket.on('leave_notifications', (userId) => {
      socket.leave(`notifications_${userId}`);
    });

    // Handle creating notifications (for server-side use)
    socket.on('create_notification', async (data) => {
      try {
        const { notificationSchema } = await import('@/app/lib/db/notificationSchema');
        const result = await notificationSchema.createNotification(data);

        if (result.success) {
          // Emit notification to the specific user
          this.io.to(`notifications_${data.userId}`).emit('new_notification', result.data);
        }
      } catch (error) {
        console.error('❌ Error creating real-time notification:', error);
      }
    });
  }
}

// Global instance
let socketManager = null;

function getSocketManager() {
  if (!socketManager) {
    socketManager = new SocketManager();
  }
  return socketManager;
}

module.exports = {
  SocketManager,
  getSocketManager
};