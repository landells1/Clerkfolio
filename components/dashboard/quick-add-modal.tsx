'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SpecialtyTagSelect from '@/components/portfolio/specialty-tag-select'
import ClinicalAreaSelect from '@/components/cases/clinical-area-select'

const INPUT = 'w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors'
const LABEL = 'block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide'

type EntryType = 'case' | 'teaching' | 'reflection' | 'procedure'

const TYPES: { id: EntryType; label: string }[] = [
  { id: 'case', label: 'Case' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'reflection', label: 'Reflection' },
  { id: 'procedure', label: 'Procedure' },
]

const SUBTITLES: Record<EntryType, string> = {
  case: 'Anonymised entries only',
  teaching: 'Log a teaching or presentation',
  reflection: 'Log a CBD, DOP, or reflection',
  procedure: 'Log a clinical procedure or skill',
}

const TEACHING_TYPES = ['Taught session', 'Grand round', 'Poster', 'Oral presentation']
const TEACHING_AUDIENCES = ['Students', 'Peers', 'Consultants', 'Public']
const REFLECTION_TYPES = ['CBD', 'DOP', 'Mini-CEX', 'Personal reflection']
const SUPERVISION_LEVELS: { id: string; label: string }[] = [
  { id: 'Supervised', label: 'Supervised' },
  { id: 'Unsupervised', label: 'Unsupervised' },
]

const CASE_TEMPLATES = [
  { label: 'Chest pain', domain: 'Cardiology', tags: ['Cardiology', 'Acute Medicine'] },
  { label: 'SOB', domain: 'Respiratory Medicine', tags: ['Respiratory Medicine', 'Acute Medicine'] },
  { label: 'Acute abdomen', domain: 'General Surgery', tags: ['General Surgery', 'Acute Medicine'] },
  { label: 'Sepsis', domain: 'Acute Medicine', tags: ['Acute Medicine', 'Infectious Diseases'] },
  { label: 'Stroke / TIA', domain: 'Neurology', tags: ['Neurology', 'Acute Medicine'] },
  { label: 'DKA', domain: 'Endocrinology & Diabetes', tags: ['Endocrinology & Diabetes', 'Acute Medicine'] },
  { label: 'AKI', domain: 'Nephrology', tags: ['Nephrology', 'Acute Medicine'] },
  { label: 'Cardiac arrest', domain: 'Acute Medicine', tags: ['Acute Medicine', 'Cardiology'] },
]

const KEYWORD_TAG_MAP: [string[], string][] = [
  [['cardio', 'cardiac', 'heart', 'mi ', 'stemi', 'nstemi', 'af ', 'atrial', 'chest pain', 'angina'], 'Cardiology'],
  [['resp', 'lung', 'pneum', 'asthma', 'copd', 'pleural', 'breathless', 'sob', 'shortness', 'haemoptysis'], 'Respiratory Medicine'],
  [['neuro', 'stroke', 'tia', 'seizure', 'epilep', 'headache', ' ms ', 'parkinson', 'neuropath'], 'Neurology'],
  [['gastro', 'bowel', 'abdomen', 'abdo', 'liver', 'hepat', 'colonoscopy', 'endoscopy', 'ibd', 'crohn', 'colitis'], 'Gastroenterology'],
  [['surg', 'appendix', 'hernia', 'laparoscop', 'laparotomy', 'cholecyst', 'bowel obstruct'], 'General Surgery'],
  [['paeds', 'paediatric', 'pediatric', 'child', 'neonatal', 'infant'], 'Paediatrics'],
  [['psych', 'mental health', 'depression', 'anxiety', 'schizophrenia', 'bipolar', 'psychos'], 'Psychiatry'],
  [['ortho', 'fracture', 'bone', 'joint', 'knee', 'hip', 'shoulder', 'spine'], 'Orthopaedics'],
  [['derm', 'skin', 'rash', 'eczema', 'psoriasis', 'cellulitis', 'wound'], 'Dermatology'],
  [['renal', 'kidney', 'aki', 'ckd', 'dialysis', 'nephr'], 'Nephrology'],
  [['diabet', 'dka', 'thyroid', 'adrenal', 'endocrin', 'insulin', 'hba1c'], 'Endocrinology & Diabetes'],
  [['haem', 'anaemia', 'anemia', 'lymphoma', 'leukaemia', 'transfusion', 'coagulat'], 'Clinical Haematology'],
  [['rheuma', 'arthritis', 'lupus', 'vasculitis', 'gout', 'fibromyalg'], 'Rheumatology'],
  [['itu', 'icu', 'critical care', 'ventilat', 'intubat', 'septic shock'], 'Critical Care / ITU'],
  [['a&e', 'trauma', 'resus', 'triage'], 'Emergency Medicine'],
  [['obstet', 'gynae', 'obstetric', 'gynaecol', 'pregnancy', 'maternal', 'antenatal'], 'Obstetrics & Gynaecology'],
  [['oncol', 'cancer', 'chemotherapy', 'radiotherapy', 'tumour', 'metastas'], 'Oncology'],
  [['palliative', 'end of life', 'eol', 'hospice', 'syringe driver'], 'Palliative Care'],
  [['urol', 'bladder', 'prostate', 'renal calcul'], 'Urology'],
  [['ophthal', 'retina', 'glaucoma', 'cataract', 'visual'], 'Ophthalmology'],
  [['radiol', 'mri', 'ct scan', 'ultrasound', 'x-ray', 'imaging', 'angio'], 'Radiology'],
  [['geriat', 'elderly', 'frailty', 'dementia', 'falls', 'delirium'], 'Geriatric Medicine'],
  [['infect', 'antibiotic', 'hiv', 'tuberculosis', 'septicaemia', 'bacteraemia'], 'Infectious Diseases'],
  [['anaesth', 'intubat', 'airway', 'sedation', 'regional block'], 'Anaesthetics'],
  [['vasc', 'aorta', 'aaa', 'pvd', 'dvt', 'pe ', 'pulmonary embol'], 'Vascular Surgery'],
]

