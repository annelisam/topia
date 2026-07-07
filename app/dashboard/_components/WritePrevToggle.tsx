'use client';

export function WritePrevToggle({ preview, setPreview }: { preview: boolean; setPreview: (v: boolean) => void }) {
  const base = 'font-mono text-[11px] uppercase tracking-[1px] px-2 py-0.5 rounded-sm transition-all cursor-pointer border-none';
  const on = 'bg-lime text-obsidian font-bold';
  const off = 'bg-transparent text-ink/35 hover:text-ink';
  return (
    <div className="flex gap-0.5">
      <button type="button" onClick={() => setPreview(false)} className={`${base} ${!preview ? on : off}`}>Write</button>
      <button type="button" onClick={() => setPreview(true)} className={`${base} ${preview ? on : off}`}>Preview</button>
    </div>
  );
}
