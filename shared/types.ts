// Shared types for the encrypted chat application

export interface User {
  id: number;
  username: string;
  email: string;
  publicKey: string;
  createdAt?: string;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  encryptedContent: string;
  iv: string;
  messageType: 'text';
  createdAt: string;
}

export interface Conversation {
  id: number;
  otherUser: User;
  lastMessage?: {
    content: string;
    senderId: number;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Socket.IO event types
export interface SocketEvents {
  // Client to Server
  join_conversation: (data: { conversationId: number }) => void;
  leave_conversation: (data: { conversationId: number }) => void;
  send_message: (data: {
    recipientId: number;
    encryptedContent: string;
    iv: string;
    messageType?: 'text';
  }) => void;
  typing_start: (data: { conversationId: number }) => void;
  typing_stop: (data: { conversationId: number }) => void;
  user_status: (data: { status: string }) => void;

  // Server to Client
  conversation_joined: (data: { conversationId: number; message: string }) => void;
  conversation_left: (data: { conversationId: number }) => void;
  new_message: (data: Message) => void;
  message_sent: (data: Message) => void;
  message_error: (data: { message: string }) => void;
  user_typing: (data: {
    conversationId: number;
    userId: number;
    username: string;
    isTyping: boolean;
  }) => void;
  user_status_changed: (data: {
    userId: number;
    username: string;
    status: string;
  }) => void;
  error: (data: { message: string }) => void;
}

// Validation schemas (for frontend validation)
export const ValidationRules = {
  username: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9]+$/
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/
  }
};

// Encryption types
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedMessage {
  encryptedContent: string;
  iv: string;
}

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    PROFILE: '/api/auth/profile',
    SEARCH: '/api/auth/search',
    USERNAME: '/api/auth/username',
    VERIFY_TOKEN: '/api/auth/verify-token'
  },
  CONVERSATIONS: {
    LIST: '/api/conversations',
    CREATE: '/api/conversations',
    DETAILS: '/api/conversations',
    MESSAGES: '/api/conversations',
    READ: '/api/conversations'
  },
  MESSAGES: {
    SEND: '/api/messages',
    GET: '/api/messages',
    DELETE: '/api/messages',
    SEARCH: '/api/messages/search',
    UNREAD: '/api/messages/unread/count'
  }
};

// Constants
export const CONSTANTS = {
  MESSAGE_TYPES: {
    TEXT: 'text'
  },
  USER_STATUS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    AWAY: 'away',
    BUSY: 'busy'
  },
  PAGINATION: {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100
  }
};
