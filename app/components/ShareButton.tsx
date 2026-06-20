'use client';

import { useEffect, useState, CSSProperties } from 'react';
import { ShareIcon } from './ui/Icons';
import { shortenPath } from '@/lib/shortlink';

interface ShareButtonProps {
  /** Internal path to share. Defaults to the current pathname. */
  path?: string;
  /** 'event' | 'profile' | 'world' — stored for analytics. */
  kind?: string;
  /** Native-share sheet metadata. */
  title?: string;
  text?: string;
  label?: string;       // default 'Share'
  copiedLabel?: string; // default 'Copied'
  className?: string;
  style?: CSSProperties;
  iconSize?: number;    // default 12
}

const DEFAULT_CLASS =
  'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider border rounded-sm px-2 py-0.5 transition hover:opacity-70 cursor-pointer bg-transparent';

// Reusable share control. Pre-resolves the short link on mount so the click
// handler can call navigator.share() synchronously (iOS Safari invalidates the
// share gesture if an await/fetch happens first). Falls back to copying the
// link to the clipboard where the native sheet isn't available.
export default function ShareButton({
  path,
  kind,
  title,
  text,
  label = 'Share',
  copiedLabel = 'Copied',
  className,
  style,
  iconSize = 12,
}: ShareButtonProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    const p = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
    shortenPath(p, kind).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [path, kind]);

  const handleShare = async () => {
    const p = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
    const finalUrl = url ?? (await shortenPath(p, kind));
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text, url: finalUrl });
        return;
      }
    } catch {
      return; // user dismissed the native sheet
    }
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  return (
    <button type="button" onClick={handleShare} title="Share" className={className ?? DEFAULT_CLASS} style={style}>
      <ShareIcon size={iconSize} />
      {copied ? copiedLabel : label}
    </button>
  );
}
