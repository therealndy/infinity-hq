const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Railway-compatible connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => console.error('❌ DB error:', err));

async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('📊 Initializing database...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Database ready');
    return true;
  } catch (error) {
    console.error('❌ DB init failed:', error.message);
    if (process.env.REQUIRE_DATABASE !== 'true') {
      console.warn('⚠️  In-memory fallback mode');
      return false;
    }
    throw error;
  } finally {
    client.release();
  }
}

async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('❌ Query error:', error.message);
    throw error;
  }
}

const userOps = {
  async create({ email, username, passwordHash, displayName = null }) {
    const result = await query(
      'INSERT INTO users (email, username, password_hash, display_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, username, passwordHash, displayName]
    );
    return result.rows[0];
  },
  async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },
  async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },
  async updateLastLogin(userId) {
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
  }
};

const tokenOps = {
  async create({ userId, token, expiresAt }) {
    const result = await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [userId, token, expiresAt]
    );
    return result.rows[0];
  },
  async findByToken(token) {
    const result = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false AND expires_at > NOW()',
      [token]
    );
    return result.rows[0];
  },
  async revoke(token) {
    await query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [token]);
  }
};

const roomOps = {
  async create({ name, description, encryptionKey, createdBy }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const roomResult = await client.query(
        'INSERT INTO rooms (name, description, encryption_key, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, description, encryptionKey, createdBy]
      );
      const room = roomResult.rows[0];
      await client.query(
        'INSERT INTO room_members (room_id, user_id, is_admin) VALUES ($1, $2, true)',
        [room.id, createdBy]
      );
      await client.query('COMMIT');
      return room;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  async getUserRooms(userId) {
    const result = await query(
      'SELECT r.* FROM rooms r JOIN room_members rm ON r.id = rm.room_id WHERE rm.user_id = $1',
      [userId]
    );
    return result.rows;
  }
};

const messageOps = {
  async create({ roomId, userId, content, isEncrypted, encryptionIv }) {
    const result = await query(
      'INSERT INTO messages (room_id, user_id, content, is_encrypted, encryption_iv) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [roomId, userId, content, isEncrypted, encryptionIv]
    );
    return result.rows[0];
  },
  async getRoomMessages(roomId, limit = 100) {
    const result = await query(
      'SELECT m.*, u.username FROM messages m JOIN users u ON m.user_id = u.id WHERE m.room_id = $1 ORDER BY m.created_at DESC LIMIT $2',
      [roomId, limit]
    );
    return result.rows.reverse();
  }
};

module.exports = {
  pool,
  initDatabase,
  query,
  userOps,
  tokenOps,
  roomOps,
  messageOps
};
