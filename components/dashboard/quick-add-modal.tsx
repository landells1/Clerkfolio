'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'
import { createClient } from '@/lib/supabase/client'
import SpecialtyTagSelect, { type SpecialtyTagSelectHandle } from '@/components/portfolio/specialty-tag-select'
import ClinicalAreaSelect from '@/components/cases/clinical-area-select'
import { suggestTagsForText } from '@/lib/heuristics/tag-suggester'
import { useToast } from '@/components/ui/toast-provider'
import { TEACHING_TYPE_LABELS, TEACHING_AUDIENCE_LABELS, REFL_TYPE_SHORT_LABELS } from '@/lib/types/portfolio-labels'

const INPUT = 'w-full bg-surface-0 border border-subtle rounded-lg px-3.5 py-2.5 text-sm text-fg placeholder-fg-2 focus:outline-none focus:border-strong transition-colors'
const TEXTAREA = 'w-full bg-surface-0 border border-subtle rounded-lg px-3.5 py-2.5 text-sm text-fg placeholder-fg-2 focus:outline-none focus:border-strong transition-colors resize-none'
const LABEL = 'block text-xs font-medium text-fg-2 mb-1.5 uppercase tracking-wide'

// 8 entry types per redesign spec. Cases save to `cases`; everything else to
// `portfolio_entries` under the matching category.
type EntryType = 'case' | 'teaching' | 'audit_qip' | 'conference' | 'publication' | 'procedure' | 'reflection' | 'leadership'

type TypeMeta = {
  id: EntryType
  label: string
  description: string
  // Tailwind colour family used for the icon tile background.
  colour: 'blue' | 'violet' | 'green' | 'amber' | 'rose' | 'cyan' | 'pink' | 'indigo'
  // Inline SVG path data for the icon (24x24 viewBox, stroke-based).
  icon: React.ReactNode
}

const ICONS = {
  case: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  teaching: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  audit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-5" />
    </svg>
  ),
  conference: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17 11h.01M11 7h.01M21 12c0 4.97-4.03 9-9 9-1.5 0-2.91-.37-4.15-1.02L3 21l1.02-4.85C3.37 14.91 3 13.5 3 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" />
    </svg>
  ),
  publication: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  procedure: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M14.5 2L20 8l-7 7-3-3 1-1-1-1 1-1-1-1 1-1 1 1 1-1 1 1 1-1z" /><path d="M2 22l3-3" />
    </svg>
  ),
  reflection: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  leadership: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="8" r="4" /><path d="M2 22a8 8 0 0 1 20 0" />
    </svg>
  ),
}

const TYPES: TypeMeta[] = [
  { id: 'case',        label: 'Case',         description: 'Anonymised clinical entry',  colour: 'blue',   icon: ICONS.case },
  { id: 'teaching',    label: 'Teaching',     description: 'Session, talk, or poster',   colour: 'violet', icon: ICONS.teaching },
  { id: 'audit_qip',   label: 'Audit / QIP',  description: 'Audit cycle or improvement', colour: 'green',  icon: ICONS.audit },
  { id: 'conference',  label: 'Conference',   description: 'Attended or presented',      colour: 'cyan',   icon: ICONS.conference },
  { id: 'publication', label: 'Publication',  description: 'Paper, abstract, chapter',   colour: 'indigo', icon: ICONS.publication },
  { id: 'procedure',   label: 'Procedure',    description: 'Clinical skill or DOPS',     colour: 'rose',   icon: ICONS.procedure },
  { id: 'reflection',  label: 'Reflection',   description: 'CBD, mini-CEX or note',      colour: 'amber',  icon: ICONS.reflection },
  { id: 'leadership',  label: 'Leadership',   description: 'Role or committee work',     colour: 'pink',   icon: ICONS.leadership },
]

const TEACHING_TYPES = ['taught_session', 'grand_round', 'poster', 'oral']
const TEACHING_AUDIENCES = ['students', 'peers', 'consultants', 'public']
const REFLECTION_TYPES = ['cbd', 'dop', 'mini_cex', 'reflection']
const SUPERVISION_LEVELS: { id: string; label: string }[] = [
  { id: 'supervised', label: 'Supervised' },
  { id: 'unsupervised', label: 'Unsupervised' },
]

