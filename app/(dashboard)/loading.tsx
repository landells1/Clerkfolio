import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      <Skeleton className="mb-4 h-8 w-48" />
      <Skeleton className="mb-6 h-5 w-80" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="mt-4 h-72" />
    </div>
  )
}
