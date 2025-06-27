import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@shared/types';
import DebugEncryptionService, { type KeyPair } from '@/utils/debugEncryption';
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
          
          // Check if we have a stored keyPair for this user
          const stored = get();
          let keyPair = stored.keyPair;
          
          // Important: For existing users who don't have a keyPair stored locally,
          // we need to generate a new one. In a real app, you'd want key recovery mechanisms.
          if (!keyPair) {
            console.warn('⚠️ No stored keyPair found for user. Generating new encryption keys.');
            console.warn('⚠️ Note: This will prevent decrypting previously sent messages.');
            keyPair = await DebugEncryptionService.generateKeyPair();
            
            // IMPORTANT: Update the server with the new public key
            try {
              console.log('🔄 Updating server with new public key...');
              await apiService.updateUserPublicKey(keyPair.publicKey);
              console.log('✅ Server public key updated successfully');
              
              // Update the user object with new public key
              authResponse.user.publicKey = keyPair.publicKey;
            } catch (error) {
              console.error('❌ Failed to update server public key:', error);
              // Continue anyway - user can still send new messages
            }
          }
          
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
          const keyPair = await DebugEncryptionService.generateKeyPair();

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
          const keyPair = await DebugEncryptionService.generateKeyPair();
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
