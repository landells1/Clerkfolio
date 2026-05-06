'use client'

import { useRef, useState } from 'react'
import { useQuickAdd } from '@/app/(dashboard)/providers'

type EntryType = 'case' | 'teaching' | 'reflection' | 'procedure'

const CATEGORIES: { type: EntryType; label: string }[] = [
  { type: 'case', label: 'Case' },
  { type: 'teaching', label: 'Teaching' },
  { type: 'reflection', label: 'Reflection' },
  { type: 'procedure', label: 'Procedure' },
]

export default function QuickAddButton({ userInterests: _ }: { userInterests: string[] }) {
  const { openQuickAdd } = useQuickAdd()
  const [pickerOpen, setPickerOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressedRef = useRef(false)

  function clearLongPress() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function startLongPress() {
    clearLongPress()
    longPressedRef.current = false
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true
      setPickerOpen(true)
    }, 500)
  }

  function open(type?: EntryType) {
    setPickerOpen(false)
    openQuickAdd(type ? { type } : undefined)
  }

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => {
          if (longPressedRef.current) {
            longPressedRef.current = false
            return
          }
          open()
        }}
        onPointerDown={startLongPress}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
        className="flex shrink-0 items-center gap-2 rounded-xl bg-[#1B6FD9] px-4 py-2.5 text-sm font-semibold text-[#0B0B0C] transition-colors hover:bg-[#155BB0]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Quick log
      </button>

      {pickerOpen && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-44 rounded-xl border border-white/[0.08] bg-[#141416] p-1.5 shadow-2xl md:hidden">
          {CATEGORIES.map(category => (
            <button
              key={category.type}
              onClick={() => open(category.type)}
              className="block min-h-[40px] w-full rounded-lg px-3 text-left text-sm text-[rgba(245,245,242,0.72)] hover:bg-white/[0.06] hover:text-[#F5F5F2]"
            >
              {category.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
