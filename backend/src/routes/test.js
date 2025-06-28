/**
 * Test Routes for Step 3 Backend Integration
 * Simple endpoints to verify encryption system works end-to-end
 */

const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const ConversationKeyService = require('../services/conversationKeyService');
const MessageService = require('../services/messageService');
const { authenticateToken } = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimiting');

/**
 * Test endpoint - Step 3 system health check
 */
router.get('/health',
  async (req, res) => {
    try {
      res.json({
        success: true,
        message: 'Step 3 Backend Integration - All Systems Operational',
        timestamp: new Date().toISOString(),
        features: {
          userEncryption: 'Master key salt & public key storage',
          conversationKeys: 'Encrypted conversation key management',
          messageStorage: 'Conversation-based encrypted messages',
          apiEndpoints: 'Full CRUD operations with encryption support'
        },
        endpoints: {
          auth: {
            'POST /api/auth/register': 'Register with encryption keys',
            'POST /api/auth/login': 'Login with encryption data',
            'GET /api/auth/profile': 'Get user with encryption info'
          },
          conversationKeys: {
            'POST /api/conversation-keys/store': 'Store encrypted conversation key',
            'GET /api/conversation-keys/:id': 'Get encrypted conversation key',
            'POST /api/conversation-keys/setup': 'Setup multi-user conversation',
            'GET /api/conversation-keys/conversations/list': 'List user conversations'
          },
          messages: {
            'POST /api/messages': 'Send encrypted message to conversation',
            'GET /api/messages/:id': 'Get encrypted message'
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Step 3 health check failed',
        error: error.message
      });
    }
  }
);

/**
 * Test conversation setup workflow
 */
router.post('/setup-conversation',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { conversationId, testMessage, encryptedKeys } = req.body;

      if (!conversationId || !testMessage || !encryptedKeys) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: conversationId, testMessage, encryptedKeys'
        });
      }

      // Step 1: Store conversation key for current user
      const userKey = encryptedKeys[req.user.id];
      if (!userKey) {
        return res.status(400).json({
          success: false,
          message: 'No conversation key provided for current user'
        });
      }

      await ConversationKeyService.storeConversationKey(
        conversationId,
        req.user.id,
        userKey.keyId,
        userKey.encryptedAesKey,
        userKey.iv
      );

      // Step 2: Verify we can retrieve the key
      const retrievedKey = await ConversationKeyService.getConversationKey(
        conversationId,
        req.user.id
      );

      // Step 3: Send a test message
      const message = await MessageService.sendMessage(
        conversationId,
        req.user.id,
        testMessage.encryptedContent,
        testMessage.iv,
        'text'
      );

      // Step 4: Retrieve the message
      const retrievedMessage = await MessageService.getMessageById(
        message.id,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Step 3 conversation workflow test completed successfully',
        data: {
          conversationId,
          keyStored: !!retrievedKey,
          messageId: message.id,
          messageRetrieved: !!retrievedMessage,
          workflow: {
            step1: 'Conversation key stored',
            step2: 'Conversation key retrieved',
            step3: 'Test message sent',
            step4: 'Test message retrieved'
          }
        }
      });

    } catch (error) {
      console.error('Test conversation setup error:', error);
      res.status(500).json({
        success: false,
        message: 'Conversation workflow test failed',
        error: error.message
      });
    }
  }
);

/**
 * Get test statistics
 */
router.get('/stats',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      // Get user's conversations
      const conversations = await ConversationKeyService.getUserConversations(req.user.id);
      
      // Get recent messages
      const recentMessages = await MessageService.getRecentMessages(req.user.id, 5);

      res.json({
        success: true,
        data: {
          userId: req.user.id,
          totalConversations: conversations.length,
          recentMessageCount: recentMessages.length,
          conversations: conversations.map(conv => ({
            conversationId: conv.conversationId,
            messageCount: conv.messageCount,
            lastMessageAt: conv.lastMessageAt
          })),
          recentMessages: recentMessages.map(msg => ({
            messageId: msg.id,
            conversationId: msg.conversationId,
            senderUsername: msg.senderUsername,
            createdAt: msg.createdAt
          }))
        }
      });

    } catch (error) {
      console.error('Test stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get test statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;
