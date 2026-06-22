'use client';

import { useEffect, useState } from 'react';
import StepShell from '../StepShell';
import { PathConfig } from '../../components/profile/pathConfig';

const ROLE_TAGS = [
  { slug: 'music', label: 'Music' },
  { slug: 'dj', label: 'DJ' },
  { slug: 'visual-artist', label: 'Visual Artist' },
  { slug: 'filmmaker', label: 'Filmmaker' },
  { slug: 'photographer', label: 'Photographer' },
  { slug: 'writer', label: 'Writer' },
  { slug: 'poet', label: 'Poet' },
  { slug: 'dancer', label: 'Dancer' },
  { slug: 'performer', label: 'Performer' },
  { slug: 'producer', label: 'Producer' },
  { slug: 'designer', label: 'Designer' },
  { slug: 'illustrator', label: 'Illustrator' },
  { slug: 'game-designer', label: 'Game Designer' },
  { slug: 'architect', label: 'Architect' },
  { slug: 'technologist', label: 'Technologist' },
  { slug: 'curator', label: 'Curator' },
  { slug: 'educator', label: 'Educator' },
  { slug: 'community-builder', label: 'Community Builder' },
  { slug: 'entrepreneur', label: 'Entrepreneur' },
  { slug: 'researcher', label: 'Researcher' },
];

interface Props {
  step: number;
  total: number;
  config: PathConfig | null;
  initialValue: string[];
  onBack: () => void;
  onAdvance: (roleTags: string[]) => void;
}

export default function RoleTagsStep({ step, total, config, initialValue, onBack, onAdvance }: Props) {
  const [selected, setSelected] = useState<string[]>(initialValue);
  const [error, setError] = useState('');

  // Pre-select the user's saved tags once the profile hydrates (the initial
  // value arrives async, after mount, so useState's initializer misses it).
  useEffect(() => {
    setSelected(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue.join(',')]);

  function toggle(slug: string) {
    setSelected((prev) => prev.includes(slug) ? prev.filter((r) => r !== slug) : [...prev, slug]);
    if (error) setError('');
  }

  function submit() {
    if (selected.length === 0) { setError('pick at least one — these power your discovery.'); return; }
    onAdvance(selected);
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Enter') submit();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const accent = config?.hex ?? '#e4fe52';
  const accentTextOn = config?.textOn ?? 'text-obsidian';

  return (
    <StepShell
      step={step}
      total={total}
      config={config}
      kicker={`${String(step).padStart(2, '0')} · what do you do`}
      heading="Tag your craft."
      hint={`${selected.length} selected · press enter ↵`}
      onBack={onBack}
    >
      <p className="font-mono text-[11px] text-ink/40 mb-5 max-w-md">pick everything that fits — be generous. you can fine-tune anytime.</p>
      <div className="flex flex-wrap gap-2">
        {ROLE_TAGS.map(({ slug, label }) => {
          const on = selected.includes(slug);
          return (
            <button
              key={slug}
              onClick={() => toggle(slug)}
              className={`font-mono text-[12px] uppercase tracking-[1px] px-3 py-1.5 transition-all cursor-pointer border ${
                on ? `${accentTextOn} border-transparent` : 'text-ink/60 border-ink/15 hover:border-ink/40 bg-transparent'
              }`}
              style={on ? { backgroundColor: accent } : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>
      {error && (
        <div className="mt-4 font-mono text-[11px] uppercase tracking-[2px] text-pink/80">{error}</div>
      )}
      <div className="mt-6">
        <button
          onClick={submit}
          className="font-mono text-[12px] uppercase tracking-[2px] text-ink/70 hover:text-ink transition-colors bg-transparent border border-ink/30 hover:border-ink/70 px-4 py-2 cursor-pointer"
        >
          continue →
        </button>
      </div>
    </StepShell>
  );
}
