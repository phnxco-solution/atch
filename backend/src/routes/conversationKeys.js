/**
 * Conversation Keys API Routes
 * Step 3: Backend integration for conversation key management
 */

const express = require('express');
const router = express.Router();
const ConversationKeyService = require('../services/conversationKeyService');
const UserService = require('../services/userService');
const { authenticateToken } = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimiting');

/**
 * Store encrypted conversation key for current user
 * POST /api/conversation-keys/store
 */
router.post('/store',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { conversationId, keyId, encryptedAesKey, iv } = req.body;

      // Validate required fields
      if (!conversationId || !keyId || !encryptedAesKey || !iv) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: conversationId, keyId, encryptedAesKey, iv'
        });
      }

      await ConversationKeyService.storeConversationKey(
        conversationId,
        req.user.id,
        keyId,
        encryptedAesKey,
        iv
      );

      res.status(201).json({
        success: true,
        message: 'Conversation key stored successfully'
      });

    } catch (error) {
      console.error('Store conversation key error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to store conversation key'
      });
    }
  }
);

/**
 * Get encrypted conversation key for current user
 * GET /api/conversation-keys/:conversationId
 */
router.get('/:conversationId',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      const conversationKey = await ConversationKeyService.getConversationKey(
        conversationId,
        req.user.id
      );

      res.json({
        success: true,
        data: {
          conversationKey
        }
      });

    } catch (error) {
      console.error('Get conversation key error:', error);

      if (error.message === 'Conversation key not found for user') {
        return res.status(404).json({
          success: false,
          message: 'Conversation key not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get conversation key'
      });
    }
  }
);

/**
 * Get conversation participants with public keys
 * GET /api/conversation-keys/:conversationId/participants
 */
router.get('/:conversationId/participants',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      // Check if user has access to this conversation
      const hasAccess = await ConversationKeyService.hasConversationAccess(
        conversationId,
        req.user.id
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      const participants = await ConversationKeyService.getConversationParticipants(conversationId);

      res.json({
        success: true,
        data: {
          participants
        }
      });

    } catch (error) {
      console.error('Get conversation participants error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conversation participants'
      });
    }
  }
);

/**
 * Get all conversations for current user
 * GET /api/conversation-keys/conversations
 */
router.get('/conversations/list',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { limit = 50 } = req.query;

      const conversations = await ConversationKeyService.getUserConversations(
        req.user.id,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: {
          conversations
        }
      });

    } catch (error) {
      console.error('Get user conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conversations'
      });
    }
  }
);

/**
 * Set up conversation with multiple users
 * POST /api/conversation-keys/setup
 */
router.post('/setup',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { conversationId, participantUserIds, conversationKeys } = req.body;

      // Validate input
      if (!conversationId || !participantUserIds || !conversationKeys) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: conversationId, participantUserIds, conversationKeys'
        });
      }

      if (!Array.isArray(participantUserIds) || participantUserIds.length < 1) {
        return res.status(400).json({
          success: false,
          message: 'participantUserIds must be a non-empty array'
        });
      }

      // Verify all participants exist
      const users = await UserService.getUsersPublicKeys(participantUserIds);
      if (users.length !== participantUserIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more participant users not found'
        });
      }

      // Store conversation keys for each participant
      const storePromises = participantUserIds.map(userId => {
        const userKey = conversationKeys[userId];
        if (!userKey || !userKey.keyId || !userKey.encryptedAesKey || !userKey.iv) {
          throw new Error(`Invalid conversation key for user ${userId}`);
        }

        return ConversationKeyService.storeConversationKey(
          conversationId,
          userId,
          userKey.keyId,
          userKey.encryptedAesKey,
          userKey.iv
        );
      });

      await Promise.all(storePromises);

      res.status(201).json({
        success: true,
        message: 'Conversation set up successfully',
        data: {
          conversationId,
          participantCount: participantUserIds.length
        }
      });

    } catch (error) {
      console.error('Setup conversation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to set up conversation'
      });
    }
  }
);

/**
 * Check conversation access
 * GET /api/conversation-keys/:conversationId/access
 */
router.get('/:conversationId/access',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      const hasAccess = await ConversationKeyService.hasConversationAccess(
        conversationId,
        req.user.id
      );

      res.json({
        success: true,
        data: {
          hasAccess
        }
      });

    } catch (error) {
      console.error('Check conversation access error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check conversation access'
      });
    }
  }
);

module.exports = router;
