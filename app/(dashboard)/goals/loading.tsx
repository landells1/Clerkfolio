import { Skeleton } from '@/components/ui/skeleton'

export default function GoalsLoading() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.04]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
