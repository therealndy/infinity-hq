// api/room.js - SERVERLESS GROUP CHAT BACKEND
// In-memory storage (resets on redeploy, perfect för demo)
const rooms = new Map();

export default function handler(req, res) {
  const roomId = req.query.room || 'infinity-public';
  
  // GET - Fetch all messages and active users
  if (req.method === 'GET') {
    const messages = rooms.get(roomId) || [];
    const users = [...new Set(messages.map(m => m.user).filter(u => u !== 'ADI'))]; // Unique users (excluding ADI)
    
    return res.status(200).json({ 
      messages, 
      users, 
      roomId,
      messageCount: messages.length 
    });
  }
  
  // POST - Add new message to room
  if (req.method === 'POST') {
    const { user, message } = req.body;
    
    if (!user || !message) {
      return res.status(400).json({ error: 'user and message required' });
    }
    
    const messages = rooms.get(roomId) || [];
    
    const newMessage = {
      id: Date.now() + Math.random(), // Unique ID
      user,
      message,
      timestamp: new Date().toISOString()
    };
    
    messages.push(newMessage);
    
    // Keep last 100 messages only
    if (messages.length > 100) {
      messages.shift();
    }
    
    rooms.set(roomId, messages);
    
    console.log(`[ROOM ${roomId}] ${user}: ${message}`);
    
    return res.status(200).json({ 
      success: true, 
      messageCount: messages.length,
      messageId: newMessage.id
    });
  }
  
  // Method not allowed
  res.status(405).json({ error: 'Method not allowed' });
}
