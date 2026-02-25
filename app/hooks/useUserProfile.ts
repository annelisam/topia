'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export interface WorldMembership {
  worldId: string;
  worldTitle: string;
  worldSlug: string;
  worldCategory: string | null;
  worldImageUrl: string | null;
  role: string; // 'world_builder' | 'collaborator'
}

export interface UserProfile {
  id: string;
  privyId: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  email: string | null;
  role: string | null;
  roleTags: string | null;
  toolSlugs: string | null;
  socialWebsite: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
  socialSoundcloud: string | null;
  socialSpotify: string | null;
  socialLinkedin: string | null;
  socialSubstack: string | null;
}

export function useUserProfile() {
  const { ready, authenticated, user } = usePrivy();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [worldMemberships, setWorldMemberships] = useState<WorldMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !authenticated || !user) {
      setProfile(null);
      setWorldMemberships([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setWorldMemberships(data.worldMemberships ?? []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ready, authenticated, user]);

  return { profile, worldMemberships, loading, ready, authenticated };
}
