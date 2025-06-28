// Test encryption/decryption to verify shared secrets match
import DebugEncryptionService from './debugEncryption';

export function testEncryptionFlow() {
  console.group('🧪 Testing Encryption Flow');
  
  // Simulate Alice and Bob keys
  const alicePrivate = 'alice_private_key_12345';
  const alicePublic = 'alice_public_key_67890';
  const bobPrivate = 'bob_private_key_abcde';
  const bobPublic = 'bob_public_key_fghij';
  
  console.log('👥 Test Users:', {
    alicePrivate, alicePublic, bobPrivate, bobPublic
  });
  
  try {
    // Step 1: Alice encrypts message to Bob
    console.log('📤 Step 1: Alice encrypts to Bob');
    const message = 'Hello Bob!';
    const encrypted = DebugEncryptionService.encryptMessage(message, alicePrivate, bobPublic);
    console.log('✅ Encryption result:', encrypted);
    
    // Step 2: Bob decrypts message from Alice  
    console.log('📥 Step 2: Bob decrypts from Alice');
    const decrypted = DebugEncryptionService.decryptMessage(encrypted, bobPrivate, alicePublic);
    console.log('✅ Decryption result:', decrypted);
    
    // Step 3: Verify
    console.log('🔍 Verification:', {
      original: message,
      decrypted: decrypted,
      match: message === decrypted
    });
    
    if (message === decrypted) {
      console.log('✅ ENCRYPTION TEST PASSED!');
    } else {
      console.log('❌ ENCRYPTION TEST FAILED!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.groupEnd();
}

// Call this function in browser console to test
(window as any).testEncryption = testEncryptionFlow;
