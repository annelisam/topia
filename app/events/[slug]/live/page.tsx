'use client';

import { useCallback, useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePrivy } from '@privy-io/react-auth';
import QRCode from 'qrcode';
import QrScannerOverlay from '../../../components/QrScannerOverlay';
import { describeQuestRule } from '../../../../lib/events/questTypes';
import { getConnectPath } from '../../../../lib/connect/clientCode';

// The site-wide messages UI, mounted locally so the "DM someone you met"
// quest can open a thread without leaving Event Mode (this page has no
// Navigation, which normally hosts the modal).
const MessagesModal = dynamic(() => import('../../../components/MessagesModal'), { ssr: false });

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
interface QuestItem { id: string; title: string; description: string | null; icon: string | null; verifyMethod: string; rule: { kind: string; count?: number } | null; completed: boolean; progress: { current: number; target: number } | null; }
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

// Slim labeled divider — groups the card stack into scannable sections
// (Your pass / Tonight's game / The room) so the page reads as a map,
// not a pile.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-1.5 -mb-1" aria-hidden="true">
      <span style={meta}>{children}</span>
      <span className="flex-1 h-px" style={{ backgroundColor: LINE }} />
    </div>
  );
}

function isToday(dateIso: string | null): boolean {
  if (!dateIso) return false;
  const now = new Date();
  const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return dateIso.slice(0, 10) === local;
}

