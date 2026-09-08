'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ScratchCanvas from '../components/ScratchCanvas';

export default function CardsPage() {
  const { token, user } = useAuth();
  const [cards, setCards] = useState([]);
  const [activeCode, setActiveCode] = useState(null);
  const [resultData, setResultData] = useState(null);

  const fetchCards = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:4000/cards/my-cards', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [token]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-4">🎟️ My Scratch Cards</h2>

        {!token ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg mb-4">Please login to view and scratch your cards.</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">You don't have any scratch cards yet!</p>
            <p className="text-sm text-slate-500 mt-2">Ask an Admin/Cashier to issue a card to your account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
            {cards.map((c) => (
              <div
                key={c.id}
                className="bg-slate-950 border border-dashed border-amber-500/40 rounded-2xl p-6 text-center shadow-lg hover:border-amber-500 transition-all hover:-translate-y-1"
              >
                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 ${c.status === 'UNSCRATCHED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  {c.status}
                </span>
                <div className="font-mono text-lg font-bold text-cyan-400 tracking-wider mb-4">
                  {c.code}
                </div>
                {c.status === 'UNSCRATCHED' ? (
                  <button
                    onClick={() => { setActiveCode(c.code); setResultData(null); }}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-2.5 rounded-xl shadow-lg hover:brightness-110 transition-all"
                  >
                    ✨ Scratch Card
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">Already Scratched</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* React Scratch Modal */}
      {activeCode && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Scratch to Reveal Prize!</h3>
            
            <div className="relative w-[300px] h-[160px] mx-auto my-4 rounded-xl overflow-hidden shadow-2xl bg-slate-950 flex flex-col items-center justify-center">
              <div className="absolute inset-0 flex flex-col items-center justify-center z-0 p-4">
                {resultData ? (
                  resultData.isWinner ? (
                    <div className="animate-bounce">
                      <h4 className="text-xl font-bold text-amber-400">🎉 YOU WON!</h4>
                      <p className="text-white text-base font-semibold mt-1">{resultData.prize?.title}</p>
                      <p className="text-emerald-400 text-xl font-extrabold mt-1">${resultData.prize?.amount}</p>
                    </div>
                  ) : (
                    <div className="text-slate-400">
                      <h4 className="text-lg font-bold">😢 Better Luck Next Time!</h4>
                    </div>
                  )
                ) : (
                  <span className="text-slate-500 text-sm">Scratching foil...</span>
                )}
              </div>

              <div className="absolute inset-0 z-10">
                <ScratchCanvas cardCode={activeCode} token={token || ''} onResult={(data) => setResultData(data)} />
              </div>
            </div>

            <button
              onClick={() => { setActiveCode(null); fetchCards(); }}
              className="mt-4 border border-slate-700 text-slate-300 px-6 py-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Close Arena
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
