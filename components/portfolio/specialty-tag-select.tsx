'use client'

import { useState, useRef, useEffect } from 'react'
import { PREDEFINED_SPECIALTIES, MAX_SPECIALTIES } from '@/lib/constants/specialties'

type Props = {
  value: string[]
  onChange: (tags: string[]) => void
  userInterests?: string[]
  /** When true, only show userInterests as options (no PREDEFINED fallback).
   *  Use for Application tags where options = the user's tracked programmes. */
  trackedOnly?: boolean
}

export default function SpecialtyTagSelect({ value, onChange, userInterests = [], trackedOnly = false }: Props) {
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

  // When trackedOnly: show only the user's tracked programmes
  // Otherwise: show user interests first, then the full predefined list
  const allOptions = trackedOnly
    ? userInterests
    : [
        ...userInterests.filter(s => !(PREDEFINED_SPECIALTIES as readonly string[]).includes(s)),
        ...PREDEFINED_SPECIALTIES,
      ]

  const filtered = allOptions.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  )

  // In non-tracked mode: put user interests first
  const sorted = trackedOnly
    ? filtered
    : [...filtered.filter(s => userInterests.includes(s)), ...filtered.filter(s => !userInterests.includes(s))]

  function toggle(s: string) {
    if (value.includes(s)) {
      onChange(value.filter(x => x !== s))
    } else if (value.length < MAX_SPECIALTIES) {
      onChange([...value, s])
    }
  }

  function removeTag(s: string) {
    onChange(value.filter(x => x !== s))
  }

  return (
    <div ref={ref} className="relative">
      {/* Selected tags */}
      <div
        className="min-h-[42px] w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 py-2 flex flex-wrap gap-1.5 cursor-text focus-within:border-[#1B6FD9] transition-colors"
        onClick={() => setOpen(true)}
      >
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-[#1B6FD9]/15 text-[#1B6FD9] border border-[#1B6FD9]/25 rounded px-2 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              className="hover:text-white transition-colors ml-0.5"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? (trackedOnly ? 'Select programmes…' : 'Search specialties…') : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] outline-none"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-[#141416] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
          {/* Section header — only in non-tracked mode when there are user interests */}
          {!trackedOnly && userInterests.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider border-b border-white/[0.06]">
              Your specialties
            </div>
          )}
          <div className="max-h-52 overflow-y-auto">
            {trackedOnly && userInterests.length === 0 ? (
              /* Empty state when no programmes tracked */
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-[rgba(245,245,242,0.35)] mb-1">No tracked programmes</p>
                <p className="text-xs text-[rgba(245,245,242,0.25)]">Add specialties in the Specialties tab first.</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="px-3 py-3 text-sm text-[rgba(245,245,242,0.35)]">No matches</div>
            ) : (
              sorted.map((s, i) => {
                const isInterest = !trackedOnly && userInterests.includes(s)
                const isSelected = value.includes(s)
                const showDivider = !trackedOnly && i > 0 && isInterest !== userInterests.includes(sorted[i - 1])

                return (
                  <div key={s}>
                    {showDivider && (
                      <div className="px-3 py-1.5 text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider border-t border-white/[0.06]">
                        All specialties
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggle(s)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                        isSelected
                          ? 'bg-[#1B6FD9]/10 text-[#1B6FD9]'
                          : 'text-[rgba(245,245,242,0.7)] hover:bg-white/[0.04] hover:text-[#F5F5F2]'
                      }`}
                    >
                      <span>{s}</span>
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                )
              })
            )}
          </div>
          {value.length >= MAX_SPECIALTIES && (
            <div className="px-3 py-2 text-xs text-yellow-400 border-t border-white/[0.06]">
              Tag limit reached ({MAX_SPECIALTIES})
            </div>
          )}
        </div>
      )}
    </div>
  )
}
