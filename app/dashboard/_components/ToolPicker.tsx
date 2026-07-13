'use client';

import { inputCls } from './sharedStyles';
import { ToolOption } from './types';
import { faviconUrl } from '../../resources/tools/favicon';

/**
 * Tools are stored as display names (comma-joined on worlds, `tool:` tags on
 * projects); legacy rows may differ from the directory in case or punctuation
 * ("ableton", "Max/MSP"). Compare on lowercase alphanumerics so variants count
 * as the same tool — the same rule the public world page uses to link tools
 * to /resources/tools/[slug].
 */
export const normalizeToolName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function ToolPicker({ allTools, selected, onToggle, search, setSearch }: {
  allTools: ToolOption[];
  selected: string[];
  onToggle: (name: string) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const matches = (name: string, t: ToolOption) => {
    const n = normalizeToolName(name);
    return n === normalizeToolName(t.name) || n === normalizeToolName(t.slug);
  };
  const isSelected = (t: ToolOption) => selected.some((s) => matches(s, t));
  const inDirectory = (name: string) => allTools.some((t) => matches(name, t));

  const q = normalizeToolName(search);
  const filtered = allTools.filter(
    (t) => !q || normalizeToolName(t.name).includes(q) || (t.category ? normalizeToolName(t.category).includes(q) : false),
  );

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(name => inDirectory(name) ? (
            <button key={name} type="button" onClick={() => onToggle(name)} className="flex items-center gap-1 px-2 py-0.5 bg-lime text-obsidian font-mono text-[11px] rounded-sm transition hover:opacity-80 cursor-pointer border border-lime">
              {name}<span className="text-[12px] opacity-60 ml-0.5">×</span>
            </button>
          ) : (
            // Legacy free-text entry with no directory match — kept, but shown
            // muted/dashed since it won't link anywhere on the public page.
            <button key={name} type="button" onClick={() => onToggle(name)} title="Not in the tools directory — won't link on your world page" className="flex items-center gap-1 px-2 py-0.5 bg-transparent text-ink/50 font-mono text-[11px] rounded-sm transition hover:opacity-80 cursor-pointer border border-dashed border-ink/30">
              {name}<span className="text-[12px] opacity-60 ml-0.5">×</span>
            </button>
          ))}
        </div>
      )}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..." className={inputCls + ' mb-1.5'} />
      <div className="border border-ink/10 rounded-sm max-h-44 overflow-y-auto bg-ink/[0.02]">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 font-mono text-[11px] text-ink/30">No tools found</p>
        ) : filtered.map(t => {
          const fav = faviconUrl(t.url ?? null, 32);
          return (
            <label key={t.id} className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-ink/[0.04] transition border-b border-ink/[0.05] last:border-b-0">
              <input type="checkbox" checked={isSelected(t)} onChange={() => onToggle(t.name)} className="w-3 h-3 shrink-0" style={{ accentColor: 'var(--accent-ink)' }} />
              <span className="w-5 h-5 shrink-0 rounded-sm border border-ink/10 bg-ink/[0.04] overflow-hidden flex items-center justify-center">
                {fav ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={fav} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="font-mono text-[9px] text-ink/40">{t.name[0]?.toUpperCase()}</span>
                )}
              </span>
              <span className="font-mono text-[12px] text-ink truncate">{t.name}</span>
              {t.category && <span className="font-mono text-[10px] text-ink/35 truncate ml-auto shrink-0">{t.category}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}
