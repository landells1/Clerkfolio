'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CLINICAL_DOMAINS, type NewCase } from '@/lib/types/cases'
import SpecialtyTagSelect from '@/components/portfolio/specialty-tag-select'
import EvidenceUpload from '@/components/shared/evidence-upload'
import { uploadPendingFiles } from '@/lib/supabase/storage'
import { useToast } from '@/components/ui/toast-provider'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Partial<NewCase> & { id?: string }
  userInterests?: string[]
}

const INPUT = 'w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1D9E75] transition-colors'
const LABEL = 'block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide'
const WORD_COUNT_CLASS = 'text-[10px] text-[rgba(245,245,242,0.3)] mt-1 text-right'
const DRAFT_KEY = 'clinidex-case-draft'

const wordCount = (s: string) => s.trim() ? s.trim().split(/\s+/).length : 0

export default function CaseForm({ mode, initialData, userInterests = [] }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftRestored, setDraftRestored] = useState(false)

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().split('T')[0])
  const [clinicalDomain, setClinicalDomain] = useState(initialData?.clinical_domain ?? '')
  const [specialtyTags, setSpecialtyTags] = useState<string[]>(initialData?.specialty_tags ?? [])
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // Dirty state
  const [isDirty, setIsDirty] = useState(false)

  // ── Auto-save draft (create mode only) ──────────────────────────────────

  // Restore draft on mount
  useEffect(() => {
    if (mode !== 'create') return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.title !== undefined) setTitle(d.title)
      if (d.date !== undefined) setDate(d.date)
      if (d.clinicalDomain !== undefined) setClinicalDomain(d.clinicalDomain)
      if (d.specialtyTags !== undefined) setSpecialtyTags(d.specialtyTags)
      if (d.notes !== undefined) setNotes(d.notes)
      setDraftRestored(true)
    } catch {
      // ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced save to localStorage
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (mode !== 'create') return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, date, clinicalDomain, specialtyTags, notes }))
    }, 1000)
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
  }, [mode, title, date, clinicalDomain, specialtyTags, notes])

  // ── Dirty / beforeunload ────────────────────────────────────────────────

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  function markDirty() { setIsDirty(true) }

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
      if (pendingFiles.length > 0) {
        setSaving(false); setUploading(true)
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, data.id, 'case')
        setUploading(false)
        if (uploadErrors.length > 0) setError(`Saved, but some files failed: ${uploadErrors.join('; ')}`)
      }
      localStorage.removeItem(DRAFT_KEY)
      setIsDirty(false)
      addToast('Case logged', 'success')
      router.push(`/cases/${data.id}`)
    } else {
      const { error } = await supabase
        .from('cases')
        .update(payload)
        .eq('id', initialData!.id!)
      if (error) { setError(error.message); setSaving(false); return }
      if (pendingFiles.length > 0) {
        setSaving(false); setUploading(true)
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, initialData!.id!, 'case')
        setUploading(false)
        if (uploadErrors.length > 0) setError(`Saved, but some files failed: ${uploadErrors.join('; ')}`)
      }
      setIsDirty(false)
      addToast('Case updated', 'success')
      router.push(`/cases/${initialData!.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Draft restored banner */}
      {draftRestored && (
        <div className="flex items-center justify-between bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-lg px-3.5 py-2.5 text-sm text-[#1D9E75] mb-4">
          <span>Draft restored</span>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(DRAFT_KEY)
              setDraftRestored(false)
              setTitle('')
              setDate(new Date().toISOString().split('T')[0])
              setClinicalDomain('')
              setSpecialtyTags([])
              setNotes('')
            }}
            className="text-xs text-[#1D9E75]/70 hover:text-[#1D9E75]"
          >
            Discard
          </button>
        </div>
      )}

      {/* Title */}
      <div>
        <label className={LABEL}>Case title <span className="text-red-400">*</span></label>
        <input
          type="text"
          required
          value={title}
          onChange={e => { setTitle(e.target.value); markDirty() }}
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
          onFocus={() => markDirty()}
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
          onFocus={() => markDirty()}
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
          onChange={e => { setNotes(e.target.value); markDirty() }}
          onFocus={() => markDirty()}
          className={INPUT}
          placeholder="Clinical context, learning points, what happened — anonymised…"
        />
        {notes && <p className={WORD_COUNT_CLASS}>{wordCount(notes)} words</p>}
      </div>

      {/* Evidence uploads */}
      <div>
        <label className={LABEL}>Evidence</label>
        <EvidenceUpload files={pendingFiles} onChange={setPendingFiles} />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => {
            if (isDirty && !confirm('You have unsaved changes. Leave anyway?')) return
            router.back()
          }}
          className="flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:border-white/[0.15] rounded-xl py-3 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || uploading}
          className="flex-[2] bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          {saving ? 'Saving…' : mode === 'create' ? 'Save case' : 'Save changes'}
        </button>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="rounded-xl overflow-hidden bg-[#141416] border border-white/[0.08] px-4 py-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div className="h-full bg-[#1D9E75] rounded-full animate-[upload-progress_1.4s_ease-in-out_infinite]" />
          </div>
          <span className="text-xs text-[rgba(245,245,242,0.45)] shrink-0">Uploading {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}…</span>
        </div>
      )}
    </form>
  )
}
