'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Case } from '@/lib/types/cases'
import SpecialtyTagSelect from '@/components/portfolio/specialty-tag-select'
import { useToast } from '@/components/ui/toast-provider'

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
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [bulkTags, setBulkTags] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
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

  function toggleCase(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      setSelectMode(next.size > 0)
      return next
    })
  }

  function cancelSelect() {
    setSelected(new Set())
    setSelectMode(false)
  }

  async function bulkTrash() {
    if (!confirm(`Move ${selected.size} ${selected.size === 1 ? 'case' : 'cases'} to trash?`)) return
    setBusy(true)
    const { error } = await supabase.from('cases').update({ deleted_at: new Date().toISOString() }).in('id', Array.from(selected))
    setBusy(false)
    if (error) {
      addToast('Failed to trash cases', 'error')
      return
    }
    addToast(`${selected.size} ${selected.size === 1 ? 'case' : 'cases'} moved to trash`, 'success')
    cancelSelect()
    router.refresh()
  }

  async function bulkAddTags() {
    if (bulkTags.length === 0) return
    setBusy(true)
    const { data: rows } = await supabase.from('cases').select('id, specialty_tags').in('id', Array.from(selected))
    for (const row of rows ?? []) {
      const merged = Array.from(new Set([...(row.specialty_tags ?? []), ...bulkTags]))
      await supabase.from('cases').update({ specialty_tags: merged }).eq('id', row.id)
    }
    setBusy(false)
    addToast(`Tags added to ${selected.size} ${selected.size === 1 ? 'case' : 'cases'}`, 'success')
    setBulkTags([])
    setTagModalOpen(false)
    cancelSelect()
    router.refresh()
  }

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

      {selectMode && (
        <div className="mb-3 flex items-center justify-between">
          <button onClick={cancelSelect} className="text-xs font-medium text-[#1B6FD9] hover:text-[#3884DD]">Cancel selection</button>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(new Set(filtered.map(c => c.id)))} className="text-xs text-[#1B6FD9] hover:text-[#3884DD]">Select all</button>
            <span className="text-xs text-[rgba(245,245,242,0.35)]">{selected.size} selected</span>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {pinned.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[#F5F5F2]">Pinned</h2>
            <div className="space-y-3">
              {pinned.map(c => <JournalCaseCard key={c.id} c={c} pinned selected={selected.has(c.id)} selectMode={selectMode} onToggle={() => toggleCase(c.id)} />)}
            </div>
          </section>
        )}

        {Object.entries(grouped).map(([month, monthCases]) => (
          <section key={month} className="relative border-l border-white/[0.08] pl-5">
            <h2 className="sticky top-16 z-10 -ml-5 mb-3 bg-[#0B0B0C] py-1 pl-5 text-sm font-semibold text-[rgba(245,245,242,0.72)]">{month}</h2>
            <div className="space-y-3">
              {monthCases.map(c => <JournalCaseCard key={c.id} c={c} selected={selected.has(c.id)} selectMode={selectMode} onToggle={() => toggleCase(c.id)} />)}
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

      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/[0.1] bg-[#1B1B1E] px-4 py-3 shadow-2xl">
          <span className="mr-1 text-xs font-medium text-[rgba(245,245,242,0.6)]">{selected.size} selected</span>
          <button onClick={() => setTagModalOpen(true)} className="rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-[rgba(245,245,242,0.8)]">Add tag</button>
          <button onClick={bulkTrash} disabled={busy} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 disabled:opacity-50">{busy ? 'Working...' : 'Move to trash'}</button>
          <button onClick={cancelSelect} className="ml-1 text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2]">Close</button>
        </div>
      )}

      {tagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setTagModalOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#141416] p-6" onClick={e => e.stopPropagation()}>
            <h2 className="mb-2 text-base font-semibold text-[#F5F5F2]">Add specialty tag</h2>
            <p className="mb-3 text-xs text-[rgba(245,245,242,0.4)]">Adding to {selected.size} {selected.size === 1 ? 'case' : 'cases'}.</p>
            <SpecialtyTagSelect value={bulkTags} onChange={setBulkTags} userInterests={userInterests} trackedOnly />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setTagModalOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm text-[rgba(245,245,242,0.55)]">Cancel</button>
              <button onClick={bulkAddTags} disabled={bulkTags.length === 0 || busy} className="flex-[2] rounded-xl bg-[#1B6FD9] py-2.5 text-sm font-semibold text-[#0B0B0C] disabled:opacity-50">Apply</button>
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

function JournalCaseCard({ c, pinned, selected, selectMode, onToggle }: { c: Case; pinned?: boolean; selected: boolean; selectMode: boolean; onToggle: () => void }) {
  return (
    <div className="group/row flex items-stretch">
      <button onClick={onToggle} className={`w-10 shrink-0 transition-opacity ${selectMode || selected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`} aria-label={selected ? 'Deselect case' : 'Select case'}>
        <span className={`mx-auto flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-[#1B6FD9] bg-[#1B6FD9]' : 'border-white/[0.3] bg-[#141416]'}`}>
          {selected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
        </span>
      </button>
      <div className="relative flex-1">
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
        {selectMode && <button onClick={onToggle} className="absolute inset-0 z-10" aria-label="Toggle case selection" />}
      </div>
    </div>
  )
}
