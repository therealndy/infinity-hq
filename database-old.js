const { Pool } = require('pg');

// Database connection (in production: use Cloud SQL)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'infinity_hq',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Initialize database schema
async function initDatabase() {
  const client = await pool.connect();
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        webauthn_credential JSONB,
        pq_public_key TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Rooms table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_id UUID PRIMARY KEY,
        room_name TEXT NOT NULL,
        created_by UUID REFERENCES users(user_id),
        key_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Room members
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_members (
        room_id UUID REFERENCES rooms(room_id),
        user_id UUID REFERENCES users(user_id),
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (room_id, user_id)
      )
    `);
    
    // Messages (encrypted)
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        message_id UUID PRIMARY KEY,
        room_id UUID REFERENCES rooms(room_id),
        user_id UUID REFERENCES users(user_id),
        encrypted_content TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(user_id),
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    console.log('✓ Database schema initialized');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  } finally {
    client.release();
  }
}

// Database query wrapper
async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('Database query error:', err.message);
    throw err;
  }
}

module.exports = {
  pool,
  query,
  initDatabase
};
