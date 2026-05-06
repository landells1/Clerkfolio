import Link from 'next/link'

export default function EmptyDayPrompt() {
  return (
    <section className="mb-6 rounded-2xl border border-[#1B6FD9]/25 bg-[#141416] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#F5F5F2]">Today&apos;s blank</h2>
          <p className="mt-1 text-sm leading-6 text-[rgba(245,245,242,0.55)]">
            Log one thing in 30 seconds while it is still fresh.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cases/new" className="min-h-[44px] rounded-lg bg-[#1B6FD9] px-4 py-2.5 text-sm font-semibold text-[#0B0B0C] hover:bg-[#155BB0]">
            Log case
          </Link>
          <Link href="/portfolio/new" className="min-h-[44px] rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-[#F5F5F2] hover:border-white/[0.16]">
            Add portfolio
          </Link>
        </div>
      </div>
    </section>
  )
}
