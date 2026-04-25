'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const DRAFT_KEY = 'clinidex-case-draft'

export default function DraftResumeBanner() {
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      // Check not expired and has meaningful content
      if (d._expires && Date.now() > d._expires) {
        sessionStorage.removeItem(DRAFT_KEY)
        return
      }
      if (d.title?.trim()) setHasDraft(true)
    } catch {
      // ignore
    }
  }, [])

  function discard() {
    sessionStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
  }

  if (!hasDraft) return null

  return (
    <div className="flex items-center justify-between bg-[#1B6FD9]/10 border border-[#1B6FD9]/20 rounded-xl px-4 py-3 mb-6">
      <div className="flex items-center gap-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <span className="text-sm text-[#1B6FD9] font-medium">You have an unsaved draft</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={discard}
          className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[rgba(245,245,242,0.7)] transition-colors"
        >
          Discard
        </button>
        <Link
          href="/cases/new"
          className="text-xs font-semibold text-[#1B6FD9] hover:text-white transition-colors"
        >
          Continue →
        </Link>
      </div>
    </div>
  )
}
