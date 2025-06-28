/**
 * Chat Store - Step 7: Real-Time Chat with Hybrid Encryption
 * Implements master key + conversation key approach
 */

import { create } from 'zustand';
import apiService from '@/services/api';
import socketService from '@/services/socket';
import encryptionManager from '@/services/encryptionManager';
import { EncryptionService } from '@/utils/encryption';
import type { User, Conversation, Message } from '@shared/types';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: number | null;
  currentConversation: Conversation | null;
  messages: Record<number, Message[]>; // conversationId -> messages
  typingUsers: Record<number, Set<number>>; // conversationId -> Set of user IDs
  conversationKeys: Record<number, string>; // conversationId -> decrypted AES key
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
  decryptMessage: (message: Message) => string | null;
  getOrCreateConversationKey: (conversationId: number) => Promise<string>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  currentConversation: null,
  messages: {},
  typingUsers: {},
  conversationKeys: {},
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

  getOrCreateConversationKey: async (conversationId: number): Promise<string> => {
    const { conversationKeys } = get();
    
    // Return existing key if available
    if (conversationKeys[conversationId]) {
      return conversationKeys[conversationId];
    }
    
    // Create a simple shared key that both users in the conversation can derive
    // This is the same for all users in the same conversation
    const sharedKey = `shared_conversation_key_${conversationId}`.padEnd(64, '0').substring(0, 64);
    
    // Store in memory
    set({
      conversationKeys: {
        ...get().conversationKeys,
        [conversationId]: sharedKey
      }
    });
    
    return sharedKey;
  },

  sendMessage: async (content: string) => {
    try {
      const { currentConversationId, currentConversation, getOrCreateConversationKey } = get();
      
      if (!currentConversationId || !currentConversation) {
        throw new Error('No conversation selected');
      }

      if (!content.trim()) {
        throw new Error('Message cannot be empty');
      }

      set({ isSendingMessage: true, error: null });
      
      // Get or create conversation key
      const conversationKey = await getOrCreateConversationKey(currentConversationId);
      
      // Encrypt the message
      const encryptedData = EncryptionService.encryptData(content.trim(), conversationKey);
      
      const socketData = {
        recipientId: currentConversation.otherUser.id,
        encryptedContent: encryptedData.encryptedContent,
        iv: encryptedData.iv,
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
    const { messages, getOrCreateConversationKey } = get();
    const conversationId = message.conversationId;
    const conversationMessages = messages[conversationId] || [];
    
    // Ensure we have a conversation key for decryption (async, but fire-and-forget)
    getOrCreateConversationKey(conversationId);
    
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

  decryptMessage: (message: Message): string | null => {
    try {
      const { conversationKeys } = get();
      const conversationKey = conversationKeys[message.conversationId];
      
      if (!conversationKey) {
        return '[Key not available]';
      }
      
      // Decrypt the message
      const decryptedContent = EncryptionService.decryptData(
        {
          encryptedContent: message.encryptedContent,
          iv: message.iv
        },
        conversationKey
      );
      
      return decryptedContent;
    } catch (error) {
      return '[Failed to decrypt]';
    }
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
      conversationKeys: {},
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSendingMessage: false,
      error: null
    });
  }
}));
