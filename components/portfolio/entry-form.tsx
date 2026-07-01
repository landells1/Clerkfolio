'use client'

import { Children, cloneElement, isValidElement, useId, useState, useEffect, useRef, type FormEvent, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, type Category, type NewPortfolioEntry } from '@/lib/types/portfolio'
import type { Template } from '@/lib/types/templates'
import SpecialtyTagSelect, { type SpecialtyTagSelectHandle } from './specialty-tag-select'
import CompetencyThemePicker from './competency-theme-picker'
import ImportanceSelect from './importance-select'
import EvidenceUpload from '@/components/shared/evidence-upload'
import EvidenceFiles from '@/components/shared/evidence-files'
import CategoryGuide from '@/components/portfolio/category-guide'
import { AnonymisationBanner, AnonymisationHint } from '@/components/shared/anonymisation-notice'
import { uploadPendingFiles, type EvidenceFile } from '@/lib/supabase/storage'
import { mergeUniqueFiles } from '@/lib/upload/dedupe-files'
import { portfolioDraftHasContent, portfolioDraftKeysFor } from '@/lib/drafts/draft-keys'
import { useToast } from '@/components/ui/toast-provider'
import type { Importance } from '@/lib/types/importance'
import { validateEntryNumericFields } from '@/lib/utils/entry-numeric-validation'
import { suggestTagsForText } from '@/lib/heuristics/tag-suggester'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { findSnippetForSlash, replaceSnippetShortcut, useSnippets } from '@/components/ui/slash-menu'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Partial<NewPortfolioEntry> & { id?: string; interview_themes?: string[] }
  userInterests?: string[]
  defaultCategory?: Category
  templates?: Template[]
  authenticatedUserId?: string
  existingEvidence?: EvidenceFile[]
}

const INPUT ='w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors'
const SELECT = 'w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors'
const LABEL = 'block text-xs font-medium text-[var(--text-emphasis)] mb-1.5 uppercase tracking-wide'
const FIELD = 'flex flex-col gap-1'
const GRID2 = 'grid grid-cols-1 gap-4 sm:grid-cols-2'
const TOGGLE_BTN = (active: boolean) =>
  `flex-1 py-2 text-sm rounded-lg border transition-colors ${
    active
      ? 'bg-[var(--accent-soft)] border-accent/30 text-[var(--accent-soft-text)]'
      : 'bg-[var(--bg-canvas)] border-white/[0.08] text-[var(--text-secondary)] hover:border-white/[0.15]'
  }`

const WORD_COUNT_CLASS = 'text-[10px] text-[var(--text-secondary)] mt-1 text-right'
const LONG_TEXT_MAX = 10000

const wordCount = (s: string) => s.trim() ? s.trim().split(/\s+/).length : 0

// Reflection framework delimiters
const GIBBS_FIELDS = [
  { key: 'description', label: 'Description', hint: 'What happened?' },
  { key: 'feelings', label: 'Feelings', hint: 'What were you thinking and feeling?' },
  { key: 'evaluation', label: 'Evaluation', hint: 'What was good and bad about the experience?' },
  { key: 'analysis', label: 'Analysis', hint: 'What sense can you make of the situation?' },
  { key: 'conclusion', label: 'Conclusion', hint: 'What else could you have done?' },
  { key: 'action_plan', label: 'Action Plan', hint: 'If it arose again, what would you do?' },
]
const ROLFE_FIELDS = [
  { key: 'what', label: 'What?', hint: 'Describe the event' },
  { key: 'so_what', label: 'So What?', hint: 'What does this mean for you/the patient?' },
  { key: 'now_what', label: 'Now What?', hint: 'What will you do differently?' },
]
const DRISCOLL_FIELDS = [
  { key: 'what', label: 'What?', hint: 'What happened?' },
  { key: 'so_what', label: 'So What?', hint: 'Why was this significant?' },
  { key: 'now_what', label: 'Now What?', hint: 'What action will you take?' },
]

function buildFrameworkText(framework: string, parts: Record<string, string>): string {
  const fields = framework === 'gibbs' ? GIBBS_FIELDS : framework === 'driscoll' ? DRISCOLL_FIELDS : ROLFE_FIELDS
  return fields
    .map(f => `**${f.label}:**\n${parts[f.key] ?? ''}`)
    .join('\n\n')
}

function parseFrameworkText(framework: string, text: string): Record<string, string> {
  const fields = framework === 'gibbs' ? GIBBS_FIELDS : framework === 'driscoll' ? DRISCOLL_FIELDS : ROLFE_FIELDS
  const result: Record<string, string> = {}
  fields.forEach((f, i) => {
    const start = text.indexOf(`**${f.label}:**\n`)
    if (start === -1) { result[f.key] = ''; return }
    const contentStart = start + `**${f.label}:**\n`.length
    const nextField = fields[i + 1]
    const end = nextField ? text.indexOf(`\n\n**${nextField.label}:**`) : text.length
    result[f.key] = text.slice(contentStart, end === -1 ? text.length : end).trim()
  })
  return result
}

// Fallback for legacy rows saved before refl_framework was persisted. Rolfe
// and Driscoll serialize identical field labels (What? / So What? / Now
// What?), so they are indistinguishable from text alone - 'rolfe' is the
// deliberate fallback for both; the parsed fields are the same either way.
function detectFramework(text: string): 'gibbs' | 'rolfe' | 'none' {
  if (text.includes('**Description:**') && text.includes('**Action Plan:**')) return 'gibbs'
  if (text.includes('**What?:**') && text.includes('**Now What?:**')) return 'rolfe'
  return 'none'
}

function draftKeyForCategory(category: Category, userId: string) {
  return `clerkfolio-${category}-draft:${userId}`
}

const LABELABLE_FIELD_TYPES = new Set(['input', 'select', 'textarea'])

function Field({ label, children }: { label: string; children: ReactNode }) {
  const generatedId = useId()
  const childArray = Children.toArray(children)
  let fieldId: string | undefined

  const labelledChildren = childArray.map((child, index) => {
    if (index !== 0 || !isValidElement(child) || typeof child.type !== 'string') return child
    if (!LABELABLE_FIELD_TYPES.has(child.type)) return child

    const element = child as ReactElement<{ id?: string }>
    fieldId = element.props.id ?? generatedId
    return element.props.id ? element : cloneElement(element, { id: fieldId })
  })

  return (
    <div className={FIELD}>
      <label htmlFor={fieldId} className={LABEL}>{label}</label>
      {labelledChildren}
    </div>
  )
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <div
        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          checked ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--bg-canvas)] border-white/[0.15]'
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--bg-canvas)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
    </label>
  )
}

