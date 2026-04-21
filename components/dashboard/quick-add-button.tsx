'use client'

import { useState } from 'react'
import QuickAddModal from './quick-add-modal'

export default function QuickAddButton({ userInterests }: { userInterests: string[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#178060] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Quick log
      </button>
      {open && <QuickAddModal onClose={() => setOpen(false)} userInterests={userInterests} />}
    </>
  )
}
