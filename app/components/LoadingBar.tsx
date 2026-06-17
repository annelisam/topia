'use client';

import { useState, useEffect } from 'react';

interface LoadingBarProps {
  text?: string;
}

// Inline loading indicator that matches the main-page LoadingScreen aesthetic
// (TOPIA wordmark + thin progress bar). Theme-aware so it reads on both the
// light surfaces and the dark composer. The bar eases toward ~90% and never
// completes while data is still loading.
export default function LoadingBar({ text }: LoadingBarProps) {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    let p = 8;
    const interval = setInterval(() => {
      const remaining = 90 - p;
      if (remaining > 0.5) {
        p += remaining * (0.02 + Math.random() * 0.03);
        setProgress(p);
      }
    }, 90);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <span
        className="font-basement font-black text-xl tracking-[6px] uppercase"
        style={{ color: 'var(--foreground)', opacity: 0.4 }}
      >
        TOPIA<span style={{ color: 'var(--accent, #e4fe52)' }}>.</span>
      </span>

      <div className="mt-5 w-48">
        <div className="h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(127,127,127,0.18)' }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: 'var(--foreground)', opacity: 0.6 }}
          />
        </div>
      </div>

      {text && (
        <div className="mt-3 font-mono text-[11px] uppercase tracking-[2px] opacity-40" style={{ color: 'var(--foreground)' }}>
          {text}
        </div>
      )}
    </div>
  );
}
