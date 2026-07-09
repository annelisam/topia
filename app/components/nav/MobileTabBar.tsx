'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMessagesBadge } from '../MessagesNavIcon';

const TAB_LINKS = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  // Topia TV intentionally lives in the "More" menu (MobileMenu), not here —
  // the bar stays at four destinations + More so each target stays roomy.
  {
    href: '/events',
    label: 'Events',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: '/messages',
    label: 'Messages',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
];

interface MobileTabBarProps {
  onMenuToggle: () => void;
  onOpenMessages: () => void;
}

// Collapsible bottom nav with a "^ Menu" handle at the bottom edge. Expanded
// by default so first-time visitors can find navigation; the handle remembers
// an explicit collapse (localStorage) across pages. Tapping a tab still tucks
// the bar for the current page so it never blocks content.
const TABBAR_PREF_KEY = 'topia:tabbar';

export default function MobileTabBar({ onMenuToggle, onOpenMessages }: MobileTabBarProps) {
  const [open, setOpen] = useState(false);
  const messagesBadge = useMessagesBadge();
  const pathname = usePathname();

  // Slide up on mount unless the user explicitly collapsed it before.
  // (Runs post-hydration — useState can't read localStorage during SSR.)
  useEffect(() => {
    try {
      if (localStorage.getItem(TABBAR_PREF_KEY) !== 'collapsed') setOpen(true);
    } catch {}
  }, []);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      try { localStorage.setItem(TABBAR_PREF_KEY, next ? 'open' : 'collapsed'); } catch {}
      return next;
    });
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' || pathname === '/home' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-[1000] md:hidden transition-transform duration-300 ease-out"
      style={{ transform: open ? 'translateY(0)' : 'translateY(var(--nav-height))' }}
    >
      {/* Pull handle — always visible. The wrapper is click-through so the area
          around the pill never blocks the content behind it. */}
      <div className="flex justify-center pointer-events-none">
        <button
          onClick={toggle}
          aria-label={open ? 'Hide menu' : 'Show menu'}
          className="pointer-events-auto flex items-center justify-center gap-1.5 px-5 py-2 min-h-[44px] rounded-t-xl backdrop-blur-xl cursor-pointer border-t border-l border-r"
          style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)', color: 'var(--page-text)' }}
        >
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="transition-transform duration-300"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
          <span className="font-mono text-[11px] uppercase tracking-wider">Menu</span>
        </button>
      </div>

      {/* The tab bar — slides off-screen when collapsed */}
      <div className="backdrop-blur-xl" style={{ backgroundColor: 'var(--nav-bg)', borderTop: '1px solid var(--nav-border)' }}>
        <div className="flex items-center justify-around h-[var(--nav-height)] px-2">
          {TAB_LINKS.map((link) => {
            const isMessages = link.href === '/messages';
            const inner = (
              <>
                <span className="relative">
                  {link.icon}
                  {isMessages && messagesBadge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold" style={{ backgroundColor: 'var(--accent, #e4fe52)', color: '#1a1a1a' }}>
                      {messagesBadge > 9 ? '9+' : messagesBadge}
                    </span>
                  )}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider">{link.label}</span>
              </>
            );
            const cls = 'flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] transition-colors duration-200 no-underline';
            // Messages opens the slide-up modal instead of navigating.
            return isMessages ? (
              <button
                key={link.href}
                onClick={() => { setOpen(false); onOpenMessages(); }}
                className={`${cls} bg-transparent border-none cursor-pointer`}
                style={{ color: 'var(--page-text)', opacity: 0.4 }}
              >
                {inner}
              </button>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cls}
                style={{ color: isActive(link.href) ? 'var(--accent-ink)' : 'var(--page-text)', opacity: isActive(link.href) ? 1 : 0.4 }}
              >
                {inner}
              </Link>
            );
          })}

          {/* Full menu (Resources, About, etc.) */}
          <button
            onClick={() => { setOpen(false); onMenuToggle(); }}
            className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none cursor-pointer transition-colors duration-200"
            style={{ color: 'var(--page-text)', opacity: 0.4 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="font-mono text-[11px] uppercase tracking-wider">More</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
