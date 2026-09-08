let currentToken = localStorage.getItem('accessToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let activeCardCode = null;

// Canvas Scratch Engine Variables
const canvas = document.getElementById('scratchCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let isScratching = false;
let hasScratchedTriggered = false;

// 1. Initialize App & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  updateUserUI();
  if (canvas) {
    setupCanvasEvents();
  }
  loadActiveTabData();
});

// 2. Tab Navigation
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  const selectedTab = document.getElementById(tabName + 'Tab');
  if (selectedTab) selectedTab.classList.add('active');

  const navBtn = document.getElementById(tabName + 'NavBtn');
  if (navBtn) navBtn.classList.add('active');

  loadTabContent(tabName);
}

function loadTabContent(tabName) {
  if (tabName === 'cards') loadMyCards();
  if (tabName === 'leaderboard') loadLeaderboard();
  if (tabName === 'admin') loadAdminDashboard();
}

function loadActiveTabData() {
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    const tabName = activeTab.id.replace('Tab', '');
    loadTabContent(tabName);
  }
}

// 3. User & Auth UI Updates
function updateUserUI() {
  const userContainer = document.getElementById('userContainer');
  const adminNavBtn = document.getElementById('adminNavBtn');

  if (currentToken && currentUser) {
    if (userContainer) {
      userContainer.innerHTML = `
        <div class="user-badge">
          <span>👤 ${currentUser.email}</span>
          <span class="role-pill">${currentUser.role}</span>
        </div>
        <button class="btn-outline" style="padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="logout()">Logout</button>
      `;
    }
    if (adminNavBtn) {
      adminNavBtn.style.display = currentUser.role === 'ADMIN' ? 'block' : 'none';
    }
  } else {
    if (userContainer) {
      userContainer.innerHTML = `
        <button class="btn-gold" onclick="openAuthModal()">Login / Register</button>
      `;
    }
    if (adminNavBtn) adminNavBtn.style.display = 'none';
  }
}

// 4. Auth Modal & Forms
function openAuthModal() {
  document.getElementById('authModal').classList.add('active');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('active');
}

