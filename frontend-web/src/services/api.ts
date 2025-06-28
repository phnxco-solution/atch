/**
 * API Service - Step 4 Updated
 * Handles communication with encrypted backend
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Step 4: Updated types for encryption support
interface User {
  id: number;
  username: string;
  email: string;
  publicKey: string;
  masterKeySalt?: string; // Only included for current user
  createdAt?: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

interface Message {
  id: number;
  conversationId: string;
  senderId: number;
  senderUsername: string;
  senderPublicKey: string;
  encryptedContent: string;
  iv: string;
  messageType: 'text';
  createdAt: string;
}

interface ConversationKey {
  keyId: string;
  encryptedAesKey: string;
  iv: string;
  createdAt: string;
}

interface ConversationParticipant {
  userId: number;
  username: string;
  publicKey: string;
}

interface ConversationInfo {
  conversationId: string;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearStoredToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setStoredToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private clearStoredToken(): void {
    localStorage.removeItem('auth_token');
  }

  // ===== AUTH ENDPOINTS - Step 4 Updated =====

  async register(userData: {
    username: string;
    email: string;
    password: string;
    publicKey: string;
    masterKeySalt: string;
  }): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/api/auth/register', userData);
    
    if (response.data.success && response.data.data) {
      this.setStoredToken(response.data.data.token);
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Registration failed');
  }

  async login(credentials: {
    username: string;
    password: string;
  }): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/api/auth/login', credentials);
    
    if (response.data.success && response.data.data) {
      this.setStoredToken(response.data.data.token);
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Login failed');
  }

  async logout(): Promise<void> {
    this.clearStoredToken();
  }

  async getProfile(): Promise<User> {
    const response = await this.api.get<ApiResponse<{ user: User }>>('/api/auth/profile');
    
    if (response.data.success && response.data.data) {
      return response.data.data.user;
    }
    
    throw new Error(response.data.message || 'Failed to get profile');
  }

  async verifyToken(): Promise<User> {
    const response = await this.api.get<ApiResponse<{ user: User }>>('/api/auth/verify-token');
    
    if (response.data.success && response.data.data) {
      return response.data.data.user;
    }
    
    throw new Error(response.data.message || 'Token verification failed');
  }

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const response = await this.api.get<ApiResponse<{ users: User[] }>>(
      `/api/auth/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.users;
    }
    
    throw new Error(response.data.message || 'Search failed');
  }

  async getUserByUsername(username: string): Promise<User> {
    const response = await this.api.get<ApiResponse<{ user: User }>>(
      `/api/auth/username/${encodeURIComponent(username)}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.user;
    }
    
    throw new Error(response.data.message || 'User not found');
  }

  // ===== CONVERSATION ENDPOINTS =====

  async getConversations(): Promise<import('@shared/types').Conversation[]> {
    const response = await this.api.get<ApiResponse<{ conversations: import('@shared/types').Conversation[] }>>(
      '/api/conversations'
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.conversations;
    }
    
    throw new Error(response.data.message || 'Failed to get conversations');
  }

  async createConversation(userId: number): Promise<import('@shared/types').Conversation> {
    const response = await this.api.post<ApiResponse<{ conversation: import('@shared/types').Conversation }>>(
      '/api/conversations',
      { participantId: userId }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.conversation;
    }
    
    throw new Error(response.data.message || 'Failed to create conversation');
  }

  async getMessages(conversationId: number): Promise<import('@shared/types').Message[]> {
    const response = await this.api.get<ApiResponse<{ messages: import('@shared/types').Message[] }>>(
      `/api/conversations/${conversationId}/messages`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.messages;
    }
    
    throw new Error(response.data.message || 'Failed to get messages');
  }

  async getConversationDetails(conversationId: number): Promise<{ conversationId: string; participants: User[] }> {
    const response = await this.api.get<ApiResponse<{ conversation: any }>>(
      `/api/conversations/${conversationId}`
    );
    
    if (response.data.success && response.data.data) {
      // For now, return a simple structure - we'll need the backend to provide the UUID
      return {
        conversationId: `conv_${conversationId}`, // Temporary - should come from backend
        participants: []
      };
    }
    
    throw new Error(response.data.message || 'Failed to get conversation details');
  }

  // ===== CONVERSATION KEY ENDPOINTS - Step 4 New =====

  async storeConversationKey(
    conversationId: string,
    keyId: string,
    encryptedAesKey: string,
    iv: string
  ): Promise<void> {
    const response = await this.api.post<ApiResponse>('/api/conversation-keys/store', {
      conversationId,
      keyId,
      encryptedAesKey,
      iv
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to store conversation key');
    }
  }

  async getConversationKey(conversationId: string): Promise<ConversationKey> {
    const response = await this.api.get<ApiResponse<{ conversationKey: ConversationKey }>>(
      `/api/conversation-keys/${conversationId}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.conversationKey;
    }
    
    throw new Error(response.data.message || 'Failed to get conversation key');
  }

  async getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    const response = await this.api.get<ApiResponse<{ participants: ConversationParticipant[] }>>(
      `/api/conversation-keys/${conversationId}/participants`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.participants;
    }
    
    throw new Error(response.data.message || 'Failed to get conversation participants');
  }

  async getUserConversations(): Promise<ConversationInfo[]> {
    const response = await this.api.get<ApiResponse<{ conversations: ConversationInfo[] }>>(
      '/api/conversation-keys/conversations/list'
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.conversations;
    }
    
    throw new Error(response.data.message || 'Failed to get conversations');
  }

  async setupConversation(
    conversationId: string,
    participantUserIds: number[],
    conversationKeys: Record<number, { keyId: string; encryptedAesKey: string; iv: string }>
  ): Promise<void> {
    const response = await this.api.post<ApiResponse>('/api/conversation-keys/setup', {
      conversationId,
      participantUserIds,
      conversationKeys
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to setup conversation');
    }
  }

  async checkConversationAccess(conversationId: string): Promise<boolean> {
    const response = await this.api.get<ApiResponse<{ hasAccess: boolean }>>(
      `/api/conversation-keys/${conversationId}/access`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.hasAccess;
    }
    
    return false;
  }

  // ===== MESSAGE ENDPOINTS - Step 4 Updated =====

  async sendMessage(messageData: {
    conversationId: number;
    content: string;
    messageType?: 'text';
  }): Promise<import('@shared/types').Message> {
    const response = await this.api.post<ApiResponse<{ message: import('@shared/types').Message }>>(
      '/api/messages',
      {
        conversationId: messageData.conversationId,
        content: messageData.content,
        messageType: messageData.messageType || 'text'
      }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.message;
    }
    
    throw new Error(response.data.message || 'Failed to send message');
  }

  async getMessage(messageId: number): Promise<Message> {
    const response = await this.api.get<ApiResponse<{ message: Message }>>(
      `/api/messages/${messageId}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.message;
    }
    
    throw new Error(response.data.message || 'Failed to get message');
  }

  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    // For now, we'll use a direct endpoint for messages by conversation
    // This might need to be added to the backend if not already there
    const response = await this.api.get<ApiResponse<{ messages: Message[] }>>(
      `/api/messages/conversation/${conversationId}?limit=${limit}&offset=${offset}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.messages;
    }
    
    // Fallback: get conversation participants and filter messages
    throw new Error(response.data.message || 'Failed to get conversation messages');
  }

  async deleteMessage(messageId: number): Promise<void> {
    const response = await this.api.delete<ApiResponse>(
      `/api/messages/${messageId}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete message');
    }
  }

  async searchMessages(query: string, limit: number = 20): Promise<Message[]> {
    const response = await this.api.get<ApiResponse<{ messages: Message[] }>>(
      `/api/messages/search/${encodeURIComponent(query)}?limit=${limit}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.messages;
    }
    
    throw new Error(response.data.message || 'Search failed');
  }

  async getUnreadMessageCount(): Promise<number> {
    const response = await this.api.get<ApiResponse<{ unreadCount: number }>>(
      '/api/messages/unread/count'
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.unreadCount;
    }
    
    throw new Error(response.data.message || 'Failed to get unread count');
  }

  // ===== TEST ENDPOINTS - Step 4 =====

  async testHealthCheck(): Promise<any> {
    const response = await this.api.get<ApiResponse>('/api/test/health');
    
    if (response.data.success) {
      return response.data;
    }
    
    throw new Error(response.data.message || 'Health check failed');
  }

  async testConversationSetup(
    conversationId: string,
    testMessage: { encryptedContent: string; iv: string },
    encryptedKeys: Record<number, { keyId: string; encryptedAesKey: string; iv: string }>
  ): Promise<any> {
    const response = await this.api.post<ApiResponse>('/api/test/setup-conversation', {
      conversationId,
      testMessage,
      encryptedKeys
    });
    
    if (response.data.success) {
      return response.data;
    }
    
    throw new Error(response.data.message || 'Test conversation setup failed');
  }

  async getTestStats(): Promise<any> {
    const response = await this.api.get<ApiResponse>('/api/test/stats');
    
    if (response.data.success) {
      return response.data;
    }
    
    throw new Error(response.data.message || 'Failed to get test stats');
  }

  // ===== UTILITY METHODS =====

  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  getToken(): string | null {
    return this.getStoredToken();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.data.success === true;
    } catch (error) {
      return false;
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;

// Also export the class and types
export { ApiService };
export type { User, AuthResponse, Message, ConversationKey, ConversationParticipant, ConversationInfo };
