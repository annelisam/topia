'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import GiphyPicker, { type PickedGif } from './GiphyPicker';
import { StarIcon } from './ui/Icons';
import ReactionBar, { type ReactionSummary } from './ReactionBar';

export interface CommentItem {
  id: string;
  body: string | null;
  rating?: number | null;
  imageUrl?: string | null;
  giphyId?: string | null;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  isHost?: boolean;
  reactions?: ReactionSummary[];
  replies?: CommentItem[];
}

interface Props {
  endpoint: string;
  slug: string;
  kind: 'tool' | 'event';
  gateHint: string;
  title?: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CommentSection({ endpoint, slug, kind, gateHint, title }: Props) {
  const { user, authenticated } = usePrivy();
  const [items, setItems] = useState<CommentItem[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [avg, setAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Top-level composer state
  const [body, setBody] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [gif, setGif] = useState<PickedGif | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-thread reply state — keyed by parent comment id
  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyGif, setReplyGif] = useState<PickedGif | null>(null);
  const [replyGifOpen, setReplyGifOpen] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);

  const targetType = kind === 'tool' ? 'tool_comment' : 'event_comment';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ slug });
      if (user?.id) params.set('viewerPrivyId', user.id);
      const res = await fetch(`${endpoint}?${params}`);
      const json = await res.json();
      setItems(json.comments ?? []);
      setCanPost(!!json.canPost);
      if (kind === 'tool') {
        setAvg(json.averageRating ?? null);
        setRatingCount(json.ratingCount ?? 0);
      }
    } catch (err) {
      console.error('comments load failed', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, slug, kind, user?.id]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!user?.id) return;
    if (!body.trim() && !gif && (kind !== 'tool' || rating === 0)) {
      setError('Add something — a comment, a rating, or a gif');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { privyId: user.id, slug };
      if (body.trim()) payload.body = body.trim();
      if (kind === 'tool' && rating > 0) payload.rating = rating;
      if (kind === 'event' && gif) {
        payload.imageUrl = gif.url;
        payload.giphyId = gif.id;
      }
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to post'); return; }
      setBody(''); setGif(null); setRating(0);
      await load();
    } catch (err) {
      console.error('comment post failed', err);
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply(parentId: string) {
    if (!user?.id) return;
    if (!replyBody.trim() && !replyGif) return;
    setReplySubmitting(true);
    try {
      const payload: Record<string, unknown> = { privyId: user.id, slug, parentId };
      if (replyBody.trim()) payload.body = replyBody.trim();
      if (kind === 'event' && replyGif) {
        payload.imageUrl = replyGif.url;
        payload.giphyId = replyGif.id;
      }
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to reply'); return; }
      setReplyBody(''); setReplyGif(null); setReplyOpenFor(null);
      await load();
    } finally {
      setReplySubmitting(false);
    }
  }

  function CommentRow({ c, isReply = false }: { c: CommentItem; isReply?: boolean }) {
    return (
      <div className={`flex items-start gap-3 ${isReply ? 'pl-3 border-l-2 border-bone/[0.06]' : 'border border-bone/[0.06] rounded-md p-3 bg-bone/[0.015]'}`}>
        {c.authorAvatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={c.authorAvatarUrl} alt="" className={`${isReply ? 'w-6 h-6' : 'w-7 h-7'} rounded-full object-cover shrink-0`} />
        ) : (
          <div className={`${isReply ? 'w-6 h-6' : 'w-7 h-7'} rounded-full bg-bone/10 flex items-center justify-center shrink-0`}>
            <span className="font-basement text-[12px] text-bone/50">{(c.authorName || c.authorUsername || '?')[0]?.toUpperCase()}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            {c.authorUsername ? (
              <Link href={`/profile/${c.authorUsername}`} className="font-mono text-[11px] text-bone font-bold no-underline hover:text-lime">@{c.authorUsername}</Link>
            ) : (
              <span className="font-mono text-[11px] text-bone/60 font-bold">{c.authorName || 'anon'}</span>
            )}
            {c.isHost && (
              <span className="font-mono text-[8px] uppercase tracking-[2px] bg-lime text-obsidian px-1.5 py-0.5 rounded-sm font-bold leading-none">Host</span>
            )}
            {kind === 'tool' && c.rating != null && !isReply && (
              <span className="flex items-center gap-0.5 text-lime">
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} size={9} filled={n <= (c.rating ?? 0)} className={n <= (c.rating ?? 0) ? 'text-lime' : 'text-bone/15'} />
                ))}
              </span>
            )}
            <span className="font-mono text-[9px] text-bone/25 ml-auto">{timeAgo(c.createdAt)}</span>
          </div>
          {c.body && (
            <p className="font-zirkon text-[13px] text-bone/75 leading-relaxed whitespace-pre-wrap mt-1">{c.body}</p>
          )}
          {c.imageUrl && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt={c.body || 'gif'} className="rounded-sm border border-bone/10 max-w-[220px]" />
              {c.giphyId && <span className="block font-mono text-[8px] uppercase tracking-[2px] text-bone/20 mt-0.5">via giphy</span>}
            </div>
          )}

          {/* Reactions */}
          <ReactionBar
            targetType={targetType}
            targetId={c.id}
            initial={c.reactions ?? []}
            size={isReply ? 'xs' : 'sm'}
          />

          {/* Reply trigger (only on top-level) */}
          {!isReply && authenticated && canPost && (
            <button
              onClick={() => {
                setReplyOpenFor(replyOpenFor === c.id ? null : c.id);
                setReplyBody('');
                setReplyGif(null);
              }}
              className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40 hover:text-bone bg-transparent border-none cursor-pointer mt-1.5 px-0"
            >
              {replyOpenFor === c.id ? '× cancel' : '↪ reply'}
            </button>
          )}

          {/* Inline reply composer */}
          {!isReply && replyOpenFor === c.id && (
            <div className="mt-2 border border-bone/15 focus-within:border-lime/40 rounded-md p-2.5 bg-bone/[0.02] transition-colors">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={`Replying to @${c.authorUsername || 'them'}…`}
                rows={2}
                maxLength={1000}
                className="w-full bg-transparent border-none outline-none font-mono text-[12px] text-bone placeholder:text-bone/25 resize-none"
              />
              {replyGif && (
                <div className="relative inline-block mt-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={replyGif.previewUrl} alt={replyGif.title} className="rounded-sm border border-bone/15 max-w-[120px]" />
                  <button onClick={() => setReplyGif(null)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-obsidian border border-bone/20 text-bone text-[10px] cursor-pointer leading-none flex items-center justify-center" aria-label="Remove gif">×</button>
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-bone/[0.05]">
                {kind === 'event' && (
                  <button
                    type="button"
                    onClick={() => setReplyGifOpen(true)}
                    className="font-mono text-[9px] uppercase tracking-[2px] px-1.5 py-0.5 bg-transparent border border-bone/15 text-bone/60 hover:text-bone hover:border-lime/40 rounded-sm transition cursor-pointer"
                  >
                    + GIF
                  </button>
                )}
                <button
                  onClick={() => submitReply(c.id)}
                  disabled={replySubmitting || (!replyBody.trim() && !replyGif)}
                  className="ml-auto font-mono text-[10px] uppercase tracking-[2px] px-2.5 py-1 bg-lime text-obsidian rounded-sm disabled:opacity-50 hover:opacity-90 transition cursor-pointer border-none"
                >
                  {replySubmitting ? '…' : 'reply →'}
                </button>
              </div>
            </div>
          )}

          {/* Nested replies */}
          {!isReply && c.replies && c.replies.length > 0 && (
            <div className="mt-3 space-y-2.5">
              {c.replies.map((r) => (
                <CommentRow key={r.id} c={r} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-bone/[0.06] pt-5 mt-5">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/50">
          {title ?? (kind === 'tool' ? 'Reviews' : 'Comments')}
          {!loading && ` · ${items.length}`}
        </span>
        {kind === 'tool' && avg != null && (
          <span className="font-mono text-[11px] text-bone/60 flex items-center gap-1">
            <StarIcon size={11} filled /> {avg.toFixed(1)}{' '}
            <span className="text-bone/30">({ratingCount})</span>
          </span>
        )}
      </div>

      {/* Top-level composer */}
      {!authenticated ? (
        <p className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 py-2">log in to leave a comment</p>
      ) : !canPost ? (
        <p className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 py-2">{gateHint}</p>
      ) : (
        <div className="border border-bone/10 hover:border-bone/20 focus-within:border-lime/40 rounded-md p-3 mb-4 transition-colors bg-bone/[0.02]">
          {kind === 'tool' && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mr-1">rating</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? 0 : n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="bg-transparent border-none cursor-pointer text-bone/30 hover:text-lime transition p-0"
                  title={`${n} of 5`}
                >
                  <StarIcon size={16} filled={n <= (hoverRating || rating)} className={n <= (hoverRating || rating) ? 'text-lime' : 'text-bone/25'} />
                </button>
              ))}
              {rating > 0 && (
                <button onClick={() => setRating(0)} className="font-mono text-[9px] uppercase tracking-[2px] text-bone/30 hover:text-bone bg-transparent border-none cursor-pointer ml-2">
                  clear
                </button>
              )}
            </div>
          )}

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={kind === 'tool' ? 'share what you think — pros, cons, workflow…' : 'what are you thinking?'}
            rows={2}
            maxLength={1500}
            className="w-full bg-transparent border-none outline-none font-mono text-[13px] text-bone placeholder:text-bone/25 resize-none"
          />

          {gif && (
            <div className="relative inline-block mt-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gif.previewUrl} alt={gif.title} className="rounded-sm border border-bone/15 max-w-[140px]" />
              <button onClick={() => setGif(null)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-obsidian border border-bone/20 text-bone text-[12px] cursor-pointer leading-none flex items-center justify-center" aria-label="Remove gif">×</button>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-bone/[0.05]">
            {kind === 'event' && (
              <button
                type="button"
                onClick={() => setGifOpen(true)}
                className="font-mono text-[10px] uppercase tracking-[2px] px-2 py-1 bg-transparent border border-bone/15 text-bone/60 hover:text-bone hover:border-lime/40 rounded-sm transition cursor-pointer"
              >
                + GIF
              </button>
            )}
            <button
              onClick={submit}
              disabled={submitting}
              className="ml-auto font-mono text-[10px] uppercase tracking-[2px] px-3 py-1.5 bg-lime text-obsidian rounded-sm disabled:opacity-50 hover:opacity-90 transition cursor-pointer border-none"
            >
              {submitting ? 'posting…' : 'post →'}
            </button>
          </div>
          {error && <p className="font-mono text-[10px] uppercase tracking-[2px] text-pink/80 mt-2">{error}</p>}
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="font-mono text-[11px] text-bone/30 py-4 text-center">loading…</p>
      ) : items.length === 0 ? (
        <p className="font-mono text-[11px] uppercase tracking-[2px] text-bone/25 py-4 text-center">no comments yet</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => <CommentRow key={c.id} c={c} />)}
        </div>
      )}

      <GiphyPicker open={gifOpen}     onClose={() => setGifOpen(false)}     onPick={(g) => setGif(g)} />
      <GiphyPicker open={replyGifOpen} onClose={() => setReplyGifOpen(false)} onPick={(g) => setReplyGif(g)} />
    </div>
  );
}
