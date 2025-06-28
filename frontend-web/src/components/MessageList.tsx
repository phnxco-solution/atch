import React, { useRef, useEffect } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import type { Message, Conversation } from '@shared/types';
import { useChatStore } from '@/store/chatStore';
import { useAuth } from '@/hooks/useAuth';

interface MessageListProps {
  messages: Message[];
  conversation: Conversation;
}

const MessageList: React.FC<MessageListProps> = ({ messages, conversation }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, keyPair } = useAuth();
  const { decryptMessage } = useChatStore();

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const getDecryptedContent = (message: Message): string => {
    try {
      if (!keyPair) {
        console.error('❌ No keyPair available');
        return 'No encryption keys available';
      }

      if (!user) {
        console.error('❌ No user available');
        return 'No user available';
      }

      const isOwnMessage = message.senderId === user.id;

      console.group(`🔍 Decrypting message ID: ${message.id}`);
      console.log('👤 User info:', {
        currentUserId: user.id,
        currentUsername: user.username,
        senderId: message.senderId,
        senderUsername: message.senderUsername,
        isOwnMessage
      });

      // In a two-person conversation, always use the other person's public key
      const otherUserPublicKey = conversation.otherUser.publicKey;

      console.log('🔑 Key details:', {
        myPrivateKey: keyPair.privateKey ? `${keyPair.privateKey.substring(0, 8)}...` : 'undefined',
        myPublicKey: user.publicKey ? `${user.publicKey.substring(0, 8)}...` : 'undefined',
        otherUserPublicKey: otherUserPublicKey ? `${otherUserPublicKey.substring(0, 8)}...` : 'undefined',
        otherUsername: conversation.otherUser.username,
        strategy: 'receiver-uses-other-user-public-key'
      });

      console.log('📦 Message details:', {
        hasEncryptedContent: !!message.encryptedContent,
        hasIV: !!message.iv,
        encryptedContentLength: message.encryptedContent?.length || 0,
        ivLength: message.iv?.length || 0
      });

      if (!otherUserPublicKey) {
        console.error('❌ Other user public key is undefined');
        console.groupEnd();
        return '🔒 Missing other user key';
      }

      if (!keyPair.privateKey) {
        console.error('❌ Private key is undefined');
        console.groupEnd();
        return '🔒 Missing private key';
      }

      console.log('🔓 Attempting decryption...');
      const decrypted = decryptMessage(message, otherUserPublicKey);
      
      if (decrypted) {
        console.log('✅ Decryption successful!');
        console.groupEnd();
        return decrypted;
      } else {
        console.error('❌ Decryption returned null/empty');
        console.groupEnd();
        return '🔒 Failed to decrypt';
      }
    } catch (error) {
      console.error('❌ Failed to decrypt message:', error);
      console.groupEnd();
      return '🔒 Decryption failed';
    }
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
    </div>
  );
};

export default MessageList;
