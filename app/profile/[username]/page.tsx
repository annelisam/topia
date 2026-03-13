'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import Navigation from '../../components/Navigation';
import LoadingScreen from '../../components/LoadingScreen';
import FollowButton from '../../components/FollowButton';
import { SocialIcon } from '../../components/SocialIcons';

interface PublicProfile {
  id:               string;
  name:             string | null;
  username:         string | null;
  bio:              string | null;
  avatarUrl:        string | null;
  socialWebsite:    string | null;
  socialTwitter:    string | null;
  socialInstagram:  string | null;
  socialSoundcloud: string | null;
  socialSpotify:    string | null;
  socialLinkedin:   string | null;
  socialSubstack:   string | null;
  roleTags:         string | null;
  toolSlugs:        string | null;
  createdAt:        string;
}

interface ResolvedTool {
  name:     string;
  slug:     string;
  category: string | null;
}

interface WorldMembership {
  worldId:       string;
  worldTitle:    string;
  worldSlug:     string;
  worldCategory: string | null;
  worldImageUrl: string | null;
  role:          string;
}

const ROLE_LABEL_MAP: Record<string, string> = {
  'music': 'Music',
  'dj': 'DJ',
  'visual-artist': 'Visual Artist',
  'filmmaker': 'Filmmaker',
  'photographer': 'Photographer',
  'writer': 'Writer',
  'poet': 'Poet',
  'dancer': 'Dancer',
  'performer': 'Performer',
  'producer': 'Producer',
  'designer': 'Designer',
  'illustrator': 'Illustrator',
  'game-designer': 'Game Designer',
  'architect': 'Architect',
  'technologist': 'Technologist',
  'curator': 'Curator',
  'educator': 'Educator',
  'community-builder': 'Community Builder',
  'entrepreneur': 'Entrepreneur',
  'researcher': 'Researcher',
};



