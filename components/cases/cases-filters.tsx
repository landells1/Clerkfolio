'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { CLINICAL_DOMAINS } from '@/lib/types/cases'
import { getSpecialtyConfig } from '@/lib/specialties'

const inputClass =
  'bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors'

const SORT_KEY = 'cases-sort'
const DOMAIN_KEY = 'cases-domain'

type Props = {
  defaultQ?: string
  defaultDomain?: string
  defaultSpecialty?: string
  defaultSort?: string
  trackedSpecialtyKeys?: string[]
}

export default function CasesFilters({
  defaultQ = '',
  defaultDomain = '',
  defaultSpecialty = '',
  defaultSort = '',
  trackedSpecialtyKeys = [],
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(defaultQ)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [initialSort] = useState<string>(() => {
    if (defaultSort) return defaultSort
    try { return localStorage.getItem(SORT_KEY) ?? '' } catch { return '' }
  })

  const [initialDomain] = useState<string>(() => {
    if (defaultDomain) return defaultDomain
    try { return localStorage.getItem(DOMAIN_KEY) ?? '' } catch { return '' }
  })

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (q.trim()) {
        params.set('q', q.trim())
      } else {
        params.delete('q')
      }
      params.delete('page')
      router.replace(`/cases?${params.toString()}`)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function handleDomain(value: string) {
    try { localStorage.setItem(DOMAIN_KEY, value) } catch { /* ignore */ }
    const params = new URLSearchParams(searchParams.toString())
    if (value) { params.set('domain', value) } else { params.delete('domain') }
    params.delete('page')
    router.replace(`/cases?${params.toString()}`)
  }

  function handleSpecialty(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) { params.set('specialty', value) } else { params.delete('specialty') }
    params.delete('page')
    router.replace(`/cases?${params.toString()}`)
  }

  function handleSort(value: string) {
    try { localStorage.setItem(SORT_KEY, value) } catch { /* ignore */ }
    const params = new URLSearchParams(searchParams.toString())
    if (value) { params.set('sort', value) } else { params.delete('sort') }
    params.delete('page')
    router.replace(`/cases?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap">
      {/* Search input */}
      <div className="relative flex-1 min-w-48">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search cases…"
          className={`${inputClass} w-full pl-9`}
        />
      </div>

      {/* Clinical area filter */}
      <select
        defaultValue={initialDomain}
        onChange={e => handleDomain(e.target.value)}
        className={`${inputClass} cursor-pointer`}
      >
        <option value="">All clinical areas</option>
        {CLINICAL_DOMAINS.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      {/* Specialty filter (only shown when user tracks specialties) */}
      {trackedSpecialtyKeys.length > 0 && (
        <select
          defaultValue={defaultSpecialty}
          onChange={e => handleSpecialty(e.target.value)}
          className={`${inputClass} cursor-pointer`}
        >
          <option value="">All specialties</option>
          {trackedSpecialtyKeys.map(key => (
            <option key={key} value={key}>
              {getSpecialtyConfig(key)?.name ?? key}
            </option>
          ))}
        </select>
      )}

      {/* Sort */}
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
