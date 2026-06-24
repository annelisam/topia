'use client';

import Link from 'next/link';
import { useDashboard } from './DashboardContext';
import { CheckIcon } from '../../components/ui/Icons';

/**
 * Mini "fill your profile" checklist. Encourages new users to finish setup
 * and gives returning users a glance at what's missing.
 */
export default function ProfileCompletionWidget() {
  const { profile, worldMemberships } = useDashboard();

  const checks = [
    { label: 'Display name',     done: Boolean(profile?.name) },
    { label: 'Username',         done: Boolean(profile?.username) },
    { label: 'Avatar photo',     done: Boolean(profile?.avatarUrl) },
    { label: 'Bio',              done: Boolean(profile?.bio?.trim()) },
    { label: 'Role tags',        done: Boolean(profile?.roleTags?.trim()) },
    { label: 'Tools you use',    done: Boolean(profile?.toolSlugs?.trim()) },
    { label: 'Join or build a world', done: worldMemberships.length > 0 },
  ];

  const completed = checks.filter((c) => c.done).length;
  const pct = Math.round((completed / checks.length) * 100);
  const fullyDone = pct === 100;

  if (fullyDone) return null; // hide once everything is filled

  return (
    <div className="bg-[var(--page-bg)] border border-ink/[0.08] rounded-lg overflow-hidden mb-6">
      <div className="bg-lime px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/60">
          topia://complete-profile
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian font-bold">
          {completed} / {checks.length} · {pct}%
        </span>
      </div>
      <div className="p-4">
        {/* Progress bar */}
        <div className="w-full h-1 bg-ink/10 rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-lime transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2">
              <span
                className={`w-3.5 h-3.5 shrink-0 flex items-center justify-center rounded-sm border ${
                  c.done ? 'bg-lime border-lime text-obsidian' : 'border-ink/20 text-transparent'
                }`}
              >
                <CheckIcon size={9} strokeWidth={2} />
              </span>
              <span className={`font-mono text-[12px] uppercase tracking-wider ${c.done ? 'text-ink/40 line-through' : 'text-ink/70'}`}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Link
            href="/profile"
            className="inline-block font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian px-3 py-1.5 rounded-sm hover:opacity-90 transition no-underline"
          >
            finish profile →
          </Link>
          {worldMemberships.length === 0 && (
            <Link
              href="/worlds"
              className="inline-block font-mono text-[11px] uppercase tracking-[2px] text-ink/60 hover:text-ink border border-ink/20 hover:border-ink/60 px-3 py-1.5 rounded-sm transition no-underline"
            >
              explore worlds
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
