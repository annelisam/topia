'use client';

import { useState } from 'react';
import TypographicSphere from './components/TypographicSphere';
import Navigation from './components/Navigation';
import LoadingScreen from './components/LoadingScreen';
import HomepageSections from './components/HomepageSections';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div style={{ backgroundColor: 'var(--background)' }}>
      <LoadingScreen onComplete={() => setIsLoaded(true)} />

      <Navigation />

      <div className="h-screen w-screen overflow-hidden flex items-center justify-center relative">
        <div className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <TypographicSphere
            texts={['TOPIA', 'WORLD', 'BUILDERS']}
            speed={0.0008}
            fontSize={18}
            lineCount={38}
            showControls={false}
          />
        </div>
      </div>

      {isLoaded && <HomepageSections />}
    </div>
  );
}
