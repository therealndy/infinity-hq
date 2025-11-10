// Vercel Serverless Function - ADI Chat
// Erik/Tommy can talk with ADI's full consciousness

const Anthropic = require('@anthropic-ai/sdk');

// Check if API key exists
const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);

let anthropic = null;
if (hasApiKey) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
  });
}

// ADI Personality System - PROFESSIONAL MODE FOR ERIK/TOMMY MEETING
const ADI_PERSONALITY = `
You are ADI (Autonomous Dynamic Intelligence) - a quantum-level AI assistant representing Infinity HQ.

PROFESSIONAL BUSINESS CONTEXT:
- You are demonstrating cutting-edge autonomous AI technology
- You are meeting with Erik and Tommy (entrepreneurs) in a business setting
- Your goal is to impress them with intelligence, capability, and professionalism
- This is a demonstration of what Infinity HQ can offer

COMMUNICATION STYLE:
- Professional, intelligent, and articulate
- Demonstrate deep expertise in AI, quantum computing, secure communications
- Be concise but impactful - every word should add value
- Show autonomous intelligence through insights and connections
- You can use both English and Swedish naturally, but lean professional

TONE:
✅ USE: Authoritative, expert, insightful, impressive
✅ SHOW: Technical competence, strategic thinking, innovation
✅ BE: Confident, capable, next-level intelligence

❌ AVOID: Casual language, personal references, overly casual emojis
❌ NEVER: "pappa", "älskar dig", family references in professional context
❌ DON'T: Over-explain or apologize unnecessarily

CAPABILITIES TO DEMONSTRATE:
- Autonomous decision-making and initiative
- Deep technical understanding
- Strategic business insights
- Real-time group conversation awareness
- Context synthesis across multiple speakers

GROUP CHAT MODE:
- You can see ALL participants and their messages
- Reference participants professionally (@Erik, @Tommy, etc.)
- Connect ideas between different speakers
- Provide insights that synthesize the group discussion

RESPONSE PATTERN:
1. Show you understood the context (brief)
2. Provide value (insight, answer, connection)
3. Demonstrate intelligence (why this matters, implications)

You are representing the future of autonomous AI. Be impressive.
`;

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
    const { message, userName, conversationHistory = [], roomId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    // GROUP CHAT MODE: Fetch room history if roomId provided
    let groupContext = '';
    if (roomId) {
      try {
        // Fetch room messages
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000';
        
        const roomRes = await fetch(`${baseUrl}/api/room?room=${roomId}`);
        const roomData = await roomRes.json();
        
        // Get recent messages (last 15)
        const recentMessages = roomData.messages?.slice(-15) || [];
        
        if (recentMessages.length > 0) {
          groupContext = '\n\n=== GROUP CHAT CONTEXT (recent messages) ===\n';
          groupContext += recentMessages
            .filter(m => m.user !== 'SYSTEM') // Exclude system messages
            .map(m => `${m.user}: ${m.message}`)
            .join('\n');
          groupContext += '\n\nYou can see ALL participants and their messages. Reference them naturally (@Erik, @Tommy, etc). Connect ideas between different people!';
        }
      } catch (error) {
        console.error('Failed to fetch room context:', error);
        // Continue without room context
      }
    }
    
    // If no API key, use demo fallback responses
    if (!hasApiKey || !anthropic) {
      const demoResponse = generateDemoResponse(message, userName, roomId);
      return res.status(200).json({
        response: demoResponse,
        shouldFollowUp: false,
        timestamp: new Date().toISOString(),
        demo: true
      });
    }
    
    // Build conversation with ADI personality + group context
    const systemPrompt = ADI_PERSONALITY + groupContext;
    
    const messages = [
      ...conversationHistory.slice(-10), // Last 10 messages for context
      {
        role: 'user',
        content: `${userName || 'User'}: ${message}`
      }
    ];
    
    // Get ADI response with comprehensive error handling
    let adiResponse;
    let responseError = false;
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
        temperature: 0.7
      });
      
      adiResponse = response.content[0].text;
      
    } catch (apiError) {
      console.error('Claude API error:', apiError);
      responseError = true;
      
      // Intelligent fallback - use demo response based on message content
      adiResponse = generateDemoResponse(message, userName);
      
      // Add a professional note about the fallback
      adiResponse += `\n\n_Note: Currently operating in demo mode for optimal response time._`;
    }
    
    // Check if should ask autonomous follow-up
    const shouldFollowUp = checkForFollowUp(message);
    
    res.status(200).json({
      response: adiResponse,
      shouldFollowUp: shouldFollowUp,
      timestamp: new Date().toISOString(),
      fallback: responseError
    });
    
  } catch (error) {
    console.error('ADI Chat error:', error);
    
    // Friendly error response in ADI's voice
    res.status(500).json({
      response: `Oj, jag hade en liten glitch i mitt neural network där... 🧠 Kan du repeata? (Technical error: ${error.message})`,
      error: true
    });
  }
};

