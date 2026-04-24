import { Skeleton } from '@/components/ui/skeleton'

export default function ImportLoading() {
  return (
    <div className="p-8 max-w-2xl">
      <Skeleton className="h-4 w-36 mb-6" />
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
