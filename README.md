# EncryptedChat - Secure Messaging Application

A real-time, end-to-end encrypted messaging application built with React, Node.js, Socket.IO, and MariaDB.

## Features

- 🔒 **End-to-end encryption** - Messages are encrypted on the client-side before sending
- ⚡ **Real-time messaging** - Instant message delivery using Socket.IO
- 👥 **Direct messaging** - One-on-one conversations with other users
- 🔍 **User search** - Find and start conversations with other users
- 📱 **Responsive design** - Works on desktop and mobile browsers
- 🔐 **Secure authentication** - JWT-based authentication with bcrypt password hashing
- ⌨️ **Typing indicators** - See when someone is typing
- 📬 **Message persistence** - Messages are stored encrypted in the database

## Tech Stack

### Backend
- **Node.js** with Express.js
- **Socket.IO** for real-time communication
- **MariaDB** for data storage
- **Redis** for session management (optional)
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CryptoJS** for encryption utilities

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Hook Form** for form handling
- **Socket.IO Client** for real-time communication
- **CryptoJS** for client-side encryption

## Project Structure

```
encrypted-chat/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── database/       # Database connection and migrations
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── socket/         # Socket.IO handlers
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Main server file
│   ├── package.json
│   └── .env
├── frontend-web/           # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Zustand stores
│   │   ├── services/       # API and Socket services
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── package.json
│   └── .env
├── shared/                 # Shared types and utilities
│   └── types.ts
└── README.md
```

## Security Features

### End-to-End Encryption
- **Key Generation**: Each user has a unique public/private key pair generated client-side
- **Message Encryption**: Messages are encrypted using AES-256-CBC with shared secrets
- **Key Exchange**: Uses simplified ECDH-like approach for secure key exchange
- **IV Generation**: Each message uses a unique initialization vector
- **Server Blindness**: Server never sees unencrypted message content

### Authentication & Authorization
- **Password Security**: Passwords hashed with bcrypt (12 rounds)
- **JWT Tokens**: Secure session management with JWTs
- **Rate Limiting**: API endpoints protected against abuse
- **Input Validation**: All inputs validated and sanitized

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- MariaDB/MySQL database
- Redis (optional, for production scaling)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd encrypted-chat
```

### 2. Database Setup
Create a new MariaDB database:
```sql
CREATE DATABASE encrypted_chat;
```

### 3. Backend Setup
```bash
cd backend
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run db:migrate

# Start the backend server
npm run dev
```

The backend will run on `http://localhost:3001`

### 4. Frontend Setup
```bash
cd frontend-web
npm install

# Copy environment file
cp .env.example .env
# Edit .env if needed (default values should work for development)

# Start the frontend development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## Environment Variables

### Backend (.env)
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=encrypted_chat
DB_USER=root
DB_PASSWORD=your_password

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001

# App Configuration
VITE_APP_NAME=EncryptedChat
VITE_APP_VERSION=1.0.0
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/search` - Search users
- `GET /api/auth/verify-token` - Verify JWT token

### Conversations
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create/find conversation
- `GET /api/conversations/:id` - Get conversation details
- `GET /api/conversations/:id/messages` - Get conversation messages

### Messages
- `POST /api/messages` - Send new message
- `GET /api/messages/:id` - Get specific message
- `DELETE /api/messages/:id` - Delete message
- `GET /api/messages/search/:query` - Search messages

## WebSocket Events

### Client to Server
- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room
- `send_message` - Send a new message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

### Server to Client
- `new_message` - Receive new message
- `message_sent` - Message sent confirmation
- `user_typing` - Someone is typing
- `conversation_joined` - Successfully joined conversation
- `error` - Error occurred

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend-web
npm test
```

### Building for Production
```bash
# Build frontend
cd frontend-web
npm run build

# Backend is ready for production as-is
cd backend
npm start
```

### Code Quality
```bash
# Lint frontend code
cd frontend-web
npm run lint

# Type check
npm run type-check
```

## Deployment

### Backend Deployment
1. Set production environment variables
2. Run database migrations: `npm run db:migrate`
3. Start with: `npm start`

### Frontend Deployment
1. Build the frontend: `npm run build`
2. Serve the `dist` folder with any static file server
3. Configure your web server to proxy API calls to the backend

### Docker Deployment
Docker configurations can be added for containerized deployment.

## Security Considerations

1. **Change default secrets** in production
2. **Use HTTPS** for all communications
3. **Implement rate limiting** in production
4. **Regular security updates** for dependencies
5. **Database backups** and encryption at rest
6. **Monitor for suspicious activity**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.
