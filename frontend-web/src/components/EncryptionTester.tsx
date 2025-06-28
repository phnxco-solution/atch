/**
 * Encryption Service Tester Component
 * Interactive testing interface for our encryption service
 * Steps 1 & 2: Foundation + Conversation Key Management
 */

import React, { useState } from 'react';
import { runEncryptionTests } from '../utils/__tests__/encryption.test';
import { EncryptionService } from '../utils/encryption';

interface TestResult {
  success: boolean;
  message: string;
  timestamp: Date;
}

export const EncryptionTester: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [manualTest, setManualTest] = useState({
    password: 'testPassword123!',
    message: 'Hello, this is a secret message!',
    conversationId: 'conv_test_123',
    participants: 'user1,user2'
  });

  // Run automated test suite
  const runAutomatedTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      await runEncryptionTests();
      
      setTestResults(prev => [...prev, {
        success: true,
        message: '🎉 All automated tests passed!',
        timestamp: new Date()
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        success: false,
        message: `❌ Test failed: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  // Run manual encryption test - Step 2 workflow
  const runManualTest = async () => {
    try {
      setTestResults(prev => [...prev, {
        success: true,
        message: '🔄 Running manual Step 2 encryption workflow...',
        timestamp: new Date()
      }]);

      // Step 1: Derive master key from password
      const masterKeyResult = await EncryptionService.deriveMasterKey(manualTest.password);
      
      setTestResults(prev => [...prev, {
        success: true,
        message: `🔑 Master key derived: ${masterKeyResult.masterKey.substring(0, 16)}...`,
        timestamp: new Date()
      }]);

      // Step 2: Generate user key pair
      const userKeyPair = EncryptionService.generateUserKeyPair();
      
      setTestResults(prev => [...prev, {
        success: true,
        message: `👤 User key pair generated: ${userKeyPair.keyId}`,
        timestamp: new Date()
      }]);

      // Step 3: Generate conversation key
      const participants = manualTest.participants.split(',').map(p => p.trim());
      const conversationKey = EncryptionService.generateConversationKey(
        manualTest.conversationId, 
        participants
      );
      
      setTestResults(prev => [...prev, {
        success: true,
        message: `💬 Conversation key generated: ${conversationKey.keyId}`,
        timestamp: new Date()
      }]);

      // Step 4: Encrypt conversation key for storage
      const encryptedConversationKey = EncryptionService.encryptConversationKey(
        conversationKey, 
        masterKeyResult.masterKey
      );
      
      setTestResults(prev => [...prev, {
        success: true,
        message: `🔒 Conversation key encrypted for storage`,
        timestamp: new Date()
      }]);

      // Step 5: Decrypt conversation key from storage
      const decryptedConversationKey = EncryptionService.decryptConversationKey(
        encryptedConversationKey, 
        masterKeyResult.masterKey
      );
      
      setTestResults(prev => [...prev, {
        success: true,
        message: `🔓 Conversation key decrypted from storage`,
        timestamp: new Date()
      }]);

      // Step 6: Encrypt message with conversation key
      const encryptedMessage = EncryptionService.encryptMessage(
        manualTest.message, 
        decryptedConversationKey
      );
      
      setTestResults(prev => [...prev, {
        success: true,
        message: `💬 Message encrypted: ${encryptedMessage.encryptedContent.substring(0, 32)}...`,
        timestamp: new Date()
      }]);

      // Step 7: Decrypt message with conversation key
      const decryptedMessage = EncryptionService.decryptMessage(
        encryptedMessage, 
        decryptedConversationKey
      );
      
      setTestResults(prev => [...prev, {
        success: true,
        message: `💬 Message decrypted: "${decryptedMessage}"`,
        timestamp: new Date()
      }]);

      // Final validation
      if (decryptedMessage === manualTest.message) {
        setTestResults(prev => [...prev, {
          success: true,
          message: '✅ Complete Step 2 workflow successful - all components working!',
          timestamp: new Date()
        }]);
      } else {
        throw new Error('Decrypted message does not match original');
      }
      
    } catch (error) {
      setTestResults(prev => [...prev, {
        success: false,
        message: `❌ Manual test failed: ${error.message}`,
        timestamp: new Date()
      }]);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🔐 Encryption Service Tester - Steps 1 & 2
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Automated Tests */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Automated Tests</h3>
          
          <button
            onClick={runAutomatedTests}
            disabled={isRunning}
            className={`w-full px-4 py-2 rounded-md font-medium ${
              isRunning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRunning ? '🔄 Running Tests...' : '🧪 Run All Tests'}
          </button>
          
          <p className="text-sm text-gray-600">
            Comprehensive test suite including:
            <br />• Master key derivation (Step 1)
            <br />• User key pair generation (Step 2)
            <br />• Conversation key management (Step 2)
            <br />• Message encryption workflow (Step 2)
            <br />• Cross-user testing (Step 2)
            <br />• Error handling & validation
          </p>
        </div>

        {/* Manual Tests */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Manual Step 2 Testing</h3>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Password:
            </label>
            <input
              type="text"
              value={manualTest.password}
              onChange={(e) => setManualTest(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter test password"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Conversation ID:
            </label>
            <input
              type="text"
              value={manualTest.conversationId}
              onChange={(e) => setManualTest(prev => ({ ...prev, conversationId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter conversation ID"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Participants (comma-separated):
            </label>
            <input
              type="text"
              value={manualTest.participants}
              onChange={(e) => setManualTest(prev => ({ ...prev, participants: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user1,user2"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Message:
            </label>
            <textarea
              value={manualTest.message}
              onChange={(e) => setManualTest(prev => ({ ...prev, message: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter test message"
            />
          </div>
          
          <button
            onClick={runManualTest}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            🔬 Test Complete Workflow
          </button>
        </div>
      </div>

      {/* Results */}
      {testResults.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Test Results</h3>
            <button
              onClick={clearResults}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-md p-4 max-h-96 overflow-y-auto">
            <div className="font-mono text-sm space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    result.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="flex-1 break-all">{result.message}</span>
                    <span className="text-xs opacity-75 ml-2 whitespace-nowrap">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-6 p-4 bg-green-50 rounded-md">
        <h4 className="font-semibold text-green-900 mb-2">Steps 1 & 2 - Core Encryption Complete</h4>
        <div className="text-green-800 text-sm space-y-1">
          <p><strong>Step 1 ✅:</strong> Master key derivation, AES encryption foundation</p>
          <p><strong>Step 2 ✅:</strong> User key pairs, conversation keys, message encryption</p>
          <div className="mt-2 pt-2 border-t border-green-200">
            <p className="font-medium">Key Features Working:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>PBKDF2 master key derivation (600k iterations)</li>
              <li>User public/private key pair generation</li>
              <li>Conversation-specific AES keys</li>
              <li>Secure key storage (encrypted with master key)</li>
              <li>Complete message encryption/decryption workflow</li>
              <li>Cross-user conversation key sharing</li>
            </ul>
          </div>
        </div>
        <p className="text-green-700 text-sm mt-3">
          <strong>Next:</strong> Integration with backend API and real conversation management.
        </p>
      </div>
    </div>
  );
};

export default EncryptionTester;
