'use client';

import { useState, useEffect } from 'react';

interface LoadingBarProps {
  text?: string;
}

export default function LoadingBar({ text = 'LOADING' }: LoadingBarProps) {
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.08 + Math.random() * 0.12;
      if (progress >= 1) {
        progress = 0;
      }
      setLoadProgress(progress);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const barLength = 16;
  const filled = Math.floor(loadProgress * barLength);
  const empty = barLength - filled;
  const loaderBar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);

  return (
    <div className="text-center font-mono text-sm" style={{ color: 'var(--foreground)' }}>
      <div>{text}</div>
      <div className="mt-3 tracking-widest">{loaderBar}</div>
    </div>
  );
}
