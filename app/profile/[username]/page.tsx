'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import PageShell from '../../components/PageShell';
import LoadingScreen from '../../components/LoadingScreen';
import FollowButton from '../../components/FollowButton';
import { SocialIcon } from '../../components/SocialIcons';

interface PublicProfile {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  socialWebsite: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
  socialSoundcloud: string | null;
  socialSpotify: string | null;
  socialLinkedin: string | null;
  socialSubstack: string | null;
  roleTags: string | null;
  toolSlugs: string | null;
  createdAt: string;
}

interface ResolvedTool { name: string; slug: string; category: string | null; }
interface WorldMembership { worldId: string; worldTitle: string; worldSlug: string; worldCategory: string | null; worldImageUrl: string | null; role: string; }

const ROLE_LABEL_MAP: Record<string, string> = {
  'music': 'Music', 'dj': 'DJ', 'visual-artist': 'Visual Artist', 'filmmaker': 'Filmmaker',
  'photographer': 'Photographer', 'writer': 'Writer', 'poet': 'Poet', 'dancer': 'Dancer',
  'performer': 'Performer', 'producer': 'Producer', 'designer': 'Designer', 'illustrator': 'Illustrator',
  'game-designer': 'Game Designer', 'architect': 'Architect', 'technologist': 'Technologist',
  'curator': 'Curator', 'educator': 'Educator', 'community-builder': 'Community Builder',
  'entrepreneur': 'Entrepreneur', 'researcher': 'Researcher',
};

const COLOR_CYCLE = ['lime', 'blue', 'pink', 'orange', 'green'];
const COLOR_DOT: Record<string, string> = { lime: 'bg-lime', blue: 'bg-blue', pink: 'bg-pink', orange: 'bg-orange', green: 'bg-green' };

