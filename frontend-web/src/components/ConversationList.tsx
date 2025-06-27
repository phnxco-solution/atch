import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useChatStore } from '@/store/chatStore';
import { useAuth } from '@/hooks/useAuth';
import type { Conversation } from '@shared/types';

const ConversationList: React.FC = () => {
  const { user } = useAuth();
  const { 
    conversations, 
    currentConversation, 
    selectConversation,
    decryptMessage 
  } = useChatStore();

  const handleSelectConversation = (conversation: Conversation) => {
    selectConversation(conversation);
  };

  const getLastMessagePreview = (conversation: Conversation): string => {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }

    // Try to decrypt the last message for preview
    try {
      const decrypted = decryptMessage(
        {
          id: 0,
          conversationId: conversation.id,
          senderId: conversation.lastMessage.senderId,
          senderUsername: '',
          encryptedContent: conversation.lastMessage.content,
          iv: '', // We would need to store IV with last message for this to work
          messageType: 'text',
          createdAt: conversation.lastMessage.timestamp
        },
        conversation.otherUser.publicKey
      );
      
      if (decrypted) {
        return decrypted.length > 50 ? `${decrypted.substring(0, 50)}...` : decrypted;
      }
    } catch (error) {
      // If decryption fails, show encrypted indicator
    }
    
    return '🔒 Encrypted message';
  };

  const getMessageSenderName = (conversation: Conversation): string => {
    if (!conversation.lastMessage) return '';
    
    if (conversation.lastMessage.senderId === user?.id) {
      return 'You: ';
    }
    
    return '';
  };

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Search for users to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="divide-y divide-gray-200">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => handleSelectConversation(conversation)}
            className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
              currentConversation?.id === conversation.id 
                ? 'bg-primary-50 border-r-2 border-primary-500' 
                : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {conversation.otherUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Conversation Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {conversation.otherUser.username}
                  </h3>
                  {conversation.lastMessage && (
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), {
                        addSuffix: true
                      })}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center mt-1">
                  <p className="text-sm text-gray-600 truncate">
                    {getMessageSenderName(conversation)}
                    {getLastMessagePreview(conversation)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationList;
