'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import QRCode from 'qrcode';
import QrScannerOverlay from '../../../components/QrScannerOverlay';

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
interface Connection { id: string; name: string | null; username: string | null; avatarUrl: string | null; connectedAt: string; }
interface QuestItem { id: string; title: string; description: string | null; icon: string | null; verifyMethod: string; rule: { kind: string; count?: number } | null; completed: boolean; }
interface QuestState { quests: QuestItem[]; total: number; completedCount: number; inRaffle: boolean; }
interface PrizeItem { id: string; title: string; description: string | null; drawnAt: string | null; winnerName: string | null; winnerUsername: string | null; }
interface BoardEntry { userId: string; name: string | null; username: string | null; avatarUrl: string | null; completedCount: number; inRaffle: boolean; }

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
  const [scanOpen, setScanOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [people, setPeople] = useState<Connection[]>([]);
  const [questState, setQuestState] = useState<QuestState | null>(null);
  const [prizes, setPrizes] = useState<PrizeItem[]>([]);
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [questScanOpen, setQuestScanOpen] = useState(false);
  const [questScanStatus, setQuestScanStatus] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [questToast, setQuestToast] = useState<string | null>(null);

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

  // People met at this event (via QR connects).
  const loadPeople = useCallback(() => {
    if (!privyId || !event?.id) return;
    fetch(`/api/connect?privyId=${encodeURIComponent(privyId)}&eventId=${event.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.connections) setPeople(d.connections); })
      .catch(() => {});
  }, [privyId, event?.id]);
  useEffect(() => { loadPeople(); }, [loadPeople]);

  // Quests: my state, prizes, and the progress board.
  const loadQuests = useCallback(() => {
    if (!event?.id) return;
    if (privyId) {
      fetch(`/api/events/quests?eventId=${event.id}&privyId=${encodeURIComponent(privyId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.quests) setQuestState(d); })
        .catch(() => {});
      fetch(`/api/events/quests/progress?eventId=${event.id}&privyId=${encodeURIComponent(privyId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.entries) setBoard(d.entries); })
        .catch(() => {});
    }
    fetch(`/api/events/prizes?eventId=${event.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.prizes) setPrizes(d.prizes); })
      .catch(() => {});
  }, [event?.id, privyId]);
  useEffect(() => { loadQuests(); }, [loadQuests]);

  const completeQuestCode = useCallback(async (value: string): Promise<{ kind: 'ok' | 'warn' | 'err'; text: string }> => {
    if (!privyId || !event?.id) return { kind: 'err', text: 'Log in first.' };
    try {
      const res = await fetch('/api/events/quests/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, eventId: event.id, code: value }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return { kind: 'err', text: d.error || 'Scan failed — try again.' };
      loadQuests();
      const title = d.quest?.title ?? 'Quest';
      if (d.already) return { kind: 'warn', text: `Already completed: ${title}` };
      if (d.progress?.inRaffle) return { kind: 'ok', text: `✦ ${title} complete — that's ALL of them. You're in the raffle! 🎉` };
      return { kind: 'ok', text: `✦ ${title} complete (${d.progress?.completedCount}/${d.progress?.total})` };
    } catch {
      return { kind: 'err', text: 'Scan failed — try again.' };
    }
  }, [privyId, event?.id, loadQuests]);

  const handleQuestScan = useCallback(async (value: string) => {
    setQuestScanStatus(await completeQuestCode(value));
  }, [completeQuestCode]);

  // A printed quest QR encodes /events/<slug>/live?quest=<code> — when the
  // page opens with that param (plain camera app scan), redeem it directly.
  useEffect(() => {
    if (!privyId || !event?.id || !me?.checkedIn) return;
    const param = new URLSearchParams(window.location.search).get('quest');
    if (!param) return;
    history.replaceState(null, '', window.location.pathname);
    completeQuestCode(`?quest=${param}`).then((s) => setQuestToast(s.text));
  }, [privyId, event?.id, me?.checkedIn, completeQuestCode]);

  // A scanned Topia code → instant mutual connection with event context.
  const handleConnectScan = useCallback(async (value: string) => {
    if (!privyId || !event?.id) return;
    try {
      const res = await fetch('/api/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, code: value, eventId: event.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setScanStatus({ kind: 'err', text: d.error || 'Scan failed — try again.' });
        return;
      }
      const who = d.target?.name || d.target?.username || 'them';
      setScanStatus(d.already
        ? { kind: 'warn', text: `Already connected with ${who}` }
        : { kind: 'ok', text: `✦ Connected with ${who}` });
      loadPeople();
    } catch {
      setScanStatus({ kind: 'err', text: 'Scan failed — try again.' });
    }
  }, [privyId, event?.id, loadPeople]);

  const live = isToday(event?.dateIso ?? null);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a1a', color: INK }}>
      {/* Safe-area padding: the installed PWA draws under the iOS status bar
          and home indicator (viewport-fit=cover), so pad past both. */}
      <div
        className="mx-auto max-w-md px-5 flex flex-col gap-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)',
        }}
      >

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
              {/* .heading-display's -4px tracking is tuned for hero sizes —
                  at this scale it mashes glyphs together, so override it. */}
              <h1
                className="heading-display uppercase mt-1"
                style={{
                  color: INK,
                  fontSize: 'clamp(24px, 8vw, 34px)',
                  lineHeight: 1.04,
                  letterSpacing: '-0.02em',
                  textWrap: 'balance',
                }}
              >
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

            {/* Personal QR — the door scans it to check you in; other guests
                scan it to connect with you */}
            {authenticated && qrDataUrl && (
              <div style={card}>
                <div className="flex items-center justify-between">
                  <p style={meta}>Your Topia code</p>
                  <button
                    onClick={() => { setScanStatus(null); setScanOpen(true); }}
                    className="font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full cursor-pointer border-none"
                    style={{ backgroundColor: LIME, color: '#1a1a1a' }}
                  >
                    ◎ Scan to connect
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-2.5">
                  <img src={qrDataUrl} alt="Your Topia QR code" className="rounded-lg" style={{ width: 132, height: 132, backgroundColor: '#fff' }} />
                  <p className="text-[12px] flex-1" style={{ color: DIM }}>
                    {me?.checkedIn
                      ? 'Trade scans with people you meet — an instant mutual connection, recorded from tonight.'
                      : 'Show this at the door to get checked in — then trade scans with people you meet to connect.'}
                  </p>
                </div>
              </div>
            )}

            {/* People you met at this event */}
            {authenticated && (people.length > 0 || me?.checkedIn) && (
              <div style={card}>
                <p style={meta}>People you met {people.length > 0 ? `· ${people.length}` : ''}</p>
                {people.length === 0 ? (
                  <p className="text-[12px] mt-1.5" style={{ color: DIM }}>No connections yet — scan someone's Topia code to start your list.</p>
                ) : (
                  <div className="mt-2 flex flex-col gap-0.5">
                    {people.slice(0, 12).map((p) => (
                      <Link key={p.id} href={p.username ? `/profile/${p.username}` : '#'} className="flex items-center gap-3 py-2 no-underline" style={{ borderBottom: `1px solid ${LINE}` }}>
                        {p.avatarUrl
                          ? <img src={p.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          : <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold" style={{ backgroundColor: '#333', color: INK }}>{(p.name || p.username || '?')[0].toUpperCase()}</div>}
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-bold truncate" style={{ color: INK }}>{p.name || p.username}</span>
                          {p.username && <span className="block font-mono text-[10px]" style={{ color: DIM }}>@{p.username}</span>}
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: DIM }}>
                          {new Date(p.connectedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Host shortcut to the door roster */}
            {event.isManager && (
              <Link href={`/events/${slug}/manage#checkin`} className="no-underline flex items-center justify-between" style={{ ...card, borderColor: LIME }}>
                <span className="font-mono text-[12px] uppercase tracking-widest font-bold" style={{ color: LIME }}>Working the door? Open check-in</span>
                <span style={{ color: LIME }}>→</span>
              </Link>
            )}

            {/* Quests */}
            {questToast && (
              <div style={{ ...card, borderColor: LIME, backgroundColor: 'rgba(228,254,82,0.08)' }}>
                <p className="text-[13px] font-bold" style={{ color: LIME }}>{questToast}</p>
              </div>
            )}
            {authenticated && questState && questState.total > 0 && (
              <div style={card}>
                <div className="flex items-center justify-between">
                  <p style={meta}>Quests · {questState.completedCount}/{questState.total}</p>
                  {me?.checkedIn && (
                    <button
                      onClick={() => { setQuestScanStatus(null); setQuestScanOpen(true); }}
                      className="font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full cursor-pointer border-none"
                      style={{ backgroundColor: LIME, color: '#1a1a1a' }}
                    >
                      ✦ Scan quest code
                    </button>
                  )}
                </div>
                <div className="h-1.5 rounded-full mt-2.5 mb-1 overflow-hidden" style={{ backgroundColor: 'rgba(245,240,232,0.12)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(questState.completedCount / questState.total) * 100}%`, backgroundColor: LIME }} />
                </div>
                {questState.inRaffle ? (
                  <p className="font-mono text-[11px] font-bold mt-1.5" style={{ color: LIME }}>🎉 All quests complete — you're in the raffle</p>
                ) : !me?.checkedIn ? (
                  <p className="font-mono text-[11px] mt-1.5" style={{ color: DIM }}>Check in at the door to unlock quests</p>
                ) : (
                  <p className="font-mono text-[11px] mt-1.5" style={{ color: DIM }}>Complete all {questState.total} to enter the raffle</p>
                )}
                <div className="mt-3 flex flex-col gap-2">
                  {questState.quests.map((q) => (
                    <div key={q.id} className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
                      style={{ border: `1px solid ${q.completed ? LIME : LINE}`, opacity: me?.checkedIn || q.completed ? 1 : 0.5 }}>
                      <span className="text-[15px] leading-tight">{me?.checkedIn || q.completed ? (q.icon || '✦') : '🔒'}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-bold" style={{ color: INK }}>{q.title}</span>
                        {q.description && <span className="block text-[11px] mt-0.5" style={{ color: DIM }}>{q.description}</span>}
                        {q.verifyMethod === 'auto' && !q.completed && (
                          <span className="block font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: DIM }}>
                            {q.rule?.kind === 'connections' ? `Auto — connect with ${q.rule.count ?? 1} people` : 'Auto — completes at check-in'}
                          </span>
                        )}
                        {q.verifyMethod === 'host' && !q.completed && (
                          <span className="block font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: DIM }}>A host verifies this one</span>
                        )}
                      </span>
                      <span className="font-mono text-[13px] font-bold" style={{ color: q.completed ? LIME : DIM }}>{q.completed ? '✓' : '○'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prizes */}
            {prizes.length > 0 && (
              <div style={{ ...card, borderColor: 'rgba(228,254,82,0.35)' }}>
                <p style={{ ...meta, color: LIME }}>Prizes · raffle</p>
                <div className="mt-2 flex flex-col gap-2">
                  {prizes.map((p) => (
                    <div key={p.id}>
                      <p className="text-[13px] font-bold" style={{ color: INK }}>✶ {p.title}</p>
                      {p.description && <p className="text-[11px]" style={{ color: DIM }}>{p.description}</p>}
                      {p.drawnAt && (
                        <p className="font-mono text-[11px] mt-0.5" style={{ color: LIME }}>
                          Winner: {p.winnerName || p.winnerUsername || 'drawn'}{p.winnerUsername ? ` (@${p.winnerUsername})` : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[10px] mt-2.5" style={{ color: DIM }}>Complete every quest to be in the draw.</p>
              </div>
            )}

            {/* Progress board */}
            {authenticated && board.length > 0 && questState && questState.total > 0 && (
              <div style={card}>
                <p style={meta}>Progress board</p>
                <div className="mt-2 flex flex-col">
                  {board.slice(0, 8).map((b) => (
                    <div key={b.userId} className="flex items-center gap-3 py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
                      {b.avatarUrl
                        ? <img src={b.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                        : <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold" style={{ backgroundColor: '#333', color: INK }}>{(b.name || b.username || '?')[0].toUpperCase()}</div>}
                      <span className="flex-1 text-[13px] truncate" style={{ color: INK }}>{b.name || b.username || 'Guest'}</span>
                      <span className="font-mono text-[11px]" style={{ color: b.inRaffle ? LIME : DIM }}>
                        {b.completedCount}/{questState.total}{b.inRaffle ? ' · in raffle' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {scanOpen && (
        <QrScannerOverlay
          hint="Scan a Topia code to connect"
          status={scanStatus}
          onCode={handleConnectScan}
          onClose={() => setScanOpen(false)}
        />
      )}
      {questScanOpen && (
        <QrScannerOverlay
          hint="Scan a quest code"
          status={questScanStatus}
          onCode={handleQuestScan}
          onClose={() => setQuestScanOpen(false)}
        />
      )}
    </div>
  );
}
