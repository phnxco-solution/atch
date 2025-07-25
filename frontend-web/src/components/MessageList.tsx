import React, { useRef, useEffect } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import type { Message, Conversation } from '@shared/types';
import { useAuth } from '@/hooks/useAuth';
import { useTyping } from '@/hooks/useTyping';
import { useChatStore } from '@/store/chatStore';

interface MessageListProps {
  messages: Message[];
  conversation: Conversation;
}

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start">
    <div className="max-w-xs lg:max-w-md">
      <div className="message-bubble received">
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-xs text-gray-500 ml-2">typing...</span>
        </div>
      </div>
    </div>
  </div>
);

const MessageList: React.FC<MessageListProps> = ({ messages, conversation }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { isOthersTyping } = useTyping(conversation.id);
  const { decryptMessage } = useChatStore();

  useEffect(() => {
    // Scroll to bottom when messages change or when typing status changes
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isOthersTyping]);

  const getDecryptedContent = (message: Message): string => {
    return decryptMessage(message) || '[Failed to decrypt]';
  };

  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage?: Message): boolean => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt);
    const previousDate = new Date(previousMessage.createdAt);
    
    return !isToday(currentDate) || 
           currentDate.toDateString() !== previousDate.toDateString();
  };

  const formatDateSeparator = (timestamp: string): string => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM dd, yyyy');
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Start the conversation
          </h3>
          <p className="text-gray-500 max-w-sm">
            Send a message to {conversation.otherUser.username} to begin your encrypted conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"
    >
      {messages.map((message, index) => {
        const isOwnMessage = message.senderId === user?.id;
        const previousMessage = index > 0 ? messages[index - 1] : undefined;
        const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

        return (
          <div key={message.id}>
            {/* Date Separator */}
            {showDateSeparator && (
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-100 rounded-full px-3 py-1">
                  <span className="text-xs text-gray-600 font-medium">
                    {formatDateSeparator(message.createdAt)}
                  </span>
                </div>
              </div>
            )}

            {/* Message */}
            <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                {/* Message Bubble */}
                <div 
                  className={`message-bubble animate-message-in ${
                    isOwnMessage ? 'sent' : 'received'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {getDecryptedContent(message)}
                  </p>
                </div>

                {/* Message Time */}
                <div className={`mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                  <span className="text-xs text-gray-500">
                    {formatMessageTime(message.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isOthersTyping && <TypingIndicator />}
    </div>
  );
};

export default MessageList;
