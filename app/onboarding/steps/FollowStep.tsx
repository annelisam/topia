'use client';

import { useEffect, useState } from 'react';
import StepShell from '../StepShell';
import { PathConfig } from '../../components/profile/pathConfig';
import { roleSlugToLabel } from '../../../lib/profile/roleTags';

interface Suggestion {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  roleTags: string[];
  sharedTags: string[];
  followers: number;
}

interface Props {
  step: number;
  total: number;
  config: PathConfig | null;
  privyId: string;
  onBack: () => void;
  onAdvance: () => void;
}

export default function FollowStep({ step, total, config, privyId, onBack, onAdvance }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!privyId) { setLoading(false); return; }
    fetch(`/api/profiles/suggested?privyId=${encodeURIComponent(privyId)}`)
      .then((r) => (r.ok ? r.json() : { suggestions: [] }))
      .then((d) => setSuggestions(Array.isArray(d.suggestions) ? d.suggestions : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [privyId]);

  // Nobody to suggest (brand-new instance or fetch failure) — skip the step
  // entirely rather than showing an empty room.
  useEffect(() => {
    if (!loading && suggestions.length === 0) onAdvance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, suggestions.length]);

  async function toggleFollow(target: Suggestion) {
    if (pending.has(target.id)) return;
    const isOn = following.has(target.id);
    setPending((p) => new Set(p).add(target.id));
    // optimistic
    setFollowing((f) => {
      const next = new Set(f);
      if (isOn) next.delete(target.id); else next.add(target.id);
      return next;
    });
    try {
      const res = await fetch('/api/follow', {
        method: isOn ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, targetUserId: target.id }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch (err) {
      console.error('[onboarding] follow toggle failed:', err);
      setFollowing((f) => {
        const next = new Set(f);
        if (isOn) next.add(target.id); else next.delete(target.id);
        return next;
      });
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(target.id);
        return next;
      });
    }
  }

  return (
    <StepShell
      step={step}
      total={total}
      config={config}
      kicker={`${String(step).padStart(2, '0')} · find your people`}
      heading="Follow some Topians."
      hint={following.size > 0 ? `following ${following.size} · press continue when ready` : 'optional — you can always find people later'}
      onBack={onBack}
    >
      <p className="font-mono text-[11px] text-ink/40 mb-5 max-w-md">
        a few creators who share your craft. following them fills your feed from day one.
      </p>

      {loading ? (
        <div className="py-10 font-mono text-[11px] uppercase tracking-[3px] text-ink/40">finding your people…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto pr-1">
          {suggestions.map((s) => {
            const isOn = following.has(s.id);
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 border border-ink/10 rounded-sm px-3 py-2.5 bg-ink/[0.02]"
              >
                <span className="w-10 h-10 rounded-full overflow-hidden bg-ink/5 shrink-0 flex items-center justify-center">
                  {s.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={s.avatarUrl} alt="" width={40} height={40} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-basement text-[13px] text-ink/50">{(s.name || s.username || '?')[0]?.toUpperCase()}</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[12px] font-bold text-ink truncate">{s.name || `@${s.username}`}</div>
                  <div className="font-mono text-[10px] text-ink/40 truncate">
                    {s.sharedTags.length > 0
                      ? `also ${s.sharedTags.slice(0, 2).map(roleSlugToLabel).join(' · ').toLowerCase()}`
                      : (s.roleTags.slice(0, 2).map(roleSlugToLabel).join(' · ').toLowerCase() || `@${s.username}`)}
                  </div>
                </div>
                <button
                  onClick={() => toggleFollow(s)}
                  disabled={pending.has(s.id)}
                  className={`shrink-0 font-mono text-[10px] uppercase tracking-[2px] px-2.5 py-1.5 rounded-sm border transition cursor-pointer ${
                    isOn
                      ? 'bg-ink text-[var(--page-bg)] border-ink'
                      : 'bg-transparent border-ink/30 text-ink/70 hover:border-ink/70 hover:text-ink'
                  }`}
                >
                  {pending.has(s.id) ? '…' : isOn ? 'following' : '+ follow'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={onAdvance}
          className="font-mono text-[12px] uppercase tracking-[2px] text-ink/70 hover:text-ink transition-colors bg-transparent border border-ink/30 hover:border-ink/70 px-4 py-2 cursor-pointer"
        >
          continue →
        </button>
        {following.size === 0 && !loading && (
          <button
            onClick={onAdvance}
            className="font-mono text-[11px] uppercase tracking-[2px] text-ink/30 hover:text-ink/60 transition-colors bg-transparent border-none cursor-pointer"
          >
            skip for now
          </button>
        )}
      </div>
    </StepShell>
  );
}
