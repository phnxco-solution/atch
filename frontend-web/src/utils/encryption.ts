/**
 * Modern Encryption Service
 * Implements hybrid encryption approach for secure messaging
 * Step 1: Foundation with master key derivation and basic AES encryption
 */

import CryptoJS from 'crypto-js';

// Types
export interface MasterKeyDerivation {
  masterKey: string;
  salt: string;
}

export interface EncryptedData {
  encryptedContent: string;
  iv: string;
}

export interface UserKeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string; // Unique identifier for this key pair
}

export interface ConversationKey {
  keyId: string;
  conversationId: string;
  aesKey: string; // The actual AES key for message encryption
  participants: string[]; // Array of user IDs
  createdAt: Date;
}

export interface EncryptedConversationKey {
  keyId: string;
  conversationId: string;
  encryptedKey: EncryptedData; // AES key encrypted with user's master key
  participants: string[];
  createdAt: Date;
}

export interface EncryptionConfig {
  keySize: number;
  ivSize: number;
  iterations: number;
}

// Configuration following current best practices
const CONFIG: EncryptionConfig = {
  keySize: 256, // AES-256
  ivSize: 16,   // 128-bit IV
  iterations: 600000, // OWASP 2023 recommendation for PBKDF2
};

/**
 * Modern Encryption Service Class
 * Focuses on security, testability, and maintainability
 */
export class EncryptionService {
  
  /**
   * Step 1: Master Key Derivation
   * Derives a master key from user password using PBKDF2
   * This key will be used to encrypt/decrypt conversation keys
   */
  static async deriveMasterKey(password: string, salt?: string): Promise<MasterKeyDerivation> {
    try {
      if (!password || password.length < 1) {
        throw new Error('Password cannot be empty');
      }

      const actualSalt = salt || CryptoJS.lib.WordArray.random(32).toString();
      
      const masterKey = CryptoJS.PBKDF2(password, actualSalt, {
        keySize: CONFIG.keySize / 32,
        iterations: CONFIG.iterations,
        hasher: CryptoJS.algo.SHA256
      });

      const result = {
        masterKey: masterKey.toString(),
        salt: actualSalt
      };

      return result;
      
    } catch (error) {
      throw new Error(`Master key derivation failed: ${error.message}`);
    }
  }

