'use client';

import { useState } from 'react';
import TypographicSphere from './components/TypographicSphere';
import DraggableStickyNote from './components/DraggableStickyNote';
import Navigation from './components/Navigation';
import LoadingScreen from './components/LoadingScreen';

export default function Home() {
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
    </div>
  );
}
