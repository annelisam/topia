'use client';

import { useState } from 'react';
import Navigation from '../../components/Navigation';
import LoadingScreen from '../../components/LoadingScreen';
import GrantsList from './GrantsList';

export default function GrantsPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0e8' }}>
      <LoadingScreen onComplete={() => setIsLoaded(true)} />

      <Navigation currentPage="grants" />

      <div className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <GrantsList />
      </div>
    </div>
  );
}
