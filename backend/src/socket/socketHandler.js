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
      this.addUserSocket(socket.user.id, socket.id);
      this.storeSocketSession(socket.user.id, socket.id);

      socket.on('join_conversation', (data) => {
        this.handleJoinConversation(socket, data);
      });

      socket.on('leave_conversation', (data) => {
        this.handleLeaveConversation(socket, data);
      });

      socket.on('send_message', (data) => {
        this.handleSendMessage(socket, data);
      });

      socket.on('typing_start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing_stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      socket.on('user_status', (data) => {
        this.handleUserStatus(socket, data);
      });

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
      // Silent fail for session storage
    }
  }

  async removeSocketSession(socketId) {
    try {
      await db.query('DELETE FROM user_sessions WHERE socket_id = ?', [socketId]);
    } catch (error) {
      // Silent fail for session cleanup
    }
  }

  async handleJoinConversation(socket, data) {
    try {
      const { conversationId } = data;

      const hasAccess = await ConversationService.verifyUserInConversation(
        conversationId,
        socket.user.id
      );

      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to conversation' });
        return;
      }

      const roomName = `conversation_${conversationId}`;
      socket.join(roomName);

      socket.emit('conversation_joined', {
        conversationId,
        message: 'Successfully joined conversation'
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  }

  async handleLeaveConversation(socket, data) {
    try {
      const { conversationId } = data;
      const roomName = `conversation_${conversationId}`;
      
      socket.leave(roomName);
      socket.emit('conversation_left', { conversationId });
    } catch (error) {
      // Silent fail for leaving conversation
    }
  }

  async handleSendMessage(socket, data) {
    try {
      const { recipientId, encryptedContent, iv, messageType = 'text' } = data;

      if (!recipientId || !encryptedContent || !iv) {
        socket.emit('message_error', { message: 'Missing required fields' });
        return;
      }

      if (recipientId === socket.user.id) {
        socket.emit('message_error', { message: 'Cannot send message to yourself' });
        return;
      }

      const conversationIntId = await ConversationService.findOrCreateConversation(
        socket.user.id,
        recipientId
      );

      const conversationResult = await db.query(
        'SELECT conversation_id FROM conversations WHERE id = ?',
        [conversationIntId]
      );

      if (conversationResult.length === 0) {
        socket.emit('message_error', { message: 'Conversation not found' });
        return;
      }

      const conversationUuid = conversationResult[0].conversation_id;

      const message = await MessageService.sendMessage(
        conversationUuid,
        socket.user.id,
        encryptedContent,
        iv,
        messageType
      );

      const messageData = {
        id: message.id,
        conversationId: conversationIntId,
        senderId: socket.user.id,
        senderUsername: socket.user.username,
        recipientId: recipientId,
        encryptedContent: message.encryptedContent,
        iv: message.iv,
        messageType: message.messageType,
        createdAt: message.createdAt
      };

      socket.emit('message_sent', messageData);

      const roomName = `conversation_${conversationIntId}`;
      socket.to(roomName).emit('new_message', messageData);

      const recipientSockets = this.getUserSockets(recipientId);
      recipientSockets.forEach(recipientSocketId => {
        const recipientSocket = this.io.sockets.sockets.get(recipientSocketId);
        if (recipientSocket && !recipientSocket.rooms.has(roomName)) {
          recipientSocket.emit('new_message', messageData);
        }
      });
    } catch (error) {
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  }

  async handleTypingStart(socket, data) {
    try {
      const { conversationId } = data;

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
      // Silent fail for typing indicators
    }
  }

  async handleTypingStop(socket, data) {
    try {
      const { conversationId } = data;

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
      // Silent fail for typing indicators
    }
  }

  handleUserStatus(socket, data) {
    try {
      const { status } = data;
      
      socket.broadcast.emit('user_status_changed', {
        userId: socket.user.id,
        username: socket.user.username,
        status
      });
    } catch (error) {
      // Silent fail for user status
    }
  }

  async handleDisconnection(socket) {
    try {
      this.removeUserSocket(socket.user.id, socket.id);
      await this.removeSocketSession(socket.id);

      if (this.getUserSockets(socket.user.id).size === 0) {
        socket.broadcast.emit('user_status_changed', {
          userId: socket.user.id,
          username: socket.user.username,
          status: 'offline'
        });
      }
    } catch (error) {
      // Silent fail for disconnection handling
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
      // Silent fail for broadcasting
    }
  }
}

module.exports = SocketHandler;
