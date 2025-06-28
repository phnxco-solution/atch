/**
 * Encryption Manager - Step 6 Simplified: Simple Session Management
 * Stores session data including master key for seamless experience
 */

import { EncryptionService } from '../utils/encryption';
import apiService, { User, Message, ConversationKey } from './api';

interface UserSession {
  user: User;
  masterKey: string;
  userKeyPair: any;
}

interface ConversationData {
  conversationId: string;
  participants: User[];
  conversationKey: any;
  messages: Message[];
}

interface SessionStorage {
  userId: number;
  masterKey: string;
  masterKeySalt: string;
  userKeyPair: any;
  lastActivity: number;
}

class EncryptionManager {
  private currentSession: UserSession | null = null;
  private conversationCache: Map<string, ConversationData> = new Map();
  private readonly SESSION_STORAGE_KEY = 'encryption_session';
  private readonly SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    // Try to restore session on initialization
    this.tryRestoreSession();
  }

  /**
   * Step 6: Try to restore session from storage
   */
  private tryRestoreSession(): void {
    try {
      const storedSession = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (!storedSession) {
        console.log('🔍 No stored session found');
        return;
      }

      const sessionData: SessionStorage = JSON.parse(storedSession);
      
      // Check if session is expired
      if (Date.now() - sessionData.lastActivity > this.SESSION_TIMEOUT) {
        console.log('🕐 Session expired, clearing...');
        this.clearStoredSession();
        return;
      }

      // Restore session from stored data
      this.currentSession = {
        user: {
          id: sessionData.userId,
          username: '',
          email: '',
          publicKey: sessionData.userKeyPair.publicKey,
          masterKeySalt: sessionData.masterKeySalt
        },
        masterKey: sessionData.masterKey,
        userKeyPair: sessionData.userKeyPair
      };

    } catch (error) {
      console.error('❌ Failed to restore session:', error);
      this.clearStoredSession();
    }
  }

  /**
   * Step 6: Store complete session data
   */
  private storeSessionData(): void {
    if (!this.currentSession) {
      return;
    }

    try {
      const sessionData: SessionStorage = {
        userId: this.currentSession.user.id,
        masterKey: this.currentSession.masterKey,
        masterKeySalt: this.currentSession.user.masterKeySalt!,
        userKeyPair: this.currentSession.userKeyPair,
        lastActivity: Date.now()
      };

      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      console.log('💾 Complete session data stored');
      
    } catch (error) {
      console.error('❌ Failed to store session data:', error);
    }
  }

  /**
   * Step 6: Clear stored session
   */
  private clearStoredSession(): void {
    localStorage.removeItem(this.SESSION_STORAGE_KEY);
    console.log('🗑️ Stored session cleared');
  }

  /**
   * Step 6: Update session activity
   */
  private updateSessionActivity(): void {
    if (!this.currentSession) {
      return;
    }

    try {
      const storedSession = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (storedSession) {
        const sessionData: SessionStorage = JSON.parse(storedSession);
        sessionData.lastActivity = Date.now();
        localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      }
    } catch (error) {
      console.error('❌ Failed to update session activity:', error);
    }
  }

  /**
   * Step 6: Register user with persistent session
   */
  async registerUser(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<User> {
    try {
      console.log('🔐 Starting encrypted user registration...');

      // Step 1: Derive master key from password
      const masterKeyResult = await EncryptionService.deriveMasterKey(userData.password);
      
      // Step 2: Generate user key pair
      const userKeyPair = EncryptionService.generateUserKeyPair();

      // Step 3: Register with backend
      const authResponse = await apiService.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        publicKey: userKeyPair.publicKey,
        masterKeySalt: masterKeyResult.salt
      });

      // Step 4: Store session data
      this.currentSession = {
        user: authResponse.user,
        masterKey: masterKeyResult.masterKey,
        userKeyPair
      };

      // Step 5: Persist complete session data
      this.storeSessionData();

      console.log('✅ User registered with persistent encryption session');
      return authResponse.user;

    } catch (error) {
      console.error('❌ Registration with encryption failed:', error);
      throw error;
    }
  }

  /**
   * Step 6: Login user with session restoration
   */
  async loginUser(credentials: {
    username: string;
    password: string;
  }): Promise<User> {
    try {
      console.log('🔐 Starting encrypted user login...');

      // Step 1: Login with backend
      const authResponse = await apiService.login(credentials);

      // Step 2: Derive master key using stored salt
      const masterKeyResult = await EncryptionService.deriveMasterKey(
        credentials.password,
        authResponse.user.masterKeySalt
      );

      // Step 3: Generate user key pair (for now, we generate new each time)
      const userKeyPair = EncryptionService.generateUserKeyPair();

      // Step 4: Store session data
      this.currentSession = {
        user: authResponse.user,
        masterKey: masterKeyResult.masterKey,
        userKeyPair
      };

      // Step 5: Persist complete session data
      this.storeSessionData();

      console.log('✅ User logged in with persistent encryption session');
      return authResponse.user;

    } catch (error) {
      console.error('❌ Login with encryption failed:', error);
      throw error;
    }
  }

  /**
   * Step 6: Update session with user data (called after token verification)
   */
  updateSessionUser(user: User): void {
    if (this.currentSession) {
      this.currentSession.user = user;
      this.updateSessionActivity();
    }
  }

  /**
   * Step 6: Start conversation with session management
   */
  async startConversation(participantUsername: string): Promise<string> {
    try {
      if (!this.currentSession) {
        throw new Error('No active encryption session');
      }

      // Update activity
      this.updateSessionActivity();

      console.log(`💬 Starting conversation with ${participantUsername}...`);

      // Get participant user data
      const participant = await apiService.getUserByUsername(participantUsername);

      // Generate conversation ID and key
      const conversationId = `conv_${Date.now()}_${EncryptionService.generateSecureRandom(8)}`;
      const participants = [this.currentSession.user.id, participant.id];
      
      const conversationKey = EncryptionService.generateConversationKey(
        conversationId,
        participants.map(id => id.toString())
      );

      // Encrypt conversation key for current user
      const currentUserEncryptedKey = EncryptionService.encryptConversationKey(
        conversationKey,
        this.currentSession.masterKey
      );

      // Store conversation key
      await apiService.storeConversationKey(
        conversationId,
        currentUserEncryptedKey.keyId,
        currentUserEncryptedKey.encryptedKey.encryptedContent,
        currentUserEncryptedKey.encryptedKey.iv
      );

      // Cache conversation data
      this.conversationCache.set(conversationId, {
        conversationId,
        participants: [this.currentSession.user, participant],
        conversationKey,
        messages: []
      });

      console.log(`✅ Conversation ${conversationId} started`);
      return conversationId;

    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      throw error;
    }
  }

  /**
   * Step 6: Send message with session management
   */
  async sendMessage(conversationId: string, messageText: string): Promise<Message> {
    try {
      if (!this.currentSession) {
        throw new Error('No active encryption session');
      }

      // Update activity
      this.updateSessionActivity();

      console.log(`📤 Sending encrypted message to ${conversationId}...`);

      // Get or load conversation key
      let conversationData = this.conversationCache.get(conversationId);
      
      if (!conversationData) {
        conversationData = await this.loadConversation(conversationId);
      }

      // Encrypt message with conversation key
      const encryptedMessage = EncryptionService.encryptMessage(
        messageText,
        conversationData.conversationKey
      );

      // Send to backend
      const message = await apiService.sendMessage({
        conversationId,
        encryptedContent: encryptedMessage.encryptedContent,
        iv: encryptedMessage.iv,
        messageType: 'text'
      });

      // Add to cache
      conversationData.messages.push(message);

      console.log('✅ Encrypted message sent');
      return message;

    } catch (error) {
      console.error('❌ Failed to send encrypted message:', error);
      throw error;
    }
  }

  /**
   * Step 6: Get conversation messages with session management
   */
  async getConversationMessages(conversationId: string, limit: number = 50): Promise<{
    messages: Array<Message & { decryptedContent: string }>;
    conversationData: ConversationData;
  }> {
    try {
      if (!this.currentSession) {
        throw new Error('No active encryption session');
      }

      // Update activity
      this.updateSessionActivity();

      console.log(`📥 Getting encrypted messages from ${conversationId}...`);

      // Load conversation if not cached
      let conversationData = this.conversationCache.get(conversationId);
      
      if (!conversationData) {
        conversationData = await this.loadConversation(conversationId);
      }

      // For now, return empty messages array since we need to implement the backend endpoint
      const messages: Message[] = [];

      // Decrypt messages
      const decryptedMessages = messages.map(message => {
        try {
          const decryptedContent = EncryptionService.decryptMessage(
            {
              encryptedContent: message.encryptedContent,
              iv: message.iv
            },
            conversationData!.conversationKey
          );

          return {
            ...message,
            decryptedContent
          };
        } catch (error) {
          console.error('Failed to decrypt message:', message.id, error);
          return {
            ...message,
            decryptedContent: '[Failed to decrypt]'
          };
        }
      });

      console.log(`✅ Retrieved and decrypted ${decryptedMessages.length} messages`);
      
      return {
        messages: decryptedMessages,
        conversationData
      };

    } catch (error) {
      console.error('❌ Failed to get conversation messages:', error);
      throw error;
    }
  }

  /**
   * Step 6: Load conversation with session management
   */
  private async loadConversation(conversationId: string): Promise<ConversationData> {
    try {
      if (!this.currentSession) {
        throw new Error('No active encryption session');
      }

      console.log(`🔄 Loading conversation ${conversationId}...`);

      // Get encrypted conversation key
      const encryptedConversationKey = await apiService.getConversationKey(conversationId);

      // Decrypt conversation key
      const conversationKey = EncryptionService.decryptConversationKey(
        {
          keyId: encryptedConversationKey.keyId,
          conversationId: conversationId,
          encryptedKey: {
            encryptedContent: encryptedConversationKey.encryptedAesKey,
            iv: encryptedConversationKey.iv
          },
          participants: [],
          createdAt: new Date(encryptedConversationKey.createdAt)
        },
        this.currentSession.masterKey
      );

      // Get conversation participants
      const participants = await apiService.getConversationParticipants(conversationId);

      // Create conversation data
      const conversationData: ConversationData = {
        conversationId,
        participants: participants.map(p => ({
          id: p.userId,
          username: p.username,
          email: '',
          publicKey: p.publicKey
        })),
        conversationKey,
        messages: []
      };

      // Cache the conversation
      this.conversationCache.set(conversationId, conversationData);

      console.log('✅ Conversation loaded and cached');
      return conversationData;

    } catch (error) {
      console.error('❌ Failed to load conversation:', error);
      throw error;
    }
  }

  /**
   * Get current user session
   */
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  /**
   * Get cached conversations
   */
  getCachedConversations(): ConversationData[] {
    return Array.from(this.conversationCache.values());
  }

  /**
   * Step 6: Enhanced logout with session cleanup
   */
  logout(): void {
    this.currentSession = null;
    this.conversationCache.clear();
    this.clearStoredSession();
    console.log('🚪 Encryption session cleared completely');
  }

  /**
   * Check if user has active encryption session
   */
  hasActiveSession(): boolean {
    return this.currentSession !== null;
  }
}

// Create and export singleton instance
const encryptionManager = new EncryptionManager();
export default encryptionManager;

// Also export class and types
export { EncryptionManager };
export type { UserSession, ConversationData };
