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
            <button key={name} type="button" onClick={() => onToggle(name)} className="flex items-center gap-1 px-2 py-0.5 border font-mono text-[11px] rounded-lg transition hover:opacity-70" style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}>
              {name}<span className="text-[9px] opacity-40 ml-0.5">×</span>
            </button>
          ))}
        </div>
      )}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..." className={inputCls + ' mb-1.5'} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
      <div className="border rounded-lg max-h-36 overflow-y-auto" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
        {filtered.length === 0 ? (
          <p className="px-3 py-2 font-mono text-[11px] opacity-30" style={{ color: 'var(--foreground)' }}>No tools found</p>
        ) : filtered.map(t => (
          <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:opacity-70 transition border-b last:border-b-0" style={{ borderColor: 'var(--border-color)' }}>
            <input type="checkbox" checked={selected.includes(t.name)} onChange={() => onToggle(t.name)} className="w-3 h-3" style={{ accentColor: 'var(--foreground)' }} />
            <span className="font-mono text-[12px]" style={{ color: 'var(--foreground)' }}>{t.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
