'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

// Shared footer-nav atoms — keep the link + coming-soon styling consistent
// with the main menu nav.
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">
      {children}
    </Link>
  );
}

function FooterSoon({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs text-bone/30 flex items-center gap-2 cursor-default">
      {children}
      <span className="text-[9px] tracking-[1px] uppercase opacity-70">Soon</span>
    </span>
  );
}

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on certain pages
  if (pathname === '/waitlist') return null;
  if (pathname.startsWith('/dashboard')) return null;

  return (
    <footer className="topia-footer bg-obsidian text-bone border-t border-bone/[0.06]">
      <div className="max-w-[var(--content-max)] mx-auto px-[var(--page-pad)] py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-basement font-black text-sm tracking-[4px] uppercase mb-4">
              TOPIA<span style={{ color: 'var(--accent, #e4fe52)' }}>.</span>
            </div>
            <div className="font-zirkon text-sm text-bone/50 leading-relaxed">
              Culture before tech.<br />
              Depth before data.
            </div>
          </div>

          {/* Explore — mirrors the main menu order, coming-soon items tagged */}
          <div>
            <div className="font-mono text-[13px] tracking-wider uppercase opacity-40 mb-4">
              Explore
            </div>
            <div className="flex flex-col gap-3">
              <FooterLink href="/onboarding">Onboarding</FooterLink>
              <FooterSoon>Passport</FooterSoon>
              <FooterLink href="/tv">Topia TV</FooterLink>
              <FooterLink href="/events">Events</FooterLink>
              <FooterSoon>Tiers</FooterSoon>
              <FooterSoon>Builder</FooterSoon>
              <FooterSoon>Catalysts</FooterSoon>
            </div>
          </div>

          {/* Resources — its own category, nesting Tools + Grants (matches menu) */}
          <div>
            <div className="font-mono text-[13px] tracking-wider uppercase opacity-40 mb-4">
              Resources
            </div>
            <div className="flex flex-col gap-3">
              <FooterLink href="/resources/tools">Tools</FooterLink>
              <FooterLink href="/resources/grants">Grants</FooterLink>
            </div>
          </div>

          {/* Connect */}
          <div>
            <div className="font-mono text-[13px] tracking-wider uppercase opacity-40 mb-4">
              Connect
            </div>
            <div className="flex flex-col gap-3">
              <FooterLink href="/about">About</FooterLink>
              <a href="mailto:contact@topia.vision" className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">Contact</a>
              <a href="https://www.instagram.com/topia.vision" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">Instagram</a>
              <a href="https://x.com/TopiaTV" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-bone/50 hover:text-lime transition-colors no-underline">X / Twitter</a>
            </div>
          </div>
        </div>

        {/* Appearance control — light/dark, moved here from the floating
            corner widget. */}
        <div className="mt-16 pt-6 border-t border-bone/[0.06] flex items-center gap-6">
          <span className="font-mono text-[11px] uppercase tracking-[2px] opacity-30">Appearance</span>
          <ThemeToggle embedded />
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-bone/[0.06] flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-mono text-[13px] uppercase tracking-wider opacity-30">
            &copy; {new Date().getFullYear()} TOPIA. All rights reserved.
          </span>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <FooterLink href="/legal/terms">Terms</FooterLink>
            <FooterLink href="/legal/privacy">Privacy</FooterLink>
            <FooterLink href="/legal/cookies">Cookies</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
