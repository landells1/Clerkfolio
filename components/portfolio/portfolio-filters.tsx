'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const inputClass =
  'bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1D9E75] transition-colors'

const SORT_KEY = 'portfolio-sort'

type Props = {
  defaultQ?: string
  defaultSort?: string
}

export default function PortfolioFilters({ defaultQ = '', defaultSort = '' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(defaultQ)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resolve initial sort: URL param takes priority; fall back to localStorage
  const [initialSort] = useState<string>(() => {
    if (defaultSort) return defaultSort
    try { return localStorage.getItem(SORT_KEY) ?? '' } catch { return '' }
  })

  // Debounce the search query update
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (q.trim()) {
        params.set('q', q.trim())
      } else {
        params.delete('q')
      }
      router.replace(`/portfolio?${params.toString()}`)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function handleSort(value: string) {
    try { localStorage.setItem(SORT_KEY, value) } catch { /* ignore */ }
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('sort', value)
    } else {
      params.delete('sort')
    }
    router.replace(`/portfolio?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Search input */}
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(245,245,242,0.35)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search entries…"
          className={`${inputClass} w-full pl-9`}
        />
      </div>

      {/* Sort selector */}
      <select
        defaultValue={initialSort}
        onChange={e => handleSort(e.target.value)}
        className={`${inputClass} cursor-pointer`}
      >
        <option value="">Newest first</option>
        <option value="date_asc">Oldest first</option>
        <option value="title_asc">Title A→Z</option>
      </select>
    </div>
  )
}
