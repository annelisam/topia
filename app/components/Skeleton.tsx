// Lightweight shimmer placeholder. Renders content-shaped blocks during the
// first load so lists reserve their space (no layout shift when data pops in)
// instead of flashing a centered loading bar in an empty container.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink/10 ${className}`} aria-hidden />;
}
