'use client'
import { useQuickAdd } from '@/app/(dashboard)/providers'

export default function FAB() {
  const { openQuickAdd } = useQuickAdd()
  return (
    <button
      onClick={() => openQuickAdd()}
      aria-label="Quick log (N)"
      title="Quick log (N)"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#1B6FD9] hover:bg-[#155BB0] active:scale-95 shadow-[0_4px_24px_rgba(27,111,217,0.4)] flex items-center justify-center transition-all duration-150 lg:w-12 lg:h-12 lg:bottom-8 lg:right-8"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  )
}
