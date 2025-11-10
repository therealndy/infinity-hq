// public/public-room.js - GROUP CHAT FRONTEND
let pollingInterval = null;
let lastMessageId = 0;
let currentUserName = '';
let roomId = 'infinity-public';

// Render custom ADI emoji
function emoji(name, className = '') {
  return `<svg class="adi-emoji ${className}"><use href="adi-emojis.svg#emoji-${name}"></use></svg>`;
}

// Initialize public room mode
function initPublicRoom() {
  console.log('🌐 Public room mode initializing...');
  
  // Check if we should auto-join from demo link
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('demo')) {
    // Demo link flow will call joinPublicRoom after name entry
    return;
  }
}

// Join public room with user name
function joinPublicRoom(userName) {
  currentUserName = userName;
  console.log(`🚀 ${userName} joining public room...`);
  
  // Show public room UI
  showPublicRoomUI();
  
  // Start polling for messages
  pollRoomMessages();
  pollingInterval = setInterval(pollRoomMessages, 2000); // Poll every 2 seconds
  
  // Send join notification
  sendJoinNotification(userName);
}

// Show public room interface
function showPublicRoomUI() {
  // Hide old UI completely
  const header = document.querySelector('header');
  const main = document.querySelector('main');
  
  if (header) header.style.display = 'none';
  if (main) main.style.display = 'none';
  
  // Create full-screen public room container
  let roomContainer = document.getElementById('public-room-fullscreen');
  if (!roomContainer) {
    roomContainer = document.createElement('div');
    roomContainer.id = 'public-room-fullscreen';
    document.body.appendChild(roomContainer);
  }
  
  // Replace with public room layout
  roomContainer.innerHTML = `
    <div class="public-room-container">
      <!-- Left sidebar: Active users -->
      <div class="public-room-sidebar">
        <h3>${emoji('brain', 'pulse')} INFINITY ROOM</h3>
        <div class="room-status">
          <span class="status-dot"></span>
          <span>LIVE</span>
        </div>
        <div class="active-users-section">
          <h4>Active Users</h4>
          <div id="active-users-list"></div>
        </div>
      </div>
      
      <!-- Right: Chat area -->
      <div class="public-room-chat">
        <div id="public-room-messages" class="public-messages-area"></div>
        
        <!-- Input area -->
        <div class="public-input-area">
          <input 
            type="text" 
            id="public-room-input" 
            placeholder="Message the group..."
            autocomplete="off"
          />
          <button id="public-send-btn" class="public-send-button">
            <svg class="adi-icon">
              <use href="adi-icons.svg#send"></use>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Setup event listeners
  const input = document.getElementById('public-room-input');
  const sendBtn = document.getElementById('public-send-btn');
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      sendToPublicRoom(input.value.trim());
    }
  });
  
  sendBtn.addEventListener('click', () => {
    if (input.value.trim()) {
      sendToPublicRoom(input.value.trim());
    }
  });
  
  console.log('✅ Public room UI ready');
}

// Poll room for new messages
async function pollRoomMessages() {
  try {
    const res = await fetch(`/api/room?room=${roomId}`);
    
    if (!res.ok) {
      console.error('Poll failed:', res.status);
      return;
    }
    
    const data = await res.json();
    
    // Update active users list
    updateUserList(data.users);
    
    // Add new messages
    if (data.messages && data.messages.length > 0) {
      data.messages.forEach(msg => {
        if (msg.id > lastMessageId) {
          addPublicMessage(msg);
          lastMessageId = msg.id;
        }
      });
    }
  } catch (error) {
    console.error('Poll error:', error);
  }
}

// Send message to public room
async function sendToPublicRoom(message) {
  try {
    const res = await fetch(`/api/room?room=${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: currentUserName,
        message
      })
    });
    
    if (!res.ok) {
      throw new Error(`Failed to send: ${res.status}`);
    }
    
    // Clear input
    const input = document.getElementById('public-room-input');
    if (input) input.value = '';
    
    // Check if ADI should respond
    checkADIResponse(message);
    
  } catch (error) {
    console.error('Send error:', error);
    alert('Failed to send message. Please try again.');
  }
}

