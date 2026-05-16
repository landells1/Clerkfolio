'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type NewCase } from '@/lib/types/cases'
import SpecialtyTagSelect from '@/components/portfolio/specialty-tag-select'
import CompetencyThemePicker from '@/components/portfolio/competency-theme-picker'
import ClinicalAreaSelect from '@/components/cases/clinical-area-select'
import EvidenceUpload from '@/components/shared/evidence-upload'
import { uploadPendingFiles } from '@/lib/supabase/storage'
import { useToast } from '@/components/ui/toast-provider'
import { completenessScore } from '@/lib/utils/completeness'
import { suggestTagsForText } from '@/lib/heuristics/tag-suggester'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { containsPII } from '@/lib/pii'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Partial<NewCase> & { id?: string }
  userInterests?: string[]
}

const INPUT = 'w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.55)] focus:outline-none focus:border-[#1B6FD9] transition-colors'
const LABEL = 'block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide'
const WORD_COUNT_CLASS = 'text-[10px] text-[rgba(245,245,242,0.55)] mt-1 text-right'
const DRAFT_KEY = 'clerkfolio-case-draft'

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
  const [clinicalDomains, setClinicalDomains] = useState<string[]>(
    initialData?.clinical_domains?.length
      ? initialData.clinical_domains
      : initialData?.clinical_domain
        ? [initialData.clinical_domain]
        : []
  )
  const [specialtyTags, setSpecialtyTags] = useState<string[]>(initialData?.specialty_tags ?? [])
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [interviewThemes, setInterviewThemes] = useState<string[]>((initialData as { interview_themes?: string[] })?.interview_themes ?? [])
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // Dirty state — ref mirrors state so cleanup closures always see current value
  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(false)

  // ── Auto-save draft (create mode only) ──────────────────────────────────
  // sessionStorage is used deliberately: it is scoped to the browser tab and is
  // cleared when the tab closes or the user logs out. Unlike localStorage it
  // cannot bleed between different users who share a device.

  // Restore draft on mount - notes are intentionally excluded (clinical free text).
  useEffect(() => {
    if (mode !== 'create') return
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d._expires && Date.now() > d._expires) {
        sessionStorage.removeItem(DRAFT_KEY)
        return
      }
      if (d.title !== undefined) setTitle(d.title)
      if (d.date !== undefined) setDate(d.date)
      if (d.clinicalDomains !== undefined) setClinicalDomains(d.clinicalDomains)
      else if (d.clinicalDomain !== undefined) setClinicalDomains(d.clinicalDomain ? [d.clinicalDomain] : [])
      if (d.specialtyTags !== undefined) setSpecialtyTags(d.specialtyTags)
      setDraftRestored(true)
    } catch {
      // ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced save to sessionStorage
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (mode !== 'create') return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      // Do not persist clinical free text (notes) - only structural metadata.
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        title, date, clinicalDomains, specialtyTags,
        _expires: Date.now() + 24 * 60 * 60 * 1000,
      }))
    }, 1000)
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      // Flush immediately on unmount (or dep change) so navigating away before
      // the 1 s debounce fires doesn't lose the draft.
      if (isDirtyRef.current) {
        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
            title, date, clinicalDomains, specialtyTags,
            _expires: Date.now() + 24 * 60 * 60 * 1000,
          }))
        } catch {}
      }
    }
  }, [mode, title, date, clinicalDomains, specialtyTags])

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

  function markDirty() { setIsDirty(true); isDirtyRef.current = true }

  useEffect(() => {
    const timer = setTimeout(() => {
      setSuggestedTags(suggestTagsForText(`${title} ${notes}`, specialtyTags))
    }, 250)
    return () => clearTimeout(timer)
  }, [notes, specialtyTags, title])

  function addPendingFiles(files: FileList | null) {
    const nextFiles = Array.from(files ?? [])
    if (nextFiles.length === 0) return
    setPendingFiles(current => [...current, ...nextFiles])
    markDirty()
  }

  async function pruneRevisions(entryId: string, entryType: 'portfolio' | 'case') {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return
    const { data: revisions } = await supabase
      .from('entry_revisions')
      .select('id')
      .eq('entry_id', entryId)
      .eq('entry_type', entryType)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true })

    if (revisions && revisions.length > 50) {
      await supabase
        .from('entry_revisions')
        .delete()
        .in('id', revisions.slice(0, revisions.length - 50).map(row => row.id))
        .eq('user_id', currentUser.id)
    }
  }

  // Track the "Save & add another" intent across the submit handler.
  const addAnotherRef = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    if (containsPII(title)) {
      setError('This title looks like it contains patient-identifiable information (name, DOB, NHS number, ward/bay). Please anonymise it before saving.')
      return
    }
    if (notes.trim() && containsPII(notes)) {
      setError('These notes look like they contain patient-identifiable information (name, DOB, NHS number, ward/bay). Please anonymise the notes before saving.')
      return
    }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const payload = {
      title: title.trim(),
      date,
      clinical_domain: clinicalDomains[0] ?? null,
      clinical_domains: clinicalDomains,
      specialty_tags: specialtyTags,
      interview_themes: interviewThemes,
      notes: notes.trim() || null,
    }
    const scoredPayload = { ...payload, completeness_score: completenessScore(payload, 'case') }

    if (mode === 'create') {
      const { data, error } = await supabase
        .from('cases')
        .insert({ ...scoredPayload, user_id: user.id })
        .select('id')
        .single()
      if (error) { setError('We could not save this case. Check the details and try again.'); setSaving(false); return }
      if (pendingFiles.length > 0) {
        setSaving(false); setUploading(true)
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, data.id, 'case')
        setUploading(false)
        if (uploadErrors.length > 0) {
          setError(`Saved, but some files failed: ${uploadErrors.join('; ')}`)
          return
        }
      }
      sessionStorage.removeItem(DRAFT_KEY)
      setIsDirty(false)
      isDirtyRef.current = false
      addToast('Case logged', 'success')
      if (addAnotherRef.current) {
        addAnotherRef.current = false
        setSaving(false)
        window.location.assign(`/cases/new?fresh=${Date.now()}`)
        return
      }
      router.push('/cases')
    } else {
      const { data: currentRow } = await supabase
        .from('cases')
        .select('*')
        .eq('id', initialData!.id!)
        .eq('user_id', user.id)
        .single()

      const { error: revisionError } = await supabase.from('entry_revisions').insert({
        user_id: user.id,
        entry_id: initialData!.id!,
        entry_type: 'case',
        snapshot: currentRow ?? initialData,
      })
      // Snapshot failure shouldn't block the edit, but the user should know
      // history wasn't recorded so they can decide whether to retry.
      if (revisionError) {
        console.error('Could not save revision snapshot:', revisionError.message)
        addToast('Saved, but revision history was not recorded', 'error')
      }
      await pruneRevisions(initialData!.id!, 'case')
      const { error } = await supabase
        .from('cases')
        .update(scoredPayload)
        .eq('id', initialData!.id!)
        .eq('user_id', user.id)
      if (error) { setError('We could not update this case. Check the details and try again.'); setSaving(false); return }
      if (pendingFiles.length > 0) {
        setSaving(false); setUploading(true)
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, initialData!.id!, 'case')
        setUploading(false)
        if (uploadErrors.length > 0) {
          setError(`Saved, but some files failed: ${uploadErrors.join('; ')}`)
          return
        }
      }
      setIsDirty(false)
      addToast('Case updated', 'success')
      router.push(`/cases/${initialData!.id}`)
    }
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={event => {
        const files = Array.from(event.clipboardData.files).filter(file => file.type.startsWith('image/'))
        if (files.length === 0) return
        setPendingFiles(current => [...current, ...files])
        markDirty()
      }}
      onDragOver={event => event.preventDefault()}
      onDrop={event => {
        event.preventDefault()
        addPendingFiles(event.dataTransfer.files)
      }}
      className="space-y-5"
    >
      {/* Draft restored banner */}
      {draftRestored && (
        <div className="flex items-center justify-between bg-[#1B6FD9]/10 border border-[#1B6FD9]/20 rounded-lg px-3.5 py-2.5 text-sm text-[#1B6FD9] mb-4">
          <span>Draft restored</span>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(DRAFT_KEY)
              setDraftRestored(false)
              setTitle('')
              setDate(new Date().toISOString().split('T')[0])
              setClinicalDomains([])
              setSpecialtyTags([])
              setNotes('')
            }}
            className="text-xs text-[#1B6FD9]/70 hover:text-[#1B6FD9]"
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
          maxLength={200}
          onChange={e => { setTitle(e.target.value); markDirty() }}
          className={INPUT}
          placeholder="Brief description - no patient identifiers"
        />
        <p className="text-xs text-[rgba(245,245,242,0.55)] mt-1">
          Do not include patient names, dates of birth, or NHS numbers.
        </p>
      </div>

      {/* Date */}
      <div>
        <label className={LABEL}>Date <span className="text-red-400">*</span></label>
        <input
          type="date"
          required
          value={date}
          onChange={e => { setDate(e.target.value); markDirty() }}
          className={INPUT}
        />
      </div>

      {/* Clinical area */}
      <div>
        <label className={LABEL}>Clinical area</label>
        <ClinicalAreaSelect
          value={clinicalDomains}
          onChange={v => { setClinicalDomains(v); markDirty() }}
          onFocus={() => markDirty()}
        />
        <p className="text-xs text-[rgba(245,245,242,0.55)] mt-1">
          The medical setting of this encounter - used to filter and organise your cases.
        </p>
      </div>

      {/* Linked specialties */}
      <div>
        <label className={LABEL}>Linked specialties</label>
        <SpecialtyTagSelect
          value={specialtyTags}
          onChange={value => { setSpecialtyTags(value); markDirty() }}
          userInterests={userInterests}
          trackedOnly
        />
        {suggestedTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestedTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => { setSpecialtyTags(current => [...current, tag]); markDirty() }}
                className="rounded border border-[#1B6FD9]/25 bg-[#1B6FD9]/10 px-2 py-1 text-[10px] text-[#6AA8FF]"
              >
                + {formatSpecialtyLabel(tag)}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-[rgba(245,245,242,0.55)] mt-1">
          Link cases to specialties for filtering and interview examples. Specialty tracker scores use portfolio entries as evidence.
        </p>
      </div>

      <CompetencyThemePicker value={interviewThemes} onChange={setInterviewThemes} onDirty={markDirty} />

      {/* Notes */}
      <div>
        <label className={LABEL}>Notes</label>
        <textarea
          rows={6}
          value={notes}
          maxLength={10000}
          onChange={e => { setNotes(e.target.value); markDirty() }}
          onFocus={() => markDirty()}
          className={INPUT}
          placeholder="Clinical context, learning points, what happened - anonymised…"
        />
        {notes && <p className={WORD_COUNT_CLASS}>{wordCount(notes)} words</p>}
      </div>

      {/* Evidence uploads */}
      <div>
        <label className={LABEL}>Evidence</label>
        <EvidenceUpload files={pendingFiles} onChange={files => { setPendingFiles(files); markDirty() }} />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2 border-t border-white/[0.06]">
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
        {mode === 'create' && (
          <button
            type="submit"
            onClick={() => { addAnotherRef.current = true }}
            disabled={saving || uploading}
            className="flex-1 border border-[#1B6FD9]/40 text-[#1B6FD9] hover:bg-[#1B6FD9]/10 disabled:opacity-50 rounded-xl py-3 text-sm font-medium transition-colors"
          >
            Save & add another
          </button>
        )}
        <button
          type="submit"
          disabled={saving || uploading}
          className="flex-[2] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          {saving ? 'Saving…' : mode === 'create' ? 'Save case' : 'Save changes'}
        </button>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="rounded-xl overflow-hidden bg-[#141416] border border-white/[0.08] px-4 py-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div className="h-full bg-[#1B6FD9] rounded-full motion-safe:animate-[upload-progress_1.4s_ease-in-out_infinite]" />
          </div>
          <span className="text-xs text-[rgba(245,245,242,0.45)] shrink-0">Uploading {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}…</span>
        </div>
      )}
    </form>
  )
}
