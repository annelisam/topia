'use client';

import { useState } from 'react';
import Link from 'next/link';
import LoginButton from './LoginButton';
import ThemeToggle from './ThemeToggle';

interface NavigationProps {
  currentPage?: 'home' | 'about' | 'worlds' | 'events' | 'grants' | 'tools' | 'contact' | 'resources';
}

export default function Navigation({ currentPage }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className="fixed top-0 w-full z-[60]"
      style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--background) 90%, transparent) 0%, color-mix(in srgb, var(--background) 60%, transparent) 40%, color-mix(in srgb, var(--background) 25%, transparent) 70%, transparent 100%)' }}
    >
      <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
        <Link href="/" className="font-mono text-[13px] uppercase tracking-tight hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
          TOPIA
        </Link>

        {/* Desktop Navigation + Login */}
        <div className="hidden sm:flex items-center gap-6 md:gap-8">
        <ul className="flex gap-6 md:gap-8 font-mono text-[13px] uppercase">
          <li>
            <Link
              href="/worlds"
              className="hover:opacity-70 transition flex items-center gap-1"
              style={{ color: 'var(--foreground)' }}
            >
              {currentPage === 'worlds' && <span>■</span>}
              WORLDS
            </Link>
          </li>
          <li>
            <Link
              href="/resources/grants"
              className="hover:opacity-70 transition flex items-center gap-1"
              style={{ color: 'var(--foreground)' }}
            >
              {currentPage === 'grants' && <span>■</span>}
              GRANTS
            </Link>
          </li>
          <li>
            <Link
              href="/resources/tools"
              className="hover:opacity-70 transition flex items-center gap-1"
              style={{ color: 'var(--foreground)' }}
            >
              {currentPage === 'tools' && <span>■</span>}
              TOOLS
            </Link>
          </li>
        </ul>
          <ThemeToggle />
          <LoginButton />
        </div>

        {/* Mobile: Login + Hamburger */}
        <div className="sm:hidden flex items-center gap-3">
          <ThemeToggle />
          <LoginButton />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex flex-col gap-1.5 w-6 h-6 justify-center"
            aria-label="Toggle menu"
          >
          <span
            className={`block h-0.5 w-full transition-transform ${
              mobileMenuOpen ? 'rotate-45 translate-y-2' : ''
            }`}
            style={{ backgroundColor: 'var(--foreground)' }}
          ></span>
          <span
            className={`block h-0.5 w-full transition-opacity ${
              mobileMenuOpen ? 'opacity-0' : ''
            }`}
            style={{ backgroundColor: 'var(--foreground)' }}
          ></span>
          <span
            className={`block h-0.5 w-full transition-transform ${
              mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
            }`}
            style={{ backgroundColor: 'var(--foreground)' }}
          ></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden" style={{ backgroundColor: 'var(--background)' }}>
          <ul className="container mx-auto px-4 py-4 space-y-3 font-mono text-[13px] uppercase">
            <li>
              <Link
                href="/worlds"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 hover:opacity-70 transition flex items-center gap-1"
                style={{ color: 'var(--foreground)' }}
              >
                {currentPage === 'worlds' && <span>■</span>}
                WORLDS
              </Link>
            </li>
            <li>
              <Link
                href="/resources/grants"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 hover:opacity-70 transition flex items-center gap-1"
                style={{ color: 'var(--foreground)' }}
              >
                {currentPage === 'grants' && <span>■</span>}
                GRANTS
              </Link>
            </li>
            <li>
              <Link
                href="/resources/tools"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 hover:opacity-70 transition flex items-center gap-1"
                style={{ color: 'var(--foreground)' }}
              >
                {currentPage === 'tools' && <span>■</span>}
                TOOLS
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
