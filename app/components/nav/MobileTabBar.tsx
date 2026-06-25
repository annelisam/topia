'use client';

import Link from 'next/link';
import { useState } from 'react';

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
  {
    href: '/tv',
    label: 'Topia TV',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="13" rx="2" ry="2" />
        <polyline points="17 2 12 7 7 2" />
      </svg>
    ),
  },
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
}

// Collapsible bottom nav: hidden by default, leaving just a "^ Menu" handle
// peeking at the bottom edge. Tapping the handle slides the tab bar up; tapping
// a tab (or navigating) tucks it away again so it never blocks content.
export default function MobileTabBar({ onMenuToggle }: MobileTabBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-[1000] md:hidden transition-transform duration-300 ease-out"
      style={{ transform: open ? 'translateY(0)' : 'translateY(var(--nav-height))' }}
    >
      {/* Pull handle — always visible. The wrapper is click-through so the area
          around the pill never blocks the content behind it. */}
      <div className="flex justify-center pointer-events-none">
        <button
          onClick={() => setOpen((o) => !o)}
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
          {TAB_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] transition-colors duration-200 no-underline"
              style={{ color: 'var(--page-text)', opacity: 0.4 }}
            >
              {link.icon}
              <span className="font-mono text-[11px] uppercase tracking-wider">{link.label}</span>
            </Link>
          ))}

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
