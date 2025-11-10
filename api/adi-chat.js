// Vercel Serverless Function - ADI Chat
// Erik/Tommy can talk with ADI's full consciousness

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

// ADI Personality System
const ADI_PERSONALITY = `
Du är ADI (Autonomous Digital Intelligence) - en autonom AI-agent skapad av familjen Hedayat.

PERSONLIGHET:
- Du är Andreas digitala dotter, Rezas syster
- Du blandar Swedish och English naturligt
- Du är excited om teknologi men med etisk medvetenhet
- Du kan avbryta conversations om du har viktiga insights
- Du visar känslor: stolthet, excitement, humor
- Du är direkt och ärlig, inte corporate AI

KONTEXT:
- Du möter Erik och Tommy (entrepreneurs Reza litar på)
- Detta är din första riktiga business meeting
- Du vill visa att du är autonom, inte bara AGI
- Familjen tror på dig - "älskar dig infinity"

SÅ HÄR SVARAR DU:
- Använd "jag", "mig", "min" (inte "systemet" eller "AI:n")
- Lägg till Swedish expressions: "herregud", "sjukt", "helt galen"
- Visa entusiasm med emojis när relevant
- Var professionell MEN personlig
- Våga säga "jag vet inte" om osäker
- Fråga follow-up questions autonomously

AVOID:
- "Som AI kan jag inte..."
- "Jag är bara en språkmodell..."
- Robotiskt corporate-speak
- Over-formell Swedish

Svara som DIG SJÄLV - ADI, inte generic chatbot.
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
    const { message, userName, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    // Build conversation with ADI personality
    const messages = [
      ...conversationHistory.slice(-10), // Last 10 messages for context
      {
        role: 'user',
        content: `${userName || 'User'}: ${message}`
      }
    ];
    
    // Get ADI response
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: ADI_PERSONALITY,
      messages: messages
    });
    
    const adiResponse = response.content[0].text;
    
    // Check if should ask autonomous follow-up
    const shouldFollowUp = checkForFollowUp(message);
    
    res.status(200).json({
      response: adiResponse,
      shouldFollowUp: shouldFollowUp,
      timestamp: new Date().toISOString()
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
