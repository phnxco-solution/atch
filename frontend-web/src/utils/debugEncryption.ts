// Debug version of encryption service with detailed logging
import EncryptionService from './encryption';
import type { EncryptedMessage } from './encryption';

export class DebugEncryptionService extends EncryptionService {
  static debugDecryptMessage(
    encryptedMessage: EncryptedMessage,
    recipientPrivateKey: string,
    senderPublicKey: string,
    messageId: number
  ): string {
    console.group(`🔍 Debug Decryption for Message ID: ${messageId}`);
    
    try {
      console.log('📋 Input Parameters:', {
        hasEncryptedMessage: !!encryptedMessage,
        hasEncryptedContent: !!encryptedMessage?.encryptedContent,
        hasIV: !!encryptedMessage?.iv,
        hasRecipientPrivateKey: !!recipientPrivateKey,
        hasSenderPublicKey: !!senderPublicKey,
        encryptedContentLength: encryptedMessage?.encryptedContent?.length || 0,
        ivLength: encryptedMessage?.iv?.length || 0,
        recipientPrivateKeyLength: recipientPrivateKey?.length || 0,
        senderPublicKeyLength: senderPublicKey?.length || 0
      });

      // Validate inputs with detailed messages
      if (!encryptedMessage) {
        throw new Error('❌ encryptedMessage is null or undefined');
      }
      
      if (!encryptedMessage.encryptedContent) {
        throw new Error('❌ encryptedMessage.encryptedContent is null or undefined');
      }
      
      if (!encryptedMessage.iv) {
        throw new Error('❌ encryptedMessage.iv is null or undefined');
      }
      
      if (!recipientPrivateKey) {
        throw new Error('❌ recipientPrivateKey is null or undefined');
      }
      
      if (!senderPublicKey) {
        throw new Error('❌ senderPublicKey is null or undefined');
      }

      console.log('✅ All input validation passed');
      
      // Call the parent method
      const result = super.decryptMessage(encryptedMessage, recipientPrivateKey, senderPublicKey);
      
      console.log('✅ Decryption successful:', result);
      console.groupEnd();
      
      return result;
      
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      console.groupEnd();
      throw error;
    }
  }

  // Test function to verify encryption/decryption works
  static testEncryptionDecryption(message: string, privateKey1: string, publicKey1: string, privateKey2: string, publicKey2: string): void {
    console.group('🧪 Testing Encryption/Decryption');
    
    try {
      console.log('📝 Test message:', message);
      console.log('🔑 Keys:', {
        privateKey1: privateKey1.substring(0, 16) + '...',
        publicKey1: publicKey1.substring(0, 16) + '...',
        privateKey2: privateKey2.substring(0, 16) + '...',
        publicKey2: publicKey2.substring(0, 16) + '...'
      });

      // Test 1: Encrypt with user1 keys, decrypt with user2 keys
      console.log('🔐 Test 1: User1 → User2');
      const encrypted1 = this.encryptMessage(message, privateKey1, publicKey2);
      console.log('✅ Encryption successful');
      
      const decrypted1 = this.decryptMessage(encrypted1, privateKey2, publicKey1);
      console.log('✅ Decryption result:', decrypted1);
      console.log('✅ Match:', message === decrypted1);

      // Test 2: Encrypt with user2 keys, decrypt with user1 keys  
      console.log('🔐 Test 2: User2 → User1');
      const encrypted2 = this.encryptMessage(message, privateKey2, publicKey1);
      console.log('✅ Encryption successful');
      
      const decrypted2 = this.decryptMessage(encrypted2, privateKey1, publicKey2);
      console.log('✅ Decryption result:', decrypted2);
      console.log('✅ Match:', message === decrypted2);

      console.groupEnd();
    } catch (error) {
      console.error('❌ Test failed:', error);
      console.groupEnd();
    }
  }
}

export default DebugEncryptionService;
