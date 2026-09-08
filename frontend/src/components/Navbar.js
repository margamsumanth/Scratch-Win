'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenAuth }) {
  const { user, logout } = useAuth();

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="text-xl font-extrabold text-amber-500 flex items-center gap-2">
        🎰 Scratch & Win Arena
      </div>

      <div className="flex gap-6 items-center">
        <Link href="/" className="text-slate-300 hover:text-white font-medium transition-colors">
          My Cards
        </Link>
        <Link href="/leaderboard" className="text-slate-300 hover:text-white font-medium transition-colors">
          Leaderboard
        </Link>
        {user?.role === 'ADMIN' && (
          <Link href="/admin" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
            ⚙️ Admin Panel
          </Link>
        )}
        
        {user ? (
          <div className="flex gap-3 items-center bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full">
            <span className="text-sm text-slate-200">👤 {user.email}</span>
            <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {user.role}
            </span>
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-rose-400 font-semibold ml-2"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold px-4 py-2 rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all hover:-translate-y-0.5"
          >
            Login / Register
          </button>
        )}
      </div>
    </nav>
  );
}