export default function PublicProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { ready, authenticated, user } = usePrivy();

  const [profile, setProfile]   = useState<PublicProfile | null>(null);
  const [tools, setTools]       = useState<ResolvedTool[]>([]);
  const [worldMemberships, setWorldMemberships] = useState<WorldMembership[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hostedEvents, setHostedEvents] = useState<{ id: string; eventName: string; slug: string; date: string | null; city: string | null; imageUrl: string | null }[]>([]);

  useEffect(() => {
    if (!username || !ready) return;
    const url = new URL(`/api/profile/${encodeURIComponent(username)}`, window.location.origin);
    if (authenticated && user?.id) {
      url.searchParams.set('viewerPrivyId', user.id);
    }
    fetch(url.toString())
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) { setFetchError(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (!data.user) { setNotFound(true); return; }
        setProfile(data.user);
        setTools(data.tools ?? []);
        setWorldMemberships(data.worldMemberships ?? []);
        setFollowerCount(data.followerCount ?? 0);
        setFollowingCount(data.followingCount ?? 0);
        setIsFollowing(data.isFollowing ?? false);
        setIsOwnProfile(data.isOwnProfile ?? false);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [username, ready, authenticated, user]);

  // Fetch hosted events when profile loads
  useEffect(() => {
    if (!profile?.id) return;
    fetch(`/api/events?hostUserId=${profile.id}`)
      .then(r => r.json())
      .then(data => setHostedEvents(data.events || []))
      .catch(console.error);
  }, [profile?.id]);

  // Sort worlds: builders first, then collaborators
  const sortedWorlds = useMemo(() => {
    return [...worldMemberships].sort((a, b) => {
      if (a.role === b.role) return 0;
      return a.role === 'world_builder' ? -1 : 1;
    });
  }, [worldMemberships]);

  const roleTags = profile?.roleTags
    ? profile.roleTags.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const socialLinks = profile ? [
    { type: 'website',    url: profile.socialWebsite,    label: 'Website' },
    { type: 'twitter',    url: profile.socialTwitter,    label: 'Twitter / X' },
    { type: 'instagram',  url: profile.socialInstagram,  label: 'Instagram' },
    { type: 'soundcloud', url: profile.socialSoundcloud, label: 'SoundCloud' },
    { type: 'spotify',    url: profile.socialSpotify,    label: 'Spotify' },
    { type: 'linkedin',   url: profile.socialLinkedin,   label: 'LinkedIn' },
    { type: 'substack',   url: profile.socialSubstack,   label: 'Substack' },
  ].filter((l) => l.url) : [];
  const hasSocials = socialLinks.length > 0;

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  if (!loading && (notFound || fetchError)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation />
        <p className="font-mono text-[13px] uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
          {fetchError ? 'Could not load profile — please try again.' : 'Profile not found.'}
        </p>
        <Link
          href="/"
          className="font-mono text-[13px] uppercase tracking-tight border-b hover:opacity-70 transition"
          style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
        >
          ← Back to TOPIA
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <LoadingScreen onComplete={() => setIsLoaded(true)} />
      <Navigation />

      <main
        className={`container mx-auto max-w-2xl px-4 sm:px-6 pt-28 pb-20 transition-opacity duration-500 ${isLoaded && !loading ? 'opacity-100' : 'opacity-0'}`}
      >
        {profile && (
          <>
            {/* Hero — Avatar + Identity */}
            <section className="mb-12 text-center">
              <div className="flex justify-center mb-5">
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name ?? username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 7%, transparent)' }}>
                      <span className="font-mono text-3xl sm:text-4xl" style={{ color: 'var(--foreground)', opacity: 0.2 }}>
                        {profile.name ? profile.name[0].toUpperCase() : username[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {profile.name && (
                <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-1" style={{ color: 'var(--foreground)' }}>
                  {profile.name}
                </h1>
              )}
              <p className="font-mono text-[14px] opacity-40 mb-2" style={{ color: 'var(--foreground)' }}>
                @{username}
              </p>

              {/* Follow counts + follow button inline */}
              <div className="flex items-center justify-center gap-4 mb-3">
                                <span className="font-mono text-[12px]" style={{ color: 'var(--foreground)' }}>
                  <span className="font-bold">{followingCount}</span>
                  <span className="opacity-50 ml-1">following</span>
                </span>
                <span className="font-mono text-[12px]" style={{ color: 'var(--foreground)' }}>
                  <span className="font-bold">{followerCount}</span>
                  <span className="opacity-50 ml-1">followers</span>
                </span>
                {profile.id && !isOwnProfile && (
                  <FollowButton
                    targetUserId={profile.id}
                    initialIsFollowing={isFollowing}
                    onFollowChange={(following) => {
                      setIsFollowing(following);
                      setFollowerCount((c) => following ? c + 1 : c - 1);
                    }}
                  />
                )}
              </div>

              {profile.bio && (
                <p className="font-mono text-[13px] leading-relaxed max-w-md mx-auto" style={{ color: 'var(--foreground)' }}>
                  {profile.bio}
                </p>
              )}

              {/* Social icons row */}
              {hasSocials && (
                <div className="flex justify-center gap-4 mt-5">
                  {socialLinks.map(({ type, url, label }) => (
                    <a
                      key={type}
                      href={url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-35 hover:opacity-60 transition-opacity"
                      style={{ color: 'var(--foreground)' }}
                      title={label}
                    >
                      <SocialIcon type={type} size={18} />
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* Divider */}
            <div className="border-t mb-10" style={{ borderColor: 'var(--border-color)' }} />

            {/* Role Tags */}
            {roleTags.length > 0 && (
              <section className="mb-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                  Creative Roles
                </p>
                <div className="flex flex-wrap gap-2">
                  {roleTags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[12px] uppercase tracking-tight px-3 py-1.5 rounded-full border"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}
                    >
                      {ROLE_LABEL_MAP[tag] ?? tag.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Tools */}
            {tools.length > 0 && (
              <section className="mb-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                  Tools
                </p>
                <div className="flex flex-wrap gap-2">
                  {tools.map((tool) => (
                    <span
                      key={tool.slug}
                      className="font-mono text-[12px] tracking-tight px-3 py-1.5 rounded-lg border"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}
                    >
                      {tool.name}
                      {tool.category && (
                        <span className="opacity-30 ml-2 text-[10px] uppercase">{tool.category}</span>
                      )}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Worlds */}
            {sortedWorlds.length > 0 && (
              <section className="mb-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                  Worlds
                </p>
                <div className="space-y-3">
                  {sortedWorlds.map((wm) => (
                    <Link
                      key={wm.worldId}
                      href={`/worlds/${wm.worldSlug}`}
                      className="border rounded-2xl transition-colors duration-200 group block overflow-hidden"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)', backgroundColor: 'var(--surface)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                    >
                      {wm.worldImageUrl && (
                        <div className="w-full h-32 overflow-hidden">
                          <img
                            src={wm.worldImageUrl}
                            alt={wm.worldTitle}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: 'center 35%' }}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-mono text-[15px] sm:text-[18px] font-bold uppercase leading-tight" style={{ color: 'var(--foreground)' }}>
                            {wm.worldTitle}
                          </h3>
                          {wm.worldCategory && (
                            <span className="font-mono text-[10px] uppercase opacity-40">
                              {wm.worldCategory}
                            </span>
                          )}
                        </div>
                        <span
                          className="font-mono text-[10px] uppercase tracking-tight px-2 py-0.5 rounded-full border"
                          style={{
                            borderColor: wm.role === 'world_builder' ? 'var(--foreground)' : 'var(--border-color)',
                            color: 'var(--foreground)',
                            opacity: wm.role === 'world_builder' ? 1 : 0.6,
                          }}
                        >
                          {wm.role === 'world_builder' ? 'World Builder' : 'Collaborator'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Hosted Events */}
            {hostedEvents.length > 0 && (
              <section className="mb-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                  Events
                </p>
                <div className="space-y-3">
                  {hostedEvents.map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/events/${ev.slug}`}
                      className="border rounded-2xl transition-colors duration-200 group block overflow-hidden"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)', backgroundColor: 'var(--surface)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                    >
                      {ev.imageUrl && (
                        <div className="w-full h-32 overflow-hidden">
                          <img
                            src={ev.imageUrl}
                            alt={ev.eventName}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: 'center 35%' }}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-3">
                        <h3 className="font-mono text-[15px] sm:text-[18px] font-bold uppercase leading-tight" style={{ color: 'var(--foreground)' }}>
                          {ev.eventName}
                        </h3>
                        {(ev.date || ev.city) && (
                          <span className="font-mono text-[10px] uppercase opacity-40">
                            {[ev.date, ev.city].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Member Since */}
            {memberSince && (
              <section className="mb-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                  Member Since
                </p>
                <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>
                  {memberSince}
                </p>
              </section>
            )}

            {/* Footer */}
            <div className="pt-6 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <Link
                href="/"
                className="font-mono text-[13px] uppercase tracking-tight opacity-40 hover:opacity-70 transition"
                style={{ color: 'var(--foreground)' }}
              >
                ← TOPIA
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-tight opacity-20" style={{ color: 'var(--foreground)' }}>
                TOPIA NETWORK
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