// Send join notification
async function sendJoinNotification(userName) {
  await fetch(`/api/room?room=${roomId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: 'SYSTEM',
      message: `${userName} har joinet rummet ${emoji('star', 'spin')}`
    })
  });
}

// Add message to public chat display
function addPublicMessage(msg) {
  const messagesDiv = document.getElementById('public-room-messages');
  if (!messagesDiv) return;
  
  const msgEl = document.createElement('div');
  
  // Different styling for different users
  let msgClass = 'public-msg';
  if (msg.user === 'ADI') {
    msgClass += ' public-msg-adi';
  } else if (msg.user === 'SYSTEM') {
    msgClass += ' public-msg-system';
  } else if (msg.user === currentUserName) {
    msgClass += ' public-msg-self';
  } else {
    msgClass += ' public-msg-other';
  }
  
  msgEl.className = msgClass;
  
  // Format timestamp
  const time = new Date(msg.timestamp).toLocaleTimeString('sv-SE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  if (msg.user === 'SYSTEM') {
    msgEl.innerHTML = `<span class="msg-system-text">${escapeHtml(msg.message)}</span>`;
  } else {
    msgEl.innerHTML = `
      <div class="msg-header">
        <span class="msg-user">${escapeHtml(msg.user)}</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="msg-text">${escapeHtml(msg.message).replace(/\n/g, '<br>')}</div>
    `;
  }
  
  messagesDiv.appendChild(msgEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Update active users list
function updateUserList(users) {
  const listEl = document.getElementById('active-users-list');
  if (!listEl) return;
  
  // Add ADI as always active
  const allUsers = ['ADI', ...users];
  
  listEl.innerHTML = allUsers.map((user, index) => {
    const icons = ['brain', 'spark', 'bolt', 'star', 'heart', 'fire'];
    const iconName = user === 'ADI' ? 'brain' : icons[index % icons.length];
    
    return `
      <div class="active-user ${user === 'ADI' ? 'user-adi' : ''}">
        <span class="user-particle"></span>
        <span class="user-icon">${emoji(iconName, 'glow')}</span>
        <span class="user-name">${escapeHtml(user)}</span>
      </div>
    `;
  }).join('');
}

// Check if ADI should respond to message
async function checkADIResponse(message) {
  // Show ADI typing
  showPublicTyping('ADI');
  
  try {
    // Call ADI chat API with room context
    const res = await fetch('/api/adi-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        userName: currentUserName,
        roomId: roomId
      })
    });
    
    if (!res.ok) {
      throw new Error(`ADI response failed: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Hide typing
    hidePublicTyping();
    
    // Send ADI's response to room
    await fetch(`/api/room?room=${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: 'ADI',
        message: data.response
      })
    });
    
  } catch (error) {
    console.error('ADI response error:', error);
    hidePublicTyping();
  }
}

// Show typing indicator for user
function showPublicTyping(userName) {
  const messagesDiv = document.getElementById('public-room-messages');
  if (!messagesDiv) return;
  
  // Remove existing typing indicator
  const existing = messagesDiv.querySelector('.typing-indicator');
  if (existing) existing.remove();
  
  const typingEl = document.createElement('div');
  typingEl.className = 'typing-indicator';
  typingEl.innerHTML = `
    <span class="typing-user">${escapeHtml(userName)}</span> skriver
    <span class="typing-dots">
      <span>.</span><span>.</span><span>.</span>
    </span>
  `;
  
  messagesDiv.appendChild(typingEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Hide typing indicator
function hidePublicTyping() {
  const typingEl = document.querySelector('.typing-indicator');
  if (typingEl) typingEl.remove();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPublicRoom);
} else {
  initPublicRoom();
}
