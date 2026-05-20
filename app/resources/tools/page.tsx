'use client';

import { useState } from 'react';
import PageShell from '../../components/PageShell';
import LoadingScreen from '../../components/LoadingScreen';
import ToolsList from './ToolsList';

export default function ToolsPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <PageShell>
      <LoadingScreen onComplete={() => setIsLoaded(true)} />
      <div className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <ToolsList />
      </div>
    </PageShell>
  );
}
