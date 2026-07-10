'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export interface ReactionSummary {
  emoji: string;
  count: number;
  viewerReacted: boolean;
}

interface Props {
  targetType: 'guestbook' | 'tool_comment' | 'event_comment' | 'world_post';
  targetId: string;
  initial: ReactionSummary[];
  /** Force compact density (smaller pills) for tight contexts like replies. */
  size?: 'sm' | 'xs';
}

const QUICK_EMOJI = ['❤️', '🔥', '👍', '😂', '👀', '🎉'];

/**
 * Inline reaction bar — shows the current emoji pill counts and lets the
 * viewer toggle any quick reaction. Optimistic; reverts on POST failure.
 *
 * Renders nothing for unauthenticated viewers when there are no reactions
 * yet (avoids empty rows everywhere). When there are existing reactions
 * we always show them (read-only) so viewers see social proof.
 */
export default function ReactionBar({ targetType, targetId, initial, size = 'sm' }: Props) {
  const { authenticated, user, login } = usePrivy();
  const [summaries, setSummaries] = useState<ReactionSummary[]>(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Merge a viewer toggle into the summaries list locally — used for both
  // optimistic update and rollback.
  function applyToggle(emoji: string, reacting: boolean) {
    setSummaries((cur) => {
      const next = [...cur];
      const idx = next.findIndex((s) => s.emoji === emoji);
      if (idx >= 0) {
        const newCount = next[idx].count + (reacting ? 1 : -1);
        if (newCount <= 0) next.splice(idx, 1);
        else next[idx] = { ...next[idx], count: newCount, viewerReacted: reacting };
      } else if (reacting) {
        next.push({ emoji, count: 1, viewerReacted: true });
      }
      // Preserve QUICK_EMOJI order
      next.sort((a, b) => QUICK_EMOJI.indexOf(a.emoji) - QUICK_EMOJI.indexOf(b.emoji));
      return next;
    });
  }

  async function toggle(emoji: string) {
    if (!authenticated) { login(); return; }
    if (!user?.id || busy) return;
    setBusy(emoji);
    setPickerOpen(false);
    const wasReacting = summaries.find((s) => s.emoji === emoji)?.viewerReacted ?? false;
    applyToggle(emoji, !wasReacting); // optimistic
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, targetType, targetId, emoji }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Revert
        applyToggle(emoji, wasReacting);
        console.warn('reaction failed:', json.error);
      } else if (typeof json.reacting === 'boolean' && json.reacting !== !wasReacting) {
        // Server returned a different state than we predicted — reconcile
        applyToggle(emoji, json.reacting);
      }
    } catch {
      applyToggle(emoji, wasReacting);
    } finally {
      setBusy(null);
    }
  }

  // If anon AND no reactions, render nothing — avoids whitespace.
  if (!authenticated && summaries.length === 0) return null;

  const pillCls = size === 'xs'
    ? 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[11px] leading-none'
    : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[12px] leading-none';

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1.5">
      {summaries.map((s) => (
        <button
          key={s.emoji}
          onClick={() => toggle(s.emoji)}
          disabled={busy === s.emoji}
          className={`${pillCls} transition cursor-pointer ${
            s.viewerReacted
              ? 'border-lime/50 bg-lime/15 text-bone'
              : 'border-bone/10 bg-bone/[0.03] text-bone/70 hover:border-bone/30'
          }`}
          title={s.viewerReacted ? 'Click to remove' : 'Click to react'}
        >
          <span>{s.emoji}</span>
          <span className="font-mono text-[10px] text-bone/60">{s.count}</span>
        </button>
      ))}

      {/* + react button — only when signed in */}
      {authenticated && (
        <div className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className={`${pillCls} border-bone/10 bg-bone/[0.02] text-bone/40 hover:text-bone hover:border-bone/30 transition cursor-pointer`}
            title="Add reaction"
          >
            <span className="text-[14px] leading-none">＋</span>
          </button>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-[40]" onClick={() => setPickerOpen(false)} />
              <div className="absolute bottom-full left-0 mb-1.5 z-50 flex items-center gap-0.5 bg-obsidian border border-bone/15 rounded-full px-1.5 py-1 shadow-2xl">
                {QUICK_EMOJI.map((e) => (
                  <button
                    key={e}
                    onClick={() => toggle(e)}
                    className="w-7 h-7 flex items-center justify-center text-[16px] rounded-full hover:bg-bone/[0.08] transition cursor-pointer bg-transparent border-none"
                    title={`React ${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
