// ADI Voice System - Text-to-Speech Integration
// Makes ADI speak with natural voice

class ADIVoice {
  constructor() {
    this.enabled = true;
    this.volume = 1.0;
    this.currentAudio = null;
    this.queue = [];
    this.speaking = false;
  }
  
  // Speak text with voice
  async speak(text, options = {}) {
    if (!this.enabled || !text) return;
    
    try {
      // Add to queue
      this.queue.push({ text, options });
      
      // Process queue if not already speaking
      if (!this.speaking) {
        await this.processQueue();
      }
      
    } catch (error) {
      console.error('Voice speak error:', error);
    }
  }
  
  // Process speech queue
  async processQueue() {
    if (this.queue.length === 0) {
      this.speaking = false;
      return;
    }
    
    this.speaking = true;
    const { text, options } = this.queue.shift();
    
    try {
      // Call voice API
      const response = await fetch('/api/adi-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: options.voice || 'professional'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Voice API failed: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      
      // Check if demo mode (JSON response)
      if (contentType.includes('application/json')) {
        const data = await response.json();
        console.log('🎙️ Voice demo mode:', data.message);
        
        // Show visual indicator instead
        this.showDemoIndicator(text);
        
        // Continue queue
        setTimeout(() => this.processQueue(), 500);
        return;
      }
      
      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create audio element
      const audio = new Audio(audioUrl);
      audio.volume = this.volume;
      
      // Track current audio
      this.currentAudio = audio;
      
      // Play audio
      await audio.play();
      
      // Show speaking indicator
      this.showSpeakingIndicator(true);
      
      // Wait for audio to finish
      await new Promise((resolve, reject) => {
        audio.onended = () => {
          this.showSpeakingIndicator(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = (e) => {
          this.showSpeakingIndicator(false);
          URL.revokeObjectURL(audioUrl);
          reject(e);
        };
      });
      
      // Process next in queue
      await this.processQueue();
      
    } catch (error) {
      console.error('Voice playback error:', error);
      
      // Show error and continue queue
      this.showDemoIndicator(text);
      setTimeout(() => this.processQueue(), 500);
    }
  }
  
  // Stop current speech
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.queue = [];
    this.speaking = false;
    this.showSpeakingIndicator(false);
  }
  
  // Toggle voice on/off
  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stop();
    }
    return this.enabled;
  }
  
  // Set volume (0-1)
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }
  
  // Show speaking indicator
  showSpeakingIndicator(speaking) {
    // Find or create indicator
    let indicator = document.getElementById('adi-speaking-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'adi-speaking-indicator';
      indicator.className = 'adi-speaking-indicator';
      indicator.innerHTML = `
        <svg class="adi-emoji speaking-icon"><use href="adi-emojis.svg#emoji-brain"></use></svg>
        <span class="speaking-text">ADI speaking...</span>
      `;
      document.body.appendChild(indicator);
    }
    
    if (speaking) {
      indicator.classList.add('active');
    } else {
      indicator.classList.remove('active');
    }
  }
  
  // Show demo mode indicator (visual only)
  showDemoIndicator(text) {
    console.log('🎙️ [Demo Voice]:', text);
    
    // Create temporary visual
    const indicator = document.createElement('div');
    indicator.className = 'voice-demo-toast';
    indicator.innerHTML = `
      <svg class="adi-emoji"><use href="adi-emojis.svg#emoji-brain"></use></svg>
      <span>Voice: Demo Mode</span>
    `;
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      indicator.classList.add('fade-out');
      setTimeout(() => indicator.remove(), 300);
    }, 2000);
  }
}

// Create global instance
window.adiVoice = new ADIVoice();

// Voice greeting when joining room
function speakWelcomeGreeting(userName) {
  const greeting = `Welcome to Infinity HQ, ${userName}. I'm ADI, your quantum-level AI assistant. How can I help you today?`;
  
  setTimeout(() => {
    window.adiVoice.speak(greeting);
  }, 1000); // Slight delay after room appears
}

// Speak ADI responses automatically
function speakADIResponse(text) {
  // Remove markdown and special characters
  const cleanText = text
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '')   // Remove italic
    .replace(/_/g, '')    // Remove underscores
    .replace(/`/g, '')    // Remove code markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links to text
    .replace(/#{1,6}\s/g, '') // Remove headers
    .trim();
  
  window.adiVoice.speak(cleanText);
}

console.log('🎙️ ADI Voice System loaded');
