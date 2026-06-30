'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let cancelled = false;
    setChecking(true);
    setDenied(false);
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: token }),
        });
        if (cancelled) return;
        if (res.ok) {
          router.replace('/admin');
        } else {
          setDenied(true);
          setChecking(false);
        }
      } catch {
        if (cancelled) return;
        setDenied(true);
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, authenticated, getAccessToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f0e8' }}>
      <div className="w-full max-w-sm">
        <div className="border border-[#1a1a1a] p-8" style={{ backgroundColor: '#f5f0e8' }}>
          <h1 className="font-mono text-[13px] uppercase tracking-widest mb-1" style={{ color: '#1a1a1a' }}>
            TOPIA
          </h1>
          <h2 className="font-mono text-[24px] font-bold mb-8" style={{ color: '#1a1a1a' }}>
            ADMIN
          </h2>

          {denied && (
            <p className="font-mono text-[12px] mb-4" style={{ color: '#FF5C34' }}>
              Your account is not authorized for admin access.
            </p>
          )}

          {checking ? (
            <p className="font-mono text-[12px] uppercase tracking-widest" style={{ color: '#1a1a1a80' }}>
              Verifying access…
            </p>
          ) : (
            <button
              onClick={login}
              className="w-full px-4 py-2.5 font-mono text-[13px] uppercase tracking-widest border border-[#1a1a1a] transition-colors hover:opacity-80"
              style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
