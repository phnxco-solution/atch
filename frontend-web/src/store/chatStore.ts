/**
 * Chat Store - Step 7: Simple Real-Time Chat
 * Basic messaging without encryption to start
 */

import { create } from 'zustand';
import apiService, { User } from '@/services/api';
import socketService from '@/services/socket';

// Simplified types for now
interface SimpleMessage {
  id: number;
  conversationId: string;
  senderId: number;
  senderUsername: string;
  content: string; // Plain text for now
  messageType: 'text';
  createdAt: string;
}

interface SimpleConversation {
  id: string;
  participantUsername: string;
  participantId: number;
  lastMessage?: string;
  lastMessageAt?: string;
  messageCount: number;
}

interface ChatState {
  conversations: SimpleConversation[];
  currentConversationId: string | null;
  messages: Record<string, SimpleMessage[]>; // conversationId -> messages
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | null;
  
  // Actions
  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  startConversation: (participantUsername: string) => Promise<string>;
  addMessage: (message: SimpleMessage) => void;
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

  loadConversations: async () => {
    try {
      set({ isLoadingConversations: true, error: null });
      
      console.log('📂 Loading conversations...');
      
      // For now, let's use a mock conversation list
      // Later we'll integrate with the API
      const conversations: SimpleConversation[] = [
        {
          id: 'conv_demo_1',
          participantUsername: 'alice',
          participantId: 2,
          lastMessage: 'Hey there!',
          lastMessageAt: new Date().toISOString(),
          messageCount: 3
        },
        {
          id: 'conv_demo_2',
          participantUsername: 'bob',
          participantId: 3,
          lastMessage: 'How are you?',
          lastMessageAt: new Date(Date.now() - 60000).toISOString(),
          messageCount: 1
        }
      ];
      
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
      set({ currentConversationId: conversationId, isLoadingMessages: true, error: null });
      
      console.log(`📋 Selecting conversation: ${conversationId}`);
      
      // Join the conversation room for real-time updates
      socketService.joinConversation(conversationId);
      
      // Load existing messages (mock for now)
      const { messages } = get();
      if (!messages[conversationId]) {
        // Mock some messages
        const mockMessages: SimpleMessage[] = [
          {
            id: 1,
            conversationId,
            senderId: 2,
            senderUsername: 'alice',
            content: 'Hey there!',
            messageType: 'text',
            createdAt: new Date(Date.now() - 300000).toISOString()
          },
          {
            id: 2,
            conversationId,
            senderId: 1,
            senderUsername: 'you',
            content: 'Hi! How are you?',
            messageType: 'text',
            createdAt: new Date(Date.now() - 120000).toISOString()
          },
          {
            id: 3,
            conversationId,
            senderId: 2,
            senderUsername: 'alice',
            content: 'I\'m doing great, thanks for asking!',
            messageType: 'text',
            createdAt: new Date(Date.now() - 60000).toISOString()
          }
        ];

        set({
          messages: {
            ...get().messages,
            [conversationId]: mockMessages
          },
          isLoadingMessages: false
        });
      } else {
        set({ isLoadingMessages: false });
      }

      console.log(`✅ Conversation ${conversationId} selected`);
      
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
      const { currentConversationId } = get();
      
      if (!currentConversationId) {
        throw new Error('No conversation selected');
      }

      if (!content.trim()) {
        throw new Error('Message cannot be empty');
      }

      set({ isSendingMessage: true, error: null });
      
      console.log(`📤 Sending message to conversation: ${currentConversationId}`);
      
      // Create the message
      const newMessage: SimpleMessage = {
        id: Date.now(), // Temporary ID
        conversationId: currentConversationId,
        senderId: 1, // Current user ID (mock)
        senderUsername: 'you',
        content: content.trim(),
        messageType: 'text',
        createdAt: new Date().toISOString()
      };

      // Add to local state immediately (optimistic update)
      const { messages } = get();
      const conversationMessages = messages[currentConversationId] || [];
      
      set({
        messages: {
          ...messages,
          [currentConversationId]: [...conversationMessages, newMessage]
        },
        isSendingMessage: false
      });

      // Send via Socket.IO for real-time delivery
      socketService.sendMessage({
        conversationId: currentConversationId,
        content: content.trim(),
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
      
      // For now, create a simple conversation ID
      const conversationId = `conv_${participantUsername}_${Date.now()}`;
      
      // Add to conversations list
      const newConversation: SimpleConversation = {
        id: conversationId,
        participantUsername,
        participantId: Date.now(), // Mock participant ID
        messageCount: 0
      };

      const { conversations } = get();
      set({
        conversations: [newConversation, ...conversations]
      });

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

  addMessage: (message: SimpleMessage) => {
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
      error: null
    });
    
    console.log('🗑️ Chat store reset');
  }
}));

// Setup socket event listeners for real-time messaging
socketService.onNewMessage((message: any) => {
  console.log('🔔 New message received via socket:', message);
  
  // Convert to our SimpleMessage format
  const simpleMessage: SimpleMessage = {
    id: message.id || Date.now(),
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderUsername: message.senderUsername || 'Unknown',
    content: message.content || message.encryptedContent, // Use content or fallback
    messageType: 'text',
    createdAt: message.createdAt || new Date().toISOString()
  };
  
  useChatStore.getState().addMessage(simpleMessage);
});

socketService.onMessageSent((message: any) => {
  console.log('✅ Message sent confirmation via socket:', message);
  // Message already added optimistically, could update with real ID here
});

socketService.onMessageError((error: { message: string }) => {
  console.error('❌ Message error via socket:', error.message);
  useChatStore.setState({ 
    error: error.message,
    isSendingMessage: false 
  });
});
