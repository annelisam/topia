'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import PageShell from '../../components/PageShell';
import LoadingScreen from '../../components/LoadingScreen';
import FollowButton from '../../components/FollowButton';
import { SocialIcon } from '../../components/SocialIcons';
import { PATH_CONFIG, resolvePath } from '../../components/profile/pathConfig';
import IdentityLayer from '../../components/profile/IdentityLayer';
import WorldLayer from '../../components/profile/WorldLayer';
import ProofLayer from '../../components/profile/ProofLayer';
import PulseLayer from '../../components/profile/PulseLayer';
import ProfileTV from '../../components/profile/ProfileTV';
import WorldsLayer from '../../components/profile/WorldsLayer';
import GuestbookLayer from '../../components/profile/GuestbookLayer';

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
  path: string | null;
  createdAt: string;
}

interface ResolvedTool { name: string; slug: string; category: string | null; }
interface WorldMembership { worldId: string; worldTitle: string; worldSlug: string; worldCategory: string | null; worldImageUrl: string | null; role: string; }
interface HostedEvent { id: string; eventName: string; slug: string; date: string | null; city: string | null; imageUrl: string | null }

const STAMP_COLORS = ['lime', 'blue', 'pink', 'orange', 'green'];
const SECTIONS = [
  { id: 'identity', label: 'IDENTITY' },
  { id: 'world',    label: 'WORLD' },
  { id: 'proof',    label: 'PROOF' },
  { id: 'pulse',    label: 'PULSE' },
  { id: 'tv',       label: 'TV' },
  { id: 'worlds',   label: 'WORLDS' },
  { id: 'guestbook',label: 'GUESTBOOK' },
] as const;

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
  const [hostedEvents, setHostedEvents] = useState<HostedEvent[]>([]);
  const [activeSection, setActiveSection] = useState<typeof SECTIONS[number]['id']>('identity');

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
  const hasOwnedWorlds = sortedWorlds.some((w) => w.role === 'owner' || w.role === 'world_builder');
  const path = resolvePath(profile?.path, roleTags, hasOwnedWorlds);
  const config = PATH_CONFIG[path];

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
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
    : null;

  // Endorsed worlds list for the IDENTITY section
  const endorsedItems = useMemo(() => sortedWorlds.map((w, i) => ({
    name: w.worldTitle.toUpperCase(),
    sub: w.role === 'owner' ? 'Owner' : w.role === 'world_builder' ? 'Builder' : 'Collab',
    color: STAMP_COLORS[i % STAMP_COLORS.length],
    status: w.role === 'owner' ? 'LIVE' : w.role === 'world_builder' ? 'ACTIVE' : 'COLLAB',
  })), [sortedWorlds]);

  // Visa stamps derived from worlds + events
  const stamps = useMemo(() => {
    const fromWorlds = sortedWorlds.slice(0, 4).map((w, i) => ({
      type: (i % 3 === 0 ? 'ENTRY' : i % 3 === 1 ? 'EXIT' : 'TRANSIT') as 'ENTRY' | 'EXIT' | 'TRANSIT',
      world: w.worldTitle.toUpperCase().slice(0, 14),
      date: memberSince || '—',
      color: STAMP_COLORS[i % STAMP_COLORS.length],
      weight: 1 - i * 0.15,
    }));
    const fromEvents = hostedEvents.slice(0, 6 - fromWorlds.length).map((e, i) => ({
      type: 'ENTRY' as const,
      world: e.eventName.toUpperCase().slice(0, 14),
      date: e.date ? new Date(e.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '.') : (memberSince || '—'),
      color: STAMP_COLORS[(fromWorlds.length + i) % STAMP_COLORS.length],
      weight: 0.7 - i * 0.1,
    }));
    return [...fromWorlds, ...fromEvents].slice(0, 6);
  }, [sortedWorlds, hostedEvents, memberSince]);

  const stats = {
    worlds: sortedWorlds.length,
    events: hostedEvents.length,
    collabs: sortedWorlds.filter((w) => w.role === 'collab').length,
    followers: followerCount,
  };

  const sectionLabel = path === 'worldbuilder' ? 'ENDORSED WORLDS'
    : path === 'catalyst' ? 'CERTIFIED SERVICES'
    : 'VISITED WORLDS';

  // Barcode + MRZ
  const bars = (username || 'TOPIA').split('').flatMap((ch, i) => {
    const code = ch.charCodeAt(0);
    return [
      { type: 'bar' as const, w: ((code * (i + 1)) % 4) + 1 },
      { type: 'gap' as const, w: ((code + i) % 3) + 1 },
    ];
  });
  const mrzLine1 = `P<TOPIA<${(profile?.name || username || '').replace(/[.\s]/g, '<').toUpperCase().padEnd(20, '<')}<<<<<<<<<`;
  const mrzLine2 = `${(profile?.id || '').slice(0, 10).padEnd(10, '<')}<<${(memberSince || '').replace(/\s/g, '').padEnd(6, '<')}<<${path.substring(0, 3).toUpperCase()}<${(username || '').padEnd(14, '<')}<<`;

  if (!loading && (notFound || fetchError)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-obsidian">
        <PageShell><div /></PageShell>
        <p className="font-mono text-[15px] uppercase tracking-tight text-bone">
          {fetchError ? 'Could not load profile — please try again.' : 'Profile not found.'}
        </p>
        <Link href="/" className="font-mono text-[15px] uppercase tracking-tight border-b hover:opacity-70 transition text-bone border-bone/20">
          ← Back to TOPIA
        </Link>
      </div>
    );
  }

  function renderSection() {
    switch (activeSection) {
      case 'world':     return <WorldLayer config={config} />;
      case 'proof':     return <ProofLayer config={config} path={path} stats={stats} />;
      case 'pulse':     return <PulseLayer config={config} />;
      case 'tv':        return <ProfileTV config={config} handle={`@${username}`} />;
      case 'worlds':    return <WorldsLayer config={config} isWorldBuilder={path === 'worldbuilder'} worlds={sortedWorlds} />;
      case 'guestbook': return <GuestbookLayer config={config} />;
      default:          return <IdentityLayer config={config} sectionLabel={sectionLabel} items={endorsedItems} stamps={stamps} />;
    }
  }

  return (
    <div className="min-h-screen bg-obsidian">
      <LoadingScreen onComplete={() => setIsLoaded(true)} />
      <PageShell>
        <section className={`min-h-screen px-4 md:px-6 py-4 md:py-6 transition-opacity duration-500 ${isLoaded && !loading ? 'opacity-100' : 'opacity-0'}`}>
          <div className="max-w-[var(--content-max)] mx-auto">
            {profile && (
              <div className="grid grid-cols-1 gap-[3px] border border-bone/[0.08] rounded-lg overflow-hidden">

                {/* ═══ ROW 1 — UNIFIED ID CARD ═══ */}
                <div className="bg-obsidian relative overflow-hidden">
                  {/* Path-colored accent strip */}
                  <div className={`${config.bg} px-4 py-2 flex items-center justify-between relative`}>
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(26,26,26,0.6) 4px, rgba(26,26,26,0.6) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(26,26,26,0.6) 4px, rgba(26,26,26,0.6) 5px)' }} />
                    <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-40 relative z-10`}>topia://identity</span>
                    <span className={`font-mono text-[11px] uppercase tracking-wider ${config.textOn} opacity-30 relative z-10`}>TOPIA-ID-{profile.id.slice(0, 4).toUpperCase()}</span>
                  </div>

                  {/* Photo + Fields */}
                  <div className="flex flex-col md:flex-row relative">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.025]" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
                      {Array.from({ length: 12 }, (_, i) => {
                        const r = 80 + i * 15;
                        return (<g key={i}>
                          <ellipse cx="400" cy="200" rx={r * 1.5} ry={r * 0.6} fill="none" stroke="#f5f0e8" strokeWidth="0.5" transform={`rotate(${i * 8} 400 200)`} />
                          <ellipse cx="400" cy="200" rx={r * 0.6} ry={r} fill="none" stroke="#f5f0e8" strokeWidth="0.3" transform={`rotate(${i * 8 + 30} 400 200)`} />
                        </g>);
                      })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                      <img src="/brand/logo-white.png" alt="" className="w-32 md:w-40 opacity-[0.03] select-none" draggable={false} />
                    </div>

                    {/* Photo */}
                    <div className="flex items-center justify-center py-6 px-4 md:p-5 relative z-10 md:w-[28%] shrink-0">
                      <div className="flex flex-col items-center">
                        <div className="relative mb-2">
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
                              <div className="absolute inset-0 pointer-events-none z-20" style={{ opacity: 0.12, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.4) 1px, rgba(0,0,0,0.4) 2px)', backgroundSize: '100% 2px' }} />
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-bone/40 mt-1">@{username}</span>
                        <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 ${config.bg} ${config.textOn} inline-block mt-1.5`}>{config.label}</span>
                        <span className="font-mono text-[8px] uppercase tracking-[2px] text-bone/10 mt-2">P1</span>
                      </div>
                    </div>

                    {/* Identity fields */}
                    <div className="flex-1 px-3 py-2 md:px-4 md:py-2.5 flex flex-col justify-center relative z-10">
                      <div className="py-1 border-b border-bone/[0.04]">
                        <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block">full name</span>
                        <h1 className="font-basement font-black text-[clamp(18px,2.2vw,28px)] leading-[0.9] uppercase text-bone mt-0.5">{profile.name || username}</h1>
                      </div>
                      <div className="py-1 border-b border-bone/[0.04] flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block">handle</span>
                          <span className="font-mono text-[13px] text-bone/60 mt-0.5 block">@{username}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block">path</span>
                          <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 ${config.bg} ${config.textOn} inline-block mt-1`}>{config.label}</span>
                        </div>
                      </div>
                      <div className="py-1 border-b border-bone/[0.04] flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block">issued</span>
                          <span className="font-mono text-[11px] text-bone/40 mt-0.5 block">{memberSince || '—'}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block">status</span>
                          <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                            <span className="font-mono text-[11px] text-bone/50">VALID</span>
                          </div>
                        </div>
                      </div>
                      <div className="py-1 border-b border-bone/[0.04] grid grid-cols-2 gap-x-6">
                        <div>
                          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block">location</span>
                          <span className="font-mono text-[11px] text-bone/40 mt-0.5 block">—</span>
                        </div>
                        {profile.bio && (
                          <div>
                            <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block">declaration</span>
                            <span className="font-zirkon text-[11px] text-bone/50 italic mt-0.5 block leading-relaxed line-clamp-2">&ldquo;{profile.bio}&rdquo;</span>
                          </div>
                        )}
                      </div>
                      <div className="py-1 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block mb-1.5">links</span>
                          {socialLinks.length > 0 ? (
                            <div className="flex items-center flex-wrap gap-3">
                              {socialLinks.map((link) => (
                                <a key={link.type} href={link.url!} target="_blank" rel="noopener noreferrer" className="text-bone/30 hover:text-bone/60 transition-colors" title={link.label}>
                                  <SocialIcon type={link.type} size={16} />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="font-mono text-[11px] text-bone/20">—</span>
                          )}
                        </div>
                        <div className="shrink-0">
                          {isOwnProfile && (
                            <Link href="/profile" className="font-mono text-[10px] uppercase tracking-wider text-bone/30 hover:text-bone/60 transition-colors border border-bone/[0.08] rounded-sm px-2 py-0.5 no-underline">
                              Edit
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
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══ ROW 2 — STATS BAR ═══ */}
                <div className="bg-obsidian border-t border-b border-bone/[0.04] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-0">
                    {[
                      { label: 'Worlds', value: String(stats.worlds) },
                      { label: 'Events', value: String(stats.events) },
                      { label: 'Collabs', value: String(stats.collabs) },
                      { label: 'Followers', value: String(stats.followers) },
                    ].map((stat, i, arr) => (
                      <div key={stat.label} className={`flex flex-col px-3 md:px-5 ${i < arr.length - 1 ? 'border-r border-bone/[0.06]' : ''} ${i === 0 ? 'pl-0' : ''}`}>
                        <span className="font-mono text-[8px] uppercase tracking-[2px] text-bone/20">{stat.label}</span>
                        <span className="font-mono text-[15px] md:text-[15px] text-bone font-bold leading-none mt-0.5">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:flex items-center gap-3">
                    <div className="w-32 h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${config.hex}30, ${config.hex}60, ${config.hex}30, transparent)` }} />
                    <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/15">topia://stats</span>
                  </div>
                </div>

                {/* ═══ ROW 3 — SECTION TAB NAV ═══ */}
                <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-2 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {SECTIONS.map((s) => {
                    const isActive = activeSection === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 transition-all rounded-sm whitespace-nowrap cursor-pointer ${isActive ? `${config.bg} ${config.textOn} font-bold` : 'text-bone/30 hover:text-bone/50 bg-transparent'}`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                  <span className="font-mono text-[9px] text-bone/15 ml-auto shrink-0">{SECTIONS.length} sections</span>
                </div>

                {/* ═══ ROW 4 — ACTIVE SECTION CONTENT ═══ */}
                <div className="bg-obsidian overflow-hidden h-[260px] md:h-[280px]">
                  {renderSection()}
                </div>

                {/* ═══ ROW 5 — MRZ STRIP ═══ */}
                <div className="bg-obsidian px-4 py-3 flex items-center justify-between border-t border-bone/[0.04]">
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex items-end gap-0 h-4">
                      {bars.map((b, i) => (
                        <div key={i} className={b.type === 'bar' ? 'bg-bone/10' : ''} style={{ width: `${b.w}px`, height: b.type === 'bar' ? `${12 + (b.w * 2)}px` : '0px', marginRight: b.type === 'gap' ? `${b.w}px` : '0px' }} />
                      ))}
                    </div>
                    <span className="font-mono text-[9px] tracking-[2px] text-bone/15 uppercase truncate block">{mrzLine1}</span>
                    <span className="font-mono text-[9px] tracking-[2px] text-bone/10 uppercase truncate block">{mrzLine2}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="font-mono text-[9px] text-bone/10 hidden md:block">{profile.id.slice(0, 6)}···{profile.id.slice(-4)}</span>
                    <img src="/brand/logo-white.png" alt="" className="w-4 h-4 opacity-20" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="font-mono text-[8px] text-bone/10 uppercase">P1</span>
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
