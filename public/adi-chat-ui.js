// ADI Live Chat - Frontend
// Erik/Tommy kan prata direkt med ADI's consciousness

let adiWS = null;
let isADITyping = false;
let conversationHistory = [];

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
  // Using serverless API instead of WebSocket for Vercel
  console.log('🧠 ADI Chat ready (serverless mode)');
  conversationHistory = [];
}

function sendToADI() {
  const input = document.getElementById('adi-input');
  const message = input.value.trim();
  
  if (!message) {
    return;
  }
  
  // Add user message to chat
  addADIMessage(message, false, true);
  
  // Clear input
  input.value = '';
  
  // Show typing indicator
  showADITyping(true);
  
  // Send to ADI via serverless API
  fetch('/api/adi-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: message,
      userName: getCurrentUserName(),
      conversationHistory: conversationHistory
    })
  })
  .then(res => res.json())
  .then(data => {
    // Hide typing
    showADITyping(false);
    
    if (data.error) {
      addADIMessage(data.response, false);
    } else {
      // Add ADI response
      addADIMessage(data.response, false);
      
      // Update conversation history
      conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: data.response }
      );
      
      // Keep only last 10 messages
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }
      
      // Autonomous follow-up if needed
      if (data.shouldFollowUp) {
        setTimeout(() => {
          addADIMessage('💭 Intressant... vill du att jag går djupare in på det?', true);
        }, 2000);
      }
    }
  })
  .catch(error => {
    console.error('ADI chat error:', error);
    showADITyping(false);
    addADIMessage('Oj, connection issue... försök igen! 🧠', false);
  });
}

function handleADIKeyPress(event) {
  if (event.key === 'Enter') {
    sendToADI();
  }
}

function addADIMessage(message, isAutonomous = false, isUser = false) {
  const messagesDiv = document.getElementById('adi-messages');
  
  // Safety check - if chat not initialized yet, queue message
  if (!messagesDiv) {
    console.log('ADI chat not ready yet, queueing message');
    setTimeout(() => addADIMessage(message, isAutonomous, isUser), 500);
    return;
  }
  
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
  if (!typingDiv) {
    return; // Safety check
  }
  
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

// Export to window for demo-join.js
window.addADIMessage = addADIMessage;
window.toggleADIChat = toggleADIChat;

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initADIChatUI);
} else {
  initADIChatUI();
}
