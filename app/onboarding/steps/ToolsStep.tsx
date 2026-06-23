'use client';

import { useEffect, useState } from 'react';
import StepShell from '../StepShell';
import { PathConfig } from '../../components/profile/pathConfig';

interface Tool { id: string; name: string; slug: string; category: string | null; }

interface Props {
  step: number;
  total: number;
  config: PathConfig | null;
  initialValue: string[];
  onBack: () => void;
  onAdvance: (toolSlugs: string[]) => void;
}

export default function ToolsStep({ step, total, config, initialValue, onBack, onAdvance }: Props) {
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [selected, setSelected] = useState<string[]>(initialValue);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tools')
      .then((r) => r.json())
      .then(({ tools }) => setAllTools(tools ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function toggle(slug: string) {
    setSelected((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]);
  }

  function submit() {
    onAdvance(selected);
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const filtered = allTools.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.category?.toLowerCase().includes(q) ?? false);
  });

  const accent = config?.hex ?? '#e4fe52';
  const accentTextOn = config?.textOn ?? 'text-obsidian';

  return (
    <StepShell
      step={step}
      total={total}
      config={config}
      kicker={`${String(step).padStart(2, '0')} · your toolkit · optional`}
      heading="What do you make with?"
      hint={`${selected.length} selected · ⌘+enter to finish`}
      onBack={onBack}
    >
      <p className="font-mono text-[11px] text-ink/40 mb-5 max-w-md">tag the software, hardware, and platforms you live in. helps people find collaborators.</p>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selected.map((slug) => {
            const tool = allTools.find((t) => t.slug === slug);
            if (!tool) return null;
            return (
              <button
                key={slug}
                onClick={() => toggle(slug)}
                className={`font-mono text-[12px] uppercase tracking-[1px] px-3 py-1.5 ${accentTextOn} border-transparent flex items-center gap-2 cursor-pointer`}
                style={{ backgroundColor: accent }}
                title="click to remove"
              >
                {tool.name}
                <span className="opacity-60">×</span>
              </button>
            );
          })}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="search tools…"
        className="w-full bg-transparent border-b border-ink/15 focus:border-ink/40 font-mono text-[14px] text-ink placeholder:text-ink/20 px-1 py-2 outline-none transition-colors"
      />

      {loading ? (
        <p className="mt-4 font-mono text-[12px] text-ink/30">loading tools…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 font-mono text-[12px] text-ink/30">no tools match — try another search</p>
      ) : (
        <div className="mt-4 max-h-[260px] overflow-y-auto border border-ink/10 rounded-sm" style={{ scrollbarWidth: 'thin' }}>
          {filtered.slice(0, 80).map((tool) => {
            const on = selected.includes(tool.slug);
            return (
              <button
                key={tool.slug}
                onClick={() => toggle(tool.slug)}
                className={`w-full flex items-center justify-between px-3 py-2 transition-colors text-left cursor-pointer border-b border-ink/[0.04] ${on ? 'bg-ink/[0.05]' : 'bg-transparent hover:bg-ink/[0.02]'}`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 border flex items-center justify-center shrink-0"
                    style={{ borderColor: on ? accent : 'rgba(245,240,232,0.2)', backgroundColor: on ? accent : 'transparent' }}
                  >
                    {on && <span style={{ color: '#1a1a1a' }}><svg width="7" height="7" viewBox="0 0 10 10" aria-hidden="true"><polyline points="1.5,5.5 4,8 8.5,2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" fill="none" /></svg></span>}
                  </span>
                  <span className="font-mono text-[13px] text-ink">{tool.name}</span>
                </span>
                {tool.category && (
                  <span className="font-mono text-[10px] uppercase tracking-[2px] text-ink/25">{tool.category}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={submit}
          className="font-mono text-[12px] uppercase tracking-[2px] text-ink/70 hover:text-ink transition-colors bg-transparent border border-ink/30 hover:border-ink/70 px-4 py-2 cursor-pointer"
        >
          finish →
        </button>
        <button
          onClick={() => onAdvance([])}
          className="font-mono text-[10px] uppercase tracking-[2px] text-ink/30 hover:text-ink/60 transition-colors bg-transparent border-none cursor-pointer"
        >
          skip for now
        </button>
      </div>
    </StepShell>
  );
}
