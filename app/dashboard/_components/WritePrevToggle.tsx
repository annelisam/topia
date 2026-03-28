'use client';

export function WritePrevToggle({ preview, setPreview }: { preview: boolean; setPreview: (v: boolean) => void }) {
  const cls = 'font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded transition-all cursor-pointer';
  return (
    <div className="flex gap-0.5">
      <button type="button" onClick={() => setPreview(false)} className={cls} style={!preview ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' } : { color: 'var(--foreground)', opacity: 0.3 }}>Write</button>
      <button type="button" onClick={() => setPreview(true)} className={cls} style={preview ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' } : { color: 'var(--foreground)', opacity: 0.3 }}>Preview</button>
    </div>
  );
}
