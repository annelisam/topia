'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import PageShell from '../components/PageShell';
import GlitchType from '../components/ui/GlitchType';
import { PATH_CONFIG, type UserPath } from '../components/profile/pathConfig';

interface Episode {
  id: string;
  slug: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  seriesTitle: string | null;
  guestName: string | null;
}

interface EventHost {
  userId: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface EventItem {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  dateIso: string | null;
  city: string | null;
  address: string | null;
  imageUrl: string | null;
  rsvpCount: number;
  startTime: string | null;
  hosts: EventHost[];
}

interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  roleTags: string | null;
  path: string | null;
  pronouns: string | null;
  isWorldBuilder?: boolean;
  createdAt?: string;
}

// New if the profile was created within the last 21 days.
function isNewProfile(createdAt?: string): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  return !isNaN(t) && Date.now() - t < 21 * 24 * 60 * 60 * 1000;
}

const CAT_DOT: Record<string, string> = { Featured: 'bg-lime', Live: 'bg-pink', Series: 'bg-blue', Replays: 'bg-orange' };

const txt = { color: 'var(--foreground)' };
const card: React.CSSProperties = { backgroundColor: 'var(--background)', borderColor: 'var(--border-color)', color: 'var(--foreground)' };

function fmtEventDate(e: EventItem): string {
  if (e.dateIso) {
    const d = new Date(e.dateIso + 'T00:00:00');
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  }
  return (e.date ?? '').toUpperCase();
}

function PathBadge({ path }: { path: string | null }) {
  if (!path || !(path in PATH_CONFIG)) return null;
  const c = PATH_CONFIG[path as UserPath];
  return <span className={`font-mono text-[8px] uppercase tracking-[1.5px] px-1.5 py-0.5 rounded-sm font-bold ${c.bg} ${c.textOn}`}>{c.label}</span>;
}

function SectionHead({ label, title, href, linkText }: { label: string; title: string; href?: string; linkText?: string }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <span className="font-mono text-[11px] uppercase tracking-[3px] opacity-40 block mb-1" style={txt}>{label}</span>
        <h2 className="font-basement font-black text-[clamp(26px,4vw,44px)] leading-[0.9] uppercase" style={txt}>{title}</h2>
      </div>
      {href && (
        <Link href={href} className="font-mono text-[11px] uppercase tracking-[2px] opacity-60 hover:opacity-100 no-underline border-b pb-0.5 shrink-0 transition-opacity" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
          {linkText ?? 'View all →'}
        </Link>
      )}
    </div>
  );
}

