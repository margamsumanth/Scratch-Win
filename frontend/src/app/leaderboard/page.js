'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/analytics/leaderboard`)
      .then((res) => res.json())
      .then((data) => setLeaders(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, []);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">🏆 Top Winners Leaderboard</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="pb-3 px-4">Rank</th>
                <th className="pb-3 px-4">Player</th>
                <th className="pb-3 px-4">Total Cash Won</th>
                <th className="pb-3 px-4">Wins</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leaders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No winners on the leaderboard yet! Be the first to scratch and win!
                  </td>
                </tr>
              ) : (
                leaders.map((u, index) => {
                  const badge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                  return (
                    <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4 font-bold text-lg">{badge}</td>
                      <td className="py-4 px-4 font-medium text-white">
                        {u.name || 'Anonymous Player'}{' '}
                        <span className="text-xs text-slate-500 font-normal">({u.email})</span>
                      </td>
                      <td className="py-4 px-4 font-bold text-emerald-400">${u.totalWon}</td>
                      <td className="py-4 px-4 text-slate-300">{u.winsCount} Wins</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
