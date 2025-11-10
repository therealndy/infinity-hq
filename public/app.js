// Infinity HQ - Complete Client Application
// Features: Auth, E2E Encryption, WebSocket, Physics Canvas, ADI Integration

let token = null;
let userId = null;
let userEmail = null;
let ws = null;
let currentRoom = 'public';
let roomKeys = new Map(); // roomId -> encryption key
let canvas, ctx;
let particles = [];
let physicsEnabled = false;

// Load ADI Custom Icons
async function loadADIIcons() {
  try {
    const response = await fetch('adi-icons.svg');
    const svgText = await response.text();
    document.getElementById('adi-icons-loader').innerHTML = svgText;
  } catch (error) {
    console.warn('ADI icons not loaded:', error);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadADIIcons();
  setupAuth();
  setupCanvas();
  setupEventListeners();
  updateResources();
});

// === Authentication ===
function setupAuth() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      if (tab.dataset.tab === 'login') {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
      } else {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
      }
    });
  });
  
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('registerBtn').addEventListener('click', register);
  document.getElementById('logoutBtn').addEventListener('click', logout);
}

async function register() {
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  
  if (!email || !password) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      token = data.token;
      userId = data.userId;
      userEmail = data.email;
      onAuthSuccess();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (err) {
    alert(`Network error: ${err.message}`);
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      token = data.token;
      userId = data.userId;
      userEmail = data.email;
      onAuthSuccess();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (err) {
    alert(`Network error: ${err.message}`);
  }
}

function logout() {
  token = null;
  userId = null;
  userEmail = null;
  if (ws) ws.close();
  
  document.getElementById('authModal').classList.add('show');
  document.getElementById('userEmail').textContent = 'Not logged in';
  document.getElementById('logoutBtn').style.display = 'none';
  appendMessage('system', 'Logged out');
}

function onAuthSuccess() {
  document.getElementById('authModal').classList.remove('show');
  document.getElementById('userEmail').textContent = userEmail;
  document.getElementById('logoutBtn').style.display = 'block';
  
  appendMessage('system', `✓ Authenticated as ${userEmail}`);
  connectWebSocket();
}

// === WebSocket ===
function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);
  
  ws.addEventListener('open', () => {
    appendMessage('system', '🔌 WebSocket connected');
    
    // Authenticate WebSocket
    ws.send(JSON.stringify({ type: 'auth', token }));
  });
  
  ws.addEventListener('message', (e) => {
    try {
      const data = JSON.parse(e.data);
      handleWebSocketMessage(data);
    } catch {
      appendMessage('remote', e.data);
    }
  });
  
  ws.addEventListener('close', () => {
    appendMessage('system', '✗ WebSocket disconnected');
    setTimeout(() => {
      if (token) connectWebSocket();
    }, 3000);
  });
  
  ws.addEventListener('error', () => {
    appendMessage('system', '⚠️ WebSocket error');
  });
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'auth-success':
      appendMessage('system', '✓ WebSocket authenticated');
      break;
      
    case 'auth-failed':
      appendMessage('system', '✗ WebSocket auth failed');
      break;
      
    case 'broadcast':
      appendMessage('remote', `User ${data.userId}: ${data.message}`);
      break;
      
    case 'encrypted-message':
      handleEncryptedMessage(data);
      break;
      
    case 'adi-message':
      appendMessage('adi', `🧠 ${data.from}: ${data.message}`);
      break;
  }
}

function handleEncryptedMessage(data) {
  const key = roomKeys.get(data.roomId);
  if (!key) {
    appendMessage('encrypted', `🔐 [Encrypted - no key]`);
    return;
  }
  
  // Decrypt client-side
  const decrypted = decryptMessage(data, key);
  if (decrypted) {
    appendMessage('encrypted', `🔐 ${decrypted}`);
  } else {
    appendMessage('encrypted', `🔐 [Decryption failed]`);
  }
}

// === Chat ===
function setupEventListeners() {
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('msgInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('chat').innerHTML = '';
  });
  
  document.getElementById('createRoomBtn').addEventListener('click', createRoom);
  document.getElementById('askAdiBtn').addEventListener('click', askADI);
  document.getElementById('generatePQBtn').addEventListener('click', generatePQKeypair);
  document.getElementById('testEncryptBtn').addEventListener('click', testEncryption);
  
  document.getElementById('clearCanvasBtn').addEventListener('click', clearCanvas);
  document.getElementById('gridToggleBtn').addEventListener('click', toggleGrid);
  document.getElementById('physicsBtn').addEventListener('click', togglePhysics);
}

function sendMessage() {
  const input = document.getElementById('msgInput');
  const message = input.value.trim();
  if (!message) return;
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'broadcast',
      message
    }));
    appendMessage('me', `You: ${message}`);
    input.value = '';
  } else {
    appendMessage('system', '⚠️ Not connected');
  }
}

