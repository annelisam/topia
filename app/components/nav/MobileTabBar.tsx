'use client';

import Link from 'next/link';

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
    href: '/worlds',
    label: 'Worlds',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
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

export default function MobileTabBar({ onMenuToggle }: MobileTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 w-full backdrop-blur-xl z-[1000] md:hidden"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderTop: '1px solid var(--nav-border)',
      }}
    >
      <div className="flex items-center justify-around h-[var(--nav-height)] px-2">
        {TAB_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] transition-colors duration-200 no-underline"
            style={{ color: 'var(--page-text)', opacity: 0.4 }}
          >
            {link.icon}
            <span className="font-mono text-[8px] uppercase tracking-wider">
              {link.label}
            </span>
          </Link>
        ))}

        {/* Menu button */}
        <button
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none cursor-pointer transition-colors duration-200"
          style={{ color: 'var(--page-text)', opacity: 0.4 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span className="font-mono text-[8px] uppercase tracking-wider">Menu</span>
        </button>
      </div>
    </nav>
  );
}
