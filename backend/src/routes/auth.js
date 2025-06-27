const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const AuthUtils = require('../utils/auth');
const { userValidation, validateRequest } = require('../utils/validation');
const { authRateLimit, apiRateLimit } = require('../middleware/rateLimiting');
const { authenticateToken } = require('../middleware/auth');

// Register new user
router.post('/register', 
  authRateLimit,
  validateRequest(userValidation.register),
  async (req, res) => {
    try {
      const { username, email, password, publicKey } = req.body;

      const user = await UserService.createUser({
        username,
        email,
        password,
        publicKey
      });

      const token = AuthUtils.generateToken({ userId: user.id });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            publicKey: user.publicKey
          },
          token
        }
      });
    } catch (error) {
      console.error('Registration error:', error);

      if (error.message === 'Username or email already exists') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }
);

// Login user
router.post('/login',
  authRateLimit,
  validateRequest(userValidation.login),
  async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await UserService.authenticateUser(username, password);
      const token = AuthUtils.generateToken({ userId: user.id });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            publicKey: user.publicKey
          },
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);

      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }
);

// Get current user profile
router.get('/profile',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const user = await UserService.getUserById(req.user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            publicKey: user.publicKey,
            createdAt: user.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }
  }
);

// Search users
router.get('/search',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { q: query, limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      const users = await UserService.searchUsers(
        query.trim(),
        req.user.id,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: {
          users
        }
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed'
      });
    }
  }
);

// Get user by username
router.get('/username/:username',
  authenticateToken,
  apiRateLimit,
  async (req, res) => {
    try {
      const { username } = req.params;

      const user = await UserService.getUserByUsername(username);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            publicKey: user.publicKey
          }
        }
      });
    } catch (error) {
      console.error('Get user by username error:', error);

      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get user'
      });
    }
  }
);

// Verify token (useful for frontend to check if token is still valid)
router.get('/verify-token',
  authenticateToken,
  (req, res) => {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email
        }
      }
    });
  }
);

module.exports = router;
