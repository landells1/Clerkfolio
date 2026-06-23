import { formatStorageQuota } from '@/lib/subscription'

function formatUsed(mb: number): string {
  if (mb >= 1000) return formatStorageQuota(mb)
  if (mb < 100) return `${mb.toFixed(1)} MB`
  return `${Math.round(mb)} MB`
}

// F-040: show used / quota with a bar and a near-quota / over-quota warning.
// Quota is now per-user variable (base + additive grants), so this is
// load-bearing - a hard upload block with no prior visibility is hostile.
// Over-quota policy: we NEVER delete user data; a full/lapsed quota only blocks
// NEW uploads while existing files stay readable - and we say so.
export default function StorageMeter({
  usedMB,
  quotaMB,
  className = '',
}: {
  usedMB: number
  quotaMB: number
  className?: string
}) {
  const pct = quotaMB > 0 ? Math.min(100, (usedMB / quotaMB) * 100) : 0
  const full = usedMB >= quotaMB
  const near = !full && pct >= 80
  const barColor = full ? '#E5484D' : near ? '#E0A33E' : '#1B6FD9'

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-[rgba(245,245,242,0.55)]">Storage used</span>
        <span className="font-medium text-[#F5F5F2]">
          {formatUsed(usedMB)} of {formatStorageQuota(quotaMB)}
          <span className="ml-1 text-[rgba(245,245,242,0.45)]">({Math.round(pct)}%)</span>
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Storage used"
      >
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      {full ? (
        <p className="mt-2 text-xs leading-5 text-[#F2B8B5]">
          Storage full. Your existing files are safe and stay readable — we never delete your data. To add new uploads,
          delete some files or upgrade for more space.
        </p>
      ) : near ? (
        <p className="mt-2 text-xs leading-5 text-[#E0A33E]">
          You&apos;re close to your storage limit. We never delete your files — free up space or upgrade before you hit the cap.
        </p>
      ) : null}
    </div>
  )
}
