'use client';

import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Skip if already seen this session
    if (sessionStorage.getItem('topia_loaded')) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const steps = [
      setTimeout(() => setProgress(30), 200),
      setTimeout(() => setProgress(60), 600),
      setTimeout(() => setProgress(85), 1000),
      setTimeout(() => setProgress(100), 1400),
      setTimeout(() => {
        setExiting(true);
        setTimeout(() => {
          sessionStorage.setItem('topia_loaded', 'true');
          setIsComplete(true);
          onComplete?.();
        }, 500);
      }, 1800),
    ];
    return () => steps.forEach(clearTimeout);
  }, [onComplete]);

  if (isComplete) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      style={{ backgroundColor: '#1a1a1a' }}
    >
      {/* Logo */}
      <span
        className="font-basement font-black text-xl tracking-[6px] uppercase"
        style={{ color: '#f5f0e8', opacity: 0.4 }}
      >
        TOPIA<span style={{ color: 'var(--accent, #e4fe52)' }}>.</span>
      </span>

      {/* Loading bar */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48">
        <div className="h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(245,240,232,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: 'rgba(245,240,232,0.6)' }}
          />
        </div>
      </div>
    </div>
  );
}
