import { useEffect, useRef, useCallback } from 'react';
import socketService from '@/services/socket';
import { useChatStore } from '@/store/chatStore';

export const useTyping = (conversationId: number | null) => {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  
  const { typingUsers } = useChatStore();
  
  const startTyping = useCallback(() => {
    if (!conversationId || !socketService.isConnected()) return;
    
    if (!isTypingRef.current) {
      socketService.startTyping(conversationId);
      isTypingRef.current = true;
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [conversationId]);
  
  const stopTyping = useCallback(() => {
    if (!conversationId || !socketService.isConnected()) return;
    
    if (isTypingRef.current) {
      socketService.stopTyping(conversationId);
      isTypingRef.current = false;
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [conversationId]);
  
  // Cleanup on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && conversationId) {
        socketService.stopTyping(conversationId);
      }
    };
  }, [conversationId]);
  
  // Get typing users for current conversation
  const typingUserIds = conversationId ? typingUsers[conversationId] : new Set();
  const isOthersTyping = typingUserIds && typingUserIds.size > 0;
  
  return {
    startTyping,
    stopTyping,
    isOthersTyping,
    typingUserIds: Array.from(typingUserIds || [])
  };
};
