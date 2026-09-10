'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

// ----------------------------------------------------------------------
// 1. Customer Scratch Arena Modal (Instant Scratching)
// ----------------------------------------------------------------------
function AdminScratchModal({ code, onClose, onSuccess }) {
  const canvasRef = useRef(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Fill metallic silver coating
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e293b';
    ctx.font = '600 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Drag Mouse / Touch to Scratch', canvas.width / 2, canvas.height / 2);

    let isDrawing = false;
    let hasTriggered = false;

    const triggerReveal = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/cards/public-scratch/${code}`, {
          method: 'POST',
        });
        const data = await res.json();
        setResult(data);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onSuccess();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();

      if (!hasTriggered) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let clearPixels = 0;
        for (let i = 3; i < imageData.data.length; i += 4) {
          if (imageData.data[i] === 0) clearPixels++;
        }
        const percent = (clearPixels / (canvas.width * canvas.height)) * 100;
        if (percent > 35) {
          hasTriggered = true;
          triggerReveal();
        }
      }
    };

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handleStart = (e) => {
      isDrawing = true;
      const pos = getPos(e);
      scratch(pos.x, pos.y);
    };
    const handleMove = (e) => {
      if (!isDrawing) return;
      const pos = getPos(e);
      scratch(pos.x, pos.y);
    };
    const handleEnd = () => { isDrawing = false; };

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    canvas.addEventListener('touchstart', handleStart);
    canvas.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [code]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center relative shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white font-semibold text-sm">✕</button>
        <h3 className="text-lg font-bold text-white mb-1">Customer Scratch Arena</h3>
        <p className="text-xs text-amber-400 font-mono mb-4">{code}</p>

        <div className="relative w-[280px] h-[150px] mx-auto rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            {loading ? (
              <div className="text-amber-400 font-semibold text-xs">Processing Outcome...</div>
            ) : result ? (
              result.isWinner ? (
                <div>
                  <div className="text-xl font-black text-amber-400">WINNER!</div>
                  <div className="text-xs font-bold text-white mt-1">{result.prize ? result.prize.title : 'Cash Prize'}</div>
                  <div className="text-lg font-extrabold text-emerald-400 mt-1">${result.prize ? result.prize.amount : result.result.prizeAmount}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Result ID #{result.result.id}</div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-bold text-slate-400">Better Luck Next Time</div>
                  <div className="text-[11px] text-slate-500 mt-1">No winning combination</div>
                </div>
              )
            ) : (
              <div className="text-xs text-slate-500">Scratch the silver coating above</div>
            )}
          </div>
          <canvas ref={canvasRef} width={280} height={150} className="relative z-10 cursor-pointer touch-none" />
        </div>

        <button onClick={onClose} className="mt-6 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-5 py-2 rounded-lg transition-all">
          Done / Close
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. Main Enterprise Admin Dashboard Page
// ----------------------------------------------------------------------
export default function AdminPage() {
  const { token, user, updateUser, logout } = useAuth();
  
  // Navigation State: 'overview' | 'users' | 'cards' | 'payouts' | 'prizes' | 'pos' | 'settings'
  const [activeTab, setActiveTab] = useState('overview');

  // Check URL query parameters for ?tab=settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Settings Form State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileStatus, setProfileStatus] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileStatus(null);
    setProfileLoading(true);
    try {
      const res = await fetch('http://localhost:4000/auth/update-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: profileName, email: profileEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      updateUser(data.accessToken, data.user);
      setProfileStatus({ type: 'success', text: data.message || 'Profile updated successfully!' });
    } catch (err) {
      setProfileStatus({ type: 'error', text: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch('http://localhost:4000/auth/change-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');

      setPasswordStatus({ type: 'success', text: data.message || 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Stats State
  const [stats, setStats] = useState(null);

  // Users Tab State
  const [usersData, setUsersData] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [usersSearch, setUsersSearch] = useState('');

  // Cards Tab State
  const [cardsData, setCardsData] = useState([]);
  const [cardsPagination, setCardsPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [cardsSearch, setCardsSearch] = useState('');
  const [cardsStatusFilter, setCardsStatusFilter] = useState('ALL');

  // Payouts Tab State
  const [payoutsData, setPayoutsData] = useState([]);
  const [payoutsPagination, setPayoutsPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [payoutsSearch, setPayoutsSearch] = useState('');

  // Prizes Tab State
  const [prizesList, setPrizesList] = useState([]);
  const [prizeTitle, setPrizeTitle] = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [prizeProb, setPrizeProb] = useState('');
  const [prizeQty, setPrizeQty] = useState('');

  // POS Issue Card Form State
  const [issueUserId, setIssueUserId] = useState('');
  const [issueBillAmount, setIssueBillAmount] = useState('');
  const [issuedQrCodeUrl, setIssuedQrCodeUrl] = useState(null);
  const [issuedCardCode, setIssuedCardCode] = useState(null);

  // Modals
  const [activeScratchCode, setActiveScratchCode] = useState(null);
  const [activeQrCodeUrl, setActiveQrCodeUrl] = useState(null);
  const [activeQrCardCode, setActiveQrCardCode] = useState(null);

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:4000/analytics/admin-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  // Fetch Users (Paginated & Searchable)
  const fetchUsers = async (page = usersPagination.page, search = usersSearch) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:4000/auth/admin/users?page=${page}&limit=10&search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setUsersData(payload.data || []);
        setUsersPagination(payload.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
      }
    } catch (err) {
      console.error('Users fetch error:', err);
    }
  };

  // Fetch Cards (Paginated, Filtered & Searchable)
  const fetchCards = async (page = cardsPagination.page, search = cardsSearch, status = cardsStatusFilter) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:4000/cards/admin/all-cards?page=${page}&limit=10&status=${status}&search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setCardsData(payload.data || []);
        setCardsPagination(payload.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
      }
    } catch (err) {
      console.error('Cards fetch error:', err);
    }
  };

  // Fetch Payouts (Paginated & Searchable)
  const fetchPayouts = async (page = payoutsPagination.page, search = payoutsSearch) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:4000/analytics/admin/payouts?page=${page}&limit=10&search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (res.ok) {
        setPayoutsData(payload.data || []);
        setPayoutsPagination(payload.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
      }
    } catch (err) {
      console.error('Payouts fetch error:', err);
    }
  };

  // Fetch Prize Pool List
  const fetchPrizes = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:4000/prizes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setPrizesList(data);
    } catch (err) {
      console.error('Prizes fetch error:', err);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchStats();
    fetchUsers(1, '');
    fetchCards(1, '', 'ALL');
    fetchPayouts(1, '');
    fetchPrizes();
  }, [token]);

  // Tab Switching Actions
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    fetchStats();
    if (tabName === 'users') fetchUsers(1, usersSearch);
    if (tabName === 'cards') fetchCards(1, cardsSearch, cardsStatusFilter);
    if (tabName === 'payouts') fetchPayouts(1, payoutsSearch);
    if (tabName === 'prizes') fetchPrizes();
  };

  // KPI Metric Card Click Handlers
  const handleKpiClick = (type) => {
    if (type === 'users') {
      handleTabChange('users');
    } else if (type === 'cards_all') {
      setCardsStatusFilter('ALL');
      fetchCards(1, '', 'ALL');
      setActiveTab('cards');
    } else if (type === 'cards_scratched') {
      setCardsStatusFilter('SCRATCHED');
      fetchCards(1, '', 'SCRATCHED');
      setActiveTab('cards');
    } else if (type === 'payouts') {
      handleTabChange('payouts');
    }
  };

  // Helper for Tier Badges
  const getTierBadge = (amount) => {
    const amt = Number(amount) || 0;
    if (amt >= 10000) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          👑 VIP Platinum (${amt.toLocaleString()})
        </span>
      );
    } else if (amt >= 5000) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
          🥇 Gold (${amt.toLocaleString()})
        </span>
      );
    } else if (amt >= 2000) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-400/20 text-slate-200 border border-slate-400/30">
          🥈 Silver (${amt.toLocaleString()})
        </span>
      );
    } else {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-800/20 text-amber-400 border border-amber-800/30">
          🥉 Bronze (${amt.toLocaleString()})
        </span>
      );
    }
  };

  // Issue Card Action
  const handleIssueCard = async (e) => {
    e.preventDefault();
    setIssuedQrCodeUrl(null);
    setIssuedCardCode(null);
    try {
      const res = await fetch('http://localhost:4000/cards/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: parseInt(issueUserId),
          billAmount: issueBillAmount ? parseFloat(issueBillAmount) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Issuance failed');

      setIssuedQrCodeUrl(data.qrCodeUrl);
      setIssuedCardCode(data.card.code);
      setIssueUserId('');
      setIssueBillAmount('');
      fetchStats();
      fetchCards(1, cardsSearch, cardsStatusFilter);
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Delete Prize Action
  const handleDeletePrize = async (id, title) => {
    if (!confirm(`Are you sure you want to delete '${title}' from the prize pool?`)) return;
    try {
      const res = await fetch(`http://localhost:4000/prizes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Deletion failed');

      alert(`🗑️ ${data.message || 'Prize deleted successfully'}`);
      fetchPrizes();
      fetchStats();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Create Prize Action
  const handleCreatePrize = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:4000/prizes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: prizeTitle,
          amount: parseFloat(prizeAmount),
          probability: parseFloat(prizeProb),
          totalQuantity: parseInt(prizeQty),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Creation failed');

      alert(`🎁 Prize '${data.title}' added to pool!`);
      setPrizeTitle('');
      setPrizeAmount('');
      setPrizeProb('');
      setPrizeQty('');
      fetchPrizes();
      fetchStats();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Redeem Prize Action
  const handleRedeemPrize = async (resultId) => {
    try {
      const res = await fetch(`http://localhost:4000/cards/redeem/${resultId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Redemption failed');

      alert(`🎉 ${data.message}`);
      fetchStats();
      fetchCards(cardsPagination.page, cardsSearch, cardsStatusFilter);
      fetchPayouts(payoutsPagination.page, payoutsSearch);
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Role Access Guard
  if (!user || user.role !== 'ADMIN') {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-lg font-semibold text-rose-400">Access Denied</h2>
          <p className="text-slate-400 text-xs mt-2">Administrative privileges required to access management workspace.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased">
      {/* Scratch Modal */}
      {activeScratchCode && (
        <AdminScratchModal
          code={activeScratchCode}
          onClose={() => setActiveScratchCode(null)}
          onSuccess={() => {
            fetchStats();
            fetchCards(cardsPagination.page, cardsSearch, cardsStatusFilter);
          }}
        />
      )}

      {/* QR Code Scan Modal */}
      {activeQrCardCode && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center relative shadow-xl">
            <button onClick={() => setActiveQrCardCode(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white font-semibold text-sm">✕</button>
            <h3 className="text-base font-bold text-white mb-1">Customer Receipt QR Code</h3>
            <p className="text-xs text-slate-400 mb-4">Show to customer to scan with smartphone camera</p>

            <div className="bg-white p-4 rounded-xl inline-block shadow-md">
              <img src={activeQrCodeUrl} alt="Receipt QR Code" className="w-44 h-44 mx-auto" />
              <p className="font-mono font-bold text-slate-900 text-xs mt-2">{activeQrCardCode}</p>
            </div>

            <button onClick={() => setActiveQrCardCode(null)} className="mt-6 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-5 py-2 rounded-lg transition-all">
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SIDEBAR NAVIGATION                                                 */}
      {/* ------------------------------------------------------------------ */}
      <aside className="w-64 bg-slate-900/80 border-r border-slate-800/80 flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 px-3 py-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-400 text-sm">
              S
            </div>
            <div>
              <div className="font-bold text-sm text-white leading-none">ScratchOS</div>
              <div className="text-[10px] text-slate-400 mt-1">Enterprise Admin v2.4</div>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => handleTabChange('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>📊</span> Executive Overview
            </button>

            <button
              onClick={() => handleTabChange('users')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'users'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>👥</span> Users & Shoppers
            </button>

            <button
              onClick={() => handleTabChange('cards')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'cards'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>🎟️</span> Cards Inventory
            </button>

            <button
              onClick={() => handleTabChange('payouts')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'payouts'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>💰</span> Financial Payouts
            </button>

            <button
              onClick={() => handleTabChange('prizes')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'prizes'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>🎁</span> Prize Pool Manager
            </button>

            <button
              onClick={() => handleTabChange('pos')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'pos'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>🧾</span> Cashier Terminal POS
            </button>

            <button
              onClick={() => handleTabChange('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>⚙️</span> Account & Settings
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-800/80 pt-4 px-3">
          <div className="text-[11px] font-semibold text-slate-300 truncate">{user.name || 'Admin'}</div>
          <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Production Online
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN CONTENT WORKSPACE                                             */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 overflow-y-auto">
        {/* TOP BAR */}
        <header className="h-14 border-b border-slate-800/80 px-8 flex items-center justify-between bg-slate-950/60 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-white font-semibold capitalize">{activeTab}</span>
          </div>

          <button
            onClick={() => handleTabChange(activeTab)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition-all"
          >
            <span>🔄</span> Sync Data
          </button>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {/* ============================================================== */}
          {/* TAB 1: EXECUTIVE OVERVIEW (DASHBOARD)                          */}
          {/* ============================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-xl font-bold text-white">System Overview</h1>
                <p className="text-xs text-slate-400 mt-1">Real-time performance metrics and operational analytics</p>
              </div>

              {/* CLICKABLE KPI METRIC CARDS */}
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => handleKpiClick('users')}
                    className="text-left bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-5 rounded-2xl transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Total Shoppers</span>
                      <span className="text-slate-500 group-hover:text-slate-300">↗</span>
                    </div>
                    <div className="text-2xl font-bold text-white mt-2 group-hover:text-amber-400 transition-colors">
                      {stats.totalUsers}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2">Registered customer accounts</div>
                  </button>

                  <button
                    onClick={() => handleKpiClick('cards_all')}
                    className="text-left bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-5 rounded-2xl transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Cards Issued</span>
                      <span className="text-slate-500 group-hover:text-slate-300">↗</span>
                    </div>
                    <div className="text-2xl font-bold text-white mt-2 group-hover:text-amber-400 transition-colors">
                      {stats.totalCardsIssued}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2">Total tickets in system</div>
                  </button>

                  <button
                    onClick={() => handleKpiClick('cards_scratched')}
                    className="text-left bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-5 rounded-2xl transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Cards Scratched</span>
                      <span className="text-slate-500 group-hover:text-slate-300">↗</span>
                    </div>
                    <div className="text-2xl font-bold text-cyan-400 mt-2 group-hover:text-cyan-300 transition-colors">
                      {stats.totalCardsScratched}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2">Revealed outcomes ({stats.totalCardsUnscratched} pending)</div>
                  </button>

                  <button
                    onClick={() => handleKpiClick('payouts')}
                    className="text-left bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-5 rounded-2xl transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Total Prize Cash</span>
                      <span className="text-slate-500 group-hover:text-slate-300">↗</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400 mt-2 group-hover:text-emerald-300 transition-colors">
                      ${stats.totalPrizeMoneyAwarded}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2">Cumulative value awarded</div>
                  </button>
                </div>
              )}

              {/* QUICK POS & PRIZE POOL SUMMARY */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-white mb-1">Quick POS Action</h3>
                  <p className="text-xs text-slate-400 mb-4">Issue a scratch card to a customer by User ID</p>

                  <form onSubmit={handleIssueCard} className="space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="number"
                        required
                        placeholder="Customer User ID (e.g. 1)"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-slate-700"
                        value={issueUserId}
                        onChange={(e) => setIssueUserId(e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Bill Amount $ (e.g. 10000)"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-slate-700"
                        value={issueBillAmount}
                        onChange={(e) => setIssueBillAmount(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all">
                      Issue Card & Generate Receipt QR
                    </button>
                  </form>

                  {issuedQrCodeUrl && (
                    <div className="mt-4 p-4 bg-white rounded-xl text-center text-slate-950 shadow-lg">
                      <div className="text-[11px] font-bold mb-1">Generated Receipt QR Code</div>
                      <img src={issuedQrCodeUrl} alt="QR Code" className="w-32 h-32 mx-auto" />
                      <div className="font-mono text-xs font-bold mt-1">{issuedCardCode}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setIssuedQrCodeUrl(null);
                          setIssuedCardCode(null);
                        }}
                        className="mt-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all"
                      >
                        Done / Close QR
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-white mb-1">Active Prize Pool</h3>
                  <p className="text-xs text-slate-400 mb-4">Configured reward items available in system</p>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {prizesList.map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800/60 p-3 rounded-xl text-xs">
                        <div>
                          <div className="font-semibold text-white">{p.title}</div>
                          <div className="text-[10px] text-slate-400">Prob: {p.probability}% | Stock: {p.remainingQuantity}/{p.totalQuantity}</div>
                        </div>
                        <div className="font-bold text-emerald-400">${p.amount}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: USERS & SHOPPERS (SEARCHABLE & PAGINATED)               */}
          {/* ============================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white">Users & Shoppers</h1>
                  <p className="text-xs text-slate-400 mt-1">Manage customer profiles, roles, and winnings</p>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search name, email, role..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-slate-700"
                    value={usersSearch}
                    onChange={(e) => {
                      setUsersSearch(e.target.value);
                      fetchUsers(1, e.target.value);
                    }}
                  />
                </div>
              </div>

              {/* USERS TABLE */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                        <th className="py-3 px-4">User ID</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Total Cards</th>
                        <th className="py-3 px-4">Wins</th>
                        <th className="py-3 px-4">Total Won</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {usersData.length > 0 ? (
                        usersData.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-slate-400">#{u.id}</td>
                            <td className="py-3 px-4 font-semibold text-white">{u.name}</td>
                            <td className="py-3 px-4 text-slate-300">{u.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium">{u.totalCards}</td>
                            <td className="py-3 px-4 font-medium text-cyan-400">{u.totalWins}</td>
                            <td className="py-3 px-4 font-bold text-emerald-400">${u.totalWonAmount}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">No users match your query.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS */}
                <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
                  <div>
                    Showing page <span className="font-semibold text-white">{usersPagination.page}</span> of{' '}
                    <span className="font-semibold text-white">{usersPagination.totalPages}</span> ({usersPagination.total} total)
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={usersPagination.page <= 1}
                      onClick={() => fetchUsers(usersPagination.page - 1, usersSearch)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:text-white"
                    >
                      ← Previous
                    </button>
                    <button
                      disabled={usersPagination.page >= usersPagination.totalPages}
                      onClick={() => fetchUsers(usersPagination.page + 1, usersSearch)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:text-white"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CARDS INVENTORY (SEARCHABLE, FILTERED & PAGINATED)      */}
          {/* ============================================================== */}
          {activeTab === 'cards' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white">Cards Inventory</h1>
                  <p className="text-xs text-slate-400 mt-1">Master ticket registry, scratch status, and QR codes</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* STATUS FILTER */}
                  <select
                    value={cardsStatusFilter}
                    onChange={(e) => {
                      setCardsStatusFilter(e.target.value);
                      fetchCards(1, cardsSearch, e.target.value);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-slate-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="UNSCRATCHED">🟡 Unscratched</option>
                    <option value="SCRATCHED">🟢 Scratched</option>
                  </select>

                  {/* SEARCH INPUT */}
                  <input
                    type="text"
                    placeholder="Search code, customer..."
                    className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-slate-700"
                    value={cardsSearch}
                    onChange={(e) => {
                      setCardsSearch(e.target.value);
                      fetchCards(1, e.target.value, cardsStatusFilter);
                    }}
                  />
                </div>
              </div>

              {/* CARDS TABLE */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                        <th className="py-3 px-4">Card Code</th>
                        <th className="py-3 px-4">Assigned Customer</th>
                        <th className="py-3 px-4">Purchase Tier</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Prize Outcome</th>
                        <th className="py-3 px-4">Redemption</th>
                        <th className="py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {cardsData.length > 0 ? (
                        cardsData.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-amber-400">{c.code}</td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{c.user ? c.user.name : 'Unknown'}</div>
                              <div className="text-[10px] text-slate-400">{c.user ? c.user.email : ''} (ID #{c.user ? c.user.id : c.userId})</div>
                            </td>
                            <td className="py-3 px-4">{getTierBadge(c.purchaseAmount)}</td>
                            <td className="py-3 px-4">
                              {c.status === 'UNSCRATCHED' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  🟡 UNSCRATCHED
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  🟢 SCRATCHED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {c.result ? (
                                c.result.prizeAmount > 0 ? (
                                  <div>
                                    <span className="text-emerald-400 font-bold">🎉 {c.result.prize ? c.result.prize.title : 'Cash Prize'} (${c.result.prizeAmount})</span>
                                    <div className="text-[10px] text-slate-500">Result ID #{c.result.id}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-500">⚪ No Win ($0)</span>
                                )
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {c.result && c.result.prizeAmount > 0 ? (
                                c.result.isRedeemed ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    🏷️ REDEEMED
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                    ⏳ PENDING
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {c.status === 'UNSCRATCHED' && (
                                  <>
                                    <button
                                      onClick={() => setActiveScratchCode(c.code)}
                                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all"
                                    >
                                      ✨ Scratch
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveQrCardCode(c.code);
                                        setActiveQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=http://192.168.68.56:4000/?code=${c.code}`);
                                      }}
                                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-2.5 py-1 rounded-lg text-[10px] border border-slate-700 transition-all"
                                    >
                                      📱 Show QR
                                    </button>
                                  </>
                                )}
                                {c.result && c.result.prizeAmount > 0 && !c.result.isRedeemed && (
                                  <button
                                    onClick={() => handleRedeemPrize(c.result.id)}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all"
                                  >
                                    Mark Redeemed
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">No scratch cards match your filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS */}
                <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
                  <div>
                    Showing page <span className="font-semibold text-white">{cardsPagination.page}</span> of{' '}
                    <span className="font-semibold text-white">{cardsPagination.totalPages}</span> ({cardsPagination.total} total cards)
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={cardsPagination.page <= 1}
                      onClick={() => fetchCards(cardsPagination.page - 1, cardsSearch, cardsStatusFilter)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:text-white"
                    >
                      ← Previous
                    </button>
                    <button
                      disabled={cardsPagination.page >= cardsPagination.totalPages}
                      onClick={() => fetchCards(cardsPagination.page + 1, cardsSearch, cardsStatusFilter)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:text-white"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: FINANCIAL PAYOUTS & REDEMPTIONS                        */}
          {/* ============================================================== */}
          {activeTab === 'payouts' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white">Financial Payouts & Redemptions</h1>
                  <p className="text-xs text-slate-400 mt-1">Audit ledger of winning prizes and counter redemption status</p>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search result ID, card, customer..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-slate-700"
                    value={payoutsSearch}
                    onChange={(e) => {
                      setPayoutsSearch(e.target.value);
                      fetchPayouts(1, e.target.value);
                    }}
                  />
                </div>
              </div>

              {/* PAYOUTS TABLE */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                        <th className="py-3 px-4">Result ID</th>
                        <th className="py-3 px-4">Card Code</th>
                        <th className="py-3 px-4">Winner Name</th>
                        <th className="py-3 px-4">Prize Title</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Redemption Status</th>
                        <th className="py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {payoutsData.length > 0 ? (
                        payoutsData.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-slate-400">#{p.id}</td>
                            <td className="py-3 px-4 font-mono font-bold text-amber-400">{p.cardCode}</td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{p.user ? p.user.name : 'Unknown'}</div>
                              <div className="text-[10px] text-slate-400">{p.user ? p.user.email : ''}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-white">{p.prize ? p.prize.title : 'Cash Reward'}</td>
                            <td className="py-3 px-4 font-bold text-emerald-400">${p.prizeAmount}</td>
                            <td className="py-3 px-4">
                              {p.isRedeemed ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  🏷️ REDEEMED
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  ⏳ PENDING PAYOUT
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {!p.isRedeemed ? (
                                <button
                                  onClick={() => handleRedeemPrize(p.id)}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all"
                                >
                                  Mark as Redeemed
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-500">Paid Out</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">No payout records match your search.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS */}
                <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
                  <div>
                    Showing page <span className="font-semibold text-white">{payoutsPagination.page}</span> of{' '}
                    <span className="font-semibold text-white">{payoutsPagination.totalPages}</span> ({payoutsPagination.total} payouts)
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={payoutsPagination.page <= 1}
                      onClick={() => fetchPayouts(payoutsPagination.page - 1, payoutsSearch)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:text-white"
                    >
                      ← Previous
                    </button>
                    <button
                      disabled={payoutsPagination.page >= payoutsPagination.totalPages}
                      onClick={() => fetchPayouts(payoutsPagination.page + 1, payoutsSearch)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:text-white"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: PRIZE POOL MANAGER                                      */}
          {/* ============================================================== */}
          {activeTab === 'prizes' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h1 className="text-xl font-bold text-white">Prize Pool Manager</h1>
                <p className="text-xs text-slate-400 mt-1">Configure win probabilities, quantities, and reward items</p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-4">Add New Reward Item</h3>
                <form onSubmit={handleCreatePrize} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Prize Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bumper $500 Mall Voucher"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-slate-700"
                      value={prizeTitle}
                      onChange={(e) => setPrizeTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Value Amount ($)</label>
                      <input
                        type="number"
                        required
                        placeholder="500"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-slate-700"
                        value={prizeAmount}
                        onChange={(e) => setPrizeAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Win Probability (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        placeholder="5.0"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-slate-700"
                        value={prizeProb}
                        onChange={(e) => setPrizeProb(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Stock Quantity</label>
                      <input
                        type="number"
                        required
                        placeholder="10"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-slate-700"
                        value={prizeQty}
                        onChange={(e) => setPrizeQty(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all">
                    Create Reward Item
                  </button>
                </form>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800/80 font-bold text-xs text-white">Configured Reward Pool</div>
                <div className="divide-y divide-slate-800/60">
                  {prizesList.map((p) => (
                    <div key={p.id} className="p-4 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{p.title}</span>
                          <span className="text-emerald-400 font-extrabold">${p.amount}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Win Rate: {p.probability}% | Stock Remaining: {p.remainingQuantity}/{p.totalQuantity}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleDeletePrize(p.id, p.title)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-lg text-[10px] font-semibold transition-all"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: CASHIER TERMINAL POS                                    */}
          {/* ============================================================== */}
          {activeTab === 'pos' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h1 className="text-xl font-bold text-white">Cashier Terminal POS</h1>
                <p className="text-xs text-slate-400 mt-1">Issue ticket receipt QR codes directly to shoppers at checkout</p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl">
                <form onSubmit={handleIssueCard} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Customer User ID</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 1 or 2"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-slate-700"
                      value={issueUserId}
                      onChange={(e) => setIssueUserId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Shopping Purchase Bill Amount ($)</label>
                    <input
                      type="number"
                      placeholder="e.g. 10000 or 2000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-slate-700"
                      value={issueBillAmount}
                      onChange={(e) => setIssueBillAmount(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition-all">
                    Issue Ticket & Generate Receipt QR
                  </button>
                </form>

                {issuedQrCodeUrl && (
                  <div className="mt-6 p-6 bg-white rounded-2xl text-center text-slate-950 shadow-xl">
                    <div className="text-xs font-bold mb-2">Printable Customer Receipt QR</div>
                    <img src={issuedQrCodeUrl} alt="Receipt QR Code" className="w-44 h-44 mx-auto" />
                    <div className="font-mono text-sm font-bold mt-2">{issuedCardCode}</div>
                    <div className="text-[10px] text-slate-500 mt-1 mb-3">Show or hand receipt to customer to scan on phone</div>
                    <button
                      type="button"
                      onClick={() => {
                        setIssuedQrCodeUrl(null);
                        setIssuedCardCode(null);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2 rounded-xl transition-all shadow-md"
                    >
                      Done / Close QR
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 7: ACCOUNT & SETTINGS                                      */}
          {/* ============================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-8 max-w-3xl">
              <div>
                <h1 className="text-xl font-bold text-white">Account & System Settings</h1>
                <p className="text-xs text-slate-400 mt-1">Manage administrator profile details, security credentials, and access preferences</p>
              </div>

              {/* PROFILE UPDATE CARD */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800/60">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                    👤
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Profile Details</h3>
                    <p className="text-[11px] text-slate-400">Update display name and administrator email address</p>
                  </div>
                </div>

                {profileStatus && (
                  <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                    profileStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {profileStatus.text}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Display Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Admin Boss"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500/50 transition-all"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@scratchwin.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500/50 transition-all"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all"
                    >
                      {profileLoading ? 'Saving Profile...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* CHANGE PASSWORD CARD */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800/60">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                    🔒
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Security & Password</h3>
                    <p className="text-[11px] text-slate-400">Update your account authentication password</p>
                  </div>
                </div>

                {passwordStatus && (
                  <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                    passwordStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {passwordStatus.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current password to verify identity"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500/50 transition-all"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Minimum 6 characters"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500/50 transition-all"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Re-enter new password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500/50 transition-all"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg hover:shadow-purple-500/20 transition-all"
                    >
                      {passwordLoading ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* ACCOUNT SESSION / LOGOUT CARD */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-sm">
                      🚪
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Account Session</h3>
                      <p className="text-[11px] text-slate-400">Terminate current administrative session</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={logout}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
                  >
                    Logout Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
