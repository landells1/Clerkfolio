'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import { localIsoDate } from '@/lib/timeline/calendar-grid'

export type PersonalLogKind = 'mandatory_training' | 'course' | 'exam' | 'mentor_meeting' | 'oop' | 'rotation' | 'wba_received' | 'teaching_observed'

type Props = {
  kind: PersonalLogKind
}

export const PERSONAL_LOG_LABELS: Record<PersonalLogKind, string> = {
  mandatory_training: 'Mandatory training',
  course: 'Course / CPD',
  exam: 'Exam',
  mentor_meeting: 'Mentor meeting',
  oop: 'OOP / taster',
  rotation: 'Rotation',
  wba_received: 'WBA',
  teaching_observed: 'Teaching observation',
}

const INPUT = 'min-h-[44px] w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]'
const LABEL = 'mb-1 block text-xs font-medium text-[var(--text-secondary)]'

const META_PLACEHOLDER: Partial<Record<PersonalLogKind, string>> = {
  rotation: 'e.g. Geriatrics block, 4 weeks',
  oop: 'e.g. OOPR research year',
  wba_received: 'e.g. CBD with Dr Patel',
  teaching_observed: 'e.g. Teaching observed by Dr Khan',
}

const DATE_LABEL: Partial<Record<PersonalLogKind, string>> = {
  mandatory_training: 'Completed on',
  exam: 'Exam date',
  course: 'Course date',
  rotation: 'Start date',
}

export default function PersonalLogForm({ kind }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const [title, setTitle] = useState('')
  // Init empty to avoid SSR/client hydration mismatch when this page straddles
  // midnight. Today's (UK) date is filled in by the post-mount effect below.
  const [date, setDate] = useState('')
  useEffect(() => {
    setDate(current => current || localIsoDate(new Date()))
  }, [])
  const [expiresAt, setExpiresAt] = useState('')
  const [cpdHours, setCpdHours] = useState('')
  const [attempts, setAttempts] = useState('')
  const [score, setScore] = useState('')
  const [cost, setCost] = useState('')
  const [meta, setMeta] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function resetFields() {
    // Every field, so the previous record's expiry/cost/score/CPD/detail
    // doesn't silently carry into the next one.
    setTitle('')
    setDate(localIsoDate(new Date()))
    setExpiresAt('')
    setCpdHours('')
    setAttempts('')
    setScore('')
    setCost('')
    setMeta('')
    setNotes('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { addToast('Add a title first.', 'error'); return }
    if (!date) { addToast('Choose a date.', 'error'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      addToast('Your session could not be confirmed. Refresh the page or sign in again.', 'error')
      return
    }

    const { error } = await supabase.from('personal_log').insert({
      user_id: user.id,
      kind,
      title: title.trim(),
      date,
      expires_at: kind === 'mandatory_training' && expiresAt ? expiresAt : null,
      cpd_hours: kind === 'course' && cpdHours ? Number(cpdHours) : null,
      attempts: kind === 'exam' && attempts ? Number(attempts) : null,
      score: kind === 'exam' && score ? score : null,
      cost_pence: (kind === 'exam' || kind === 'course') && cost ? Math.round(Number(cost) * 100) : null,
      meta: meta ? { detail: meta } : {},
      notes: notes || null,
    })
    setSaving(false)
    if (error) {
      addToast('Failed to save log entry', 'error')
      return
    }
    resetFields()
    addToast('Log entry saved', 'success')
    router.refresh()
  }

  const metaPlaceholder = META_PLACEHOLDER[kind]

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
      <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">Add {PERSONAL_LOG_LABELS[kind]}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Title</span>
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className={INPUT} />
        </label>
        <label className="block">
          <span className={LABEL}>{DATE_LABEL[kind] ?? 'Date'}</span>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
        </label>
        {kind === 'mandatory_training' && (
          <label className="block">
            <span className={LABEL}>Expires on (optional)</span>
            <input type="date" value={expiresAt} min={date || undefined} onChange={e => setExpiresAt(e.target.value)} className={INPUT} />
          </label>
        )}
        {kind === 'course' && (
          <label className="block">
            <span className={LABEL}>CPD hours</span>
            <input type="number" min="0" step="0.5" value={cpdHours} onChange={e => setCpdHours(e.target.value)} placeholder="e.g. 6" className={INPUT} />
          </label>
        )}
        {kind === 'exam' && (
          <label className="block">
            <span className={LABEL}>Attempt number</span>
            <input type="number" min="1" value={attempts} onChange={e => setAttempts(e.target.value)} placeholder="e.g. 1" className={INPUT} />
          </label>
        )}
        {kind === 'exam' && (
          <label className="block">
            <span className={LABEL}>Score / result</span>
            <input value={score} onChange={e => setScore(e.target.value)} placeholder="e.g. Pass, 612" className={INPUT} />
          </label>
        )}
        {(kind === 'exam' || kind === 'course') && (
          <label className="block">
            <span className={LABEL}>Cost (GBP)</span>
            <input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="e.g. 250" className={INPUT} />
          </label>
        )}
        {metaPlaceholder && (
          <label className="block">
            <span className={LABEL}>Details</span>
            <input value={meta} onChange={e => setMeta(e.target.value)} placeholder={metaPlaceholder} className={INPUT} />
          </label>
        )}
      </div>
      <label className="mt-3 block">
        <span className={LABEL}>Notes</span>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (no patient-identifiable details)" className="min-h-[88px] w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] p-3 text-sm text-[var(--text-primary)]" />
      </label>
      <button disabled={saving} className="mt-3 min-h-[44px] rounded-lg bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] disabled:opacity-50">
        {saving ? 'Saving...' : `Save ${PERSONAL_LOG_LABELS[kind].toLowerCase()}`}
      </button>
    </form>
  )
}
