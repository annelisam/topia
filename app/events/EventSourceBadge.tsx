'use client';

/**
 * Tiny platform badge for events imported from external sources.
 * Renders nothing for null / manual / unknown sources.
 */
export default function EventSourceBadge({
  source,
  size = 'sm',
}: {
  source: string | null | undefined;
  size?: 'xs' | 'sm';
}) {
  if (!source || source === 'other') return null;

  const config: Record<string, { label: string; color: string }> = {
    partiful: { label: 'PARTIFUL', color: '#FF5BD7' },
    luma:     { label: 'LUMA',     color: '#4F46FF' },
    posh:     { label: 'POSH',     color: '#00FF88' },
  };
  const cfg = config[source];
  if (!cfg) return null;

  const sizes = {
    xs: { padding: 'px-1 py-0.5', text: 'text-[8px]', dot: 'w-1 h-1' },
    sm: { padding: 'px-1.5 py-0.5', text: 'text-[9px]', dot: 'w-1.5 h-1.5' },
  };
  const s = sizes[size];

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono ${s.text} uppercase tracking-[2px] border ${s.padding} rounded-sm shrink-0`}
      style={{ borderColor: `${cfg.color}40`, color: cfg.color }}
      title={`Imported from ${cfg.label}`}
    >
      <span className={`${s.dot} rounded-full`} style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
}
