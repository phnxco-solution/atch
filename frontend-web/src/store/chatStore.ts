/**
 * Chat Store - Step 5 Real Implementation
 * Uses conversation-based encryption system
 */

import { create } from 'zustand';
import encryptionManager from '@/services/encryptionManager';
import apiService, { User, Message, ConversationInfo } from '@/services/api';
import socketService from '@/services/socket';

interface ChatState {
  conversations: ConversationInfo[];
  currentConversationId: string | null;
  messages: Record<string, Array<Message & { decryptedContent?: string }>>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | null;
  typingUsers: Record<string, Set<number>>; // conversationId -> Set of user IDs
  
  // Actions
  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  startConversation: (participantUsername: string) => Promise<string>;
  addMessage: (message: Message) => void;
  setTyping: (conversationId: string, userId: number, isTyping: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  error: null,
  typingUsers: {},

  loadConversations: async () => {
    try {
      set({ isLoadingConversations: true, error: null });
      
      console.log('📂 Loading conversations...');
      
      const conversations = await apiService.getUserConversations();
      
      set({
        conversations,
        isLoadingConversations: false
      });

      console.log(`✅ Loaded ${conversations.length} conversations`);
      
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations';
      set({
        isLoadingConversations: false,
        error: errorMessage
      });
    }
  },

  selectConversation: async (conversationId: string) => {
    try {
      set({ currentConversationId: conversationId, error: null });
      
      console.log(`📋 Selecting conversation: ${conversationId}`);
      
      // Join the conversation room for real-time updates
      socketService.joinConversation(conversationId);
      
      // Load messages if not already loaded
      const { messages } = get();
      if (!messages[conversationId]) {
        await get().loadMessages(conversationId);
      }
      
    } catch (error) {
      console.error('❌ Failed to select conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to select conversation';
      set({ error: errorMessage });
    }
  },

  loadMessages: async (conversationId: string) => {
    try {
      set({ isLoadingMessages: true, error: null });
      
      console.log(`📥 Loading messages for conversation: ${conversationId}`);
      
      // Use encryption manager to get and decrypt messages
      const result = await encryptionManager.getConversationMessages(conversationId, 50);
      
      set({
        messages: {
          ...get().messages,
          [conversationId]: result.messages
        },
        isLoadingMessages: false
      });

      console.log(`✅ Loaded ${result.messages.length} messages`);
      
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load messages';
      set({
        isLoadingMessages: false,
        error: errorMessage
      });
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    try {
      set({ isSendingMessage: true, error: null });
      
      console.log(`📤 Sending message to conversation: ${conversationId}`);
      
      // Use encryption manager to send encrypted message
      const message = await encryptionManager.sendMessage(conversationId, content);
      
      // Add to local state with decrypted content
      const messageWithDecrypted = {
        ...message,
        decryptedContent: content
      };
      
      const { messages } = get();
      const conversationMessages = messages[conversationId] || [];
      
      set({
        messages: {
          ...messages,
          [conversationId]: [...conversationMessages, messageWithDecrypted]
        },
        isSendingMessage: false
      });

      // Send via Socket.IO for real-time delivery to other participants
      socketService.sendMessage({
        conversationId,
        encryptedContent: message.encryptedContent,
        iv: message.iv,
        messageType: 'text'
      });

      console.log('✅ Message sent successfully');
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      set({
        isSendingMessage: false,
        error: errorMessage
      });
      throw error;
    }
  },

  startConversation: async (participantUsername: string) => {
    try {
      console.log(`💬 Starting conversation with: ${participantUsername}`);
      
      // Use encryption manager to start conversation
      const conversationId = await encryptionManager.startConversation(participantUsername);
      
      // Reload conversations to get the new one
      await get().loadConversations();
      
      // Select the new conversation
      await get().selectConversation(conversationId);

      console.log(`✅ Conversation started: ${conversationId}`);
      
      return conversationId;
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      set({ error: errorMessage });
      throw error;
    }
  },

  addMessage: (message: Message) => {
    const { messages, currentConversationId } = get();
    const conversationId = message.conversationId;
    const conversationMessages = messages[conversationId] || [];
    
    // Check if message already exists to avoid duplicates
    const existingMessage = conversationMessages.find(m => m.id === message.id);
    if (existingMessage) {
      return;
    }
    
    // Try to decrypt the message if it's for current conversation
    let messageWithDecrypted = message;
    if (conversationId === currentConversationId) {
      try {
        // Get conversation data from encryption manager
        const cachedConversations = encryptionManager.getCachedConversations();
        const conversationData = cachedConversations.find(c => c.conversationId === conversationId);
        
        if (conversationData) {
          const { EncryptionService } = require('../utils/encryption');
          const decryptedContent = EncryptionService.decryptMessage(
            {
              encryptedContent: message.encryptedContent,
              iv: message.iv
            },
            conversationData.conversationKey
          );
          
          messageWithDecrypted = {
            ...message,
            decryptedContent
          };
        }
      } catch (error) {
        console.error('Failed to decrypt incoming message:', error);
        messageWithDecrypted = {
          ...message,
          decryptedContent: '[Failed to decrypt]'
        };
      }
    }
    
    // Add message to the end (newest)
    const updatedMessages = [...conversationMessages, messageWithDecrypted];
    
    set({
      messages: {
        ...messages,
        [conversationId]: updatedMessages
      }
    });

    console.log(`📨 New message added to conversation: ${conversationId}`);
  },

  setTyping: (conversationId: string, userId: number, isTyping: boolean) => {
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

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      conversations: [],
      currentConversationId: null,
      messages: {},
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSendingMessage: false,
      error: null,
      typingUsers: {}
    });
    
    console.log('🗑️ Chat store reset');
  }
}));

// Setup socket event listeners
socketService.onNewMessage((message: Message) => {
  console.log('🔔 New message received via socket:', message.id);
  useChatStore.getState().addMessage(message);
});

socketService.onMessageSent((message: Message) => {
  console.log('✅ Message sent confirmation via socket:', message.id);
  useChatStore.getState().addMessage(message);
});

socketService.onMessageError((error: { message: string }) => {
  console.error('❌ Message error via socket:', error.message);
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
