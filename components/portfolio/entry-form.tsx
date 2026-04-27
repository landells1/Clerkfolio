'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, type Category, type NewPortfolioEntry } from '@/lib/types/portfolio'
import { INTERVIEW_THEMES } from '@/lib/constants/interview-themes'
import type { Template } from '@/lib/types/templates'
import SpecialtyTagSelect from './specialty-tag-select'
import EvidenceUpload from '@/components/shared/evidence-upload'
import { uploadPendingFiles } from '@/lib/supabase/storage'
import { useToast } from '@/components/ui/toast-provider'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Partial<NewPortfolioEntry> & { id?: string; interview_themes?: string[] }
  userInterests?: string[]
  defaultCategory?: Category
  templates?: Template[]
}

const INPUT = 'w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors'
const SELECT = 'w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors'
const LABEL = 'block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide'
const FIELD = 'flex flex-col gap-1'
const GRID2 = 'grid grid-cols-2 gap-4'
const TOGGLE_BTN = (active: boolean) =>
  `flex-1 py-2 text-sm rounded-lg border transition-colors ${
    active
      ? 'bg-[#1B6FD9]/15 border-[#1B6FD9]/40 text-[#1B6FD9]'
      : 'bg-[#0B0B0C] border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:border-white/[0.15]'
  }`

const WORD_COUNT_CLASS = 'text-[10px] text-[rgba(245,245,242,0.3)] mt-1 text-right'
const DRAFT_KEY = 'clinidex-entry-draft'

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

function buildFrameworkText(framework: string, parts: Record<string, string>): string {
  const fields = framework === 'gibbs' ? GIBBS_FIELDS : ROLFE_FIELDS
  return fields
    .map(f => `**${f.label}:**\n${parts[f.key] ?? ''}`)
    .join('\n\n')
}

function parseFrameworkText(framework: string, text: string): Record<string, string> {
  const fields = framework === 'gibbs' ? GIBBS_FIELDS : ROLFE_FIELDS
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

function detectFramework(text: string): 'gibbs' | 'rolfe' | 'none' {
  if (text.includes('**Description:**') && text.includes('**Action Plan:**')) return 'gibbs'
  if (text.includes('**What?:**') && text.includes('**Now What?:**')) return 'rolfe'
  return 'none'
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={FIELD}>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  )
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <div
        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          checked ? 'bg-[#1B6FD9] border-[#1B6FD9]' : 'bg-[#0B0B0C] border-white/[0.15]'
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span className="text-sm text-[rgba(245,245,242,0.7)]">{label}</span>
    </label>
  )
}

