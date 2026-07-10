'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle({ embedded = false }: { embedded?: boolean }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('topia-theme') as 'dark' | 'light' | null;
    const resolved = saved === 'light' ? 'light' : 'dark';
    setTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('topia-theme', next);
  }

  if (!mounted) return null;

  // Footer sits on the always-dark obsidian bar, so the embedded icon uses bone
  // for both states; the glyph (sun vs moon) carries the state distinction.
  const stroke = embedded ? '#f5f0e8' : theme === 'dark' ? '#f5f0e8' : '#1a1a1a';
  const icon = theme === 'dark' ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );

  // Embedded (footer) variant — inline row with a label, no fixed positioning.
  if (embedded) {
    return (
      <button
        onClick={toggle}
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[2px] text-bone/50 hover:text-bone transition-colors bg-transparent border-none cursor-pointer p-0"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {icon}
        <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      // On mobile the floating pill nav owns the bottom edge — lift the toggle
      // above it; back to the corner once the pill is gone (md+).
      className="fixed bottom-[var(--mobile-nav-clearance)] md:bottom-6 right-6 z-[100] w-8 h-8 rounded-full border flex items-center justify-center transition-all backdrop-blur-sm"
      style={{
        borderColor: 'rgba(245, 240, 232, 0.15)',
        backgroundColor: 'rgba(26, 26, 26, 0.8)',
      }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {icon}
    </button>
  );
}
