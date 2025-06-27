const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Starting database migration...');

    // Drop existing tables if they exist (for clean migration)
    console.log('Dropping existing tables if they exist...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('DROP TABLE IF EXISTS user_sessions');
    await connection.execute('DROP TABLE IF EXISTS messages');
    await connection.execute('DROP TABLE IF EXISTS conversations');
    await connection.execute('DROP TABLE IF EXISTS users');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // Create users table
    await connection.execute(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        public_key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email)
      )
    `);

    // Create conversations table (for direct messages)
    await connection.execute(`
      CREATE TABLE conversations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user1_id INT NOT NULL,
        user2_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_users (user1_id, user2_id),
        INDEX idx_user1 (user1_id),
        INDEX idx_user2 (user2_id),
        CONSTRAINT unique_conversation UNIQUE (user1_id, user2_id)
      )
    `);

    // Create messages table
    await connection.execute(`
      CREATE TABLE messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        encrypted_content TEXT NOT NULL,
        iv VARCHAR(32) NOT NULL,
        message_type ENUM('text') DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_conversation_time (conversation_id, created_at),
        INDEX idx_sender (sender_id)
      )
    `);

    // Create user_sessions table for managing active sessions
    await connection.execute(`
      CREATE TABLE user_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        socket_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_socket_id (socket_id)
      )
    `);

    console.log('✅ Database migration completed successfully!');
    console.log('Created tables: users, conversations, messages, user_sessions');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = migrate;
