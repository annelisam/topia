'use client';

import { useState } from 'react';
import Link from 'next/link';
import LoginButton from '../LoginButton';
import NotificationBell from '../NotificationBell';

const NAV_LINKS = [
  { href: '/worlds', label: 'Worlds' },
  { href: '/events', label: 'Events' },
  { href: '/tv', label: 'TV' },
  { href: '/resources/tools', label: 'Tools' },
  { href: '/resources/grants', label: 'Grants' },
];

const STATIC_LINKS = [
  { href: '/about', label: 'About' },
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
            className="font-mono font-normal text-[10px] tracking-wider uppercase opacity-50 hover:opacity-100 transition-opacity duration-300 bg-transparent border-none cursor-pointer flex items-center gap-2"
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
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 font-mono text-[10px] tracking-wider uppercase transition-all duration-200 no-underline opacity-50 hover:opacity-100"
                    style={{ color: 'var(--page-text)' }}
                  >
                    <span>{link.label}</span>
                  </Link>
                ))}
                <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--nav-border)' }}>
                  {STATIC_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 font-mono text-[10px] tracking-wider uppercase opacity-30 hover:opacity-60 transition-all duration-200 no-underline"
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
