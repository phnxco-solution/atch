import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import type { Conversation } from '@shared/types';
import { useChatStore } from '@/store/chatStore';
import { useTyping } from '@/hooks/useTyping';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

interface MessageInputProps {
  conversation: Conversation;
  onMessageSent?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  conversation, 
  onMessageSent 
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isSendingMessage } = useChatStore();
  const { startTyping, stopTyping } = useTyping(conversation.id);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSendingMessage) {
      return;
    }

    const messageToSend = message.trim();
    setMessage('');
    stopTyping();

    try {
      await sendMessage(messageToSend);
      onMessageSent?.();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      // Restore the message if sending failed
      setMessage(messageToSend);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Handle typing indicators
    if (value.trim().length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleBlur = () => {
    stopTyping();
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* Message Input */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onBlur={handleBlur}
            placeholder={`Message ${conversation.otherUser.username}...`}
            className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 max-h-32"
            rows={1}
            disabled={isSendingMessage}
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!message.trim() || isSendingMessage}
          className={`p-3 rounded-lg transition-all duration-200 ${
            message.trim() && !isSendingMessage
              ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          title="Send message (Enter)"
        >
          {isSendingMessage ? (
            <LoadingSpinner size="sm" />
          ) : (
            <PaperAirplaneIcon className="w-5 h-5" />
          )}
        </button>
      </form>

      {/* Encryption Notice */}
      <div className="mt-2 flex items-center justify-center">
        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
          💬 Plain text messaging (encryption disabled for testing)
        </span>
      </div>
    </div>
  );
};

export default MessageInput;
