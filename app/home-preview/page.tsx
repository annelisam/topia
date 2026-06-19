'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageShell from '../components/PageShell';
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

interface EventItem {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  dateIso: string | null;
  city: string | null;
  imageUrl: string | null;
  rsvpCount: number;
  startTime: string | null;
}

interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  roleTags: string | null;
  path: string | null;
  pronouns: string | null;
}

const CAT_DOT: Record<string, string> = { Featured: 'bg-lime', Live: 'bg-pink', Series: 'bg-blue', Replays: 'bg-orange' };

// Themed surfaces — flip automatically between light/dark via CSS variables.
const txt = { color: 'var(--foreground)' };
const card: React.CSSProperties = { backgroundColor: 'var(--background)', borderColor: 'var(--border-color)', color: 'var(--foreground)' };

function fmtEventDate(e: EventItem): string {
  if (e.dateIso) {
    const d = new Date(e.dateIso + 'T00:00:00');
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
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

export default function HomePreview() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    fetch('/api/tv/episodes').then((r) => r.json()).then((d) => setEpisodes(d.episodes ?? [])).catch(() => {});
    fetch('/api/events').then((r) => r.json()).then((d) => {
      const all: EventItem[] = d.events ?? [];
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = all.filter((e) => !e.dateIso || e.dateIso >= today);
      setEvents((upcoming.length ? upcoming : all).slice(0, 6));
    }).catch(() => {});
    fetch('/api/profiles?limit=18').then((r) => r.json()).then((d) => setProfiles(d.profiles ?? [])).catch(() => {});
  }, []);

  const featured = episodes[0];
  const moreEps = episodes.slice(1, 5);
  const emptyBox = 'border rounded-xl py-16 text-center font-mono text-[12px] uppercase tracking-[2px] opacity-30';

  return (
    <PageShell>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">

          {/* Hero */}
          <header className="mb-12 md:mb-16">
            <span className="font-mono text-[12px] uppercase tracking-[3px] opacity-40" style={txt}>topia // a creator engine</span>
            <h1 className="font-basement font-black text-[clamp(40px,9vw,110px)] leading-[0.82] uppercase mt-2" style={txt}>
              Tune in.<br />Show up.<br /><span className="text-lime">Connect.</span>
            </h1>
          </header>

          {/* ── TOPIA TV ── */}
          <section className="mb-16">
            <SectionHead label="now playing" title="Topia TV" href="/tv" linkText="Open TV →" />
            {episodes.length === 0 ? (
              <div className={emptyBox} style={{ ...txt, borderColor: 'var(--border-color)' }}>Loading channel…</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
                {featured && (
                  <Link href="/tv" className="group relative block aspect-video rounded-xl overflow-hidden bg-obsidian no-underline">
                    {featured.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={featured.thumbnailUrl} alt={featured.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500" />
                    ) : (
                      <video src={featured.videoUrl} muted playsInline className="w-full h-full object-cover opacity-90" />
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent 55%)' }} />
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${CAT_DOT[featured.category] ?? 'bg-lime'} animate-pulse`} />
                      <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/80">{featured.category}</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-14 h-14 rounded-full bg-bone/90 flex items-center justify-center text-obsidian text-[20px] group-hover:scale-110 transition-transform">▶</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-basement font-black text-[clamp(18px,2.5vw,28px)] uppercase text-bone leading-tight">{featured.title}</h3>
                      {(featured.seriesTitle || featured.guestName) && (
                        <span className="font-mono text-[11px] text-bone/60">{[featured.seriesTitle, featured.guestName].filter(Boolean).join(' · ')}</span>
                      )}
                    </div>
                  </Link>
                )}
                <div className="grid grid-rows-4 gap-3">
                  {moreEps.map((ep) => (
                    <Link key={ep.id} href="/tv" className="group flex items-center gap-3 rounded-lg overflow-hidden border hover:opacity-80 transition-opacity no-underline p-2" style={card}>
                      <div className="w-[88px] h-[52px] shrink-0 rounded-md overflow-hidden bg-obsidian">
                        {ep.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ep.thumbnailUrl} alt={ep.title} className="w-full h-full object-cover" />
                        ) : (
                          <video src={ep.videoUrl} muted playsInline className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${CAT_DOT[ep.category] ?? 'bg-lime'}`} />
                          <span className="font-mono text-[9px] uppercase tracking-[1.5px] opacity-40" style={txt}>{ep.category}</span>
                        </div>
                        <span className="font-mono text-[12px] font-bold uppercase block truncate" style={txt}>{ep.title}</span>
                      </div>
                    </Link>
                  ))}
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {events.map((ev) => (
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
          </section>

          {/* ── DISCOVER PROFILES ── */}
          <section className="mb-12">
            <SectionHead label="the community" title="Discover" />
            {profiles.length === 0 ? (
              <div className={emptyBox} style={{ ...txt, borderColor: 'var(--border-color)' }}>Loading profiles…</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {profiles.map((p) => {
                  const tags = (p.roleTags ?? '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 2);
                  const initial = (p.name || p.username || '?')[0]?.toUpperCase();
                  return (
                    <Link key={p.id} href={`/profile/${p.username}`} className="group block rounded-xl overflow-hidden border bg-obsidian hover:border-lime transition-colors no-underline" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="aspect-square overflow-hidden bg-obsidian relative">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt={p.name ?? ''} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-basement font-black text-[40px] text-bone/20">{initial}</div>
                        )}
                        <div className="absolute top-2 left-2"><PathBadge path={p.path} /></div>
                      </div>
                      <div className="p-2.5">
                        <h3 className="font-mono text-[12px] font-bold text-bone truncate leading-tight">{p.name || `@${p.username}`}</h3>
                        <span className="font-mono text-[10px] text-bone/40 block truncate">@{p.username}</span>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
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
