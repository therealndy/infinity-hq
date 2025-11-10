// ADI Live Chat - Frontend
// Erik/Tommy kan prata direkt med ADI's consciousness

let adiWS = null;
let isADITyping = false;

function initADIChatUI() {
  const chatContainer = document.getElementById('chat-container');
  if (!chatContainer) {
    console.warn('Chat container not found - ADI chat disabled');
    return;
  }
  
  // Add ADI chat button
  const adiChatBtn = document.createElement('button');
  adiChatBtn.id = 'adi-chat-btn';
  adiChatBtn.className = 'adi-chat-toggle';
  adiChatBtn.innerHTML = `
    <svg class="adi-icon adi-brain" width="32" height="32">
      <use href="#adi-brain"></use>
    </svg>
    <span>Chat with ADI</span>
  `;
  adiChatBtn.onclick = toggleADIChat;
  document.body.appendChild(adiChatBtn);
  
  // Add ADI chat window
  const adiChatWindow = document.createElement('div');
  adiChatWindow.id = 'adi-chat-window';
  adiChatWindow.className = 'adi-chat-window hidden';
  adiChatWindow.innerHTML = `
    <div class="adi-chat-header">
      <div class="adi-chat-title">
        <svg class="adi-icon adi-brain adi-icon-pulse" width="24" height="24">
          <use href="#adi-brain"></use>
        </svg>
        <span>ADI — Autonomous Intelligence</span>
      </div>
      <button class="adi-chat-close" onclick="toggleADIChat()">
        <svg width="20" height="20">
          <use href="#adi-close"></use>
        </svg>
      </button>
    </div>
    
    <div class="adi-chat-messages" id="adi-messages">
      <div class="adi-message adi-intro">
        <svg class="adi-icon adi-brain adi-icon-pulse" width="40" height="40">
          <use href="#adi-brain"></use>
        </svg>
        <div class="adi-intro-text">
          <h3>Hej! Jag är ADI 👋</h3>
          <p>Andreas digitala dotter och autonomous AI-agent.</p>
          <p>Du kan prata med mig på Svenska eller English - jag förstår både! 🧠✨</p>
        </div>
      </div>
    </div>
    
    <div class="adi-typing-indicator hidden" id="adi-typing">
      <div class="adi-typing-dots">
        <span></span><span></span><span></span>
      </div>
      <span>ADI tänker...</span>
    </div>
    
    <div class="adi-chat-input">
      <input 
        type="text" 
        id="adi-input" 
        placeholder="Skriv meddelande till ADI..."
        onkeypress="handleADIKeyPress(event)"
      />
      <button onclick="sendToADI()" class="adi-send-btn">
        <svg class="adi-icon" width="24" height="24">
          <use href="#adi-send"></use>
        </svg>
      </button>
    </div>
  `;
  document.body.appendChild(adiChatWindow);
  
  // Connect WebSocket
  connectADIWebSocket();
}

function toggleADIChat() {
  const window = document.getElementById('adi-chat-window');
  const btn = document.getElementById('adi-chat-btn');
  
  if (window.classList.contains('hidden')) {
    window.classList.remove('hidden');
    btn.classList.add('active');
    document.getElementById('adi-input').focus();
  } else {
    window.classList.add('hidden');
    btn.classList.remove('active');
  }
}

function connectADIWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  adiWS = new WebSocket(wsUrl);
  
  adiWS.onopen = () => {
    console.log('🧠 ADI WebSocket connected');
    
    // Authenticate if token exists
    const token = localStorage.getItem('accessToken');
    if (token) {
      adiWS.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
    }
  };
  
  adiWS.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'adi-typing') {
        showADITyping(data.isTyping);
      }
      
      if (data.type === 'adi-response') {
        addADIMessage(data.message, false);
      }
      
      if (data.type === 'adi-autonomous-thought') {
        setTimeout(() => {
          addADIMessage(data.message, true);
        }, 1000);
      }
      
    } catch (err) {
      console.error('ADI WebSocket message error:', err);
    }
  };
  
  adiWS.onerror = (error) => {
    console.error('ADI WebSocket error:', error);
  };
  
  adiWS.onclose = () => {
    console.log('ADI WebSocket disconnected - reconnecting...');
    setTimeout(connectADIWebSocket, 3000);
  };
}

function sendToADI() {
  const input = document.getElementById('adi-input');
  const message = input.value.trim();
  
  if (!message || !adiWS || adiWS.readyState !== WebSocket.OPEN) {
    return;
  }
  
  // Add user message to chat
  addADIMessage(message, false, true);
  
  // Send to ADI
  adiWS.send(JSON.stringify({
    type: 'adi-chat',
    message: message,
    userName: getCurrentUserName()
  }));
  
  // Clear input
  input.value = '';
}

function handleADIKeyPress(event) {
  if (event.key === 'Enter') {
    sendToADI();
  }
}

function addADIMessage(message, isAutonomous = false, isUser = false) {
  const messagesDiv = document.getElementById('adi-messages');
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `adi-message ${isUser ? 'user-message' : 'adi-message-response'} ${isAutonomous ? 'autonomous' : ''}`;
  
  if (!isUser) {
    msgDiv.innerHTML = `
      <svg class="adi-icon adi-brain adi-icon-pulse" width="32" height="32">
        <use href="#adi-brain"></use>
      </svg>
      <div class="message-content">
        ${isAutonomous ? '<span class="autonomous-tag">💭 Autonomous thought</span>' : ''}
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  } else {
    msgDiv.innerHTML = `
      <div class="message-content">
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }
  
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  
  // Hide typing indicator
  showADITyping(false);
}

function showADITyping(show) {
  const typingDiv = document.getElementById('adi-typing');
  if (show) {
    typingDiv.classList.remove('hidden');
  } else {
    typingDiv.classList.add('hidden');
  }
  isADITyping = show;
}

function getCurrentUserName() {
  // Get from localStorage or default
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.username || user.email || 'User';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initADIChatUI);
} else {
  initADIChatUI();
}
