export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`motion-safe:animate-pulse rounded-lg bg-white/[0.06] ${className}`}
    />
  )
}
