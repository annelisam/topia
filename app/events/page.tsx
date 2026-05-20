'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import PageShell from '../components/PageShell';
import { CheckIcon, StarIcon } from '../components/ui/Icons';
import EventModal from './EventModal';
import SubmitEventModal from './SubmitEventModal';

interface EventHost {
  userId: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: string;
}

interface EventCard {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  dateIso: string | null;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  city: string | null;
  address: string | null;
  link: string | null;
  imageUrl: string | null;
  description: string | null;
  hosts: EventHost[];
  rsvpCount: number;
  isGoing: boolean;
  isHosting: boolean;
  isSaved: boolean;
}

type Tab = 'all' | 'upcoming' | 'thisWeek' | 'past' | 'saved' | 'mine';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'thisWeek', label: 'This week' },
  { id: 'past',     label: 'Past' },
  { id: 'saved',    label: 'Saved' },
  { id: 'mine',     label: 'Mine' },
];

function formatDayChip(iso: string | null): { day: string; mon: string; year: string } {
  if (!iso) return { day: '—', mon: '', year: '' };
  try {
    const d = new Date(iso);
    return {
      day: String(d.getUTCDate()).padStart(2, '0'),
      mon: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
      year: String(d.getUTCFullYear()),
    };
  } catch { return { day: '—', mon: '', year: '' }; }
}

function dateGroupKey(iso: string | null, isPast: boolean): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const day = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffMs = day.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (isPast) {
    if (diffDays >= -7) return 'LAST WEEK';
    if (diffDays >= -30) return 'LAST MONTH';
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
  }
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  if (diffDays <= 7) return 'THIS WEEK';
  if (diffDays <= 14) return 'NEXT WEEK';
  if (diffDays <= 30) return 'THIS MONTH';
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
}

