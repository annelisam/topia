'use client';

import { useState } from 'react';
import TypographicSphere from '../components/TypographicSphere';
import DraggableStickyNote from '../components/DraggableStickyNote';
import Navigation from '../components/Navigation';
import LoadingScreen from '../components/LoadingScreen';
import Link from 'next/link';

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <LoadingScreen onComplete={() => setIsLoaded(true)} />

      <Navigation />

      <div className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <TypographicSphere
          texts={['TOPIA', 'WORLD', 'BUILDERS']}
          speed={0.0008}
          fontSize={18}
          lineCount={38}
          color="var(--foreground)"
          bgColor="var(--background)"
          showControls={false}
        />
      </div>

      {isLoaded && <DraggableStickyNote />}

      {/* Enter link */}
      <Link
        href="/"
        className="fixed bottom-5 right-5 font-mono text-[13px] px-4 py-2 border transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)]"
        style={{
          color: 'var(--foreground)',
          backgroundColor: 'var(--background)',
          borderColor: 'var(--foreground)'
        }}
      >
        ENTER →
      </Link>
    </div>
  );
}
