'use client';

export function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-ink/[0.08] bg-ink/[0.03] mb-6">
      <span className="font-mono text-[11px] text-ink/50">
        You&apos;re viewing as a collaborator. Only builders can edit this world.
      </span>
    </div>
  );
}
