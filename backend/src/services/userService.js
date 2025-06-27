const db = require('../database/connection');
const AuthUtils = require('../utils/auth');

class UserService {
  static async createUser(userData) {
    const { username, email, password, publicKey } = userData;

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

    // Insert new user
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash, public_key) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, publicKey]
    );

    return {
      id: result.insertId,
      username,
      email,
      publicKey
    };
  }

  static async authenticateUser(username, password) {
    // Get user by username
    const users = await db.query(
      'SELECT id, username, email, password_hash, public_key FROM users WHERE username = ?',
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
      publicKey: user.public_key
    };
  }

  static async getUserById(userId) {
    const users = await db.query(
      'SELECT id, username, email, public_key, created_at FROM users WHERE id = ?',
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
      createdAt: users[0].created_at
    };
  }

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

  static async searchUsers(query, currentUserId, limit = 10) {
    const users = await db.query(
      `SELECT id, username, email FROM users 
       WHERE (username LIKE ? OR email LIKE ?) 
       AND id != ? 
       LIMIT ?`,
      [`%${query}%`, `%${query}%`, currentUserId, limit]
    );

    return users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email
    }));
  }

  static async updateUser(userId, updateData) {
    const allowedFields = ['email', 'public_key'];
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
}

module.exports = UserService;
