'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, type Category, type NewPortfolioEntry } from '@/lib/types/portfolio'
import SpecialtyTagSelect from './specialty-tag-select'
import EvidenceUpload from '@/components/shared/evidence-upload'
import { uploadPendingFiles } from '@/lib/supabase/storage'

type Props = {
  mode: 'create' | 'edit'
  initialData?: Partial<NewPortfolioEntry> & { id?: string }
  userInterests?: string[]
  defaultCategory?: Category
}

const INPUT = 'w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1D9E75] transition-colors'
const SELECT = 'w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1D9E75] transition-colors'
const LABEL = 'block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide'
const FIELD = 'flex flex-col gap-1'
const GRID2 = 'grid grid-cols-2 gap-4'
const TOGGLE_BTN = (active: boolean) =>
  `flex-1 py-2 text-sm rounded-lg border transition-colors ${
    active
      ? 'bg-[#1D9E75]/15 border-[#1D9E75]/40 text-[#1D9E75]'
      : 'bg-[#0B0B0C] border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:border-white/[0.15]'
  }`

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
          checked ? 'bg-[#1D9E75] border-[#1D9E75]' : 'bg-[#0B0B0C] border-white/[0.15]'
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

export default function EntryForm({ mode, initialData, userInterests = [], defaultCategory }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [category, setCategory] = useState<Category>(
    initialData?.category ?? defaultCategory ?? 'audit_qip'
  )
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [specialtyTags, setSpecialtyTags] = useState<string[]>(initialData?.specialty_tags ?? [])

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

  // Custom
  const [customFreeText, setCustomFreeText] = useState(initialData?.custom_free_text ?? '')

  // Evidence files
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  function buildPayload(): Omit<NewPortfolioEntry, 'user_id'> {
    const base = { category, title, date, specialty_tags: specialtyTags, notes: notes || null }
    switch (category) {
      case 'audit_qip': return { ...base, audit_type: auditType, audit_role: auditRole || null, audit_cycle_stage: auditCycleStage || null, audit_trust: auditTrust || null, audit_outcome: auditOutcome || null, audit_presented: auditPresented }
      case 'teaching': return { ...base, teaching_type: teachingType || null, teaching_audience: teachingAudience || null, teaching_setting: teachingSetting || null, teaching_event: teachingEvent || null, teaching_invited: teachingInvited }
      case 'conference': return { ...base, conf_type: confType, conf_event_name: confEventName || null, conf_attendance: confAttendance || null, conf_level: confLevel || null, conf_cpd_hours: confCpdHours ? parseFloat(confCpdHours) : null, conf_certificate: confCertificate }
      case 'publication': return { ...base, pub_type: pubType || null, pub_journal: pubJournal || null, pub_authors: pubAuthors || null, pub_status: pubStatus || null, pub_doi: pubDoi || null }
      case 'leadership': return { ...base, leader_role: leaderRole || null, leader_organisation: leaderOrg || null, leader_start_date: leaderStart || null, leader_end_date: leaderOngoing ? null : (leaderEnd || null), leader_ongoing: leaderOngoing }
      case 'prize': return { ...base, prize_body: prizeBody || null, prize_level: prizeLevel || null, prize_description: prizeDescription || null }
      case 'procedure': return { ...base, proc_name: procName || null, proc_setting: procSetting || null, proc_supervision: procSupervision || null, proc_count: procCount ? parseInt(procCount) : null }
      case 'reflection': return { ...base, refl_type: reflType || null, refl_clinical_context: reflContext || null, refl_supervisor: reflSupervisor || null, refl_free_text: reflFreeText || null }
      case 'custom': return { ...base, custom_free_text: customFreeText || null }
    }
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
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, data.id, 'portfolio')
        if (uploadErrors.length > 0) setError(`Saved, but some files failed: ${uploadErrors.join('; ')}`)
      }
      router.push(`/portfolio/${data.id}`)
    } else {
      const { error } = await supabase
        .from('portfolio_entries')
        .update(payload)
        .eq('id', initialData!.id!)
      if (error) { setError(error.message); setSaving(false); return }
      if (pendingFiles.length > 0) {
        const uploadErrors = await uploadPendingFiles(pendingFiles, user.id, initialData!.id!, 'portfolio')
        if (uploadErrors.length > 0) setError(`Saved, but some files failed: ${uploadErrors.join('; ')}`)
      }
      router.push(`/portfolio/${initialData!.id}`)
    }
    router.refresh()
  }

  const LEVEL_OPTIONS = ['local', 'regional', 'national', 'international']

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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
                    ? 'bg-[#1D9E75]/15 border-[#1D9E75]/40 text-[#1D9E75]'
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
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className={INPUT} placeholder="Give this entry a clear title" />
        </Field>
        <div className={GRID2}>
          <Field label="Date">
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
          </Field>
        </div>
        <Field label="Specialty tags">
          <SpecialtyTagSelect value={specialtyTags} onChange={setSpecialtyTags} userInterests={userInterests} />
        </Field>
        <Field label="Notes / comments">
          <textarea rows={3} value={notes ?? ''} onChange={e => setNotes(e.target.value)} className={INPUT} placeholder="Any additional context or notes…" />
        </Field>
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
            <Field label="Outcome / findings"><textarea rows={2} value={auditOutcome} onChange={e => setAuditOutcome(e.target.value)} className={INPUT} placeholder="Summary of outcome or recommendations" /></Field>
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
              <Field label="Event name"><input type="text" value={confEventName} onChange={e => setConfEventName(e.target.value)} className={INPUT} placeholder="e.g. ASM 2024" /></Field>
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
            <Field label="Journal / publisher"><input type="text" value={pubJournal} onChange={e => setPubJournal(e.target.value)} className={INPUT} placeholder="e.g. BMJ, Lancet" /></Field>
            <Field label="Authors (in order)"><input type="text" value={pubAuthors} onChange={e => setPubAuthors(e.target.value)} className={INPUT} placeholder="e.g. Smith J, Jones A, et al." /></Field>
            <Field label="DOI or link"><input type="text" value={pubDoi} onChange={e => setPubDoi(e.target.value)} className={INPUT} placeholder="https://doi.org/…" /></Field>
          </div>
        )}

        {/* ── Leadership & Societies ── */}
        {category === 'leadership' && (
          <div className="space-y-4">
            <div className={GRID2}>
              <Field label="Role / title"><input type="text" value={leaderRole} onChange={e => setLeaderRole(e.target.value)} className={INPUT} placeholder="e.g. President" /></Field>
              <Field label="Organisation"><input type="text" value={leaderOrg} onChange={e => setLeaderOrg(e.target.value)} className={INPUT} placeholder="e.g. Medical Society" /></Field>
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
              <Field label="Awarding body"><input type="text" value={prizeBody} onChange={e => setPrizeBody(e.target.value)} className={INPUT} placeholder="e.g. Royal College of Surgeons" /></Field>
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
              <Field label="Procedure name"><input type="text" value={procName} onChange={e => setProcName(e.target.value)} className={INPUT} placeholder="e.g. Lumbar puncture" /></Field>
              <Field label="Setting"><input type="text" value={procSetting} onChange={e => setProcSetting(e.target.value)} className={INPUT} placeholder="e.g. A&E, ITU, Ward" /></Field>
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
            <Field label="Clinical context"><input type="text" value={reflContext} onChange={e => setReflContext(e.target.value)} className={INPUT} placeholder="e.g. Acute take, post-take ward round" /></Field>
            <Field label="Free text reflection">
              <textarea rows={6} value={reflFreeText} onChange={e => setReflFreeText(e.target.value)} className={INPUT} placeholder="What happened, what you learnt, what you'd do differently…" />
            </Field>
          </div>
        )}

        {/* ── Custom ── */}
        {category === 'custom' && (
          <div className="space-y-4">
            <Field label="Description">
              <textarea rows={6} value={customFreeText} onChange={e => setCustomFreeText(e.target.value)} className={INPUT} placeholder="Describe this achievement in your own words…" />
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
          {saving ? 'Saving…' : mode === 'create' ? 'Save entry' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