// Pill colour name -> tailwind classes for the type-tile icon backgrounds.
// Picked manually so JIT generates them; safelisted in tailwind.config.ts already.
const TILE_BG: Record<TypeMeta['colour'], string> = {
  blue: 'bg-pill-blue text-[var(--cat-blue-text)] border-pill-blue',
  violet: 'bg-pill-violet text-[var(--cat-violet-text)] border-pill-violet',
  green: 'bg-pill-green text-[var(--cat-green-text)] border-pill-green',
  amber: 'bg-pill-amber text-[var(--warning)] border-pill-amber',
  rose: 'bg-pill-rose text-[var(--cat-rose-text)] border-pill-rose',
  cyan: 'bg-pill-cyan text-[var(--cat-cyan-text)] border-pill-cyan',
  pink: 'bg-pill-pink text-[var(--cat-pink-text)] border-pill-pink',
  indigo: 'bg-pill-indigo text-[var(--cat-indigo-text)] border-pill-indigo',
}

export default function QuickAddModal({
  onClose,
  userInterests = [],
  initialValues,
}: {
  onClose: () => void
  userInterests?: string[]
  initialValues?: { type?: EntryType; domain?: string; domains?: string[]; tags?: string[] }
}) {
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(true, panelRef, onClose)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Two-step flow: 'pick' shows the 2x4 grid; 'form' shows the entry form.
  // If initialValues.type is provided we skip the picker (deep-link in).
  const [step, setStep] = useState<'pick' | 'form'>(initialValues?.type ? 'form' : 'pick')
  const [type, setType] = useState<EntryType>(initialValues?.type ?? 'case')
  const meta = TYPES.find(t => t.id === type)!

  // Shared fields
  const [title, setTitle] = useState('')
  // Init empty to avoid SSR/client hydration mismatch when modal renders across
  // UTC midnight. Today's date is filled in by the post-mount useEffect below.
  const [date, setDate] = useState('')
  useEffect(() => {
    setDate(current => current || new Date().toISOString().split('T')[0])
  }, [])
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? [])

  // Case-specific - prefer domains[] array, fall back to single domain string
  const [domains, setDomains] = useState<string[]>(
    initialValues?.domains?.length
      ? initialValues.domains
      : initialValues?.domain ? [initialValues.domain] : []
  )

  // Teaching-specific
  const [teachingType, setTeachingType] = useState(TEACHING_TYPES[0])
  const [teachingAudience, setTeachingAudience] = useState(TEACHING_AUDIENCES[0])

  // Reflection-specific
  const [reflType, setReflType] = useState(REFLECTION_TYPES[0])
  const [reflFreeText, setReflFreeText] = useState('')

  // Procedure-specific
  const [procName, setProcName] = useState('')
  const [procSupervision, setProcSupervision] = useState('supervised')
  const [procCount, setProcCount] = useState<number>(1)

  // Shared notes/comments
  const [notes, setNotes] = useState('')

  // Auto-tag suggestions
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])

  // Duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState<{ title: string; date: string } | null>(null)
  const dupCheckVersion = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (title.trim().length < 3) { setSuggestedTags([]); return }
      setSuggestedTags(suggestTagsForText(title, tags))
    }, 400)
    return () => clearTimeout(timer)
  }, [title, tags])

  async function checkDuplicate(val: string) {
    if (val.trim().length < 4) { setDuplicateWarning(null); return }
    const version = ++dupCheckVersion.current
    const { data } = await supabase
      .from('cases')
      .select('title, date')
      .ilike('title', `%${val.trim()}%`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
    if (version === dupCheckVersion.current && data && data.length > 0) {
      setDuplicateWarning({ title: data[0].title, date: data[0].date })
    }
  }

  function pickType(t: EntryType) {
    setType(t)
    setError(null)
    setStep('form')
  }

  const specialtyRef = useRef<SpecialtyTagSelectHandle | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    if (type === 'procedure' && !procName.trim()) { setError('Procedure name is required.'); return }
    const pendingTagError = specialtyRef.current?.commitPending()
    if (pendingTagError) { setError(pendingTagError); return }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (type === 'case') {
      const casePayload = {
        title: title.trim(),
        date,
        clinical_domain: domains[0] ?? null,
        clinical_domains: domains,
        specialty_tags: tags,
        notes: notes.trim() || null,
      }
      const { error: err } = await supabase.from('cases').insert({
        user_id: user.id,
        ...casePayload,
      })
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      // All non-case types map to a portfolio_entries row with the matching
      // category. Type-specific fields populate where relevant.
      const base = {
        category: type,
        title: title.trim(),
        date,
        specialty_tags: tags,
        notes: notes.trim() || null,
      }

      let extra: Record<string, unknown> = {}
      if (type === 'teaching') {
        extra = { teaching_type: teachingType, teaching_audience: teachingAudience }
      } else if (type === 'reflection') {
        extra = { refl_type: reflType, refl_free_text: reflFreeText.trim() || null }
      } else if (type === 'procedure') {
        extra = {
          proc_name: procName.trim() || null,
          proc_supervision: procSupervision,
          proc_count: procCount,
        }
      }

      const merged = { ...base, ...extra }
      const { error: err } = await supabase.from('portfolio_entries').insert({
        user_id: user.id,
        ...merged,
      })
      if (err) { setError(err.message); setSaving(false); return }
    }

    router.refresh()
    addToast(type === 'case' ? 'Case logged' : 'Entry saved', 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Quick log" tabIndex={-1} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-subtle bg-surface-2 p-6 shadow-modal transition-transform sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3 min-w-0">
            {step === 'form' && (
              <button
                onClick={() => setStep('pick')}
                className="text-fg-2 hover:text-fg transition-colors -ml-1"
                aria-label="Back to type picker"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-fg truncate">
                {step === 'pick' ? 'Quick log' : `New ${meta.label.toLowerCase()}`}
              </h2>
              <p className="text-xs text-fg-2 mt-0.5 truncate">
                {step === 'pick' ? 'Choose what you are logging' : meta.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-fg-2 hover:text-fg transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {step === 'pick' ? (
          /* Step 1: 2 x 4 type picker */
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => pickType(t.id)}
                className="group flex items-start gap-3 text-left p-3 rounded-lg border border-subtle bg-surface-1 hover:border-default hover:bg-surface-3 transition-colors"
              >
                <span className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded border ${TILE_BG[t.colour]}`}>
                  {t.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg leading-tight">{t.label}</span>
                  <span className="block text-[11px] text-fg-2 mt-0.5 leading-snug">{t.description}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          /* Step 2: form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className={LABEL}>
                {type === 'case' ? 'Case title' : `${meta.label} title`}{' '}
                <span className="text-[var(--cat-rose-text)]">*</span>
              </label>
              <input
                autoFocus
                type="text"
                required
                value={title}
                maxLength={200}
                onChange={e => { setTitle(e.target.value); setDuplicateWarning(null) }}
                onBlur={() => type === 'case' && checkDuplicate(title)}
                className={INPUT}
                placeholder={
                  type === 'case'
                    ? 'Brief description - no patient identifiers'
                    : type === 'teaching'
                    ? 'e.g. Cardiology teaching session'
                    : type === 'reflection'
                    ? 'e.g. Learning from a difficult conversation'
                    : type === 'procedure'
                    ? 'e.g. Central line insertion'
                    : type === 'audit_qip'
                    ? 'e.g. Reduce time-to-antibiotic in sepsis'
                    : type === 'conference'
                    ? 'e.g. RCP Annual Conference 2026'
                    : type === 'publication'
                    ? 'e.g. Case report in BJM'
                    : 'e.g. Foundation rep, audit lead'
                }
              />
              {(type === 'case' || type === 'reflection' || type === 'procedure') && (
                <p className="mt-1.5 text-xs text-fg-2">Anonymised entries only - no patient identifiers</p>
              )}

              {suggestedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-fg-2 self-center">Suggested:</span>
                  {suggestedTags.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTags(prev => [...prev, t]); setSuggestedTags(prev => prev.filter(s => s !== t)) }}
                      className="px-2 py-0.5 rounded text-[10px] bg-pill-blue border border-pill-blue text-[var(--cat-blue-text)] hover:border-default transition-colors"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              )}

              {duplicateWarning && (
                <div className="flex items-start gap-2 bg-pill-amber border border-pill-amber rounded-lg px-3 py-2 text-xs text-[var(--warning)] mt-1.5">
                  <svg className="shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span className="flex-1">Similar case already logged: &ldquo;{duplicateWarning.title}&rdquo;</span>
                  <button type="button" onClick={() => setDuplicateWarning(null)} className="text-[var(--warning)] hover:text-[var(--warning)] ml-1">x</button>
                </div>
              )}
            </div>

            {/* Date (and clinical area for cases) */}
            <div className={type === 'case' ? 'grid grid-cols-2 gap-3' : ''}>
              <div>
                <label className={LABEL}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={INPUT}
                />
              </div>
              {type === 'case' && (
                <div>
                  <label className={LABEL}>Clinical area</label>
                  <ClinicalAreaSelect value={domains} onChange={setDomains} />
                </div>
              )}
            </div>

            {/* Teaching */}
            {type === 'teaching' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Teaching type</label>
                  <select value={teachingType} onChange={e => setTeachingType(e.target.value)} className={INPUT}>
                    {TEACHING_TYPES.map(t => <option key={t} value={t}>{TEACHING_TYPE_LABELS[t] ?? t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Audience</label>
                  <select value={teachingAudience} onChange={e => setTeachingAudience(e.target.value)} className={INPUT}>
                    {TEACHING_AUDIENCES.map(a => <option key={a} value={a}>{TEACHING_AUDIENCE_LABELS[a] ?? a}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Reflection */}
            {type === 'reflection' && (
              <>
                <div>
                  <label className={LABEL}>Reflection type</label>
                  <select value={reflType} onChange={e => setReflType(e.target.value)} className={INPUT}>
                    {REFLECTION_TYPES.map(t => <option key={t} value={t}>{REFL_TYPE_SHORT_LABELS[t] ?? t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Notes</label>
                  <textarea
                    rows={3}
                    value={reflFreeText}
                    onChange={e => setReflFreeText(e.target.value)}
                    placeholder="What happened, what you learnt..."
                    className={TEXTAREA}
                  />
                </div>
              </>
            )}

            {/* Procedure */}
            {type === 'procedure' && (
              <div className="space-y-3">
                <div>
                  <label className={LABEL}>Procedure name</label>
                  <input
                    type="text"
                    value={procName}
                    maxLength={200}
                    onChange={e => setProcName(e.target.value)}
                    className={INPUT}
                    placeholder="e.g. Arterial blood gas"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Supervision</label>
                    <div className="flex rounded-lg overflow-hidden border border-subtle">
                      {SUPERVISION_LEVELS.map((s, i) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setProcSupervision(s.id)}
                          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${i > 0 ? 'border-l border-subtle' : ''} ${
                            procSupervision === s.id
                              ? 'bg-pill-blue text-[var(--cat-blue-text)]'
                              : 'bg-surface-0 text-fg-2 hover:text-fg'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Count</label>
                    <input
                      type="number"
                      min={1}
                      value={procCount}
                      onChange={e => setProcCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className={INPUT}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Linked specialties */}
            <div>
              <label className={LABEL}>Linked specialties</label>
              <SpecialtyTagSelect ref={specialtyRef} value={tags} onChange={setTags} userInterests={userInterests} trackedOnly />
            </div>

            {/* Notes */}
            <div>
              <label className={LABEL}>Comments <span className="normal-case font-normal text-fg-2">(optional)</span></label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any notes, learning points, or comments..."
                className={TEXTAREA}
              />
            </div>

            {error && <p className="text-sm text-[var(--cat-rose-text)]">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-subtle text-fg-2 hover:text-fg rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-[2] bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 text-[var(--button-primary-text)] font-semibold rounded-lg py-2.5 text-sm transition-colors"
              >
                {saving ? 'Saving...' : `Save ${meta.label.toLowerCase()}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
