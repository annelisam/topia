'use client';

import Link from 'next/link';
import LoginButton from '../LoginButton';

type NavItem = {
  label: string;
  href?: string;
  comingSoon?: boolean;
  children?: { href: string; label: string }[];
};

const NAV_LINKS: NavItem[] = [
  { href: '/onboarding', label: 'Onboarding' },
  { href: '#', label: 'Passport', comingSoon: true },
  { href: '/tv', label: 'Topia TV' },
  { href: '/worlds', label: 'Worlds' },
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
  { href: '/dashboard', label: 'Dashboard' },
];

const STATIC_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <div
      className={`
        fixed inset-0 z-[2000] flex flex-col
        transition-all duration-500 ease-out
        ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
      style={{ backgroundColor: 'var(--page-bg)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-[var(--nav-height)]">
        <span
          className="font-basement font-black text-sm tracking-[4px] uppercase"
          style={{ color: 'var(--page-text)' }}
        >
          TOPIA<span style={{ color: 'var(--accent, #e4fe52)' }}>.</span>
        </span>
        <button
          onClick={onClose}
          className="opacity-40 hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer p-2"
          style={{ color: 'var(--page-text)' }}
          aria-label="Close menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Links */}
      <div className="flex-1 flex flex-col justify-center px-8 gap-1">
        {NAV_LINKS.map((item, i) =>
          item.children ? (
            <div key={item.label} className="mt-2">
              <span
                className="font-mono text-[13px] tracking-[2px] uppercase opacity-30 block mb-1"
                style={{
                  color: 'var(--page-text)',
                  transitionDelay: isOpen ? `${i * 50}ms` : '0ms',
                }}
              >
                {item.label}
              </span>
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onClose}
                  className="font-basement font-black text-[clamp(22px,5vw,38px)] uppercase transition-colors duration-300 no-underline leading-tight hover:opacity-70 block pl-5"
                  style={{ color: 'var(--page-text)' }}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          ) : item.comingSoon ? (
            <span
              key={item.label}
              className="font-basement font-black text-[clamp(28px,6vw,48px)] uppercase leading-tight opacity-25 cursor-default flex items-baseline gap-3"
              style={{
                color: 'var(--page-text)',
                transitionDelay: isOpen ? `${i * 50}ms` : '0ms',
              }}
            >
              {item.label}
              <span className="font-mono text-[11px] tracking-[1px] opacity-70">Soon</span>
            </span>
          ) : (
            <Link
              key={item.href}
              href={item.href!}
              onClick={onClose}
              className="font-basement font-black text-[clamp(28px,6vw,48px)] uppercase transition-colors duration-300 no-underline leading-tight hover:opacity-70"
              style={{
                color: 'var(--page-text)',
                transitionDelay: isOpen ? `${i * 50}ms` : '0ms',
              }}
            >
              {item.label}
            </Link>
          )
        )}
        {STATIC_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="font-basement font-black text-[clamp(20px,4vw,28px)] uppercase no-underline leading-tight opacity-30 hover:opacity-60 transition-opacity mt-4"
            style={{ color: 'var(--page-text)' }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div className="px-8 pb-24">
        <LoginButton />
      </div>
    </div>
  );
}
