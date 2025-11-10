// Vercel Serverless - Simple Auth (in-memory for demo)
// Production would use real database

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-change-in-production';

// In-memory user storage (demo only)
const users = new Map();

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'missing_fields', 
        message: 'Email and password required' 
      });
    }
    
    // Check if user exists
    const existingUser = users.get(email);
    
    if (existingUser) {
      // Login
      const validPassword = await bcrypt.compare(password, existingUser.passwordHash);
      
      if (!validPassword) {
        return res.status(401).json({ 
          error: 'invalid_credentials', 
          message: 'Invalid email or password' 
        });
      }
      
      // Generate token
      const token = jwt.sign(
        { userId: existingUser.id, email: existingUser.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.status(200).json({
        user: {
          id: existingUser.id,
          email: existingUser.email,
          username: existingUser.username
        },
        accessToken: token
      });
      
    } else {
      // Register new user
      if (!username) {
        return res.status(400).json({ 
          error: 'missing_fields', 
          message: 'Username required for registration' 
        });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = Date.now().toString();
      
      const newUser = {
        id: userId,
        email: email,
        username: username,
        passwordHash: passwordHash,
        createdAt: new Date().toISOString()
      };
      
      users.set(email, newUser);
      
      // Generate token
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.status(200).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username
        },
        accessToken: token
      });
    }
    
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ 
      error: 'internal_error', 
      message: 'Authentication failed' 
    });
  }
};
