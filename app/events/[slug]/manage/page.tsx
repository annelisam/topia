'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import Navigation from '../../../components/Navigation';
import LoadingBar from '../../../components/LoadingBar';
import { QUESTION_TYPES, SELECT_TYPES, answerToText, DEFAULT_LABELS, ROLE_TAGS } from '../../../../lib/events/questions';
import { useUserProfile } from '../../../hooks/useUserProfile';

/* ── Types ─────────────────────────────────────────────────────────── */
interface EventLite {
  id: string;
  eventName: string;
  isHost: boolean;
  rsvpCapacity: number | null;
  rsvpApprovalRequired: boolean;
  rsvpClosed: boolean;
}
interface Host { userId: string; role: string; name: string | null; username: string | null; avatarUrl: string | null; worldId: string | null; worldTitle: string | null; }
interface SearchUser { id: string; name: string | null; username: string | null; avatarUrl: string | null; }
interface Question { id: string; label: string; type: string; options: string[] | null; required: boolean; sortOrder: number | null; isActive: boolean; }
interface Response { questionId: string; label: string; type: string; answer: string | string[] | boolean | null; }
interface Rsvp { userId: string; name: string | null; username: string | null; avatarUrl: string | null; email: string | null; phone: string | null; status: string; responses: Response[] | null; createdAt: string; }
interface Invite { id: string; email: string | null; phone: string | null; status: string; sent: boolean; url: string | null; }

const inputCls = 'w-full border px-3 py-2 font-mono text-[13px] rounded-lg outline-none';
const fieldStyle: React.CSSProperties = { backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' };
const labelCls = 'block font-mono text-[12px] uppercase tracking-[0.12em] mb-1.5 font-bold opacity-60';
const btnPrimary = 'px-4 py-2 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold disabled:opacity-40';
const btnGhost = 'px-4 py-2 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border bg-transparent disabled:opacity-40';

type Tab = 'guests' | 'registration' | 'hosts';

export default function ManageEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, authenticated, ready } = usePrivy();
  const privyId = user?.id;

  const [event, setEvent] = useState<EventLite | null>(null);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [notHost, setNotHost] = useState(false);
  const [tab, setTab] = useState<Tab>('guests');

  // Load event + authorize. Waits for Privy to finish hydrating (ready +
  // authenticated + a user id) so we never check isHost against an empty viewer
  // — that race used to bounce the host out. On a confirmed non-host we show an
  // inline message rather than redirecting.
  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !privyId) { setLoading(false); return; }
    let cancelled = false;
    fetch(`/api/events?slug=${slug}&viewerPrivyId=${privyId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const ev = d.events?.[0];
        if (!ev) { setLoading(false); return; }
        if (!ev.isHost) { setNotHost(true); setLoading(false); return; }
        setNotHost(false);
        setEvent({
          id: ev.id, eventName: ev.eventName, isHost: ev.isHost,
          rsvpCapacity: ev.rsvpCapacity ?? null,
          rsvpApprovalRequired: !!ev.rsvpApprovalRequired,
          rsvpClosed: !!ev.rsvpClosed,
        });
        setHosts(ev.hosts ?? []);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, privyId, ready, authenticated]);

  if (!ready || loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}><Navigation /><LoadingBar /></div>;
  }
  if (!authenticated || notHost || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation />
        <p className="font-mono text-[13px] mb-4" style={{ color: 'var(--foreground)' }}>
          {notHost ? 'Only the event host can manage this event.' : 'Please log in as a host.'}
        </p>
        <Link href={`/events/${slug}`} className="font-mono text-[13px] underline" style={{ color: 'var(--foreground)' }}>← Back to event</Link>
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'guests', label: 'Guests' },
    { id: 'registration', label: 'Registration' },
    { id: 'hosts', label: 'Hosts' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/events/${slug}`} className="font-mono text-[12px] uppercase tracking-widest hover:opacity-60 transition" style={{ color: 'var(--foreground)' }}>← Back to event</Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-1" style={{ color: 'var(--foreground)' }}>{event.eventName}</h1>
        <p className="font-mono text-[12px] uppercase tracking-widest opacity-40 mb-6" style={{ color: 'var(--foreground)' }}>Manage event</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2.5 font-mono text-[12px] uppercase tracking-widest transition-all -mb-px border-b-2"
              style={tab === t.id
                ? { color: 'var(--foreground)', borderColor: 'var(--foreground)' }
                : { color: 'var(--foreground)', borderColor: 'transparent', opacity: 0.45 }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'guests' && <GuestsTab eventId={event.id} eventName={event.eventName} privyId={privyId!} capacity={event.rsvpCapacity} />}
        {tab === 'registration' && <RegistrationTab event={event} slug={slug} privyId={privyId!} onSettings={(s) => setEvent({ ...event, ...s })} />}
        {tab === 'hosts' && <HostsTab eventId={event.id} privyId={privyId!} hosts={hosts} />}
      </div>
    </div>
  );
}

