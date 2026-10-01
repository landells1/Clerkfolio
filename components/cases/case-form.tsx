'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type NewCase } from '@/lib/types/cases'
import type { CaseTemplate, Template } from '@/lib/types/templates'
import { caseTemplates } from '@/lib/templates/filter'
import { clinicalDomainsFromDefaults, notesScaffoldFromDefaults } from '@/lib/templates/case-defaults'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'
import SpecialtyTagSelect, { type SpecialtyTagSelectHandle } from '@/components/portfolio/specialty-tag-select'
import ImportanceSelect from '@/components/portfolio/importance-select'
import ClinicalAreaSelect from '@/components/cases/clinical-area-select'
import CompetencyThemePicker from '@/components/portfolio/competency-theme-picker'
import EvidenceUpload from '@/components/shared/evidence-upload'
import EvidenceFiles from '@/components/shared/evidence-files'
import AttachExistingEvidence from '@/components/shared/attach-existing-evidence'
import { AnonymisationBanner, AnonymisationHint } from '@/components/shared/anonymisation-notice'
import { uploadPendingFiles, type EvidenceFile } from '@/lib/supabase/storage'
import { mergeUniqueFiles } from '@/lib/upload/dedupe-files'
import { useToast } from '@/components/ui/toast-provider'
import type { Importance } from '@/lib/types/importance'
import { suggestTagsForText } from '@/lib/heuristics/tag-suggester'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { localIsoDate } from '@/lib/timeline/calendar-grid'
import { submitOnEnterAsPrimary } from '@/lib/forms/enter-submit'
import { caseDraftHasContent } from '@/lib/drafts/draft-keys'
import SnippetTextarea from '@/components/ui/snippet-textarea'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { applyStagedEvidence, useStagedEvidence } from '@/components/shared/staged-evidence'
import { formSnapshot, isFormDirty } from '@/lib/forms/dirty'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Partial<NewCase> & { id?: string }
  userInterests?: string[]
  templates?: Template[]
  authenticatedUserId?: string
  existingEvidence?: EvidenceFile[]
}

const INPUT = 'w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors'
const LABEL = 'block text-xs font-medium text-[var(--text-emphasis)] mb-1.5 uppercase tracking-wide'
const WORD_COUNT_CLASS = 'text-[10px] text-[var(--text-secondary)] mt-1 text-right'
const DRAFT_KEY = 'clerkfolio-case-draft'

function draftKeyForUser(userId: string) {
  return `${DRAFT_KEY}:${userId}`
}

const wordCount = (s: string) => s.trim() ? s.trim().split(/\s+/).length : 0