function toggleAuthMode(mode) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');

  if (mode === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    currentToken = data.accessToken;
    currentUser = data.user;
    localStorage.setItem('accessToken', currentToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    alert('🎉 Login successful!');
    closeAuthModal();
    updateUserUI();
    loadActiveTabData();
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');

    currentToken = data.accessToken;
    currentUser = data.user;
    localStorage.setItem('accessToken', currentToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    alert('🎉 Registered successfully!');
    closeAuthModal();
    updateUserUI();
    loadActiveTabData();
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
  currentToken = null;
  currentUser = null;
  updateUserUI();
  location.reload();
}

// 5. My Cards Wallet View
async function loadMyCards() {
  const cardsGrid = document.getElementById('cardsGrid');
  if (!cardsGrid) return;

  if (!currentToken) {
    cardsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 0;">
        <p style="color: var(--text-muted); font-size: 1.1rem; margin-bottom: 1rem;">Please login to view and scratch your cards.</p>
        <button class="btn-gold" onclick="openAuthModal()">Login Now</button>
      </div>
    `;
    return;
  }

  try {
    const res = await fetch('/cards/my-cards', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });

    if (!res.ok) throw new Error('Failed to load scratch cards');
    const cards = await res.json();

    if (cards.length === 0) {
      cardsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 0;">
          <p style="color: var(--text-muted); font-size: 1.1rem;">You don't have any scratch cards yet!</p>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">Ask the mall cashier for a Scratch Card code on your bill receipt.</p>
        </div>
      `;
      return;
    }

    cardsGrid.innerHTML = cards.map(c => `
      <div class="ticket-card">
        <span class="status-tag ${c.status === 'UNSCRATCHED' ? 'status-unscratched' : 'status-scratched'}">${c.status}</span>
        <div class="ticket-code">${c.code}</div>
        ${c.status === 'UNSCRATCHED' 
          ? `<button class="btn-gold" style="width:100%; margin-top:0.8rem;" onclick="openScratchModal('${c.code}')">✨ Scratch Card</button>` 
          : `<p style="color:var(--text-muted); font-size:0.85rem; margin-top:0.5rem;">Already Scratched</p>`}
      </div>
    `).join('');
  } catch (err) {
    cardsGrid.innerHTML = `<p style="color: var(--accent-rose);">Failed to load cards: ${err.message}</p>`;
  }
}

// 6. Interactive Canvas Scratch Engine
function initScratchFoil() {
  if (!ctx) return;
  ctx.globalCompositeOperation = 'source-over';
  
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#cbd5e1');
  grad.addColorStop(0.5, '#94a3b8');
  grad.addColorStop(1, '#64748b');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨ SCRATCH WITH MOUSE HERE ✨', canvas.width / 2, canvas.height / 2 + 6);
  hasScratchedTriggered = false;
}

function setupCanvasEvents() {
  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const doScratch = (e) => {
    if (!isScratching) return;
    e.preventDefault();
    const pos = getPos(e);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
    ctx.fill();

    checkScratchProgress();
  };

  canvas.addEventListener('mousedown', () => isScratching = true);
  canvas.addEventListener('mouseup', () => isScratching = false);
  canvas.addEventListener('mouseleave', () => isScratching = false);
  canvas.addEventListener('mousemove', doScratch);

  canvas.addEventListener('touchstart', (e) => { isScratching = true; doScratch(e); });
  canvas.addEventListener('touchend', () => isScratching = false);
  canvas.addEventListener('touchmove', doScratch);
}

function checkScratchProgress() {
  if (hasScratchedTriggered) return;
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imgData.data;
  let transparentPixels = 0;

  for (let i = 3; i < pixels.length; i += 16) {
    if (pixels[i] === 0) transparentPixels++;
  }

  const totalSampled = pixels.length / 16;
  const scratchedPercent = (transparentPixels / totalSampled) * 100;

  if (scratchedPercent > 35) {
    hasScratchedTriggered = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    executeScratchBackend();
  }
}

async function openScratchModal(code) {
  activeCardCode = code;
  document.getElementById('scratchModal').classList.add('active');
  document.getElementById('prizeResultText').innerHTML = `
    <span style="font-size:1rem; color:var(--text-muted);">Scratch the foil to reveal your prize!</span>
  `;
  initScratchFoil();
}

async function executeScratchBackend() {
  if (!activeCardCode || !currentToken) return;

  try {
    const res = await fetch(`/cards/${activeCardCode}/scratch`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Scratch failed');

    const resultBox = document.getElementById('prizeResultText');
    if (data.isWinner) {
      resultBox.innerHTML = `
        <div style="color:var(--primary-gold);">
          <h2 style="font-size:1.8rem; margin-bottom:0.4rem;">🎉 YOU WON!</h2>
          <p style="font-size:1.3rem; color:#fff;">${data.prize.title}</p>
          <p style="font-size:1.6rem; font-weight:800; color:var(--accent-emerald); margin-top:0.3rem;">$${data.prize.amount}</p>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">Show Result ID #${data.result.id} to Mall Cashier to Redeem</p>
        </div>
      `;
    } else {
      resultBox.innerHTML = `
        <div style="color:var(--text-muted);">
          <h3 style="font-size:1.4rem;">😢 Better Luck Next Time!</h3>
          <p style="font-size:0.9rem; margin-top:0.3rem;">Keep shopping to earn more scratch cards!</p>
        </div>
      `;
    }
  } catch (err) {
    document.getElementById('prizeResultText').innerHTML = `
      <p style="color:var(--accent-rose); font-size:1rem;">❌ ${err.message}</p>
    `;
  }
}

function closeScratchModal() {
  document.getElementById('scratchModal').classList.remove('active');
  activeCardCode = null;
  loadMyCards();
}

// 7. Leaderboard View
async function loadLeaderboard() {
  const tbody = document.querySelector('#leaderboardTable tbody');
  if (!tbody) return;

  try {
    const res = await fetch('/analytics/leaderboard', {
      headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No winners on the leaderboard yet! Be the first to scratch and win!</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((u, index) => {
      const badge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
      return `
        <tr>
          <td style="font-size:1.2rem; font-weight:700;">${badge}</td>
          <td><strong>${u.name || 'Anonymous Player'}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(${u.email})</span></td>
          <td style="font-weight:700; color:var(--accent-emerald);">$${u.totalWon}</td>
          <td>${u.winsCount} Wins</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--accent-rose);">Failed to load leaderboard: ${err.message}</td></tr>`;
  }
}

// 8. Admin Panel View
async function loadAdminDashboard() {
  const adminStatsContainer = document.getElementById('adminStats');
  if (!adminStatsContainer || !currentToken) return;

  try {
    const res = await fetch('/analytics/admin-stats', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });

    const stats = await res.json();
    if (!res.ok) throw new Error(stats.message || 'Access denied');

    adminStatsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div style="font-size:0.85rem; color:var(--text-muted);">Total Customers</div>
          <div class="stat-val">${stats.totalUsers}</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.85rem; color:var(--text-muted);">Cards Issued</div>
          <div class="stat-val">${stats.totalCardsIssued}</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.85rem; color:var(--text-muted);">Cards Scratched</div>
          <div class="stat-val" style="color:var(--accent-cyan);">${stats.totalCardsScratched}</div>
        </div>
        <div class="stat-card">
          <div style="font-size:0.85rem; color:var(--text-muted);">Total Prize Cash</div>
          <div class="stat-val" style="color:var(--accent-emerald);">$${stats.totalPrizeMoneyAwarded}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-top:2rem;">
        <!-- Issue Card Form -->
        <div style="background:rgba(15,23,42,0.5); padding:1.5rem; border-radius:12px; border:1px solid var(--border-color);">
          <h3>🎟️ Cashier Counter: Issue Scratch Card</h3>
          <form onsubmit="handleIssueCard(event)" style="margin-top:1rem;">
            <div class="form-group">
              <label>Customer User ID</label>
              <input type="number" id="issueUserId" class="form-control" placeholder="e.g. 1" required />
            </div>
            <button type="submit" class="btn-gold">Issue Card & Generate Receipt QR</button>
          </form>
          <div id="qrResultArea" style="margin-top:1rem; text-align:center;"></div>
        </div>

        <!-- Prize Redemption Form -->
        <div style="background:rgba(15,23,42,0.5); padding:1.5rem; border-radius:12px; border:1px solid var(--border-color);">
          <h3>🏷️ Cashier Counter: Redeem Prize</h3>
          <form onsubmit="handleRedeemPrize(event)" style="margin-top:1rem;">
            <div class="form-group">
              <label>Winning Result ID</label>
              <input type="number" id="redeemResultId" class="form-control" placeholder="e.g. 1" required />
            </div>
            <button type="submit" class="btn-gold" style="background:linear-gradient(135deg, #10b981, #059669); color:#fff;">Mark as REDEEMED</button>
          </form>
        </div>
      </div>
    `;
  } catch (err) {
    adminStatsContainer.innerHTML = `<p style="color:var(--accent-rose);">Access Denied: ${err.message}</p>`;
  }
}

async function handleIssueCard(e) {
  e.preventDefault();
  const userId = parseInt(document.getElementById('issueUserId').value);

  try {
    const res = await fetch('/cards/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Issuance failed');

    const qrArea = document.getElementById('qrResultArea');
    qrArea.innerHTML = `
      <div style="background:#fff; color:#000; padding:1rem; border-radius:12px; display:inline-block; margin-top:0.5rem;">
        <p style="font-weight:700; font-size:0.85rem; margin-bottom:0.5rem;">Printable Receipt QR Code</p>
        <img src="${data.qrCodeUrl}" alt="Receipt QR Code" style="width:140px; height:140px;" />
        <p style="font-family:monospace; font-size:0.9rem; margin-top:0.4rem;">${data.card.code}</p>
      </div>
    `;
    alert(`🎉 Success! Issued Card Code: ${data.card.code} for User ID ${userId}`);
    document.getElementById('issueUserId').value = '';
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

async function handleRedeemPrize(e) {
  e.preventDefault();
  const resultId = parseInt(document.getElementById('redeemResultId').value);

  try {
    const res = await fetch(`/cards/redeem/${resultId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
      },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Redemption failed');

    alert(`🎉 ${data.message}`);
    document.getElementById('redeemResultId').value = '';
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}
