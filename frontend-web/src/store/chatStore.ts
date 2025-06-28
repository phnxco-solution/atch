/**
 * Chat Store - Step 7: Simple Real-Time Chat
 * Basic messaging without encryption to start
 */

import { create } from 'zustand';
import apiService from '@/services/api';
import socketService from '@/services/socket';
import type { User, Conversation, Message } from '@shared/types';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: number | null;
  currentConversation: Conversation | null;
  messages: Record<number, Message[]>; // conversationId -> messages
  typingUsers: Record<number, Set<number>>; // conversationId -> Set of user IDs
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | null;
  
  // Actions
  loadConversations: () => Promise<void>;
  selectConversation: (conversation: Conversation) => Promise<void>;
  restoreSelectedConversation: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  createConversation: (userId: number) => Promise<Conversation>;
  addMessage: (message: Message) => void;
  clearError: () => void;
  reset: () => void;
  decryptMessage: (message: Message, publicKey: string) => string | null;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  currentConversation: null,
  messages: {},
  typingUsers: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  error: null,

  loadConversations: async () => {
    try {
      set({ isLoadingConversations: true, error: null });
      
      console.log('📂 Loading conversations...');
      
      const conversations = await apiService.getConversations();
      
      set({
        conversations,
        isLoadingConversations: false
      });
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations';
      set({
        isLoadingConversations: false,
        error: errorMessage
      });
    }
  },

  restoreSelectedConversation: async () => {
    try {
      const savedConversationId = localStorage.getItem('selectedConversationId');
      if (!savedConversationId) {
        return;
      }

      const conversationId = parseInt(savedConversationId);
      const { conversations } = get();
      
      // Find the conversation in our loaded conversations
      const conversation = conversations.find(conv => conv.id === conversationId);
      if (conversation) {
        await get().selectConversation(conversation);
        console.log(`🔄 Restored conversation: ${conversationId}`);
      } else {
        // Clear invalid saved conversation ID
        localStorage.removeItem('selectedConversationId');
      }
    } catch (error) {
      console.error('❌ Failed to restore conversation:', error);
      localStorage.removeItem('selectedConversationId');
    }
  },

  selectConversation: async (conversation: Conversation) => {
    try {
      set({ 
        currentConversationId: conversation.id, 
        currentConversation: conversation,
        isLoadingMessages: true, 
        error: null 
      });
      
      // Save selected conversation to localStorage
      localStorage.setItem('selectedConversationId', conversation.id.toString());
      
      console.log(`📋 Selecting conversation: ${conversation.id}`);
      
      // Join the conversation room for real-time updates
      socketService.joinConversation(conversation.id.toString());
      
      // Load existing messages
      const { messages } = get();
      if (!messages[conversation.id]) {
        try {
          const conversationMessages = await apiService.getMessages(conversation.id);
          
          set({
            messages: {
              ...get().messages,
              [conversation.id]: conversationMessages
            },
            isLoadingMessages: false
          });
        } catch (error) {
          console.error('Failed to load messages:', error);
          // Set empty messages array if loading fails
          set({
            messages: {
              ...get().messages,
              [conversation.id]: []
            },
            isLoadingMessages: false
          });
        }
      } else {
        set({ isLoadingMessages: false });
      }

      console.log(`✅ Conversation ${conversation.id} selected`);
      
    } catch (error) {
      console.error('❌ Failed to select conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to select conversation';
      set({ 
        error: errorMessage,
        isLoadingMessages: false 
      });
    }
  },

  sendMessage: async (content: string) => {
    try {
      const { currentConversationId, currentConversation } = get();
      
      if (!currentConversationId || !currentConversation) {
        throw new Error('No conversation selected');
      }

      if (!content.trim()) {
        throw new Error('Message cannot be empty');
      }

      set({ isSendingMessage: true, error: null });
      
      console.log(`📤 Sending message to conversation: ${currentConversationId}`);
      
      // Send via socket for real-time delivery (using plain text as encrypted content for now)
      const socketData = {
        recipientId: currentConversation.otherUser.id,
        encryptedContent: content.trim(),
        iv: 'dummy-iv', // Will be replaced with real encryption later
        messageType: 'text' as const
      };
      
      socketService.sendMessage(socketData);
      
      // Note: We let the socket handle everything now. The backend will:
      // 1. Save the message to database
      // 2. Send confirmation back to sender via 'message_sent'
      // 3. Send message to recipient via 'new_message'
      
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

  createConversation: async (userId: number) => {
    try {
      console.log(`💬 Creating conversation with user: ${userId}`);
      
      const conversation = await apiService.createConversation(userId);
      
      // Add to conversations list
      const { conversations } = get();
      set({
        conversations: [conversation, ...conversations]
      });

      console.log(`✅ Conversation created: ${conversation.id}`);
      
      return conversation;
    } catch (error) {
      console.error('❌ Failed to create conversation:', error);
      
      // Provide more specific error message
      let errorMessage = 'Failed to create conversation';
      if (error instanceof Error) {
        if (error.message.includes('Other user not found')) {
          errorMessage = 'User not found';
        } else if (error.message.includes('Cannot create conversation with yourself')) {
          errorMessage = 'Cannot create conversation with yourself';
        } else {
          errorMessage = error.message;
        }
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  addMessage: (message: Message) => {
    const { messages } = get();
    const conversationId = message.conversationId;
    const conversationMessages = messages[conversationId] || [];
    
    // Check if message already exists to avoid duplicates
    const existingMessage = conversationMessages.find(m => m.id === message.id);
    if (existingMessage) {
      console.log('Message already exists, skipping:', message.id);
      return;
    }
    
    // Add message to the end (newest)
    const updatedMessages = [...conversationMessages, message];
    
    set({
      messages: {
        ...messages,
        [conversationId]: updatedMessages
      }
    });

    console.log(`📨 New message added to conversation: ${conversationId}`);
  },

  decryptMessage: (message: Message, publicKey: string): string | null => {
    // For now, return the content as-is since we're not using encryption yet
    // Later this will implement actual decryption
    return message.encryptedContent || 'Encrypted message';
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    // Clear localStorage when resetting
    localStorage.removeItem('selectedConversationId');
    
    set({
      conversations: [],
      currentConversationId: null,
      currentConversation: null,
      messages: {},
      typingUsers: {},
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSendingMessage: false,
      error: null
    });
    
    console.log('🗑️ Chat store reset');
  }
}));
