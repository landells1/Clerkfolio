'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Case } from '@/lib/types/cases'

type Props = {
  cases: Case[]
  userInterests: string[]
}

function firstSentence(notes: string | null) {
  if (!notes) return 'No notes added.'
  const sentence = notes.split('. ')[0]
  return sentence.length > 140 ? `${sentence.slice(0, 140)}...` : sentence
}

function monthLabel(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function clinicalArea(c: Case) {
  return c.clinical_domain || c.clinical_domains?.[0] || 'Clinical area not set'
}

export default function CasesListClient({ cases, userInterests }: Props) {
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [domain, setDomain] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const domains = useMemo(() => Array.from(new Set(cases.flatMap(c => c.clinical_domains?.length ? c.clinical_domains : c.clinical_domain ? [c.clinical_domain] : []))).sort(), [cases])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cases.filter(c => {
      if (q && !`${c.title} ${c.notes ?? ''}`.toLowerCase().includes(q)) return false
      if (domain && ![c.clinical_domain, ...(c.clinical_domains ?? [])].includes(domain)) return false
      if (specialty && !(c.specialty_tags ?? []).includes(specialty)) return false
      if (from && c.date < from) return false
      if (to && c.date > to) return false
      return true
    })
  }, [cases, domain, from, query, specialty, to])

  const pinned = filtered.filter(c => c.pinned)
  const unpinned = filtered.filter(c => !c.pinned)
  const grouped = unpinned.reduce((acc: Record<string, Case[]>, c) => {
    const key = monthLabel(c.created_at)
    acc[key] = [...(acc[key] ?? []), c]
    return acc
  }, {})

  return (
    <>
      <div className="sticky top-0 z-20 -mx-2 mb-6 bg-[#0B0B0C]/95 px-2 py-3 backdrop-blur">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search cases"
            className="min-h-[44px] flex-1 rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.3)] outline-none focus:border-[#1B6FD9]"
          />
          <button onClick={() => setFiltersOpen(true)} className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm font-medium text-[#F5F5F2]">
            Filters
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {pinned.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[#F5F5F2]">Pinned</h2>
            <div className="space-y-3">
              {pinned.map(c => <JournalCaseCard key={c.id} c={c} pinned />)}
            </div>
          </section>
        )}

        {Object.entries(grouped).map(([month, monthCases]) => (
          <section key={month} className="relative border-l border-white/[0.08] pl-5">
            <h2 className="sticky top-16 z-10 -ml-5 mb-3 bg-[#0B0B0C] py-1 pl-5 text-sm font-semibold text-[rgba(245,245,242,0.72)]">{month}</h2>
            <div className="space-y-3">
              {monthCases.map(c => <JournalCaseCard key={c.id} c={c} />)}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-10 text-center text-sm text-[rgba(245,245,242,0.45)]">No cases match those filters.</div>
        )}
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setFiltersOpen(false)}>
          <div className="h-full w-full max-w-md bg-[#141416] border-l border-white/[0.08] p-6 sm:rounded-l-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#F5F5F2]">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} className="min-h-[44px] px-3 text-[rgba(245,245,242,0.55)]">Close</button>
            </div>
            <div className="space-y-4">
              <Select label="Clinical area" value={domain} onChange={setDomain} options={domains} />
              <Select label="Linked specialty" value={specialty} onChange={setSpecialty} options={userInterests} />
              <label className="block text-xs font-medium uppercase tracking-wide text-[rgba(245,245,242,0.55)]">
                From
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1.5 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" />
              </label>
              <label className="block text-xs font-medium uppercase tracking-wide text-[rgba(245,245,242,0.55)]">
                To
                <input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1.5 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" />
              </label>
              <button onClick={() => { setDomain(''); setSpecialty(''); setFrom(''); setTo('') }} className="min-h-[44px] w-full rounded-lg border border-white/[0.08] text-sm text-[rgba(245,245,242,0.65)]">
                Clear filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wide text-[rgba(245,245,242,0.55)]">
      {label}
      <select value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]">
        <option value="">Any</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function JournalCaseCard({ c, pinned }: { c: Case; pinned?: boolean }) {
  return (
    <Link href={`/cases/${c.id}`} className="block rounded-2xl border border-white/[0.08] bg-[#141416] p-5 transition-colors hover:border-white/[0.16]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {pinned && <span className="rounded bg-[#1B6FD9]/15 px-2 py-0.5 text-[10px] font-medium text-[#1B6FD9]">Pinned</span>}
            <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-[rgba(245,245,242,0.55)]">{clinicalArea(c)}</span>
          </div>
          <h3 className="truncate text-base font-semibold text-[#F5F5F2]">{c.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[rgba(245,245,242,0.55)]">{firstSentence(c.notes)}</p>
        </div>
        <time className="shrink-0 text-xs text-[rgba(245,245,242,0.38)]">{new Date(c.date || c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
      </div>
    </Link>
  )
}
