'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import LoadingBar from '../components/LoadingBar';
import ThemeToggle from '../components/ThemeToggle';
import ColorSlider from '../components/ui/ColorSlider';
import { useUserProfile } from '../hooks/useUserProfile';
import { DashboardContext } from './_components/DashboardContext';
import type { HostedEvent } from './_components/DashboardContext';
import DashboardSidebar from './_components/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const { profile, worldMemberships, loading } = useUserProfile();
  const [hostedEvents, setHostedEvents] = useState<HostedEvent[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/');
    }
  }, [ready, authenticated, router]);

  // Fetch hosted events
  useEffect(() => {
    if (!profile?.id) return;
    fetch(`/api/events?hostUserId=${profile.id}`)
      .then((r) => r.json())
      .then((data) => setHostedEvents(data.events || []))
      .catch(console.error);
  }, [profile?.id]);

  if (!ready || loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
        <Navigation />
        <LoadingBar />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <DashboardContext.Provider value={{ profile, worldMemberships, hostedEvents }}>
      <div
        className="min-h-screen overflow-x-hidden relative z-10"
        style={{ backgroundColor: 'var(--page-bg)' }}
      >
        {/* Grain overlay for dashboard */}
        <div className="grain-overlay" />
        <div className="scanlines-overlay" />

        <Navigation />
        <DashboardSidebar />
        <main className="pt-28 sm:pt-24 sm:ml-56 px-4 sm:px-8 pb-16 md:pb-8">
          <div className="max-w-4xl">{children}</div>
        </main>
        <ColorSlider />
        <ThemeToggle />
      </div>
    </DashboardContext.Provider>
  );
}
