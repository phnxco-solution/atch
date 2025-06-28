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

  restoreSelectedConversation: async () => {
    try {
      const savedConversationId = localStorage.getItem('selectedConversationId');
      if (!savedConversationId) {
        return;
      }

      const conversationId = parseInt(savedConversationId);
      const { conversations } = get();
      
      const conversation = conversations.find(conv => conv.id === conversationId);
      if (conversation) {
        await get().selectConversation(conversation);
      } else {
        localStorage.removeItem('selectedConversationId');
      }
    } catch (error) {
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
      
      localStorage.setItem('selectedConversationId', conversation.id.toString());
      
      socketService.joinConversation(conversation.id.toString());
      
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
      
    } catch (error) {
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
      
      const socketData = {
        recipientId: currentConversation.otherUser.id,
        encryptedContent: content.trim(),
        iv: 'dummy-iv',
        messageType: 'text' as const
      };
      
      socketService.sendMessage(socketData);
      
    } catch (error) {
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
      const conversation = await apiService.createConversation(userId);
      
      const { conversations } = get();
      set({
        conversations: [conversation, ...conversations]
      });
      
      return conversation;
    } catch (error) {
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
    
    const existingMessage = conversationMessages.find(m => m.id === message.id);
    if (existingMessage) {
      return;
    }
    
    const updatedMessages = [...conversationMessages, message];
    
    set({
      messages: {
        ...messages,
        [conversationId]: updatedMessages
      }
    });
  },

  decryptMessage: (message: Message, publicKey: string): string | null => {
    return message.encryptedContent || 'Encrypted message';
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
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
  }
}));
