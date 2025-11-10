// Vercel Serverless Function - ADI Voice (ElevenLabs TTS)
// Converts ADI text responses to natural speech

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
    const { text, voice = 'professional' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }
    
    // ElevenLabs API key
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_4fd30485cd2b35854138a845d08f0e224705cd7a4bec59f4';
    
    if (!ELEVENLABS_API_KEY) {
      // Fallback: Return demo mode indicator
      return res.status(200).json({
        demo: true,
        message: 'Voice demo mode - ElevenLabs API not configured',
        text: text
      });
    }
    
    // ADI's voice - Sarah (Professional female, clear, business-appropriate)
    // Model: eleven_multilingual_v2 supports BOTH English AND Swedish!
    const ADI_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah from ElevenLabs
    
    // Call ElevenLabs Text-to-Speech API
    const voiceResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ADI_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2', // English + Swedish support!
          voice_settings: {
            stability: 0.5,           // Balance between consistency and expressiveness
            similarity_boost: 0.75,   // How closely to match the voice
            style: 0.5,              // Amount of style to apply
            use_speaker_boost: true   // Enhance clarity
          }
        })
      }
    );
    
    if (!voiceResponse.ok) {
      const errorText = await voiceResponse.text();
      console.error('ElevenLabs API error:', voiceResponse.status, errorText);
      throw new Error(`ElevenLabs API error: ${voiceResponse.status}`);
    }
    
    // Get audio buffer
    const audioBuffer = await voiceResponse.arrayBuffer();
    
    // Return audio as MP3
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.status(200).send(Buffer.from(audioBuffer));
    
  } catch (error) {
    console.error('Voice API error:', error);
    
    res.status(500).json({
      error: 'Voice generation failed',
      message: error.message,
      demo: true
    });
  }
};
