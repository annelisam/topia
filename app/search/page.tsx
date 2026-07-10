'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import Navigation from '../components/Navigation';

/* Unified search — people, worlds, events in one surface. People come from
 * /api/users/search (auth-gated); worlds and events are fetched once and
 * filtered client-side (both lists are small). Reached from the mobile
 * pill's Search tab and linkable from anywhere. */

interface Person { id: string; name: string | null; username: string | null; avatarUrl: string | null; }
interface WorldHit { title: string; slug: string; imageUrl: string | null; category: string | null; shortDescription: string | null; }
interface EventHit { eventName: string; slug: string; date: string | null; city: string | null; imageUrl: string | null; }

const rowCls = 'flex items-center gap-3 px-3 py-2.5 border rounded-lg no-underline hover:opacity-70 transition';

export default function SearchPage() {
  const { user, authenticated, ready } = usePrivy();
  const privyId = user?.id;

  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [worlds, setWorlds] = useState<WorldHit[]>([]);
  const [events, setEvents] = useState<EventHit[]>([]);
  const [loadedStatic, setLoadedStatic] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Worlds + events: one fetch each, filtered locally as you type.
  useEffect(() => {
    Promise.all([
      fetch('/api/worlds').then((r) => r.json()).catch(() => ({})),
      fetch('/api/events').then((r) => r.json()).catch(() => ({})),
    ]).then(([w, e]) => {
      setWorlds(w.worlds ?? []);
      setEvents(e.events ?? []);
      setLoadedStatic(true);
    });
  }, []);

  // People: debounced server search (needs an authenticated caller).
  useEffect(() => {
    if (!authenticated || !privyId || q.trim().length < 2) { setPeople([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}&privyId=${encodeURIComponent(privyId)}`)
        .then((r) => r.json())
        .then((d) => setPeople(d.users ?? []))
        .catch(() => setPeople([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, authenticated, privyId]);

  const needle = q.trim().toLowerCase();
  const worldHits = useMemo(
    () => needle.length < 2 ? [] : worlds.filter((w) =>
      [w.title, w.category, w.shortDescription].some((f) => f?.toLowerCase().includes(needle))).slice(0, 8),
    [worlds, needle],
  );
  const eventHits = useMemo(
    () => needle.length < 2 ? [] : events.filter((e) =>
      [e.eventName, e.city].some((f) => f?.toLowerCase().includes(needle))).slice(0, 8),
    [events, needle],
  );

  const searching = needle.length >= 2;
  const nothing = searching && loadedStatic && people.length === 0 && worldHits.length === 0 && eventHits.length === 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 pt-8 sm:pt-28 pb-[var(--mobile-nav-clearance)] md:pb-32 max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-50 mb-1" style={{ color: 'var(--foreground)' }}>
          Search // the network
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-5" style={{ color: 'var(--foreground)' }}>
          Search
        </h1>

        {/* ≥16px so iOS doesn't zoom on focus */}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="People, worlds, events…"
          className="w-full border px-4 py-3 font-mono text-[16px] rounded-xl outline-none mb-6"
          style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
        />

        {!searching && (
          <p className="font-mono text-[12px] opacity-40" style={{ color: 'var(--foreground)' }}>
            Type at least two characters — results appear as you type.
          </p>
        )}

        {searching && ready && !authenticated && (
          <p className="font-mono text-[11px] opacity-50 mb-4" style={{ color: 'var(--foreground)' }}>
            Log in to search people — worlds and events are below.
          </p>
        )}

        {people.length > 0 && (
          <section className="mb-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] opacity-50 mb-2" style={{ color: 'var(--foreground)' }}>People</p>
            <div className="space-y-2">
              {people.map((p) => (
                <Link key={p.id} href={p.username ? `/profile/${p.username}` : '#'} className={rowCls} style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}>
                  {p.avatarUrl
                    ? <img src={p.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                    : <span className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-[13px] font-bold shrink-0" style={{ backgroundColor: 'var(--surface-hover)' }}>{(p.name || p.username || '?')[0].toUpperCase()}</span>}
                  <span className="min-w-0">
                    <span className="font-mono text-[13px] font-bold truncate block">{p.name || p.username}</span>
                    {p.username && <span className="font-mono text-[11px] opacity-50 truncate block">@{p.username}</span>}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {worldHits.length > 0 && (
          <section className="mb-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] opacity-50 mb-2" style={{ color: 'var(--foreground)' }}>Worlds</p>
            <div className="space-y-2">
              {worldHits.map((w) => (
                <Link key={w.slug} href={`/worlds/${w.slug}`} className={rowCls} style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}>
                  {w.imageUrl
                    ? <img src={w.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    : <span className="w-9 h-9 rounded-lg flex items-center justify-center font-mono text-[13px] font-bold shrink-0" style={{ backgroundColor: 'var(--surface-hover)' }}>{w.title[0]}</span>}
                  <span className="min-w-0">
                    <span className="font-mono text-[13px] font-bold uppercase truncate block">{w.title}</span>
                    <span className="font-mono text-[11px] opacity-50 truncate block">{[w.category, w.shortDescription].filter(Boolean).join(' · ')}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {eventHits.length > 0 && (
          <section className="mb-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] opacity-50 mb-2" style={{ color: 'var(--foreground)' }}>Events</p>
            <div className="space-y-2">
              {eventHits.map((e) => (
                <Link key={e.slug} href={`/events/${e.slug}`} className={rowCls} style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}>
                  {e.imageUrl
                    ? <img src={e.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    : <span className="w-9 h-9 rounded-lg flex items-center justify-center font-mono text-[13px] shrink-0" style={{ backgroundColor: 'var(--surface-hover)' }}>◆</span>}
                  <span className="min-w-0">
                    <span className="font-mono text-[13px] font-bold uppercase truncate block">{e.eventName}</span>
                    <span className="font-mono text-[11px] opacity-50 truncate block">{[e.date, e.city].filter(Boolean).join(' · ')}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {nothing && (
          <p className="font-mono text-[12px] opacity-40" style={{ color: 'var(--foreground)' }}>
            Nothing matches “{q.trim()}” yet.
          </p>
        )}
      </div>
    </div>
  );
}
