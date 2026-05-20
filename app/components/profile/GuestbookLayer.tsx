'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { PathConfig } from './pathConfig';
import GiphyPicker, { type PickedGif } from '../GiphyPicker';
import DrawingCanvas from '../DrawingCanvas';
import ReactionBar, { type ReactionSummary } from '../ReactionBar';

interface GuestbookEntry {
  id: string;
  kind: 'drawing' | 'message' | 'gif' | 'reply';
  body: string | null;
  imageUrl: string | null;
  giphyId: string | null;
  parentId: string | null;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  reactions?: ReactionSummary[];
  replies?: GuestbookEntry[];
}

type Relation = 'anon' | 'self' | 'none' | 'oneway' | 'mutual';

interface Props {
  config: PathConfig;
  profileUsername: string;
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GuestbookLayer({ config, profileUsername }: Props) {
  const { user } = usePrivy();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [relation, setRelation] = useState<Relation>('anon');
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);

  // Per-thread reply state
  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ username: profileUsername });
      if (user?.id) params.set('viewerPrivyId', user.id);
      const res = await fetch(`/api/guestbook?${params}`);
      const json = await res.json();
      setEntries(json.entries ?? []);
      setRelation(json.relation ?? 'anon');
    } catch (err) {
      console.error('guestbook load failed', err);
    } finally {
      setLoading(false);
    }
  }, [profileUsername, user?.id]);

  useEffect(() => { load(); }, [load]);

  // Permission gating
  // - Self users can do everything (text + gif + drawing) — own guestbook
  // - Mutual: drawings + text + gif
  // - One-way: text + gif (no drawing)
  // - Reply: same as message gate (text-only) — handled inline below
  const canMessage = relation === 'self' || relation === 'oneway' || relation === 'mutual';
  const canDraw    = relation === 'self' || relation === 'mutual';
  const canReply   = canMessage; // text-only replies; same gate as messages

  async function postEntry(payload: { kind: 'drawing' | 'message' | 'gif' | 'reply'; body?: string; imageUrl?: string; giphyId?: string; parentId?: string }) {
    if (!user?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, profileUsername, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to post'); return; }
      setText('');
      await load();
    } catch (err) {
      console.error('post guestbook failed', err);
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendMessage() {
    if (!text.trim()) return;
    await postEntry({ kind: 'message', body: text });
  }
  async function handlePickGif(gif: PickedGif) {
    await postEntry({ kind: 'gif', imageUrl: gif.url, giphyId: gif.id, body: gif.title || undefined });
  }
  async function handleSaveDrawing(dataUrl: string, caption: string) {
    await postEntry({ kind: 'drawing', imageUrl: dataUrl, body: caption || undefined });
  }
  async function submitReply(parentId: string) {
    if (!user?.id || !replyBody.trim()) return;
    setReplySubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          profileUsername,
          kind: 'reply',
          body: replyBody.trim(),
          parentId,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to reply'); return; }
      setReplyBody('');
      setReplyOpenFor(null);
      await load();
    } finally {
      setReplySubmitting(false);
    }
  }

  /* ── Sub-renderer for an entry (recursive for replies) ────── */
  function EntryRow({ e, i, isReply = false }: { e: GuestbookEntry; i: number; isReply?: boolean }) {
    return (
      <div className={`flex items-start hover:bg-bone/[0.02] transition-colors py-3 ${isReply ? 'pl-10 pr-4 border-l border-bone/[0.06] ml-10' : 'px-4'}`}>
        {/* Index gutter for top-level only */}
        {!isReply && (
          <div className="w-[28px] shrink-0 flex items-start justify-center pt-1">
            <span className="font-mono text-[9px] text-bone/15">{String(i + 1).padStart(2, '0')}</span>
          </div>
        )}
        {!isReply && <div className="w-[2px] shrink-0 self-stretch mr-3" style={{ backgroundColor: config.hex }} />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {e.authorAvatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={e.authorAvatarUrl} alt="" className={`${isReply ? 'w-4 h-4' : 'w-5 h-5'} rounded-full object-cover`} />
            ) : (
              <div className={`${isReply ? 'w-4 h-4' : 'w-5 h-5'} rounded-full bg-bone/10 flex items-center justify-center`}>
                <span className="font-basement text-[9px] text-bone/50">{(e.authorName || e.authorUsername || '?')[0]?.toUpperCase()}</span>
              </div>
            )}
            {e.authorUsername ? (
              <Link href={`/profile/${e.authorUsername}`} className="font-mono text-[11px] text-bone hover:text-lime font-bold no-underline">
                @{e.authorUsername}
              </Link>
            ) : (
              <span className="font-mono text-[11px] text-bone/60 font-bold">{e.authorName || 'anon'}</span>
            )}
            {isReply && <span className="font-mono text-[8px] uppercase tracking-[2px] text-bone/25">↪ reply</span>}
            <span className="font-mono text-[9px] text-bone/25 ml-auto">{timeAgo(e.createdAt)}</span>
          </div>

          {e.kind === 'drawing' && e.imageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.imageUrl} alt={e.body || 'drawing'} className="rounded-sm border border-bone/10 max-w-[280px] aspect-square object-cover" />
              {e.body && <p className="font-zirkon text-[12px] text-bone/60 leading-relaxed mt-1.5 italic">&ldquo;{e.body}&rdquo;</p>}
            </>
          )}

          {e.kind === 'gif' && e.imageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.imageUrl} alt={e.body || 'gif'} className="rounded-sm border border-bone/10 max-w-[240px]" />
              <span className="block font-mono text-[8px] uppercase tracking-[2px] text-bone/20 mt-0.5">via giphy</span>
            </>
          )}

          {(e.kind === 'message' || e.kind === 'reply') && e.body && (
            <p className="font-zirkon text-[13px] text-bone/70 leading-relaxed whitespace-pre-wrap">{e.body}</p>
          )}

          {/* Reactions */}
          <ReactionBar
            targetType="guestbook"
            targetId={e.id}
            initial={e.reactions ?? []}
            size={isReply ? 'xs' : 'sm'}
          />

          {/* Reply trigger (top-level only) */}
          {!isReply && canReply && (
            <button
              onClick={() => {
                setReplyOpenFor(replyOpenFor === e.id ? null : e.id);
                setReplyBody('');
              }}
              className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40 hover:text-bone bg-transparent border-none cursor-pointer mt-1.5 px-0"
            >
              {replyOpenFor === e.id ? '× cancel' : '↪ reply'}
            </button>
          )}

          {/* Inline reply composer — text-only by design */}
          {!isReply && replyOpenFor === e.id && (
            <div className="mt-2 border border-bone/15 focus-within:border-lime/40 rounded-md p-2.5 bg-bone/[0.02] transition-colors">
              <textarea
                value={replyBody}
                onChange={(ev) => setReplyBody(ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); submitReply(e.id); } }}
                placeholder={`Replying to @${e.authorUsername || 'them'}…`}
                rows={2}
                maxLength={500}
                className="w-full bg-transparent border-none outline-none font-mono text-[12px] text-bone placeholder:text-bone/25 resize-none"
              />
              <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-bone/[0.05]">
                <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25">text only on replies</span>
                <button
                  onClick={() => submitReply(e.id)}
                  disabled={replySubmitting || !replyBody.trim()}
                  className="font-mono text-[10px] uppercase tracking-[2px] px-2.5 py-1 bg-lime text-obsidian rounded-sm disabled:opacity-50 hover:opacity-90 transition cursor-pointer border-none"
                >
                  {replySubmitting ? '…' : 'reply →'}
                </button>
              </div>
            </div>
          )}

          {/* Nested replies */}
          {!isReply && e.replies && e.replies.length > 0 && (
            <div className="mt-3 space-y-1">
              {e.replies.map((r) => (
                <EntryRow key={r.id} e={r} i={0} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-obsidian flex flex-col overflow-y-auto h-full" style={{ scrollbarWidth: 'thin' }}>
      {/* Subtle paper texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)' }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 47px, rgba(245,240,232,1) 47px, rgba(245,240,232,1) 48px)' }} />

      {/* Header */}
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between relative z-10`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Guestbook</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-30`}>
          {loading ? '…' : `${entries.length} ${entries.length === 1 ? 'note' : 'notes'}`}
        </span>
      </div>

      {/* Entries */}
      <div className="relative z-10 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="font-mono text-[11px] text-bone/20 uppercase tracking-wider">loading…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-2">
            <span className="font-mono text-[11px] text-bone/30 uppercase tracking-wider">No notes yet</span>
            {canMessage && <span className="font-mono text-[10px] text-bone/20 uppercase tracking-wider">be the first ↓</span>}
          </div>
        ) : (
          <div className="divide-y divide-bone/[0.04]">
            {entries.map((e, i) => <EntryRow key={e.id} e={e} i={i} />)}
          </div>
        )}
      </div>

      {/* Composer footer */}
      <div className="relative z-10 border-t border-bone/[0.06] px-4 py-3 sticky bottom-0 bg-obsidian/95 backdrop-blur-sm">
        {relation === 'anon' && (
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 text-center py-2">
            log in to sign the guestbook
          </p>
        )}
        {relation === 'none' && (
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 text-center py-2">
            follow @{profileUsername} to leave a note
          </p>
        )}
        {canMessage && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder={
                relation === 'self'
                  ? 'pin a note · draw · or send a gif…'
                  : canDraw
                    ? 'leave a note · draw · or send a gif…'
                    : 'leave a note or send a gif…'
              }
              disabled={submitting}
              className="flex-1 font-mono text-[12px] bg-bone/[0.04] border border-bone/15 focus:border-lime/40 text-bone placeholder:text-bone/25 px-2.5 py-1.5 rounded-sm outline-none disabled:opacity-60"
              maxLength={500}
            />
            <button
              type="button"
              onClick={() => setGifPickerOpen(true)}
              disabled={submitting}
              title="Add a GIF"
              className="font-mono text-[10px] uppercase tracking-[2px] px-2 py-1.5 bg-transparent border border-bone/15 text-bone/60 hover:text-bone hover:border-lime/40 rounded-sm transition cursor-pointer"
            >
              GIF
            </button>
            {canDraw && (
              <button
                type="button"
                onClick={() => setDrawingOpen(true)}
                disabled={submitting}
                title={relation === 'self' ? 'Draw on your own guestbook' : 'Draw a picture (mutual follow only)'}
                className="font-mono text-[10px] uppercase tracking-[2px] px-2 py-1.5 bg-transparent border border-bone/15 text-bone/60 hover:text-bone hover:border-lime/40 rounded-sm transition cursor-pointer"
              >
                ✎ DRAW
              </button>
            )}
            <button
              onClick={handleSendMessage}
              disabled={submitting || !text.trim()}
              className="font-mono text-[10px] uppercase tracking-[2px] px-3 py-1.5 bg-lime text-obsidian rounded-sm disabled:opacity-40 hover:opacity-90 transition cursor-pointer border-none"
            >
              {submitting ? '…' : 'Send'}
            </button>
          </div>
        )}
        {error && <p className="font-mono text-[10px] uppercase tracking-[2px] text-pink/80 mt-2">{error}</p>}
        {canMessage && !canDraw && (
          <p className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 mt-2">
            ◆ become mutual follows with @{profileUsername} to unlock drawings
          </p>
        )}
        {relation === 'self' && (
          <p className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 mt-2">
            ◆ this is your own guestbook · pin a welcome note, set the vibe
          </p>
        )}
      </div>

      <GiphyPicker open={gifPickerOpen} onClose={() => setGifPickerOpen(false)} onPick={handlePickGif} />
      <DrawingCanvas open={drawingOpen} onClose={() => setDrawingOpen(false)} onSave={handleSaveDrawing} />
    </div>
  );
}
