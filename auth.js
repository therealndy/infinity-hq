const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_ACCESS_EXPIRES = '15m';
const JWT_REFRESH_EXPIRES = '7d';
const BCRYPT_ROUNDS = 10;

// Generate access token (short-lived)
function generateAccessToken(userId, email) {
  return jwt.sign(
    { userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES }
  );
}

// Generate refresh token (long-lived)
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES }
  );
}

// Verify token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Hash password with bcrypt
async function hashPassword(password) {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Compare password
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Middleware: require authentication
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken;
  
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : cookieToken;
  
  if (!token) {
    return res.status(401).json({ error: 'unauthorized', message: 'No token provided' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded || decoded.type !== 'access') {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
  
  req.user = decoded;
  next();
}

// Middleware: optional auth (doesn't block if no token)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken;
  
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : cookieToken;
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.type === 'access') {
      req.user = decoded;
    }
  }
  
  next();
}

// Validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate password strength
function isValidPassword(password) {
  return password && password.length >= 8;
}

// WebAuthn challenges (temporary - Redis in production)
const webauthnChallenges = new Map();

function generateWebAuthnChallenge(userId) {
  const challenge = crypto.randomBytes(32).toString('base64');
  webauthnChallenges.set(userId, { challenge, timestamp: Date.now() });
  
  // Auto-cleanup after 5 minutes
  setTimeout(() => webauthnChallenges.delete(userId), 5 * 60 * 1000);
  
  return challenge;
}

function verifyWebAuthnChallenge(userId, challenge) {
  const stored = webauthnChallenges.get(userId);
  if (!stored) return false;
  
  const valid = stored.challenge === challenge && (Date.now() - stored.timestamp) < 5 * 60 * 1000;
  if (valid) webauthnChallenges.delete(userId);
  
  return valid;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashPassword,
  comparePassword,
  requireAuth,
  optionalAuth,
  isValidEmail,
  isValidPassword,
  generateWebAuthnChallenge,
  verifyWebAuthnChallenge,
  JWT_SECRET
};