/* ── Inline TV player — autoplays muted on the home page (like the TV page) ── */
function HomeTVPlayer({ episode }: { episode: Episode }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, [episode.id]);

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (v.paused) v.play().catch(() => {});
  };

  return (
    <div className="group relative aspect-video rounded-xl overflow-hidden bg-obsidian">
      <video
        ref={ref}
        src={episode.videoUrl}
        poster={episode.thumbnailUrl ?? undefined}
        muted={muted}
        loop
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent 50%)' }} />

      {/* Live/category chip */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${CAT_DOT[episode.category] ?? 'bg-lime'} animate-pulse`} />
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/80">Now playing · {episode.category}</span>
      </div>

      {/* Unmute toggle */}
      <button
        onClick={toggleMute}
        className="absolute top-3.5 right-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1.5px] px-2.5 py-1 rounded-full bg-bone/90 text-obsidian hover:bg-bone transition cursor-pointer"
      >
        {muted ? '🔇 Tap to unmute' : '🔊 Sound on'}
      </button>

      {/* Title + open-TV link */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-basement font-black text-[clamp(18px,2.5vw,28px)] uppercase text-bone leading-tight truncate">{episode.title}</h3>
          {(episode.seriesTitle || episode.guestName) && (
            <span className="font-mono text-[11px] text-bone/60">{[episode.seriesTitle, episode.guestName].filter(Boolean).join(' · ')}</span>
          )}
        </div>
        <Link href="/tv" className="shrink-0 font-mono text-[10px] uppercase tracking-[2px] px-3 py-1.5 rounded-sm bg-lime text-obsidian font-bold no-underline hover:opacity-80 transition">Open TV →</Link>
      </div>
    </div>
  );
}

export default function HomePreview() {
  const { user } = usePrivy();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  // null = unknown / logged out; true/false = the viewer's profile completeness.
  const [viewerComplete, setViewerComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) { setViewerComplete(null); return; }
    fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((d) => {
        const u = d.user;
        setViewerComplete(!!(u && u.avatarUrl && u.name && u.username && u.roleTags));
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    fetch('/api/tv/episodes').then((r) => r.json()).then((d) => setEpisodes(d.episodes ?? [])).catch(() => {});
    fetch('/api/events').then((r) => r.json()).then((d) => {
      const all: EventItem[] = d.events ?? [];
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = all.filter((e) => !e.dateIso || e.dateIso >= today);
      setEvents((upcoming.length ? upcoming : all).slice(0, 7));
    }).catch(() => {});
    // Only completed profiles (photo + name + tags), most recent first.
    fetch('/api/profiles?complete=1&limit=24').then((r) => r.json()).then((d) => setProfiles(d.profiles ?? [])).catch(() => {});
  }, []);

  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: number) => {
    const el = carouselRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(260, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  const featuredEp = episodes[0];
  const moreEps = episodes.slice(1, 5);
  const featuredEvent = events[0];
  const restEvents = events.slice(1, 7);
  const emptyBox = 'border rounded-xl py-16 text-center font-mono text-[12px] uppercase tracking-[2px] opacity-30';

  return (
    <PageShell>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>

        {/* ── HERO ── */}
        <header className="border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-14 md:py-20">
            <span className="font-mono text-[12px] uppercase tracking-[4px] opacity-40 block mb-4" style={txt}>topia // welcome to beta</span>
            <h1 className="font-basement font-black text-[clamp(48px,11vw,128px)] leading-[0.82] uppercase" style={txt}>
              TOPIA<span className="text-lime">.</span>
            </h1>
            <div className="font-mono font-bold text-[clamp(20px,3.2vw,40px)] uppercase mt-3 mb-7 text-lime" style={{ minHeight: '1.1em' }}>
              <GlitchType text="It is what you make it." speed={26} />
            </div>

            <div className="max-w-2xl space-y-4">
              <p className="font-mono text-[clamp(13px,1.5vw,16px)] leading-[1.8] opacity-80" style={{ ...txt, opacity: 0, animation: 'fadeUp 0.6s ease-out 600ms forwards' }}>
                Welcome to beta — and to a new path for ownership and sovereignty.
              </p>
              <p className="font-mono text-[clamp(12px,1.4vw,15px)] leading-[1.8] opacity-60" style={{ ...txt, opacity: 0, animation: 'fadeUp 0.6s ease-out 800ms forwards' }}>
                <span className="opacity-100 font-bold">What is TOPIA?</span> Not another algorithm to fight. Not another platform to feed. It&apos;s the infrastructure: a network of world builders your algorithm can&apos;t contain, and a community to support your ecosystem.
              </p>
              <p className="font-mono text-[clamp(12px,1.4vw,15px)] leading-[1.8] opacity-60" style={{ ...txt, opacity: 0, animation: 'fadeUp 0.6s ease-out 1000ms forwards' }}>
                We&apos;re still building. You&apos;re here early because we need you — to tell us what&apos;s working, what&apos;s missing, and what TOPIA should become.
              </p>
            </div>
          </div>
        </header>

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-10 md:py-14">

          {/* ── TOPIA TV ── */}
          <section className="mb-16">
            <SectionHead label="now playing" title="Topia TV" href="/tv" linkText="Open TV →" />
            {episodes.length === 0 ? (
              <div className={emptyBox} style={{ ...txt, borderColor: 'var(--border-color)' }}>Loading channel…</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
                {featuredEp && <HomeTVPlayer episode={featuredEp} />}
                {/* Guide panel — mirrors the TV page (now playing / up next) */}
                <div className="relative rounded-xl overflow-hidden border bg-obsidian flex flex-col min-h-[260px]" style={{ borderColor: 'var(--border-color)' }}>
                  {/* CRT scanline texture */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-[1]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(245,240,232,1) 3px, rgba(245,240,232,1) 4px)' }} />
                  <div className="relative z-[2] flex items-center justify-between px-3 py-2.5 border-b border-bone/[0.08]">
                    <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40">Topia TV // Guide</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" /><span className="font-mono text-[9px] uppercase tracking-[2px] text-lime">Live</span></span>
                  </div>

                  {/* Now playing */}
                  {featuredEp && (
                    <div className="relative z-[2] flex items-stretch border-b border-bone/[0.08] bg-bone/[0.05]">
                      <div className={`w-1 shrink-0 ${CAT_DOT[featuredEp.category] ?? 'bg-lime'}`} />
                      <div className="px-3 py-2.5 min-w-0 flex-1">
                        <span className="font-mono text-[8px] uppercase tracking-[2px] text-lime block mb-1">▸ Now playing</span>
                        <span className="font-mono text-[12px] font-bold uppercase text-bone block truncate">{featuredEp.title}</span>
                        <span className="font-mono text-[9px] text-bone/40 uppercase tracking-wider">{[featuredEp.category, featuredEp.guestName].filter(Boolean).join(' · ')}</span>
                      </div>
                    </div>
                  )}

                  {/* Up next */}
                  <div className="relative z-[2] px-3 pt-2.5 pb-1">
                    <span className="font-mono text-[8px] uppercase tracking-[2px] text-bone/30">Up next</span>
                  </div>
                  <div className="relative z-[2] flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {moreEps.map((ep, i) => (
                      <Link key={ep.id} href="/tv" className="group flex items-stretch border-b border-bone/[0.04] hover:bg-bone/[0.03] transition-colors no-underline">
                        <div className={`w-1 shrink-0 ${CAT_DOT[ep.category] ?? 'bg-lime'} opacity-40 group-hover:opacity-100 transition-opacity`} />
                        <div className="w-10 shrink-0 flex items-center justify-center border-r border-bone/[0.04]">
                          <span className="font-basement font-black text-[13px] text-bone/25 group-hover:text-bone/60 transition-colors">{String(i + 2).padStart(3, '0')}</span>
                        </div>
                        <div className="flex-1 px-3 py-2.5 min-w-0">
                          <span className="font-mono text-[11px] font-bold uppercase text-bone block truncate">{ep.title}</span>
                          <span className="font-mono text-[9px] text-bone/30 uppercase tracking-wider">{ep.category}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── EVENTS ── */}
          <section className="mb-16">
            <SectionHead label="happening on topia" title="Events" href="/events" />
            {events.length === 0 ? (
              <div className={emptyBox} style={{ ...txt, borderColor: 'var(--border-color)' }}>No upcoming events</div>
            ) : (
              <>
                {/* Featured event — image + details column */}
                {featuredEvent && (
                  <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-3 mb-3 rounded-xl overflow-hidden border" style={card}>
                    {/* Image fills the column and crops (object-cover) so the
                        flyer never stretches the row — the details drive height. */}
                    <Link href={`/events/${featuredEvent.slug}`} className="group block relative aspect-[16/10] md:aspect-auto bg-obsidian overflow-hidden no-underline">
                      {featuredEvent.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={featuredEvent.imageUrl} alt={featuredEvent.eventName} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center font-basement font-black text-[40px] uppercase text-bone/15">TOPIA</div>
                      )}
                      <span className="absolute top-3 left-3 z-10 font-mono text-[9px] uppercase tracking-[2px] bg-lime text-obsidian px-2 py-0.5 rounded-sm font-bold">Featured</span>
                    </Link>

                    <div className="p-5 md:p-6 flex flex-col">
                      <span className="font-mono text-[10px] uppercase tracking-[2px] text-orange font-bold">{fmtEventDate(featuredEvent)}{featuredEvent.startTime ? ` · ${featuredEvent.startTime}` : ''}</span>
                      <h3 className="font-basement font-black text-[clamp(22px,2.6vw,32px)] uppercase leading-[0.95] mt-2 mb-4" style={txt}>{featuredEvent.eventName}</h3>

                      <dl className="space-y-2.5 font-mono text-[12px]" style={txt}>
                        <div className="flex items-start gap-2">
                          <dt className="opacity-40 uppercase tracking-wider text-[10px] w-20 shrink-0 pt-0.5">Presented by</dt>
                          <dd className="font-bold opacity-90">TOPIA</dd>
                        </div>
                        {featuredEvent.hosts.length > 0 && (
                          <div className="flex items-start gap-2">
                            <dt className="opacity-40 uppercase tracking-wider text-[10px] w-20 shrink-0 pt-0.5">Hosts</dt>
                            <dd className="flex items-center gap-2 flex-wrap">
                              <div className="flex -space-x-1.5">
                                {featuredEvent.hosts.slice(0, 5).map((h) => (
                                  <span key={h.userId} className="block w-6 h-6 rounded-full overflow-hidden border-2 bg-obsidian" style={{ borderColor: 'var(--background)' }} title={h.name || h.username || ''}>
                                    {h.avatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={h.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="w-full h-full flex items-center justify-center text-[9px] opacity-50">{(h.name || h.username || '?')[0]?.toUpperCase()}</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                              <span className="opacity-70 text-[11px]">{featuredEvent.hosts.map((h) => h.name || h.username).filter(Boolean).slice(0, 2).join(', ')}{featuredEvent.hosts.length > 2 ? ` +${featuredEvent.hosts.length - 2}` : ''}</span>
                            </dd>
                          </div>
                        )}
                        {(featuredEvent.city || featuredEvent.address) && (
                          <div className="flex items-start gap-2">
                            <dt className="opacity-40 uppercase tracking-wider text-[10px] w-20 shrink-0 pt-0.5">Location</dt>
                            <dd className="opacity-80">{[featuredEvent.address, featuredEvent.city].filter(Boolean).join(', ')}</dd>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <dt className="opacity-40 uppercase tracking-wider text-[10px] w-20 shrink-0 pt-0.5">RSVPs</dt>
                          <dd className="opacity-80">{featuredEvent.rsvpCount} going</dd>
                        </div>
                      </dl>

                      <Link href={`/events/${featuredEvent.slug}`} className="mt-5 self-start inline-flex items-center font-mono text-[11px] uppercase tracking-[2px] px-5 py-2.5 rounded-sm bg-[var(--foreground)] text-[var(--background)] font-bold no-underline hover:opacity-80 transition">
                        View Event →
                      </Link>
                    </div>
                  </div>
                )}

                {/* Rest of upcoming events */}
                {restEvents.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {restEvents.map((ev) => (
                      <Link key={ev.id} href={`/events/${ev.slug}`} className="group block rounded-xl overflow-hidden border hover:opacity-90 transition-opacity no-underline" style={card}>
                        <div className="aspect-[4/3] bg-obsidian/[0.06] overflow-hidden">
                          {ev.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ev.imageUrl} alt={ev.eventName} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-basement font-black text-[28px] uppercase opacity-15" style={txt}>TOPIA</div>
                          )}
                        </div>
                        <div className="p-3">
                          <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-orange font-bold">{fmtEventDate(ev)}{ev.city ? ` · ${ev.city}` : ''}</span>
                          <h3 className="font-basement font-black text-[15px] uppercase leading-tight mt-1 mb-1.5 line-clamp-2" style={txt}>{ev.eventName}</h3>
                          <span className="font-mono text-[10px] opacity-40" style={txt}>{ev.rsvpCount} going</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* ── DISCOVER PROFILES (carousel) ── */}
          <section className="mb-12">
            <div className="flex items-end justify-between mb-5">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[3px] opacity-40 block mb-1" style={txt}>the community</span>
                <h2 className="font-basement font-black text-[clamp(26px,4vw,44px)] leading-[0.9] uppercase" style={txt}>Discover</h2>
              </div>
              <div className="flex items-center gap-2">
                {[-1, 1].map((dir) => (
                  <button
                    key={dir}
                    onClick={() => scrollCarousel(dir)}
                    aria-label={dir < 0 ? 'Scroll left' : 'Scroll right'}
                    className="w-9 h-9 rounded-full border flex items-center justify-center font-mono text-[14px] hover:bg-[var(--surface-hover)] transition cursor-pointer"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}
                  >
                    {dir < 0 ? '←' : '→'}
                  </button>
                ))}
              </div>
            </div>

            {profiles.length === 0 && viewerComplete !== false ? (
              <div className={emptyBox} style={{ ...txt, borderColor: 'var(--border-color)' }}>Loading profiles…</div>
            ) : (
              <div ref={carouselRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 md:-mx-8 md:px-8 pb-2" style={{ scrollbarWidth: 'none' }}>
                {/* Nudge the viewer to finish their own profile */}
                {viewerComplete === false && (
                  <Link href="/onboarding" className="group flex flex-col items-center justify-center text-center gap-3 w-[230px] shrink-0 snap-start rounded-xl border-2 border-dashed p-6 no-underline hover:border-lime transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center font-mono text-[22px] text-lime" style={{ borderColor: 'var(--border-color)' }}>+</span>
                    <span className="font-basement font-black text-[16px] uppercase leading-tight" style={txt}>Complete your profile</span>
                    <span className="font-mono text-[10px] uppercase tracking-[2px] text-lime">Finish onboarding →</span>
                  </Link>
                )}

                {profiles.map((p) => {
                  const tags = (p.roleTags ?? '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 2);
                  const initial = (p.name || p.username || '?')[0]?.toUpperCase();
                  return (
                    <Link key={p.id} href={`/profile/${p.username}`} className="group block w-[230px] shrink-0 snap-start rounded-xl overflow-hidden border bg-obsidian hover:border-lime transition-colors no-underline" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="aspect-[4/5] overflow-hidden bg-obsidian relative">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt={p.name ?? ''} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-basement font-black text-[48px] text-bone/20">{initial}</div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-obsidian to-transparent" />
                        <div className="absolute top-2.5 left-2.5">
                          {/* One badge: membership-accurate World Builder, else the path badge */}
                          {p.isWorldBuilder ? (
                            <span className="font-mono text-[8px] uppercase tracking-[1.5px] px-1.5 py-0.5 rounded-sm font-bold bg-lime text-obsidian">World Builder</span>
                          ) : (
                            <PathBadge path={p.path} />
                          )}
                        </div>
                        {isNewProfile(p.createdAt) && (
                          <span className="absolute top-2.5 right-2.5 font-mono text-[8px] uppercase tracking-[1.5px] px-1.5 py-0.5 rounded-sm font-bold bg-pink text-obsidian">New</span>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-basement font-black text-[16px] uppercase text-bone truncate leading-tight">{p.name || `@${p.username}`}</h3>
                        <span className="font-mono text-[10px] text-bone/40 block truncate">@{p.username}</span>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map((t) => (
                              <span key={t} className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 border border-bone/15 text-bone/50 rounded-sm whitespace-nowrap">{t.replace(/-/g, ' ')}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </PageShell>
  );
}