export default function QuickAddModal({
  onClose,
  userInterests = [],
  initialValues,
}: {
  onClose: () => void
  userInterests?: string[]
  initialValues?: { type?: EntryType; domain?: string; tags?: string[] }
}) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState<EntryType>(initialValues?.type ?? 'case')

  // Shared fields
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? [])

  // Case-specific
  const [domains, setDomains] = useState<string[]>(initialValues?.domain ? [initialValues.domain] : [])

  // Teaching-specific
  const [teachingType, setTeachingType] = useState(TEACHING_TYPES[0])
  const [teachingAudience, setTeachingAudience] = useState(TEACHING_AUDIENCES[0])

  // Reflection-specific
  const [reflType, setReflType] = useState(REFLECTION_TYPES[0])
  const [reflFreeText, setReflFreeText] = useState('')

  // Procedure-specific
  const [procName, setProcName] = useState('')
  const [procSupervision, setProcSupervision] = useState('Supervised')
  const [procCount, setProcCount] = useState<number>(1)

  // Shared notes/comments
  const [notes, setNotes] = useState('')

  // Auto-tag suggestions
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])

  // Duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState<{ title: string; date: string } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (title.trim().length < 3) { setSuggestedTags([]); return }
      const lower = title.toLowerCase()
      const found: string[] = []
      for (const [keywords, tag] of KEYWORD_TAG_MAP) {
        if (tags.includes(tag)) continue
        if (keywords.some(k => lower.includes(k))) {
          found.push(tag)
          if (found.length >= 3) break
        }
      }
      setSuggestedTags(found)
    }, 400)
    return () => clearTimeout(timer)
  }, [title, tags])

  async function checkDuplicate(val: string) {
    if (val.trim().length < 4) return
    const { data } = await supabase
      .from('cases')
      .select('title, date')
      .ilike('title', `%${val.trim()}%`)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data.length > 0) setDuplicateWarning({ title: data[0].title, date: data[0].date })
  }

  function handleTypeChange(t: EntryType) {
    setType(t)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    if (type === 'procedure' && !procName.trim()) { setError('Procedure name is required.'); return }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (type === 'case') {
      const { error: err } = await supabase.from('cases').insert({
        user_id: user.id,
        title: title.trim(),
        date,
        clinical_domain: domains[0] ?? null,
        clinical_domains: domains,
        specialty_tags: tags,
        notes: notes.trim() || null,
      })
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const base = {
        user_id: user.id,
        category: type,
        title: title.trim(),
        date,
        specialty_tags: tags,
        notes: notes.trim() || null,
      }

      let extra: Record<string, unknown> = {}
      if (type === 'teaching') {
        extra = { teaching_type: teachingType, teaching_audience: teachingAudience }
      } else if (type === 'reflection') {
        extra = { refl_type: reflType, refl_free_text: reflFreeText.trim() || null }
      } else if (type === 'procedure') {
        extra = {
          proc_name: procName.trim() || null,
          proc_supervision: procSupervision,
          proc_count: procCount,
        }
      }

      const { error: err } = await supabase.from('portfolio_entries').insert({ ...base, ...extra })
      if (err) { setError(err.message); setSaving(false); return }
    }

    router.refresh()
    onClose()
  }

  const SAVE_LABEL: Record<EntryType, string> = {
    case: 'Save case →',
    teaching: 'Save teaching →',
    reflection: 'Save reflection →',
    procedure: 'Save procedure →',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F2]">Quick log</h2>
            <p className="text-xs text-[rgba(245,245,242,0.4)] mt-0.5">{SUBTITLES[type]}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Type selector */}
        <div className="flex gap-1.5 mb-5">
          {TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTypeChange(t.id)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                type === t.id
                  ? 'bg-[#1B6FD9]/15 border-[#1B6FD9]/40 text-[#1B6FD9]'
                  : 'bg-[#0B0B0C] border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Case templates */}
          {type === 'case' && (
            <div>
              <p className="text-[10px] font-medium text-[rgba(245,245,242,0.35)] uppercase tracking-wider mb-2">Templates</p>
              <div className="overflow-x-auto flex gap-1.5 pb-1 mb-3">
                {CASE_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => { setTitle(tpl.label); setDomains([tpl.domain]); setTags(tpl.tags) }}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-[rgba(245,245,242,0.6)] hover:border-[#1B6FD9]/40 hover:text-[#1B6FD9] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title — shared */}
          <div>
            <label className={LABEL}>
              {type === 'case' ? 'Case title' : type === 'procedure' ? 'Entry title' : `${TYPES.find(t => t.id === type)?.label} title`}{' '}
              <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              required
              value={title}
              maxLength={200}
              onChange={e => { setTitle(e.target.value); setDuplicateWarning(null) }}
              onBlur={() => type === 'case' && checkDuplicate(title)}
              className={INPUT}
              placeholder={
                type === 'case'
                  ? 'Brief description — no patient identifiers'
                  : type === 'teaching'
                  ? 'e.g. Cardiology teaching session'
                  : type === 'reflection'
                  ? 'e.g. Difficult conversation with patient'
                  : 'e.g. Central line insertion'
              }
            />
            {type === 'case' && (
              <p className="mt-1.5 text-xs text-[rgba(245,245,242,0.35)]">Anonymised entries only — no patient identifiers</p>
            )}

            {/* Auto-tag suggestions */}
            {suggestedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-[rgba(245,245,242,0.35)] self-center">Suggested:</span>
                {suggestedTags.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTags(prev => [...prev, t]); setSuggestedTags(prev => prev.filter(s => s !== t)) }}
                    className="px-2 py-0.5 rounded text-[10px] bg-[#1B6FD9]/10 border border-[#1B6FD9]/25 text-[#1B6FD9] hover:bg-[#1B6FD9]/20 transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}

            {/* Duplicate warning */}
            {duplicateWarning && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-400 mt-1.5">
                <svg className="shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span className="flex-1">Similar case already logged: &ldquo;{duplicateWarning.title}&rdquo;</span>
                <button type="button" onClick={() => setDuplicateWarning(null)} className="text-amber-400/60 hover:text-amber-400 ml-1">✕</button>
              </div>
            )}
          </div>

          {/* Date — shared */}
          <div className={type === 'case' ? 'grid grid-cols-2 gap-3' : ''}>
            <div>
              <label className={LABEL}>Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={INPUT}
              />
            </div>

            {/* Case: clinical area in same row */}
            {type === 'case' && (
              <div>
                <label className={LABEL}>Clinical area</label>
                <ClinicalAreaSelect value={domains} onChange={setDomains} />
              </div>
            )}
          </div>

          {/* Teaching-specific fields */}
          {type === 'teaching' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Teaching type</label>
                <select
                  value={teachingType}
                  onChange={e => setTeachingType(e.target.value)}
                  className={INPUT}
                >
                  {TEACHING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Audience</label>
                <select
                  value={teachingAudience}
                  onChange={e => setTeachingAudience(e.target.value)}
                  className={INPUT}
                >
                  {TEACHING_AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Reflection-specific fields */}
          {type === 'reflection' && (
            <>
              <div>
                <label className={LABEL}>Reflection type</label>
                <select
                  value={reflType}
                  onChange={e => setReflType(e.target.value)}
                  className={INPUT}
                >
                  {REFLECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Notes</label>
                <textarea
                  rows={3}
                  value={reflFreeText}
                  onChange={e => setReflFreeText(e.target.value)}
                  placeholder="What happened, what you learnt…"
                  className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors resize-none"
                />
              </div>
            </>
          )}

          {/* Procedure-specific fields */}
          {type === 'procedure' && (
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Procedure name</label>
                <input
                  type="text"
                  value={procName}
                  maxLength={200}
                  onChange={e => setProcName(e.target.value)}
                  className={INPUT}
                  placeholder="e.g. Arterial blood gas"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Supervision</label>
                  <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
                    {SUPERVISION_LEVELS.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setProcSupervision(s.id)}
                        className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                          i > 0 ? 'border-l border-white/[0.08]' : ''
                        } ${
                          procSupervision === s.id
                            ? 'bg-[#1B6FD9]/15 text-[#1B6FD9]'
                            : 'bg-[#0B0B0C] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Count</label>
                  <input
                    type="number"
                    min={1}
                    value={procCount}
                    onChange={e => setProcCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className={INPUT}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Application tags — shared */}
          <div>
            <label className={LABEL}>Application tags</label>
            <SpecialtyTagSelect value={tags} onChange={setTags} userInterests={userInterests} trackedOnly />
          </div>

          {/* Comments / notes — shared */}
          <div>
            <label className={LABEL}>Comments <span className="normal-case font-normal text-[rgba(245,245,242,0.3)]">(optional)</span></label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes, learning points, or comments…"
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-xl py-2.5 text-sm transition-colors"
            >
              {saving ? 'Saving…' : SAVE_LABEL[type]}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
