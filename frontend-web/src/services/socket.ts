/**
 * Socket Service - Step 7: Simple Real-Time Messaging
 * Simplified for basic real-time chat
 */

import { io, Socket } from 'socket.io-client';

type SocketEventHandler = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private baseURL: string;
  private isAuthenticated = false;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.baseURL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        autoConnect: true
      });

      this.socket.on('connect', () => {
        console.log('🔌 Connected to socket server');
        this.isAuthenticated = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.isAuthenticated = false;
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from socket server:', reason);
        this.isAuthenticated = false;
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isAuthenticated = false;
      console.log('🔌 Disconnected from socket server');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected && this.isAuthenticated || false;
  }

  // Conversation methods
  joinConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot join conversation');
      return;
    }
    
    console.log(`🚪 Joining conversation: ${conversationId}`);
    this.socket.emit('join_conversation', { conversationId });
  }

  leaveConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      return;
    }
    
    console.log(`🚪 Leaving conversation: ${conversationId}`);
    this.socket.emit('leave_conversation', { conversationId });
  }

  // Simple message sending
  sendMessage(messageData: {
    conversationId: string;
    content: string;
    messageType?: 'text';
  }): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send message');
      return;
    }
    
    console.log(`📤 Sending message via socket:`, messageData);
    this.socket.emit('send_message', messageData);
  }

  // Typing indicators
  startTyping(conversationId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_start', { conversationId });
  }

  stopTyping(conversationId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_stop', { conversationId });
  }

  // Event listeners for real-time updates
  onNewMessage(handler: (message: any) => void): void {
    this.socket?.on('new_message', handler);
  }

  onMessageSent(handler: (message: any) => void): void {
    this.socket?.on('message_sent', handler);
  }

  onMessageError(handler: (error: { message: string }) => void): void {
    this.socket?.on('message_error', handler);
  }

  onUserTyping(handler: (data: {
    conversationId: string;
    userId: number;
    username: string;
    isTyping: boolean;
  }) => void): void {
    this.socket?.on('user_typing', handler);
  }

  onConversationJoined(handler: (data: { conversationId: string }) => void): void {
    this.socket?.on('conversation_joined', handler);
  }

  // Remove event listeners
  offNewMessage(handler?: SocketEventHandler): void {
    this.socket?.off('new_message', handler);
  }

  offMessageSent(handler?: SocketEventHandler): void {
    this.socket?.off('message_sent', handler);
  }

  offMessageError(handler?: SocketEventHandler): void {
    this.socket?.off('message_error', handler);
  }

  offUserTyping(handler?: SocketEventHandler): void {
    this.socket?.off('user_typing', handler);
  }

  // Utility methods
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn(`Socket not connected, cannot emit ${event}`);
      return;
    }
    
    this.socket.emit(event, data);
  }

  on(event: string, handler: SocketEventHandler): void {
    this.socket?.on(event, handler);
  }

  off(event: string, handler?: SocketEventHandler): void {
    this.socket?.off(event, handler);
  }
}

// Create and export a singleton instance
const socketService = new SocketService();
export default socketService;

// Also export the class
export { SocketService };
