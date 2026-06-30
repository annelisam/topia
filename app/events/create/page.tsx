'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '../../hooks/useUserProfile';
import EventComposer from '../_components/EventComposer';

export default function CreateEventPage() {
  const router = useRouter();
  const { profile, loading } = useUserProfile();

  useEffect(() => {
    if (!loading && profile?.path === 'catalyst') router.push('/dashboard');
  }, [loading, profile?.path, router]);

  if (!loading && profile?.path === 'catalyst') return null;

  return (
    <EventComposer
      mode="create"
      initial={{
        eventName: '', dateIso: '', startTime: '', endTime: '', timezone: '',
        city: '', venue: '', link: '', description: '', imageUrl: '', worldId: '', published: false,
        rsvpCapacity: null, rsvpApprovalRequired: false,
      }}
    />
  );
}
