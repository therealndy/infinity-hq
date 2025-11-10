const crypto = require('crypto');

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Rooms storage (in production: use Postgres with encrypted columns)
const rooms = new Map();

// Create encrypted room
function createRoom(roomName, createdBy, encryptionKey = null) {
  const roomId = crypto.randomUUID();
  
  // If no key provided, generate one (client should generate and share via secure channel)
  const key = encryptionKey || crypto.randomBytes(KEY_LENGTH);
  
  rooms.set(roomId, {
    roomId,
    roomName,
    createdBy,
    createdAt: Date.now(),
    members: [createdBy],
    // Store key hash for verification (in production: use HSM)
    keyHash: crypto.createHash('sha256').update(key).digest('hex'),
    messages: []
  });
  
  return { roomId, key: key.toString('base64') };
}

// Encrypt message
function encryptMessage(message, key) {
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'base64');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(message, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

// Decrypt message
function decryptMessage(encryptedData, key) {
  try {
    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}

// Add member to room
function addRoomMember(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  if (!room.members.includes(userId)) {
    room.members.push(userId);
  }
  return true;
}

// Store encrypted message in room
function storeRoomMessage(roomId, userId, encryptedMessage) {
  const room = rooms.get(roomId);
  if (!room) return false;
  if (!room.members.includes(userId)) return false;
  
  room.messages.push({
    messageId: crypto.randomUUID(),
    userId,
    encrypted: encryptedMessage.encrypted,
    iv: encryptedMessage.iv,
    authTag: encryptedMessage.authTag,
    timestamp: Date.now()
  });
  
  return true;
}

// Get room messages (encrypted)
function getRoomMessages(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (!room.members.includes(userId)) return null;
  
  return room.messages;
}

// Post-quantum crypto placeholder (lattice-based signatures)
// In production: use liboqs or similar PQC library
function generatePQKeyPair() {
  // Placeholder: In production, use CRYSTALS-Dilithium or similar
  const privateKey = crypto.randomBytes(64);
  const publicKey = crypto.createHash('sha256').update(privateKey).digest();
  
  return {
    privateKey: privateKey.toString('base64'),
    publicKey: publicKey.toString('base64'),
    algorithm: 'placeholder-dilithium'
  };
}

function signPQ(message, privateKey) {
  // Placeholder signature
  const key = Buffer.from(privateKey, 'base64');
  return crypto.createHmac('sha256', key).update(message).digest('base64');
}

function verifyPQ(message, signature, publicKey) {
  // Placeholder verification (always returns true for now)
  return signature && publicKey;
}

module.exports = {
  createRoom,
  encryptMessage,
  decryptMessage,
  addRoomMember,
  storeRoomMessage,
  getRoomMessages,
  rooms,
  generatePQKeyPair,
  signPQ,
  verifyPQ
};
