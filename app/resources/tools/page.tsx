'use client';

import { useState } from 'react';
import Navigation from '../../components/Navigation';
import LoadingScreen from '../../components/LoadingScreen';
import ToolsList from './ToolsList';

export default function ToolsPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0e8' }}>
      <LoadingScreen onComplete={() => setIsLoaded(true)} />

      <Navigation currentPage="tools" />

      <div className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <ToolsList />
      </div>
    </div>
  );
}
