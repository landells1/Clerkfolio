'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'

export type PersonalLogKind = 'mandatory_training' | 'course' | 'exam' | 'mentor_meeting' | 'oop' | 'rotation' | 'wba_received' | 'teaching_observed'

type Props = {
  kind: PersonalLogKind
}

const LABELS: Record<PersonalLogKind, string> = {
  mandatory_training: 'Mandatory training',
  course: 'Course / CPD',
  exam: 'Exam',
  mentor_meeting: 'Mentor meeting',
  oop: 'OOP / taster',
  rotation: 'Rotation',
  wba_received: 'WBA',
  teaching_observed: 'Teaching observation',
}

export default function PersonalLogForm({ kind }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [expiresAt, setExpiresAt] = useState('')
  const [cpdHours, setCpdHours] = useState('')
  const [attempts, setAttempts] = useState('')
  const [score, setScore] = useState('')
  const [cost, setCost] = useState('')
  const [meta, setMeta] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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
    setTitle('')
    setNotes('')
    addToast('Log entry saved', 'success')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
      <h2 className="mb-4 text-base font-semibold text-[#F5F5F2]">Add {LABELS[kind]}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" />
        {kind === 'mandatory_training' && <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" aria-label="Expiry date" />}
        {kind === 'course' && <input type="number" step="0.5" value={cpdHours} onChange={e => setCpdHours(e.target.value)} placeholder="CPD hours" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" />}
        {kind === 'exam' && <input type="number" value={attempts} onChange={e => setAttempts(e.target.value)} placeholder="Attempt count" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" />}
        {kind === 'exam' && <input value={score} onChange={e => setScore(e.target.value)} placeholder="Score" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" />}
        {(kind === 'exam' || kind === 'course') && <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost GBP" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" />}
        {(kind === 'oop' || kind === 'rotation' || kind === 'wba_received' || kind === 'teaching_observed') && <input value={meta} onChange={e => setMeta(e.target.value)} placeholder="Type, block, observer, or rotation" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" />}
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" className="mt-3 min-h-[88px] w-full rounded-lg border border-white/[0.08] bg-[#0B0B0C] p-3 text-sm text-[#F5F5F2]" />
      <button disabled={saving} className="mt-3 min-h-[44px] rounded-lg bg-[#1B6FD9] px-4 text-sm font-semibold text-[#0B0B0C] disabled:opacity-50">
        {saving ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
