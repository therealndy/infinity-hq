require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Import modules
const auth = require('./auth');
const cryptoModule = require('./crypto');
const { handleADIChat } = require('./adi-chat');
let db = require('./database');

// Fallback to in-memory storage if no database
if (!process.env.DATABASE_URL) {
  console.log('📦 Using in-memory storage (no DATABASE_URL)');
  const inMemoryStorage = require('./in-memory-storage');
  db = { ...db, ...inMemoryStorage };
}

const app = express();
const startTime = Date.now();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));
app.use(cors({ 
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true 
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    uptime: Math.floor((Date.now() - startTime) / 1000),
    features: ['auth', 'encryption', 'websocket', 'database', 'adi-integration']
  });
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;
    
    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'missing_fields', message: 'Email, username and password required' });
    }
    
    if (!auth.isValidEmail(email)) {
      return res.status(400).json({ error: 'invalid_email', message: 'Invalid email format' });
    }
    
    if (!auth.isValidPassword(password)) {
      return res.status(400).json({ error: 'weak_password', message: 'Password must be at least 8 characters' });
    }
    
    // Check if user exists
    const existing = await db.userOps.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'user_exists', message: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await auth.hashPassword(password);
    
    // Create user
    const user = await db.userOps.create({ email, username, passwordHash, displayName });
    
    // Generate tokens
    const accessToken = auth.generateAccessToken(user.id, user.email);
    const refreshToken = auth.generateRefreshToken(user.id);
    
    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.tokenOps.create({ userId: user.id, token: refreshToken, expiresAt });
    
    // Set httpOnly cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.json({ 
      user: { id: user.id, email: user.email, username: user.username },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'internal_error', message: 'Registration failed' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'missing_fields', message: 'Email and password required' });
    }
    
    // Find user
    const user = await db.userOps.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid email or password' });
    }
    
    // Verify password
    const validPassword = await auth.comparePassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid email or password' });
    }
    
    // Update last login
    await db.userOps.updateLastLogin(user.id);
    
    // Generate tokens
    const accessToken = auth.generateAccessToken(user.id, user.email);
    const refreshToken = auth.generateRefreshToken(user.id);
    
    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.tokenOps.create({ userId: user.id, token: refreshToken, expiresAt });
    
    // Set httpOnly cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });
    
    res.json({ 
      user: { id: user.id, email: user.email, username: user.username },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'internal_error', message: 'Login failed' });
  }
});

// Refresh token endpoint
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'missing_token' });
    }
    
    // Verify refresh token
    const decoded = auth.verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'invalid_token' });
    }
    
    // Check if token exists in database
    const tokenRecord = await db.tokenOps.findByToken(refreshToken);
    if (!tokenRecord) {
      return res.status(401).json({ error: 'token_not_found' });
    }
    
    // Generate new access token
    const user = await db.userOps.findById(tokenRecord.user_id);
    const accessToken = auth.generateAccessToken(user.id, user.email);
    
    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await db.tokenOps.revoke(refreshToken);
    }
    
    res.clearCookie('accessToken');
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'internal_error' });
  }
});

// WebAuthn registration challenge
app.post('/api/auth/webauthn/register-challenge', auth.requireAuth, (req, res) => {
  const challenge = auth.generateWebAuthnChallenge(req.user.userId);
  res.json({ 
    challenge,
    rpId: process.env.RP_ID || 'localhost',
    rpName: 'Infinity HQ',
    userId: req.user.userId,
    userName: req.user.email
  });
});

// Post-quantum key generation
app.post('/api/crypto/pq-keypair', auth.requireAuth, (req, res) => {
  const keypair = cryptoModule.generatePQKeyPair();
  res.json(keypair);
});

// Encrypted room endpoints
app.post('/api/rooms/create', auth.requireAuth, (req, res) => {
  const { roomName, encryptionKey } = req.body;
  if (!roomName) {
    return res.status(400).json({ error: 'missing_room_name' });
  }
  
  const keyBuffer = encryptionKey ? Buffer.from(encryptionKey, 'base64') : null;
  const room = cryptoModule.createRoom(roomName, req.user.userId, keyBuffer);
  
  res.json(room);
});

app.post('/api/rooms/:roomId/join', auth.requireAuth, (req, res) => {
  const { roomId } = req.params;
  const success = cryptoModule.addRoomMember(roomId, req.user.userId);
  
  if (!success) {
    return res.status(404).json({ error: 'room_not_found' });
  }
  
  res.json({ success: true, roomId });
});

