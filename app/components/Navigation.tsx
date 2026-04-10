'use client';

import { useState } from 'react';
import TopNav from './nav/TopNav';
import MobileTabBar from './nav/MobileTabBar';
import MobileMenu from './nav/MobileMenu';

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <TopNav />
      <MobileTabBar onMenuToggle={() => setMenuOpen(true)} />
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
