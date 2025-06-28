import React, { useEffect, useRef } from 'react';
import type { Conversation } from '@shared/types';
import { useChatStore } from '@/store/chatStore';
import { useTyping } from '@/hooks/useTyping';
import ChatHeader from '@/components/ChatHeader';
import MessageList from '@/components/MessageList';
import MessageInput from '@/components/MessageInput';
import LoadingSpinner from '@/components/LoadingSpinner';

interface ChatWindowProps {
  conversation: Conversation;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    isLoadingMessages,
    error 
  } = useChatStore();

  const { isOthersTyping } = useTyping(conversation.id);
  const conversationMessages = messages[conversation.id] || [];

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    scrollToBottom();
  }, [conversationMessages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <ChatHeader conversation={conversation} />

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <>
            <MessageList 
              messages={conversationMessages}
              conversation={conversation}
            />
            
            {/* Typing Indicator */}
            {isOthersTyping && (
              <div className="px-4 py-2">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                  <span>{conversation.otherUser.username} is typing...</span>
                </div>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput 
        conversation={conversation}
        onMessageSent={scrollToBottom}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
