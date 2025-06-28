/**
 * Conversation Key Service
 * Manages encrypted conversation keys for Step 3 backend integration
 */

const db = require('../database/connection');

class ConversationKeyService {
  
  /**
   * Store encrypted conversation key for a user
   */
  static async storeConversationKey(conversationId, userId, keyId, encryptedAesKey, iv) {
    try {
      // Check if key already exists for this user/conversation
      const existing = await db.query(
        'SELECT id FROM conversation_keys WHERE user_id = ? AND conversation_id = ?',
        [userId, conversationId]
      );

      if (existing.length > 0) {
        // Update existing key
        await db.query(
          'UPDATE conversation_keys SET key_id = ?, encrypted_aes_key = ?, iv = ? WHERE user_id = ? AND conversation_id = ?',
          [keyId, encryptedAesKey, iv, userId, conversationId]
        );
      } else {
        // Insert new key
        await db.query(
          'INSERT INTO conversation_keys (key_id, conversation_id, user_id, encrypted_aes_key, iv) VALUES (?, ?, ?, ?, ?)',
          [keyId, conversationId, userId, encryptedAesKey, iv]
        );
      }

      console.log(`✅ Conversation key stored for user ${userId}, conversation ${conversationId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error storing conversation key:', error);
      throw new Error('Failed to store conversation key');
    }
  }

  /**
   * Get encrypted conversation key for a user
   */
  static async getConversationKey(conversationId, userId) {
    try {
      const keys = await db.query(
        'SELECT key_id, encrypted_aes_key, iv, created_at FROM conversation_keys WHERE user_id = ? AND conversation_id = ?',
        [userId, conversationId]
      );

      if (keys.length === 0) {
        throw new Error('Conversation key not found for user');
      }

      const key = keys[0];
      return {
        keyId: key.key_id,
        encryptedAesKey: key.encrypted_aes_key,
        iv: key.iv,
        createdAt: key.created_at
      };
      
    } catch (error) {
      console.error('❌ Error getting conversation key:', error);
      throw error;
    }
  }

  /**
   * Get all users who have access to a conversation
   */
  static async getConversationParticipants(conversationId) {
    try {
      const participants = await db.query(`
        SELECT DISTINCT 
          ck.user_id,
          u.username,
          u.public_key
        FROM conversation_keys ck
        JOIN users u ON ck.user_id = u.id
        WHERE ck.conversation_id = ?
      `, [conversationId]);

      return participants.map(p => ({
        userId: p.user_id,
        username: p.username,
        publicKey: p.public_key
      }));
      
    } catch (error) {
      console.error('❌ Error getting conversation participants:', error);
      throw new Error('Failed to get conversation participants');
    }
  }

  /**
   * Check if user has access to conversation
   */
  static async hasConversationAccess(conversationId, userId) {
    try {
      const keys = await db.query(
        'SELECT id FROM conversation_keys WHERE user_id = ? AND conversation_id = ?',
        [userId, conversationId]
      );

      return keys.length > 0;
      
    } catch (error) {
      console.error('❌ Error checking conversation access:', error);
      return false;
    }
  }

  /**
   * Get all conversations for a user
   */
  static async getUserConversations(userId, limit = 50) {
    try {
      const conversations = await db.query(`
        SELECT DISTINCT
          ck.conversation_id,
          ck.created_at,
          (
            SELECT COUNT(*) 
            FROM messages m 
            WHERE m.conversation_id = ck.conversation_id
          ) as message_count,
          (
            SELECT m.created_at 
            FROM messages m 
            WHERE m.conversation_id = ck.conversation_id 
            ORDER BY m.created_at DESC 
            LIMIT 1
          ) as last_message_at
        FROM conversation_keys ck
        WHERE ck.user_id = ?
        ORDER BY last_message_at DESC, ck.created_at DESC
        LIMIT ?
      `, [userId, limit]);

      return conversations.map(conv => ({
        conversationId: conv.conversation_id,
        messageCount: conv.message_count,
        lastMessageAt: conv.last_message_at,
        createdAt: conv.created_at
      }));
      
    } catch (error) {
      console.error('❌ Error getting user conversations:', error);
      throw new Error('Failed to get user conversations');
    }
  }

  /**
   * Delete conversation key for user (leave conversation)
   */
  static async deleteConversationKey(conversationId, userId) {
    try {
      const result = await db.query(
        'DELETE FROM conversation_keys WHERE user_id = ? AND conversation_id = ?',
        [userId, conversationId]
      );

      return result.affectedRows > 0;
      
    } catch (error) {
      console.error('❌ Error deleting conversation key:', error);
      throw new Error('Failed to delete conversation key');
    }
  }

  /**
   * Check if conversation exists (has any participants)
   */
  static async conversationExists(conversationId) {
    try {
      const participants = await db.query(
        'SELECT COUNT(*) as count FROM conversation_keys WHERE conversation_id = ?',
        [conversationId]
      );

      return participants[0].count > 0;
      
    } catch (error) {
      console.error('❌ Error checking conversation existence:', error);
      return false;
    }
  }
}

module.exports = ConversationKeyService;
