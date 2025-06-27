import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@shared/types';
import EncryptionService, { type KeyPair } from '@/utils/encryption';
import apiService from '@/services/api';
import socketService from '@/services/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  keyPair: KeyPair | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (userData: {
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  verifyToken: () => Promise<void>;
  clearError: () => void;
  setKeyPair: (keyPair: KeyPair) => void;
  generateNewKeyPair: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      keyPair: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const authResponse = await apiService.login({ username, password });
          
          // Connect to socket with token
          await socketService.connect(authResponse.token);

          set({
            user: authResponse.user,
            token: authResponse.token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true, error: null });

          // Generate key pair for encryption
          const keyPair = await EncryptionService.generateKeyPair();

          const authResponse = await apiService.register({
            ...userData,
            publicKey: keyPair.publicKey
          });

          // Connect to socket with token
          await socketService.connect(authResponse.token);

          set({
            user: authResponse.user,
            token: authResponse.token,
            keyPair,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          set({
            user: null,
            token: null,
            keyPair: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          // Disconnect socket
          socketService.disconnect();
          
          // Clear API token
          await apiService.logout();

          set({
            user: null,
            token: null,
            keyPair: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });

        } catch (error) {
          console.error('Logout error:', error);
          // Force clear state even if logout fails
          set({
            user: null,
            token: null,
            keyPair: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      verifyToken: async () => {
        const { token } = get();
        
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          set({ isLoading: true, error: null });

          const user = await apiService.verifyToken();
          
          // Connect to socket if not already connected
          if (!socketService.isConnected()) {
            await socketService.connect(token);
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

        } catch (error) {
          console.error('Token verification failed:', error);
          set({
            user: null,
            token: null,
            keyPair: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setKeyPair: (keyPair: KeyPair) => {
        set({ keyPair });
      },

      generateNewKeyPair: async () => {
        try {
          const keyPair = await EncryptionService.generateKeyPair();
          set({ keyPair });
        } catch (error) {
          console.error('Failed to generate key pair:', error);
          throw error;
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        keyPair: state.keyPair,
        user: state.user
      })
    }
  )
);
