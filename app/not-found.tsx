import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--page-bg)', color: 'var(--page-text)' }}
    >
      <p className="font-mono text-[11px] uppercase tracking-[3px] opacity-60 mb-4">404 // lost in space</p>
      <h1 className="font-basement font-black text-[clamp(36px,8vw,88px)] uppercase leading-[0.9] mb-6">
        This page doesn&apos;t exist
      </h1>
      <p className="font-mono text-[12px] uppercase tracking-[2px] opacity-60 mb-10 max-w-md">
        The link may be old, or the page has moved.
      </p>
      <Link
        href="/home"
        className="font-mono text-[11px] uppercase tracking-[2px] px-5 py-3 rounded-sm bg-lime text-obsidian font-bold no-underline hover:opacity-80 transition"
      >
        ← Back to Topia
      </Link>
    </main>
  );
}
