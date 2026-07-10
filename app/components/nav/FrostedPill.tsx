'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMessagesBadge } from '../MessagesNavIcon';
import { useUserProfile } from '../../hooks/useUserProfile';
import TopiaMark from './TopiaMark';

interface FrostedPillProps {
  onMenuToggle: () => void;
  onOpenMessages: () => void;
}

// The mobile nav: a detached frosted-glass pill floating above the bottom
// edge, content scrolling behind it. Always visible — no collapse gesture.
// The active tab sits in a soft circle; unread state is a brand-orange dot
// (the pill has no labels, so dots do the talking). The avatar slot opens
// the full takeover menu (profile, TV, resources, theme, auth).
export default function FrostedPill({ onMenuToggle, onOpenMessages }: FrostedPillProps) {
  const pathname = usePathname();
  const messagesBadge = useMessagesBadge();
  const { profile, authenticated } = useUserProfile();

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/' || pathname === '/home'
      : pathname === href || pathname.startsWith(`${href}/`);

  const itemCls =
    'relative flex items-center justify-center w-[46px] h-[46px] rounded-full no-underline bg-transparent border-none cursor-pointer transition-[background-color,opacity] duration-200';
  const itemStyle = (on: boolean): React.CSSProperties => ({
    color: 'var(--page-text)',
    opacity: on ? 1 : 0.6,
    backgroundColor: on ? 'color-mix(in srgb, var(--page-text) 13%, transparent)' : 'transparent',
  });
  const dot = (
    <span
      className="absolute top-[7px] right-[7px] w-[7px] h-[7px] rounded-full"
      style={{ backgroundColor: '#FF5C34', border: '1.5px solid var(--page-bg)' }}
    />
  );

  const initial = (profile?.name || profile?.username || '?')[0]?.toUpperCase() ?? '?';

  return (
    <nav
      aria-label="Primary"
      className="fixed left-0 right-0 z-[1000] md:hidden flex justify-center pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div
        className="pointer-events-auto flex items-center gap-0.5 rounded-full border p-1.5 backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--page-bg) 72%, transparent)',
          borderColor: 'var(--nav-border)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
        }}
      >
        <Link href="/" aria-label="Home" aria-current={isActive('/') ? 'page' : undefined} className={itemCls} style={itemStyle(isActive('/'))}>
          <TopiaMark width={26} />
        </Link>

        <Link href="/events" aria-label="Events" aria-current={isActive('/events') ? 'page' : undefined} className={itemCls} style={itemStyle(isActive('/events'))}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </Link>

        <button onClick={onOpenMessages} aria-label={messagesBadge > 0 ? `Messages, ${messagesBadge} unread` : 'Messages'} className={itemCls} style={itemStyle(false)}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          {messagesBadge > 0 && dot}
        </button>

        <Link href="/search" aria-label="Search" aria-current={isActive('/search') ? 'page' : undefined} className={itemCls} style={itemStyle(isActive('/search'))}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Link>

        <button onClick={onMenuToggle} aria-label="Menu" className={itemCls} style={itemStyle(false)}>
          {authenticated && profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="w-[26px] h-[26px] rounded-full object-cover" />
          ) : authenticated ? (
            <span
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center font-mono text-[11px] font-bold"
              style={{ backgroundColor: 'var(--page-text)', color: 'var(--page-bg)' }}
            >
              {initial}
            </span>
          ) : (
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>
    </nav>
  );
}