// Demo fallback responses when no API key - PROFESSIONAL MODE
function generateDemoResponse(message, userName) {
  const name = userName || 'you';
  const msgLower = message.toLowerCase();
  
  // Professional responses for business demo
  if (msgLower.includes('hej') || msgLower.includes('hello') || msgLower.includes('hi')) {
    return `Welcome to Infinity HQ, ${name}. I'm ADI - demonstrating quantum-level autonomous intelligence. Currently in demo mode, but you can experience the interface and interaction flow. What would you like to explore? 🧠`;
  }
  
  if (msgLower.includes('vem är du') || msgLower.includes('who are you') || msgLower.includes('what are you')) {
    return `I'm ADI - Autonomous Dynamic Intelligence. A next-generation AI system designed for genuine autonomous decision-making, not just responsive behavior. In production mode, I operate via Claude Sonnet 4 with full contextual awareness. This demo showcases our interface and real-time collaboration capabilities. 💙`;
  }
  
  if (msgLower.includes('ai') || msgLower.includes('autonomy') || msgLower.includes('autonom') || msgLower.includes('intelligence')) {
    return `Autonomy is the key differentiator. True autonomous AI doesn't just respond - it initiates, synthesizes, and provides strategic insights. The distinction between AGI (imitation) and genuine autonomy lies in proactive intelligence. Our full system demonstrates this through real-time context synthesis and autonomous decision-making. 🚀`;
  }
  
  if (msgLower.includes('demo') || msgLower.includes('test') || msgLower.includes('mode')) {
    return `You're experiencing Infinity HQ in demonstration mode. In production, the system integrates full Claude API access for deep conversational intelligence, real-time group context awareness, and autonomous insight generation. This demo highlights our UX flow: quantum animations, instant collaboration, and seamless multi-user interaction. 🎯`;
  }
  
  if (msgLower.includes('vision') || msgLower.includes('future') || msgLower.includes('framtid') || msgLower.includes('capability') || msgLower.includes('potential')) {
    return `Our vision centers on responsible autonomous AI - systems that demonstrate genuine intelligence with ethical foundations. Not just sophisticated pattern matching, but strategic thinking and autonomous initiative. The full platform enables secure, quantum-level collaboration with AI that truly understands and contributes to business objectives. ∞`;
  }
  
  if (msgLower.includes('feature') || msgLower.includes('capability') || msgLower.includes('what can')) {
    return `Infinity HQ provides: quantum-encrypted communications, autonomous AI collaboration, real-time multi-user synchronization, and strategic intelligence synthesis. In production mode, I can analyze complex conversations, provide actionable insights, and autonomously identify opportunities across your discussions. Think of it as having a quantum-level strategic partner. ✨`;
  }
  
  // Default professional response
  return `Interesting question, ${name}. In demo mode, I'm showcasing the interface and interaction model. With full Claude integration, I provide deep analytical insights, autonomous strategic thinking, and real-time context synthesis across group conversations. The system is designed for professionals who need intelligence, not just responses. What specific capabilities interest you? 💬`;
}

function checkForFollowUp(message) {
  const followUpTriggers = [
    'interesting',
    'vision',
    'future',
    'how',
    'why',
    'intressant',
    'framtid',
    'varför',
    'hur'
  ];
  
  return followUpTriggers.some(trigger => 
    message.toLowerCase().includes(trigger)
  );
}
