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
    console.log('Starting database migration for Step 3...');

    // Drop existing tables if they exist (for clean migration)
    console.log('Dropping existing tables if they exist...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('DROP TABLE IF EXISTS conversation_keys');
    await connection.execute('DROP TABLE IF EXISTS user_sessions');
    await connection.execute('DROP TABLE IF EXISTS messages');
    await connection.execute('DROP TABLE IF EXISTS conversations');
    await connection.execute('DROP TABLE IF EXISTS users');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // Create users table - Step 3 updates
    await connection.execute(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        master_key_salt VARCHAR(128) NOT NULL,
        public_key VARCHAR(128) NOT NULL,
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
        conversation_id VARCHAR(64) UNIQUE NOT NULL,
        user1_id INT NOT NULL,
        user2_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_users (user1_id, user2_id),
        INDEX idx_user1 (user1_id),
        INDEX idx_user2 (user2_id),
        CONSTRAINT unique_conversation UNIQUE (user1_id, user2_id)
      )
    `);

    // Create conversation_keys table - Step 3 addition
    await connection.execute(`
      CREATE TABLE conversation_keys (
        id INT PRIMARY KEY AUTO_INCREMENT,
        key_id VARCHAR(32) NOT NULL,
        conversation_id VARCHAR(64) NOT NULL,
        user_id INT NOT NULL,
        encrypted_aes_key TEXT NOT NULL,
        iv VARCHAR(32) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_conversation_user (conversation_id, user_id),
        INDEX idx_key_id (key_id),
        INDEX idx_user_id (user_id),
        UNIQUE KEY unique_user_conversation (user_id, conversation_id)
      )
    `);

    // Create messages table - Step 3 updates
    await connection.execute(`
      CREATE TABLE messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id VARCHAR(64) NOT NULL,
        sender_id INT NOT NULL,
        encrypted_content TEXT NOT NULL,
        iv VARCHAR(32) NOT NULL,
        message_type ENUM('text') DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

    console.log('✅ Step 3 database migration completed successfully!');
    console.log('Created tables: users (updated), conversations (updated), conversation_keys (new), messages (updated), user_sessions');
    console.log('Key changes:');
    console.log('  - Added master_key_salt to users table');
    console.log('  - Added conversation_keys table for encrypted key storage');
    console.log('  - Updated conversations table with conversation_id field');
    console.log('  - Updated messages table to use conversation_id directly');

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
