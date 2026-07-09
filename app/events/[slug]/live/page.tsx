'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import QRCode from 'qrcode';

/* Event Mode — the in-the-room hub for a live event. Deliberately committed
 * to a single dark look (obsidian ground, lime accents) regardless of the
 * site theme: this screen is used at night, in a crowd, at max brightness.
 * P2 ships the shell: check-in state (which will gate quests in P4), who's
 * going, host door shortcut, and the add-to-home-screen hint. Quests,
 * connections, and prizes plug into the placeholder sections in P3/P4. */

interface LiveEvent {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  dateIso: string | null;
  startTime: string | null;
  endTime: string | null;
  city: string | null;
  address: string | null;
  isHost: boolean;
  isManager: boolean;
  userRsvped: boolean;
  userStatus: string | null;
}
interface Guest { name: string | null; username: string | null; avatarUrl: string | null; }
interface MyDoorState { onList: boolean; rsvpStatus: string | null; checkedIn: boolean; checkedInAt: string | null; }

const INK = '#f5f0e8';
const LIME = '#e4fe52';
const ORANGE = '#FF5C34';
const LINE = 'rgba(245,240,232,0.16)';
const DIM = 'rgba(245,240,232,0.55)';

const card: React.CSSProperties = { border: `1px solid ${LINE}`, borderRadius: 14, padding: '14px 16px' };
const meta: React.CSSProperties = { color: DIM, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' };

function isToday(dateIso: string | null): boolean {
  if (!dateIso) return false;
  const now = new Date();
  const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return dateIso.slice(0, 10) === local;
}

export default function EventLivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, authenticated, ready } = usePrivy();
  const privyId = user?.id;

  const [event, setEvent] = useState<LiveEvent | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestCount, setGuestCount] = useState(0);
  const [me, setMe] = useState<MyDoorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // The viewer's personal connect QR — a host scans it at the door to check
  // them in (and in P3 other guests scan it to connect).
  useEffect(() => {
    if (!authenticated || !privyId) return;
    fetch(`/api/connect/code?privyId=${encodeURIComponent(privyId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (d) => {
        if (!d?.path) return;
        const url = `${window.location.origin}${d.path}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 480,
          margin: 1,
          color: { dark: '#1a1a1a', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      })
      .catch(() => {});
  }, [authenticated, privyId]);

  useEffect(() => {
    setInstallDismissed(localStorage.getItem('topia:install-hint') === 'dismissed');
    setStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const qs = privyId ? `&viewerPrivyId=${encodeURIComponent(privyId)}` : '';
    fetch(`/api/events?slug=${slug}${qs}`)
      .then((r) => r.json())
      .then((d) => {
        const ev = d.events?.[0];
        if (ev) {
          setEvent(ev);
          fetch(`/api/events/guests?eventId=${ev.id}`)
            .then((r) => r.json())
            .then((g) => { setGuests(g.guests ?? []); setGuestCount(g.count ?? 0); })
            .catch(() => {});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, privyId, ready]);

  // The viewer's door state — refreshed periodically so the moment a host
  // checks them in, the screen flips without a manual reload.
  const loadMe = useCallback(() => {
    if (!privyId || !event?.id) return;
    fetch(`/api/events/checkin/me?eventId=${event.id}&privyId=${encodeURIComponent(privyId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setMe(d); })
      .catch(() => {});
  }, [privyId, event?.id]);

  useEffect(() => {
    loadMe();
    const t = setInterval(loadMe, 15000);
    return () => clearInterval(t);
  }, [loadMe]);

  const live = isToday(event?.dateIso ?? null);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a1a', color: INK }}>
      <div className="mx-auto max-w-md px-5 pt-6 pb-16 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <Link href={`/events/${slug}`} className="font-mono text-[11px] uppercase tracking-widest no-underline" style={{ color: DIM }}>
            ← Event page
          </Link>
          {live && (
            <span className="font-mono text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full" style={{ backgroundColor: ORANGE, color: '#fff' }}>
              ● LIVE
            </span>
          )}
        </div>

        {loading || !ready ? (
          <p className="font-mono text-[12px]" style={{ color: DIM }}>Loading event…</p>
        ) : !event ? (
          <p className="font-mono text-[12px]" style={{ color: DIM }}>Event not found.</p>
        ) : (
          <>
            <div>
              <p style={meta}>Event mode</p>
              <h1 className="heading-display text-[34px] leading-[0.95] uppercase mt-1" style={{ color: INK }}>
                {event.eventName}
              </h1>
              <p className="font-mono text-[11px] uppercase tracking-widest mt-2" style={{ color: DIM }}>
                {[event.date, event.startTime, event.city].filter(Boolean).join(' · ')}
              </p>
            </div>

            {/* Door state — the gate everything else will hang off */}
            {!authenticated ? (
              <div style={{ ...card, borderColor: LINE }}>
                <p style={meta}>Check-in</p>
                <p className="text-[13px] mt-1.5" style={{ color: INK }}>Log in to see your check-in status and join the quests.</p>
              </div>
            ) : me?.checkedIn ? (
              <div style={{ ...card, borderColor: LIME, backgroundColor: 'rgba(228,254,82,0.08)' }}>
                <p style={{ ...meta, color: LIME }}>✓ You're checked in</p>
                <p className="text-[13px] mt-1.5" style={{ color: INK }}>
                  Since {me.checkedInAt ? new Date(me.checkedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'just now'} — you're all set for quests when they land here.
                </p>
              </div>
            ) : me?.onList ? (
              <div style={{ ...card, borderColor: ORANGE }}>
                <p style={{ ...meta, color: ORANGE }}>Not checked in yet</p>
                <p className="text-[13px] mt-1.5" style={{ color: INK }}>
                  Find a host at the door — they'll check you in, and that's what unlocks quests.
                </p>
              </div>
            ) : (
              <div style={card}>
                <p style={meta}>You're not on the list</p>
                <p className="text-[13px] mt-1.5" style={{ color: INK }}>
                  RSVP on the <Link href={`/events/${slug}`} className="underline" style={{ color: LIME }}>event page</Link> to join.
                </p>
              </div>
            )}

            {/* Personal QR — scanned by a host at the door for check-in */}
            {authenticated && qrDataUrl && !me?.checkedIn && (
              <div style={card}>
                <p style={meta}>Your Topia code</p>
                <div className="flex items-center gap-4 mt-2.5">
                  <img src={qrDataUrl} alt="Your Topia QR code" className="rounded-lg" style={{ width: 132, height: 132, backgroundColor: '#fff' }} />
                  <p className="text-[12px] flex-1" style={{ color: DIM }}>
                    Show this at the door — a host scans it to check you in instantly.
                  </p>
                </div>
              </div>
            )}

            {/* Host shortcut to the door roster */}
            {event.isManager && (
              <Link href={`/events/${slug}/manage#checkin`} className="no-underline flex items-center justify-between" style={{ ...card, borderColor: LIME }}>
                <span className="font-mono text-[12px] uppercase tracking-widest font-bold" style={{ color: LIME }}>Working the door? Open check-in</span>
                <span style={{ color: LIME }}>→</span>
              </Link>
            )}

            {/* Quests — placeholder until P4 plugs in */}
            <div style={{ ...card, opacity: 0.75 }}>
              <div className="flex items-center justify-between">
                <p style={meta}>Quests</p>
                <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded" style={{ backgroundColor: LINE, color: DIM }}>Coming soon</span>
              </div>
              <p className="text-[13px] mt-1.5" style={{ color: DIM }}>
                Complete every quest at this event to enter its raffle. Scanning, connections, and prizes land here next.
              </p>
            </div>

            {/* Who's here */}
            <div style={card}>
              <p style={meta}>{guestCount} going</p>
              {guests.length > 0 && (
                <div className="flex items-center mt-2.5">
                  {guests.slice(0, 8).map((g, i) => (
                    g.avatarUrl
                      ? <img key={i} src={g.avatarUrl} alt={g.username ?? ''} className="w-8 h-8 rounded-full object-cover border" style={{ marginLeft: i ? -8 : 0, borderColor: '#1a1a1a' }} />
                      : <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold border" style={{ marginLeft: i ? -8 : 0, backgroundColor: '#333', color: INK, borderColor: '#1a1a1a' }}>{(g.name || g.username || '?')[0].toUpperCase()}</div>
                  ))}
                  {guestCount > 8 && <span className="font-mono text-[11px] ml-2" style={{ color: DIM }}>+{guestCount - 8}</span>}
                </div>
              )}
            </div>

            {/* Add-to-home-screen hint — hidden once installed or dismissed */}
            {!standalone && !installDismissed && (
              <div style={{ ...card, borderColor: 'rgba(228,254,82,0.35)', backgroundColor: 'rgba(228,254,82,0.06)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p style={{ ...meta, color: LIME }}>＋ Add Topia to your Home Screen</p>
                    <p className="text-[12px] mt-1.5" style={{ color: DIM }}>
                      Open your browser's share menu and tap "Add to Home Screen" — Event Mode launches full-screen like an app.
                    </p>
                  </div>
                  <button
                    onClick={() => { setInstallDismissed(true); localStorage.setItem('topia:install-hint', 'dismissed'); }}
                    className="bg-transparent border-none cursor-pointer text-[14px] leading-none p-0"
                    style={{ color: DIM }}
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
