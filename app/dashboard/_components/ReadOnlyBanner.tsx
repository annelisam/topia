'use client';

export function ReadOnlyBanner() {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border mb-6"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
    >
      <span className="font-mono text-[11px] opacity-50" style={{ color: 'var(--foreground)' }}>
        You&apos;re viewing as a collaborator. Only builders can edit this world.
      </span>
    </div>
  );
}
