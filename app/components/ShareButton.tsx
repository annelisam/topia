'use client';

import { useEffect, useState, CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { usePrivy } from '@privy-io/react-auth';
import { ShareIcon } from './ui/Icons';
import { shortenPath } from '@/lib/shortlink';

// Loads only when the share sheet opens.
const ShareModal = dynamic(() => import('./ShareModal'), { ssr: false });

interface ShareButtonProps {
  /** Internal path to share. Defaults to the current pathname. */
  path?: string;
  /** 'event' | 'profile' | 'world' — stored for analytics. */
  kind?: string;
  title?: string;
  text?: string;
  label?: string;       // default 'Share'
  className?: string;
  style?: CSSProperties;
  iconSize?: number;    // default 12
  /** Events: path to the generated story graphic (enables the IG Story option). */
  storyImageUrl?: string;
  storyFilename?: string;
}

const DEFAULT_CLASS =
  'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider border rounded-sm px-2 py-0.5 transition hover:opacity-70 cursor-pointer bg-transparent';

// Share trigger → opens our custom ShareModal (copy link + Email/X/WhatsApp/FB,
// plus IG Story for events). Pre-resolves the short link on mount so the modal
// opens with it ready.
export default function ShareButton({
  path,
  kind,
  title,
  text,
  label = 'Share',
  className,
  style,
  iconSize = 12,
  storyImageUrl,
  storyFilename,
}: ShareButtonProps) {
  const { user } = usePrivy();
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const p = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
    shortenPath(p, kind, user?.id).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [path, kind, user?.id]);

  const handleClick = async () => {
    if (!url) {
      const p = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
      setUrl(await shortenPath(p, kind, user?.id));
    }
    setOpen(true);
  };

  const fallback = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';

  return (
    <>
      <button type="button" onClick={handleClick} title="Share" className={className ?? DEFAULT_CLASS} style={style}>
        <ShareIcon size={iconSize} />
        {label}
      </button>
      <ShareModal
        open={open}
        onClose={() => setOpen(false)}
        url={url ?? fallback}
        title={title}
        text={text}
        storyImageUrl={storyImageUrl}
        storyFilename={storyFilename}
      />
    </>
  );
}