export default function EventLivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, authenticated, ready, login } = usePrivy();
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
  const [introDismissed, setIntroDismissed] = useState(true);
  const [dmConversation, setDmConversation] = useState<string | null>(null);
  const [dmBusyId, setDmBusyId] = useState<string | null>(null);

  // Scroll targets so quest action buttons can point at the section where
  // that quest actually happens.
  const qrCardRef = useRef<HTMLDivElement | null>(null);
  const peopleRef = useRef<HTMLDivElement | null>(null);
  const goingRef = useRef<HTMLDivElement | null>(null);
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // The viewer's personal connect QR — a host scans it at the door to check
  // them in; other guests scan it to connect. Cached-first (the code is
  // permanent) so the pass renders instantly after the first visit ever.
  useEffect(() => {
    if (!authenticated || !privyId) return;
    getConnectPath(privyId)
      .then(async (path) => {
        if (!path) return;
        const dataUrl = await QRCode.toDataURL(`${window.location.origin}${path}`, {
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
    setIntroDismissed(localStorage.getItem('topia:quest-intro') === 'done');
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
  // Poll alongside the door state: auto quests (connections, follows, DMs)
  // complete server-side, so the checklist ticks itself without a reload.
  useEffect(() => {
    loadQuests();
    const t = setInterval(loadQuests, 20000);
    return () => clearInterval(t);
  }, [loadQuests]);

  // Start (or reopen) a DM with someone met tonight — powers the "DM someone
  // you met" quest without leaving Event Mode.
  const messagePerson = useCallback(async (targetUserId: string) => {
    if (!privyId) return;
    setDmBusyId(targetUserId);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, targetUserId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.conversationId) setDmConversation(d.conversationId);
    } catch {
      // best-effort; the row's button just re-enables
    } finally { setDmBusyId(null); }
  }, [privyId]);

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
      loadQuests(); // connection-counting quests tick immediately
    } catch {
      setScanStatus({ kind: 'err', text: 'Scan failed — try again.' });
    }
  }, [privyId, event?.id, loadPeople, loadQuests]);

  const live = isToday(event?.dateIso ?? null);
  const nextQuest = questState?.quests.find((q) => !q.completed) ?? null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a1a', color: INK }}>
      {/* Top safe-area comes from the global body padding; only the bottom
          (home indicator) needs handling here. */}
      <div
        className="mx-auto max-w-md px-5 pt-5 flex flex-col gap-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}
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

            {/* Door state — the hero card. Always answers ONE question:
                "what do I do right now?" — log in, RSVP, get checked in,
                or go play. Each state carries its own CTA. */}
            {!authenticated ? (
              <div style={{ ...card, borderColor: LIME }}>
                <p style={{ ...meta, color: LIME }}>Step 1 · Log in</p>
                <p className="text-[13px] mt-1.5" style={{ color: INK }}>
                  Everything here — check-in, quests, meeting people — hangs off your Topia account. New? Signing up takes a minute.
                </p>
                <button
                  onClick={login}
                  className="font-mono text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-full cursor-pointer border-none mt-3"
                  style={{ backgroundColor: LIME, color: '#1a1a1a' }}
                >
                  Log in or sign up →
                </button>
              </div>
            ) : me?.checkedIn ? (
              <div style={{ ...card, borderColor: LIME, backgroundColor: 'rgba(228,254,82,0.08)' }}>
                <p style={{ ...meta, color: LIME }}>✓ You're checked in</p>
                <p className="text-[13px] mt-1.5" style={{ color: INK }}>
                  Since {me.checkedInAt ? new Date(me.checkedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'just now'}
                  {questState && questState.total > 0 ? ' — every quest is unlocked.' : " — you're all set."}
                </p>
                {nextQuest && (
                  <p className="font-mono text-[11px] font-bold mt-1.5" style={{ color: LIME }}>
                    Up next: {nextQuest.icon ? `${nextQuest.icon} ` : ''}{nextQuest.title} ↓
                  </p>
                )}
              </div>
            ) : me?.onList ? (
              <div style={{ ...card, borderColor: ORANGE }}>
                <p style={{ ...meta, color: ORANGE }}>Step 2 · Check in at the door</p>
                <p className="text-[13px] mt-1.5" style={{ color: INK }}>
                  You're on the list. Show your Topia code (below) to a host at the door — check-in unlocks the in-person quests.
                </p>
              </div>
            ) : (
              <div style={{ ...card, borderColor: ORANGE }}>
                <p style={{ ...meta, color: ORANGE }}>Step 1 · RSVP</p>
                <p className="text-[13px] mt-1.5" style={{ color: INK }}>
                  You're not on the guest list yet — RSVP first, then come back here.
                </p>
                <Link
                  href={`/events/${slug}`}
                  className="inline-block font-mono text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-full no-underline mt-3"
                  style={{ backgroundColor: LIME, color: '#1a1a1a' }}
                >
                  RSVP on the event page →
                </Link>
              </div>
            )}

            {/* Host tools — pinned high; a manager is usually working the
                door, not playing the game */}
            {event.isManager && (
              <div style={{ ...card, borderColor: LIME, paddingTop: 6, paddingBottom: 6 }}>
                <Link href={`/events/${slug}/manage#checkin`} className="no-underline flex items-center justify-between py-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-widest font-bold" style={{ color: LIME }}>Working the door? Check-in</span>
                  <span style={{ color: LIME }}>→</span>
                </Link>
                <div style={{ height: 1, backgroundColor: LINE }} />
                <Link href={`/events/${slug}/manage#quests`} className="no-underline flex items-center justify-between py-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-widest font-bold" style={{ color: LIME }}>Quests, prizes & raffle</span>
                  <span style={{ color: LIME }}>→</span>
                </Link>
              </div>
            )}

            {/* Personal QR — the door scans it to check you in; other guests
                scan it to connect with you */}
            {authenticated && qrDataUrl && (
              <>
                <SectionLabel>Your pass</SectionLabel>
                <div ref={qrCardRef} style={card}>
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
              </>
            )}

            {/* Quests — the checklist for tonight. Actionable: every open
                quest carries the button (or pointer) that gets it done. */}
            {((questState?.total ?? 0) > 0 || prizes.length > 0) && (
              <SectionLabel>Tonight's game</SectionLabel>
            )}
            {questToast && (
              <div style={{ ...card, borderColor: LIME, backgroundColor: 'rgba(228,254,82,0.08)' }}>
                <p className="text-[13px] font-bold" style={{ color: LIME }}>{questToast}</p>
              </div>
            )}
            {authenticated && questState && questState.total > 0 && (
              <div style={questState.inRaffle ? { ...card, borderColor: LIME } : card}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <p style={meta}>Quests · {questState.completedCount}/{questState.total}</p>
                    {introDismissed && !questState.inRaffle && (
                      <button
                        onClick={() => setIntroDismissed(false)}
                        aria-label="How quests work"
                        title="How quests work"
                        className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold cursor-pointer bg-transparent p-0"
                        style={{ border: `1px solid ${LINE}`, color: DIM }}
                      >
                        ?
                      </button>
                    )}
                  </span>
                  {me?.checkedIn && questState.quests.some((q) => q.verifyMethod === 'qr' && !q.completed) && (
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
                ) : (
                  <p className="font-mono text-[11px] mt-1.5" style={{ color: DIM }}>
                    Finish all {questState.total} to enter the raffle{me?.checkedIn ? '' : ' — check-in unlocks the in-person ones'}
                  </p>
                )}

                {/* One-time explainer for people on their first quest run */}
                {!introDismissed && !questState.inRaffle && (
                  <div className="rounded-xl px-3 py-2.5 mt-3" style={{ border: `1px dashed rgba(228,254,82,0.4)`, backgroundColor: 'rgba(228,254,82,0.04)' }}>
                    <p style={{ ...meta, color: LIME }}>First time? Here's the game</p>
                    <div className="mt-1.5 flex flex-col gap-1">
                      <p className="text-[12px]" style={{ color: INK }}>1 · Some quests complete on their own as you use Topia — you may have progress already.</p>
                      <p className="text-[12px]" style={{ color: INK }}>2 · The in-person ones happen right here: scan, meet, message.</p>
                      <p className="text-[12px]" style={{ color: INK }}>3 · Finish the whole list and you're in the raffle for tonight's prizes.</p>
                    </div>
                    <button
                      onClick={() => { setIntroDismissed(true); localStorage.setItem('topia:quest-intro', 'done'); }}
                      className="font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full cursor-pointer border-none mt-2"
                      style={{ backgroundColor: LIME, color: '#1a1a1a' }}
                    >
                      Got it
                    </button>
                  </div>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  {questState.quests.map((q, i) => {
                    // Only QR + host quests hard-require check-in (the server
                    // enforces it); auto quests tick on their own so a new
                    // user sees momentum before they even reach the door.
                    const locked = !q.completed && !me?.checkedIn && (q.verifyMethod === 'qr' || q.verifyMethod === 'host');
                    const pct = q.progress ? Math.min(100, (q.progress.current / q.progress.target) * 100) : 0;
                    const kind = q.rule?.kind;
                    const actionBtn = 'font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-full cursor-pointer';
                    return (
                      <div key={q.id} className="rounded-xl px-3 py-3"
                        style={{ border: `1px solid ${q.completed ? LIME : LINE}`, backgroundColor: q.completed ? 'rgba(228,254,82,0.05)' : 'transparent', opacity: locked ? 0.6 : 1 }}>
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5"
                            style={q.completed ? { backgroundColor: LIME, color: '#1a1a1a' } : { border: `1px solid ${LINE}`, color: DIM }}>
                            {q.completed ? '✓' : i + 1}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-bold" style={{ color: INK }}>{q.icon ? `${q.icon} ` : ''}{q.title}</span>
                            {q.description && <span className="block text-[11px] mt-0.5" style={{ color: DIM }}>{q.description}</span>}
                            {!q.completed && (
                              <span className="block font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: DIM }}>
                                {locked ? '🔒 Unlocks at check-in' : describeQuestRule(q.verifyMethod, q.rule)}
                              </span>
                            )}
                          </span>
                        </div>
                        {!q.completed && q.progress && (
                          <div className="flex items-center gap-2 mt-2" style={{ marginLeft: 34 }}>
                            <div className="h-1.5 rounded-full flex-1 overflow-hidden" style={{ backgroundColor: 'rgba(245,240,232,0.12)' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: LIME }} />
                            </div>
                            <span className="font-mono text-[10px] font-bold shrink-0" style={{ color: q.progress.current > 0 ? LIME : DIM }}>
                              {Math.min(q.progress.current, q.progress.target)}/{q.progress.target}
                            </span>
                          </div>
                        )}
                        {!q.completed && !locked && (
                          <div className="mt-2 flex" style={{ marginLeft: 34 }}>
                            {q.verifyMethod === 'qr' ? (
                              <button onClick={() => { setQuestScanStatus(null); setQuestScanOpen(true); }} className={`${actionBtn} border-none`} style={{ backgroundColor: LIME, color: '#1a1a1a' }}>
                                ◉ Scan the code
                              </button>
                            ) : kind === 'connections' ? (
                              <button onClick={() => { setScanStatus(null); setScanOpen(true); }} className={`${actionBtn} border-none`} style={{ backgroundColor: LIME, color: '#1a1a1a' }}>
                                ◎ Scan someone's code
                              </button>
                            ) : kind === 'follows' ? (
                              <button onClick={() => scrollTo(goingRef)} className={actionBtn} style={{ backgroundColor: 'transparent', color: INK, border: `1px solid ${LINE}` }}>
                                Find people here ↓
                              </button>
                            ) : kind === 'dm' && people.length > 0 ? (
                              <button onClick={() => scrollTo(peopleRef)} className={actionBtn} style={{ backgroundColor: 'transparent', color: INK, border: `1px solid ${LINE}` }}>
                                Message someone you met ↓
                              </button>
                            ) : kind === 'dm' ? (
                              <button onClick={() => { setScanStatus(null); setScanOpen(true); }} className={actionBtn} style={{ backgroundColor: 'transparent', color: INK, border: `1px solid ${LINE}` }}>
                                Meet someone first — scan their code
                              </button>
                            ) : kind === 'checkin' && !me?.checkedIn ? (
                              <button onClick={() => scrollTo(qrCardRef)} className={actionBtn} style={{ backgroundColor: 'transparent', color: INK, border: `1px solid ${LINE}` }}>
                                Show my code ↑
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

            <SectionLabel>The room</SectionLabel>

            {/* People you met at this event */}
            {authenticated && (people.length > 0 || me?.checkedIn) && (
              <div ref={peopleRef} style={card}>
                <p style={meta}>People you met {people.length > 0 ? `· ${people.length}` : ''}</p>
                {people.length === 0 ? (
                  <p className="text-[12px] mt-1.5" style={{ color: DIM }}>No one yet — trade a scan with someone you meet and they'll show up here.</p>
                ) : (
                  <div className="mt-2 flex flex-col gap-0.5">
                    {people.slice(0, 12).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
                        <Link href={p.username ? `/profile/${p.username}` : '#'} className="flex items-center gap-3 flex-1 min-w-0 no-underline">
                          {p.avatarUrl
                            ? <img src={p.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                            : <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold" style={{ backgroundColor: '#333', color: INK }}>{(p.name || p.username || '?')[0].toUpperCase()}</div>}
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-bold truncate" style={{ color: INK }}>{p.name || p.username}</span>
                            {p.username && <span className="block font-mono text-[10px]" style={{ color: DIM }}>@{p.username}</span>}
                          </span>
                        </Link>
                        <button
                          onClick={() => messagePerson(p.id)}
                          disabled={dmBusyId === p.id}
                          className="font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-full cursor-pointer shrink-0 disabled:opacity-50"
                          style={{ backgroundColor: 'transparent', color: LIME, border: '1px solid rgba(228,254,82,0.4)' }}
                        >
                          {dmBusyId === p.id ? '…' : '💬 DM'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Who's here — expands into a browsable list when a "connect on
                Topia" quest is live, so "find people" has somewhere to land */}
            <div ref={goingRef} style={card}>
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
              {authenticated && questState?.quests.some((q) => q.rule?.kind === 'follows') && guests.some((g) => g.username) && (
                <>
                  <div className="mt-3 flex flex-col gap-0.5">
                    {guests.filter((g) => g.username).slice(0, 12).map((g, i) => (
                      <Link key={i} href={`/profile/${g.username}`} className="flex items-center gap-3 py-2 no-underline" style={{ borderBottom: `1px solid ${LINE}` }}>
                        {g.avatarUrl
                          ? <img src={g.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          : <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold" style={{ backgroundColor: '#333', color: INK }}>{(g.name || g.username || '?')[0].toUpperCase()}</div>}
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-bold truncate" style={{ color: INK }}>{g.name || g.username}</span>
                          <span className="block font-mono text-[10px]" style={{ color: DIM }}>@{g.username}</span>
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: LIME }}>View →</span>
                      </Link>
                    ))}
                  </div>
                  <p className="font-mono text-[10px] mt-2" style={{ color: DIM }}>Tap someone to see their profile and connect — sent requests count toward your quest.</p>
                </>
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
      {dmConversation && (
        <MessagesModal
          initialConversationId={dmConversation}
          onClose={() => { setDmConversation(null); loadQuests(); }}
        />
      )}
    </div>
  );
}
