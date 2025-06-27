import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

export const useAuth = () => {
  const authStore = useAuthStore();

  useEffect(() => {
    // Auto-verify token on mount if token exists
    if (authStore.token && !authStore.isAuthenticated) {
      authStore.verifyToken();
    }
  }, []);

  const loginWithCredentials = async (username: string, password: string) => {
    try {
      await authStore.login(username, password);
      // Load conversations after successful login
      const chatStore = useChatStore.getState();
      await chatStore.loadConversations();
    } catch (error) {
      throw error;
    }
  };

  const registerWithCredentials = async (userData: {
    username: string;
    email: string;
    password: string;
  }) => {
    try {
      await authStore.register(userData);
      // Load conversations after successful registration
      const chatStore = useChatStore.getState();
      await chatStore.loadConversations();
    } catch (error) {
      throw error;
    }
  };

  const logoutUser = async () => {
    try {
      // Reset chat store
      const chatStore = useChatStore.getState();
      chatStore.reset();
      
      // Logout from auth store
      await authStore.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user: authStore.user,
    token: authStore.token,
    keyPair: authStore.keyPair,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    error: authStore.error,
    login: loginWithCredentials,
    register: registerWithCredentials,
    logout: logoutUser,
    verifyToken: authStore.verifyToken,
    clearError: authStore.clearError,
    generateNewKeyPair: authStore.generateNewKeyPair
  };
};
