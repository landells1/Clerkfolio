'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Case } from '@/lib/types/cases'
import SpecialtyTagSelect from '@/components/portfolio/specialty-tag-select'
import { useToast } from '@/components/ui/toast-provider'
import SwipeToDelete from '@/components/ui/swipe-to-delete'
import { formatSpecialtyLabel } from '@/lib/specialties'
import SpecialtyTag from '@/components/ui/specialty-tag'
import ListGroupHeader from '@/components/ui/list-group-header'
import { getSpecialtyColour, getCaseRowColour, colourClasses } from '@/lib/specialties/colours'

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

  // Active specialty chip filter (separate from the panel `specialty` to allow
  // the chip row above the list to drive a quick filter without opening the panel).
  const [chipSpecialty, setChipSpecialty] = useState<string>('')

  // Density preference - persisted to localStorage so it survives navigation.
  type Density = 'compact' | 'comfortable'
  const [density, setDensity] = useState<Density>('compact')
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('clerkfolio-cases-density') : null
    if (stored === 'compact' || stored === 'comfortable') setDensity(stored)
  }, [])
  function changeDensity(next: Density) {
    setDensity(next)
    try { window.localStorage.setItem('clerkfolio-cases-density', next) } catch {}
  }

  const filtered = useMemo(() => {
    return cases.filter(c => {
      if (domain && ![c.clinical_domain, ...(c.clinical_domains ?? [])].includes(domain)) return false
      if (specialty && !(c.specialty_tags ?? []).includes(specialty)) return false
      if (chipSpecialty && !(c.specialty_tags ?? []).includes(chipSpecialty)) return false
      if (from && c.date < from) return false
      if (to && c.date > to) return false
      return true
    })
  }, [cases, chipSpecialty, domain, from, specialty, to])

  // Counts per specialty across the (unchipped) result set, for the chip row.
  const specialtyCounts = useMemo(() => {
    const map = new Map<string, number>()
    cases.forEach(c => (c.specialty_tags ?? []).forEach(tag => map.set(tag, (map.get(tag) ?? 0) + 1)))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [cases])

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

  async function swipeTrash(c: Case) {
    const { error } = await supabase
      .from('cases')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', c.id)
    if (error) {
      addToast('Failed to trash case', 'error')
      return
    }
    addToast('Case moved to trash', 'success')
    router.refresh()
  }

  async function bulkAddTags() {
    if (bulkTags.length === 0) return
    setBusy(true)
    const { data: rows } = await supabase.from('cases').select('id, specialty_tags').in('id', Array.from(selected))
    const failures: string[] = []
    for (const row of rows ?? []) {
      const merged = Array.from(new Set([...(row.specialty_tags ?? []), ...bulkTags]))
      const { error } = await supabase.from('cases').update({ specialty_tags: merged }).eq('id', row.id)
      if (error) failures.push(row.id)
    }
    setBusy(false)
    if (failures.length > 0) {
      addToast(`Applied tags but ${failures.length} ${failures.length === 1 ? 'case' : 'cases'} failed`, 'error')
    } else {
      addToast(`Tags added to ${selected.size} ${selected.size === 1 ? 'case' : 'cases'}`, 'success')
    }
    setBulkTags([])
    setTagModalOpen(false)
    cancelSelect()
    router.refresh()
  }

  return (
    <>
      <div className="sticky top-0 z-20 -mx-2 mb-3 bg-[var(--bg-canvas)] px-2 py-3 backdrop-blur">
        <div className="flex justify-end gap-2">
          <div className="hidden sm:flex items-center rounded-lg border border-subtle bg-surface-1 p-0.5" role="group" aria-label="Row density">
            <button
              type="button"
              onClick={() => changeDensity('compact')}
              className={`h-10 px-3 text-xs font-medium rounded transition-colors ${density === 'compact' ? 'bg-surface-3 text-fg' : 'text-fg-2 hover:text-fg'}`}
              title="Compact rows"
              aria-pressed={density === 'compact'}
            >Compact</button>
            <button
              type="button"
              onClick={() => changeDensity('comfortable')}
              className={`h-10 px-3 text-xs font-medium rounded transition-colors ${density === 'comfortable' ? 'bg-surface-3 text-fg' : 'text-fg-2 hover:text-fg'}`}
              title="Comfortable rows"
              aria-pressed={density === 'comfortable'}
            >Roomy</button>
          </div>
          <button onClick={() => setFiltersOpen(true)} className="min-h-[44px] rounded-lg border border-subtle bg-surface-1 px-4 text-sm font-medium text-fg">
            Filters
          </button>
        </div>
      </div>

      {specialtyCounts.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setChipSpecialty('')}
            className={`inline-flex items-center gap-1.5 rounded text-[11px] px-2 py-0.5 border transition-colors ${chipSpecialty === '' ? 'bg-pill-blue border-pill-blue text-[var(--cat-blue-text)]' : 'bg-pill-neutral border-pill-neutral text-fg-1 hover:border-default'}`}
          >
            All
            <span className="text-fg-3 tabular-nums">{cases.length}</span>
          </button>
          {specialtyCounts.map(([key, count]) => {
            const c = colourClasses(getSpecialtyColour(key))
            const active = chipSpecialty === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setChipSpecialty(active ? '' : key)}
                className={`inline-flex items-center gap-1.5 rounded text-[11px] px-2 py-0.5 border transition-colors ${active ? `${c.bg} ${c.border} ${c.text}` : 'bg-pill-neutral border-pill-neutral text-fg-1 hover:border-default'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                {formatSpecialtyLabel(key)}
                <span className="text-fg-3 tabular-nums">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {selectMode && (
        <div className="mb-3 flex items-center justify-between">
          <button onClick={cancelSelect} className="text-xs font-medium text-[var(--accent-text)] hover:text-[var(--accent-bright)]">Cancel selection</button>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(new Set(filtered.map(c => c.id)))} className="text-xs text-[var(--accent-text)] hover:text-[var(--accent-bright)]">Select all</button>
            <span className="text-xs text-[var(--text-secondary)]">{selected.size} selected</span>
          </div>
        </div>
      )}
      {!selectMode && filtered.length > 0 && (
        <button onClick={() => setSelectMode(true)} className="mb-3 inline-flex min-h-[40px] items-center rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-[var(--text-secondary)] sm:hidden">
          Select cases
        </button>
      )}

      <div className="space-y-6">
        {pinned.length > 0 && (
          <section className="rounded-lg border border-subtle bg-surface-1 overflow-hidden">
            <ListGroupHeader label="Pinned" meta={`${pinned.length} ${pinned.length === 1 ? 'case' : 'cases'}`} />
            {pinned.map(c => (
              <SwipeToDelete key={c.id} disabled={selectMode} title="Move case to trash?" description={c.title} onConfirm={() => swipeTrash(c)}>
                <DenseCaseRow c={c} pinned density={density} selected={selected.has(c.id)} selectMode={selectMode} onToggle={() => toggleCase(c.id)} />
              </SwipeToDelete>
            ))}
          </section>
        )}

        {Object.entries(grouped).map(([month, monthCases]) => (
          <section key={month} className="rounded-lg border border-subtle bg-surface-1 overflow-hidden">
            <ListGroupHeader label={month} meta={`${monthCases.length} ${monthCases.length === 1 ? 'case' : 'cases'}`} />
            {monthCases.map(c => (
              <SwipeToDelete key={c.id} disabled={selectMode} title="Move case to trash?" description={c.title} onConfirm={() => swipeTrash(c)}>
                <DenseCaseRow c={c} density={density} selected={selected.has(c.id)} selectMode={selectMode} onToggle={() => toggleCase(c.id)} />
              </SwipeToDelete>
            ))}
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-lg border border-subtle bg-surface-1 p-10 text-center text-sm text-fg-2">No cases match those filters.</div>
        )}
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:justify-end" onClick={() => setFiltersOpen(false)}>
          <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-white/[0.08] bg-[var(--bg-surface)] p-6 sm:h-full sm:max-h-none sm:rounded-l-2xl sm:rounded-tr-none sm:border-l sm:border-t-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} className="min-h-[44px] px-3 text-[var(--text-secondary)]">Close</button>
            </div>
            <div className="space-y-4">
              <Select label="Clinical area" value={domain} onChange={setDomain} options={domains} />
              <Select label="Linked specialty" value={specialty} onChange={setSpecialty} options={userInterests} getOptionLabel={formatSpecialtyLabel} />
              <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
                From
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1.5 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]" />
              </label>
              <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
                To
                <input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1.5 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]" />
              </label>
              <button onClick={() => { setDomain(''); setSpecialty(''); setFrom(''); setTo('') }} className="min-h-[44px] w-full rounded-lg border border-white/[0.08] text-sm text-[var(--text-secondary)]">
                Clear filters
              </button>
            </div>
          </div>
        </div>
      )}

      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-20 left-3 right-3 z-40 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.1] bg-[var(--bg-raised)] px-4 py-3 shadow-2xl sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:flex-nowrap">
          <span className="mr-1 text-xs font-medium text-[var(--text-secondary)]">{selected.size} selected</span>
          <button onClick={() => setTagModalOpen(true)} className="rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]">Add tag</button>
          <button onClick={bulkTrash} disabled={busy} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 disabled:opacity-50">{busy ? 'Working...' : 'Move to trash'}</button>
          <button onClick={cancelSelect} className="ml-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Close</button>
        </div>
      )}

      {tagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setTagModalOpen(false)}>
          <div className="w-full max-w-sm rounded-t-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">Add specialty tag</h2>
            <p className="mb-3 text-xs text-[var(--text-muted)]">Adding to {selected.size} {selected.size === 1 ? 'case' : 'cases'}.</p>
            <SpecialtyTagSelect value={bulkTags} onChange={setBulkTags} userInterests={userInterests} trackedOnly />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setTagModalOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm text-[var(--text-secondary)]">Cancel</button>
              <button onClick={bulkAddTags} disabled={bulkTags.length === 0 || busy} className="flex-[2] rounded-xl bg-[var(--button-primary-bg)] py-2.5 text-sm font-semibold text-[var(--button-primary-text)] disabled:opacity-50">Apply</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Select({ label, value, onChange, options, getOptionLabel = option => option }: { label: string; value: string; onChange: (value: string) => void; options: string[]; getOptionLabel?: (value: string) => string }) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
      {label}
      <select value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]">
        <option value="">Any</option>
        {options.map(option => <option key={option} value={option}>{getOptionLabel(option)}</option>)}
      </select>
    </label>
  )
}

// Dense row variant of a case for the high-volume list. Keeps the existing
// swipe-to-delete + bulk-select wrapping intact via the parent.
// Density modes:
//   compact     - tight row, secondary line on hover only
//   comfortable - more vertical padding, secondary line always shown
function DenseCaseRow({ c, pinned, density = 'compact', selected, selectMode, onToggle }: { c: Case; pinned?: boolean; density?: 'compact' | 'comfortable'; selected: boolean; selectMode: boolean; onToggle: () => void }) {
  const primaryTag = c.specialty_tags?.[0]
  const dotColour = colourClasses(getCaseRowColour(c.specialty_tags, c.clinical_domain))
  const date = new Date(c.date || c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const padding = density === 'comfortable' ? 'py-3.5' : 'py-2.5'
  const secondaryClasses = density === 'comfortable'
    ? 'mt-1 text-xs text-fg-2 line-clamp-1'
    : 'mt-0.5 text-xs text-fg-2 line-clamp-1 hidden group-hover:block'
  return (
    <div className="group/row relative flex items-stretch">
      {/* Selection checkbox: hidden until hover unless selecting */}
      <button onClick={onToggle} className={`shrink-0 w-9 flex items-center justify-center transition-opacity ${selectMode || selected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`} aria-label={selected ? 'Deselect case' : 'Select case'}>
        <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-accent bg-accent' : 'border-fg-3 bg-surface-1'}`}>
          {selected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--bg-canvas)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
        </span>
      </button>
      <div className="flex-1 min-w-0">
        <Link href={`/cases/${c.id}`} className="block">
          <div className={`group flex items-center gap-3 px-3 ${padding} hover:bg-surface-3 border-b border-subtle last:border-b-0 transition-colors`}>
            <span className={`shrink-0 w-2 h-2 rounded-full ${dotColour.dot}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {pinned && (
                  <span className="text-[10px] font-medium text-[var(--accent-text)] uppercase tracking-wide">Pinned</span>
                )}
                <span className="text-sm text-fg truncate min-w-0">{c.title}</span>
                {primaryTag && <SpecialtyTag specialty={primaryTag} />}
                {c.specialty_tags && c.specialty_tags.length > 1 && (
                  <span className="text-[11px] text-fg-3">+{c.specialty_tags.length - 1}</span>
                )}
                <span className="text-[11px] text-fg-3 truncate">· {clinicalArea(c)}</span>
              </div>
              <div className={secondaryClasses}>
                {firstSentence(c.notes)}
              </div>
            </div>
            <time className="shrink-0 text-xs text-fg-3 tabular-nums">{date}</time>
            <svg className="shrink-0 w-3.5 h-3.5 text-fg-3 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      </div>
      {selectMode && <button onClick={onToggle} className="absolute inset-0 z-10" aria-label="Toggle case selection" />}
    </div>
  )
}
