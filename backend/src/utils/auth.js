const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthUtils {
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  static generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  static generateKeyPair() {
    // For now, we'll let the client generate the key pair
    // This is a placeholder for future server-side key generation if needed
    return {
      publicKey: null,
      privateKey: null
    };
  }
}

module.exports = AuthUtils;
