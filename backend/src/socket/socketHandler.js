const MessageService = require('../services/messageService');
const ConversationService = require('../services/conversationService');
const db = require('../database/connection');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> Set of socket IDs
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User ${socket.user.username} connected: ${socket.id}`);
      
      // Store user connection
      this.addUserSocket(socket.user.id, socket.id);
      
      // Store socket session in database
      this.storeSocketSession(socket.user.id, socket.id);

      // Handle joining conversation rooms
      socket.on('join_conversation', (data) => {
        this.handleJoinConversation(socket, data);
      });

      // Handle leaving conversation rooms
      socket.on('leave_conversation', (data) => {
        this.handleLeaveConversation(socket, data);
      });

      // Handle sending messages
      socket.on('send_message', (data) => {
        this.handleSendMessage(socket, data);
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing_stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Handle user going online/offline
      socket.on('user_status', (data) => {
        this.handleUserStatus(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
    });
  }

  addUserSocket(userId, socketId) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);
  }

  removeUserSocket(userId, socketId) {
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socketId);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  getUserSockets(userId) {
    return this.userSockets.get(userId) || new Set();
  }

  async storeSocketSession(userId, socketId) {
    try {
      await db.query(
        'INSERT INTO user_sessions (user_id, socket_id) VALUES (?, ?)',
        [userId, socketId]
      );
    } catch (error) {
      console.error('Error storing socket session:', error);
    }
  }

  async removeSocketSession(socketId) {
    try {
      await db.query('DELETE FROM user_sessions WHERE socket_id = ?', [socketId]);
    } catch (error) {
      console.error('Error removing socket session:', error);
    }
  }

  async handleJoinConversation(socket, data) {
    try {
      const { conversationId } = data;

      // Verify user has access to this conversation
      const hasAccess = await ConversationService.verifyUserInConversation(
        conversationId,
        socket.user.id
      );

      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to conversation' });
        return;
      }

      // Join the conversation room
      const roomName = `conversation_${conversationId}`;
      socket.join(roomName);

      socket.emit('conversation_joined', {
        conversationId,
        message: 'Successfully joined conversation'
      });

      console.log(`👥 User ${socket.user.username} joined conversation ${conversationId}`);
    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  }

  async handleLeaveConversation(socket, data) {
    try {
      const { conversationId } = data;
      const roomName = `conversation_${conversationId}`;
      
      socket.leave(roomName);
      socket.emit('conversation_left', { conversationId });

      console.log(`👋 User ${socket.user.username} left conversation ${conversationId}`);
    } catch (error) {
      console.error('Error leaving conversation:', error);
    }
  }

  async handleSendMessage(socket, data) {
    try {
      const { recipientId, encryptedContent, iv, messageType = 'text' } = data;

      // Validate required fields
      if (!recipientId || !encryptedContent || !iv) {
        socket.emit('message_error', { message: 'Missing required fields' });
        return;
      }

      // Can't send message to yourself
      if (recipientId === socket.user.id) {
        socket.emit('message_error', { message: 'Cannot send message to yourself' });
        return;
      }

      // Send the message
      const message = await MessageService.sendMessage(
        socket.user.id,
        recipientId,
        encryptedContent,
        iv,
        messageType
      );

      // Prepare message data for broadcasting
      const messageData = {
        id: message.id,
        conversationId: message.conversationId,
        senderId: socket.user.id,
        senderUsername: socket.user.username,
        recipientId: recipientId,
        encryptedContent: message.encryptedContent,
        iv: message.iv,
        messageType: message.messageType,
        createdAt: message.createdAt
      };

      // Send confirmation to sender
      socket.emit('message_sent', messageData);

      // Send message to conversation room
      const roomName = `conversation_${message.conversationId}`;
      socket.to(roomName).emit('new_message', messageData);

      // Also send directly to recipient if they're online but not in the room
      const recipientSockets = this.getUserSockets(recipientId);
      recipientSockets.forEach(recipientSocketId => {
        const recipientSocket = this.io.sockets.sockets.get(recipientSocketId);
        if (recipientSocket && !recipientSocket.rooms.has(roomName)) {
          recipientSocket.emit('new_message', messageData);
        }
      });

      console.log(`💬 Message sent from ${socket.user.username} to user ${recipientId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  }

  async handleTypingStart(socket, data) {
    try {
      const { conversationId } = data;

      // Verify access to conversation
      const hasAccess = await ConversationService.verifyUserInConversation(
        conversationId,
        socket.user.id
      );

      if (!hasAccess) {
        return;
      }

      const roomName = `conversation_${conversationId}`;
      socket.to(roomName).emit('user_typing', {
        conversationId,
        userId: socket.user.id,
        username: socket.user.username,
        isTyping: true
      });
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  }

  async handleTypingStop(socket, data) {
    try {
      const { conversationId } = data;

      // Verify access to conversation
      const hasAccess = await ConversationService.verifyUserInConversation(
        conversationId,
        socket.user.id
      );

      if (!hasAccess) {
        return;
      }

      const roomName = `conversation_${conversationId}`;
      socket.to(roomName).emit('user_typing', {
        conversationId,
        userId: socket.user.id,
        username: socket.user.username,
        isTyping: false
      });
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  }

  handleUserStatus(socket, data) {
    try {
      const { status } = data; // 'online', 'away', 'busy', etc.
      
      // Broadcast status to all connected users who have conversations with this user
      socket.broadcast.emit('user_status_changed', {
        userId: socket.user.id,
        username: socket.user.username,
        status
      });
    } catch (error) {
      console.error('Error handling user status:', error);
    }
  }

  async handleDisconnection(socket) {
    try {
      console.log(`🔌 User ${socket.user.username} disconnected: ${socket.id}`);
      
      // Remove from user sockets map
      this.removeUserSocket(socket.user.id, socket.id);
      
      // Remove socket session from database
      await this.removeSocketSession(socket.id);

      // Notify others that user went offline (if no other sockets)
      if (this.getUserSockets(socket.user.id).size === 0) {
        socket.broadcast.emit('user_status_changed', {
          userId: socket.user.id,
          username: socket.user.username,
          status: 'offline'
        });
      }
    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  // Utility method to send message to specific user
  sendToUser(userId, event, data) {
    const userSockets = this.getUserSockets(userId);
    userSockets.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
    });
  }

  // Utility method to broadcast to conversation participants
  async broadcastToConversation(conversationId, event, data, excludeUserId = null) {
    try {
      const participants = await ConversationService.getConversationParticipants(conversationId);
      
      participants.forEach(participantId => {
        if (participantId !== excludeUserId) {
          this.sendToUser(participantId, event, data);
        }
      });
    } catch (error) {
      console.error('Error broadcasting to conversation:', error);
    }
  }
}

module.exports = SocketHandler;
