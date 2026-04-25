'use client'
import { useQuickAdd } from '@/app/(dashboard)/providers'

export default function QuickAddButton({ userInterests: _ }: { userInterests: string[] }) {
  const { openQuickAdd } = useQuickAdd()
  return (
    <button
      onClick={() => openQuickAdd()}
      className="flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors shrink-0"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Quick log
    </button>
  )
}
