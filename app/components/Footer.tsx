'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  // Hide footer on pages with their own full-screen layouts
  if (pathname === '/waitlist') return null;
  if (pathname.startsWith('/dashboard')) return null;

  return (
    <footer className={`${isHome ? 'mt-0' : 'mt-12 sm:mt-20'}`}>
      {/* Tagline Section */}
      <div
        className="rounded-t-[24px] sm:rounded-t-[32px] px-6 sm:px-10 pt-10 sm:pt-16 pb-6 sm:pb-8 relative overflow-hidden"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        {/* Corner decorations */}
        <span className="absolute top-5 left-5 font-mono text-[13px] opacity-20 select-none" style={{ color: 'var(--foreground)' }}>+</span>
        <span className="absolute top-5 right-5 font-mono text-[13px] opacity-20 select-none" style={{ color: 'var(--foreground)' }}>+</span>

        {/* Tagline row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-8 sm:mb-12 mt-8 sm:mt-16">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight"
            style={{ color: 'var(--foreground)', fontFamily: "'Basement Grotesque', var(--font-space-mono), monospace" }}
          >
            CULTURE FIRST.<br />SYSTEMS NEXT.
          </h2>

          {/* Theme dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full" style={{ backgroundColor: 'var(--color-yellow)' }} />
            <span className="w-5 h-5 rounded-full" style={{ backgroundColor: 'var(--foreground)' }} />
            <span className="w-5 h-5 rounded-full" style={{ backgroundColor: 'var(--muted)' }} />
          </div>
        </div>

        {/* Divider with corner marks */}
        <div className="relative">
          <span className="absolute -top-3 left-0 font-mono text-[13px] opacity-20 select-none" style={{ color: 'var(--foreground)' }}>+</span>
          <span className="absolute -top-3 right-0 font-mono text-[13px] opacity-20 select-none" style={{ color: 'var(--foreground)' }}>+</span>
          <div className="border-t" style={{ borderColor: 'var(--border-color)' }} />
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 sm:pt-6">
          <Link
            href="/"
            className="font-mono text-[13px] uppercase tracking-tight hover:opacity-70 transition"
            style={{ color: 'var(--foreground)', fontFamily: "'Basement Grotesque', var(--font-space-mono), monospace" }}
          >
            TOPIA
          </Link>

          <nav className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono text-[11px] sm:text-[12px] uppercase tracking-wide">
            <Link href="/about" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
              About
            </Link>
            <a href="https://www.instagram.com/topia.vision" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
              Instagram
            </a>
            <a href="https://x.com/TopiaTV" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
              X
            </a>
            <a href="mailto:contact@topia.vision" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
              Contact
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
