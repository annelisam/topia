'use client';

import { useState } from 'react';
import Link from 'next/link';
import LoginButton from '../LoginButton';
import NotificationBell from '../NotificationBell';

type NavItem = {
  label: string;
  href?: string;
  comingSoon?: boolean;
  children?: { href: string; label: string }[];
};

const NAV_LINKS: NavItem[] = [
  { href: '#', label: 'Passport', comingSoon: true },
  { href: '/tv', label: 'Topia TV' },
  { href: '/events', label: 'Events' },
  {
    label: 'Resources',
    children: [
      { href: '/resources/tools', label: 'Tools' },
      { href: '/resources/grants', label: 'Grants' },
    ],
  },
  { href: '#', label: 'Builder', comingSoon: true },
  { href: '#', label: 'Catalysts', comingSoon: true },
];

const STATIC_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 w-full h-[var(--nav-height)] backdrop-blur-xl z-[1000] border-b hidden md:flex items-center justify-between px-[var(--page-pad)]"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--nav-border)',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="font-basement font-black text-sm tracking-[4px] uppercase no-underline"
        style={{ color: 'var(--page-text)' }}
      >
        TOPIA<span style={{ color: 'var(--accent, #e4fe52)' }}>.</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Menu dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="font-mono font-normal text-[13px] tracking-wider uppercase opacity-50 hover:opacity-100 transition-opacity duration-300 bg-transparent border-none cursor-pointer flex items-center gap-2"
            style={{ color: 'var(--page-text)' }}
          >
            Menu{' '}
            <span
              className={`transition-transform duration-200 inline-block ${menuOpen ? 'rotate-180' : ''}`}
            >
              ▾
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[998]" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute top-full right-0 mt-2 backdrop-blur-xl rounded-lg py-2 min-w-[200px] z-[999]"
                style={{
                  backgroundColor: 'var(--nav-bg)',
                  border: '1px solid var(--nav-border)',
                }}
              >
                {NAV_LINKS.map((item) =>
                  item.children ? (
                    <div key={item.label} className="mt-1">
                      <div
                        className="px-4 pt-3 pb-1 font-mono text-[11px] tracking-[2px] uppercase opacity-30"
                        style={{ color: 'var(--page-text)' }}
                      >
                        {item.label}
                      </div>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMenuOpen(false)}
                          className="block pl-7 pr-4 py-2.5 font-mono text-[13px] tracking-wider uppercase transition-all duration-200 no-underline opacity-50 hover:opacity-100"
                          style={{ color: 'var(--page-text)' }}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : item.comingSoon ? (
                    <div
                      key={item.label}
                      className="flex items-center justify-between px-4 py-3 font-mono text-[13px] tracking-wider uppercase opacity-30 cursor-default"
                      style={{ color: 'var(--page-text)' }}
                    >
                      <span>{item.label}</span>
                      <span className="text-[9px] tracking-[1px] opacity-70">Soon</span>
                    </div>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href!}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 font-mono text-[13px] tracking-wider uppercase transition-all duration-200 no-underline opacity-50 hover:opacity-100"
                      style={{ color: 'var(--page-text)' }}
                    >
                      <span>{item.label}</span>
                    </Link>
                  )
                )}
                <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--nav-border)' }}>
                  {STATIC_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 font-mono text-[13px] tracking-wider uppercase opacity-30 hover:opacity-60 transition-all duration-200 no-underline"
                      style={{ color: 'var(--page-text)' }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <NotificationBell />
        <LoginButton />
      </div>
    </nav>
  );
}
