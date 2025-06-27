import { io, Socket } from 'socket.io-client';
import type { Message, SocketEvents } from '@shared/types';

type SocketEventHandler = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private baseURL: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
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
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('🔌 Connected to socket server');
        this.isAuthenticated = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.isAuthenticated = false;
        
        if (error.message === 'Authentication required' || 
            error.message === 'Authentication failed') {
          reject(new Error('Authentication failed'));
        } else {
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from socket server:', reason);
        this.isAuthenticated = false;
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          this.handleReconnect(token);
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
        this.isAuthenticated = true;
        this.reconnectAttempts = 0;
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Failed to reconnect to socket server');
        this.isAuthenticated = false;
        reject(new Error('Failed to reconnect'));
      });

      // Global error handler
      this.socket.on('error', (error) => {
        console.error('🚨 Socket error:', error);
      });
    });
  }

  private async handleReconnect(token: string): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect(token).catch(console.error);
    }, this.reconnectDelay * this.reconnectAttempts);
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
  joinConversation(conversationId: number): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }
    
    this.socket.emit('join_conversation', { conversationId });
  }

  leaveConversation(conversationId: number): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }
    
    this.socket.emit('leave_conversation', { conversationId });
  }

  // Message methods
  sendMessage(messageData: {
    recipientId: number;
    encryptedContent: string;
    iv: string;
    messageType?: 'text';
  }): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }
    
    this.socket.emit('send_message', messageData);
  }

  // Typing indicators
  startTyping(conversationId: number): void {
    if (!this.socket?.connected) {
      return;
    }
    
    this.socket.emit('typing_start', { conversationId });
  }

  stopTyping(conversationId: number): void {
    if (!this.socket?.connected) {
      return;
    }
    
    this.socket.emit('typing_stop', { conversationId });
  }

  // User status
  updateUserStatus(status: string): void {
    if (!this.socket?.connected) {
      return;
    }
    
    this.socket.emit('user_status', { status });
  }

  // Event listeners
  onConversationJoined(handler: (data: { conversationId: number; message: string }) => void): void {
    this.socket?.on('conversation_joined', handler);
  }

  onConversationLeft(handler: (data: { conversationId: number }) => void): void {
    this.socket?.on('conversation_left', handler);
  }

  onNewMessage(handler: (message: Message) => void): void {
    this.socket?.on('new_message', handler);
  }

  onMessageSent(handler: (message: Message) => void): void {
    this.socket?.on('message_sent', handler);
  }

  onMessageError(handler: (error: { message: string }) => void): void {
    this.socket?.on('message_error', handler);
  }

  onUserTyping(handler: (data: {
    conversationId: number;
    userId: number;
    username: string;
    isTyping: boolean;
  }) => void): void {
    this.socket?.on('user_typing', handler);
  }

  onUserStatusChanged(handler: (data: {
    userId: number;
    username: string;
    status: string;
  }) => void): void {
    this.socket?.on('user_status_changed', handler);
  }

  // Remove event listeners
  offConversationJoined(handler?: SocketEventHandler): void {
    this.socket?.off('conversation_joined', handler);
  }

  offConversationLeft(handler?: SocketEventHandler): void {
    this.socket?.off('conversation_left', handler);
  }

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

  offUserStatusChanged(handler?: SocketEventHandler): void {
    this.socket?.off('user_status_changed', handler);
  }

  // Utility method to remove all listeners
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Get socket ID for debugging
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Check if specific event has listeners
  hasListeners(event: string): boolean {
    return this.socket?.hasListeners(event) || false;
  }

  // Emit custom events
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }
    
    this.socket.emit(event, data);
  }

  // Listen to custom events
  on(event: string, handler: SocketEventHandler): void {
    this.socket?.on(event, handler);
  }

  // Remove custom event listeners
  off(event: string, handler?: SocketEventHandler): void {
    this.socket?.off(event, handler);
  }

  // Promise-based emit with acknowledgment
  emitWithAck(event: string, data?: any, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('Socket acknowledgment timeout'));
      }, timeout);

      this.socket.emit(event, data, (response: any) => {
        clearTimeout(timer);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Create and export a singleton instance
const socketService = new SocketService();
export default socketService;

// Also export the class for testing or multiple instances
export { SocketService };
