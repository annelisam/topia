'use client';

import { useState } from 'react';
import { ROLES_MAX } from '../../lib/events/questions';

// Searchable role/tag picker — pick up to `max` from a suggestion list, or
// create your own. Shared by the event RSVP form, the edit-profile page, and
// onboarding so the "what do you do" experience is identical everywhere.
export default function RoleTagPicker({
  options,
  value,
  onChange,
  max = ROLES_MAX,
  placeholder,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const atMax = value.length >= max;
  const q = search.trim();
  const ql = q.toLowerCase();
  const filtered = options.filter((o) => o.toLowerCase().includes(ql) && !value.includes(o)).slice(0, 10);
  const exactExists = [...options, ...value].some((o) => o.toLowerCase() === ql);
  const canCreate = q.length > 0 && !exactExists && !atMax;

  const inputCls =
    'w-full px-3 py-2 rounded-lg border font-mono text-[14px] outline-none focus:border-[var(--accent)] transition-colors';
  const fieldStyle: React.CSSProperties = {
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    borderColor: 'var(--border-color)',
  };

  const add = (tag: string) => {
    if (value.includes(tag) || value.length >= max) return;
    onChange([...value, tag]);
    setSearch('');
  };
  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => remove(t)}
              className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[1px] px-2.5 py-1 rounded-md cursor-pointer border-none"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              {t} <span className="opacity-60">×</span>
            </button>
          ))}
        </div>
      )}
      {atMax ? (
        <p className="font-mono text-[11px] opacity-50" style={{ color: 'var(--foreground)' }}>
          Max {max} selected — remove one to change.
        </p>
      ) : (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canCreate) {
              e.preventDefault();
              add(q);
            }
          }}
          placeholder={placeholder ?? `Search or add… (${value.length}/${max})`}
          className={inputCls}
          style={fieldStyle}
        />
      )}
      {/* Empty state: a few quick-add suggestions. Typing filters / lets you create. */}
      {!atMax && q.length === 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {options
            .filter((o) => !value.includes(o))
            .slice(0, 8)
            .map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => add(o)}
                className="font-mono text-[12px] uppercase tracking-[1px] px-2.5 py-1 rounded-md cursor-pointer border hover:opacity-70"
                style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              >
                + {o}
              </button>
            ))}
        </div>
      )}
      {!atMax && q.length > 0 && (filtered.length > 0 || canCreate) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => add(o)}
              className="font-mono text-[12px] uppercase tracking-[1px] px-2.5 py-1 rounded-md cursor-pointer border hover:opacity-70"
              style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
            >
              {o}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onClick={() => add(q)}
              className="font-mono text-[12px] uppercase tracking-[1px] px-2.5 py-1 rounded-md cursor-pointer border border-dashed hover:opacity-70"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'transparent' }}
            >
              + Create “{q}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
