'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import { localIsoDate } from '@/lib/timeline/calendar-grid'
import { addHeading, buildPersonalLogMeta, isUpcoming, saveLabel, type PersonalLogKind } from '@/lib/logs/personal-log'
import { WBA_TYPES, WBA_TYPE_LABELS } from '@/lib/logs/wba'
import SnippetTextarea from '@/components/ui/snippet-textarea'

export type { PersonalLogKind } from '@/lib/logs/personal-log'

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

const INPUT = 'min-h-[44px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]'
const LABEL = 'mb-1 block text-xs font-medium text-[var(--text-secondary)]'

const META_PLACEHOLDER: Partial<Record<PersonalLogKind, string>> = {
  rotation: 'e.g. Ward 7, Royal London',
  oop: 'e.g. OOPR research year',
  wba_received: 'e.g. with Dr Patel, chest pain on take',
  teaching_observed: 'e.g. Teaching observed by Dr Khan',
}

const TITLE_PLACEHOLDER: Partial<Record<PersonalLogKind, string>> = {
  rotation: 'e.g. General Surgery',
  exam: 'e.g. MSRA',
  course: 'e.g. ILS',
  mandatory_training: 'e.g. Information governance',
  wba_received: 'e.g. CBD on sepsis',
}

const DATE_LABEL: Partial<Record<PersonalLogKind, string>> = {
  mandatory_training: 'Completed on',
  exam: 'Exam date',
  course: 'Course date',
  rotation: 'Start date',
  wba_received: 'Date of assessment',
}

export default function PersonalLogForm({ kind }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const [title, setTitle] = useState('')
  // Init empty to avoid SSR/client hydration mismatch when this page straddles
  // midnight. Today's (UK) date is filled in by the post-mount effect below.
  const [date, setDate] = useState('')
  const [today, setToday] = useState('')
  useEffect(() => {
    const now = localIsoDate(new Date())
    setToday(now)
    setDate(current => current || now)
  }, [])
  const [endDate, setEndDate] = useState('')
  const [wbaType, setWbaType] = useState('')
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
    setEndDate('')
    setWbaType('')
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
    if (kind === 'rotation' && endDate && endDate < date) { addToast('The end date must be on or after the start date.', 'error'); return }
    if (kind === 'wba_received' && !wbaType) { addToast('Choose the type of WBA.', 'error'); return }
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
      meta: buildPersonalLogMeta({}, kind, { detail: meta, endDate, wbaType }),
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
  const upcomingExam = kind === 'exam' && Boolean(today) && Boolean(date) && isUpcoming(date, today)

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">{addHeading(kind)}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Full width so titles are readable rather than truncated in half a column. */}
        <label className="block sm:col-span-2">
          <span className={LABEL}>Title</span>
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder={TITLE_PLACEHOLDER[kind] ?? 'Title'} className={INPUT} />
        </label>
        {kind === 'wba_received' && (
          <label className="block sm:col-span-2">
            <span className={LABEL}>Type of WBA</span>
            <select required value={wbaType} onChange={e => setWbaType(e.target.value)} className={INPUT}>
              <option value="">Choose a type...</option>
              {WBA_TYPES.map(type => <option key={type} value={type}>{WBA_TYPE_LABELS[type]}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className={LABEL}>{DATE_LABEL[kind] ?? 'Date'}</span>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
        </label>
        {kind === 'rotation' && (
          <label className="block">
            <span className={LABEL}>End date (optional)</span>
            <input type="date" value={endDate} min={date || undefined} onChange={e => setEndDate(e.target.value)} className={INPUT} />
            <span className="mt-1 block text-[11px] text-[var(--text-muted)]">Leave blank if this is your current rotation.</span>
          </label>
        )}
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
            <span className={LABEL}>{upcomingExam ? 'Result (add after the exam)' : 'Result / score'}</span>
            <input value={score} onChange={e => setScore(e.target.value)} placeholder={upcomingExam ? 'Leave blank for now' : 'e.g. Pass, 612'} className={INPUT} />
          </label>
        )}
        {(kind === 'exam' || kind === 'course') && (
          <label className="block">
            <span className={LABEL}>Cost (GBP)</span>
            <input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="e.g. 250" className={INPUT} />
          </label>
        )}
        {metaPlaceholder && (
          <label className="block sm:col-span-2">
            <span className={LABEL}>{kind === 'wba_received' ? 'Assessor or context (optional)' : 'Details'}</span>
            <input value={meta} onChange={e => setMeta(e.target.value)} placeholder={metaPlaceholder} className={INPUT} />
          </label>
        )}
      </div>
      {upcomingExam && (
        <p className="mt-3 rounded-lg bg-[var(--info-bg)] px-3 py-2 text-xs text-[var(--info-text)]">
          This exam is in the future, so it will show as upcoming. It stays out of your CV until the date has passed.
        </p>
      )}
      <label className="mt-3 block">
        <span className={LABEL}>Notes</span>
        <SnippetTextarea value={notes} onValueChange={setNotes} placeholder="Notes (no patient-identifiable details)" className="min-h-[88px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3 text-sm text-[var(--text-primary)]" />
      </label>
      <button disabled={saving} className="mt-3 min-h-[44px] rounded-lg bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] disabled:opacity-50">
        {saving ? 'Saving...' : saveLabel(kind)}
      </button>
    </form>
  )
}
