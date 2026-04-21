'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CLINICAL_DOMAINS, type NewCase } from '@/lib/types/cases'
import SpecialtyTagSelect from '@/components/portfolio/specialty-tag-select'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Partial<NewCase> & { id?: string }
  userInterests?: string[]
}

const INPUT = 'w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1D9E75] transition-colors'
const LABEL = 'block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide'

export default function CaseForm({ mode, initialData, userInterests = [] }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().split('T')[0])
  const [clinicalDomain, setClinicalDomain] = useState(initialData?.clinical_domain ?? '')
  const [specialtyTags, setSpecialtyTags] = useState<string[]>(initialData?.specialty_tags ?? [])
  const [notes, setNotes] = useState(initialData?.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const payload = {
      title: title.trim(),
      date,
      clinical_domain: clinicalDomain.trim() || null,
      specialty_tags: specialtyTags,
      notes: notes.trim() || null,
    }

    if (mode === 'create') {
      const { data, error } = await supabase
        .from('cases')
        .insert({ ...payload, user_id: user.id })
        .select('id')
        .single()
      if (error) { setError(error.message); setSaving(false); return }
      router.push(`/cases/${data.id}`)
    } else {
      const { error } = await supabase
        .from('cases')
        .update(payload)
        .eq('id', initialData!.id!)
      if (error) { setError(error.message); setSaving(false); return }
      router.push(`/cases/${initialData!.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className={LABEL}>Case title <span className="text-red-400">*</span></label>
        <input
          type="text"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          className={INPUT}
          placeholder="Brief description — no patient identifiers"
        />
        <p className="text-xs text-[rgba(245,245,242,0.3)] mt-1">
          Do not include patient names, dates of birth, or NHS numbers.
        </p>
      </div>

      {/* Date */}
      <div>
        <label className={LABEL}>Date</label>
        <input
          type="date"
          required
          value={date}
          onChange={e => setDate(e.target.value)}
          className={INPUT}
        />
      </div>

      {/* Clinical domain */}
      <div>
        <label className={LABEL}>Clinical domain</label>
        <input
          type="text"
          list="clinical-domains"
          value={clinicalDomain}
          onChange={e => setClinicalDomain(e.target.value)}
          className={INPUT}
          placeholder="e.g. Acute Medicine, Cardiology…"
        />
        <datalist id="clinical-domains">
          {CLINICAL_DOMAINS.map(d => <option key={d} value={d} />)}
        </datalist>
      </div>

      {/* Specialty tags */}
      <div>
        <label className={LABEL}>Specialty tags</label>
        <SpecialtyTagSelect
          value={specialtyTags}
          onChange={setSpecialtyTags}
          userInterests={userInterests}
        />
        <p className="text-xs text-[rgba(245,245,242,0.3)] mt-1">
          Tag the specialties this case would be relevant to in an application.
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className={LABEL}>Notes</label>
        <textarea
          rows={6}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className={INPUT}
          placeholder="Clinical context, learning points, what happened — anonymised…"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:border-white/[0.15] rounded-xl py-3 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-[2] bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          {saving ? 'Saving…' : mode === 'create' ? 'Save case' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