export default function EntryForm({ mode, initialData, userInterests = [], defaultCategory, templates = [], authenticatedUserId, existingEvidence = [] }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()
  const snippets = useSnippets()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftRestored, setDraftRestored] = useState(false)
  const [category, setCategory] = useState<Category>(
    initialData?.category ?? defaultCategory ?? 'audit_qip'
  )
  const draftKey = mode === 'create' && authenticatedUserId ? draftKeyForCategory(category, authenticatedUserId) : null
  const [title, setTitle] = useState(initialData?.title ?? '')
  // Init empty to avoid SSR/client hydration mismatch when the new-entry page
  // straddles UTC midnight. Today's date is filled in by the post-mount
  // useEffect below.
  const [date, setDate] = useState(initialData?.date ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [specialtyTags, setSpecialtyTags] = useState<string[]>(initialData?.specialty_tags ?? [])
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [interviewThemes, setInterviewThemes] = useState<string[]>(initialData?.interview_themes ?? [])
  const [importance, setImportance] = useState<Importance | null>(initialData?.importance ?? null)

  // Template guidance placeholders - overridden when a template is applied
  const [guidancePlaceholders, setGuidancePlaceholders] = useState<Record<string, string>>({})
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  // Audit & QIP
  const [auditType, setAuditType] = useState(initialData?.audit_type ?? 'audit')
  const [auditRole, setAuditRole] = useState(initialData?.audit_role ?? '')
  const [auditCycleStage, setAuditCycleStage] = useState(initialData?.audit_cycle_stage ?? '')
  const [auditTrust, setAuditTrust] = useState(initialData?.audit_trust ?? '')
  const [auditOutcome, setAuditOutcome] = useState(initialData?.audit_outcome ?? '')
  const [auditPresented, setAuditPresented] = useState(initialData?.audit_presented ?? false)

  // Teaching
  const [teachingType, setTeachingType] = useState(initialData?.teaching_type ?? '')
  const [teachingAudience, setTeachingAudience] = useState(initialData?.teaching_audience ?? '')
  const [teachingSetting, setTeachingSetting] = useState(initialData?.teaching_setting ?? '')
  const [teachingEvent, setTeachingEvent] = useState(initialData?.teaching_event ?? '')
  const [teachingInvited, setTeachingInvited] = useState(initialData?.teaching_invited ?? false)

  // Conference
  const [confType, setConfType] = useState(initialData?.conf_type ?? 'conference')
  const [confEventName, setConfEventName] = useState(initialData?.conf_event_name ?? '')
  const [confAttendance, setConfAttendance] = useState(initialData?.conf_attendance ?? '')
  const [confLevel, setConfLevel] = useState(initialData?.conf_level ?? '')
  const [confCpdHours, setConfCpdHours] = useState<string>(initialData?.conf_cpd_hours?.toString() ?? '')
  const [confCertificate, setConfCertificate] = useState(initialData?.conf_certificate ?? false)

  // Publication
  const [pubType, setPubType] = useState(initialData?.pub_type ?? '')
  const [pubJournal, setPubJournal] = useState(initialData?.pub_journal ?? '')
  const [pubAuthors, setPubAuthors] = useState(initialData?.pub_authors ?? '')
  const [pubStatus, setPubStatus] = useState(initialData?.pub_status ?? '')
  const [pubDoi, setPubDoi] = useState(initialData?.pub_doi ?? '')

  // Leadership
  const [leaderRole, setLeaderRole] = useState(initialData?.leader_role ?? '')
  const [leaderOrg, setLeaderOrg] = useState(initialData?.leader_organisation ?? '')
  const [leaderStart, setLeaderStart] = useState(initialData?.leader_start_date ?? '')
  const [leaderEnd, setLeaderEnd] = useState(initialData?.leader_end_date ?? '')
  const [leaderOngoing, setLeaderOngoing] = useState(initialData?.leader_ongoing ?? false)

  // Prize
  const [prizeBody, setPrizeBody] = useState(initialData?.prize_body ?? '')
  const [prizeLevel, setPrizeLevel] = useState(initialData?.prize_level ?? '')
  const [prizeDescription, setPrizeDescription] = useState(initialData?.prize_description ?? '')

  // Procedure
  const [procName, setProcName] = useState(initialData?.proc_name ?? '')
  const [procSetting, setProcSetting] = useState(initialData?.proc_setting ?? '')
  const [procSupervision, setProcSupervision] = useState(initialData?.proc_supervision ?? '')
  const [procCount, setProcCount] = useState<string>(initialData?.proc_count?.toString() ?? '')

  // Reflection
  const [reflType, setReflType] = useState(initialData?.refl_type ?? '')
  const [reflContext, setReflContext] = useState(initialData?.refl_clinical_context ?? '')
  const [reflSupervisor, setReflSupervisor] = useState(initialData?.refl_supervisor ?? '')
  const [reflFreeText, setReflFreeText] = useState(initialData?.refl_free_text ?? '')

  // Reflection framework
  const initialFw = (initialData?.refl_framework as 'none' | 'gibbs' | 'rolfe' | 'driscoll' | undefined)
    ?? (initialData?.refl_free_text ? detectFramework(initialData.refl_free_text) : 'none')
  const [reflFramework, setReflFramework] = useState<'none' | 'gibbs' | 'rolfe' | 'driscoll'>(initialFw)
  const [reflParts, setReflParts] = useState<Record<string, string>>(() => {
    if (initialFw !== 'none' && initialData?.refl_free_text) {
      return parseFrameworkText(initialFw, initialData.refl_free_text)
    }
    return {}
  })

  // Custom
  const [customFreeText, setCustomFreeText] = useState(initialData?.custom_free_text ?? '')

  // Evidence files
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // Dirty state
  const [isDirty, setIsDirty] = useState(false)

  // ── Apply a template ────────────────────────────────────────────────────────

  function applyTemplate(t: Template) {
    setCategory(t.category as Category)
    setGuidancePlaceholders(t.guidance_prompts)

    const d = t.field_defaults
    if (d.audit_type !== undefined) setAuditType(String(d.audit_type))
    if (d.audit_role !== undefined) setAuditRole(String(d.audit_role))
    if (d.audit_cycle_stage !== undefined) setAuditCycleStage(String(d.audit_cycle_stage))
    if (d.audit_trust !== undefined) setAuditTrust(String(d.audit_trust))
    if (d.teaching_type !== undefined) setTeachingType(String(d.teaching_type))
    if (d.teaching_audience !== undefined) setTeachingAudience(String(d.teaching_audience))
    if (d.teaching_setting !== undefined) setTeachingSetting(String(d.teaching_setting))
    if (d.conf_type !== undefined) setConfType(String(d.conf_type))
    if (d.conf_attendance !== undefined) setConfAttendance(String(d.conf_attendance))
    if (d.conf_level !== undefined) setConfLevel(String(d.conf_level))
    if (d.pub_type !== undefined) setPubType(String(d.pub_type))
    if (d.pub_status !== undefined) setPubStatus(String(d.pub_status))
    if (d.prize_level !== undefined) setPrizeLevel(String(d.prize_level))
    if (d.proc_name !== undefined) setProcName(String(d.proc_name))
    if (d.refl_type !== undefined) setReflType(String(d.refl_type))
    markDirty()
    setTemplatePickerOpen(false)
  }

  // After hydration, fill the date default if nothing restored it. Runs once.
  useEffect(() => {
    setDate(current => current || new Date().toISOString().split('T')[0])
  }, [])

  // ── Auto-save draft (create mode only) ──────────────────────────────────

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
      // Don't restore (or show the "Draft restored" banner for) an empty draft -
      // e.g. one autosaved from an untouched form whose only non-empty fields are
      // the structural defaults. Clean it up instead. (BUG-005)
      if (!portfolioDraftHasContent(d)) {
        sessionStorage.removeItem(draftKey)
        return
      }
      if (d.category) setCategory(d.category)
      if (d.title !== undefined) setTitle(d.title)
      if (d.date !== undefined) setDate(d.date)
      if (d.specialtyTags !== undefined) setSpecialtyTags(d.specialtyTags)
      if (d.interviewThemes !== undefined) setInterviewThemes(d.interviewThemes)
      if (d.importance !== undefined) setImportance(d.importance)
      if (d.auditType !== undefined) setAuditType(d.auditType)
      if (d.auditRole !== undefined) setAuditRole(d.auditRole)
      if (d.auditCycleStage !== undefined) setAuditCycleStage(d.auditCycleStage)
      if (d.auditTrust !== undefined) setAuditTrust(d.auditTrust)
      if (d.auditPresented !== undefined) setAuditPresented(d.auditPresented)
      if (d.teachingType !== undefined) setTeachingType(d.teachingType)
      if (d.teachingAudience !== undefined) setTeachingAudience(d.teachingAudience)
      if (d.teachingSetting !== undefined) setTeachingSetting(d.teachingSetting)
      if (d.teachingEvent !== undefined) setTeachingEvent(d.teachingEvent)
      if (d.teachingInvited !== undefined) setTeachingInvited(d.teachingInvited)
      if (d.confType !== undefined) setConfType(d.confType)
      if (d.confEventName !== undefined) setConfEventName(d.confEventName)
      if (d.confAttendance !== undefined) setConfAttendance(d.confAttendance)
      if (d.confLevel !== undefined) setConfLevel(d.confLevel)
      if (d.confCpdHours !== undefined) setConfCpdHours(d.confCpdHours)
      // confCertificate intentionally excluded from draft (avoids CodeQL clear-text-storage alert; easy to re-tick)
      if (d.pubType !== undefined) setPubType(d.pubType)
      if (d.pubJournal !== undefined) setPubJournal(d.pubJournal)
      if (d.pubAuthors !== undefined) setPubAuthors(d.pubAuthors)
      if (d.pubStatus !== undefined) setPubStatus(d.pubStatus)
      if (d.pubDoi !== undefined) setPubDoi(d.pubDoi)
      if (d.leaderRole !== undefined) setLeaderRole(d.leaderRole)
      if (d.leaderOrg !== undefined) setLeaderOrg(d.leaderOrg)
      if (d.leaderStart !== undefined) setLeaderStart(d.leaderStart)
      if (d.leaderEnd !== undefined) setLeaderEnd(d.leaderEnd)
      if (d.leaderOngoing !== undefined) setLeaderOngoing(d.leaderOngoing)
      if (d.prizeBody !== undefined) setPrizeBody(d.prizeBody)
      if (d.prizeLevel !== undefined) setPrizeLevel(d.prizeLevel)
      if (d.procName !== undefined) setProcName(d.procName)
      if (d.procSetting !== undefined) setProcSetting(d.procSetting)
      if (d.procSupervision !== undefined) setProcSupervision(d.procSupervision)
      if (d.procCount !== undefined) setProcCount(d.procCount)
      if (d.reflType !== undefined) setReflType(d.reflType)
      if (d.reflContext !== undefined) setReflContext(d.reflContext)
      if (d.reflSupervisor !== undefined) setReflSupervisor(d.reflSupervisor)
      if (d.reflFramework !== undefined) setReflFramework(d.reflFramework)
      setDraftRestored(true)
    } catch {
      // ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, mode])

  // When set, the next scheduled autosave write is skipped (then re-armed).
  // Used after a successful save or an explicit Discard so the form doesn't
  // immediately re-persist a draft we just cleared (BUG-005).
  const suppressDraftRef = useRef(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (mode !== 'create' || !draftKey) return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      if (suppressDraftRef.current) { suppressDraftRef.current = false; return }
      const fields = {
        category, title, date, specialtyTags, interviewThemes, importance,
        auditType, auditRole, auditCycleStage, auditTrust, auditPresented,
        teachingType, teachingAudience, teachingSetting, teachingEvent, teachingInvited,
        confType, confEventName, confAttendance, confLevel, confCpdHours,
        pubType, pubJournal, pubAuthors, pubStatus, pubDoi,
        leaderRole, leaderOrg, leaderStart, leaderEnd, leaderOngoing,
        prizeBody, prizeLevel,
        procName, procSetting, procSupervision, procCount,
        reflType, reflContext, reflSupervisor, reflFramework,
      }
      // Only persist a draft once the form holds real user input. Autosaving a
      // pristine form (just the default selects/date) is what produced a false
      // "Draft restored" banner, a two-click Discard, and a stale resume card on
      // the dashboard. If the form has been emptied back to defaults, drop any
      // stale draft too. (BUG-005)
      if (!portfolioDraftHasContent(fields)) {
        sessionStorage.removeItem(draftKey)
        return
      }
      sessionStorage.setItem(draftKey, JSON.stringify({
        ...fields,
        _expires: Date.now() + 24 * 60 * 60 * 1000,
      }))
    }, 1000)
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
  }, [
    mode, category, title, date, specialtyTags, interviewThemes, importance,
    auditType, auditRole, auditCycleStage, auditTrust, auditPresented,
    teachingType, teachingAudience, teachingSetting, teachingEvent, teachingInvited,
    confType, confEventName, confAttendance, confLevel, confCpdHours,
    pubType, pubJournal, pubAuthors, pubStatus, pubDoi,
    leaderRole, leaderOrg, leaderStart, leaderEnd, leaderOngoing,
    prizeBody, prizeLevel,
    procName, procSetting, procSupervision, procCount,
    reflType, reflContext, reflSupervisor, reflFramework, draftKey,
  ])

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

  function markDirty() { suppressDraftRef.current = false; setIsDirty(true) }

  // Clear every portfolio draft fragment for this user. The new-entry form only
  // edits one entry at a time, so once it is saved (or discarded) any per-category
  // draft left in sessionStorage is stale - this also clears the dashboard
  // "Pick up where you left off" card. (BUG-005)
  function clearPortfolioDrafts() {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    suppressDraftRef.current = true
    if (!authenticatedUserId) return
    try {
      const keys: string[] = []
      for (let index = 0; index < sessionStorage.length; index++) {
        const key = sessionStorage.key(index)
        if (key) keys.push(key)
      }
      for (const key of portfolioDraftKeysFor(keys, authenticatedUserId)) {
        sessionStorage.removeItem(key)
      }
    } catch {
      // ignore storage errors
    }
  }

  function handleSnippetKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    value: string,
    setValue: (next: string) => void
  ) {
    if (event.key !== 'Enter' && event.key !== 'Tab') return
    const target = event.currentTarget
    if (target.selectionStart !== target.selectionEnd) return
    const snippet = findSnippetForSlash(value, target.selectionStart, snippets)
    if (!snippet) return
    const next = replaceSnippetShortcut(value, target.selectionStart, snippet)
    if (!next) return

    event.preventDefault()
    setValue(next.value)
    markDirty()
    requestAnimationFrame(() => target.setSelectionRange(next.cursor, next.cursor))
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setSuggestedTags(suggestTagsForText(`${title} ${notes}`, specialtyTags))
    }, 250)
    return () => clearTimeout(timer)
  }, [notes, specialtyTags, title])

  // Compute refl_free_text from framework state
  function getReflFreeText(): string | null {
    if (reflFramework === 'none') return reflFreeText || null
    const text = buildFrameworkText(reflFramework, reflParts)
    return text.trim() ? text : null
  }

  function buildPayload(): Omit<NewPortfolioEntry, 'user_id'> {
    const base = {
      category,
      title,
      date,
      specialty_tags: specialtyTags,
      notes: notes || null,
      interview_themes: interviewThemes,
      importance,
    }
    switch (category) {
      case 'audit_qip': return { ...base, audit_type: auditType, audit_role: auditRole || null, audit_cycle_stage: auditCycleStage || null, audit_trust: auditTrust || null, audit_outcome: auditOutcome || null, audit_presented: auditPresented }
      case 'teaching': return { ...base, teaching_type: teachingType || null, teaching_audience: teachingAudience || null, teaching_setting: teachingSetting || null, teaching_event: teachingEvent || null, teaching_invited: teachingInvited }
      case 'conference': return { ...base, conf_type: confType, conf_event_name: confEventName || null, conf_attendance: confAttendance || null, conf_level: confLevel || null, conf_cpd_hours: confCpdHours ? (v => isNaN(v) ? null : v)(parseFloat(confCpdHours)) : null, conf_certificate: confCertificate }
      case 'publication': return { ...base, pub_type: pubType || null, pub_journal: pubJournal || null, pub_authors: pubAuthors || null, pub_status: pubStatus || null, pub_doi: pubDoi || null }
      case 'leadership': return { ...base, leader_role: leaderRole || null, leader_organisation: leaderOrg || null, leader_start_date: leaderStart || null, leader_end_date: leaderOngoing ? null : (leaderEnd || null), leader_ongoing: leaderOngoing }
      case 'prize': return { ...base, prize_body: prizeBody || null, prize_level: prizeLevel || null, prize_description: prizeDescription || null }
      case 'procedure': return { ...base, proc_name: procName || null, proc_setting: procSetting || null, proc_supervision: procSupervision || null, proc_count: procCount ? (v => isNaN(v) ? null : v)(parseInt(procCount, 10)) : null }
      case 'reflection': return { ...base, refl_type: reflType || null, refl_framework: reflFramework === 'none' ? null : reflFramework, refl_clinical_context: reflContext || null, refl_supervisor: reflSupervisor || null, refl_free_text: getReflFreeText() }
      case 'custom': return { ...base, custom_free_text: customFreeText || null }
    }
  }


  function resetForm() {
    clearPortfolioDrafts()
    setIsDirty(false)
    setDraftRestored(false)
    setCategory(defaultCategory ?? 'audit_qip')
    setTitle('')
    setDate(new Date().toISOString().split('T')[0])
    setNotes('')
    setSpecialtyTags([])
    setInterviewThemes([])
    setImportance(null)
    setGuidancePlaceholders({})
    setAuditType('audit'); setAuditRole(''); setAuditCycleStage(''); setAuditTrust(''); setAuditOutcome(''); setAuditPresented(false)
    setTeachingType(''); setTeachingAudience(''); setTeachingSetting(''); setTeachingEvent(''); setTeachingInvited(false)
    setConfType('conference'); setConfEventName(''); setConfAttendance(''); setConfLevel(''); setConfCpdHours(''); setConfCertificate(false)
    setPubType(''); setPubJournal(''); setPubAuthors(''); setPubStatus(''); setPubDoi('')
    setLeaderRole(''); setLeaderOrg(''); setLeaderStart(''); setLeaderEnd(''); setLeaderOngoing(false)
    setPrizeBody(''); setPrizeLevel(''); setPrizeDescription('')
    setProcName(''); setProcSetting(''); setProcSupervision(''); setProcCount('')
    setReflType(''); setReflContext(''); setReflSupervisor(''); setReflFreeText(''); setReflFramework('none'); setReflParts({})
    setCustomFreeText('')
  }

  const addAnotherRef = useRef(false)
  const specialtyRef = useRef<SpecialtyTagSelectHandle | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // The form sets noValidate so we surface our own inline messages (in the
    // error banner) instead of the easy-to-miss native validation bubble.
    if (!title.trim()) { setError('Title is required.'); return }
    if (!date) { setError('Date is required.'); return }
    const numericError = validateEntryNumericFields(category, procCount, confCpdHours)
    if (numericError) { setError(numericError); return }
    // Flush any uncommitted specialty search text. If exactly one option
    // matches we auto-commit it; otherwise the SpecialtyTagSelect surfaces an
    // inline warning of its own and we block the save with a matching banner.
    const pendingTagError = specialtyRef.current?.commitPending()
    if (pendingTagError) { setError(pendingTagError); return }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Your session could not be confirmed. Refresh the page or sign in again, then retry.')
      setSaving(false)
      return
    }

    const payload = buildPayload()

    if (mode === 'create') {
      const { count: existingInCategory } = await supabase
        .from('portfolio_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('category', category)
        .is('deleted_at', null)
      const { data, error } = await supabase
        .from('portfolio_entries')
        .insert({ ...payload, user_id: user.id })
        .select('id')
        .single()
      if (error) { setError('We could not save this portfolio entry. Check the details and try again.'); setSaving(false); return }
      if (pendingFiles.length > 0) {
        setSaving(false); setUploading(true)
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, data.id, 'portfolio')
        setUploading(false)
        if (uploadErrors.length > 0) {
          clearPortfolioDrafts()
          setIsDirty(false)
          addToast('Entry saved, but some files failed to upload.', 'error')
          router.push(`/portfolio/${data.id}?upload=failed`)
          return
        }
      }
      clearPortfolioDrafts()
      setIsDirty(false)
      if ((existingInCategory ?? 0) === 0) {
        import('canvas-confetti').then(mod => mod.default({ particleCount: 60, spread: 55, origin: { y: 0.7 }, ticks: 120 }))
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('first_per_category')
          .eq('id', user.id)
          .maybeSingle()
        const existingFirsts = (profileRow?.first_per_category ?? {}) as Record<string, string>
        if (!existingFirsts[category]) {
          await supabase
            .from('profiles')
            .update({ first_per_category: { ...existingFirsts, [category]: new Date().toISOString() } })
            .eq('id', user.id)
        }
      }
      const uploaded = pendingFiles.length
      addToast(uploaded > 0 ? `Entry saved · ${uploaded} file${uploaded === 1 ? '' : 's'} uploaded` : 'Entry saved', 'success')
      if (addAnotherRef.current) {
        addAnotherRef.current = false
        setSaving(false)
        window.location.assign(`/portfolio/new?category=${category}&fresh=${Date.now()}`)
        return
      }
      router.push(uploaded > 0 ? `/portfolio/${data.id}?uploaded=${uploaded}` : `/portfolio/${data.id}`)
    } else {
      const { error } = await supabase
        .from('portfolio_entries')
        .update(payload)
        .eq('id', initialData!.id!)
        .eq('user_id', user.id)
      if (error) { setError('We could not update this portfolio entry. Check the details and try again.'); setSaving(false); return }
      if (pendingFiles.length > 0) {
        setSaving(false); setUploading(true)
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, initialData!.id!, 'portfolio')
        setUploading(false)
        if (uploadErrors.length > 0) {
          setError(`Changes saved, but some files failed to upload: ${uploadErrors.join('; ')}`)
          return
        }
      }
      const uploaded = pendingFiles.length
      setIsDirty(false)
      addToast(uploaded > 0 ? `Changes saved · ${uploaded} file${uploaded === 1 ? '' : 's'} uploaded` : 'Changes saved', 'success')
      router.push(uploaded > 0 ? `/portfolio/${initialData!.id}?uploaded=${uploaded}` : `/portfolio/${initialData!.id}`)
    }
  }

  const ph = (key: string, fallback: string) => guidancePlaceholders[key] ?? fallback

  const LEVEL_OPTIONS = ['local', 'regional', 'national', 'international']

  // Grouped templates for the picker
  const curatedTemplates = templates.filter(t => t.is_curated)
  const personalTemplates = templates.filter(t => !t.is_curated)
  const groupedCurated = CATEGORIES.reduce<Record<string, Template[]>>((acc, cat) => {
    acc[cat.value] = curatedTemplates.filter(t => t.category === cat.value)
    return acc
  }, {})

  return (
    <>
      <form
        onSubmit={handleSubmit}
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
        noValidate
        className="space-y-8"
      >
        {/* Draft restored banner */}
        {draftRestored && (
          <div className="flex items-center justify-between bg-accent/10 border border-accent/20 rounded-lg px-3.5 py-2.5 text-sm text-[var(--accent-soft-text)] mb-4">
            {/* Free text (notes, reflection content) is deliberately excluded
                from the autosaved draft for privacy - say so, or a user who
                drafted a Gibbs reflection finds the section open and every
                box empty with no explanation. */}
            <span>Draft restored — notes and reflection text aren&apos;t auto-saved</span>
            <button type="button" onClick={resetForm} className="text-xs text-accent/70 hover:text-[var(--accent-text)]">
              Discard
            </button>
          </div>
        )}

        <CategoryGuide category={category} />

        {(category === 'reflection' || category === 'procedure') && <AnonymisationBanner />}

        {/* Category selector */}
        {mode === 'create' && (
          <div>
            <div className="flex items-center justify-between gap-3">
              <label className={LABEL}>Category</label>
              {templates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTemplatePickerOpen(true)}
                  className="mb-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Use template
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`py-2.5 px-3 text-sm rounded-xl border text-left transition-colors ${
                    category === c.value
                      ? 'bg-[var(--accent-soft)] border-accent/30 text-[var(--accent-soft-text)]'
                      : 'bg-[var(--bg-surface)] border-white/[0.08] text-[var(--text-secondary)] hover:border-white/[0.15]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Common fields */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-[var(--text-emphasis)] uppercase tracking-wider">General</h3>
          <Field label="Title *">
            <input type="text" required maxLength={200} value={title} onChange={e => { setTitle(e.target.value); markDirty() }} className={INPUT} placeholder={ph('title', 'Give this entry a clear title')} />
          </Field>
          <div className={GRID2}>
            <Field label="Date *">
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} onFocus={() => markDirty()} className={INPUT} />
            </Field>
          </div>
          <Field label="Linked specialties">
            <p className="text-[11px] text-[var(--text-muted)] -mt-1 mb-1.5">Which of your tracked specialty programmes can you use this entry for?</p>
            <SpecialtyTagSelect ref={specialtyRef} value={specialtyTags} onChange={v => { setSpecialtyTags(v); markDirty() }} userInterests={userInterests} trackedOnly />
            {suggestedTags.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-[11px] text-[var(--text-muted)]">Suggested from your text &mdash; tap to add</p>
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
          </Field>
          <Field label="Notes / comments">
            <textarea rows={3} value={notes ?? ''} maxLength={LONG_TEXT_MAX} onChange={e => { setNotes(e.target.value); markDirty() }} onKeyDown={e => handleSnippetKeyDown(e, notes, setNotes)} onFocus={() => markDirty()} className={INPUT} placeholder={ph('notes', 'Any additional context or notes...')} />
            {notes && <p className={WORD_COUNT_CLASS}>{wordCount(notes)} words</p>}
            <AnonymisationHint />
          </Field>

          <Field label="Importance">
            <ImportanceSelect value={importance} onChange={v => { setImportance(v); markDirty() }} />
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Optional — flag how important this entry is to you. Tap the active level again to clear it.
            </p>
          </Field>

          <CompetencyThemePicker value={interviewThemes} onChange={setInterviewThemes} onDirty={markDirty} />
        </div>

        {/* Category-specific fields */}
        <div className="space-y-4 border-t border-white/[0.06] pt-6">
          <h3 className="text-xs font-medium text-[var(--text-emphasis)] uppercase tracking-wider">
            {CATEGORIES.find(c => c.value === category)?.label} details
          </h3>

          {/* ── Audit & QIP ── */}
          {category === 'audit_qip' && (
            <div className="space-y-4">
              <Field label="Type">
                <div className="flex gap-2">
                  <button type="button" className={TOGGLE_BTN(auditType === 'audit')} onClick={() => { setAuditType('audit'); markDirty() }}>Audit</button>
                  <button type="button" className={TOGGLE_BTN(auditType === 'qip')} onClick={() => { setAuditType('qip'); markDirty() }}>QIP</button>
                </div>
              </Field>
              <div className={GRID2}>
                <Field label="Your role"><input type="text" value={auditRole} onChange={e => setAuditRole(e.target.value)} className={INPUT} placeholder="e.g. Lead auditor" /></Field>
                <Field label="Trust / hospital"><input type="text" value={auditTrust} onChange={e => setAuditTrust(e.target.value)} className={INPUT} placeholder="e.g. Royal London" /></Field>
              </div>
              <Field label="Cycle stage">
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { value: '1st_cycle', label: 'Round 1', hint: 'Baseline audit' },
                    { value: 're_audit', label: 'Round 2', hint: 'Re-audit after change' },
                    { value: 'completed_loop', label: 'Closed loop', hint: 'Action completed' },
                  ].map(stage => (
                    <button
                      key={stage.value}
                      type="button"
                      onClick={() => {
                        setAuditCycleStage(stage.value)
                        markDirty()
                      }}
                      className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                        auditCycleStage === stage.value
                          ? 'border-accent/50 bg-accent/10'
                          : 'border-white/[0.08] bg-[var(--bg-canvas)] hover:border-white/[0.16]'
                      }`}
                    >
                      <span className="block text-sm font-medium text-[var(--text-primary)]">{stage.label}</span>
                      <span className="mt-1 block text-xs text-[var(--text-muted)]">{stage.hint}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Outcome / findings"><textarea rows={2} value={auditOutcome} maxLength={LONG_TEXT_MAX} onChange={e => { setAuditOutcome(e.target.value); markDirty() }} onKeyDown={e => handleSnippetKeyDown(e, auditOutcome, setAuditOutcome)} className={INPUT} placeholder={ph('audit_outcome', 'Summary of outcome or recommendations')} />{auditOutcome && <p className={WORD_COUNT_CLASS}>{wordCount(auditOutcome)} words</p>}</Field>
              <CheckboxField label="Presented at a meeting or grand round" checked={auditPresented} onChange={v => { setAuditPresented(v); markDirty() }} />
            </div>
          )}

          {/* ── Teaching & Presentations ── */}
          {category === 'teaching' && (
            <div className="space-y-4">
              <div className={GRID2}>
                <Field label="Type">
                  <select value={teachingType} onChange={e => setTeachingType(e.target.value)} className={SELECT}>
                    <option value="">Select…</option>
                    <option value="taught_session">Taught session</option>
                    <option value="grand_round">Grand round</option>
                    <option value="poster">Poster</option>
                    <option value="oral">Oral presentation</option>
                  </select>
                </Field>
                <Field label="Audience">
                  <select value={teachingAudience} onChange={e => setTeachingAudience(e.target.value)} className={SELECT}>
                    <option value="">Select…</option>
                    <option value="students">Students</option>
                    <option value="peers">Peers</option>
                    <option value="consultants">Consultants</option>
                    <option value="public">Public</option>
                  </select>
                </Field>
              </div>
              <div className={GRID2}>
                <Field label="Setting">
                  <select value={teachingSetting} onChange={e => setTeachingSetting(e.target.value)} className={SELECT}>
                    <option value="">Select…</option>
                    {LEVEL_OPTIONS.map(o => <option key={o} value={o} className="capitalize">{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </select>
                </Field>
                <Field label="Event / organisation"><input type="text" value={teachingEvent} onChange={e => setTeachingEvent(e.target.value)} className={INPUT} placeholder="e.g. BMA Regional day" /></Field>
              </div>
              <CheckboxField label="Invited (not submitted)" checked={teachingInvited} onChange={v => { setTeachingInvited(v); markDirty() }} />
            </div>
          )}

          {/* ── Conferences & Courses ── */}
          {category === 'conference' && (
            <div className="space-y-4">
              <Field label="Type">
                <div className="flex gap-2">
                  <button type="button" className={TOGGLE_BTN(confType === 'conference')} onClick={() => { setConfType('conference'); markDirty() }}>Conference</button>
                  <button type="button" className={TOGGLE_BTN(confType === 'course')} onClick={() => { setConfType('course'); markDirty() }}>Course</button>
                </div>
              </Field>
              <div className={GRID2}>
                <Field label="Event name"><input type="text" value={confEventName} onChange={e => setConfEventName(e.target.value)} className={INPUT} placeholder={ph('conf_event_name', 'e.g. ASM 2024')} /></Field>
                <Field label="Attendance type">
                  <select value={confAttendance} onChange={e => setConfAttendance(e.target.value)} className={SELECT}>
                    <option value="">Select…</option>
                    <option value="attendee">Attendee</option>
                    <option value="presenter">Presenter</option>
                    <option value="organiser">Organiser</option>
                  </select>
                </Field>
              </div>
              <div className={GRID2}>
                <Field label="Level">
                  <select value={confLevel} onChange={e => setConfLevel(e.target.value)} className={SELECT}>
                    <option value="">Select…</option>
                    {LEVEL_OPTIONS.map(o => <option key={o} value={o} className="capitalize">{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </select>
                </Field>
                <Field label="CPD hours"><input type="number" min="0" max="999" step="0.5" value={confCpdHours} onChange={e => setConfCpdHours(e.target.value)} className={INPUT} placeholder="e.g. 6" /></Field>
              </div>
              <CheckboxField label="Certificate received" checked={confCertificate} onChange={v => { setConfCertificate(v); markDirty() }} />
            </div>
          )}

          {/* ── Publications & Research ── */}
          {category === 'publication' && (
            <div className="space-y-4">
              <div className={GRID2}>
                <Field label="Type">
                  <select value={pubType} onChange={e => setPubType(e.target.value)} className={SELECT}>
                    <option value="">Select…</option>
                    <option value="original_research">Original research</option>
                    <option value="case_report">Case report</option>
                    <option value="review">Review</option>
                    <option value="letter">Letter</option>
                    <option value="book_chapter">Book chapter</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select value={pubStatus} onChange={e => setPubStatus(e.target.value)} className={SELECT}>
                    <option value="">Select…</option>
                    <option value="in_progress">In progress</option>
                    <option value="submitted">Submitted</option>
                    <option value="published">Published</option>
                  </select>
                </Field>
              </div>
              <Field label="Journal / publisher"><input type="text" value={pubJournal} onChange={e => setPubJournal(e.target.value)} className={INPUT} placeholder={ph('pub_journal', 'e.g. BMJ, Lancet')} /></Field>
              <Field label="Authors (in order)"><input type="text" value={pubAuthors} onChange={e => setPubAuthors(e.target.value)} className={INPUT} placeholder="e.g. Smith J, Jones A, et al." /></Field>
              <Field label="DOI or link"><input type="text" value={pubDoi} onChange={e => setPubDoi(e.target.value)} className={INPUT} placeholder={ph('pub_doi', 'https://doi.org/…')} /></Field>
            </div>
          )}

          {/* ── Leadership & Societies ── */}
          {category === 'leadership' && (
            <div className="space-y-4">
              <div className={GRID2}>
                <Field label="Role / title"><input type="text" value={leaderRole} onChange={e => setLeaderRole(e.target.value)} className={INPUT} placeholder={ph('leader_role', 'e.g. President')} /></Field>
                <Field label="Organisation"><input type="text" value={leaderOrg} onChange={e => setLeaderOrg(e.target.value)} className={INPUT} placeholder={ph('leader_organisation', 'e.g. Medical Society')} /></Field>
              </div>
              <div className={GRID2}>
                <Field label="Start date"><input type="date" value={leaderStart} onChange={e => setLeaderStart(e.target.value)} className={INPUT} /></Field>
                {!leaderOngoing && (
                  <Field label="End date"><input type="date" value={leaderEnd} onChange={e => setLeaderEnd(e.target.value)} className={INPUT} /></Field>
                )}
              </div>
              <CheckboxField label="Ongoing role" checked={leaderOngoing} onChange={v => { setLeaderOngoing(v); markDirty() }} />
            </div>
          )}

          {/* ── Prizes & Awards ── */}
          {category === 'prize' && (
            <div className="space-y-4">
              <div className={GRID2}>
                <Field label="Awarding body"><input type="text" value={prizeBody} onChange={e => setPrizeBody(e.target.value)} className={INPUT} placeholder={ph('prize_body', 'e.g. Royal College of Surgeons')} /></Field>
                <Field label="Level">
                  <select value={prizeLevel} onChange={e => setPrizeLevel(e.target.value)} className={SELECT}>
                    <option value="">Select…</option>
                    {LEVEL_OPTIONS.map(o => <option key={o} value={o} className="capitalize">{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description"><textarea rows={3} value={prizeDescription} maxLength={LONG_TEXT_MAX} onChange={e => { setPrizeDescription(e.target.value); markDirty() }} onKeyDown={e => handleSnippetKeyDown(e, prizeDescription, setPrizeDescription)} className={INPUT} placeholder="Brief description of the prize or award" />{prizeDescription && <p className={WORD_COUNT_CLASS}>{wordCount(prizeDescription)} words</p>}</Field>
            </div>
          )}

          {/* ── Procedures & Clinical Skills ── */}
          {category === 'procedure' && (
            <div className="space-y-4">
              <div className={GRID2}>
                <Field label="Procedure name"><input type="text" value={procName} onChange={e => setProcName(e.target.value)} className={INPUT} placeholder={ph('proc_name', 'e.g. Lumbar puncture')} /></Field>
                <Field label="Setting"><input type="text" value={procSetting} onChange={e => setProcSetting(e.target.value)} className={INPUT} placeholder={ph('proc_setting', 'e.g. A&E, ITU, Ward')} /></Field>
              </div>
              <div className={GRID2}>
                <Field label="Supervision level">
                  <div className="flex gap-2">
                    <button type="button" className={TOGGLE_BTN(procSupervision === 'supervised')} onClick={() => { setProcSupervision('supervised'); markDirty() }}>Supervised</button>
                    <button type="button" className={TOGGLE_BTN(procSupervision === 'unsupervised')} onClick={() => { setProcSupervision('unsupervised'); markDirty() }}>Unsupervised</button>
                  </div>
                </Field>
                <Field label="Number performed"><input type="number" min="1" max="9999" step="1" value={procCount} onChange={e => setProcCount(e.target.value)} className={INPUT} placeholder="e.g. 3" /></Field>
              </div>
            </div>
          )}

          {/* ── Reflections & CBDs/DOPs ── */}
          {category === 'reflection' && (
            <div className="space-y-4">
              <div className={GRID2}>
                <Field label="Type">
                  <select value={reflType} onChange={e => setReflType(e.target.value)} className={SELECT}>
                    <option value="">Select…</option>
                    <option value="cbd">CBD - Case-Based Discussion</option>
                    <option value="dop">DOP - Directly Observed Procedure</option>
                    <option value="mini_cex">Mini-CEX - Mini Clinical Evaluation</option>
                    <option value="reflection">Personal reflection (free-form)</option>
                  </select>
                </Field>
                <Field label="Supervisor name (optional)"><input type="text" value={reflSupervisor} onChange={e => setReflSupervisor(e.target.value)} className={INPUT} placeholder="Dr …" /></Field>
              </div>
              <Field label="Clinical context"><input type="text" value={reflContext} onChange={e => setReflContext(e.target.value)} className={INPUT} placeholder={ph('refl_clinical_context', 'e.g. Acute take, post-take ward round')} /></Field>

              {/* Reflection framework selector */}
              <div>
                <label className={LABEL}>Reflection framework</label>
                <p className="text-[11px] text-[var(--text-muted)] -mt-1 mb-2">
                  Gibbs: 6-step cycle. Rolfe / Driscoll: three short questions (What? / So What? / Now What?). Pick whichever fits how you reflect.
                </p>
                <div className="flex gap-2">
                  {(['none', 'gibbs', 'driscoll', 'rolfe'] as const).map(fw => (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => {
                        if (fw === reflFramework) return
                        if (reflFramework === 'none' && reflFreeText) {
                          setReflFreeText('')
                        }
                        setReflParts({})
                        setReflFramework(fw)
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        reflFramework === fw
                          ? 'bg-[var(--accent-soft)] border-accent/30 text-[var(--accent-soft-text)]'
                          : 'bg-[var(--bg-canvas)] border-white/[0.08] text-[var(--text-secondary)] hover:border-white/[0.15]'
                      }`}
                    >
                      {fw === 'none' ? 'No framework' : fw === 'gibbs' ? "Gibbs' Cycle" : fw === 'driscoll' ? 'Driscoll' : 'Rolfe'}
                    </button>
                  ))}
                </div>
              </div>

              {reflFramework === 'none' && (
                <Field label="Free text reflection">
                  <textarea rows={6} value={reflFreeText} maxLength={LONG_TEXT_MAX} onChange={e => { setReflFreeText(e.target.value); markDirty() }} onKeyDown={e => handleSnippetKeyDown(e, reflFreeText, setReflFreeText)} className={INPUT} placeholder={ph('notes', 'What happened, what you learnt, what you would do differently...')} />
                  {reflFreeText && <p className={WORD_COUNT_CLASS}>{wordCount(reflFreeText)} words</p>}
                  <AnonymisationHint />
                </Field>
              )}

              {reflFramework === 'gibbs' && (
                <div className="space-y-3">
                  {GIBBS_FIELDS.map(f => (
                    <Field key={f.key} label={`${f.label} - ${f.hint}`}>
                      <textarea
                        rows={3}
                        maxLength={LONG_TEXT_MAX}
                        value={reflParts[f.key] ?? ''}
                        onChange={e => { setReflParts(p => ({ ...p, [f.key]: e.target.value })); markDirty() }}
                        className={INPUT}
                        placeholder={f.hint}
                      />
                    </Field>
                  ))}
                </div>
              )}

              {reflFramework === 'rolfe' && (
                <div className="space-y-3">
                  {ROLFE_FIELDS.map(f => (
                    <Field key={f.key} label={`${f.label} - ${f.hint}`}>
                      <textarea
                        rows={4}
                        maxLength={LONG_TEXT_MAX}
                        value={reflParts[f.key] ?? ''}
                        onChange={e => { setReflParts(p => ({ ...p, [f.key]: e.target.value })); markDirty() }}
                        className={INPUT}
                        placeholder={f.hint}
                      />
                    </Field>
                  ))}
                </div>
              )}

              {reflFramework === 'driscoll' && (
                <div className="space-y-3">
                  {DRISCOLL_FIELDS.map(f => (
                    <Field key={f.key} label={`${f.label} - ${f.hint}`}>
                      <textarea
                        rows={4}
                        maxLength={LONG_TEXT_MAX}
                        value={reflParts[f.key] ?? ''}
                        onChange={e => { setReflParts(p => ({ ...p, [f.key]: e.target.value })); markDirty() }}
                        className={INPUT}
                        placeholder={f.hint}
                      />
                    </Field>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Custom ── */}
          {category === 'custom' && (
            <div className="space-y-4">
              <Field label="Description">
                <textarea rows={6} value={customFreeText} maxLength={LONG_TEXT_MAX} onChange={e => { setCustomFreeText(e.target.value); markDirty() }} onKeyDown={e => handleSnippetKeyDown(e, customFreeText, setCustomFreeText)} className={INPUT} placeholder={ph('notes', 'Describe this achievement in your own words...')} />
                {customFreeText && <p className={WORD_COUNT_CLASS}>{wordCount(customFreeText)} words</p>}
                <AnonymisationHint />
              </Field>
            </div>
          )}
        </div>

        {/* Evidence uploads */}
        <div className="space-y-3 border-t border-white/[0.06] pt-6">
          <h3 className="text-xs font-medium text-[var(--text-emphasis)] uppercase tracking-wider">Evidence</h3>
          {/* Already-attached files (edit mode): list with per-file remove (QOL-013) */}
          {mode === 'edit' && existingEvidence.length > 0 && (
            <EvidenceFiles initialFiles={existingEvidence} canDelete />
          )}
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
            className="flex-1 border border-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/[0.15] rounded-xl py-3 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          {mode === 'create' && (
            <button
              type="submit"
              onClick={() => { addAnotherRef.current = true }}
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
            {saving ? 'Saving…' : mode === 'create' ? 'Save entry' : 'Save changes'}
          </button>
        </div>

        {uploading && (
          <div className="rounded-xl overflow-hidden bg-[var(--bg-surface)] border border-white/[0.08] px-4 py-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--accent)] rounded-full motion-safe:animate-[upload-progress_1.4s_ease-in-out_infinite]" />
            </div>
            <span className="text-xs text-[var(--text-muted)] shrink-0">Uploading {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}…</span>
          </div>
        )}
      </form>

      {/* Template picker modal */}
      {templatePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm" onClick={() => setTemplatePickerOpen(false)}>
          <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
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
                  <div className="grid grid-cols-2 gap-2">
                    {personalTemplates.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className="text-left px-3.5 py-3 rounded-xl border border-white/[0.08] hover:border-accent/40 hover:bg-accent/5 transition-colors"
                      >
                        <p className="text-sm font-medium text-[var(--text-primary)]">{t.name}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{CATEGORIES.find(cat => cat.value === t.category)?.label ?? t.category}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Curated templates by category */}
              {CATEGORIES.map(cat => {
                const ts = groupedCurated[cat.value]
                if (!ts || ts.length === 0) return null
                return (
                  <div key={cat.value}>
                    <p className="text-[10px] font-medium text-[var(--text-emphasis)] uppercase tracking-wider mb-2">{cat.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ts.map(t => (
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
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
