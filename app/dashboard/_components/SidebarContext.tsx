'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface SidebarCtxValue {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
}

const SidebarCtx = createContext<SidebarCtxValue>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
});

const STORAGE_KEY = 'topia.dashboard.sidebar.collapsed';

/**
 * Persists the dashboard sidebar collapsed/expanded preference to
 * localStorage. Both <DashboardSidebar> and <DashboardLayout>'s <main>
 * subscribe so they animate width / margin-left in lockstep.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedRaw] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read preference once on mount. Don't apply during SSR — we need the
  // initial paint to match the server-rendered HTML or React will
  // hydration-mismatch.
  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === '1') setCollapsedRaw(true);
    } catch { /* private mode / disabled storage */ }
    setHydrated(true);
  }, []);

  function setCollapsed(v: boolean) {
    setCollapsedRaw(v);
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch { /* ignore */ }
  }

  return (
    <SidebarCtx.Provider value={{ collapsed, setCollapsed, toggle: () => setCollapsed(!collapsed) }}>
      {children}
    </SidebarCtx.Provider>
  );
}

export const useSidebar = () => useContext(SidebarCtx);
