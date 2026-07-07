'use client';

import { inputCls } from './sharedStyles';
import { ToolOption } from './types';

export function ToolPicker({ allTools, selected, onToggle, search, setSearch }: {
  allTools: ToolOption[];
  selected: string[];
  onToggle: (name: string) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const filtered = allTools.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(name => (
            <button key={name} type="button" onClick={() => onToggle(name)} className="flex items-center gap-1 px-2 py-0.5 bg-lime text-obsidian font-mono text-[11px] rounded-sm transition hover:opacity-80 cursor-pointer border border-lime">
              {name}<span className="text-[12px] opacity-60 ml-0.5">×</span>
            </button>
          ))}
        </div>
      )}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..." className={inputCls + ' mb-1.5'} />
      <div className="border border-ink/10 rounded-sm max-h-36 overflow-y-auto bg-ink/[0.02]">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 font-mono text-[11px] text-ink/30">No tools found</p>
        ) : filtered.map(t => (
          <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-ink/[0.04] transition border-b border-ink/[0.05] last:border-b-0">
            <input type="checkbox" checked={selected.includes(t.name)} onChange={() => onToggle(t.name)} className="w-3 h-3" style={{ accentColor: 'var(--accent-ink)' }} />
            <span className="font-mono text-[12px] text-ink">{t.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
