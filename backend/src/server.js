const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');

// Import middleware
const { authenticateSocket } = require('./middleware/auth');
const { apiRateLimit } = require('./middleware/rateLimiting');

// Import socket handler
const SocketHandler = require('./socket/socketHandler');

// Import database connection
const db = require('./database/connection');

class ChatServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    
    this.port = process.env.PORT || 3001;
    this.socketHandler = new SocketHandler(this.io);
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Global rate limiting
    this.app.use(apiRateLimit);

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/conversations', conversationRoutes);
    this.app.use('/api/messages', messageRoutes);

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        success: true,
        message: 'Encrypted Chat API',
        version: '1.0.0',
        endpoints: {
          auth: {
            'POST /api/auth/register': 'Register new user',
            'POST /api/auth/login': 'Login user',
            'GET /api/auth/profile': 'Get user profile',
            'GET /api/auth/search': 'Search users',
            'GET /api/auth/username/:username': 'Get user by username',
            'GET /api/auth/verify-token': 'Verify JWT token'
          },
          conversations: {
            'GET /api/conversations': 'Get user conversations',
            'POST /api/conversations': 'Create/find conversation',
            'GET /api/conversations/:id': 'Get conversation details',
            'GET /api/conversations/:id/messages': 'Get conversation messages',
            'POST /api/conversations/:id/read': 'Mark conversation as read'
          },
          messages: {
            'POST /api/messages': 'Send new message',
            'GET /api/messages/:id': 'Get specific message',
            'DELETE /api/messages/:id': 'Delete message',
            'GET /api/messages/search/:query': 'Search messages',
            'GET /api/messages/unread/count': 'Get unread count'
          }
        },
        websocket: {
          events: {
            client_to_server: [
              'join_conversation',
              'leave_conversation',
              'send_message',
              'typing_start',
              'typing_stop',
              'user_status'
            ],
            server_to_client: [
              'conversation_joined',
              'conversation_left',
              'new_message',
              'message_sent',
              'message_error',
              'user_typing',
              'user_status_changed',
              'error'
            ]
          }
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found'
      });
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    });
  }

  setupSocketIO() {
    // Socket authentication middleware
    this.io.use(authenticateSocket);

    // Initialize socket handlers
    this.socketHandler.initialize();

    console.log('🔌 Socket.IO server configured');
  }

  async testDatabaseConnection() {
    try {
      await db.query('SELECT 1');
      console.log('📊 Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  async start() {
    try {
      // Test database connection
      const dbConnected = await this.testDatabaseConnection();
      if (!dbConnected) {
        console.error('❌ Cannot start server without database connection');
        process.exit(1);
      }

      // Setup middleware and routes
      this.setupMiddleware();
      this.setupRoutes();
      this.setupSocketIO();

      // Start server
      this.server.listen(this.port, () => {
        console.log('🚀 Encrypted Chat Server Started');
        console.log(`📡 Server running on port ${this.port}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
        console.log(`🔗 Health check: http://localhost:${this.port}/health`);
        console.log(`📚 API docs: http://localhost:${this.port}/api`);
        console.log(`🔌 WebSocket endpoint: ws://localhost:${this.port}`);
        console.log('✅ Ready to accept connections');
      });

      // Graceful shutdown handlers
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));
      process.on('SIGINT', () => this.shutdown('SIGINT'));

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(signal) {
    console.log(`🛑 Received ${signal}, starting graceful shutdown...`);
    
    try {
      // Close server
      this.server.close(async () => {
        console.log('📡 HTTP server closed');
        
        // Close database connections
        await db.close();
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const chatServer = new ChatServer();
chatServer.start();

module.exports = ChatServer;
