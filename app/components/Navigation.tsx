'use client';

import { useState, useEffect, useCallback } from 'react';
import TopNav from './nav/TopNav';
import MobileTabBar from './nav/MobileTabBar';
import MobileMenu from './nav/MobileMenu';
import MessagesModal from './MessagesModal';
import { OPEN_MESSAGES_EVENT } from '../../lib/openMessages';

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [initialConv, setInitialConv] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState(0); // remount the modal fresh on each open

  const openMessages = useCallback((conversationId?: string | null) => {
    setInitialConv(conversationId ?? null);
    setOpenKey((k) => k + 1);
    setMsgOpen(true);
  }, []);

  // Let any client component (e.g. the profile Message button) pop the modal.
  useEffect(() => {
    const handler = (e: Event) => openMessages((e as CustomEvent).detail?.conversationId ?? null);
    window.addEventListener(OPEN_MESSAGES_EVENT, handler);
    return () => window.removeEventListener(OPEN_MESSAGES_EVENT, handler);
  }, [openMessages]);

  return (
    <>
      <TopNav onOpenMessages={() => openMessages()} />
      <MobileTabBar onMenuToggle={() => setMenuOpen(true)} onOpenMessages={() => openMessages()} />
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <MessagesModal key={openKey} open={msgOpen} initialConversationId={initialConv} onClose={() => setMsgOpen(false)} />
    </>
  );
}
