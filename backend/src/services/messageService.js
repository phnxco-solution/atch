const db = require('../database/connection');
const ConversationService = require('./conversationService');

class MessageService {
  static async sendMessage(senderId, recipientId, encryptedContent, iv, messageType = 'text') {
    // Find or create conversation
    const conversationId = await ConversationService.findOrCreateConversation(senderId, recipientId);

    // Insert message
    const result = await db.query(
      'INSERT INTO messages (conversation_id, sender_id, encrypted_content, iv, message_type) VALUES (?, ?, ?, ?, ?)',
      [conversationId, senderId, encryptedContent, iv, messageType]
    );

    // Update conversation timestamp
    await db.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );

    // Return the created message with conversation info
    return {
      id: result.insertId,
      conversationId,
      senderId,
      recipientId,
      encryptedContent,
      iv,
      messageType,
      createdAt: new Date()
    };
  }

  static async getConversationMessages(conversationId, userId, limit = 50, offset = 0) {
    // Verify user has access to this conversation
    const hasAccess = await ConversationService.verifyUserInConversation(conversationId, userId);
    
    if (!hasAccess) {
      throw new Error('Access denied to this conversation');
    }

    // Get messages
    const messages = await db.query(`
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.encrypted_content,
        m.iv,
        m.message_type,
        m.created_at,
        u.username as sender_username
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [conversationId, limit, offset]);

    return messages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      senderUsername: msg.sender_username,
      encryptedContent: msg.encrypted_content,
      iv: msg.iv,
      messageType: msg.message_type,
      createdAt: msg.created_at
    })).reverse(); // Reverse to show oldest first
  }

  static async getMessageById(messageId, userId) {
    const messages = await db.query(`
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.encrypted_content,
        m.iv,
        m.message_type,
        m.created_at,
        u.username as sender_username
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = ? AND (c.user1_id = ? OR c.user2_id = ?)
    `, [messageId, userId, userId]);

    if (messages.length === 0) {
      throw new Error('Message not found or access denied');
    }

    const msg = messages[0];
    return {
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      senderUsername: msg.sender_username,
      encryptedContent: msg.encrypted_content,
      iv: msg.iv,
      messageType: msg.message_type,
      createdAt: msg.created_at
    };
  }

  static async deleteMessage(messageId, userId) {
    // Verify user owns the message
    const messages = await db.query(
      'SELECT id FROM messages WHERE id = ? AND sender_id = ?',
      [messageId, userId]
    );

    if (messages.length === 0) {
      throw new Error('Message not found or you do not have permission to delete it');
    }

    await db.query('DELETE FROM messages WHERE id = ?', [messageId]);
    
    return true;
  }

  static async getUnreadMessageCount(userId) {
    // For now, we'll return 0 since we don't have read receipts
    // This can be enhanced later when we add read status tracking
    return 0;
  }

  static async markConversationAsRead(conversationId, userId) {
    // Verify user has access to conversation
    const hasAccess = await ConversationService.verifyUserInConversation(conversationId, userId);
    
    if (!hasAccess) {
      throw new Error('Access denied to this conversation');
    }

    // For now, this is a placeholder since we don't have read receipts
    // This can be enhanced later when we add read status tracking
    return true;
  }

  static async searchMessages(userId, searchQuery, limit = 20) {
    const messages = await db.query(`
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.encrypted_content,
        m.iv,
        m.message_type,
        m.created_at,
        u.username as sender_username
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      JOIN conversations c ON m.conversation_id = c.id
      WHERE (c.user1_id = ? OR c.user2_id = ?)
      AND m.encrypted_content LIKE ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `, [userId, userId, `%${searchQuery}%`, limit]);

    return messages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      senderUsername: msg.sender_username,
      encryptedContent: msg.encrypted_content,
      iv: msg.iv,
      messageType: msg.message_type,
      createdAt: msg.created_at
    }));
  }
}

module.exports = MessageService;
