'use client';

import Link from 'next/link';
import { faviconUrl } from './favicon';

export interface ToolMiniData {
  slug: string;
  name: string;
  category?: string | null;
  url?: string | null;
}

interface Props {
  tool: ToolMiniData;
  /** When provided, the card becomes a <button> that opens the modal first.
   *  When omitted, it falls back to a <Link> directly to the full page —
   *  useful for static SSR contexts that can't host modal state. */
  onOpen?: (slug: string) => void;
  /** Size preset. "xs" is a compact two-line row (32px favicon); "sm" is
   *  the standard widget card (40px favicon). Default "sm". */
  size?: 'xs' | 'sm';
  className?: string;
}

/**
 * The canonical tiny tool card used outside `/resources/tools` itself —
 * dashboard widgets, profile toolkit, etc. Renders just favicon + name +
 * (optional) category. Clicking opens the ToolModal in the host surface
 * (which is responsible for tracking modalSlug state and rendering
 * <ToolModal slug={modalSlug} onClose={...} />).
 */
export default function ToolMiniCard({ tool, onOpen, size = 'sm', className = '' }: Props) {
  const fav = faviconUrl(tool.url ?? null, size === 'xs' ? 32 : 64);
  const iconBox = size === 'xs' ? 'w-7 h-7' : 'w-9 h-9';
  const nameSize = size === 'xs' ? 'text-[11px]' : 'text-[12px]';
  const catSize = size === 'xs' ? 'text-[9px]' : 'text-[10px]';
  const pad = size === 'xs' ? 'px-2.5 py-1.5' : 'px-3 py-2';

  const inner = (
    <>
      <span className={`${iconBox} shrink-0 rounded-sm border border-bone/10 bg-bone/[0.04] overflow-hidden flex items-center justify-center`}>
        {fav ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={fav} alt="" className="w-full h-full object-contain" />
        ) : (
          <span className="font-basement text-[11px] text-bone/30">{tool.name[0]?.toUpperCase()}</span>
        )}
      </span>
      <div className="min-w-0 flex-1 text-left">
        <div className={`font-mono ${nameSize} uppercase font-bold text-bone truncate`}>{tool.name}</div>
        {tool.category && <div className={`font-mono ${catSize} text-bone/30 truncate`}>{tool.category}</div>}
      </div>
    </>
  );

  const wrapperCls = `flex items-center gap-3 border border-bone/10 hover:border-lime/40 hover:bg-bone/[0.03] rounded-sm ${pad} transition no-underline ${className}`;

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(tool.slug)}
        className={`${wrapperCls} text-left bg-transparent cursor-pointer w-full`}
        title={tool.category ?? tool.name}
      >
        {inner}
      </button>
    );
  }
  return (
    <Link
      href={`/resources/tools/${tool.slug}`}
      className={wrapperCls}
      title={tool.category ?? tool.name}
    >
      {inner}
    </Link>
  );
}
