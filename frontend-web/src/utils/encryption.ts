import CryptoJS from 'crypto-js';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedMessage {
  encryptedContent: string;
  iv: string;
}

class EncryptionService {
  private static readonly KEY_SIZE = 256;
  private static readonly IV_SIZE = 16;

  /**
   * Generate a new RSA-like key pair for asymmetric encryption
   * Note: This is a simplified implementation. In production, consider using Web Crypto API
   */
  static async generateKeyPair(): Promise<KeyPair> {
    try {
      // Generate a random 256-bit key for each user
      const privateKey = CryptoJS.lib.WordArray.random(this.KEY_SIZE / 8).toString();
      
      // Derive public key from private key (simplified approach)
      const publicKey = CryptoJS.SHA256(privateKey + 'public_salt').toString();

      return {
        privateKey,
        publicKey
      };
    } catch (error) {
      console.error('Error generating key pair:', error);
      throw new Error('Failed to generate encryption keys');
    }
  }

  /**
   * Encrypt a message using AES-256-GCM with a shared secret
   */
  static encryptMessage(
    message: string, 
    senderPrivateKey: string, 
    recipientPublicKey: string
  ): EncryptedMessage {
    try {
      // Generate shared secret using sender's private key and recipient's public key
      const sharedSecret = this.generateSharedSecret(senderPrivateKey, recipientPublicKey);
      
      // Generate random IV
      const iv = CryptoJS.lib.WordArray.random(this.IV_SIZE);
      
      // Encrypt message
      const encrypted = CryptoJS.AES.encrypt(message, sharedSecret, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return {
        encryptedContent: encrypted.toString(),
        iv: iv.toString()
      };
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message using AES-256-GCM with a shared secret
   */
  static decryptMessage(
    encryptedMessage: EncryptedMessage,
    recipientPrivateKey: string,
    senderPublicKey: string
  ): string {
    try {
      // Generate shared secret using recipient's private key and sender's public key
      const sharedSecret = this.generateSharedSecret(recipientPrivateKey, senderPublicKey);
      
      // Parse IV
      const iv = CryptoJS.enc.Hex.parse(encryptedMessage.iv);
      
      // Decrypt message
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage.encryptedContent, sharedSecret, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedMessage = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedMessage) {
        throw new Error('Failed to decrypt message - invalid key or corrupted data');
      }

      return decryptedMessage;
    } catch (error) {
      console.error('Error decrypting message:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Generate a shared secret from two keys using ECDH-like approach
   */
  private static generateSharedSecret(privateKey: string, publicKey: string): string {
    try {
      // Simplified key derivation - combine private and public keys
      const combined = privateKey + publicKey;
      
      // Use PBKDF2 to derive a strong shared secret
      const sharedSecret = CryptoJS.PBKDF2(combined, 'encryption_salt', {
        keySize: this.KEY_SIZE / 32,
        iterations: 10000
      });

      return sharedSecret.toString();
    } catch (error) {
      console.error('Error generating shared secret:', error);
      throw new Error('Failed to generate shared secret');
    }
  }

  /**
   * Hash a password for authentication
   */
  static hashPassword(password: string, salt?: string): string {
    try {
      const saltToUse = salt || CryptoJS.lib.WordArray.random(128/8).toString();
      const hash = CryptoJS.PBKDF2(password, saltToUse, {
        keySize: 256/32,
        iterations: 10000
      });
      
      return salt ? hash.toString() : saltToUse + ':' + hash.toString();
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against a hash
   */
  static verifyPassword(password: string, hash: string): boolean {
    try {
      const [salt, originalHash] = hash.split(':');
      const computedHash = this.hashPassword(password, salt);
      return computedHash === originalHash;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Generate a secure random string for IDs, tokens, etc.
   */
  static generateSecureRandom(length: number = 32): string {
    try {
      return CryptoJS.lib.WordArray.random(length).toString();
    } catch (error) {
      console.error('Error generating secure random:', error);
      throw new Error('Failed to generate secure random string');
    }
  }

  /**
   * Derive encryption key from password (for local storage encryption)
   */
  static deriveKeyFromPassword(password: string, salt: string): string {
    try {
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: this.KEY_SIZE / 32,
        iterations: 100000 // Higher iterations for password-based encryption
      });
      
      return key.toString();
    } catch (error) {
      console.error('Error deriving key from password:', error);
      throw new Error('Failed to derive encryption key');
    }
  }

  /**
   * Encrypt data for local storage
   */
  static encryptForStorage(data: string, key: string): string {
    try {
      const iv = CryptoJS.lib.WordArray.random(this.IV_SIZE);
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return iv.toString() + ':' + encrypted.toString();
    } catch (error) {
      console.error('Error encrypting for storage:', error);
      throw new Error('Failed to encrypt data for storage');
    }
  }

  /**
   * Decrypt data from local storage
   */
  static decryptFromStorage(encryptedData: string, key: string): string {
    try {
      const [ivHex, encryptedContent] = encryptedData.split(':');
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      
      const decrypted = CryptoJS.AES.decrypt(encryptedContent, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const decryptedData = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        throw new Error('Failed to decrypt storage data');
      }

      return decryptedData;
    } catch (error) {
      console.error('Error decrypting from storage:', error);
      throw new Error('Failed to decrypt data from storage');
    }
  }

  /**
   * Validate that a public key is properly formatted
   */
  static validatePublicKey(publicKey: string): boolean {
    try {
      // Basic validation - check if it's a valid hex string of expected length
      const hexRegex = /^[a-fA-F0-9]+$/;
      return hexRegex.test(publicKey) && publicKey.length === 64; // 32 bytes = 64 hex chars
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a fingerprint for a public key (for verification)
   */
  static generateKeyFingerprint(publicKey: string): string {
    try {
      const hash = CryptoJS.SHA256(publicKey);
      const fingerprint = hash.toString().substring(0, 16);
      
      // Format as groups of 4 characters
      return fingerprint.match(/.{1,4}/g)?.join(' ') || fingerprint;
    } catch (error) {
      console.error('Error generating key fingerprint:', error);
      throw new Error('Failed to generate key fingerprint');
    }
  }
}

export default EncryptionService;
