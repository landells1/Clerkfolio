'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SpecialtyDomain, SpecialtyEntryLink } from '@/lib/specialties'
import type { Category } from '@/lib/types/portfolio'

const PORTFOLIO_CATEGORIES: { value: Category; label: string }[] = [
  { value: 'audit_qip', label: 'Audit & QIP' },
  { value: 'teaching', label: 'Teaching & Presentations' },
  { value: 'conference', label: 'Conferences & Courses' },
  { value: 'publication', label: 'Publications & Research' },
  { value: 'leadership', label: 'Leadership & Societies' },
  { value: 'prize', label: 'Prizes & Awards' },
  { value: 'procedure', label: 'Procedures & Clinical Skills' },
  { value: 'reflection', label: 'Reflections & CBDs/DOPs' },
  { value: 'custom', label: 'Custom' },
]

type EntryType = 'portfolio' | 'case'

type Props = {
  domain: SpecialtyDomain
  applicationId: string
  specialtyName: string
  onClose: () => void
  onLinked: (link: SpecialtyEntryLink) => void
}

export function LogAndLinkModal({ domain, applicationId, specialtyName, onClose, onLinked }: Props) {
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [entryType, setEntryType] = useState<EntryType>('portfolio')
  const [category, setCategory] = useState<Category>('custom')
  const [notes, setNotes] = useState('')
  const [selectedBand, setSelectedBand] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !selectedBand) return
    setSubmitting(true)
    setError(null)

    try {
      const band = domain.bands.find(b => b.label === selectedBand)
      if (!band) throw new Error('Band not found')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let entryId: string

      if (entryType === 'portfolio') {
        const { data: entry, error: entryError } = await supabase
          .from('portfolio_entries')
          .insert({
            user_id: user.id,
            category,
            title: title.trim(),
            date,
            specialty_tags: [specialtyName],
            notes: notes.trim() || null,
          })
          .select('id')
          .single()

        if (entryError) throw entryError
        if (!entry) throw new Error('Failed to create portfolio entry')
        entryId = entry.id
      } else {
        const { data: caseEntry, error: caseError } = await supabase
          .from('cases')
          .insert({
            user_id: user.id,
            title: title.trim(),
            date,
            specialty_tags: [specialtyName],
            notes: notes.trim() || null,
            clinical_domain: null,
          })
          .select('id')
          .single()

        if (caseError) throw caseError
        if (!caseEntry) throw new Error('Failed to create case')
        entryId = caseEntry.id
      }

      const { data: link, error: linkError } = await supabase
        .from('specialty_entry_links')
        .insert({
          application_id: applicationId,
          domain_key: domain.key,
          entry_id: entryId,
          entry_type: entryType,
          band_label: band.label,
          points_claimed: band.points,
          is_checkbox: false,
        })
        .select()
        .single()

      if (linkError) throw linkError
      if (!link) throw new Error('Failed to create link')

      setSuccess(true)
      setTimeout(() => {
        onLinked(link as SpecialtyEntryLink)
      }, 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log entry')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141416] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F2]">Log &amp; link evidence</h2>
            <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5">{domain.label}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] hover:bg-white/[0.06] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#1B6FD9]/20 flex items-center justify-center mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-[#F5F5F2] font-medium">Entry logged and linked!</p>
              <p className="text-xs text-[rgba(245,245,242,0.4)] mt-1">Closing…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" id="log-link-form">
              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide mb-1.5 block">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  required
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. National conference oral presentation"
                  className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide mb-1.5 block">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors"
                />
              </div>

              {/* Entry type */}
              <div>
                <label className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide mb-1.5 block">
                  Entry type
                </label>
                <div className="flex gap-2">
                  {(['portfolio', 'case'] as EntryType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEntryType(t)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        entryType === t
                          ? 'bg-[#1B6FD9]/15 text-[#1B6FD9] border-[#1B6FD9]/25'
                          : 'bg-[#0B0B0C] text-[rgba(245,245,242,0.5)] border-white/[0.08] hover:border-white/[0.16]'
                      }`}
                    >
                      {t === 'portfolio' ? '📄 Portfolio Entry' : '💼 Case'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category (portfolio only) */}
              {entryType === 'portfolio' && (
                <div>
                  <label className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide mb-1.5 block">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as Category)}
                    className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors appearance-none"
                  >
                    {PORTFOLIO_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Auto-tag */}
              <div>
                <label className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide mb-1.5 block">
                  Auto-tagged
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-[#1B6FD9]/15 text-[#1B6FD9] text-xs font-medium border border-[#1B6FD9]/20">
                    {specialtyName}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide mb-1.5 block">
                  Notes <span className="text-[rgba(245,245,242,0.25)]">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional details…"
                  className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors resize-none"
                />
              </div>

              {/* Band selection */}
              <div>
                <label className="text-xs text-[rgba(245,245,242,0.4)] font-medium uppercase tracking-wide mb-1.5 block">
                  Scoring band <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedBand}
                  onChange={e => setSelectedBand(e.target.value)}
                  required
                  className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors appearance-none"
                >
                  <option value="">Select the scoring band this evidence qualifies for…</option>
                  {domain.bands.map(band => (
                    <option key={band.label} value={band.label}>
                      {band.label} ({band.points} pts)
                    </option>
                  ))}
                </select>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="p-6 border-t border-white/[0.08] shrink-0">
            <button
              type="submit"
              form="log-link-form"
              disabled={!title.trim() || !selectedBand || submitting}
              className="w-full py-2.5 bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-40 text-[#0B0B0C] font-semibold text-sm rounded-xl transition-colors"
            >
              {submitting ? 'Saving…' : 'Log & link evidence'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
