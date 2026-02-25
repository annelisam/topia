'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <footer className={`py-8 sm:py-12 px-4 sm:px-6 border-t ${isHome ? 'mt-0' : 'mt-12 sm:mt-20'}`} style={{ borderColor: 'var(--foreground)', backgroundColor: 'var(--background)' }}>
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12 mb-6 sm:mb-8">
          {/* TOPIA */}
          <div>
            <h3 className="font-mono text-base sm:text-lg font-bold mb-3 sm:mb-4 uppercase" style={{ color: 'var(--foreground)' }}>TOPIA</h3>
            <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
              Culture before tech. Depth before data.
            </p>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-mono text-[13px] font-bold mb-3 sm:mb-4 uppercase" style={{ color: 'var(--foreground)' }}>CONNECT</h3>
            <ul className="space-y-2 font-mono text-[13px]">
              <li>
                <a href="https://www.instagram.com/topia.vision" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://x.com/TopiaTV" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
                  Twitter
                </a>
              </li>
              <li>
                <a href="mailto:contact@topia.vision" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h3 className="font-mono text-[13px] font-bold mb-3 sm:mb-4 uppercase" style={{ color: 'var(--foreground)' }}>EXPLORE</h3>
            <ul className="space-y-2 font-mono text-[13px]">
              <li><Link href="/about" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>About</Link></li>
              <li><Link href="/worlds" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>Worlds</Link></li>
              <li><Link href="/#events" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>Events</Link></li>
              <li><Link href="/resources/grants" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>Grants</Link></li>
              <li><Link href="/resources/tools" className="hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>Tools</Link></li>
            </ul>
          </div>
        </div>

        <div className="text-center pt-6 sm:pt-8 border-t font-mono text-[13px]" style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)', opacity: 0.4 }}>
          © {new Date().getFullYear()} TOPIA. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
