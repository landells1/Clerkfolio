'use client'

import { forwardRef, useId, useImperativeHandle, useState, useRef, useEffect } from 'react'
import { PREDEFINED_SPECIALTIES, MAX_SPECIALTIES } from '@/lib/constants/specialties'
import { SPECIALTY_CONFIGS } from '@/lib/specialties'

/** Returns a human-readable label for a specialty key or display name. */
function getOptionLabel(key: string): string {
  const config = SPECIALTY_CONFIGS.find(c => c.key === key)
  if (config) return config.name
  return key // already a display name (e.g. PREDEFINED_SPECIALTIES entries)
}

type Props = {
  value: string[]
  onChange: (tags: string[]) => void
  userInterests?: string[]
  /** When true, only show userInterests as options (no PREDEFINED fallback).
   *  Use for Application tags where options = the user's tracked programmes. */
  trackedOnly?: boolean
}

/** Imperative API exposed via forwardRef so parent forms can ask "is the
 *  search box still holding uncommitted typed text?" before they submit.
 *  Returns null on success (no pending search, or the pending text matches a
 *  single visible option and was auto-committed), or an error string the
 *  parent should surface inline. */
export type SpecialtyTagSelectHandle = {
  commitPending: () => string | null
}

const SpecialtyTagSelect = forwardRef<SpecialtyTagSelectHandle, Props>(function SpecialtyTagSelect(
  { value, onChange, userInterests = [], trackedOnly = false },
  forwardedRef,
) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Index of the keyboard-highlighted option in `sorted` (-1 = none). Drives
  // ArrowUp/ArrowDown + Enter so the combobox is operable without a mouse
  // (WCAG 2.1.1). (BUG-006)
  const [activeIndex, setActiveIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listboxId = useId()

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
    getOptionLabel(s).toLowerCase().includes(search.toLowerCase()) ||
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
    setSearch('')
    setError(null)
  }

  function removeTag(s: string) {
    onChange(value.filter(x => x !== s))
  }

  // Auto-commit the typed search text when it matches exactly one visible
  // option. Called from the input's Enter handler AND from parent forms via
  // the imperative `commitPending` ref. Returns null on success or when no
  // pending text needs handling; returns a user-facing error string when the
  // search has text that doesn't resolve to a single option.
  function commitPending(): string | null {
    const trimmed = search.trim()
    if (!trimmed) { setError(null); return null }
    if (sorted.length === 1 && !value.includes(sorted[0])) {
      if (value.length >= MAX_SPECIALTIES) {
        const msg = `Tag limit reached (${MAX_SPECIALTIES})`
        setError(msg)
        return msg
      }
      onChange([...value, sorted[0]])
      setSearch('')
      setError(null)
      return null
    }
    const msg = sorted.length === 0
      ? `"${trimmed}" is not a tracked specialty. Pick an option or clear the search.`
      : `Pick a specialty from the dropdown or clear the search before saving.`
    setError(msg)
    setOpen(true)
    return msg
  }

  useImperativeHandle(forwardedRef, () => ({ commitPending }))

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
            {getOptionLabel(tag)}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              aria-label={`Remove ${getOptionLabel(tag)}`}
              className="hover:text-white transition-colors ml-0.5"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); setActiveIndex(-1); if (error) setError(null) }}
          onFocus={() => setOpen(true)}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIndex >= 0 && activeIndex < sorted.length ? `${listboxId}-opt-${activeIndex}` : undefined}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              if (!open) { setOpen(true); return }
              if (sorted.length === 0) return
              setActiveIndex(prev => Math.min(prev + 1, sorted.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              if (sorted.length === 0) return
              setActiveIndex(prev => Math.max(prev - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              // Commit the highlighted option if one is active; otherwise fall
              // back to resolving typed search text.
              if (open && activeIndex >= 0 && activeIndex < sorted.length) {
                toggle(sorted[activeIndex])
                setActiveIndex(-1)
              } else {
                commitPending()
              }
            } else if (e.key === 'Escape') {
              setSearch('')
              setError(null)
              setActiveIndex(-1)
              setOpen(false)
            }
          }}
          placeholder={value.length === 0 ? (trackedOnly ? 'Select programmes…' : 'Search specialties…') : ''}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'specialty-tag-select-error' : undefined}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.55)] outline-none"
        />
      </div>
      {error && (
        <p id="specialty-tag-select-error" role="alert" className="mt-1.5 text-xs text-amber-300">
          {error}
        </p>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-[#141416] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
          {/* Section header - only in non-tracked mode when there are user interests */}
          {!trackedOnly && userInterests.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider border-b border-white/[0.06]">
              Your specialties
            </div>
          )}
          <div className="max-h-52 overflow-y-auto" id={listboxId} role="listbox">
            {trackedOnly && userInterests.length === 0 ? (
              /* Empty state when no programmes tracked */
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-[rgba(245,245,242,0.55)] mb-1">No tracked programmes</p>
                <p className="text-xs text-[rgba(245,245,242,0.55)]">Add specialties in the Specialties tab first.</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="px-3 py-3 text-sm text-[rgba(245,245,242,0.55)]">No matches</div>
            ) : (
              sorted.map((s, i) => {
                const isInterest = !trackedOnly && userInterests.includes(s)
                const isSelected = value.includes(s)
                const isActive = i === activeIndex
                const showDivider = !trackedOnly && i > 0 && isInterest !== userInterests.includes(sorted[i - 1])

                return (
                  <div key={s}>
                    {showDivider && (
                      <div className="px-3 py-1.5 text-[10px] font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wider border-t border-white/[0.06]">
                        All specialties
                      </div>
                    )}
                    <button
                      type="button"
                      id={`${listboxId}-opt-${i}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => toggle(s)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                        isSelected
                          ? 'bg-[#1B6FD9]/10 text-[#1B6FD9]'
                          : isActive
                            ? 'bg-white/[0.06] text-[#F5F5F2]'
                            : 'text-[rgba(245,245,242,0.7)] hover:bg-white/[0.04] hover:text-[#F5F5F2]'
                      }`}
                    >
                      <span>{getOptionLabel(s)}</span>
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
})

export default SpecialtyTagSelect
