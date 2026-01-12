"use client";

import { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export default function SocketProvider({ children }) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [globalOnlineUsers, setGlobalOnlineUsers] = useState([]);
  const socketInitialized = useRef(false);

  // Memoize user data
  const userData = useMemo(() => {
    if (!session?.user) return null;
    return {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name
    };
  }, [session?.user?.id, session?.user?.email, session?.user?.name]);

  useEffect(() => {
    // Don't initialize socket if session is still loading
    if (status === 'loading') {
      return;
    }

    if (!userData) {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        socketInitialized.current = false;
      }
      return;
    }

    // Prevent multiple socket initializations
    if (socketInitialized.current) {
      return;
    }

    socketInitialized.current = true;

    const newSocket = io(window.location.origin, {
      auth: userData,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 30000,
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      forceNew: true, // Force a new connection
      upgrade: true, // Allow transport upgrades
      rememberUpgrade: false, // Don't remember failed upgrades
      withCredentials: true, // Include credentials
    });

    // Global event handlers
    const handleGlobalUserOnline = (data) => {
      setGlobalOnlineUsers(prev => {
        const exists = prev.some(user => user.userId === data.userId);
        if (!exists) {
          const newList = [...prev, {
            userId: data.userId,
            userName: data.userName
          }];
          return newList;
        }
        return prev;
      });
    };

    const handleGlobalUserOffline = (data) => {
      setGlobalOnlineUsers(prev => {
        const newList = prev.filter(user => user.userId !== data.userId);
        return newList;
      });
    };

    // Connection handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      newSocket.emit('authenticate', userData);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔥 Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
        transport: error.transport
      });
      setConnectionError(error.message);
      setIsConnected(false);
      
      // Reset socket initialization flag on error to allow retry
      socketInitialized.current = false;
    });

    // Handle websocket-specific errors
    newSocket.on('error', (error) => {
      console.error('🔥 Socket error:', error);
      setConnectionError(`Socket error: ${error.message || error}`);
    });

    // Add connection timeout handler
    const connectionTimeout = setTimeout(() => {
      if (!newSocket.connected) {
        console.error('🔥 Socket connection timeout');
        setConnectionError('Connection timeout - trying polling fallback');
        setIsConnected(false);
        socketInitialized.current = false;
        
        // Try to reconnect with polling only
        setTimeout(() => {
          if (!socketInitialized.current) {
            console.log('🔥 Attempting fallback connection with polling only');
            newSocket.io.opts.transports = ['polling'];
            newSocket.connect();
          }
        }, 2000);
      }
    }, 10000); // 10 second timeout

    newSocket.on('connect', () => {
      clearTimeout(connectionTimeout);
      console.log('🔥 Socket connected successfully with transport:', newSocket.io.engine.transport.name);
      
      // Ensure we're in the notifications room after reconnection
      if (userData?.userId) {
        newSocket.emit('join_notifications', userData.userId);
        console.log('🔔 Rejoined notifications room for user:', userData.userId);
      }
    });

    // Register global event listeners
    newSocket.on('user_online_global', handleGlobalUserOnline);
    newSocket.on('user_offline_global', handleGlobalUserOffline);
    newSocket.on('test_event', (data) => {
    });

    // Handle real-time notifications
    newSocket.on('new_notification', (notification) => {
      console.log('🔔 Received new notification via socket:', notification);
      // Dispatch custom DOM event for useNotifications hook to catch
      window.dispatchEvent(new CustomEvent('new_notification', { 
        detail: notification 
      }));
    });

    // Handle unread count updates
    newSocket.on('update_unread_count', (data) => {
      console.log('📊 Received unread count update via socket:', data);
      // Dispatch custom DOM event for client pages to catch
      window.dispatchEvent(new CustomEvent('update_unread_count', { 
        detail: data 
      }));
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.off('user_online_global', handleGlobalUserOnline);
      newSocket.off('user_offline_global', handleGlobalUserOffline);
      newSocket.off('test_event');
      newSocket.off('new_notification');
      newSocket.off('update_unread_count');
      newSocket.removeAllListeners();
      newSocket.disconnect();
      socketInitialized.current = false;
    };
  }, [userData, status]);

  const value = {
    socket,
    isConnected,
    connectionError,
    globalOnlineUsers,
    joinConversation: (conversationId) => {
      if (socket && isConnected) {
        socket.emit('join_conversation', { conversationId });
      }
    },
    leaveConversation: (conversationId) => {
      if (socket) {
        socket.emit('leave_conversation', { conversationId });
      }
    },
    sendMessage: (conversationId, messageData) => {
      if (socket && isConnected && conversationId) {
        socket.emit('send_message', {
          conversationId,
          ...messageData
        });
      }
    },
    startTyping: (conversationId) => {
      if (socket && isConnected) {
        socket.emit('typing_start', {
          conversationId,
          userId: userData?.userId,
          userName: userData?.userName
        });
      }
    },
    stopTyping: (conversationId) => {
      if (socket && isConnected) {
        socket.emit('typing_stop', {
          conversationId,
          userId: userData?.userId,
          userName: userData?.userName
        });
      }
    }
  };


  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}