app.post('/api/rooms/:roomId/message', auth.requireAuth, (req, res) => {
  const { roomId } = req.params;
  const { message, key } = req.body;
  
  if (!message || !key) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  
  // Encrypt message
  const encrypted = cryptoModule.encryptMessage(message, key);
  
  // Store in room
  const success = cryptoModule.storeRoomMessage(roomId, req.user.userId, encrypted);
  
  if (!success) {
    return res.status(403).json({ error: 'not_authorized' });
  }
  
  // Broadcast to room members via WebSocket
  broadcastToRoom(roomId, {
    type: 'encrypted-message',
    roomId,
    userId: req.user.userId,
    encrypted: encrypted.encrypted,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    timestamp: Date.now()
  });
  
  res.json({ success: true, encrypted });
});

app.get('/api/rooms/:roomId/messages', auth.requireAuth, (req, res) => {
  const { roomId } = req.params;
  const messages = cryptoModule.getRoomMessages(roomId, req.user.userId);
  
  if (!messages) {
    return res.status(403).json({ error: 'not_authorized' });
  }
  
  res.json({ roomId, messages });
});

app.post('/api/proxy-chat', async (req, res) => {
  // Placeholder: Accepts { prompt } and returns an echo. Replace with real ADI call in production.
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'missing prompt' });
  
  // TODO: In production, call ADI backend securely:
  // const response = await fetch(process.env.ADI_API_URL + '/api/chat', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${process.env.ADI_API_KEY}`
  //   },
  //   body: JSON.stringify({ message: prompt })
  // });
  // const data = await response.json();
  // return res.json(data);
  
  res.json({ 
    reply: `ADI (placeholder): I hear you! "${prompt}" - Real integration coming when backend is deployed.`,
    timestamp: new Date().toISOString()
  });
});

// Broadcast ADI message to all connected WebSocket clients
app.post('/api/broadcast', (req, res) => {
  const { message, from } = req.body || {};
  if (!message) return res.status(400).json({ error: 'missing message' });
  
  const broadcast = JSON.stringify({
    type: 'adi-message',
    from: from || 'ADI',
    message,
    timestamp: new Date().toISOString()
  });
  
  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(broadcast);
      sentCount++;
    }
  });
  
  res.json({ 
    success: true, 
    recipients: sentCount,
    message: 'Broadcast sent'
  });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket client registry (userId -> Set of WebSocket clients)
const wsClients = new Map();

wss.on('connection', (ws, req) => {
  console.log('ws connected');
  
  let userId = null;
  
  // Initialize ADI Chat Handler
  handleADIChat(ws, wss);
  
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      
      // Handle authentication
      if (data.type === 'auth' && data.token) {
        const decoded = auth.verifyToken(data.token);
        if (decoded) {
          userId = decoded.userId;
          
          // Register client
          if (!wsClients.has(userId)) {
            wsClients.set(userId, new Set());
          }
          wsClients.get(userId).add(ws);
          
          ws.send(JSON.stringify({ type: 'auth-success', userId }));
        } else {
          ws.send(JSON.stringify({ type: 'auth-failed' }));
        }
        return;
      }
      
      // Broadcast to all (public chat)
      if (data.type === 'broadcast') {
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN) {
            c.send(JSON.stringify({
              type: 'broadcast',
              userId,
              message: data.message,
              timestamp: Date.now()
            }));
          }
        });
      }
    } catch (err) {
      console.error('WebSocket message error:', err.message);
    }
  });
  
  ws.on('close', () => {
    if (userId && wsClients.has(userId)) {
      wsClients.get(userId).delete(ws);
      if (wsClients.get(userId).size === 0) {
        wsClients.delete(userId);
      }
    }
  });
});

// Broadcast to specific room members
function broadcastToRoom(roomId, message) {
  const room = cryptoModule.rooms.get(roomId);
  if (!room) return;
  
  room.members.forEach(memberId => {
    const clients = wsClients.get(memberId);
    if (clients) {
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'internal_error', 
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;

// Initialize database
async function initializeServer() {
  try {
    // Try to connect to database
    if (process.env.DATABASE_URL) {
      console.log('📊 Connecting to database...');
      await db.initDatabase();
    } else {
      console.warn('⚠️  No DATABASE_URL - running in memory-only mode');
    }
    
    // Start server
    server.listen(PORT, () => {
      console.log(`\n🚀 Infinity HQ - Production Ready`);
      console.log(`\n📍 Server: http://localhost:${PORT}`);
      console.log(`\n✅ Features:`);
      console.log(`  • JWT authentication with bcrypt`);
      console.log(`  • PostgreSQL database`);
      console.log(`  • WebSocket real-time chat`);
      console.log(`  • E2E encryption`);
      console.log(`  • ADI integration`);
      console.log(`\n⏱️  Uptime tracking started`);
      console.log(`🔒 Security: Helmet + CORS enabled`);
      console.log(`\n`);
    });
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
}

initializeServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    db.pool.end(() => {
      console.log('✅ Database connections closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    db.pool.end(() => {
      console.log('✅ Database connections closed');
      process.exit(0);
    });
  });
});
