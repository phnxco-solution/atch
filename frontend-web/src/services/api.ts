import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { User, Message, Conversation, AuthResponse, ApiResponse } from '@shared/types';

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

  // Auth endpoints
  async register(userData: {
    username: string;
    email: string;
    password: string;
    publicKey: string;
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

  // Conversation endpoints
  async getConversations(): Promise<Conversation[]> {
    const response = await this.api.get<ApiResponse<{ conversations: Conversation[] }>>(
      '/api/conversations'
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.conversations;
    }
    
    throw new Error(response.data.message || 'Failed to get conversations');
  }

  async createConversation(participantId: number): Promise<Conversation> {
    const response = await this.api.post<ApiResponse<{ conversation: Conversation }>>(
      '/api/conversations',
      { participantId }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.conversation;
    }
    
    throw new Error(response.data.message || 'Failed to create conversation');
  }

  async getConversationDetails(conversationId: number): Promise<Conversation> {
    const response = await this.api.get<ApiResponse<{ conversation: Conversation }>>(
      `/api/conversations/${conversationId}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.conversation;
    }
    
    throw new Error(response.data.message || 'Failed to get conversation');
  }

  async getConversationMessages(
    conversationId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const response = await this.api.get<ApiResponse<{
      messages: Message[];
      pagination: { limit: number; offset: number; hasMore: boolean };
    }>>(
      `/api/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`
    );
    
    if (response.data.success && response.data.data) {
      return {
        messages: response.data.data.messages,
        hasMore: response.data.data.pagination.hasMore
      };
    }
    
    throw new Error(response.data.message || 'Failed to get messages');
  }

  async markConversationAsRead(conversationId: number): Promise<void> {
    const response = await this.api.post<ApiResponse>(
      `/api/conversations/${conversationId}/read`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to mark as read');
    }
  }

  // Message endpoints
  async sendMessage(messageData: {
    recipientId: number;
    encryptedContent: string;
    iv: string;
    messageType?: 'text';
  }): Promise<Message> {
    const response = await this.api.post<ApiResponse<{ message: Message }>>(
      '/api/messages',
      messageData
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

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  getToken(): string | null {
    return this.getStoredToken();
  }

  // Health check
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

// Also export the class for testing or multiple instances
export { ApiService };
