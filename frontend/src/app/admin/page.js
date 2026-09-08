'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AdminPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [issueUserId, setIssueUserId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  // Prize form states
  const [prizeTitle, setPrizeTitle] = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [prizeProb, setPrizeProb] = useState('');
  const [prizeQty, setPrizeQty] = useState('');

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:4000/analytics/admin-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  const handleIssueCard = async (e) => {
    e.preventDefault();
    setQrCodeUrl(null);
    try {
      const res = await fetch('http://localhost:4000/cards/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: parseInt(issueUserId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Issuance failed');

      setQrCodeUrl(data.qrCodeUrl);
      alert(`🎉 Issued Card Code: ${data.card.code}`);
      setIssueUserId('');
      fetchStats();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

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
      fetchStats();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-rose-400">⛔ Access Denied</h2>
        <p className="text-slate-400 mt-2">You must be logged in as an ADMIN to view this page.</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">⚙️ Admin Control Center</h2>

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">Total Users</span>
              <div className="text-2xl font-extrabold text-amber-500 mt-1">{stats.totalUsers}</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">Cards Issued</span>
              <div className="text-2xl font-extrabold text-amber-500 mt-1">{stats.totalCardsIssued}</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">Cards Scratched</span>
              <div className="text-2xl font-extrabold text-cyan-400 mt-1">{stats.totalCardsScratched}</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">Total Cash Awarded</span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">${stats.totalPrizeMoneyAwarded}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Issue Card Form */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">🎟️ Cashier: Issue Scratch Card</h3>
            <form onSubmit={handleIssueCard} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">User ID</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-cyan-400"
                  value={issueUserId}
                  onChange={(e) => setIssueUserId(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-2.5 rounded-xl hover:brightness-110">
                Issue Card & Generate Receipt QR
              </button>
            </form>

            {qrCodeUrl && (
              <div className="mt-6 text-center bg-white p-4 rounded-xl text-black inline-block w-full">
                <p className="font-bold text-xs mb-2">Printable Receipt QR Code</p>
                <img src={qrCodeUrl} alt="Receipt QR Code" className="w-36 h-36 mx-auto" />
              </div>
            )}
          </div>

          {/* Create Prize Form */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">🎁 Add New Prize to Pool</h3>
            <form onSubmit={handleCreatePrize} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Prize Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mega Cash Prize"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-cyan-400"
                  value={prizeTitle}
                  onChange={(e) => setPrizeTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="500"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
                    value={prizeAmount}
                    onChange={(e) => setPrizeAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Prob (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="10.0"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
                    value={prizeProb}
                    onChange={(e) => setPrizeProb(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    placeholder="5"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
                    value={prizeQty}
                    onChange={(e) => setPrizeQty(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-2.5 rounded-xl hover:brightness-110 mt-2">
                Create Prize
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
