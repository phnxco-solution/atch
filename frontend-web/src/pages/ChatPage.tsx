/**
 * Chat Page - Step 7: Simple Real-Time Messaging
 * Updated for simplified chat system
 */

import React, { useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAuth } from '@/hooks/useAuth';
import ConversationList from '@/components/ConversationList';
import ChatWindow from '@/components/ChatWindow';
import UserHeader from '@/components/UserHeader';
import LoadingSpinner from '@/components/LoadingSpinner';

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    currentConversation,
    conversations,
    isLoadingConversations, 
    loadConversations,
    error 
  } = useChatStore();

  useEffect(() => {
    // Load conversations on mount
    loadConversations();
  }, [loadConversations]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Get current conversation details - it's already available from the store

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <UserHeader user={user} />
        <div className="flex-1 overflow-hidden">
          {isLoadingConversations ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <ConversationList />
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <ChatWindow conversation={currentConversation} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to EncryptedChat
              </h3>
              <p className="text-gray-500 max-w-sm">
                Select a conversation to start messaging, or search for users to begin a new chat.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg shadow-lg max-w-sm z-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
