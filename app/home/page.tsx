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
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#f5f0e8' }}>
      <LoadingScreen onComplete={() => setIsLoaded(true)} />

      <Navigation />

      <div className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <TypographicSphere
          texts={['TOPIA', 'WORLD', 'BUILDERS']}
          speed={0.0008}
          fontSize={18}
          lineCount={38}
          color="#1a1a1a"
          bgColor="#f5f0e8"
          showControls={true}
        />
      </div>

      {isLoaded && <DraggableStickyNote />}

      {/* Enter link */}
      <Link
        href="/"
        className="fixed bottom-5 right-5 font-mono text-[11px] px-4 py-2 border transition-colors hover:bg-[#1a1a1a] hover:text-[#f5f0e8]"
        style={{
          color: '#1a1a1a',
          backgroundColor: '#f5f0e8',
          borderColor: '#1a1a1a'
        }}
      >
        ENTER →
      </Link>
    </div>
  );
}
