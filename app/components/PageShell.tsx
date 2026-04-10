'use client';

import Navigation from './Navigation';
import Footer from './Footer';
import ColorSlider from './ui/ColorSlider';
import ThemeToggle from './ThemeToggle';
import SentientText from './ui/SentientText';
import { ReactNode } from 'react';

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navigation />
      <main className="pt-[var(--nav-height)] pb-16 md:pb-0 relative">
        {/* Halftone */}
        <div
          className="fixed inset-0 pointer-events-none z-[5] opacity-[0.06] mix-blend-multiply"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.8) 1px, transparent 1px)',
            backgroundSize: '4px 4px',
          }}
        />
        {/* Grain */}
        <div
          className="fixed inset-0 z-[4] opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px',
          }}
        />
        <SentientText />
        {children}
      </main>
      <Footer />
      <ColorSlider />
      <ThemeToggle />
    </>
  );
}
