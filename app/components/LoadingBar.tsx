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
      // Asymptotic: fast at first, decelerates toward ~85%, never reaches 100%
      const remaining = 0.85 - progress;
      if (remaining > 0.01) {
        progress += remaining * (0.02 + Math.random() * 0.03);
      }
      setLoadProgress(progress);
    }, 80);

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
