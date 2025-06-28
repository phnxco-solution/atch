const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class ConversationService {
  static async findOrCreateConversation(user1Id, user2Id) {
    // First, check if the second user exists
    const userCheck = await db.query(
      'SELECT id FROM users WHERE id = ?',
      [user2Id]
    );

    if (userCheck.length === 0) {
      throw new Error('Other user not found');
    }

    // Ensure consistent ordering (smaller ID first)
    const [smallerId, largerId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    // Check if conversation already exists
    let conversations = await db.query(
      'SELECT id, conversation_id FROM conversations WHERE user1_id = ? AND user2_id = ?',
      [smallerId, largerId]
    );

    if (conversations.length > 0) {
      return conversations[0].id;
    }

    // Generate a unique conversation ID
    const conversationId = uuidv4();

    // Create new conversation with consistent ordering
    const result = await db.query(
      'INSERT INTO conversations (conversation_id, user1_id, user2_id) VALUES (?, ?, ?)',
      [conversationId, smallerId, largerId]
    );

    return result.insertId;
  }

  static async getUserConversations(userId) {
    const conversations = await db.query(`
      SELECT 
        c.id,
        c.created_at,
        c.updated_at,
        CASE 
          WHEN c.user1_id = ? THEN u2.id
          ELSE u1.id
        END as other_user_id,
        CASE 
          WHEN c.user1_id = ? THEN u2.username
          ELSE u1.username
        END as other_username,
        CASE 
          WHEN c.user1_id = ? THEN u2.email
          ELSE u1.email
        END as other_email,
        CASE 
          WHEN c.user1_id = ? THEN u2.public_key
          ELSE u1.public_key
        END as other_public_key,
        m.encrypted_content as last_message_content,
        m.iv as last_message_iv,
        m.created_at as last_message_time,
        m.sender_id as last_message_sender_id
      FROM conversations c
      JOIN users u1 ON c.user1_id = u1.id
      JOIN users u2 ON c.user2_id = u2.id
      LEFT JOIN (
        SELECT 
          conversation_id,
          encrypted_content,
          iv,
          created_at,
          sender_id,
          ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) as rn
        FROM messages
      ) m ON c.id = m.conversation_id AND m.rn = 1
      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY COALESCE(m.created_at, c.created_at) DESC
    `, [userId, userId, userId, userId, userId, userId]);

    return conversations.map(conv => ({
      id: conv.id,
      otherUser: {
        id: conv.other_user_id,
        username: conv.other_username,
        email: conv.other_email,
        publicKey: conv.other_public_key
      },
      lastMessage: conv.last_message_content ? {
        content: conv.last_message_content,
        iv: conv.last_message_iv,
        senderId: conv.last_message_sender_id,
        timestamp: conv.last_message_time
      } : null,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    }));
  }

  static async getConversationDetails(conversationId, userId) {
    // Verify user is participant in conversation
    const conversations = await db.query(
      'SELECT id, user1_id, user2_id FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
      [conversationId, userId, userId]
    );

    if (conversations.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    const conversation = conversations[0];
    const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

    // Get other user details
    const otherUsers = await db.query(
      'SELECT id, username, email, public_key FROM users WHERE id = ?',
      [otherUserId]
    );

    if (otherUsers.length === 0) {
      throw new Error('Other user not found');
    }

    return {
      id: conversation.id,
      otherUser: {
        id: otherUsers[0].id,
        username: otherUsers[0].username,
        email: otherUsers[0].email,
        publicKey: otherUsers[0].public_key
      }
    };
  }

  static async verifyUserInConversation(conversationId, userId) {
    // Check if conversationId is a UUID (string) or integer ID
    let query;
    if (typeof conversationId === 'string' && conversationId.includes('-')) {
      // It's a UUID, query by conversation_id field
      query = 'SELECT id FROM conversations WHERE conversation_id = ? AND (user1_id = ? OR user2_id = ?)';
    } else {
      // It's an integer ID, query by id field
      query = 'SELECT id FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)';
    }
    
    const conversations = await db.query(query, [conversationId, userId, userId]);
    return conversations.length > 0;
  }

  static async getConversationParticipants(conversationId) {
    const conversations = await db.query(
      'SELECT user1_id, user2_id FROM conversations WHERE id = ?',
      [conversationId]
    );

    if (conversations.length === 0) {
      return [];
    }

    return [conversations[0].user1_id, conversations[0].user2_id];
  }
}

module.exports = ConversationService;
