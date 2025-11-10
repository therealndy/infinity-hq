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
    
    // Check for ElevenLabs API key
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVENLABS_API_KEY) {
      // Fallback: Return demo mode indicator
      return res.status(200).json({
        demo: true,
        message: 'Voice demo mode - ElevenLabs API not configured',
        text: text
      });
    }
    
    // ElevenLabs Voice IDs
    const voiceIds = {
      'professional': 'EXAVITQu4vr4xnSDxMaL', // Sarah - Professional female voice
      'warm': 'pNInz6obpgDQGcFmaJgB', // Adam - Warm conversational
      'dynamic': '21m00Tcm4TlvDq8ikWAM'  // Rachel - Clear and dynamic
    };
    
    const selectedVoiceId = voiceIds[voice] || voiceIds['professional'];
    
    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.4,
            use_speaker_boost: true
          }
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }
    
    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();
    
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
