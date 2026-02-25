'use client';

import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [loadProgress, setLoadProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Skip the loading animation if the user has already seen it this session
    if (sessionStorage.getItem('topia_loaded')) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.08 + Math.random() * 0.12;
      if (progress >= 1) {
        progress = 1;
        setLoadProgress(progress);
        clearInterval(interval);
        setTimeout(() => {
          sessionStorage.setItem('topia_loaded', 'true');
          setIsComplete(true);
          onComplete?.();
        }, 200);
      } else {
        setLoadProgress(progress);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  const barLength = 16;
  const filled = Math.floor(loadProgress * barLength);
  const empty = barLength - filled;
  const loaderBar = '█'.repeat(filled) + '░'.repeat(empty);

  if (isComplete) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="text-center font-mono text-sm" style={{ color: 'var(--foreground)' }}>
        <div>LOADING</div>
        <div className="mt-3 tracking-widest">{loaderBar}</div>
      </div>
    </div>
  );
}
