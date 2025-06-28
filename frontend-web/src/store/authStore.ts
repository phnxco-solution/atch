/**
 * Auth Store - Step 6 Simplified: Simple Session Management
 * No password prompts - seamless session restoration
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import encryptionManager from '@/services/encryptionManager';
import apiService, { User } from '@/services/api';
import socketService from '@/services/socket';

interface AuthState {
  user: User | null;
  token: string | null;
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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          console.log('🔐 Starting encrypted login...');

          // Use encryption manager for login
          const user = await encryptionManager.loginUser({ username, password });
          const token = apiService.getToken();

          if (!token) {
            throw new Error('No authentication token received');
          }
          
          // Connect to socket with token
          await socketService.connect(token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          console.log('✅ Encrypted login successful');

        } catch (error) {
          console.error('❌ Login failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          
          // Clear encryption session on failure
          encryptionManager.logout();
          
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

          console.log('🔐 Starting encrypted registration...');

          // Use encryption manager for registration
          const user = await encryptionManager.registerUser(userData);
          const token = apiService.getToken();

          if (!token) {
            throw new Error('No authentication token received');
          }

          // Connect to socket with token
          await socketService.connect(token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          console.log('✅ Encrypted registration successful');

        } catch (error) {
          console.error('❌ Registration failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          
          // Clear encryption session on failure
          encryptionManager.logout();
          
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

      logout: async () => {
        try {
          console.log('🚪 Starting logout...');

          // Disconnect socket
          socketService.disconnect();
          
          // Clear encryption session
          encryptionManager.logout();
          
          // Clear API token
          await apiService.logout();

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });

          console.log('✅ Logout completed');

        } catch (error) {
          console.error('❌ Logout error:', error);
          
          // Force clear state even if logout fails
          encryptionManager.logout();
          set({
            user: null,
            token: null,
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
          
          // Check if we have active encryption session
          const hasActiveSession = encryptionManager.hasActiveSession();

          if (hasActiveSession) {
            // Update session with user data
            encryptionManager.updateSessionUser(user);
          } else {
            // No encryption session - user needs to login again
            throw new Error('No encryption session - please login again');
          }
          
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
          // Clear everything on verification failure
          encryptionManager.logout();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user
      })
    }
  )
);
