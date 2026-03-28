'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import LoginButton from './LoginButton';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

interface NavigationProps {
  currentPage?: 'home' | 'about' | 'worlds' | 'events' | 'grants' | 'tools' | 'contact' | 'resources';
}

export default function Navigation({ currentPage }: NavigationProps) {
  const [showNav, setShowNav] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const linksRef = useRef<HTMLDivElement>(null);
  const [linksWidth, setLinksWidth] = useState(0);

  // Measure nav links width for smooth animation
  useEffect(() => {
    if (linksRef.current) {
      linksRef.current.style.width = 'auto';
      linksRef.current.style.position = 'absolute';
      linksRef.current.style.visibility = 'hidden';
      setLinksWidth(linksRef.current.scrollWidth);
      linksRef.current.style.position = '';
      linksRef.current.style.visibility = '';
      linksRef.current.style.width = '0px';
    }
  }, []);

  const navLinks = [
    { href: '/worlds', label: 'WORLDS', key: 'worlds' as const },
    { href: '/events', label: 'EVENTS', key: 'events' as const },
    { href: '/resources/grants', label: 'GRANTS', key: 'grants' as const },
    { href: '/resources/tools', label: 'TOOLS', key: 'tools' as const },
  ];

  return (
    <header
      className="fixed top-0 w-full z-[600]"
      style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--background) 90%, transparent) 0%, color-mix(in srgb, var(--background) 60%, transparent) 40%, color-mix(in srgb, var(--background) 25%, transparent) 70%, transparent 100%)' }}
    >
      <nav className="px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
        {/* Left: TOPIA + toggle + nav links */}
        <div className="flex items-center">
          {/* TOPIA logo — always visible */}
          <Link
            href="/"
            className="font-mono text-[13px] uppercase tracking-tight hover:opacity-70 transition"
            style={{ color: 'var(--foreground)' }}
          >
            TOPIA
          </Link>

          {/* + / × toggle button */}
          <button
            onClick={() => setShowNav(!showNav)}
            className="font-mono text-[13px] leading-none ml-4 hover:opacity-70 transition-transform duration-300"
            style={{ color: 'var(--foreground)', transform: showNav ? 'rotate(45deg)' : 'rotate(0deg)' }}
            aria-label={showNav ? 'Hide navigation' : 'Show navigation'}
          >
            +
          </button>

          {/* Desktop nav links — slide in/out */}
          <div
            ref={linksRef}
            className="hidden sm:block overflow-hidden whitespace-nowrap"
            style={{
              width: showNav ? `${linksWidth}px` : '0px',
              opacity: showNav ? 1 : 0,
              transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease',
            }}
          >
            <ul className="flex gap-6 md:gap-8 font-mono text-[13px] uppercase ml-6">
              {navLinks.map(link => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="hover:opacity-70 transition flex items-center gap-1"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {currentPage === link.key && <span>■</span>}
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: utilities */}
        <div className="flex items-center gap-4 sm:gap-6">
          <NotificationBell />
          <ThemeToggle />
          <LoginButton />
        </div>
      </nav>

      {/* Mobile Menu — toggled by + button */}
      <div
        className="sm:hidden overflow-hidden"
        style={{
          maxHeight: showNav ? '300px' : '0px',
          opacity: showNav ? 1 : 0,
          transition: 'max-height 400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease',
          backgroundColor: 'var(--background)',
        }}
      >
        <ul className="container mx-auto px-4 py-4 space-y-3 font-mono text-[13px] uppercase">
          {navLinks.map(link => (
            <li key={link.key}>
              <Link
                href={link.href}
                onClick={() => setShowNav(false)}
                className="block py-2 hover:opacity-70 transition flex items-center gap-1"
                style={{ color: 'var(--foreground)' }}
              >
                {currentPage === link.key && <span>■</span>}
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