  /**
   * Step 1: Basic AES Encryption
   * Encrypts data using AES-256-CBC with proper IV generation
   */
  static encryptData(plaintext: string, key: string): EncryptedData {
    try {
      if (!plaintext) {
        throw new Error('Plaintext cannot be empty');
      }
      if (!key) {
        throw new Error('Encryption key cannot be empty');
      }

      const iv = CryptoJS.lib.WordArray.random(CONFIG.ivSize);
      
      const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const result = {
        encryptedContent: encrypted.toString(),
        iv: iv.toString()
      };

      return result;
      
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Step 1: Basic AES Decryption
   * Decrypts data using AES-256-CBC
   */
  static decryptData(encryptedData: EncryptedData, key: string): string {
    try {
      if (!encryptedData?.encryptedContent || !encryptedData?.iv) {
        throw new Error('Invalid encrypted data');
      }
      if (!key) {
        throw new Error('Decryption key cannot be empty');
      }

      const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
      
      const decrypted = CryptoJS.AES.decrypt(encryptedData.encryptedContent, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!plaintext) {
        throw new Error('Decryption resulted in empty string - invalid key or corrupted data');
      }

      return plaintext;
      
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Generate User Key Pair
   * Creates a public/private key pair for a user
   * Simplified approach - in production consider using Web Crypto API
   */
  static generateUserKeyPair(): UserKeyPair {
    try {
      console.log('🔑 Generating user key pair...');

      // Generate a unique key ID
      const keyId = this.generateSecureRandom(16);
      
      // Generate private key (256-bit random)
      const privateKey = this.generateSecureRandom(32);
      
      // Derive public key from private key (deterministic)
      const publicKey = CryptoJS.SHA256(privateKey + 'public_derivation_salt').toString();

      const keyPair = {
        keyId,
        publicKey,
        privateKey
      };

      console.log('✅ User key pair generated successfully');
      return keyPair;
      
    } catch (error) {
      console.error('❌ Key pair generation failed:', error);
      throw new Error(`Key pair generation failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Generate Conversation Key
   * Creates a new AES key for encrypting messages in a conversation
   */
  static generateConversationKey(conversationId: string, participants: string[]): ConversationKey {
    try {
      // Validate inputs
      if (!conversationId) {
        throw new Error('Conversation ID cannot be empty');
      }
      if (!participants || participants.length < 2) {
        throw new Error('Conversation must have at least 2 participants');
      }

      console.log('🔐 Generating conversation key...');

      const conversationKey: ConversationKey = {
        keyId: this.generateSecureRandom(16),
        conversationId,
        aesKey: this.generateSecureRandom(32), // 256-bit AES key
        participants: [...participants].sort(), // Sort for consistency
        createdAt: new Date()
      };

      console.log('✅ Conversation key generated successfully');
      return conversationKey;
      
    } catch (error) {
      console.error('❌ Conversation key generation failed:', error);
      throw new Error(`Conversation key generation failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Encrypt Conversation Key for Storage
   * Encrypts a conversation key with user's master key for safe storage
   */
  static encryptConversationKey(
    conversationKey: ConversationKey, 
    userMasterKey: string
  ): EncryptedConversationKey {
    try {
      // Validate inputs
      if (!conversationKey?.aesKey) {
        throw new Error('Invalid conversation key');
      }
      if (!userMasterKey) {
        throw new Error('User master key cannot be empty');
      }

      console.log('🔒 Encrypting conversation key for storage...');

      // Encrypt the AES key with user's master key
      const encryptedKey = this.encryptData(conversationKey.aesKey, userMasterKey);

      const encryptedConversationKey: EncryptedConversationKey = {
        keyId: conversationKey.keyId,
        conversationId: conversationKey.conversationId,
        encryptedKey,
        participants: conversationKey.participants,
        createdAt: conversationKey.createdAt
      };

      console.log('✅ Conversation key encrypted for storage');
      return encryptedConversationKey;
      
    } catch (error) {
      console.error('❌ Conversation key encryption failed:', error);
      throw new Error(`Conversation key encryption failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Decrypt Conversation Key from Storage
   * Decrypts a conversation key using user's master key
   */
  static decryptConversationKey(
    encryptedConversationKey: EncryptedConversationKey,
    userMasterKey: string
  ): ConversationKey {
    try {
      // Validate inputs
      if (!encryptedConversationKey?.encryptedKey) {
        throw new Error('Invalid encrypted conversation key');
      }
      if (!userMasterKey) {
        throw new Error('User master key cannot be empty');
      }

      console.log('🔓 Decrypting conversation key from storage...');

      // Decrypt the AES key
      const aesKey = this.decryptData(encryptedConversationKey.encryptedKey, userMasterKey);

      const conversationKey: ConversationKey = {
        keyId: encryptedConversationKey.keyId,
        conversationId: encryptedConversationKey.conversationId,
        aesKey,
        participants: encryptedConversationKey.participants,
        createdAt: encryptedConversationKey.createdAt
      };

      console.log('✅ Conversation key decrypted successfully');
      return conversationKey;
      
    } catch (error) {
      console.error('❌ Conversation key decryption failed:', error);
      throw new Error(`Conversation key decryption failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Encrypt Message with Conversation Key
   * Encrypts a message using the conversation's AES key
   */
  static encryptMessage(message: string, conversationKey: ConversationKey): EncryptedData {
    try {
      // Validate inputs
      if (!message) {
        throw new Error('Message cannot be empty');
      }
      if (!conversationKey?.aesKey) {
        throw new Error('Invalid conversation key');
      }

      console.log('💬 Encrypting message with conversation key...');

      const encrypted = this.encryptData(message, conversationKey.aesKey);

      console.log('✅ Message encrypted successfully');
      return encrypted;
      
    } catch (error) {
      console.error('❌ Message encryption failed:', error);
      throw new Error(`Message encryption failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Decrypt Message with Conversation Key
   * Decrypts a message using the conversation's AES key
   */
  static decryptMessage(encryptedMessage: EncryptedData, conversationKey: ConversationKey): string {
    try {
      // Validate inputs
      if (!encryptedMessage?.encryptedContent) {
        throw new Error('Invalid encrypted message');
      }
      if (!conversationKey?.aesKey) {
        throw new Error('Invalid conversation key');
      }

      console.log('💬 Decrypting message with conversation key...');

      const decrypted = this.decryptData(encryptedMessage, conversationKey.aesKey);

      console.log('✅ Message decrypted successfully');
      return decrypted;
      
    } catch (error) {
      console.error('❌ Message decryption failed:', error);
      throw new Error(`Message decryption failed: ${error.message}`);
    }
  }
  static generateSecureRandom(length: number = 32): string {
    try {
      if (length < 1) {
        throw new Error('Length must be positive');
      }

      return CryptoJS.lib.WordArray.random(length).toString();
      
    } catch (error) {
      console.error('❌ Secure random generation failed:', error);
      throw new Error(`Random generation failed: ${error.message}`);
    }
  }

  /**
   * Step 1: Key Validation
   * Validates that a key meets security requirements
   */
  static validateKey(key: string): boolean {
    try {
      // Check if key exists and has reasonable length
      if (!key || key.length < 32) {
        return false;
      }

      // Check if it's a valid hex string
      const hexRegex = /^[a-fA-F0-9]+$/;
      return hexRegex.test(key);
      
    } catch (error) {
      console.error('❌ Key validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance for convenience
export default EncryptionService;
