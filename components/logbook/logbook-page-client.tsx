'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LogbookEntry, LogbookRole } from '@/lib/types/logbook'
import { LOGBOOK_ROLES } from '@/lib/types/logbook'
import { getSpecialtyConfig } from '@/lib/specialties'
import { LogbookFormModal } from './logbook-form-modal'

type Props = {
  entries: LogbookEntry[]
  trackedSpecialtyKeys: string[]
}

function getRoleStyle(role: LogbookRole) {
  return LOGBOOK_ROLES.find(r => r.value === role)?.colour
    ?? 'bg-white/[0.06] text-[rgba(245,245,242,0.45)] border border-white/[0.1]'
}

function getRoleShort(role: LogbookRole) {
  return LOGBOOK_ROLES.find(r => r.value === role)?.label ?? role
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

type RoleFilter = 'all' | 'Surgeon' | 'assist' | 'Observed'

export function LogbookPageClient({ entries: initialEntries, trackedSpecialtyKeys }: Props) {
  const supabase = createClient()
  const [entries, setEntries] = useState<LogbookEntry[]>(initialEntries)
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<LogbookEntry | undefined>()
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [specialtyFilter, setSpecialtyFilter] = useState('')

  function handleSave(saved: LogbookEntry) {
    setEntries(prev => {
      const exists = prev.find(e => e.id === saved.id)
      return exists
        ? prev.map(e => (e.id === saved.id ? saved : e))
        : [saved, ...prev]
    })
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this logbook entry? This cannot be undone.')) return
    const { error } = await supabase.from('logbook_entries').delete().eq('id', id)
    if (error) { alert('Failed to delete entry'); return }
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const filtered = useMemo(() => {
    return entries
      .filter(e => e.deleted_at === null)
      .filter(e => {
        if (roleFilter === 'all') return true
        if (roleFilter === 'assist') return ['First Assist', 'Second Assist', 'Scrubbed'].includes(e.role)
        return e.role === roleFilter
      })
      .filter(e => {
        if (!specialtyFilter.trim()) return true
        return e.surgical_specialty.toLowerCase().includes(specialtyFilter.toLowerCase())
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [entries, roleFilter, specialtyFilter])

  // Stats from all non-deleted entries
  const all = entries.filter(e => !e.deleted_at)
  const stats = {
    total: all.length,
    surgeon: all.filter(e => e.role === 'Surgeon').length,
    assist: all.filter(e => ['First Assist', 'Second Assist', 'Scrubbed'].includes(e.role)).length,
    observed: all.filter(e => e.role === 'Observed').length,
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F2] mb-1">Operative Logbook</h1>
          <p className="text-sm text-[rgba(245,245,242,0.4)]">Personal reflection notes — not a substitute for your official logbook</p>
        </div>
        <button
          onClick={() => { setEditEntry(undefined); setShowForm(true) }}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold text-sm rounded-xl transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Log Procedure
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, colour: 'text-[#F5F5F2]' },
          { label: 'As Surgeon', value: stats.surgeon, colour: 'text-[#1B6FD9]' },
          { label: 'Assisting', value: stats.assist, colour: 'text-purple-400' },
          { label: 'Observed', value: stats.observed, colour: 'text-[rgba(245,245,242,0.45)]' },
        ].map(s => (
          <div key={s.label} className="bg-[#141416] border border-white/[0.08] rounded-xl p-4">
            <p className="text-xs text-[rgba(245,245,242,0.4)] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.colour}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-[#141416] border border-white/[0.08] rounded-xl p-1">
          {([
            { value: 'all',     label: 'All' },
            { value: 'Surgeon', label: 'Surgeon' },
            { value: 'assist',  label: 'Assist' },
            { value: 'Observed',label: 'Observed' },
          ] as { value: RoleFilter; label: string }[]).map(f => (
            <button
              key={f.value}
              onClick={() => setRoleFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                roleFilter === f.value
                  ? 'bg-[#1B6FD9] text-[#0B0B0C]'
                  : 'text-[rgba(245,245,242,0.5)] hover:text-[#F5F5F2]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={specialtyFilter}
          onChange={e => setSpecialtyFilter(e.target.value)}
          placeholder="Filter by specialty…"
          className="bg-[#141416] border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors w-48"
        />
      </div>

      {/* Entry list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#141416] border border-white/[0.08] flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          {all.length === 0 ? (
            <>
              <p className="text-[#F5F5F2] font-medium mb-1">No procedures logged yet</p>
              <p className="text-xs text-[rgba(245,245,242,0.35)] max-w-xs leading-relaxed mb-4">
                Start building your personal reflective logbook. No patient data — just your role, the procedure, and what you learned.
              </p>
              <button
                onClick={() => { setEditEntry(undefined); setShowForm(true) }}
                className="text-sm text-[#1B6FD9] hover:text-[#155BB0] font-medium transition-colors"
              >
                Log your first procedure →
              </button>
            </>
          ) : (
            <p className="text-[rgba(245,245,242,0.4)] text-sm">No entries match your filters.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => (
            <LogbookEntryCard
              key={e.id}
              entry={e}
              onEdit={() => { setEditEntry(e); setShowForm(true) }}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <LogbookFormModal
          entry={editEntry}
          trackedSpecialtyKeys={trackedSpecialtyKeys}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function LogbookEntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: LogbookEntry
  onEdit: () => void
  onDelete: () => void
}) {
  const roleStyle = getRoleStyle(entry.role as LogbookRole)
  const roleLabel = getRoleShort(entry.role as LogbookRole)

  return (
    <div className="bg-[#141416] border border-white/[0.08] hover:border-white/[0.14] rounded-xl px-5 py-4 transition-all group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Top row: procedure + role badge */}
          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
            <span className="font-semibold text-[#F5F5F2] text-sm">{entry.procedure_name}</span>
            <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium ${roleStyle}`}>
              {roleLabel}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-[rgba(245,245,242,0.4)]">
            <span>{entry.surgical_specialty}</span>
            {entry.supervision && (
              <>
                <span className="text-white/[0.15]">·</span>
                <span>{entry.supervision}</span>
              </>
            )}
            {entry.supervisor_name && (
              <>
                <span className="text-white/[0.15]">·</span>
                <span>{entry.supervisor_name}</span>
              </>
            )}
          </div>

          {/* Learning points preview */}
          {entry.learning_points && (
            <p className="mt-1.5 text-xs text-[rgba(245,245,242,0.35)] leading-relaxed line-clamp-2">
              {entry.learning_points}
            </p>
          )}

          {/* Specialty tags */}
          {entry.specialty_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.specialty_tags.map(key => (
                <span
                  key={key}
                  className="px-2 py-0.5 rounded-md bg-[#1B6FD9]/10 text-[#1B6FD9] text-xs border border-[#1B6FD9]/20"
                >
                  {getSpecialtyConfig(key)?.name ?? key}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: date + actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-xs text-[rgba(245,245,242,0.35)]">{formatDate(entry.date)}</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[rgba(245,245,242,0.35)] hover:text-[#F5F5F2] hover:bg-white/[0.06] transition-all"
              aria-label="Edit"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[rgba(245,245,242,0.35)] hover:text-red-400 hover:bg-red-500/10 transition-all"
              aria-label="Delete"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
