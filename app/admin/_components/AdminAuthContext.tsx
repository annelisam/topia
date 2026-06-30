'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

interface AdminAuthContextValue {
  adminFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, getAccessToken, logout: privyLogout } = usePrivy();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authorized' | 'denied'>('loading');

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace('/admin/login'); return; }

    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token }),
      });
      if (cancelled) return;
      setStatus(res.ok ? 'authorized' : 'denied');
    })();
    return () => { cancelled = true; };
  }, [ready, authenticated, getAccessToken, router]);

  const adminFetch = useCallback(async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const token = await getAccessToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }, [getAccessToken]);

  const logout = useCallback(async () => {
    await privyLogout();
    router.push('/admin/login');
  }, [privyLogout, router]);

  if (!ready || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f0e8' }}>
        <span className="font-mono text-[13px] uppercase tracking-widest" style={{ color: '#1a1a1a' }}>
          Verifying access…
        </span>
      </div>
    );
  }

  if (!authenticated || status === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f0e8' }}>
        <div className="text-center">
          <p className="font-mono text-[16px] font-bold mb-2" style={{ color: '#1a1a1a' }}>Access denied</p>
          <p className="font-mono text-[12px] mb-4" style={{ color: '#1a1a1a80' }}>
            Your account is not authorized for admin access.
          </p>
          <button
            onClick={() => router.push('/')}
            className="font-mono text-[12px] uppercase tracking-widest px-4 py-2 border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f5f0e8] transition-colors"
            style={{ color: '#1a1a1a' }}
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ adminFetch, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