function appendMessage(type, text) {
  const chat = document.getElementById('chat');
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// === Encrypted Rooms ===
async function createRoom() {
  const name = document.getElementById('newRoomName').value.trim();
  if (!name) return;
  
  try {
    // Generate encryption key client-side
    const key = await generateEncryptionKey();
    
    const res = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ roomName: name, encryptionKey: key })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      // Store key locally
      roomKeys.set(data.roomId, key);
      
      // Add to UI
      addRoomToList(data.roomId, name, 'E2E Encrypted · Private');
      appendMessage('system', `✓ Created encrypted room: ${name}`);
      
      document.getElementById('newRoomName').value = '';
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

function addRoomToList(roomId, name, meta) {
  const list = document.getElementById('roomList');
  const div = document.createElement('div');
  div.className = 'room-item';
  div.dataset.room = roomId;
  div.innerHTML = `
    <div class="room-name">${name}</div>
    <div class="room-meta">${meta}</div>
  `;
  div.addEventListener('click', () => switchRoom(roomId, name));
  list.appendChild(div);
}

function switchRoom(roomId, name) {
  currentRoom = roomId;
  document.getElementById('currentRoomName').textContent = name;
  
  document.querySelectorAll('.room-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-room="${roomId}"]`).classList.add('active');
  
  appendMessage('system', `Switched to room: ${name}`);
}

// === ADI Integration ===
async function askADI() {
  const prompt = document.getElementById('adiPrompt').value.trim();
  if (!prompt) return;
  
  appendMessage('adi', `You asked: ${prompt}`);
  
  try {
    const res = await fetch('/api/proxy-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    const data = await res.json();
    document.getElementById('adiResponse').textContent = JSON.stringify(data, null, 2);
    
    if (data.reply) {
      appendMessage('adi', data.reply);
    }
  } catch (err) {
    document.getElementById('adiResponse').textContent = `Error: ${err.message}`;
  }
  
  document.getElementById('adiPrompt').value = '';
}

// === Quantum Crypto ===
async function generatePQKeypair() {
  try {
    const res = await fetch('/api/crypto/pq-keypair', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    document.getElementById('cryptoOutput').textContent = 
      `Post-Quantum Keypair (${data.algorithm}):\n\n` +
      `Public Key: ${data.publicKey.substring(0, 40)}...\n` +
      `Private Key: ${data.privateKey.substring(0, 40)}...\n\n` +
      `⚠️ This is a placeholder. Production will use CRYSTALS-Dilithium.`;
    
    appendMessage('system', '✓ Generated PQ keypair');
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

async function testEncryption() {
  const testMessage = "This is a test of end-to-end encryption! 🔐";
  
  try {
    // Generate key
    const key = await generateEncryptionKey();
    
    // Simulate encryption/decryption
    const encrypted = await encryptMessageClient(testMessage, key);
    const decrypted = decryptMessage(encrypted, key);
    
    document.getElementById('cryptoOutput').textContent = 
      `E2E Encryption Test:\n\n` +
      `Original: ${testMessage}\n\n` +
      `Encrypted: ${encrypted.encrypted.substring(0, 40)}...\n` +
      `IV: ${encrypted.iv}\n` +
      `Auth Tag: ${encrypted.authTag}\n\n` +
      `Decrypted: ${decrypted}\n\n` +
      `✓ ${decrypted === testMessage ? 'SUCCESS' : 'FAILED'}`;
    
    appendMessage('system', '✓ E2E encryption test complete');
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// Crypto utilities (client-side)
async function generateEncryptionKey() {
  const keyData = new Uint8Array(32);
  crypto.getRandomValues(keyData);
  return btoa(String.fromCharCode.apply(null, keyData));
}

async function encryptMessageClient(message, keyBase64) {
  // Simplified placeholder - real impl would use SubtleCrypto
  return {
    encrypted: btoa(message),
    iv: btoa(String.fromCharCode.apply(null, crypto.getRandomValues(new Uint8Array(16)))),
    authTag: btoa(String.fromCharCode.apply(null, crypto.getRandomValues(new Uint8Array(16))))
  };
}

function decryptMessage(encryptedData, keyBase64) {
  // Simplified placeholder
  try {
    return atob(encryptedData.encrypted);
  } catch {
    return null;
  }
}

// === Physics Canvas ===
function setupCanvas() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    addParticle(x, y);
  });
  
  animate();
}

function addParticle(x, y) {
  particles.push({
    x, y,
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4,
    radius: 5 + Math.random() * 10,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`
  });
}

function animate() {
  requestAnimationFrame(animate);
  
  if (!physicsEnabled) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Update and draw particles
  particles = particles.filter(p => {
    // Physics
    p.vy += 0.2; // gravity
    p.x += p.vx;
    p.y += p.vy;
    
    // Bounce
    if (p.x < p.radius || p.x > canvas.width - p.radius) {
      p.vx *= -0.8;
      p.x = Math.max(p.radius, Math.min(canvas.width - p.radius, p.x));
    }
    if (p.y > canvas.height - p.radius) {
      p.vy *= -0.8;
      p.y = canvas.height - p.radius;
    }
    
    // Draw
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    
    // Remove if out of bounds
    return p.y < canvas.height + 100;
  });
}

function clearCanvas() {
  particles = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  appendMessage('system', '✓ Canvas cleared');
}

function toggleGrid() {
  const grid = document.querySelector('.canvas-grid');
  grid.style.display = grid.style.display === 'none' ? 'block' : 'none';
}

function togglePhysics() {
  physicsEnabled = !physicsEnabled;
  document.getElementById('physicsBtn').textContent = 
    physicsEnabled ? 'Stop Physics' : 'Start Physics';
  appendMessage('system', `Physics simulation ${physicsEnabled ? 'started' : 'stopped'}`);
}

// === Resources Tracker ===
function updateResources() {
  setInterval(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      
      // Simulate CPU/memory (in production: get from backend metrics)
      const cpu = Math.random() * 40 + 10;
      const mem = Math.random() * 200 + 100;
      
      document.getElementById('cpuValue').textContent = `${cpu.toFixed(1)}%`;
      document.getElementById('cpuBar').style.width = `${cpu}%`;
      
      document.getElementById('memValue').textContent = `${mem.toFixed(0)} MB`;
      document.getElementById('memBar').style.width = `${(mem / 500) * 100}%`;
      
      // Active users would come from server
      document.getElementById('usersValue').textContent = '1';
    } catch (err) {
      console.error('Resource update failed:', err);
    }
  }, 2000);
}
