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

  // Check if opened from QR code scan (?code=CARD-XXXX-XXXX)
  const urlParams = new URLSearchParams(window.location.search);
  const scannedCode = urlParams.get('code');

  if (scannedCode) {
    localStorage.setItem('scannedCode', scannedCode);
    setTimeout(() => {
      openScratchModal(scannedCode);
    }, 300);
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

    const pendingCode = localStorage.getItem('scannedCode');
    if (pendingCode) {
      localStorage.removeItem('scannedCode');
      setTimeout(() => {
        openScratchModal(pendingCode);
      }, 500);
    }
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
  if (!activeCardCode) return;

  try {
    let endpoint = currentToken
      ? `/cards/${activeCardCode}/scratch`
      : `/cards/public-scratch/${activeCardCode}`;

    let headers = currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {};

    let res = await fetch(endpoint, {
      method: 'POST',
      headers,
    });

    let data = await res.json();
    
    // If authenticated request fails with authorization error (mismatched user), fallback to public scratch
    if (!res.ok && res.status === 403) {
      res = await fetch(`/cards/public-scratch/${activeCardCode}`, { method: 'POST' });
      data = await res.json();
    }

    if (!res.ok) throw new Error(data.message || 'Scratch failed');

    const resultBox = document.getElementById('prizeResultText');
    if (data.isWinner) {
      resultBox.innerHTML = `
        <div style="color:var(--primary-gold);">
          <h2 style="font-size:1.8rem; margin-bottom:0.4rem;">🎉 YOU WON!</h2>
          <p style="font-size:1.3rem; color:#fff;">${data.prize ? data.prize.title : 'Cash Prize'}</p>
          <p style="font-size:1.6rem; font-weight:800; color:var(--accent-emerald); margin-top:0.3rem;">$${data.prize ? data.prize.amount : data.result.prizeAmount}</p>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.5rem;">Show Result ID #${data.result.id} to Mall Cashier to Redeem</p>
          ${!currentToken ? `<button class="btn-gold" style="margin-top:1rem; font-size:0.85rem;" onclick="openAuthModal()">🔑 Log In / Register to Link Prize to Account</button>` : ''}
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
    const [statsRes, allCardsRes] = await Promise.all([
      fetch('/analytics/admin-stats', { headers: { 'Authorization': `Bearer ${currentToken}` } }),
      fetch('/cards/admin/all-cards', { headers: { 'Authorization': `Bearer ${currentToken}` } })
    ]);

    const stats = await statsRes.json();
    const allCards = await allCardsRes.json();
    if (!statsRes.ok) throw new Error(stats.message || 'Access denied');

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

      <!-- Master Scratch Card Inventory Table -->
      <div style="margin-top:2rem; background:rgba(15,23,42,0.5); padding:1.5rem; border-radius:12px; border:1px solid var(--border-color);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3>🎟️ Master Scratch Card Inventory & Audit Log (${Array.isArray(allCards) ? allCards.length : 0} Cards)</h3>
          <button class="btn-outline" style="padding:0.3rem 0.7rem; font-size:0.8rem;" onclick="loadAdminDashboard()">🔄 Refresh Table</button>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.85rem;">
            <thead>
              <tr style="border-bottom:1px solid var(--border-color); color:var(--text-muted);">
                <th style="padding:0.6rem;">Card Code</th>
                <th style="padding:0.6rem;">Assigned Customer</th>
                <th style="padding:0.6rem;">Status</th>
                <th style="padding:0.6rem;">Prize Outcome</th>
                <th style="padding:0.6rem;">Redemption</th>
                <th style="padding:0.6rem;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${Array.isArray(allCards) && allCards.length > 0 ? allCards.map(c => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:0.6rem; font-family:monospace; font-weight:700; color:var(--primary-gold);">${c.code}</td>
                  <td style="padding:0.6rem;">
                    <strong>${c.user ? c.user.name : 'Unknown'}</strong><br/>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${c.user ? c.user.email : ''} (ID #${c.user ? c.user.id : c.userId})</span>
                  </td>
                  <td style="padding:0.6rem;">
                    ${c.status === 'UNSCRATCHED' 
                      ? '<span style="background:rgba(234,179,8,0.2); color:#fde047; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.75rem; font-weight:700;">🟡 UNSCRATCHED</span>'
                      : '<span style="background:rgba(16,185,129,0.2); color:#34d399; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.75rem; font-weight:700;">🟢 SCRATCHED</span>'}
                  </td>
                  <td style="padding:0.6rem;">
                    ${c.result ? (c.result.prizeAmount > 0 
                      ? `<span style="color:var(--accent-emerald); font-weight:700;">🎉 ${c.result.prize ? c.result.prize.title : 'Cash Prize'} ($${c.result.prizeAmount})</span><br/><span style="font-size:0.75rem; color:var(--text-muted);">Result ID #${c.result.id}</span>`
                      : '<span style="color:var(--text-muted);">⚪ No Win ($0)</span>') : '<span style="color:var(--text-muted);">-</span>'}
                  </td>
                  <td style="padding:0.6rem;">
                    ${c.result && c.result.prizeAmount > 0 ? (c.result.isRedeemed 
                      ? '<span style="background:rgba(59,130,246,0.2); color:#60a5fa; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.75rem; font-weight:700;">🏷️ REDEEMED</span>'
                      : '<span style="background:rgba(239,68,68,0.2); color:#f87171; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.75rem; font-weight:700;">⏳ PENDING</span>') : '-'}
                  </td>
                  <td style="padding:0.6rem;">
                    ${c.status === 'UNSCRATCHED'
                      ? `<div style="display:flex; gap:0.4rem;">
                          <button class="btn-gold" style="padding:0.3rem 0.5rem; font-size:0.75rem;" onclick="openScratchModal('${c.code}')">✨ Scratch</button>
                          <button class="btn-outline" style="padding:0.3rem 0.5rem; font-size:0.75rem; color:var(--accent-cyan);" onclick="showCustomerQrModal('${c.code}')">📱 Show QR</button>
                         </div>`
                      : (c.result && c.result.prizeAmount > 0 && !c.result.isRedeemed 
                        ? `<button class="btn-gold" style="padding:0.3rem 0.6rem; font-size:0.75rem; background:linear-gradient(135deg, #10b981, #059669);" onclick="quickRedeem(${c.result.id})">Mark as Redeemed</button>`
                        : '-')}
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="6" style="padding:1rem; text-align:center; color:var(--text-muted);">No scratch cards in inventory yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    adminStatsContainer.innerHTML = `<p style="color:var(--accent-rose);">Access Denied: ${err.message}</p>`;
  }
}

async function quickRedeem(resultId) {
  try {
    const res = await fetch(`/cards/redeem/${resultId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    alert('🎉 ' + data.message);
    loadAdminDashboard();
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

function showCustomerQrModal(code) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=http://192.168.68.56:4000/?code=${code}`;
  const qrArea = document.getElementById('qrResultArea');
  if (qrArea) {
    qrArea.innerHTML = `
      <div style="background:#fff; color:#000; padding:1rem; border-radius:12px; display:inline-block; margin-top:0.5rem;">
        <p style="font-weight:700; font-size:0.85rem; margin-bottom:0.5rem;">Customer Scan QR Code</p>
        <img src="${qrUrl}" alt="Receipt QR Code" style="width:160px; height:160px;" />
        <p style="font-family:monospace; font-size:0.9rem; margin-top:0.4rem; font-weight:bold;">${code}</p>
      </div>
    `;
    window.scrollTo({ top: qrArea.offsetTop - 100, behavior: 'smooth' });
  } else {
    alert(`📱 Customer QR Code for ${code}:\nhttp://192.168.68.56:4000/?code=${code}`);
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
