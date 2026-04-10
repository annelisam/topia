'use client';

import { useState, useEffect, useRef } from 'react';

const TOPIA_COLORS = [
  { name: 'lime', hex: '#e4fe52', dark: false },
  { name: 'blue', hex: '#4F46FF', dark: true },
  { name: 'pink', hex: '#FF5BD7', dark: true },
  { name: 'orange', hex: '#FF5C34', dark: true },
  { name: 'green', hex: '#00FF88', dark: false },
  { name: 'bone', hex: '#f5f0e8', dark: false },
];

function applyColor(index: number) {
  const color = TOPIA_COLORS[index];
  if (!color) return;
  document.documentElement.style.setProperty('--accent', color.hex);
  document.documentElement.style.setProperty('--accent-text', color.dark ? '#f5f0e8' : '#1a1a1a');
  document.documentElement.style.setProperty('--page-tint', `${color.hex}15`);
  document.documentElement.style.setProperty('--page-glow', `${color.hex}08`);
  document.documentElement.style.setProperty('--border-accent', `${color.hex}40`);
  document.body.setAttribute('data-accent', color.name);
  localStorage.setItem('topia-accent-index', String(index));
}

export default function ColorSlider() {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('topia-accent-index');
    if (saved) {
      const i = parseInt(saved);
      setIndex(i);
      applyColor(i);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const i = parseInt(e.target.value);
    setIndex(i);
    applyColor(i);
  }

  if (!mounted) return null;

  const current = TOPIA_COLORS[index];

  return (
    <div className="fixed bottom-6 left-6 z-[100] hidden md:flex items-center gap-3">
      <div
        className="w-3 h-3 rounded-full shrink-0 transition-colors duration-300"
        style={{ backgroundColor: current.hex, boxShadow: `0 0 10px ${current.hex}50` }}
      />
      <div className="relative w-32">
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[3px] rounded-full"
          style={{ background: `linear-gradient(to right, ${TOPIA_COLORS.map(c => c.hex).join(', ')})` }}
        />
        <input
          ref={sliderRef}
          type="range"
          min={0}
          max={TOPIA_COLORS.length - 1}
          step={1}
          value={index}
          onChange={handleChange}
          className="relative w-full h-6 appearance-none bg-transparent cursor-pointer z-10"
        />
        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[7px] uppercase tracking-[2px]"
          style={{ color: 'var(--page-text)', opacity: 0.2 }}
        >
          {current.name}
        </span>
      </div>
    </div>
  );
}
