import { Skeleton } from '@/components/ui/skeleton'

export default function PortfolioLoading() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      {/* Filter bar */}
      <Skeleton className="h-10 w-full mb-6" />
      {/* Category tabs */}
      <div className="flex gap-2 mb-6 pb-4 border-b border-white/[0.06]">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20" />
        ))}
      </div>
      {/* Entry cards */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
