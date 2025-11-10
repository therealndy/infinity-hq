// In-memory storage for demo/testing (when no database available)
const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

const users = new Map();
const tokens = new Map();

const inMemoryOps = {
  userOps: {
    async create({ email, username, passwordHash, displayName }) {
      const id = uuidv4();
      const user = {
        id,
        email,
        username,
        password_hash: passwordHash,
        display_name: displayName,
        created_at: new Date(),
        last_login: null
      };
      users.set(email, user);
      users.set(id, user);
      return user;
    },
    
    async findByEmail(email) {
      return users.get(email);
    },
    
    async findById(id) {
      return users.get(id);
    },
    
    async updateLastLogin(userId) {
      const user = users.get(userId);
      if (user) {
        user.last_login = new Date();
      }
    }
  },
  
  tokenOps: {
    async create({ userId, token, expiresAt }) {
      const tokenData = { user_id: userId, token, expires_at: expiresAt, revoked: false };
      tokens.set(token, tokenData);
      return tokenData;
    },
    
    async findByToken(token) {
      const tokenData = tokens.get(token);
      if (!tokenData || tokenData.revoked || new Date() > tokenData.expires_at) {
        return null;
      }
      return tokenData;
    },
    
    async revoke(token) {
      const tokenData = tokens.get(token);
      if (tokenData) {
        tokenData.revoked = true;
      }
    }
  },
  
  roomOps: {
    async create() { return { id: uuidv4() }; },
    async getUserRooms() { return []; }
  },
  
  messageOps: {
    async create() { return { id: uuidv4() }; },
    async getRoomMessages() { return []; }
  }
};

module.exports = inMemoryOps;
