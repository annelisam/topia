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
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f0e8' }}>
      <div className="w-full max-w-sm">
        <div className="border border-[#1a1a1a] p-8" style={{ backgroundColor: '#f5f0e8' }}>
          <h1 className="font-mono text-[11px] uppercase tracking-widest mb-1" style={{ color: '#1a1a1a' }}>
            TOPIA
          </h1>
          <h2 className="font-mono text-[24px] font-bold mb-8" style={{ color: '#1a1a1a' }}>
            ADMIN
          </h2>

          <form onSubmit={handleSubmit}>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: '#1a1a1a' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border border-[#1a1a1a] px-3 py-2 font-mono text-[13px] outline-none focus:ring-2 focus:ring-[#1a1a1a]"
              style={{ backgroundColor: '#f5f0e8', color: '#1a1a1a' }}
            />

            {error && (
              <p className="font-mono text-[10px] mt-2" style={{ color: '#FF5C34' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest border border-[#1a1a1a] transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
