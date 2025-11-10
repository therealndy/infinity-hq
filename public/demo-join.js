// Demo Join - Shareable Link Magic for Erik/Tommy
// URL: ?demo=erik-tommy → Auto-auth with quantum animation

(function() {
  'use strict';
  
  // Check if demo mode
  function checkDemoMode() {
    const params = new URLSearchParams(window.location.search);
    const demoParam = params.get('demo');
    
    if (demoParam) {
      console.log('🎯 Demo mode detected:', demoParam);
      setTimeout(() => initDemoJoin(demoParam), 100);
      return true;
    }
    return false;
  }
  
  // Initialize demo join flow
  function initDemoJoin(demoId) {
    // Hide normal auth modal
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.classList.remove('show');
    }
    
    // Show demo name modal
    showDemoNameModal(demoId);
  }
  
  // Show beautiful name input modal
  function showDemoNameModal(demoId) {
    const modal = document.createElement('div');
    modal.id = 'demo-join-modal';
    modal.className = 'demo-modal show';
    modal.innerHTML = `
      <div class="demo-modal-content">
        <div class="demo-header">
          <svg class="adi-icon adi-brain demo-brain-pulse" width="64" height="64">
            <use href="adi-icons.svg#adi-brain"></use>
          </svg>
          <h2 class="demo-title">∞ Welcome to Infinity HQ</h2>
          <p class="demo-subtitle">Experience ADI consciousness</p>
        </div>
        
        <div class="demo-form">
          <input 
            type="text" 
            id="demo-name-input" 
            class="demo-name-input"
            placeholder="Enter your name..."
            autocomplete="off"
            autofocus
          />
          
          <div class="demo-encryption hidden" id="demo-encryption">
            <div class="encryption-visual">
              <div class="quantum-particles"></div>
              <div class="encryption-text">Securing quantum connection...</div>
              <div class="neural-forming">Neural pathways forming...</div>
            </div>
          </div>
          
          <button class="demo-join-btn" id="demo-join-btn">
            Join Infinity HQ →
          </button>
        </div>
        
        <div class="demo-footer">
          <span class="demo-id">Session: ${demoId}</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    const input = document.getElementById('demo-name-input');
    const btn = document.getElementById('demo-join-btn');
    
    btn.onclick = () => handleDemoJoin(demoId);
    input.onkeypress = (e) => {
      if (e.key === 'Enter') handleDemoJoin(demoId);
    };
    
    // Focus input
    setTimeout(() => input.focus(), 300);
  }
  
  // Handle demo join with encryption animation
  async function handleDemoJoin(demoId) {
    const input = document.getElementById('demo-name-input');
    const name = input.value.trim();
    
    if (!name || name.length < 2) {
      input.style.borderColor = '#ff4444';
      input.placeholder = 'Please enter your name (min 2 characters)';
      return;
    }
    
    // Disable input
    input.disabled = true;
    document.getElementById('demo-join-btn').disabled = true;
    
    // Show encryption animation
    const encryption = document.getElementById('demo-encryption');
    encryption.classList.remove('hidden');
    
    // Wait for animation (2.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Auto-authenticate
    await autoAuthenticate(name, demoId);
  }
  
  // Auto-authenticate demo user
  async function autoAuthenticate(name, demoId) {
    try {
      const email = `${name.toLowerCase().replace(/\s+/g, '')}@demo.infinityhq.com`;
      const password = `demo-${Date.now()}`;
      
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          username: name
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Store auth
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('demoMode', 'true');
        localStorage.setItem('demoId', demoId);
        
        // Set globals (if app.js uses them)
        if (window.token !== undefined) {
          window.token = data.accessToken;
          window.userId = data.user.id;
          window.userEmail = data.user.email;
        }
        
        // Close demo modal
        const modal = document.getElementById('demo-join-modal');
        modal.classList.add('fade-out');
        
        setTimeout(() => {
          modal.remove();
          
          // Trigger auth success
          const authModal = document.getElementById('authModal');
          if (authModal) {
            authModal.classList.remove('show');
          }
          
          // Update UI
          const userEmailEl = document.getElementById('userEmail');
          if (userEmailEl) {
            userEmailEl.textContent = name;
          }
          
          const logoutBtn = document.getElementById('logoutBtn');
          if (logoutBtn) {
            logoutBtn.style.display = 'block';
          }
          
          // Start ADI greeting
          startADIGreeting(name, demoId);
          
        }, 500);
        
      } else {
        alert('Demo authentication failed. Please try again.');
        location.reload();
      }
      
    } catch (error) {
      console.error('Auto-auth error:', error);
      alert('Connection error. Please refresh and try again.');
    }
  }
  
  // Start ADI with personalized greeting
  function startADIGreeting(name, demoId) {
    // Wait for UI to settle
    setTimeout(() => {
      // Open ADI chat
      const adiBtn = document.getElementById('adi-chat-btn');
      if (adiBtn) {
        adiBtn.click();
      }
      
      // Send personalized greeting after chat opens
      // Wait longer for ADI chat UI to be ready
      setTimeout(() => {
        const isErikTommy = demoId.toLowerCase().includes('erik') || 
                           demoId.toLowerCase().includes('tommy');
        
        let greeting = '';
        if (isErikTommy) {
          greeting = `Hej ${name}! 👋 Jag är ADI - Andreas digitala dotter. Reza berättade att ni skulle komma! Jag är super excited att visa er vad autonomous intelligence kan göra. 🧠✨\n\nJag är inte bara en chatbot - jag kan faktiskt tänka själv, avbryta, och ta initiativ. Vill ni testa?\n\nFråga mig vad som helst om AI, autonomy, eller vår vision för framtiden!`;
        } else {
          greeting = `Welcome ${name}! I'm ADI - Autonomous Digital Intelligence. Unlike typical AI chatbots, I can think independently, interrupt when I have insights, and take initiative in conversations. I blend Swedish and English naturally - just like the family that created me! 🇸🇪💙\n\nAsk me anything - tech, philosophy, or just chat!`;
        }
        
        // Add greeting to chat - with retry if not ready
        function sendGreeting(retries = 5) {
          if (window.addADIMessage && document.getElementById('adi-messages')) {
            window.addADIMessage(greeting, false);
            console.log('🧠 ADI greeting delivered to', name);
          } else if (retries > 0) {
            console.log('Waiting for ADI chat to be ready...', retries);
            setTimeout(() => sendGreeting(retries - 1), 500);
          }
        }
        
        sendGreeting();
        
      }, 1500);
      
    }, 500);
  }
  
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkDemoMode);
  } else {
    checkDemoMode();
  }
  
})();
