'use client';

import { useState } from 'react';
import Link from 'next/link';

interface NavigationProps {
  currentPage?: 'home' | 'about' | 'resources';
}

export default function Navigation({ currentPage }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 border-b border-yellow/20 bg-near-black/90 backdrop-blur-sm">
      <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
        <Link href="/" className="text-xl sm:text-2xl font-bold tracking-tight text-yellow hover:text-yellow/80 transition">
          TOPIA
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden sm:flex gap-6 md:gap-8 text-sm uppercase">
          <li>
            <Link
              href="/"
              className={`hover:text-green transition ${currentPage === 'home' ? 'text-green underline' : 'text-off-white'}`}
            >
              HOME
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              className={`hover:text-blue transition ${currentPage === 'about' ? 'text-blue underline' : 'text-off-white'}`}
            >
              ABOUT
            </Link>
          </li>
          <li>
            <Link href="/#explore" className="text-off-white hover:text-pink transition">
              EXPLORE
            </Link>
          </li>
          <li>
            <Link
              href="/resources"
              className={`hover:text-orange transition ${currentPage === 'resources' ? 'text-orange underline' : 'text-off-white'}`}
            >
              RESOURCES
            </Link>
          </li>
          <li>
            <Link href="/#contact" className="text-off-white hover:text-yellow transition">
              CONTACT
            </Link>
          </li>
        </ul>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden flex flex-col gap-1.5 w-6 h-6 justify-center"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-0.5 w-full bg-yellow transition-transform ${
              mobileMenuOpen ? 'rotate-45 translate-y-2' : ''
            }`}
          ></span>
          <span
            className={`block h-0.5 w-full bg-yellow transition-opacity ${
              mobileMenuOpen ? 'opacity-0' : ''
            }`}
          ></span>
          <span
            className={`block h-0.5 w-full bg-yellow transition-transform ${
              mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
            }`}
          ></span>
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-yellow/20 bg-near-black/95 backdrop-blur-sm">
          <ul className="container mx-auto px-4 py-4 space-y-3 text-sm uppercase">
            <li>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 hover:text-green transition ${currentPage === 'home' ? 'text-green underline' : 'text-off-white'}`}
              >
                HOME
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 hover:text-blue transition ${currentPage === 'about' ? 'text-blue underline' : 'text-off-white'}`}
              >
                ABOUT
              </Link>
            </li>
            <li>
              <Link
                href="/#explore"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-off-white hover:text-pink transition"
              >
                EXPLORE
              </Link>
            </li>
            <li>
              <Link
                href="/resources"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 hover:text-orange transition ${currentPage === 'resources' ? 'text-orange underline' : 'text-off-white'}`}
              >
                RESOURCES
              </Link>
            </li>
            <li>
              <Link
                href="/#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-off-white hover:text-yellow transition"
              >
                CONTACT
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
