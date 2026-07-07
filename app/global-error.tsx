'use client';

// Replaces the ROOT layout when it crashes, so it must render its own
// <html>/<body> and cannot rely on globals.css having loaded — inline styles only.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          color: '#f5f0e8',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.6, marginBottom: 16 }}>
          error // signal lost
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 7vw, 64px)', textTransform: 'uppercase', lineHeight: 0.95, margin: '0 0 24px' }}>
          Something went wrong
        </h1>
        <button
          onClick={() => reset()}
          style={{
            fontSize: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 700,
            padding: '12px 20px',
            borderRadius: 2,
            background: '#e4fe52',
            color: '#1a1a1a',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