/* ── Invite-by-email/phone panel (inside Guests) ───────────────────── */
function InvitesPanel({ eventId, privyId }: { eventId: string; privyId: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [recipients, setRecipients] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/events/invites?eventId=${eventId}&privyId=${privyId}`)
      .then((r) => r.json()).then((d) => setInvites(d.invites || [])).catch(console.error);
  }, [eventId, privyId]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!recipients.trim()) return;
    setBusy(true); setNote('');
    try {
      const res = await fetch('/api/events/invites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, eventId, recipients }),
      });
      const d = await res.json();
      if (!res.ok) { setNote(d.error || 'Failed to invite'); return; }
      setRecipients('');
      const made = d.created.length, sent = d.sentCount, unsent = made - sent;
      setNote(
        made === 0 ? 'No new invites (already invited?).'
        : sent > 0 ? `Sent ${sent}.` + (unsent ? ` ${unsent} need a shared link below.` : '')
        : `${made} invite link${made > 1 ? 's' : ''} ready to share below.`
      );
      load();
    } finally { setBusy(false); }
  };

  const copy = async (inv: Invite) => {
    if (!inv.url) return;
    try { await navigator.clipboard.writeText(inv.url); setCopiedId(inv.id); setTimeout(() => setCopiedId(null), 1500); } catch {}
  };
  const copyAll = async () => {
    const links = invites.filter((i) => i.status === 'pending' && i.url).map((i) => `${i.email || i.phone}: ${i.url}`).join('\n');
    try { await navigator.clipboard.writeText(links); setCopiedId('all'); setTimeout(() => setCopiedId(null), 1500); } catch {}
  };
  const revoke = async (id: string) => {
    await fetch(`/api/events/invites?id=${id}&privyId=${privyId}`, { method: 'DELETE' });
    load();
  };

  const pending = invites.filter((i) => i.status === 'pending');
  const accepted = invites.filter((i) => i.status === 'accepted');

  return (
    <div className="rounded-lg border p-4 mb-6" style={{ borderColor: 'var(--border-color)' }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between bg-transparent border-none cursor-pointer p-0">
        <span className="font-mono text-[12px] uppercase tracking-[0.12em] font-bold opacity-60" style={{ color: 'var(--foreground)' }}>Invite guests</span>
        <span className="font-mono text-[12px] opacity-50" style={{ color: 'var(--foreground)' }}>
          {invites.length ? `${accepted.length}/${invites.length} accepted · ` : ''}{open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="mt-3">
          <textarea value={recipients} onChange={(e) => setRecipients(e.target.value)} rows={2}
            placeholder="Emails or phone numbers — comma or new line separated" className={inputCls} style={fieldStyle} />
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button onClick={send} disabled={busy || !recipients.trim()} className={btnPrimary} style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
              {busy ? 'Inviting…' : 'Invite'}
            </button>
            {note && <span className="font-mono text-[11px] opacity-70" style={{ color: 'var(--foreground)' }}>{note}</span>}
          </div>
          <p className="font-mono text-[11px] opacity-40 mt-2" style={{ color: 'var(--foreground)' }}>
            Invites auto-send once a Resend (email) or Twilio (SMS) key is configured. Until then, copy each link and share it.
          </p>

          {pending.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] uppercase tracking-widest opacity-50" style={{ color: 'var(--foreground)' }}>Invited · pending</span>
                <button onClick={copyAll} className="font-mono text-[11px] uppercase underline cursor-pointer bg-transparent border-none" style={{ color: 'var(--foreground)' }}>
                  {copiedId === 'all' ? 'Copied!' : 'Copy all links'}
                </button>
              </div>
              <div className="space-y-1.5">
                {pending.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 text-[12px] font-mono" style={{ color: 'var(--foreground)' }}>
                    <span className="flex-1 truncate">
                      {i.email || i.phone}
                      <span className="opacity-40">{i.sent ? ' · sent' : ' · link not sent'}</span>
                    </span>
                    <button onClick={() => copy(i)} className="uppercase underline cursor-pointer bg-transparent border-none text-[11px]" style={{ color: 'var(--foreground)' }}>
                      {copiedId === i.id ? 'Copied!' : 'Copy link'}
                    </button>
                    <button onClick={() => revoke(i.id)} className="uppercase underline cursor-pointer bg-transparent border-none text-[11px]" style={{ color: '#FF5C34' }}>Revoke</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {accepted.length > 0 && (
            <div className="mt-4">
              <span className="font-mono text-[11px] uppercase tracking-widest opacity-50 block mb-2" style={{ color: 'var(--foreground)' }}>Accepted</span>
              <div className="space-y-1">
                {accepted.map((i) => (
                  <div key={i.id} className="text-[12px] font-mono opacity-70" style={{ color: 'var(--foreground)' }}>✓ {i.email || i.phone}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Guests tab ────────────────────────────────────────────────────── */
function GuestsTab({ eventId, eventName, privyId, capacity }: { eventId: string; eventName: string; privyId: string; capacity: number | null }) {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [going, setGoing] = useState(0);
  const [pending, setPending] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decideMsg, setDecideMsg] = useState('');

  const load = useCallback(() => {
    fetch(`/api/events/rsvps?eventId=${eventId}&privyId=${privyId}`)
      .then((r) => r.json())
      .then((d) => { setRsvps(d.rsvps ?? []); setGoing(d.goingCount ?? 0); setPending(d.pendingCount ?? 0); })
      .catch(console.error);
  }, [eventId, privyId]);
  useEffect(() => { load(); }, [load]);

  const decide = async (guestUserId: string, decision: 'approve' | 'decline') => {
    setBusyId(guestUserId); setDecideMsg('');
    const who = rsvps.find((r) => r.userId === guestUserId);
    const label = who?.name || who?.username || 'Guest';
    try {
      const res = await fetch('/api/events/rsvp/decision', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, eventId, guestUserId, decision }),
      });
      if (res.ok) {
        setDecideMsg(decision === 'approve' ? `${label} approved.` : `${label} declined.`);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        setDecideMsg(d.error || 'Could not update request.');
      }
    } catch {
      setDecideMsg('Could not update request.');
    } finally { setBusyId(null); }
  };

  const exportCsv = () => {
    const qCols = Array.from(new Set(rsvps.flatMap((r) => (r.responses ?? []).map((x) => x.label))));
    const header = ['Name', 'Email', 'Phone', 'Status', 'Registered', ...qCols];
    const rows = rsvps.map((r) => {
      const map = new Map((r.responses ?? []).map((x) => [x.label, answerToText(x.answer)]));
      return [r.name ?? '', r.email ?? '', r.phone ?? '', r.status, new Date(r.createdAt).toISOString().slice(0, 10), ...qCols.map((c) => map.get(c) ?? '')];
    });
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${eventName}-guests.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const pendingList = rsvps.filter((r) => r.status === 'pending');
  const goingList = rsvps.filter((r) => r.status === 'going');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>
          <span className="font-bold">{going}</span> going{capacity != null && ` / ${capacity}`}
          {pending > 0 && <span className="opacity-60"> · {pending} pending</span>}
        </p>
        {rsvps.length > 0 && <button onClick={exportCsv} className={btnGhost} style={fieldStyle}>Export CSV</button>}
      </div>

      <InvitesPanel eventId={eventId} privyId={privyId} />

      {decideMsg && (
        <p className="font-mono text-[12px] mb-3 opacity-70" style={{ color: 'var(--foreground)' }}>{decideMsg}</p>
      )}

      {pendingList.length > 0 && (
        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-widest opacity-50 mb-2" style={{ color: 'var(--foreground)' }}>Requests</p>
          <div className="space-y-2">
            {pendingList.map((r) => (
              <GuestRow key={r.userId} r={r} expanded={expanded === r.userId} onToggle={() => setExpanded(expanded === r.userId ? null : r.userId)}
                actions={
                  <span className="flex gap-2">
                    <button disabled={busyId === r.userId} onClick={() => decide(r.userId, 'approve')} className="font-mono text-[11px] uppercase underline cursor-pointer bg-transparent border-none" style={{ color: '#00b36b' }}>Approve</button>
                    <button disabled={busyId === r.userId} onClick={() => decide(r.userId, 'decline')} className="font-mono text-[11px] uppercase underline cursor-pointer bg-transparent border-none" style={{ color: '#FF5C34' }}>Decline</button>
                  </span>
                } />
            ))}
          </div>
        </div>
      )}

      <p className="font-mono text-[11px] uppercase tracking-widest opacity-50 mb-2" style={{ color: 'var(--foreground)' }}>Going</p>
      {goingList.length === 0 ? (
        <p className="font-mono text-[12px] opacity-40" style={{ color: 'var(--foreground)' }}>No confirmed guests yet.</p>
      ) : (
        <div className="space-y-2">
          {goingList.map((r) => (
            <GuestRow key={r.userId} r={r} expanded={expanded === r.userId} onToggle={() => setExpanded(expanded === r.userId ? null : r.userId)} />
          ))}
        </div>
      )}
    </div>
  );
}

function GuestRow({ r, expanded, onToggle, actions }: { r: Rsvp; expanded: boolean; onToggle: () => void; actions?: React.ReactNode }) {
  const hasAnswers = (r.responses ?? []).length > 0;
  return (
    <div className="border rounded-lg px-3 py-2" style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex items-center gap-3">
        {r.avatarUrl
          ? <img src={r.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
          : <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-bold" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)' }}>{(r.name || r.username || '?')[0].toUpperCase()}</div>}
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[12px] font-bold truncate" style={{ color: 'var(--foreground)' }}>{r.name || r.username || 'Guest'}</p>
          {(r.email || r.phone) && (
            <p className="font-mono text-[11px] opacity-40 truncate" style={{ color: 'var(--foreground)' }}>
              {[r.email, r.phone].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        {actions}
        {hasAnswers && (
          <button onClick={onToggle} className="font-mono text-[11px] uppercase underline cursor-pointer bg-transparent border-none opacity-60" style={{ color: 'var(--foreground)' }}>
            {expanded ? 'Hide' : 'Answers'}
          </button>
        )}
      </div>
      {expanded && hasAnswers && (
        <div className="mt-2 pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--border-color)' }}>
          {(r.responses ?? []).map((x, i) => (
            <div key={i} className="font-mono text-[12px]" style={{ color: 'var(--foreground)' }}>
              <span className="opacity-50">{x.label}: </span>{answerToText(x.answer)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Registration tab (settings + question builder) ────────────────── */
function RegistrationTab({ event, slug, privyId, onSettings }: { event: EventLite; slug: string; privyId: string; onSettings: (s: Partial<EventLite>) => void }) {
  const [capacity, setCapacity] = useState(event.rsvpCapacity?.toString() ?? '');
  const [approval, setApproval] = useState(event.rsvpApprovalRequired);
  const [closed, setClosed] = useState(event.rsvpClosed);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('short_text');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadQuestions = useCallback(() => {
    fetch(`/api/events/questions?slug=${slug}&includeInactive=1`)
      .then((r) => r.json()).then((d) => setQuestions(d.questions ?? [])).catch(console.error);
  }, [slug]);
  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const saveSettings = async () => {
    setSavingSettings(true); setSettingsMsg('');
    try {
      // Normalize capacity: blank → unlimited; anything < 1 is meaningless so
      // treat it as unlimited too rather than silently locking everyone out.
      const parsed = capacity.trim() === '' ? null : Number(capacity);
      const normalizedCap = parsed != null && Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : null;
      const body = { privyId, eventId: event.id, rsvpCapacity: normalizedCap, rsvpApprovalRequired: approval, rsvpClosed: closed };
      const res = await fetch('/api/events/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        if (normalizedCap == null) setCapacity('');
        onSettings({ rsvpCapacity: normalizedCap, rsvpApprovalRequired: approval, rsvpClosed: closed });
        setSettingsMsg(d.warning ? `Saved ✓ — ${d.warning}` : 'Saved ✓');
      } else {
        const d = await res.json().catch(() => ({}));
        setSettingsMsg(d.error || 'Could not save settings.');
      }
    } catch {
      setSettingsMsg('Could not save settings.');
    } finally { setSavingSettings(false); }
  };

  const addQuestion = async () => {
    if (!newLabel.trim()) return;
    setBusy(true);
    try {
      const options = SELECT_TYPES.has(newType) ? newOptions.split('\n').map((s) => s.trim()).filter(Boolean) : undefined;
      const res = await fetch('/api/events/questions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, eventId: event.id, label: newLabel.trim(), type: newType, options, required: newRequired, sortOrder: questions.length }),
      });
      if (res.ok) { setNewLabel(''); setNewOptions(''); setNewRequired(false); setNewType('short_text'); loadQuestions(); }
    } finally { setBusy(false); }
  };

  const removeQuestion = async (id: string) => {
    await fetch(`/api/events/questions?id=${id}&privyId=${privyId}`, { method: 'DELETE' });
    loadQuestions();
  };

  const move = async (q: Question, dir: -1 | 1) => {
    const idx = questions.findIndex((x) => x.id === q.id);
    const swap = questions[idx + dir];
    if (!swap) return;
    await Promise.all([
      fetch('/api/events/questions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ privyId, id: q.id, sortOrder: swap.sortOrder ?? idx + dir }) }),
      fetch('/api/events/questions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ privyId, id: swap.id, sortOrder: q.sortOrder ?? idx }) }),
    ]);
    loadQuestions();
  };

  return (
    <div>
      {/* Settings */}
      <div className="rounded-lg border p-4 mb-8" style={{ borderColor: 'var(--border-color)' }}>
        <p className="font-mono text-[12px] uppercase tracking-[0.12em] font-bold opacity-60 mb-3" style={{ color: 'var(--foreground)' }}>Settings</p>
        <div className="mb-3">
          <label className={labelCls} style={{ color: 'var(--foreground)' }}>Capacity (blank = unlimited)</label>
          <input value={capacity} onChange={(e) => setCapacity(e.target.value)} inputMode="numeric" placeholder="∞" className={inputCls} style={fieldStyle} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer mb-2 font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>
          <input type="checkbox" checked={approval} onChange={(e) => setApproval(e.target.checked)} style={{ accentColor: 'var(--foreground)' }} /> Require host approval
        </label>
        <label className="flex items-center gap-2 cursor-pointer mb-4 font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>
          <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} style={{ accentColor: 'var(--foreground)' }} /> Close registration
        </label>
        <div className="flex items-center gap-3">
          <button onClick={saveSettings} disabled={savingSettings} className={btnPrimary} style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
            {savingSettings ? 'Saving…' : 'Save settings'}
          </button>
          {settingsMsg && <span className="font-mono text-[12px] opacity-70" style={{ color: 'var(--foreground)' }}>{settingsMsg}</span>}
        </div>
      </div>

      {/* Questions */}
      <p className="font-mono text-[12px] uppercase tracking-[0.12em] font-bold opacity-60 mb-3" style={{ color: 'var(--foreground)' }}>Registration questions</p>
      <div className="space-y-2 mb-4">
        {questions.length === 0 && <p className="font-mono text-[12px] opacity-40" style={{ color: 'var(--foreground)' }}>No questions yet — guests just confirm their spot.</p>}
        {questions.map((q, i) => (
          <div key={q.id} className="flex items-center gap-2 border rounded-lg px-3 py-2" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[13px] truncate" style={{ color: 'var(--foreground)' }}>
                {q.label}{q.required && <span style={{ color: '#FF5C34' }}> *</span>}
              </p>
              <p className="font-mono text-[11px] opacity-40" style={{ color: 'var(--foreground)' }}>
                {QUESTION_TYPES.find((t) => t.value === q.type)?.label}{q.options?.length ? ` · ${q.options.join(', ')}` : ''}
              </p>
            </div>
            <span className="flex gap-1.5 shrink-0">
              <button onClick={() => move(q, -1)} disabled={i === 0} className="font-mono text-[12px] cursor-pointer bg-transparent border-none disabled:opacity-20" style={{ color: 'var(--foreground)' }}>↑</button>
              <button onClick={() => move(q, 1)} disabled={i === questions.length - 1} className="font-mono text-[12px] cursor-pointer bg-transparent border-none disabled:opacity-20" style={{ color: 'var(--foreground)' }}>↓</button>
              <button onClick={() => removeQuestion(q.id)} className="font-mono text-[11px] uppercase underline cursor-pointer bg-transparent border-none" style={{ color: '#FF5C34' }}>Del</button>
            </span>
          </div>
        ))}
      </div>

      {/* Add question */}
      <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: 'var(--border-color)' }}>
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Question (e.g. What's your dietary preference?)" className={inputCls} style={fieldStyle} />
        <div className="flex gap-2">
          <select value={newType} onChange={(e) => {
            const t = e.target.value; setNewType(t);
            const known = Object.values(DEFAULT_LABELS);
            if (DEFAULT_LABELS[t] && (!newLabel.trim() || known.includes(newLabel.trim()))) setNewLabel(DEFAULT_LABELS[t]);
            if (t === 'roles') { if (!newOptions.trim()) setNewOptions(ROLE_TAGS.join('\n')); setNewRequired(true); }
          }} className={inputCls + ' appearance-none cursor-pointer'} style={fieldStyle}>
            {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <label className="flex items-center gap-2 cursor-pointer font-mono text-[12px] uppercase tracking-widest shrink-0 px-2" style={{ color: 'var(--foreground)' }}>
            <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} style={{ accentColor: 'var(--foreground)' }} /> Required
          </label>
        </div>
        {SELECT_TYPES.has(newType) && (
          <textarea value={newOptions} onChange={(e) => setNewOptions(e.target.value)} rows={3} placeholder={newType === 'roles' ? 'Role tags — one per line (guests can add their own)' : 'One option per line'} className={inputCls} style={fieldStyle} />
        )}
        <button onClick={addQuestion} disabled={busy || !newLabel.trim()} className={btnPrimary} style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
          {busy ? 'Adding…' : '+ Add question'}
        </button>
      </div>
    </div>
  );
}

/* ── Hosts tab (co-host management) ────────────────────────────────── */
function HostsTab({ eventId, privyId, hosts }: { eventId: string; privyId: string; hosts: Host[] }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState('');

  // Presenting world ("Presented by") — set on the creator's host row.
  const { worldMemberships } = useUserProfile();
  const myWorlds = worldMemberships.map((wm) => ({ id: wm.worldId, title: wm.worldTitle }));
  const creatorHost = hosts.find((h) => h.role === 'creator');
  const [worldId, setWorldId] = useState(creatorHost?.worldId ?? '');
  const [worldMsg, setWorldMsg] = useState('');

  const saveWorld = async (next: string) => {
    setWorldId(next); setWorldMsg('');
    try {
      const res = await fetch('/api/events/hosts', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, eventId, worldId: next || null }),
      });
      const d = await res.json().catch(() => ({}));
      setWorldMsg(res.ok ? 'Saved ✓' : (d.error || 'Could not save'));
    } catch { setWorldMsg('Could not save'); }
  };

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/events/hosts?search=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((d) => {
          const ids = new Set(hosts.map((h) => h.userId));
          setResults((d.users ?? []).filter((u: SearchUser) => !ids.has(u.id)));
        }).catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [search, hosts]);

  const invite = async (targetUserId: string) => {
    setInviting(true);
    setMsg('');
    try {
      const res = await fetch('/api/events/hosts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, eventId, targetUserId }),
      });
      const d = await res.json();
      if (res.ok) {
        setSearch(''); setResults([]);
        // The main host auto-approves co-hosts; co-hosts send a pending invite.
        setMsg(d.autoApproved ? 'Added as co-host — reload to see them in the list.' : 'Invitation sent.');
      }
      else setMsg(d.error || 'Failed to invite');
    } finally { setInviting(false); }
  };

  return (
    <div>
      {/* Presented by — which world hosts this event (creator only) */}
      {myWorlds.length > 0 && (
        <div className="mb-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.12em] font-bold opacity-60 mb-2" style={{ color: 'var(--foreground)' }}>Presented by</p>
          <select value={worldId} onChange={(e) => saveWorld(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`} style={fieldStyle}>
            <option value="">Just me (personal)</option>
            {myWorlds.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
          </select>
          <p className="font-mono text-[11px] opacity-40 mt-1.5" style={{ color: 'var(--foreground)' }}>
            Shown as “Presented by” on the event page. {worldMsg && <span className="opacity-100">· {worldMsg}</span>}
          </p>
        </div>
      )}

      <p className="font-mono text-[12px] uppercase tracking-[0.12em] font-bold opacity-60 mb-3" style={{ color: 'var(--foreground)' }}>Hosts</p>
      <div className="space-y-2 mb-4">
        {hosts.map((h) => (
          <div key={h.userId} className="flex items-center gap-3 px-3 py-2 border rounded-lg" style={{ borderColor: 'var(--border-color)' }}>
            {h.avatarUrl
              ? <img src={h.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
              : <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-bold" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)' }}>{(h.name || h.username || '?')[0].toUpperCase()}</div>}
            <div className="flex-1">
              <p className="font-mono text-[12px] font-bold" style={{ color: 'var(--foreground)' }}>
                {h.name || h.username || 'Unknown'}{h.worldTitle && <span className="font-normal opacity-50"> · {h.worldTitle}</span>}
              </p>
              <p className="font-mono text-[11px] opacity-40" style={{ color: 'var(--foreground)' }}>{h.role === 'creator' ? 'Creator' : 'Co-host'}</p>
            </div>
          </div>
        ))}
      </div>

      {hosts.length < 6 ? (
        <div className="relative">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or username to invite…" className={inputCls} style={fieldStyle} />
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
              {results.map((u) => (
                <button key={u.id} onClick={() => invite(u.id)} disabled={inviting}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:opacity-70 transition border-b last:border-b-0 text-left disabled:opacity-40" style={{ borderColor: 'var(--border-color)' }}>
                  {u.avatarUrl
                    ? <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                    : <div className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[12px]" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)' }}>{(u.name || u.username || '?')[0].toUpperCase()}</div>}
                  <span className="font-mono text-[12px]" style={{ color: 'var(--foreground)' }}>{u.name || u.username}{u.username && <span className="opacity-40"> @{u.username}</span>}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="font-mono text-[11px] opacity-40" style={{ color: 'var(--foreground)' }}>Maximum co-hosts reached (5).</p>
      )}
      {msg && <p className="font-mono text-[12px] mt-2 opacity-70" style={{ color: 'var(--foreground)' }}>{msg}</p>}
    </div>
  );
}
