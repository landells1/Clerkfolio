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

type EntryType = 'portfolio'

type Props = {
  domain: SpecialtyDomain
  applicationId: string
  specialtyName: string
  specialtyKey: string
  onClose: () => void
  onLinked: (link: SpecialtyEntryLink) => void
}

export function LogAndLinkModal({ domain, applicationId, specialtyName, specialtyKey, onClose, onLinked }: Props) {
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

  const noBands = domain.bands.length === 0
  const canSubmit = title.trim() !== '' && (noBands || selectedBand !== '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      let bandLabel: string
      let bandPoints: number
      if (noBands) {
        bandLabel = 'Evidence linked'
        bandPoints = 0
      } else {
        const band = domain.bands.find(b => b.label === selectedBand)
        if (!band) throw new Error('Band not found')
        bandLabel = band.label
        bandPoints = band.points
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        user_id: user.id,
        category,
        title: title.trim(),
        date,
        specialty_tags: [specialtyKey],
        notes: notes.trim() || null,
      }
      const { data: entry, error: entryError } = await supabase
        .from('portfolio_entries')
        .insert(payload)
        .select('id')
        .single()

      if (entryError) throw entryError
      if (!entry) throw new Error('Failed to create portfolio entry')

      const { data: link, error: linkError } = await supabase
        .from('specialty_entry_links')
        .insert({
          application_id: applicationId,
          domain_key: domain.key,
          entry_id: entry.id,
          entry_type: 'portfolio',
          band_label: bandLabel,
          points_claimed: bandPoints,
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
      setError('We could not log and link this evidence. Check the details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Log &amp; link evidence</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{domain.label}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-all"
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
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-[var(--text-primary)] font-medium">Entry logged and linked!</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Closing…</p>
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
                <label className="text-xs text-[var(--text-emphasis)] font-medium uppercase tracking-wide mb-1.5 block">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  required
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. National conference oral presentation"
                  className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs text-[var(--text-emphasis)] font-medium uppercase tracking-wide mb-1.5 block">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              {/* Entry type */}
              <div>
                <label className="text-xs text-[var(--text-emphasis)] font-medium uppercase tracking-wide mb-1.5 block">
                  Entry type
                </label>
                <div className="flex gap-2">
                  {(['portfolio'] as EntryType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEntryType(t)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        entryType === t
                          ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border-accent/30'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-white/[0.08] hover:border-white/[0.16]'
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
                  <label className="text-xs text-[var(--text-emphasis)] font-medium uppercase tracking-wide mb-1.5 block">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as Category)}
                    className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                  >
                    {PORTFOLIO_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Auto-tag */}
              <div>
                <label className="text-xs text-[var(--text-emphasis)] font-medium uppercase tracking-wide mb-1.5 block">
                  Auto-tagged
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-text)] text-xs font-medium border border-accent/30">
                    {specialtyName}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-[var(--text-emphasis)] font-medium uppercase tracking-wide mb-1.5 block">
                  Notes <span className="text-[var(--text-secondary)]">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional details…"
                  className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                />
              </div>

              {/* Band selection - hidden for evidence-only domains */}
              {!noBands && (
                <div>
                  <label className="text-xs text-[var(--text-emphasis)] font-medium uppercase tracking-wide mb-1.5 block">
                    Scoring band <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedBand}
                    onChange={e => setSelectedBand(e.target.value)}
                    required
                    className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                  >
                    <option value="">Select the scoring band this evidence qualifies for…</option>
                    {domain.bands.map(band => (
                      <option key={band.label} value={band.label}>
                        {band.label} ({band.points} pts)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="p-6 border-t border-white/[0.08] shrink-0">
            <button
              type="submit"
              form="log-link-form"
              disabled={!canSubmit || submitting}
              className="w-full py-2.5 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-40 text-[var(--button-primary-text)] font-semibold text-sm rounded-xl transition-colors"
            >
              {submitting ? 'Saving…' : 'Log & link evidence'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
