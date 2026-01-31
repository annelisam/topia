'use client';

import { useState } from 'react';
import Link from 'next/link';

interface NavigationProps {
  currentPage?: 'home' | 'about' | 'worlds' | 'events' | 'grants' | 'tools' | 'contact' | 'resources';
}

export default function Navigation({ currentPage }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50">
      <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
        <Link href="/" className="font-mono text-[11px] uppercase tracking-tight hover:opacity-70 transition" style={{ color: '#1a1a1a' }}>
          TOPIA
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden sm:flex gap-6 md:gap-8 font-mono text-[11px] uppercase">
          <li>
            <Link
              href="/about"
              className="hover:opacity-70 transition flex items-center gap-1"
              style={{ color: '#1a1a1a' }}
            >
              {currentPage === 'about' && <span>■</span>}
              ABOUT
            </Link>
          </li>
          <li>
            <Link
              href="/worlds"
              className="hover:opacity-70 transition flex items-center gap-1"
              style={{ color: '#1a1a1a' }}
            >
              {currentPage === 'worlds' && <span>■</span>}
              WORLDS
            </Link>
          </li>
          <li>
            <Link
              href="/#events"
              className="hover:opacity-70 transition flex items-center gap-1"
              style={{ color: '#1a1a1a' }}
            >
              {currentPage === 'events' && <span>■</span>}
              EVENTS
            </Link>
          </li>
          <li>
            <Link
              href="/resources/grants"
              className="hover:opacity-70 transition flex items-center gap-1"
              style={{ color: '#1a1a1a' }}
            >
              {currentPage === 'grants' && <span>■</span>}
              GRANTS
            </Link>
          </li>
          <li>
            <Link
              href="/resources/tools"
              className="hover:opacity-70 transition flex items-center gap-1"
              style={{ color: '#1a1a1a' }}
            >
              {currentPage === 'tools' && <span>■</span>}
              TOOLS
            </Link>
          </li>
          <li>
            <a
              href="mailto:contact@topia.vision"
              className="hover:opacity-70 transition flex items-center gap-1"
              style={{ color: '#1a1a1a' }}
            >
              {currentPage === 'contact' && <span>■</span>}
              CONTACT
            </a>
          </li>
        </ul>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden flex flex-col gap-1.5 w-6 h-6 justify-center"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-0.5 w-full transition-transform ${
              mobileMenuOpen ? 'rotate-45 translate-y-2' : ''
            }`}
            style={{ backgroundColor: '#1a1a1a' }}
          ></span>
          <span
            className={`block h-0.5 w-full transition-opacity ${
              mobileMenuOpen ? 'opacity-0' : ''
            }`}
            style={{ backgroundColor: '#1a1a1a' }}
          ></span>
          <span
            className={`block h-0.5 w-full transition-transform ${
              mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
            }`}
            style={{ backgroundColor: '#1a1a1a' }}
          ></span>
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden" style={{ backgroundColor: '#f5f0e8' }}>
          <ul className="container mx-auto px-4 py-4 space-y-3 font-mono text-[11px] uppercase">
            <li>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 hover:opacity-70 transition flex items-center gap-1"
                style={{ color: '#1a1a1a' }}
              >
                {currentPage === 'about' && <span>■</span>}
                ABOUT
              </Link>
            </li>
            <li>
              <Link
                href="/worlds"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 hover:opacity-70 transition flex items-center gap-1"
                style={{ color: '#1a1a1a' }}
              >
                {currentPage === 'worlds' && <span>■</span>}
                WORLDS
              </Link>
            </li>
            <li>
              <Link
                href="/#events"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 hover:opacity-70 transition flex items-center gap-1"
                style={{ color: '#1a1a1a' }}
              >
                {currentPage === 'events' && <span>■</span>}
                EVENTS
              </Link>
            </li>
            <li>
              <Link
                href="/resources/grants"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 hover:opacity-70 transition flex items-center gap-1"
                style={{ color: '#1a1a1a' }}
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
                style={{ color: '#1a1a1a' }}
              >
                {currentPage === 'tools' && <span>■</span>}
                TOOLS
              </Link>
            </li>
            <li>
              <a
                href="mailto:contact@topia.vision"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 hover:opacity-70 transition flex items-center gap-1"
                style={{ color: '#1a1a1a' }}
              >
                {currentPage === 'contact' && <span>■</span>}
                CONTACT
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
