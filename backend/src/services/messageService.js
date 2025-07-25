/**
 * Message Service - Step 3 Updated
 * Handles message operations with conversation-based encryption
 */

const db = require('../database/connection');
const ConversationService = require('./conversationService');

class MessageService {
  
  /**
   * Send a message to a conversation
   */
  static async sendMessage(conversationId, senderId, encryptedContent, iv, messageType = 'text') {
    try {
      const hasAccess = await ConversationService.verifyUserInConversation(conversationId, senderId);
      if (!hasAccess) {
        throw new Error('Sender does not have access to this conversation');
      }

      const result = await db.query(
        'INSERT INTO messages (conversation_id, sender_id, encrypted_content, iv, message_type) VALUES (?, ?, ?, ?, ?)',
        [conversationId, senderId, encryptedContent, iv, messageType]
      );

      return {
        id: result.insertId,
        conversationId,
        senderId,
        encryptedContent,
        iv,
        messageType,
        createdAt: new Date()
      };

    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  static async getConversationMessages(conversationId, userId, limit = 50, offset = 0) {
    try {
      // Verify user has access to this conversation
      const hasAccess = await ConversationService.verifyUserInConversation(conversationId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to this conversation');
      }

      // Get the conversation UUID from the integer ID
      const conversation = await db.query('SELECT conversation_id FROM conversations WHERE id = ?', [conversationId]);
      if (conversation.length === 0) {
        return [];
      }

      const conversationUuid = conversation[0].conversation_id;

      // Get messages using the UUID
      const messages = await db.query(`
        SELECT 
          m.id,
          m.conversation_id,
          m.sender_id,
          m.encrypted_content,
          m.iv,
          m.message_type,
          m.created_at,
          u.username as sender_username,
          u.public_key as sender_public_key
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
        LIMIT ? OFFSET ?
      `, [conversationUuid, limit, offset]);

      return messages.map(msg => ({
        id: msg.id,
        conversationId: conversationId, // Return the integer ID for frontend
        senderId: msg.sender_id,
        senderUsername: msg.sender_username,
        encryptedContent: msg.encrypted_content,
        iv: msg.iv,
        messageType: msg.message_type,
        createdAt: msg.created_at
      }));

    } catch (error) {
      console.error('❌ Error getting conversation messages:', error);
      throw error;
    }
  }

  /**
   * Get a specific message by ID
   */
  static async getMessageById(messageId, userId) {
    try {
      const messages = await db.query(`
        SELECT 
          m.id,
          m.conversation_id,
          m.sender_id,
          m.encrypted_content,
          m.iv,
          m.message_type,
          m.created_at,
          u.username as sender_username,
          u.public_key as sender_public_key
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
      `, [messageId]);

      if (messages.length === 0) {
        throw new Error('Message not found');
      }

      const msg = messages[0];

      // Verify user has access to this conversation
      const hasAccess = await ConversationService.verifyUserInConversation(msg.conversation_id, userId);
      if (!hasAccess) {
        throw new Error('Message not found or access denied');
      }

      return {
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        senderUsername: msg.sender_username,
        senderPublicKey: msg.sender_public_key,
        encryptedContent: msg.encrypted_content,
        iv: msg.iv,
        messageType: msg.message_type,
        createdAt: msg.created_at
      };

    } catch (error) {
      console.error('❌ Error getting message by ID:', error);
      throw error;
    }
  }

  /**
   * Delete a message (only sender can delete)
   */
  static async deleteMessage(messageId, userId) {
    try {
      // Get message to verify ownership and conversation access
      const messages = await db.query(
        'SELECT conversation_id, sender_id FROM messages WHERE id = ?',
        [messageId]
      );

      if (messages.length === 0) {
        throw new Error('Message not found');
      }

      const message = messages[0];

      // Verify user is the sender
      if (message.sender_id !== userId) {
        throw new Error('You can only delete your own messages');
      }

      // Verify user still has access to conversation
      const hasAccess = await ConversationService.verifyUserInConversation(message.conversation_id, userId);
      if (!hasAccess) {
        throw new Error('Access denied to this conversation');
      }

      // Delete the message
      await db.query('DELETE FROM messages WHERE id = ?', [messageId]);
      
      console.log(`✅ Message ${messageId} deleted by user ${userId}`);
      return true;

    } catch (error) {
      console.error('❌ Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for user
   */
  static async getUnreadMessageCount(userId) {
    try {
      // For now, we'll return 0 since we don't have read receipts yet
      // This can be enhanced later when we add read status tracking
      return 0;

    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      throw new Error('Failed to get unread count');
    }
  }

  /**
   * Search messages in user's conversations
   */
  static async searchMessages(userId, searchQuery, limit = 20) {
    try {
      // Get all conversations user participates in
      const userConversations = await db.query(`
        SELECT id FROM conversations 
        WHERE user1_id = ? OR user2_id = ?
      `, [userId, userId]);

      const conversationIds = userConversations.map(conv => conv.id);

      if (conversationIds.length === 0) {
        return [];
      }

      // Create placeholders for conversation IDs
      const placeholders = conversationIds.map(() => '?').join(',');

      const messages = await db.query(`
        SELECT 
          m.id,
          m.conversation_id,
          m.sender_id,
          m.encrypted_content,
          m.iv,
          m.message_type,
          m.created_at,
          u.username as sender_username,
          u.public_key as sender_public_key
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id IN (${placeholders})
        AND m.encrypted_content LIKE ?
        ORDER BY m.created_at DESC
        LIMIT ?
      `, [...conversationIds, `%${searchQuery}%`, limit]);

      return messages.map(msg => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        senderUsername: msg.sender_username,
        senderPublicKey: msg.sender_public_key,
        encryptedContent: msg.encrypted_content,
        iv: msg.iv,
        messageType: msg.message_type,
        createdAt: msg.created_at
      }));

    } catch (error) {
      console.error('❌ Error searching messages:', error);
      throw new Error('Failed to search messages');
    }
  }

  /**
   * Mark conversation as read
   */
  static async markConversationAsRead(conversationId, userId) {
    try {
      // Verify user has access to this conversation
      const hasAccess = await ConversationService.verifyUserInConversation(conversationId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to this conversation');
      }

      // For now, this is a no-op since we don't have read receipts implemented
      // In the future, we can add a read_receipts table
      console.log(`✅ Conversation ${conversationId} marked as read by user ${userId}`);
      return true;

    } catch (error) {
      console.error('❌ Error marking conversation as read:', error);
      throw error;
    }
  }
}

module.exports = MessageService;
