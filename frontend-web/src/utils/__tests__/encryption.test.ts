/**
 * Test Suite for Encryption Service - Steps 1 & 2
 * Tests the foundation + conversation key management
 */

import { EncryptionService } from '../encryption';

// Test helper to run async tests
const runTest = async (testName: string, testFn: () => Promise<void>) => {
  try {
    console.log(`\n🧪 Running: ${testName}`);
    await testFn();
    console.log(`✅ PASSED: ${testName}`);
  } catch (error) {
    console.error(`❌ FAILED: ${testName}`);
    console.error(`   Error: ${error.message}`);
    throw error;
  }
};

/**
 * Test Suite Runner
 */
export const runEncryptionTests = async () => {
  console.log('🚀 Starting Encryption Service Tests - Steps 1 & 2\n');

  // === STEP 1 TESTS ===
  console.log('📋 Step 1: Foundation Tests');

  // Test 1: Master Key Derivation
  await runTest('Master Key Derivation - Basic', async () => {
    const password = 'testPassword123!';
    const result = await EncryptionService.deriveMasterKey(password);
    
    if (!result.masterKey || !result.salt) {
      throw new Error('Master key or salt missing');
    }
    
    if (result.masterKey.length !== 64) { // 256 bits = 64 hex chars
      throw new Error(`Expected master key length 64, got ${result.masterKey.length}`);
    }
    
    if (result.salt.length !== 64) { // 256 bits = 64 hex chars
      throw new Error(`Expected salt length 64, got ${result.salt.length}`);
    }
  });

  // Test 2: Master Key Consistency
  await runTest('Master Key Derivation - Consistency', async () => {
    const password = 'testPassword123!';
    const result1 = await EncryptionService.deriveMasterKey(password);
    const result2 = await EncryptionService.deriveMasterKey(password, result1.salt);
    
    if (result1.masterKey !== result2.masterKey) {
      throw new Error('Master keys should be identical with same password and salt');
    }
  });

  // Test 3: Basic Encryption/Decryption
  await runTest('Basic AES Encryption/Decryption', async () => {
    const plaintext = 'Hello, this is a secret message!';
    const key = EncryptionService.generateSecureRandom(32);
    
    const encrypted = EncryptionService.encryptData(plaintext, key);
    const decrypted = EncryptionService.decryptData(encrypted, key);
    
    if (decrypted !== plaintext) {
      throw new Error(`Expected "${plaintext}", got "${decrypted}"`);
    }
  });

  // === STEP 2 TESTS ===
  console.log('\n📋 Step 2: Conversation Key Management Tests');

  // Test 4: User Key Pair Generation
  await runTest('User Key Pair Generation', async () => {
    const keyPair = EncryptionService.generateUserKeyPair();
    
    if (!keyPair.keyId || !keyPair.publicKey || !keyPair.privateKey) {
      throw new Error('Key pair missing required fields');
    }
    
    if (keyPair.keyId.length !== 32) { // 16 bytes = 32 hex chars
      throw new Error(`Expected keyId length 32, got ${keyPair.keyId.length}`);
    }
    
    if (keyPair.publicKey.length !== 64) { // SHA256 = 64 hex chars
      throw new Error(`Expected publicKey length 64, got ${keyPair.publicKey.length}`);
    }
    
    if (keyPair.privateKey.length !== 64) { // 32 bytes = 64 hex chars
      throw new Error(`Expected privateKey length 64, got ${keyPair.privateKey.length}`);
    }
  });

  // Test 5: Key Pair Consistency
  await runTest('User Key Pair - Public Key Derivation', async () => {
    const keyPair1 = EncryptionService.generateUserKeyPair();
    const keyPair2 = EncryptionService.generateUserKeyPair();
    
    // Different key pairs should have different keys
    if (keyPair1.privateKey === keyPair2.privateKey) {
      throw new Error('Different key pairs should have different private keys');
    }
    
    if (keyPair1.publicKey === keyPair2.publicKey) {
      throw new Error('Different key pairs should have different public keys');
    }
  });

  // Test 6: Conversation Key Generation
  await runTest('Conversation Key Generation', async () => {
    const conversationId = 'conv_123';
    const participants = ['user1', 'user2'];
    
    const convKey = EncryptionService.generateConversationKey(conversationId, participants);
    
    if (!convKey.keyId || !convKey.aesKey || !convKey.conversationId) {
      throw new Error('Conversation key missing required fields');
    }
    
    if (convKey.conversationId !== conversationId) {
      throw new Error('Conversation ID mismatch');
    }
    
    if (convKey.participants.length !== 2) {
      throw new Error('Expected 2 participants');
    }
    
    if (convKey.aesKey.length !== 64) { // 32 bytes = 64 hex chars
      throw new Error(`Expected AES key length 64, got ${convKey.aesKey.length}`);
    }
  });

  // Test 7: Conversation Key Encryption/Decryption
  await runTest('Conversation Key Storage Encryption', async () => {
    const password = 'userPassword123!';
    const masterKeyResult = await EncryptionService.deriveMasterKey(password);
    
    const conversationId = 'conv_456';
    const participants = ['user1', 'user2'];
    const convKey = EncryptionService.generateConversationKey(conversationId, participants);
    
    // Encrypt conversation key
    const encryptedConvKey = EncryptionService.encryptConversationKey(convKey, masterKeyResult.masterKey);
    
    if (!encryptedConvKey.encryptedKey || !encryptedConvKey.keyId) {
      throw new Error('Encrypted conversation key missing fields');
    }
    
    // Decrypt conversation key
    const decryptedConvKey = EncryptionService.decryptConversationKey(encryptedConvKey, masterKeyResult.masterKey);
    
    if (decryptedConvKey.aesKey !== convKey.aesKey) {
      throw new Error('Decrypted AES key does not match original');
    }
    
    if (decryptedConvKey.conversationId !== convKey.conversationId) {
      throw new Error('Conversation ID mismatch after decryption');
    }
  });

  // Test 8: End-to-End Message Flow
  await runTest('Complete Message Encryption Flow', async () => {
    // Setup: Create user and conversation
    const password = 'userPassword123!';
    const masterKeyResult = await EncryptionService.deriveMasterKey(password);
    
    const conversationId = 'conv_789';
    const participants = ['user1', 'user2'];
    const convKey = EncryptionService.generateConversationKey(conversationId, participants);
    
    // Test message
    const originalMessage = 'This is a secret conversation message!';
    
    // Encrypt message
    const encryptedMessage = EncryptionService.encryptMessage(originalMessage, convKey);
    
    if (!encryptedMessage.encryptedContent || !encryptedMessage.iv) {
      throw new Error('Encrypted message missing fields');
    }
    
    // Decrypt message
    const decryptedMessage = EncryptionService.decryptMessage(encryptedMessage, convKey);
    
    if (decryptedMessage !== originalMessage) {
      throw new Error(`Expected "${originalMessage}", got "${decryptedMessage}"`);
    }
  });

  // Test 9: Cross-User Conversation Key Access
  await runTest('Multi-User Conversation Key Access', async () => {
    // Simulate two users with different passwords
    const user1Password = 'user1Password!';
    const user2Password = 'user2Password!';
    
    const user1MasterKey = await EncryptionService.deriveMasterKey(user1Password);
    const user2MasterKey = await EncryptionService.deriveMasterKey(user2Password);
    
    // Create conversation key
    const conversationId = 'conv_shared';
    const participants = ['user1', 'user2'];
    const convKey = EncryptionService.generateConversationKey(conversationId, participants);
    
    // Both users encrypt the same conversation key with their master keys
    const user1EncryptedKey = EncryptionService.encryptConversationKey(convKey, user1MasterKey.masterKey);
    const user2EncryptedKey = EncryptionService.encryptConversationKey(convKey, user2MasterKey.masterKey);
    
    // Both users should be able to decrypt and get the same conversation key
    const user1DecryptedKey = EncryptionService.decryptConversationKey(user1EncryptedKey, user1MasterKey.masterKey);
    const user2DecryptedKey = EncryptionService.decryptConversationKey(user2EncryptedKey, user2MasterKey.masterKey);
    
    if (user1DecryptedKey.aesKey !== convKey.aesKey) {
      throw new Error('User 1 cannot decrypt conversation key correctly');
    }
    
    if (user2DecryptedKey.aesKey !== convKey.aesKey) {
      throw new Error('User 2 cannot decrypt conversation key correctly');
    }
    
    // Both should be able to encrypt/decrypt messages
    const message = 'Shared secret message';
    const encryptedByUser1 = EncryptionService.encryptMessage(message, user1DecryptedKey);
    const decryptedByUser2 = EncryptionService.decryptMessage(encryptedByUser1, user2DecryptedKey);
    
    if (decryptedByUser2 !== message) {
      throw new Error('Cross-user message encryption/decryption failed');
    }
  });

  // Test 10: Error Handling for Step 2
  await runTest('Step 2 Error Handling', async () => {
    // Test invalid conversation key generation
    try {
      EncryptionService.generateConversationKey('', ['user1']);
      throw new Error('Should fail with invalid conversation parameters');
    } catch (error) {
      if (!error.message.includes('Conversation ID cannot be empty')) {
        throw new Error('Expected conversation ID validation error');
      }
    }
    
    // Test insufficient participants
    try {
      EncryptionService.generateConversationKey('conv_123', ['user1']);
      throw new Error('Should fail with insufficient participants');
    } catch (error) {
      if (!error.message.includes('at least 2 participants')) {
        throw new Error('Expected participant validation error');
      }
    }
  });

  console.log('\n🎉 All Steps 1 & 2 tests passed! Foundation + Conversation Keys working perfectly.');
  return true;
};

// Export for external testing
export default runEncryptionTests;
