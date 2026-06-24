'use client';

// A minimal branded loading state — the TOPIA wordmark (accent period) with a
// soft pulse + spinner ring. Used while profile data is still resolving.
export default function TopiaLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      <style>{`
        @keyframes topia-pulse { 0%,100% { opacity: 0.45; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes topia-spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
        <span
          className="absolute inset-0 rounded-full"
          style={{ border: '2px solid var(--border-color)', borderTopColor: 'var(--accent)', animation: 'topia-spin 0.9s linear infinite' }}
        />
        <span className="font-basement font-black text-[18px] tracking-tight" style={{ color: 'var(--foreground)', animation: 'topia-pulse 1.4s ease-in-out infinite' }}>
          T<span style={{ color: 'var(--accent)' }}>.</span>
        </span>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-40" style={{ color: 'var(--foreground)' }}>
        {label ?? 'Loading…'}
      </p>
    </div>
  );
}
