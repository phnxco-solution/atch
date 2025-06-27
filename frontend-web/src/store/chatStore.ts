import { create } from 'zustand';
import type { Conversation, Message, User } from '@shared/types';
import apiService from '@/services/api';
import socketService from '@/services/socket';
import EncryptionService from '@/utils/encryption';
import { useAuthStore } from './authStore';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Record<number, Message[]>; // conversationId -> Message[]
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | null;
  typingUsers: Record<number, Set<number>>; // conversationId -> Set of user IDs
  
  // Actions
  loadConversations: () => Promise<void>;
  selectConversation: (conversation: Conversation) => Promise<void>;
  loadMessages: (conversationId: number, offset?: number) => Promise<void>;
  sendMessage: (recipientId: number, content: string) => Promise<void>;
  createConversation: (participantId: number) => Promise<Conversation>;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (messageId: number, conversationId: number) => Promise<void>;
  setTyping: (conversationId: number, userId: number, isTyping: boolean) => void;
  clearError: () => void;
  reset: () => void;
  
  // Decryption helpers
  decryptMessage: (message: Message, senderPublicKey: string) => string | null;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  error: null,
  typingUsers: {},

  loadConversations: async () => {
    try {
      set({ isLoadingConversations: true, error: null });
      
      const conversations = await apiService.getConversations();
      
      set({
        conversations,
        isLoadingConversations: false
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations';
      set({
        isLoadingConversations: false,
        error: errorMessage
      });
    }
  },

  selectConversation: async (conversation: Conversation) => {
    try {
      set({ currentConversation: conversation, error: null });
      
      // Join the conversation room
      socketService.joinConversation(conversation.id);
      
      // Load messages if not already loaded
      const { messages } = get();
      if (!messages[conversation.id]) {
        await get().loadMessages(conversation.id);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to select conversation';
      set({ error: errorMessage });
    }
  },

  loadMessages: async (conversationId: number, offset = 0) => {
    try {
      set({ isLoadingMessages: true, error: null });
      
      const { messages: newMessages } = await apiService.getConversationMessages(
        conversationId,
        50,
        offset
      );
      
      const { messages } = get();
      const existingMessages = messages[conversationId] || [];
      
      // Merge messages (prepend for pagination)
      const allMessages = offset === 0 
        ? newMessages 
        : [...newMessages, ...existingMessages];
      
      set({
        messages: {
          ...messages,
          [conversationId]: allMessages
        },
        isLoadingMessages: false
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load messages';
      set({
        isLoadingMessages: false,
        error: errorMessage
      });
    }
  },

  sendMessage: async (recipientId: number, content: string) => {
    try {
      set({ isSendingMessage: true, error: null });
      
      const authStore = useAuthStore.getState();
      const { keyPair, user } = authStore;
      
      if (!keyPair || !user) {
        throw new Error('User not authenticated or missing encryption keys');
      }
      
      // Find recipient's public key
      const { currentConversation } = get();
      if (!currentConversation) {
        throw new Error('No conversation selected');
      }
      
      const recipientPublicKey = currentConversation.otherUser.publicKey;
      
      // Encrypt the message
      const encryptedMessage = EncryptionService.encryptMessage(
        content,
        keyPair.privateKey,
        recipientPublicKey
      );
      
      // Send via Socket.IO for real-time delivery
      socketService.sendMessage({
        recipientId,
        encryptedContent: encryptedMessage.encryptedContent,
        iv: encryptedMessage.iv,
        messageType: 'text'
      });
      
      set({ isSendingMessage: false });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      set({
        isSendingMessage: false,
        error: errorMessage
      });
      throw error;
    }
  },

  createConversation: async (participantId: number) => {
    try {
      const conversation = await apiService.createConversation(participantId);
      
      const { conversations } = get();
      const existingIndex = conversations.findIndex(c => c.id === conversation.id);
      
      if (existingIndex >= 0) {
        // Update existing conversation
        const updatedConversations = [...conversations];
        updatedConversations[existingIndex] = conversation;
        set({ conversations: updatedConversations });
      } else {
        // Add new conversation
        set({ conversations: [conversation, ...conversations] });
      }
      
      return conversation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
      set({ error: errorMessage });
      throw error;
    }
  },

  addMessage: (message: Message) => {
    const { messages, conversations } = get();
    const conversationMessages = messages[message.conversationId] || [];
    
    // Check if message already exists to avoid duplicates
    const existingMessage = conversationMessages.find(m => m.id === message.id);
    if (existingMessage) {
      return;
    }
    
    // Add message to the end (newest)
    const updatedMessages = [...conversationMessages, message];
    
    set({
      messages: {
        ...messages,
        [message.conversationId]: updatedMessages
      }
    });
    
    // Update conversation's last message
    const updatedConversations = conversations.map(conv => {
      if (conv.id === message.conversationId) {
        return {
          ...conv,
          lastMessage: {
            content: message.encryptedContent,
            senderId: message.senderId,
            timestamp: message.createdAt
          },
          updatedAt: message.createdAt
        };
      }
      return conv;
    });
    
    set({ conversations: updatedConversations });
  },

  updateMessage: (message: Message) => {
    const { messages } = get();
    const conversationMessages = messages[message.conversationId] || [];
    
    const updatedMessages = conversationMessages.map(m => 
      m.id === message.id ? message : m
    );
    
    set({
      messages: {
        ...messages,
        [message.conversationId]: updatedMessages
      }
    });
  },

  deleteMessage: async (messageId: number, conversationId: number) => {
    try {
      await apiService.deleteMessage(messageId);
      
      const { messages } = get();
      const conversationMessages = messages[conversationId] || [];
      const updatedMessages = conversationMessages.filter(m => m.id !== messageId);
      
      set({
        messages: {
          ...messages,
          [conversationId]: updatedMessages
        }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete message';
      set({ error: errorMessage });
      throw error;
    }
  },

  setTyping: (conversationId: number, userId: number, isTyping: boolean) => {
    const { typingUsers } = get();
    const conversationTyping = typingUsers[conversationId] || new Set();
    
    if (isTyping) {
      conversationTyping.add(userId);
    } else {
      conversationTyping.delete(userId);
    }
    
    set({
      typingUsers: {
        ...typingUsers,
        [conversationId]: conversationTyping
      }
    });
  },

  decryptMessage: (message: Message, senderPublicKey: string): string | null => {
    try {
      const authStore = useAuthStore.getState();
      const { keyPair } = authStore;
      
      if (!keyPair) {
        console.error('No encryption keys available');
        return null;
      }
      
      const decryptedContent = EncryptionService.decryptMessage(
        {
          encryptedContent: message.encryptedContent,
          iv: message.iv
        },
        keyPair.privateKey,
        senderPublicKey
      );
      
      return decryptedContent;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      return null;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: {},
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSendingMessage: false,
      error: null,
      typingUsers: {}
    });
  }
}));

// Setup socket event listeners
socketService.onNewMessage((message: Message) => {
  useChatStore.getState().addMessage(message);
});

socketService.onMessageSent((message: Message) => {
  useChatStore.getState().addMessage(message);
});

socketService.onMessageError((error: { message: string }) => {
  useChatStore.setState({ 
    error: error.message,
    isSendingMessage: false 
  });
});

socketService.onUserTyping((data) => {
  useChatStore.getState().setTyping(
    data.conversationId,
    data.userId,
    data.isTyping
  );
});