export default function PublicProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { ready, authenticated, user } = usePrivy();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [tools, setTools] = useState<ResolvedTool[]>([]);
  const [worldMemberships, setWorldMemberships] = useState<WorldMembership[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hostedEvents, setHostedEvents] = useState<{ id: string; eventName: string; slug: string; date: string | null; city: string | null; imageUrl: string | null }[]>([]);
  const [activeSection, setActiveSection] = useState('identity');

  useEffect(() => {
    if (!username || !ready) return;
    const url = new URL(`/api/profile/${encodeURIComponent(username)}`, window.location.origin);
    if (authenticated && user?.id) url.searchParams.set('viewerPrivyId', user.id);
    fetch(url.toString())
      .then((r) => { if (r.status === 404) { setNotFound(true); return null; } if (!r.ok) { setFetchError(true); return null; } return r.json(); })
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

  useEffect(() => {
    if (!profile?.id) return;
    fetch(`/api/events?hostUserId=${profile.id}`)
      .then(r => r.json())
      .then(data => setHostedEvents(data.events || []))
      .catch(console.error);
  }, [profile?.id]);

  const sortedWorlds = useMemo(() => {
    return [...worldMemberships].sort((a, b) => {
      const priority = (r: string) => r === 'owner' ? 0 : r === 'world_builder' ? 1 : 2;
      return priority(a.role) - priority(b.role);
    });
  }, [worldMemberships]);

  const roleTags = profile?.roleTags ? profile.roleTags.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const socialLinks = profile ? [
    { type: 'website', url: profile.socialWebsite, label: 'WEB' },
    { type: 'twitter', url: profile.socialTwitter, label: 'X' },
    { type: 'instagram', url: profile.socialInstagram, label: 'IG' },
    { type: 'soundcloud', url: profile.socialSoundcloud, label: 'SC' },
    { type: 'spotify', url: profile.socialSpotify, label: 'SPOT' },
    { type: 'linkedin', url: profile.socialLinkedin, label: 'LI' },
    { type: 'substack', url: profile.socialSubstack, label: 'SUB' },
  ].filter((l) => l.url) : [];

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  // Generate barcode from username
  const bars = username.split('').flatMap((ch, i) => {
    const code = ch.charCodeAt(0);
    return [
      { type: 'bar' as const, w: ((code * (i + 1)) % 4) + 1 },
      { type: 'gap' as const, w: ((code + i) % 3) + 1 },
    ];
  });

  // MRZ lines
  const mrzLine1 = `P<TOPIA<${(profile?.name || username).replace(/[.\s]/g, '<').toUpperCase().padEnd(20, '<')}<<<<<<<<<`;
  const mrzLine2 = `${(profile?.id || '').slice(0, 10).padEnd(10, '<')}<<${(memberSince || '').replace(/\s/g, '').padEnd(6, '<')}<<${username.padEnd(14, '<')}<<`;

  if (!loading && (notFound || fetchError)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--page-bg)' }}>
        <PageShell><div /></PageShell>
        <p className="font-mono text-[13px] uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
          {fetchError ? 'Could not load profile — please try again.' : 'Profile not found.'}
        </p>
        <Link href="/" className="font-mono text-[13px] uppercase tracking-tight border-b hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
          ← Back to TOPIA
        </Link>
      </div>
    );
  }

  const sections = [
    { id: 'identity', label: 'IDENTITY' },
    ...(sortedWorlds.length > 0 ? [{ id: 'worlds', label: 'WORLDS' }] : []),
    ...(hostedEvents.length > 0 ? [{ id: 'events', label: 'EVENTS' }] : []),
    ...(tools.length > 0 ? [{ id: 'tools', label: 'TOOLS' }] : []),
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      <LoadingScreen onComplete={() => setIsLoaded(true)} />
      <PageShell>
        <section className={`min-h-screen px-4 md:px-6 py-4 md:py-6 transition-opacity duration-500 ${isLoaded && !loading ? 'opacity-100' : 'opacity-0'}`}>
          <div className="max-w-[var(--content-max)] mx-auto">
            {profile && (
              <div className="grid grid-rows-[auto_auto_auto_1fr_auto] grid-cols-1 gap-[3px] border border-obsidian/15 rounded-lg overflow-hidden">

                {/* ═══ ROW 1 — ID CARD ═══ */}
                <div className="bg-obsidian relative overflow-hidden">
                  {/* Accent strip */}
                  <div className="px-4 py-2 flex items-center justify-between relative" style={{ backgroundColor: 'var(--accent, #e4fe52)' }}>
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                      style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(26,26,26,0.6) 4px, rgba(26,26,26,0.6) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(26,26,26,0.6) 4px, rgba(26,26,26,0.6) 5px)' }} />
                    <span className="font-mono text-[7px] uppercase tracking-[2px] relative z-10" style={{ color: 'var(--accent-text, #1a1a1a)', opacity: 0.4 }}>topia://identity</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider relative z-10" style={{ color: 'var(--accent-text, #1a1a1a)', opacity: 0.3 }}>TOPIA-ID-{profile.id.slice(0, 8)}</span>
                  </div>

                  {/* Photo + Fields */}
                  <div className="flex flex-col md:flex-row relative">
                    {/* Subtle orbital bg */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.025]" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
                      {Array.from({ length: 12 }, (_, i) => {
                        const r = 80 + i * 15;
                        return (<g key={i}>
                          <ellipse cx="400" cy="200" rx={r * 1.5} ry={r * 0.6} fill="none" stroke="#f5f0e8" strokeWidth="0.5" transform={`rotate(${i * 8} 400 200)`} />
                        </g>);
                      })}
                    </svg>

                    {/* Photo */}
                    <div className="flex items-center justify-center p-5 md:p-8 relative z-10 md:w-[35%] shrink-0">
                      <div className="flex flex-col items-center">
                        <div className="relative mb-3">
                          {/* Corner marks */}
                          <div className="absolute -top-2 -left-2 w-4 h-4 z-30"><div className="absolute top-0 left-0 w-full h-[1px] bg-bone/15" /><div className="absolute top-0 left-0 h-full w-[1px] bg-bone/15" /></div>
                          <div className="absolute -top-2 -right-2 w-4 h-4 z-30"><div className="absolute top-0 right-0 w-full h-[1px] bg-bone/15" /><div className="absolute top-0 right-0 h-full w-[1px] bg-bone/15" /></div>
                          <div className="absolute -bottom-2 -left-2 w-4 h-4 z-30"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-bone/15" /><div className="absolute bottom-0 left-0 h-full w-[1px] bg-bone/15" /></div>
                          <div className="absolute -bottom-2 -right-2 w-4 h-4 z-30"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-bone/15" /><div className="absolute bottom-0 right-0 h-full w-[1px] bg-bone/15" /></div>

                          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center border border-dashed border-bone/10">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full relative overflow-hidden border-2 border-bone/20">
                              {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt={profile.name ?? username} className="w-full h-full object-cover relative z-10" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-bone/5">
                                  <span className="font-basement text-3xl text-bone/20">{(profile.name || username)[0]?.toUpperCase()}</span>
                                </div>
                              )}
                              {/* Scanlines */}
                              <div className="absolute inset-0 pointer-events-none z-20" style={{ opacity: 0.12, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.4) 1px, rgba(0,0,0,0.4) 2px)', backgroundSize: '100% 2px' }} />
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-[9px] text-bone/40 mt-1">@{username}</span>
                        {roleTags.length > 0 && (
                          <span className="font-mono text-[7px] uppercase tracking-wider px-2 py-0.5 inline-block mt-2" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                            {ROLE_LABEL_MAP[roleTags[0]] ?? roleTags[0].replace(/-/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Identity fields */}
                    <div className="flex-1 p-4 md:p-5 flex flex-col justify-center relative z-10">
                      <div className="py-2 border-b border-bone/[0.04]">
                        <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/25 block">full name</span>
                        <h1 className="font-basement font-black text-[clamp(22px,3vw,36px)] leading-[0.9] uppercase text-bone mt-0.5">
                          {profile.name || username}
                        </h1>
                      </div>
                      <div className="py-2 border-b border-bone/[0.04] flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/25 block">handle</span>
                          <span className="font-mono text-[11px] text-bone/60 mt-0.5 block">@{username}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/25 block">status</span>
                          <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                            <span className="font-mono text-[9px] text-bone/50">VALID</span>
                          </div>
                        </div>
                      </div>
                      {profile.bio && (
                        <div className="py-2 border-b border-bone/[0.04]">
                          <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/25 block">declaration</span>
                          <span className="font-zirkon text-[9px] text-bone/50 italic mt-0.5 block leading-relaxed">&ldquo;{profile.bio}&rdquo;</span>
                        </div>
                      )}
                      <div className="py-2 border-b border-bone/[0.04] flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/25 block">issued</span>
                          <span className="font-mono text-[9px] text-bone/40 mt-0.5 block">{memberSince || '—'}</span>
                        </div>
                        {isOwnProfile && (
                          <Link href="/profile" className="font-mono text-[8px] uppercase tracking-wider text-bone/30 hover:text-bone/60 transition-colors border border-bone/[0.08] rounded-sm px-2 py-0.5 no-underline">
                            Edit Profile
                          </Link>
                        )}
                        {!isOwnProfile && profile.id && (
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
                      {socialLinks.length > 0 && (
                        <div className="py-2">
                          <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/25 block mb-1.5">links</span>
                          <div className="flex items-center flex-wrap gap-3">
                            {socialLinks.map((link) => (
                              <a key={link.type} href={link.url!} target="_blank" rel="noopener noreferrer" className="text-bone/30 hover:text-bone/60 transition-colors" title={link.label}>
                                <SocialIcon type={link.type} size={16} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ═══ ROW 2 — STATS BAR ═══ */}
                <div className="bg-obsidian border-t border-b border-bone/[0.04] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-0">
                    {[
                      { label: 'Worlds', value: String(sortedWorlds.length) },
                      { label: 'Events', value: String(hostedEvents.length) },
                      { label: 'Following', value: String(followingCount) },
                      { label: 'Followers', value: String(followerCount) },
                    ].map((stat, i, arr) => (
                      <div key={stat.label} className={`flex flex-col px-3 md:px-5 ${i < arr.length - 1 ? 'border-r border-bone/[0.06]' : ''} ${i === 0 ? 'pl-0' : ''}`}>
                        <span className="font-mono text-[6px] uppercase tracking-[2px] text-bone/20">{stat.label}</span>
                        <span className="font-mono text-[13px] md:text-[15px] text-bone font-bold leading-none mt-0.5">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:flex items-center gap-3">
                    <div className="w-32 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, var(--accent, #e4fe52)30, var(--accent, #e4fe52)60, var(--accent, #e4fe52)30, transparent)' }} />
                    <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/15">topia://stats</span>
                  </div>
                </div>

                {/* ═══ ROW 3 — SECTION NAV ═══ */}
                <div className="bg-obsidian border-b border-bone/[0.04] px-3 flex items-center gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`font-mono text-[8px] md:text-[9px] uppercase tracking-[2px] px-3 md:px-4 py-2.5 transition-all border-b-2 whitespace-nowrap bg-transparent cursor-pointer ${
                        activeSection === s.id
                          ? 'text-bone border-[var(--accent,#e4fe52)]'
                          : 'text-bone/30 border-transparent hover:text-bone/50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* ═══ ROW 4 — CONTENT ═══ */}
                <div className="bg-obsidian overflow-hidden min-h-[300px]">

                  {/* Identity section */}
                  {activeSection === 'identity' && (
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-[3px] h-full">
                      {/* Left — Roles + Tools */}
                      <div className="grid grid-rows-[auto_1fr] gap-[3px] overflow-hidden">
                        <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: 'var(--accent, #e4fe52)' }}>
                          <span className="font-mono text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--accent-text, #1a1a1a)' }}>CREATIVE ROLES</span>
                          <span className="font-mono text-[7px] uppercase tracking-[2px] opacity-30" style={{ color: 'var(--accent-text, #1a1a1a)' }}>{roleTags.length} roles</span>
                        </div>
                        <div className="relative bg-obsidian overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
                          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)' }} />
                          <div className="relative z-10">
                            {roleTags.length > 0 ? (
                              <div className="flex flex-wrap gap-2 mb-6">
                                {roleTags.map((tag) => (
                                  <span key={tag} className="font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 border border-bone/[0.08] rounded-sm text-bone/60">
                                    {ROLE_LABEL_MAP[tag] ?? tag.replace(/-/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="font-mono text-[9px] text-bone/25 uppercase tracking-wider mb-6">No roles selected</p>
                            )}
                            {tools.length > 0 && (
                              <>
                                <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/25 block mb-2">Tools</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {tools.map((tool) => (
                                    <span key={tool.slug} className="font-mono text-[8px] px-2 py-0.5 border border-bone/[0.06] rounded text-bone/40">
                                      {tool.name}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right — Bio + detail */}
                      <div className="border-l border-bone/[0.04] bg-obsidian p-5 overflow-y-auto relative" style={{ scrollbarWidth: 'thin' }}>
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.02]" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">
                          {Array.from({ length: 8 }, (_, i) => (
                            <ellipse key={i} cx="150" cy="200" rx={60 + i * 20} ry={40 + i * 15} fill="none" stroke="#f5f0e8" strokeWidth="0.4" transform={`rotate(${i * 12} 150 200)`} />
                          ))}
                        </svg>
                        <div className="relative z-10">
                          <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/25 block mb-4">about // declaration</span>
                          {profile.bio ? (
                            <p className="font-zirkon text-sm text-bone/60 leading-relaxed mb-6">{profile.bio}</p>
                          ) : (
                            <p className="font-mono text-[10px] text-bone/20 uppercase tracking-wider mb-6">No bio provided</p>
                          )}
                          {memberSince && (
                            <div className="mb-4">
                              <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/25 block">member since</span>
                              <span className="font-mono text-[10px] text-bone/40 mt-0.5 block">{memberSince}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Worlds section */}
                  {activeSection === 'worlds' && (
                    <div className="relative overflow-y-auto h-full" style={{ scrollbarWidth: 'thin' }}>
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)' }} />
                      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 63px, rgba(245,240,232,1) 63px, rgba(245,240,232,1) 64px)' }} />
                      <div className="absolute top-0 bottom-0 left-[28px] w-[1px] bg-bone/[0.06] pointer-events-none z-[1]" />
                      <div className="relative z-10">
                        {sortedWorlds.map((wm, i) => {
                          const color = COLOR_CYCLE[i % COLOR_CYCLE.length];
                          return (
                            <Link
                              key={wm.worldId}
                              href={`/worlds/${wm.worldSlug}`}
                              className="flex items-center no-underline cursor-pointer transition-all duration-150 border-b border-bone/[0.04] hover:bg-bone/[0.03]"
                              style={{ minHeight: '64px' }}
                            >
                              <div className="w-[28px] shrink-0 flex items-center justify-center">
                                <span className="font-mono text-[7px] text-bone/15">{String(i + 1).padStart(2, '0')}</span>
                              </div>
                              <div className={`w-[2px] shrink-0 self-stretch ${COLOR_DOT[color]}`} />
                              {wm.worldImageUrl && (
                                <div className="w-12 h-12 shrink-0 mx-3 rounded overflow-hidden">
                                  <img src={wm.worldImageUrl} alt={wm.worldTitle} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 flex items-center justify-between px-3 py-3 min-w-0">
                                <div className="min-w-0">
                                  <span className="font-mono text-[11px] uppercase font-bold text-bone block truncate">{wm.worldTitle}</span>
                                  {wm.worldCategory && <span className="font-mono text-[7px] text-bone/30">{wm.worldCategory}</span>}
                                </div>
                                <span className="font-mono text-[6px] uppercase tracking-wider text-bone/25 border border-bone/[0.08] rounded-sm px-2 py-0.5 shrink-0">
                                  {wm.role === 'owner' ? 'OWNER' : wm.role === 'world_builder' ? 'BUILDER' : 'COLLAB'}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Events section */}
                  {activeSection === 'events' && (
                    <div className="relative overflow-y-auto h-full" style={{ scrollbarWidth: 'thin' }}>
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)' }} />
                      <div className="absolute top-0 bottom-0 left-[28px] w-[1px] bg-bone/[0.06] pointer-events-none z-[1]" />
                      <div className="relative z-10">
                        {hostedEvents.map((ev, i) => {
                          const color = COLOR_CYCLE[i % COLOR_CYCLE.length];
                          return (
                            <Link
                              key={ev.id}
                              href={`/events/${ev.slug}`}
                              className="flex items-center no-underline cursor-pointer transition-all duration-150 border-b border-bone/[0.04] hover:bg-bone/[0.03]"
                              style={{ minHeight: '56px' }}
                            >
                              <div className="w-[28px] shrink-0 flex items-center justify-center">
                                <span className="font-mono text-[7px] text-bone/15">{String(i + 1).padStart(2, '0')}</span>
                              </div>
                              <div className={`w-[2px] shrink-0 self-stretch ${COLOR_DOT[color]}`} />
                              {ev.imageUrl && (
                                <div className="w-12 h-12 shrink-0 mx-3 rounded overflow-hidden">
                                  <img src={ev.imageUrl} alt={ev.eventName} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 flex items-center justify-between px-3 py-3 min-w-0">
                                <span className="font-mono text-[11px] uppercase font-bold text-bone truncate block">{ev.eventName}</span>
                                {(ev.date || ev.city) && (
                                  <span className="font-mono text-[7px] text-bone/30 shrink-0 ml-2">{[ev.date, ev.city].filter(Boolean).join(' · ')}</span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tools section */}
                  {activeSection === 'tools' && (
                    <div className="relative overflow-y-auto h-full" style={{ scrollbarWidth: 'thin' }}>
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)' }} />
                      <div className="absolute top-0 bottom-0 left-[28px] w-[1px] bg-bone/[0.06] pointer-events-none z-[1]" />
                      <div className="relative z-10">
                        {tools.map((tool, i) => (
                          <div key={tool.slug} className="flex items-center border-b border-bone/[0.04]" style={{ minHeight: '48px' }}>
                            <div className="w-[28px] shrink-0 flex items-center justify-center">
                              <span className="font-mono text-[7px] text-bone/15">{String(i + 1).padStart(2, '0')}</span>
                            </div>
                            <div className="w-[2px] shrink-0 self-stretch bg-bone/10" />
                            <div className="flex-1 flex items-center justify-between px-3 py-2.5 min-w-0">
                              <span className="font-mono text-[10px] uppercase font-bold text-bone/60 truncate">{tool.name}</span>
                              {tool.category && <span className="font-mono text-[7px] text-bone/25 shrink-0">{tool.category}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ═══ ROW 5 — MRZ STRIP ═══ */}
                <div className="bg-obsidian px-4 py-3 flex items-center justify-between border-t border-bone/[0.04]">
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex items-end gap-0 h-4">
                      {bars.map((b, i) => (
                        <div key={i} className={b.type === 'bar' ? 'bg-bone/10' : ''}
                          style={{ width: `${b.w}px`, height: b.type === 'bar' ? `${12 + (b.w * 2)}px` : '0px', marginRight: b.type === 'gap' ? `${b.w}px` : '0px' }} />
                      ))}
                    </div>
                    <span className="font-mono text-[7px] tracking-[2px] text-bone/15 uppercase truncate block">{mrzLine1}</span>
                    <span className="font-mono text-[7px] tracking-[2px] text-bone/10 uppercase truncate block">{mrzLine2}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="font-mono text-[7px] text-bone/10 hidden md:block">{profile.id.slice(0, 6)}···{profile.id.slice(-4)}</span>
                    <img src="/brand/logo-white.png" alt="" className="w-4 h-4 opacity-20" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                </div>

              </div>
            )}
          </div>
        </section>
      </PageShell>
    </div>
  );
}
