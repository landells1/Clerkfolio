'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LOGBOOK_ROLES,
  LOGBOOK_SUPERVISION,
  SURGICAL_SPECIALTIES,
} from '@/lib/types/logbook'
import type { LogbookEntry, LogbookRole, LogbookSupervision } from '@/lib/types/logbook'
import { getSpecialtyConfig } from '@/lib/specialties'

type Props = {
  entry?: LogbookEntry
  trackedSpecialtyKeys: string[]
  onClose: () => void
  onSave: (entry: LogbookEntry) => void
}

export function LogbookFormModal({ entry, trackedSpecialtyKeys, onClose, onSave }: Props) {
  const supabase = createClient()
  const panelRef = useRef<HTMLDivElement>(null)

  const [date, setDate] = useState(entry?.date ?? new Date().toISOString().slice(0, 10))
  const [procedureName, setProcedureName] = useState(entry?.procedure_name ?? '')
  const [surgicalSpecialty, setSurgicalSpecialty] = useState(entry?.surgical_specialty ?? '')
  const [role, setRole] = useState<LogbookRole>(entry?.role ?? 'Observed')
  const [supervision, setSupervision] = useState<LogbookSupervision | ''>(entry?.supervision ?? '')
  const [supervisorName, setSupervisorName] = useState(entry?.supervisor_name ?? '')
  const [learningPoints, setLearningPoints] = useState(entry?.learning_points ?? '')
  const [specialtyTags, setSpecialtyTags] = useState<string[]>(entry?.specialty_tags ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable[0]?.focus()
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function toggleTag(key: string) {
    setSpecialtyTags(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!procedureName.trim() || !surgicalSpecialty.trim()) return
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        user_id: user.id,
        date,
        procedure_name: procedureName.trim(),
        surgical_specialty: surgicalSpecialty.trim(),
        role,
        supervision: supervision || null,
        supervisor_name: supervisorName.trim() || null,
        learning_points: learningPoints.trim() || null,
        specialty_tags: specialtyTags,
      }

      if (entry) {
        const { data, error: err } = await supabase
          .from('logbook_entries')
          .update(payload)
          .eq('id', entry.id)
          .select()
          .single()
        if (err) throw err
        onSave(data as LogbookEntry)
      } else {
        const { data, error: err } = await supabase
          .from('logbook_entries')
          .insert({ ...payload, pinned: false })
          .select()
          .single()
        if (err) throw err
        onSave(data as LogbookEntry)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[6vh] bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logbook-form-title"
        className="bg-[#141416] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <h2 id="logbook-form-title" className="text-lg font-semibold text-[#F5F5F2]">
            {entry ? 'Edit Procedure' : 'Log Procedure'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] hover:bg-white/[0.06] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[76vh]">
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Disclaimer */}
          <div className="px-3 py-2.5 bg-amber-500/8 border border-amber-500/15 rounded-xl flex items-start gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400/80 shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-xs text-amber-400/70 leading-relaxed">
              Personal reflection notes only — do not include patient-identifiable information. Not a substitute for your official logbook (eLogbook/ISCP).
            </p>
          </div>

          {/* Date + Procedure name */}
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Procedure</label>
              <input
                type="text"
                value={procedureName}
                onChange={e => setProcedureName(e.target.value)}
                placeholder="e.g. Laparoscopic appendicectomy"
                required
                className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.2)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
              />
            </div>
          </div>

          {/* Surgical specialty */}
          <div>
            <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Surgical Specialty</label>
            <input
              type="text"
              list="surgical-specialties"
              value={surgicalSpecialty}
              onChange={e => setSurgicalSpecialty(e.target.value)}
              placeholder="e.g. General Surgery"
              required
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.2)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
            />
            <datalist id="surgical-specialties">
              {SURGICAL_SPECIALTIES.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-2 uppercase tracking-wide">Your Role</label>
            <div className="flex flex-wrap gap-2">
              {LOGBOOK_ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    role === r.value ? r.colour : 'bg-white/[0.04] text-[rgba(245,245,242,0.4)] border border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Supervision */}
          <div>
            <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Supervision Level <span className="text-[rgba(245,245,242,0.3)] normal-case font-normal tracking-normal">(optional)</span></label>
            <select
              value={supervision}
              onChange={e => setSupervision(e.target.value as LogbookSupervision | '')}
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors"
            >
              <option value="">— Not specified</option>
              {LOGBOOK_SUPERVISION.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Supervisor name */}
          <div>
            <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Supervisor Name <span className="text-[rgba(245,245,242,0.3)] normal-case font-normal tracking-normal">(optional)</span></label>
            <input
              type="text"
              value={supervisorName}
              onChange={e => setSupervisorName(e.target.value)}
              placeholder="e.g. Mr Smith"
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.2)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
            />
          </div>

          {/* Learning points */}
          <div>
            <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Learning Points / Reflection <span className="text-[rgba(245,245,242,0.3)] normal-case font-normal tracking-normal">(optional)</span></label>
            <textarea
              value={learningPoints}
              onChange={e => setLearningPoints(e.target.value)}
              rows={3}
              placeholder="Key learning, complications encountered, areas to improve…"
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.2)] focus:outline-none focus:border-[#1B6FD9] transition-colors resize-none"
            />
          </div>

          {/* Specialty tags */}
          {trackedSpecialtyKeys.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-2 uppercase tracking-wide">Tag to Applications <span className="text-[rgba(245,245,242,0.3)] normal-case font-normal tracking-normal">(optional)</span></label>
              <div className="flex flex-wrap gap-1.5">
                {trackedSpecialtyKeys.map(key => {
                  const name = getSpecialtyConfig(key)?.name ?? key
                  const active = specialtyTags.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleTag(key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? 'bg-[#1B6FD9]/15 text-[#1B6FD9] border border-[#1B6FD9]/25'
                          : 'bg-white/[0.04] text-[rgba(245,245,242,0.4)] border border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-[rgba(245,245,242,0.6)] text-sm font-medium hover:border-white/[0.16] hover:text-[#F5F5F2] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !procedureName.trim() || !surgicalSpecialty.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] text-sm font-semibold transition-colors"
            >
              {saving ? 'Saving…' : entry ? 'Save Changes' : 'Log Procedure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