export default function EntryForm({ mode, initialData, userInterests = [], defaultCategory, templates = [] }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftRestored, setDraftRestored] = useState(false)

  const [category, setCategory] = useState<Category>(
    initialData?.category ?? defaultCategory ?? 'audit_qip'
  )
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [specialtyTags, setSpecialtyTags] = useState<string[]>(initialData?.specialty_tags ?? [])
  const [interviewThemes, setInterviewThemes] = useState<string[]>(initialData?.interview_themes ?? [])
  const [themesOpen, setThemesOpen] = useState(false)

  // Template guidance placeholders — overridden when a template is applied
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
  const initialFw = initialData?.refl_free_text ? detectFramework(initialData.refl_free_text) : 'none'
  const [reflFramework, setReflFramework] = useState<'none' | 'gibbs' | 'rolfe'>(initialFw)
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

  // ── Auto-save draft (create mode only) ──────────────────────────────────

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
      if (d.category) setCategory(d.category)
      if (d.title !== undefined) setTitle(d.title)
      if (d.date !== undefined) setDate(d.date)
      if (d.specialtyTags !== undefined) setSpecialtyTags(d.specialtyTags)
      if (d.interviewThemes !== undefined) setInterviewThemes(d.interviewThemes)
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
      if (d.confCertificate !== undefined) setConfCertificate(d.confCertificate)
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
      if (d.reflFramework !== undefined) setReflFramework(d.reflFramework)
      setDraftRestored(true)
    } catch {
      // ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (mode !== 'create') return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        category, title, date, specialtyTags, interviewThemes,
        auditType, auditRole, auditCycleStage, auditTrust, auditPresented,
        teachingType, teachingAudience, teachingSetting, teachingEvent, teachingInvited,
        confType, confEventName, confAttendance, confLevel, confCpdHours, confCertificate,
        pubType, pubJournal, pubAuthors, pubStatus, pubDoi,
        leaderRole, leaderOrg, leaderStart, leaderEnd, leaderOngoing,
        prizeBody, prizeLevel,
        procName, procSetting, procSupervision, procCount,
        reflType, reflFramework,
        _expires: Date.now() + 24 * 60 * 60 * 1000,
      }))
    }, 1000)
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
  }, [
    mode, category, title, date, specialtyTags, interviewThemes,
    auditType, auditRole, auditCycleStage, auditTrust, auditPresented,
    teachingType, teachingAudience, teachingSetting, teachingEvent, teachingInvited,
    confType, confEventName, confAttendance, confLevel, confCpdHours, confCertificate,
    pubType, pubJournal, pubAuthors, pubStatus, pubDoi,
    leaderRole, leaderOrg, leaderStart, leaderEnd, leaderOngoing,
    prizeBody, prizeLevel,
    procName, procSetting, procSupervision, procCount,
    reflType, reflFramework,
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

  function markDirty() { setIsDirty(true) }

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
    }
    switch (category) {
      case 'audit_qip': return { ...base, audit_type: auditType, audit_role: auditRole || null, audit_cycle_stage: auditCycleStage || null, audit_trust: auditTrust || null, audit_outcome: auditOutcome || null, audit_presented: auditPresented }
      case 'teaching': return { ...base, teaching_type: teachingType || null, teaching_audience: teachingAudience || null, teaching_setting: teachingSetting || null, teaching_event: teachingEvent || null, teaching_invited: teachingInvited }
      case 'conference': return { ...base, conf_type: confType, conf_event_name: confEventName || null, conf_attendance: confAttendance || null, conf_level: confLevel || null, conf_cpd_hours: confCpdHours ? parseFloat(confCpdHours) : null, conf_certificate: confCertificate }
      case 'publication': return { ...base, pub_type: pubType || null, pub_journal: pubJournal || null, pub_authors: pubAuthors || null, pub_status: pubStatus || null, pub_doi: pubDoi || null }
      case 'leadership': return { ...base, leader_role: leaderRole || null, leader_organisation: leaderOrg || null, leader_start_date: leaderStart || null, leader_end_date: leaderOngoing ? null : (leaderEnd || null), leader_ongoing: leaderOngoing }
      case 'prize': return { ...base, prize_body: prizeBody || null, prize_level: prizeLevel || null, prize_description: prizeDescription || null }
      case 'procedure': return { ...base, proc_name: procName || null, proc_setting: procSetting || null, proc_supervision: procSupervision || null, proc_count: procCount ? parseInt(procCount) : null }
      case 'reflection': return { ...base, refl_type: reflType || null, refl_clinical_context: reflContext || null, refl_supervisor: reflSupervisor || null, refl_free_text: getReflFreeText() }
      case 'custom': return { ...base, custom_free_text: customFreeText || null }
    }
  }

  function resetForm() {
    sessionStorage.removeItem(DRAFT_KEY)
    setDraftRestored(false)
    setCategory(defaultCategory ?? 'audit_qip')
    setTitle('')
    setDate(new Date().toISOString().split('T')[0])
    setNotes('')
    setSpecialtyTags([])
    setInterviewThemes([])
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const payload = buildPayload()

    if (mode === 'create') {
      const { data, error } = await supabase
        .from('portfolio_entries')
        .insert({ ...payload, user_id: user.id })
        .select('id')
        .single()
      if (error) { setError(error.message); setSaving(false); return }
      if (pendingFiles.length > 0) {
        setSaving(false); setUploading(true)
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, data.id, 'portfolio')
        setUploading(false)
        if (uploadErrors.length > 0) {
          setError(`Entry saved, but some files failed to upload: ${uploadErrors.join('; ')}`)
          return
        }
      }
      sessionStorage.removeItem(DRAFT_KEY)
      setIsDirty(false)
      addToast('Entry saved', 'success')
      router.push(`/portfolio/${data.id}`)
    } else {
      const { error } = await supabase
        .from('portfolio_entries')
        .update(payload)
        .eq('id', initialData!.id!)
      if (error) { setError(error.message); setSaving(false); return }
      if (pendingFiles.length > 0) {
        setSaving(false); setUploading(true)
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, initialData!.id!, 'portfolio')
        setUploading(false)
        if (uploadErrors.length > 0) {
          setError(`Changes saved, but some files failed to upload: ${uploadErrors.join('; ')}`)
          return
        }
      }
      setIsDirty(false)
      addToast('Changes saved', 'success')
      router.push(`/portfolio/${initialData!.id}`)
    }
    router.refresh()
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
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Draft restored banner */}
        {draftRestored && (
          <div className="flex items-center justify-between bg-[#1B6FD9]/10 border border-[#1B6FD9]/20 rounded-lg px-3.5 py-2.5 text-sm text-[#1B6FD9] mb-4">
            <span>Draft restored</span>
            <button type="button" onClick={resetForm} className="text-xs text-[#1B6FD9]/70 hover:text-[#1B6FD9]">
              Discard
            </button>
          </div>
        )}

        {/* Template picker trigger (create mode only) */}
        {mode === 'create' && templates.length > 0 && (
          <button
            type="button"
            onClick={() => setTemplatePickerOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-white/[0.12] text-sm text-[rgba(245,245,242,0.5)] hover:text-[#F5F5F2] hover:border-white/[0.2] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
            Start from a template
          </button>
        )}

        {/* Category selector */}
        {mode === 'create' && (
          <div>
            <label className={LABEL}>Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`py-2.5 px-3 text-sm rounded-xl border text-left transition-colors ${
                    category === c.value
                      ? 'bg-[#1B6FD9]/15 border-[#1B6FD9]/40 text-[#1B6FD9]'
                      : 'bg-[#141416] border-white/[0.08] text-[rgba(245,245,242,0.6)] hover:border-white/[0.15]'
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
          <h3 className="text-xs font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider">General</h3>
          <Field label="Title">
            <input type="text" required maxLength={200} value={title} onChange={e => { setTitle(e.target.value); markDirty() }} className={INPUT} placeholder={ph('title', 'Give this entry a clear title')} />
          </Field>
          <div className={GRID2}>
            <Field label="Date">
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} onFocus={() => markDirty()} className={INPUT} />
            </Field>
          </div>
          <Field label="Application tags">
            <SpecialtyTagSelect value={specialtyTags} onChange={v => { setSpecialtyTags(v); markDirty() }} userInterests={userInterests} trackedOnly />
          </Field>
          <Field label="Notes / comments">
            <textarea rows={3} value={notes ?? ''} onChange={e => { setNotes(e.target.value); markDirty() }} onFocus={() => markDirty()} className={INPUT} placeholder={ph('notes', 'Any additional context or notes…')} />
            {notes && <p className={WORD_COUNT_CLASS}>{wordCount(notes)} words</p>}
          </Field>

          {/* Interview themes multi-select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL} style={{ marginBottom: 0 }}>Interview themes <span className="normal-case font-normal text-[rgba(245,245,242,0.35)]">(optional)</span></label>
              <button
                type="button"
                onClick={() => setThemesOpen(o => !o)}
                className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors flex items-center gap-1"
              >
                {themesOpen ? '−' : '+'}
              </button>
            </div>
            {interviewThemes.length > 0 && !themesOpen && (
              <div className="flex flex-wrap gap-1.5">
                {interviewThemes.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setInterviewThemes(prev => prev.filter(x => x !== t))}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors"
                  >
                    {t} ×
                  </button>
                ))}
                <button type="button" onClick={() => setThemesOpen(true)} className="text-[11px] text-[rgba(245,245,242,0.35)] hover:text-[#F5F5F2] px-1">edit</button>
              </div>
            )}
            {themesOpen && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {INTERVIEW_THEMES.map(t => {
                  const active = interviewThemes.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setInterviewThemes(prev => active ? prev.filter(x => x !== t) : [...prev, t])
                        markDirty()
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                          : 'bg-white/[0.04] border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:border-white/[0.15]'
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Category-specific fields */}
        <div className="space-y-4 border-t border-white/[0.06] pt-6">
          <h3 className="text-xs font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider">
            {CATEGORIES.find(c => c.value === category)?.label} details
          </h3>

          {/* ── Audit & QIP ── */}
          {category === 'audit_qip' && (
            <div className="space-y-4">
              <Field label="Type">
                <div className="flex gap-2">
                  <button type="button" className={TOGGLE_BTN(auditType === 'audit')} onClick={() => setAuditType('audit')}>Audit</button>
                  <button type="button" className={TOGGLE_BTN(auditType === 'qip')} onClick={() => setAuditType('qip')}>QIP</button>
                </div>
              </Field>
              <div className={GRID2}>
                <Field label="Your role"><input type="text" value={auditRole} onChange={e => setAuditRole(e.target.value)} className={INPUT} placeholder="e.g. Lead auditor" /></Field>
                <Field label="Trust / hospital"><input type="text" value={auditTrust} onChange={e => setAuditTrust(e.target.value)} className={INPUT} placeholder="e.g. Royal London" /></Field>
              </div>
              <Field label="Cycle stage">
                <select value={auditCycleStage} onChange={e => setAuditCycleStage(e.target.value)} className={SELECT}>
                  <option value="">Select…</option>
                  <option value="1st_cycle">1st cycle</option>
                  <option value="re_audit">Re-audit</option>
                  <option value="completed_loop">Completed loop</option>
                </select>
              </Field>
              <Field label="Outcome / findings"><textarea rows={2} value={auditOutcome} onChange={e => setAuditOutcome(e.target.value)} className={INPUT} placeholder={ph('audit_outcome', 'Summary of outcome or recommendations')} /></Field>
              <CheckboxField label="Presented at a meeting or grand round" checked={auditPresented} onChange={setAuditPresented} />
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
              <CheckboxField label="Invited (not submitted)" checked={teachingInvited} onChange={setTeachingInvited} />
            </div>
          )}

          {/* ── Conferences & Courses ── */}
          {category === 'conference' && (
            <div className="space-y-4">
              <Field label="Type">
                <div className="flex gap-2">
                  <button type="button" className={TOGGLE_BTN(confType === 'conference')} onClick={() => setConfType('conference')}>Conference</button>
                  <button type="button" className={TOGGLE_BTN(confType === 'course')} onClick={() => setConfType('course')}>Course</button>
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
                <Field label="CPD hours"><input type="number" min="0" step="0.5" value={confCpdHours} onChange={e => setConfCpdHours(e.target.value)} className={INPUT} placeholder="e.g. 6" /></Field>
              </div>
              <CheckboxField label="Certificate received" checked={confCertificate} onChange={setConfCertificate} />
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
              <CheckboxField label="Ongoing role" checked={leaderOngoing} onChange={setLeaderOngoing} />
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
              <Field label="Description"><textarea rows={3} value={prizeDescription} onChange={e => setPrizeDescription(e.target.value)} className={INPUT} placeholder="Brief description of the prize or award" /></Field>
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
                    <button type="button" className={TOGGLE_BTN(procSupervision === 'supervised')} onClick={() => setProcSupervision('supervised')}>Supervised</button>
                    <button type="button" className={TOGGLE_BTN(procSupervision === 'unsupervised')} onClick={() => setProcSupervision('unsupervised')}>Unsupervised</button>
                  </div>
                </Field>
                <Field label="Number performed"><input type="number" min="1" value={procCount} onChange={e => setProcCount(e.target.value)} className={INPUT} placeholder="e.g. 3" /></Field>
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
                    <option value="cbd">CBD</option>
                    <option value="dop">DOP</option>
                    <option value="mini_cex">Mini-CEX</option>
                    <option value="reflection">Personal reflection</option>
                  </select>
                </Field>
                <Field label="Supervisor name (optional)"><input type="text" value={reflSupervisor} onChange={e => setReflSupervisor(e.target.value)} className={INPUT} placeholder="Dr …" /></Field>
              </div>
              <Field label="Clinical context"><input type="text" value={reflContext} onChange={e => setReflContext(e.target.value)} className={INPUT} placeholder={ph('refl_clinical_context', 'e.g. Acute take, post-take ward round')} /></Field>

              {/* Reflection framework selector */}
              <div>
                <label className={LABEL}>Reflection framework</label>
                <div className="flex gap-2">
                  {(['none', 'gibbs', 'rolfe'] as const).map(fw => (
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
                          ? 'bg-[#1B6FD9]/15 border-[#1B6FD9]/40 text-[#1B6FD9]'
                          : 'bg-[#0B0B0C] border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:border-white/[0.15]'
                      }`}
                    >
                      {fw === 'none' ? 'No framework' : fw === 'gibbs' ? "Gibbs' Cycle" : 'Rolfe (What/So What/Now What)'}
                    </button>
                  ))}
                </div>
              </div>

              {reflFramework === 'none' && (
                <Field label="Free text reflection">
                  <textarea rows={6} value={reflFreeText} onChange={e => setReflFreeText(e.target.value)} className={INPUT} placeholder={ph('notes', 'What happened, what you learnt, what you\'d do differently…')} />
                  {reflFreeText && <p className={WORD_COUNT_CLASS}>{wordCount(reflFreeText)} words</p>}
                </Field>
              )}

              {reflFramework === 'gibbs' && (
                <div className="space-y-3">
                  {GIBBS_FIELDS.map(f => (
                    <Field key={f.key} label={`${f.label} — ${f.hint}`}>
                      <textarea
                        rows={3}
                        value={reflParts[f.key] ?? ''}
                        onChange={e => setReflParts(p => ({ ...p, [f.key]: e.target.value }))}
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
                    <Field key={f.key} label={`${f.label} — ${f.hint}`}>
                      <textarea
                        rows={4}
                        value={reflParts[f.key] ?? ''}
                        onChange={e => setReflParts(p => ({ ...p, [f.key]: e.target.value }))}
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
                <textarea rows={6} value={customFreeText} onChange={e => setCustomFreeText(e.target.value)} className={INPUT} placeholder={ph('notes', 'Describe this achievement in your own words…')} />
              </Field>
            </div>
          )}
        </div>

        {/* Evidence uploads */}
        <div className="space-y-3 border-t border-white/[0.06] pt-6">
          <h3 className="text-xs font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider">Evidence</h3>
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
            className="flex-[2] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Save entry' : 'Save changes'}
          </button>
        </div>

        {uploading && (
          <div className="rounded-xl overflow-hidden bg-[#141416] border border-white/[0.08] px-4 py-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div className="h-full bg-[#1B6FD9] rounded-full animate-[upload-progress_1.4s_ease-in-out_infinite]" />
            </div>
            <span className="text-xs text-[rgba(245,245,242,0.45)] shrink-0">Uploading {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}…</span>
          </div>
        )}
      </form>

      {/* Template picker modal */}
      {templatePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm" onClick={() => setTemplatePickerOpen(false)}>
          <div className="bg-[#141416] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-base font-semibold text-[#F5F5F2]">Choose a template</h2>
              <button onClick={() => setTemplatePickerOpen(false)} className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-5">
              {/* Personal templates */}
              {personalTemplates.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-2">Your templates</p>
                  <div className="grid grid-cols-2 gap-2">
                    {personalTemplates.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className="text-left px-3.5 py-3 rounded-xl border border-white/[0.08] hover:border-[#1B6FD9]/40 hover:bg-[#1B6FD9]/5 transition-colors"
                      >
                        <p className="text-sm font-medium text-[#F5F5F2]">{t.name}</p>
                        <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5 capitalize">{t.category.replace('_', ' ')}</p>
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
                    <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-2">{cat.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ts.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => applyTemplate(t)}
                          className="text-left px-3.5 py-3 rounded-xl border border-white/[0.08] hover:border-[#1B6FD9]/40 hover:bg-[#1B6FD9]/5 transition-colors"
                        >
                          <p className="text-sm font-medium text-[#F5F5F2]">{t.name}</p>
                          {t.description && <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5">{t.description}</p>}
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
