'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on certain pages
  if (pathname === '/waitlist') return null;
  if (pathname.startsWith('/dashboard')) return null;

  return (
    <footer className="topia-footer bg-obsidian text-bone border-t border-bone/[0.06]">
      <div className="max-w-[var(--content-max)] mx-auto px-[var(--page-pad)] py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Brand */}
          <div>
            <div className="font-basement font-black text-sm tracking-[4px] uppercase mb-4">
              TOPIA<span style={{ color: 'var(--accent, #e4fe52)' }}>.</span>
            </div>
            <div className="font-zirkon text-sm text-bone/50 leading-relaxed">
              Culture before tech.<br />
              Depth before data.
            </div>
          </div>

          {/* Connect */}
          <div>
            <div className="font-mono text-[10px] tracking-wider uppercase opacity-40 mb-4">
              Connect
            </div>
            <div className="flex flex-col gap-3">
              <a href="https://www.instagram.com/topia.vision" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">
                Instagram
              </a>
              <a href="https://x.com/TopiaTV" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">
                X / Twitter
              </a>
              <a href="mailto:contact@topia.vision" className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">
                Contact
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <div className="font-mono text-[10px] tracking-wider uppercase opacity-40 mb-4">
              Explore
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/worlds" className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">Worlds</Link>
              <Link href="/events" className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">Events</Link>
              <Link href="/resources/tools" className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">Tools</Link>
              <Link href="/resources/grants" className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">Grants</Link>
              <Link href="/about" className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">About</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t border-bone/[0.06] flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-wider opacity-30">
            &copy; {new Date().getFullYear()} TOPIA. All rights reserved.
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider opacity-30">
            Culture first. Systems second. Ownership always.
          </span>
        </div>
      </div>
    </footer>
  );
}
