const db = require('../database/connection');
const AuthUtils = require('../utils/auth');

class UserService {
  /**
   * Create new user with Step 3 encryption support
   */
  static async createUser(userData) {
    const { username, email, password, publicKey, masterKeySalt } = userData;

    // Validate required encryption fields
    if (!publicKey) {
      throw new Error('Public key is required');
    }
    if (!masterKeySalt) {
      throw new Error('Master key salt is required');
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser.length > 0) {
      throw new Error('Username or email already exists');
    }

    // Hash password
    const passwordHash = await AuthUtils.hashPassword(password);

    // Insert new user with encryption fields
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash, master_key_salt, public_key) VALUES (?, ?, ?, ?, ?)',
      [username, email, passwordHash, masterKeySalt, publicKey]
    );

    console.log(`✅ User created with encryption support: ${username}`);

    return {
      id: result.insertId,
      username,
      email,
      publicKey,
      masterKeySalt
    };
  }

  /**
   * Authenticate user and return encryption data
   */
  static async authenticateUser(username, password) {
    // Get user by username with encryption fields
    const users = await db.query(
      'SELECT id, username, email, password_hash, master_key_salt, public_key FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await AuthUtils.verifyPassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      publicKey: user.public_key,
      masterKeySalt: user.master_key_salt
    };
  }

  /**
   * Get user by ID with encryption data
   */
  static async getUserById(userId) {
    const users = await db.query(
      'SELECT id, username, email, master_key_salt, public_key, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    return {
      id: users[0].id,
      username: users[0].username,
      email: users[0].email,
      publicKey: users[0].public_key,
      masterKeySalt: users[0].master_key_salt,
      createdAt: users[0].created_at
    };
  }

  /**
   * Get user by username with public encryption data only
   */
  static async getUserByUsername(username) {
    const users = await db.query(
      'SELECT id, username, email, public_key, created_at FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    return {
      id: users[0].id,
      username: users[0].username,
      email: users[0].email,
      publicKey: users[0].public_key,
      createdAt: users[0].created_at
    };
  }

  /**
   * Search users (public data only)
   */
  static async searchUsers(query, currentUserId, limit = 10) {
    const users = await db.query(
      `SELECT id, username, email, public_key FROM users 
       WHERE (username LIKE ? OR email LIKE ?) 
       AND id != ? 
       LIMIT ?`,
      [`%${query}%`, `%${query}%`, currentUserId, limit]
    );

    return users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      publicKey: user.public_key
    }));
  }

  /**
   * Update user (limited fields for security)
   */
  static async updateUser(userId, updateData) {
    const allowedFields = ['email'];
    const updates = [];
    const values = [];

    Object.keys(updateData).forEach(field => {
      if (allowedFields.includes(field) && updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId);

    await db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return await this.getUserById(userId);
  }

  /**
   * Get user's master key salt (for key derivation)
   */
  static async getUserMasterKeySalt(userId) {
    const users = await db.query(
      'SELECT master_key_salt FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    return users[0].master_key_salt;
  }

  /**
   * Get multiple users' public keys (for conversation setup)
   */
  static async getUsersPublicKeys(userIds) {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    const placeholders = userIds.map(() => '?').join(',');
    const users = await db.query(
      `SELECT id, username, public_key FROM users WHERE id IN (${placeholders})`,
      userIds
    );

    return users.map(user => ({
      id: user.id,
      username: user.username,
      publicKey: user.public_key
    }));
  }
}

module.exports = UserService;
