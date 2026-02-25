'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('Invalid password');
        setLoading(false);
        return;
      }

      router.push('/admin');
    } catch {
      setError('Network error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        <div className="border border-[var(--foreground)] p-8" style={{ backgroundColor: 'var(--background)' }}>
          <h1 className="font-mono text-[13px] uppercase tracking-widest mb-1" style={{ color: 'var(--foreground)' }}>
            TOPIA
          </h1>
          <h2 className="font-mono text-[24px] font-bold mb-8" style={{ color: 'var(--foreground)' }}>
            ADMIN
          </h2>

          <form onSubmit={handleSubmit}>
            <label className="block font-mono text-[12px] uppercase tracking-widest mb-2" style={{ color: 'var(--foreground)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border border-[var(--foreground)] px-3 py-2 font-mono text-[13px] outline-none focus:ring-2 focus:ring-[var(--foreground)]"
              style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
            />

            {error && (
              <p className="font-mono text-[12px] mt-2" style={{ color: '#FF5C34' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 px-4 py-2.5 font-mono text-[13px] uppercase tracking-widest border border-[var(--foreground)] transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
