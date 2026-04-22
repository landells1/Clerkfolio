import { Skeleton } from '@/components/ui/skeleton'

export default function ExportLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <Skeleton className="h-4 w-20 mb-6" />
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-[#141416] border border-white/[0.08] rounded-2xl p-5 mb-4">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-8 w-24" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