export default function CaseForm({ mode, initialData, userInterests = [], templates = [], authenticatedUserId, existingEvidence = [] }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftRestored, setDraftRestored] = useState(false)
  const [title, setTitle] = useState(initialData?.title ?? '')
  // Init empty to avoid SSR/client hydration mismatch when the new-case page
  // straddles UTC midnight. Today's date is filled in by the post-mount
  // useEffect below.
  const [date, setDate] = useState(initialData?.date ?? '')
  const [clinicalDomains, setClinicalDomains] = useState<string[]>(
    initialData?.clinical_domains?.length
      ? initialData.clinical_domains
      : initialData?.clinical_domain
        ? [initialData.clinical_domain]
        : []
  )
  const [specialtyTags, setSpecialtyTags] = useState<string[]>(initialData?.specialty_tags ?? [])
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [importance, setImportance] = useState<Importance | null>(initialData?.importance ?? null)
  const [interviewThemes, setInterviewThemes] = useState<string[]>(initialData?.interview_themes ?? [])
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const draftKey = mode === 'create' && authenticatedUserId ? draftKeyForUser(authenticatedUserId) : null

  // Template guidance placeholders - overridden when a template is applied
  const [guidancePlaceholders, setGuidancePlaceholders] = useState<Record<string, string>>({})
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const templatePickerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(templatePickerOpen, templatePickerRef, () => setTemplatePickerOpen(false))

  // Edit mode: attach / unlink / delete of existing files is staged here and
  // applied by "Save changes" (Cancel discards it).
  const stagedEvidence = useStagedEvidence()

  // Dirty state (lib/forms/dirty.ts): a snapshot comparison against how the
  // form looked once loaded, so a form edited back to its starting values is
  // pristine again. The ref mirrors it for the draft-flush cleanup closure.
  const snapshot = formSnapshot({
    title, date, clinicalDomains, specialtyTags, importance, interviewThemes, notes,
    files: pendingFiles.map(file => `${file.name}:${file.size}`),
    evidence: stagedEvidence.signature,
  })
  const [baseline, setBaseline] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const isDirty = !saved && isFormDirty(baseline, snapshot)
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)

  // After hydration, fill the date default if nothing restored it. Runs once.
  useEffect(() => {
    setDate(current => current || localIsoDate(new Date()))
  }, [])

  // Capture the pristine snapshot once the post-mount defaults have landed.
  useEffect(() => {
    if (baseline === null && date) setBaseline(snapshot)
  }, [baseline, date, snapshot])

  // ── Auto-save draft (create mode only) ──────────────────────────────────
  // sessionStorage is used deliberately: it is scoped to the browser tab and is
  // cleared when the tab closes or the user logs out. Unlike localStorage it
  // cannot bleed between different users who share a device.

  useEffect(() => {
    if (mode !== 'create' || !draftKey) return
    try {
      const raw = sessionStorage.getItem(draftKey)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d._expires && Date.now() > d._expires) {
        sessionStorage.removeItem(draftKey)
        return
      }
      if (d.title !== undefined) setTitle(d.title)
      if (d.date !== undefined) setDate(d.date)
      if (d.clinicalDomains !== undefined) setClinicalDomains(d.clinicalDomains)
      else if (d.clinicalDomain !== undefined) setClinicalDomains(d.clinicalDomain ? [d.clinicalDomain] : [])
      if (d.specialtyTags !== undefined) setSpecialtyTags(d.specialtyTags)
      if (d.importance !== undefined) setImportance(d.importance)
      if (Array.isArray(d.interviewThemes)) setInterviewThemes(d.interviewThemes)
      setDraftRestored(true)
    } catch {
      // ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, mode])

  // Debounced save to sessionStorage
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (mode !== 'create' || !draftKey) return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    const draft = { title, date, clinicalDomains, specialtyTags, importance, interviewThemes }
    draftTimerRef.current = setTimeout(() => {
      // Do not persist clinical free text (notes) - only structural metadata.
      // An untouched form (only the auto-filled date) is not a draft.
      try {
        if (!caseDraftHasContent(draft)) { sessionStorage.removeItem(draftKey); return }
        sessionStorage.setItem(draftKey, JSON.stringify({ ...draft, _expires: Date.now() + 24 * 60 * 60 * 1000 }))
      } catch {}
    }, 1000)
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      // Flush immediately on unmount (or dep change) so navigating away before
      // the 1 s debounce fires doesn't lose the draft.
      if (isDirtyRef.current && caseDraftHasContent(draft)) {
        try {
          sessionStorage.setItem(draftKey, JSON.stringify({ ...draft, _expires: Date.now() + 24 * 60 * 60 * 1000 }))
        } catch {}
      }
    }
  }, [mode, draftKey, title, date, clinicalDomains, specialtyTags, importance, interviewThemes])

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

  // Dirtiness is derived from the snapshot above; kept as a no-op hook point
  // so existing onChange handlers read clearly.
  function markDirty() {}

  // ── Apply a template ────────────────────────────────────────────────────

  function applyTemplate(t: CaseTemplate) {
    setGuidancePlaceholders(t.guidance_prompts)
    const domains = clinicalDomainsFromDefaults(t.field_defaults)
    if (domains.length > 0) setClinicalDomains(domains)
    // Scaffold headings go into the notes box itself, but never over text the
    // user has already written.
    const scaffold = notesScaffoldFromDefaults(t.field_defaults, notes)
    if (scaffold !== null) setNotes(scaffold)
    markDirty()
    setTemplatePickerOpen(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setSuggestedTags(suggestTagsForText(`${title} ${notes}`, specialtyTags))
    }, 250)
    return () => clearTimeout(timer)
  }, [notes, specialtyTags, title])

  const specialtyRef = useRef<SpecialtyTagSelectHandle | null>(null)

  const ph = (key: string, fallback: string) => guidancePlaceholders[key] ?? fallback

  // Grouped templates for the picker. Only case-kind templates belong here -
  // portfolio entry templates are the entry form's picker.
  const availableTemplates = caseTemplates(templates)
  const curatedTemplates = availableTemplates.filter(t => t.is_curated)
  const personalTemplates = availableTemplates.filter(t => !t.is_curated)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    const pendingTags = specialtyRef.current?.commitPending()
    if (pendingTags?.error) { setError(pendingTags.error); return }
    // Read the real submitter: Enter used to trigger the first submit button
    // ("Save & add another"), and a click-set ref stuck after a failed save.
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null
    const addAnother = submitter?.dataset.addAnother === 'true'
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Your session could not be confirmed. Refresh the page or sign in again, then retry.')
      setSaving(false)
      return
    }

    const payload = {
      title: title.trim(),
      date,
      clinical_domain: clinicalDomains[0] ?? null,
      clinical_domains: clinicalDomains,
      // The typed-then-auto-committed tag is not in state yet at this point.
      specialty_tags: pendingTags?.value ?? specialtyTags,
      importance,
      // Competency themes share the legacy-named interview_themes column with
      // portfolio entries, so cases count in the dashboard theme coverage.
      interview_themes: interviewThemes,
      notes: notes.trim() || null,
    }

    if (mode === 'create') {
      const { data, error } = await supabase
        .from('cases')
        .insert({ ...payload, user_id: user.id })
        .select('id')
        .single()
      if (error) { setError('We could not save this case. Check the details and try again.'); setSaving(false); return }
      if (pendingFiles.length > 0) {
        setSaving(false); setUploading(true)
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, data.id, 'case')
        setUploading(false)
        if (uploadErrors.length > 0) {
          // The case IS saved. Staying on this create form meant "Save case"
          // again inserted a duplicate case - go to the saved case instead.
          if (draftKey) sessionStorage.removeItem(draftKey)
          setSaved(true)
          addToast(`Case saved, but some files failed to upload: ${uploadErrors.join('; ')}`, 'error')
          router.push(`/cases/${data.id}?upload=failed`)
          return
        }
      }
      const uploaded = pendingFiles.length
      if (draftKey) sessionStorage.removeItem(draftKey)
      setSaved(true)
      addToast(uploaded > 0 ? `Case logged · ${uploaded} file${uploaded === 1 ? '' : 's'} uploaded` : 'Case logged', 'success')
      if (addAnother) {
        setSaving(false)
        window.location.assign(`/cases/new?fresh=${Date.now()}`)
        return
      }
      router.push(uploaded > 0 ? `/cases/${data.id}?uploaded=${uploaded}` : `/cases/${data.id}`)
    } else {
      const { error } = await supabase
        .from('cases')
        .update(payload)
        .eq('id', initialData!.id!)
        .eq('user_id', user.id)
      if (error) { setError('We could not update this case. Check the details and try again.'); setSaving(false); return }
      if (pendingFiles.length > 0) {
        setSaving(false); setUploading(true)
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, initialData!.id!, 'case')
        setUploading(false)
        if (uploadErrors.length > 0) {
          // Changes and any successful files are saved; saving again from here
          // would re-upload the files that already succeeded.
          setSaved(true)
          addToast(`Case updated, but some files failed to upload: ${uploadErrors.join('; ')}`, 'error')
          router.push(`/cases/${initialData!.id}?upload=failed`)
          return
        }
      }
      const uploaded = pendingFiles.length
      const evidenceErrors = await applyStagedEvidence(initialData!.id!, 'case', stagedEvidence.attach, stagedEvidence.removals)
      setSaved(true)
      if (evidenceErrors.length > 0) {
        addToast(`Case updated, but ${evidenceErrors.join('; ')}. Please try again.`, 'error')
      } else {
        addToast(uploaded > 0 ? `Case updated · ${uploaded} file${uploaded === 1 ? '' : 's'} uploaded` : 'Case updated', 'success')
      }
      router.push(uploaded > 0 ? `/cases/${initialData!.id}?uploaded=${uploaded}` : `/cases/${initialData!.id}`)
    }
    router.refresh()
  }

  return (
    <>
    <form
      onSubmit={handleSubmit}
      onKeyDown={submitOnEnterAsPrimary}
      onPaste={event => {
        const files = Array.from(event.clipboardData.files).filter(file => file.type.startsWith('image/'))
        if (files.length === 0) return
        setPendingFiles(current => mergeUniqueFiles(current, files))
        markDirty()
      }}
      onDragOver={event => event.preventDefault()}
      onDrop={event => {
        // Swallow drops that miss the evidence dropzone so the browser doesn't
        // navigate away (and so stray files aren't staged unvalidated). The
        // EvidenceUpload dropzone handles real uploads and stops propagation.
        // (QOL-011 / QOL-014)
        event.preventDefault()
      }}
      className="space-y-5"
    >
      {/* Draft restored banner */}
      {draftRestored && (
        <div className="flex items-center justify-between bg-accent/10 border border-accent/20 rounded-lg px-3.5 py-2.5 text-sm text-[var(--accent-soft-text)] mb-4">
          <span>Draft restored</span>
          <button
            type="button"
            onClick={() => {
              if (draftKey) sessionStorage.removeItem(draftKey)
              setDraftRestored(false)
              setTitle('')
              setDate(new Date().toISOString().split('T')[0])
              setClinicalDomains([])
              setSpecialtyTags([])
              setImportance(null)
              setInterviewThemes([])
              setNotes('')
              setBaseline(null)
            }}
            className="text-xs text-accent/70 hover:text-[var(--accent-text)]"
          >
            Discard
          </button>
        </div>
      )}

      <AnonymisationBanner />

      {/* Title */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <label className={LABEL}>Case title <span className="text-red-400">*</span></label>
          {mode === 'create' && availableTemplates.length > 0 && (
            <button
              type="button"
              onClick={() => setTemplatePickerOpen(true)}
              className="mb-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Use template
            </button>
          )}
        </div>
        <input
          type="text"
          required
          value={title}
          maxLength={200}
          onChange={e => { setTitle(e.target.value); markDirty() }}
          className={INPUT}
          placeholder={ph('title', 'Brief description - no patient identifiers')}
        />
        <p className="text-xs text-[var(--text-secondary)] mt-1">
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
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          The medical setting of this encounter - used to filter and organise your cases.
        </p>
      </div>

      {/* Linked specialties */}
      <div>
        <label className={LABEL}>Linked specialties</label>
        <SpecialtyTagSelect
          ref={specialtyRef}
          value={specialtyTags}
          onChange={value => { setSpecialtyTags(value); markDirty() }}
          userInterests={userInterests}
          trackedOnly
        />
        {suggestedTags.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 text-[11px] text-[var(--text-muted)]">Suggested from your text - tap to add</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => { setSpecialtyTags(current => [...current, tag]); markDirty() }}
                  className="rounded border border-accent/30 bg-[var(--accent-soft)] px-2 py-1 text-[10px] text-[var(--accent-soft-text)]"
                >
                  + {formatSpecialtyLabel(tag)}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Link cases to the specialties you are tracking so you can filter by them. To count a case as specialty evidence, link it from the specialty tracker.
        </p>
      </div>

      {/* Importance */}
      <div>
        <label className={LABEL}>Importance</label>
        <ImportanceSelect value={importance} onChange={v => { setImportance(v); markDirty() }} />
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Optional - flag how important this case is to you. Tap the active level again to clear it.
        </p>
      </div>

      {/* Competency themes */}
      <CompetencyThemePicker value={interviewThemes} onChange={setInterviewThemes} onDirty={markDirty} />

      {/* Notes */}
      <div>
        <label className={LABEL}>Notes</label>
        <SnippetTextarea
          rows={6}
          value={notes}
          maxLength={10000}
          onValueChange={v => { setNotes(v); markDirty() }}
          className={INPUT}
          placeholder={ph('notes', 'Clinical context, learning points, what happened - anonymised… (type / for snippets)')}
        />
        {notes && <p className={WORD_COUNT_CLASS}>{wordCount(notes)} words</p>}
        <AnonymisationHint />
      </div>

      {/* Evidence uploads */}
      <div className="space-y-3">
        <label className={LABEL}>Evidence</label>
        {/* Already-attached files (edit mode): list with per-file remove/unlink (QOL-013) */}
        {mode === 'edit' && existingEvidence.length > 0 && (
          <EvidenceFiles
            initialFiles={existingEvidence}
            canDelete
            entryId={initialData?.id}
            entryType="case"
            stagedRemovals={stagedEvidence.removals}
            onStageRemoval={stagedEvidence.stageRemoval}
          />
        )}
        <EvidenceUpload files={pendingFiles} onChange={files => { setPendingFiles(files); markDirty() }} />
        {/* Reuse an already-uploaded file instead of re-uploading it (staged until Save changes). */}
        {mode === 'edit' && initialData?.id && (
          <>
            {stagedEvidence.attach.length > 0 && (
              <ul className="space-y-1.5">
                {stagedEvidence.attach.map(file => (
                  <li key={file.id} className="flex items-center gap-3 rounded-lg border border-accent/30 bg-[var(--accent-soft)] px-3.5 py-2 text-xs text-[var(--accent-soft-text)]">
                    <span className="min-w-0 flex-1 truncate">{file.file_name} - will be attached when you save changes</span>
                    <button type="button" onClick={() => stagedEvidence.unstageAttach(file.id)} className="shrink-0 font-medium underline">Don&apos;t attach</button>
                  </li>
                ))}
              </ul>
            )}
            <AttachExistingEvidence
              entryId={initialData.id}
              entryType="case"
              stagedIds={stagedEvidence.attach.map(file => file.id)}
              onStage={stagedEvidence.stageAttach}
            />
          </>
        )}
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
            if (isDirty) { setLeaveConfirmOpen(true); return }
            router.back()
          }}
          className="flex-1 border border-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] rounded-xl py-3 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        {mode === 'create' && (
          <button
            type="submit"
            data-add-another="true"
            disabled={saving || uploading}
            className="flex-1 border border-accent/40 text-[var(--accent-text)] hover:bg-accent/10 disabled:opacity-50 rounded-xl py-3 text-sm font-medium transition-colors"
          >
            Save & add another
          </button>
        )}
        <button
          type="submit"
          disabled={saving || uploading}
          className="flex-[2] bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 text-[var(--button-primary-text)] font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          {saving ? 'Saving…' : mode === 'create' ? 'Save case' : 'Save changes'}
        </button>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="rounded-xl overflow-hidden bg-[var(--bg-surface)] border border-white/[0.08] px-4 py-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent)] rounded-full motion-safe:animate-[upload-progress_1.4s_ease-in-out_infinite]" />
          </div>
          <span className="text-xs text-[var(--text-muted)] shrink-0">Uploading {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}…</span>
        </div>
      )}
    </form>

    <ConfirmDialog
      open={leaveConfirmOpen}
      title="Discard your changes?"
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      tone="danger"
      onConfirm={() => {
        setLeaveConfirmOpen(false)
        setSaved(true)
        if (draftKey) { try { sessionStorage.removeItem(draftKey) } catch {} }
        router.back()
      }}
      onCancel={() => setLeaveConfirmOpen(false)}
    >
      <p>You have changes on this case that are not saved. Leaving now discards them{mode === 'edit' ? ', including any files you chose to attach or remove' : ''}.</p>
    </ConfirmDialog>

    {/* Template picker modal */}
    {templatePickerOpen && (
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm" onClick={() => setTemplatePickerOpen(false)}>
        <div
          ref={templatePickerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Choose a case template"
          tabIndex={-1}
          className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Choose a template</h2>
            <button
              onClick={() => setTemplatePickerOpen(false)}
              aria-label="Close template picker"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-5">
            {/* Personal templates */}
            {personalTemplates.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-[var(--text-emphasis)] uppercase tracking-wider mb-2">Your templates</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {personalTemplates.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="text-left px-3.5 py-3 rounded-xl border border-white/[0.08] hover:border-accent/40 hover:bg-accent/5 transition-colors"
                    >
                      <p className="text-sm font-medium text-[var(--text-primary)]">{t.name}</p>
                      {t.description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.description}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Curated templates */}
            {curatedTemplates.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-[var(--text-emphasis)] uppercase tracking-wider mb-2">Curated templates</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {curatedTemplates.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="text-left px-3.5 py-3 rounded-xl border border-white/[0.08] hover:border-accent/40 hover:bg-accent/5 transition-colors"
                    >
                      <p className="text-sm font-medium text-[var(--text-primary)]">{t.name}</p>
                      {t.description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.description}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
