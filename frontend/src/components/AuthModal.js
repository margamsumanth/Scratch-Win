'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

export default function AuthModal({ onClose }) {
  const { login } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isLoginTab ? '/auth/login' : '/auth/register';
    const payload = isLoginTab ? { email, password } : { email, password, name };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');

      login(data.accessToken, data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
        >
          ✕
        </button>

        <div className="flex gap-4 border-b border-slate-800 pb-3 mb-6">
          <button
            className={`text-lg font-bold ${isLoginTab ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-400'}`}
            onClick={() => setIsLoginTab(true)}
          >
            Login
          </button>
          <button
            className={`text-lg font-bold ${!isLoginTab ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-400'}`}
            onClick={() => setIsLoginTab(false)}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm p-3 rounded-lg mb-4">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLoginTab && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-500"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-500"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-amber-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-3 rounded-xl shadow-lg mt-2 hover:brightness-110 transition-all"
          >
            {isLoginTab ? 'Login to Account' : 'Register Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
