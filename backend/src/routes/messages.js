const express = require('express');
const router = express.Router();
const MessageService = require('../services/messageService');
const { messageValidation, validateRequest } = require('../utils/validation');
const { apiRateLimit, messageRateLimit } = require('../middleware/rateLimiting');
const { authenticateToken } = require('../middleware/auth');

// Send a new message
router.post('/',
  authenticateToken,
  messageRateLimit,
  validateRequest(messageValidation.send),
  async (req, res) => {
    try {
      const { recipientId, encryptedContent, iv, messageType } = req.body;

      // Can't send message to yourself
      if (recipientId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot send message to yourself'
        });
      }

      const message = await MessageService.sendMessage(
        req.user.id,
        recipientId,
        encryptedContent,
        iv,
        messageType
      );

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: {
          message: {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            recipientId: message.recipientId,
            encryptedContent: message.encryptedContent,
            iv: message.iv,
            messageType: message.messageType,
            createdAt: message.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message'
      });
    }
  }
);

// Get a specific message
router.get('/:messageId',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { messageId } = req.params;

      const message = await MessageService.getMessageById(
        parseInt(messageId),
        req.user.id
      );

      res.json({
        success: true,
        data: {
          message
        }
      });
    } catch (error) {
      console.error('Get message error:', error);

      if (error.message === 'Message not found or access denied') {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get message'
      });
    }
  }
);

// Delete a message (only sender can delete)
router.delete('/:messageId',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { messageId } = req.params;

      await MessageService.deleteMessage(
        parseInt(messageId),
        req.user.id
      );

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Delete message error:', error);

      if (error.message === 'Message not found or you do not have permission to delete it') {
        return res.status(404).json({
          success: false,
          message: 'Message not found or permission denied'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete message'
      });
    }
  }
);

// Search messages
router.get('/search/:query',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { query } = req.params;
      const { limit = 20 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      const messages = await MessageService.searchMessages(
        req.user.id,
        query.trim(),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: {
          messages,
          query: query.trim()
        }
      });
    } catch (error) {
      console.error('Search messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed'
      });
    }
  }
);

// Get unread message count
router.get('/unread/count',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const unreadCount = await MessageService.getUnreadMessageCount(req.user.id);

      res.json({
        success: true,
        data: {
          unreadCount
        }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count'
      });
    }
  }
);

module.exports = router;
