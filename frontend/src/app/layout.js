'use client';

import React, { useState } from 'react';
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';
import './globals.css';

export default function RootLayout({ children }) {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>Scratch & Win Arena</title>
      </head>
      <body className="bg-slate-950 text-white min-h-screen font-sans antialiased">
        <AuthProvider>
          <Navbar onOpenAuth={() => setAuthOpen(true)} />
          {children}
          {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
        </AuthProvider>
      </body>
    </html>
  );
}
