'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenAuth }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to get initials
  const getInitials = (name, email) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <Link
        href={user?.role === 'ADMIN' ? '/admin' : '/'}
        className="text-xl font-extrabold text-amber-500 flex items-center gap-2 hover:opacity-90 transition-opacity"
      >
        🎰 Scratch & Win Arena
      </Link>

      <div className="flex gap-6 items-center">
        {/* Hide player links for ADMIN */}
        {user?.role !== 'ADMIN' && (
          <>
            <Link href="/" className="text-slate-300 hover:text-white font-medium transition-colors">
              My Cards
            </Link>
            <Link href="/leaderboard" className="text-slate-300 hover:text-white font-medium transition-colors">
              Leaderboard
            </Link>
          </>
        )}

        {user?.role === 'ADMIN' && (
          <Link href="/admin" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-800/50 px-3 py-1.5 rounded-lg text-xs">
            <span>⚙️</span> Admin Workspace
          </Link>
        )}

        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-full transition-all focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-inner">
                {getInitials(user.name, user.email)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-100 leading-tight">
                  {user.name || 'User'}
                </div>
                <div className="text-[10px] text-amber-400 font-mono leading-tight">
                  {user.role}
                </div>
              </div>
              <span className="text-slate-400 text-xs ml-1">▾</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-slate-800/80">
                  <div className="font-bold text-white text-sm">{user.name || 'User Profile'}</div>
                  <div className="text-slate-400 text-[11px] truncate mt-0.5">{user.email}</div>
                  <div className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {user.role} ACCOUNT
                  </div>
                </div>

                <div className="py-1">
                  {user.role === 'ADMIN' ? (
                    <Link
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                      <span>⚙️</span> Admin Workspace
                    </Link>
                  ) : (
                    <Link
                      href="/"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                      <span>👤</span> My Dashboard
                    </Link>
                  )}
                </div>

                <div className="border-t border-slate-800/80 pt-1 mt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 font-semibold transition-colors"
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              </div>
            )}
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
