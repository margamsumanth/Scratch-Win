'use client';

import React, { useRef, useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';

export default function ScratchCanvas({ cardCode, token, onResult }) {
  const canvasRef = useRef(null);
  const [isScratching, setIsScratching] = useState(false);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill Silver Metallic Foil
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#cbd5e1');
    grad.addColorStop(0.5, '#94a3b8');
    grad.addColorStop(1, '#64748b');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ SCRATCH WITH MOUSE HERE ✨', canvas.width / 2, canvas.height / 2 + 5);
  }, [cardCode]);

  const scratch = (e) => {
    if (!isScratching || triggered) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    checkProgress(canvas, ctx);
  };

  const checkProgress = async (canvas, ctx) => {
    if (triggered) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    let transparent = 0;

    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] === 0) transparent++;
    }

    const percent = (transparent / (pixels.length / 16)) * 100;

    if (percent > 35) {
      setTriggered(true);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Trigger NestJS Backend Game Engine Scratch
      try {
        const res = await fetch(`${API_BASE_URL}/cards/${cardCode}/scratch`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        onResult(data);
      } catch (err) {
        onResult({ isWinner: false, message: 'Failed to connect to backend: ' + err.message });
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={160}
      className="cursor-pointer rounded-xl shadow-inner border border-slate-700"
      onMouseDown={() => setIsScratching(true)}
      onMouseUp={() => setIsScratching(false)}
      onMouseLeave={() => setIsScratching(false)}
      onMouseMove={scratch}
      onTouchStart={() => setIsScratching(true)}
      onTouchEnd={() => setIsScratching(false)}
      onTouchMove={scratch}
    />
  );
}
