const AuthUtils = require('../utils/auth');
const db = require('../database/connection');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = AuthUtils.verifyToken(token);
    
    // Verify user still exists in database
    const user = await db.query(
      'SELECT id, username, email, public_key FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (user.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add user info to request object
    req.user = {
      id: user[0].id,
      username: user[0].username,
      email: user[0].email,
      publicKey: user[0].public_key
    };

    next();
  } catch (error) {
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = AuthUtils.verifyToken(token);
    
    // Verify user still exists in database
    const user = await db.query(
      'SELECT id, username, email, public_key FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (user.length === 0) {
      return next(new Error('User not found'));
    }

    // Add user info to socket object
    socket.user = {
      id: user[0].id,
      username: user[0].username,
      email: user[0].email,
      publicKey: user[0].public_key
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

module.exports = {
  authenticateToken,
  authenticateSocket
};
