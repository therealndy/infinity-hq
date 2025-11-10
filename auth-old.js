const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT secret (in production: use Cloud Secret Manager)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = '24h';

// Simulate user database (in production: use Postgres)
const users = new Map();

// Generate JWT token
function generateToken(userId, email) {
  return jwt.sign(
    { userId, email, iat: Date.now() },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Middleware: require authentication
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid token' });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
  
  req.user = decoded;
  next();
}

// WebAuthn challenge storage (in production: use Redis)
const challenges = new Map();

// Generate WebAuthn registration challenge
function generateWebAuthnChallenge(userId) {
  const challenge = crypto.randomBytes(32).toString('base64url');
  challenges.set(userId, { challenge, createdAt: Date.now() });
  
  // Clean up old challenges after 5 minutes
  setTimeout(() => challenges.delete(userId), 5 * 60 * 1000);
  
  return challenge;
}

// Verify WebAuthn challenge
function verifyWebAuthnChallenge(userId, challenge) {
  const stored = challenges.get(userId);
  if (!stored) return false;
  if (Date.now() - stored.createdAt > 5 * 60 * 1000) {
    challenges.delete(userId);
    return false;
  }
  return stored.challenge === challenge;
}

// Register user (placeholder - in production: hash passwords, use Postgres)
function registerUser(email, passwordHash, webauthnCredential = null) {
  const userId = crypto.randomUUID();
  users.set(userId, {
    userId,
    email,
    passwordHash,
    webauthnCredential,
    createdAt: Date.now()
  });
  return userId;
}

// Find user by email
function findUserByEmail(email) {
  for (const [userId, user] of users.entries()) {
    if (user.email === email) return user;
  }
  return null;
}

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  generateWebAuthnChallenge,
  verifyWebAuthnChallenge,
  registerUser,
  findUserByEmail,
  users
};