export default function EventsPage() {
  const { authenticated, user } = usePrivy();
  const [events, setEvents] = useState<EventCard[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [tab, setTab] = useState<Tab>('upcoming');
  const [search, setSearch] = useState('');
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // Single batched fetch
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.id) params.set('privyId', user.id);
      if (selectedCity) params.set('city', selectedCity);
      const res = await fetch(`/api/events/overview?${params}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setCities(data.cities ?? []);
    } catch (err) {
      console.error('events overview load failed', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedCity]);

  useEffect(() => { reload(); }, [reload]);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (document.activeElement?.tagName ?? '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Derived list: filter by tab, search ────────────────────── */

  const today = new Date().toISOString().slice(0, 10);
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    let list = events;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        e.eventName.toLowerCase().includes(q) ||
        (e.city ?? '').toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q)
      );
    }
    switch (tab) {
      case 'upcoming': list = list.filter((e) => !e.dateIso || e.dateIso >= today); break;
      case 'thisWeek': list = list.filter((e) => e.dateIso && e.dateIso >= today && e.dateIso <= weekFromNow); break;
      case 'past':     list = list.filter((e) => e.dateIso && e.dateIso < today); break;
      case 'saved':    list = list.filter((e) => e.isSaved); break;
      case 'mine':     list = list.filter((e) => e.isGoing || e.isHosting); break;
      case 'all':      break;
    }
    if (tab === 'past') {
      // Most recent past first
      list = [...list].sort((a, b) => (b.dateIso ?? '').localeCompare(a.dateIso ?? ''));
    }
    return list;
  }, [events, search, tab, today, weekFromNow]);

  // Counts for tab labels
  const counts = useMemo(() => {
    return {
      all: events.length,
      upcoming: events.filter((e) => !e.dateIso || e.dateIso >= today).length,
      thisWeek: events.filter((e) => e.dateIso && e.dateIso >= today && e.dateIso <= weekFromNow).length,
      past: events.filter((e) => e.dateIso && e.dateIso < today).length,
      saved: events.filter((e) => e.isSaved).length,
      mine: events.filter((e) => e.isGoing || e.isHosting).length,
    };
  }, [events, today, weekFromNow]);

  // Date grouping
  const grouped = useMemo(() => {
    const groups: { label: string; items: EventCard[] }[] = [];
    let current: { label: string; items: EventCard[] } | null = null;
    for (const ev of filtered) {
      const isPast = !!(ev.dateIso && ev.dateIso < today);
      const label = dateGroupKey(ev.dateIso, isPast);
      if (!current || current.label !== label) {
        current = { label, items: [] };
        groups.push(current);
      }
      current.items.push(ev);
    }
    return groups;
  }, [filtered, today]);

  const activeEvent = activeSlug ? events.find((e) => e.slug === activeSlug) ?? null : null;

  /* ── Optimistic toggles ─────────────────────────────────────── */

  async function toggleRsvp(eventId: string, going: boolean) {
    if (!user?.id) return;
    // Optimistic local update
    setEvents((list) =>
      list.map((e) => e.id === eventId
        ? { ...e, isGoing: going, rsvpCount: Math.max(0, e.rsvpCount + (going ? 1 : -1)) }
        : e
      ),
    );
    try {
      if (going) {
        await fetch('/api/events/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privyId: user.id, eventId }),
        });
      } else {
        await fetch('/api/events/rsvp', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privyId: user.id, eventId }),
        });
      }
    } catch (err) {
      console.error('RSVP failed', err);
      // Revert
      setEvents((list) =>
        list.map((e) => e.id === eventId
          ? { ...e, isGoing: !going, rsvpCount: Math.max(0, e.rsvpCount + (going ? -1 : 1)) }
          : e
        ),
      );
    }
  }

  async function toggleSave(slug: string, saved: boolean) {
    if (!user?.id) return;
    setEvents((list) => list.map((e) => e.slug === slug ? { ...e, isSaved: saved } : e));
    try {
      await fetch('/api/events/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, slug, action: saved ? 'save' : 'unsave' }),
      });
    } catch (err) {
      console.error('save event failed', err);
      setEvents((list) => list.map((e) => e.slug === slug ? { ...e, isSaved: !saved } : e));
    }
  }

  return (
    <div className="min-h-screen bg-obsidian text-bone w-full overflow-x-hidden">
      <PageShell>
        <section className="px-4 md:px-6 py-4 md:py-6">
          <div className="max-w-[var(--content-max)] mx-auto">
            <div className="grid grid-cols-1 gap-[3px] border border-bone/[0.08] rounded-lg overflow-hidden">

              {/* ─── ROW 1: Title bar ─── */}
              <div className="bg-lime relative">
                <div className="px-4 md:px-6 py-4 md:py-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[2px] text-obsidian/50 block">events // gatherings</span>
                    <h1 className="font-basement font-black text-[clamp(28px,5vw,64px)] uppercase leading-[0.9] text-obsidian mt-1">
                      EVENTS
                    </h1>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-2">
                    <span className="font-mono text-[12px] text-obsidian/80 leading-snug">gatherings, launches, sessions, rituals.</span>
                    <button
                      onClick={() => setSubmitOpen(true)}
                      className="font-mono text-[11px] uppercase tracking-[2px] bg-obsidian text-lime px-3 py-1.5 rounded-sm hover:opacity-90 transition cursor-pointer border-none"
                    >
                      + create event
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── ROW 2: Search + city + count ─── */}
              <div className="bg-obsidian border-t border-b border-bone/[0.06] px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 sticky top-[var(--nav-height,56px)] z-30">
                <div className="relative flex-1">
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="search events, cities, descriptions…  press /"
                    className="w-full bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[13px] text-bone placeholder:text-bone/25 px-3 py-1.5 pr-10 rounded-sm outline-none transition-colors"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[14px] text-bone/40 hover:text-bone transition bg-transparent border-none cursor-pointer w-5 h-5 flex items-center justify-center"
                      aria-label="Clear"
                    >
                      ×
                    </button>
                  )}
                </div>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[12px] uppercase tracking-[1px] text-bone/70 px-3 py-1.5 rounded-sm outline-none cursor-pointer transition-colors"
                >
                  <option value="" className="bg-obsidian text-bone">all locations</option>
                  {cities.map((c) => (
                    <option key={c} value={c} className="bg-obsidian text-bone">{c}</option>
                  ))}
                </select>
                <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40 md:ml-auto shrink-0">
                  {filtered.length} event{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* ─── ROW 3: Tabs ─── */}
              <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-2 flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {TABS.map((t) => {
                  const n = counts[t.id];
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-sm whitespace-nowrap transition cursor-pointer ${
                        active
                          ? 'bg-lime text-obsidian font-bold border-transparent'
                          : 'text-bone/40 hover:text-bone/80 bg-transparent border border-transparent'
                      }`}
                    >
                      {t.label}
                      {n > 0 && <span className={active ? 'text-obsidian/60' : 'text-bone/30'}>{n}</span>}
                    </button>
                  );
                })}
              </div>

              {/* ─── ROW 4: Grouped list ─── */}
              <div className="bg-obsidian min-h-[400px]">
                {loading ? (
                  <EventsListSkeleton />
                ) : grouped.length === 0 ? (
                  <EmptyState tab={tab} search={search} selectedCity={selectedCity} onClear={() => { setSearch(''); setSelectedCity(''); setTab('all'); }} onCreate={() => setSubmitOpen(true)} />
                ) : (
                  grouped.map((group) => (
                    <div key={group.label}>
                      {/* Sticky group header */}
                      <div className="sticky top-[calc(var(--nav-height,56px)+58px)] z-20 bg-obsidian/95 backdrop-blur-sm px-4 py-1.5 border-y border-bone/[0.06]">
                        <span className="font-mono text-[10px] uppercase tracking-[3px] text-bone/40">{group.label} · {group.items.length}</span>
                      </div>
                      <div className="divide-y divide-bone/[0.04]">
                        {group.items.map((ev) => (
                          <EventRow
                            key={ev.id}
                            event={ev}
                            authenticated={authenticated}
                            today={today}
                            onOpen={() => setActiveSlug(ev.slug)}
                            onToggleRsvp={() => toggleRsvp(ev.id, !ev.isGoing)}
                            onToggleSave={() => toggleSave(ev.slug, !ev.isSaved)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Modal overlays */}
        <EventModal
          event={activeEvent}
          onClose={() => setActiveSlug(null)}
          onToggleRsvp={async (eventId, going) => toggleRsvp(eventId, going)}
          onToggleSave={async (slug, saved) => toggleSave(slug, saved)}
        />
        <SubmitEventModal
          open={submitOpen}
          onClose={() => setSubmitOpen(false)}
          onCreated={() => { setSubmitOpen(false); reload(); }}
        />
      </PageShell>
    </div>
  );
}

/* ── Event row ──────────────────────────────────────────────── */

interface RowProps {
  event: EventCard;
  authenticated: boolean;
  today: string;
  onOpen: () => void;
  onToggleRsvp: () => void;
  onToggleSave: () => void;
}

function EventRow({ event, authenticated, today, onOpen, onToggleRsvp, onToggleSave }: RowProps) {
  const isPast = !!(event.dateIso && event.dateIso < today);
  const chip = formatDayChip(event.dateIso);
  const accentLeft = event.isHosting ? 'border-l-lime' : isPast ? 'border-l-orange/50' : 'border-l-bone/15';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-bone/[0.03] transition cursor-pointer border-l-2 ${accentLeft}`} onClick={onOpen}>
      {/* Date chip */}
      <div className="shrink-0 w-12 text-center border border-bone/15 rounded-sm py-1.5">
        <div className="font-basement text-[18px] leading-none text-bone">{chip.day}</div>
        <div className="font-mono text-[9px] uppercase tracking-[2px] text-bone/40 mt-0.5">{chip.mon}</div>
      </div>

      {/* Thumbnail */}
      {event.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={event.imageUrl} alt="" className="w-10 h-10 rounded-sm object-cover shrink-0" />
      ) : null}

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] uppercase font-bold text-bone truncate">{event.eventName}</span>
          {event.isHosting && (
            <span className="font-mono text-[9px] uppercase tracking-[2px] bg-lime/20 text-lime px-1 py-0.5 rounded-sm shrink-0">Hosting</span>
          )}
          {event.isGoing && !event.isHosting && (
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-green border border-green/40 px-1 py-0.5 rounded-sm shrink-0">✓ Going</span>
          )}
        </div>
        <div className="font-mono text-[10px] text-bone/40 truncate mt-0.5">
          {event.startTime ? `${event.startTime} ` : ''}
          {event.city ? `· ${event.city}` : ''}
          {event.rsvpCount > 0 ? ` · ${event.rsvpCount} going` : ''}
        </div>
      </div>

      {/* Host avatar(s) */}
      {event.hosts.length > 0 && (
        <div className="flex items-center -space-x-1.5 shrink-0">
          {event.hosts.slice(0, 3).map((h, i) => (
            <span
              key={h.userId}
              className="relative block w-5 h-5 rounded-full border overflow-hidden bg-bone/5"
              style={{ borderColor: '#1a1a1a', zIndex: 3 - i }}
              title={h.name || h.username || ''}
            >
              {h.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={h.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center font-basement text-[9px] text-bone/40">
                  {(h.name || h.username || '?')[0]?.toUpperCase()}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Actions (don't bubble click) */}
      {authenticated && (
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {!isPast && (
            <button
              onClick={onToggleRsvp}
              className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[2px] px-2.5 py-1.5 rounded-sm border transition cursor-pointer ${
                event.isGoing
                  ? 'bg-green/15 border-green/40 text-green'
                  : 'bg-transparent border-bone/15 text-bone/60 hover:border-lime/50 hover:text-lime'
              }`}
              title={event.isGoing ? 'Click to un-RSVP' : 'RSVP — going'}
            >
              {event.isGoing ? (<><CheckIcon size={9} /> Going</>) : 'RSVP'}
            </button>
          )}
          <button
            onClick={onToggleSave}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-sm border transition cursor-pointer ${
              event.isSaved
                ? 'bg-bone text-obsidian border-bone'
                : 'bg-transparent border-bone/15 text-bone/40 hover:border-bone/60 hover:text-bone'
            }`}
            title={event.isSaved ? 'Saved' : 'Save'}
          >
            <StarIcon size={11} filled={event.isSaved} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Skeleton + empty state ────────────────────────────────── */

function EventsListSkeleton() {
  return (
    <div className="divide-y divide-bone/[0.04]">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-12 h-11 rounded-sm bg-bone/[0.04] animate-pulse shrink-0" />
          <div className="w-10 h-10 rounded-sm bg-bone/[0.04] animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-48 bg-bone/[0.06] rounded animate-pulse" />
            <div className="h-2.5 w-32 bg-bone/[0.04] rounded animate-pulse" />
          </div>
          <div className="h-7 w-20 bg-bone/[0.04] rounded-sm animate-pulse shrink-0" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab, search, selectedCity, onClear, onCreate }: { tab: Tab; search: string; selectedCity: string; onClear: () => void; onCreate: () => void }) {
  const label =
    tab === 'saved'    ? "You haven't saved any events yet" :
    tab === 'mine'     ? "You're not hosting or RSVP'd to anything" :
    tab === 'thisWeek' ? "Nothing this week" :
    tab === 'past'     ? "No past events" :
    search || selectedCity ? "No events match" :
    "No events yet";
  return (
    <div className="text-center py-16 px-4">
      <p className="font-mono text-[13px] uppercase tracking-[2px] text-bone/40 mb-4">{label}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {(search || selectedCity || tab !== 'all') && (
          <button
            onClick={onClear}
            className="font-mono text-[11px] uppercase tracking-[2px] text-lime border border-lime/30 hover:bg-lime hover:text-obsidian px-3 py-1.5 rounded-sm bg-transparent cursor-pointer transition"
          >
            clear filters
          </button>
        )}
        <button
          onClick={onCreate}
          className="font-mono text-[11px] uppercase tracking-[2px] text-bone/60 border border-bone/20 hover:border-bone/60 px-3 py-1.5 rounded-sm bg-transparent cursor-pointer transition"
        >
          + create event
        </button>
      </div>
    </div>
  );
}
