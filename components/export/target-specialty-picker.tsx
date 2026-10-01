'use client'

import type { Dispatch, SetStateAction } from 'react'
import { formatSpecialtyLabel } from '@/lib/specialties'
import {
  ALL_RECORDS,
  UNTAGGED_RECORDS,
  exportScopeLabel,
  specialtyChipClass,
  type TagCount,
  type TrackedApp,
} from './shared'

// The optional "Target specialty" filter on the Application PDF tab (the
// Share tab has its own scope picker). Defaults to All records.
export function TargetSpecialtyPicker({
  specialty,
  setSpecialty,
  portfolioTags,
  trackedApps,
  trackedSpecialtyOptions,
  linkedOnlyOptions,
}: {
  specialty: string
  setSpecialty: Dispatch<SetStateAction<string>>
  portfolioTags: TagCount[]
  trackedApps: TrackedApp[]
  trackedSpecialtyOptions: Array<{ key: string; count: number }>
  linkedOnlyOptions: TagCount[]
}) {
  return (
    <div className="mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Target specialty</p>
      <p className="mb-3 mt-1 text-xs text-[var(--text-muted)]">Optional. Narrow the list below to entries tagged with one specialty, or keep All records.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { value: ALL_RECORDS, label: 'All records' },
          { value: UNTAGGED_RECORDS, label: 'Untagged' },
        ].map(option => (
          <button key={option.value} onClick={() => setSpecialty(option.value)} className={specialtyChipClass(specialty === option.value)}>
            {option.label}
          </button>
        ))}
      </div>
      {trackedSpecialtyOptions.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Tracked specialties</p>
          <div className="flex flex-wrap gap-2">
            {trackedSpecialtyOptions.map(({ key, count }) => (
              <button key={key} onClick={() => setSpecialty(current => current === key ? ALL_RECORDS : key)} className={specialtyChipClass(specialty === key)}>
                {formatSpecialtyLabel(key)} <span className="ml-1 text-xs opacity-60">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {linkedOnlyOptions.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-emphasis)]">Tagged in your entries</p>
          <div className="flex flex-wrap gap-2">
            {linkedOnlyOptions.map(({ tag, count }) => (
              <button key={tag} onClick={() => setSpecialty(current => current === tag ? ALL_RECORDS : tag)} className={specialtyChipClass(specialty === tag)}>
                {formatSpecialtyLabel(tag)} <span className="ml-1 text-xs opacity-60">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Show the formatted label when a tracked-specialty chip is active
          so the field doesn't leak raw slugs like 'acute_internal_medicine'.
          When the user types into the field we treat their input as a
          free-text override and store it verbatim - that's the slug we
          send to the API for filtering. */}
      <input
        value={specialty === ALL_RECORDS || specialty === UNTAGGED_RECORDS
          ? exportScopeLabel(specialty)
          : portfolioTags.some(t => t.tag === specialty) || trackedApps.some(a => a.specialty_key === specialty)
          ? formatSpecialtyLabel(specialty)
          : specialty}
        onChange={e => setSpecialty(e.target.value)}
        onFocus={e => e.currentTarget.select()}
        placeholder="Or type any specialty..."
        className="w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
      />
    </div>
  )
}
