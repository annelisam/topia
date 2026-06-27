'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import GiphyPicker, { type PickedGif } from '../components/GiphyPicker';

interface Message {
  id: string;
  senderId: string;
  body: string | null;
  imageUrl: string | null;
  giphyId: string | null;
  createdAt: string;
}
export interface OtherUser { id: string; name: string | null; username: string | null; avatarUrl: string | null; }

interface Props {
  conversationId: string;
  privyId: string;
  initialOther?: OtherUser | null; // from the inbox row → instant header, no fetch wait
  onBack?: () => void;       // mobile: return to the list
  onActivity?: () => void;   // bump the inbox (counts, ordering)
}

const POLL_MS = 4000;

export default function Thread({ conversationId, privyId, initialOther = null, onBack, onActivity }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<OtherUser | null>(initialOther);
  const [status, setStatus] = useState<'accepted' | 'pending'>('accepted');
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const lastAtRef = useRef<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }));
  }, []);

  const markRead = useCallback(() => {
    fetch(`/api/messages/${conversationId}/read`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privyId }),
    }).then(() => onActivity?.()).catch(() => {});
  }, [conversationId, privyId, onActivity]);

  // Initial load.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/messages/${conversationId}?privyId=${encodeURIComponent(privyId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const msgs: Message[] = data.messages ?? [];
        seenIds.current = new Set(msgs.map((m) => m.id));
        setMessages(msgs);
        setOther(data.other ?? initialOther);
        setStatus(data.status ?? 'accepted');
        setMeId(data.meId ?? null);
        lastAtRef.current = msgs.length ? msgs[msgs.length - 1].createdAt : null;
        setLoading(false);
        scrollToBottom(false);
        if (msgs.some((m) => m.senderId !== data.meId)) markRead();
      })
      .catch(() => setLoading(false));
    return () => { alive = false; };
  }, [conversationId, privyId, scrollToBottom, markRead]);

  // Poll for new messages (only the ones after our cursor).
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const poll = () => {
      const after = lastAtRef.current;
      const q = after ? `&after=${encodeURIComponent(after)}` : '';
      fetch(`/api/messages/${conversationId}?privyId=${encodeURIComponent(privyId)}${q}`)
        .then((r) => r.json())
        .then((data) => {
          const fresh: Message[] = data.messages ?? [];
          if (data.status) setStatus(data.status);
          // Dedupe by id — `gt` can re-return the cursor message (ms vs µs).
          const add = fresh.filter((m) => !seenIds.current.has(m.id));
          if (add.length) {
            add.forEach((m) => seenIds.current.add(m.id));
            setMessages((prev) => [...prev, ...add]);
            lastAtRef.current = add[add.length - 1].createdAt;
            scrollToBottom();
            if (!document.hidden && add.some((m) => m.senderId !== meId)) markRead();
          }
        })
        .catch(() => {});
    };
    const start = () => { interval = setInterval(poll, POLL_MS); };
    start();
    const onVis = () => { clearInterval(interval); if (!document.hidden) { poll(); start(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
  }, [conversationId, privyId, meId, scrollToBottom, markRead]);

  const pushMessage = useCallback((msg: Message) => {
    if (seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
    lastAtRef.current = msg.createdAt;
    scrollToBottom();
    onActivity?.();
  }, [scrollToBottom, onActivity]);

  const send = useCallback(async (payload: { body?: string; imageUrl?: string; giphyId?: string }) => {
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, ...payload }),
      });
      const data = await res.json();
      if (res.ok && data.message) { pushMessage(data.message); setStatus('accepted'); }
    } finally { setSending(false); }
  }, [conversationId, privyId, pushMessage]);

  const sendText = () => {
    const t = text.trim();
    if (!t || sending) return;
    setText('');
    send({ body: t });
  };

  const onPickGif = (gif: PickedGif) => send({ imageUrl: gif.url, giphyId: gif.id });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/messages/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) await send({ imageUrl: data.url });
    } finally { setUploading(false); }
  };

  const respondRequest = async (action: 'accept' | 'decline') => {
    const res = await fetch(`/api/messages/${conversationId}/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privyId, action }),
    });
    if (res.ok) {
      onActivity?.();
      if (action === 'accept') setStatus('accepted');
      else onBack?.();
    }
  };

  const name = other?.name || other?.username || 'Unknown';
  const isRequest = status === 'pending';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-ink/[0.08] shrink-0">
        {onBack && (
          <button onClick={onBack} className="md:hidden text-ink/60 hover:text-ink bg-transparent border-none cursor-pointer shrink-0" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        <Avatar user={other} size={36} />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[13px] text-ink truncate leading-tight">{name}</div>
          {other?.username && <div className="font-mono text-[11px] text-ink/40 truncate leading-tight mt-0.5">@{other.username}</div>}
        </div>
        {other?.username && (
          <Link href={`/profile/${other.username}`} className="shrink-0 font-mono text-[10px] uppercase tracking-[1px] text-lime border border-lime/40 hover:bg-lime hover:text-obsidian rounded-sm px-2.5 py-1 no-underline transition">
            View profile
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {loading ? (
          // Header already shows from the inbox row — keep the body blank (no
          // flashing "loading…") so switching feels instant.
          <div className="my-auto" />
        ) : messages.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[2px] text-ink/30 text-center my-auto">say hi 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === meId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl ${m.imageUrl ? 'p-1' : 'px-3 py-2'} ${mine ? 'bg-lime text-obsidian' : 'bg-ink/[0.06] text-ink'}`}>
                  {m.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.imageUrl} alt="" className="rounded-xl max-w-full max-h-64 object-cover" />
                  ) : (
                    <p className="font-mono text-[13px] leading-snug whitespace-pre-wrap break-words">{m.body}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Request bar OR composer */}
      {isRequest && meId && other && messages.some((m) => m.senderId !== meId) ? (
        <div className="border-t border-ink/[0.08] px-4 py-3 shrink-0">
          <p className="font-mono text-[11px] text-ink/50 text-center mb-2">
            <span className="text-ink/80 font-bold">{name}</span> wants to send you a message.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => respondRequest('decline')} className="font-mono text-[11px] uppercase tracking-[1px] text-ink/60 border border-ink/20 hover:border-ink/50 px-4 py-1.5 rounded-sm bg-transparent cursor-pointer transition">Delete</button>
            <button onClick={() => respondRequest('accept')} className="font-mono text-[11px] uppercase tracking-[1px] text-obsidian bg-lime hover:opacity-90 px-4 py-1.5 rounded-sm border-none cursor-pointer transition font-bold">Accept</button>
          </div>
        </div>
      ) : (
        <div className="border-t border-ink/[0.08] px-3 py-2.5 shrink-0 flex items-end gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading || sending} aria-label="Add photo" className="shrink-0 h-9 w-9 flex items-center justify-center text-ink/50 hover:text-ink bg-transparent border-none cursor-pointer disabled:opacity-40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
          </button>
          <button onClick={() => setGifOpen(true)} disabled={sending} aria-label="Add GIF" className="shrink-0 h-9 px-2.5 flex items-center justify-center text-ink/50 hover:text-ink bg-transparent cursor-pointer font-mono text-[11px] font-bold border border-ink/20 rounded-sm disabled:opacity-40">GIF</button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            placeholder={uploading ? 'uploading…' : 'message…'}
            rows={1}
            className="flex-1 resize-none bg-transparent border border-ink/15 focus:border-ink/40 font-mono text-[13px] text-ink placeholder:text-ink/25 px-3 py-2 rounded-2xl outline-none min-h-9 max-h-28 leading-snug"
          />
          <button onClick={sendText} disabled={!text.trim() || sending} className="shrink-0 h-9 font-mono text-[11px] uppercase tracking-[1px] font-bold text-obsidian bg-lime disabled:opacity-30 px-4 rounded-2xl border-none cursor-pointer transition">Send</button>
        </div>
      )}

      <GiphyPicker open={gifOpen} onClose={() => setGifOpen(false)} onPick={onPickGif} />
    </div>
  );
}

export function Avatar({ user, size }: { user: { name: string | null; username: string | null; avatarUrl: string | null } | null; size: number }) {
  const initial = (user?.name || user?.username || '?')[0]?.toUpperCase() ?? '?';
  return (
    <div className="rounded-full overflow-hidden shrink-0 border border-ink/10 bg-ink/[0.05] flex items-center justify-center" style={{ width: size, height: size }}>
      {user?.avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-basement text-ink/40" style={{ fontSize: size * 0.42 }}>{initial}</span>
      )}
    </div>
  );
}
