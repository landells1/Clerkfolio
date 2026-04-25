'use client'

import { useState, useRef, useEffect } from 'react'
import { CLINICAL_DOMAINS } from '@/lib/types/cases'

type Props = {
  value: string
  onChange: (v: string) => void
  onFocus?: () => void
}

export default function ClinicalAreaSelect({ value, onChange, onFocus }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = (CLINICAL_DOMAINS as readonly string[]).filter(d =>
    d.toLowerCase().includes(search.toLowerCase())
  )

  function select(domain: string) {
    onChange(domain)
    setSearch('')
    setOpen(false)
  }

  function clear() {
    onChange('')
    setSearch('')
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setSearch(v)
    // Clear selected value when user starts typing a new search
    if (value && v) onChange('')
    setOpen(true)
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="min-h-[42px] w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 py-2 flex items-center gap-2 cursor-text focus-within:border-[#1B6FD9] transition-colors"
        onClick={() => setOpen(true)}
      >
        {value && (
          <span className="inline-flex items-center gap-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded px-2 py-0.5 text-xs font-medium flex-shrink-0">
            {value}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); clear() }}
              className="hover:text-white transition-colors ml-0.5"
            >
              &times;
            </button>
          </span>
        )}
        <input
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={() => { setOpen(true); onFocus?.() }}
          placeholder={value ? '' : 'Select clinical area…'}
          className="flex-1 min-w-0 bg-transparent text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] outline-none"
        />
        <svg
          className="flex-shrink-0 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="rgba(245,245,242,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-20 w-full mt-1 bg-[#141416] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-[rgba(245,245,242,0.35)]">No matches</div>
            ) : (
              filtered.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => select(d)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                    value === d
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'text-[rgba(245,245,242,0.7)] hover:bg-white/[0.04] hover:text-[#F5F5F2]'
                  }`}
                >
                  {d}
                  {value === d && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
