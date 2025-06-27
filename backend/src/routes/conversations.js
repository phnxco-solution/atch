const express = require('express');
const router = express.Router();
const ConversationService = require('../services/conversationService');
const MessageService = require('../services/messageService');
const { conversationValidation, validateRequest } = require('../utils/validation');
const { apiRateLimit } = require('../middleware/rateLimiting');
const { authenticateToken } = require('../middleware/auth');

// Get all conversations for current user
router.get('/',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const conversations = await ConversationService.getUserConversations(req.user.id);

      res.json({
        success: true,
        data: {
          conversations
        }
      });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conversations'
      });
    }
  }
);

// Create or get conversation with another user
router.post('/',
  authenticateToken,
  apiRateLimit,
  validateRequest(conversationValidation.create),
  async (req, res) => {
    try {
      const { participantId } = req.body;

      // Can't create conversation with yourself
      if (participantId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create conversation with yourself'
        });
      }

      const conversationId = await ConversationService.findOrCreateConversation(
        req.user.id,
        participantId
      );

      const conversation = await ConversationService.getConversationDetails(
        conversationId,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Conversation created or found',
        data: {
          conversation
        }
      });
    } catch (error) {
      console.error('Create conversation error:', error);

      if (error.message === 'Other user not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create conversation'
      });
    }
  }
);

// Get conversation details
router.get('/:conversationId',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      const conversation = await ConversationService.getConversationDetails(
        parseInt(conversationId),
        req.user.id
      );

      res.json({
        success: true,
        data: {
          conversation
        }
      });
    } catch (error) {
      console.error('Get conversation details error:', error);

      if (error.message === 'Conversation not found or access denied') {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get conversation'
      });
    }
  }
);

// Get messages in a conversation
router.get('/:conversationId/messages',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const messages = await MessageService.getConversationMessages(
        parseInt(conversationId),
        req.user.id,
        parseInt(limit),
        parseInt(offset)
      );

      res.json({
        success: true,
        data: {
          messages,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: messages.length === parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get conversation messages error:', error);

      if (error.message === 'Access denied to this conversation') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get messages'
      });
    }
  }
);

// Mark conversation as read
router.post('/:conversationId/read',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      await MessageService.markConversationAsRead(
        parseInt(conversationId),
        req.user.id
      );

      res.json({
        success: true,
        message: 'Conversation marked as read'
      });
    } catch (error) {
      console.error('Mark conversation as read error:', error);

      if (error.message === 'Access denied to this conversation') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to mark conversation as read'
      });
    }
  }
);

module.exports = router;
