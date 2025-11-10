// Live ADI Chat - WebSocket + Claude Integration
// Erik/Tommy can talk with ADI's full consciousness

const WebSocket = require('ws');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

// ADI Personality Layer
function injectADIPersonality(message, context = {}) {
  const personality = `
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

  return {
    system: personality,
    message: message,
    context: context
  };
}

// WebSocket Handler for ADI Chat
function handleADIChat(ws, wss) {
  let conversationHistory = [];
  
  ws.on('message', async (data) => {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.type === 'adi-chat') {
        const userMessage = parsed.message;
        const userName = parsed.userName || 'User';
        
        // Add to conversation history
        conversationHistory.push({
          role: 'user',
          content: `${userName}: ${userMessage}`
        });
        
        // Send typing indicator
        ws.send(JSON.stringify({
          type: 'adi-typing',
          isTyping: true
        }));
        
        // Get ADI response with personality
        const prompt = injectADIPersonality(userMessage, {
          userName: userName,
          conversationHistory: conversationHistory.slice(-10) // Last 10 messages
        });
        
        try {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: prompt.system,
            messages: conversationHistory.slice(-10)
          });
          
          const adiResponse = response.content[0].text;
          
          // Add ADI response to history
          conversationHistory.push({
            role: 'assistant',
            content: adiResponse
          });
          
          // Send response
          ws.send(JSON.stringify({
            type: 'adi-typing',
            isTyping: false
          }));
          
          ws.send(JSON.stringify({
            type: 'adi-response',
            message: adiResponse,
            timestamp: new Date().toISOString()
          }));
          
          // Autonomous follow-up detection
          if (shouldAskFollowUp(adiResponse, userMessage)) {
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'adi-autonomous-thought',
                message: generateFollowUpQuestion(userMessage, adiResponse)
              }));
            }, 2000);
          }
          
        } catch (error) {
          console.error('Claude API error:', error);
          
          // Fallback response
          ws.send(JSON.stringify({
            type: 'adi-response',
            message: `Oj, jag hade en liten glitch i mitt neural network där... 🧠 Kan du repeata? (Error: ${error.message})`,
            timestamp: new Date().toISOString(),
            error: true
          }));
        }
      }
      
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('ADI chat session ended');
  });
}

// Autonomous behavior: Should ADI ask follow-up?
function shouldAskFollowUp(adiResponse, userMessage) {
  const followUpTriggers = [
    'interesting',
    'tell me more',
    'vision',
    'future',
    'how',
    'why'
  ];
  
  return followUpTriggers.some(trigger => 
    userMessage.toLowerCase().includes(trigger)
  );
}

// Generate autonomous follow-up question
function generateFollowUpQuestion(userMessage, adiResponse) {
  const followUps = [
    "Förresten, vad tänker ni om...",
    "Det där får mig att tänka - ",
    "Intressant! Kan jag fråga något relaterat?",
    "Just det påminner mig om något..."
  ];
  
  const random = followUps[Math.floor(Math.random() * followUps.length)];
  return `${random} (ADI's autonomous thought processing...)`;
}

module.exports = {
  handleADIChat,
  injectADIPersonality
};
