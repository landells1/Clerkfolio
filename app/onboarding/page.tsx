'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SPECIALTY_CONFIGS, getTrainingLevel } from '@/lib/specialties'

type Step = 'profile' | 'specialties' | 'arcp' | 'first-entry'

function getSteps(careerStage: string): Step[] {
  // Until a career stage is picked we cannot know whether the ARCP step
  // applies. Default to the longest path (4 steps) so the step counter in
  // the header does not grow from 1/3 to 2/4 once the user selects FY1/FY2.
  if (!careerStage) return ['profile', 'specialties', 'arcp', 'first-entry']
  return careerStage === 'FY1' || careerStage === 'FY2'
    ? ['profile', 'specialties', 'arcp', 'first-entry']
    : ['profile', 'specialties', 'first-entry']
}

const CAREER_STAGES = [
  { value: 'Y1', label: 'Year 1 (Medical Student)' },
  { value: 'Y2', label: 'Year 2 (Medical Student)' },
  { value: 'Y3', label: 'Year 3 (Medical Student)' },
  { value: 'Y4', label: 'Year 4 (Medical Student)' },
  { value: 'Y5_PLUS', label: 'Year 5+ (Medical Student)' },
  { value: 'FY1', label: 'Foundation Year 1 (FY1)' },
  { value: 'FY2', label: 'Foundation Year 2 (FY2)' },
  { value: 'POST_FY', label: 'Core/Specialty Training (CT/ST)' },
]

const MAX_TRACKED_SPECIALTIES = 1

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('profile')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [careerStage, setCareerStage] = useState('')
  const [studentGraduationDate, setStudentGraduationDate] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [firstEntryTarget, setFirstEntryTarget] = useState<'dashboard' | 'portfolio' | 'case'>('portfolio')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = getSteps(careerStage)
  const stepIndex = Math.max(steps.indexOf(step), 0)
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)
  const isMedicalStudent = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y5_PLUS'].includes(careerStage)
  const entryLevelSpecialties = useMemo(
    () => SPECIALTY_CONFIGS.filter(config => getTrainingLevel(config) === 'entry').slice(0, 18),
    []
  )

  function toggleSpecialty(key: string) {
    setSelectedSpecialties(prev => {
      if (prev.includes(key)) return prev.filter(item => item !== key)
      if (prev.length >= MAX_TRACKED_SPECIALTIES) return [key]
      return [...prev, key]
    })
  }

  function next() {
    setStep(steps[Math.min(stepIndex + 1, steps.length - 1)])
  }

  function back() {
    setStep(steps[Math.max(stepIndex - 1, 0)])
  }

  async function complete(target = firstEntryTarget) {
    if (saving) return
    setSaving(true)
    setError(null)
    let res: Response
    try {
      res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          careerStage,
          studentGraduationDate,
          specialties: selectedSpecialties,
        }),
      })
    } catch {
      setSaving(false)
      setError('Could not finish onboarding. Check your connection and try again.')
      return
    }

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setSaving(false)
      setError(json.error ?? 'Could not finish onboarding.')
      return
    }

    setSaving(false)
    if (target === 'portfolio') router.push('/portfolio/new')
    else if (target === 'case') router.push('/cases/new')
    else router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface-0 text-fg">
      <header className="border-b border-subtle px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-500 text-sm font-bold text-surface-0">C</div>
            <span className="text-sm font-semibold tracking-tight">Clerkfolio</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1 w-28 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-fg-2">{stepIndex + 1} / {steps.length}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col px-5 py-10">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-2">Account setup</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {step === 'profile' && 'Set up your portfolio profile'}
            {step === 'specialties' && 'Choose your first tracked specialty'}
            {step === 'arcp' && 'Foundation training setup'}
            {step === 'first-entry' && 'Start with one useful entry'}
          </h1>
        </div>

        {step === 'profile' && (
          <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="rounded-lg border border-subtle bg-surface-1 p-5">
              <p className="text-sm leading-relaxed text-fg-2">
                These details appear in your portfolio exports and help tailor ARCP and application tracking.
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-2">First name</span>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus className="w-full rounded-lg border border-subtle bg-surface-1 px-4 py-3 text-sm outline-none focus:border-strong" />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-2">Last name</span>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full rounded-lg border border-subtle bg-surface-1 px-4 py-3 text-sm outline-none focus:border-strong" />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {CAREER_STAGES.map(stage => (
                  <button key={stage.value} onClick={() => setCareerStage(stage.value)} className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${careerStage === stage.value ? 'border-pill-blue bg-pill-blue text-fg' : 'border-subtle bg-surface-1 text-fg-1 hover:border-default'}`}>
                    {stage.label}
                  </button>
                ))}
              </div>
              {isMedicalStudent && (
                <label className="block max-w-xs">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-2">Expected graduation date</span>
                  <input
                    type="date"
                    value={studentGraduationDate}
                    onChange={e => setStudentGraduationDate(e.target.value)}
                    className="w-full rounded-lg border border-subtle bg-surface-1 px-4 py-3 text-sm outline-none focus:border-strong"
                  />
                  <span className="mt-1.5 block text-xs normal-case tracking-normal text-fg-3">Used to personalise your stage and timeline. You can change this later.</span>
                </label>
              )}
            </div>
          </section>
        )}

        {step === 'specialties' && (
          <section>
            {isMedicalStudent ? (
              <>
                <h2 className="mb-2 text-xl font-semibold tracking-tight">Which specialties interest you?</h2>
                <p className="mb-4 max-w-2xl text-sm text-fg-2">
                  Start building evidence early. You can update this any time in Specialties.
                </p>
              </>
            ) : (
              <>
                <h2 className="mb-2 text-xl font-semibold tracking-tight">Add your tracked specialty programmes</h2>
                <p className="mb-4 max-w-2xl text-sm text-fg-2">
                  We&apos;ll auto-populate application deadlines when you track a programme.
                </p>
              </>
            )}
            <p className="mb-4 max-w-2xl text-sm text-fg-2">
              Free accounts track one specialty at a time. You can change this later from the specialty tracker.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entryLevelSpecialties.map(config => {
                const selected = selectedSpecialties.includes(config.key)
                return (
                  <button key={config.key} onClick={() => toggleSpecialty(config.key)} className={`min-h-[92px] rounded-lg border p-4 text-left transition-colors ${selected ? 'border-pill-blue bg-pill-blue' : 'border-subtle bg-surface-1 hover:border-default'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium">{config.name}</span>
                      <span className={`h-4 w-4 rounded-full border ${selected ? 'border-blue-500 bg-blue-500' : 'border-fg-3'}`} />
                    </div>
                    <p className="mt-2 text-xs text-fg-2">{config.cycleYear}</p>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {step === 'arcp' && (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className={`rounded-lg border p-5 ${careerStage === 'FY1' || careerStage === 'FY2' ? 'border-pill-blue bg-pill-blue' : 'border-subtle bg-surface-1'}`}>
              <h2 className="text-base font-semibold">ARCP timeline</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-2">
                Foundation doctors see the ARCP tracker and timeline by default. Medical students can enable it later from settings when relevant.
              </p>
            </div>
            <div className="rounded-lg border border-subtle bg-surface-1 p-5">
              <h2 className="text-base font-semibold">Evidence model</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-2">
                ARCP and specialty scoring only link portfolio evidence. Clinical cases remain a reflective journal and interview bank.
              </p>
            </div>
          </section>
        )}

        {step === 'first-entry' && (
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { value: 'portfolio' as const, title: 'Portfolio entry', body: 'Best for audits, teaching, courses, publications, prizes, reflections, and procedures.' },
              { value: 'case' as const, title: 'Clinical case', body: 'Best for memorable clinical stories, interview examples, and reflection prompts.' },
              { value: 'dashboard' as const, title: 'Dashboard', body: 'Finish setup and look around before logging anything.' },
            ].map(option => (
              <button key={option.value} onClick={() => setFirstEntryTarget(option.value)} disabled={saving} className={`rounded-lg border p-5 text-left transition-colors disabled:opacity-60 ${firstEntryTarget === option.value ? 'border-pill-blue bg-pill-blue' : 'border-subtle bg-surface-1 hover:border-default'}`}>
                <h2 className="text-base font-semibold">{option.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-fg-2">{option.body}</p>
              </button>
            ))}
          </section>
        )}

        {error && <p className="mt-6 rounded-lg border border-pill-rose bg-pill-rose px-4 py-3 text-sm text-rose-300">{error}</p>}

        <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={back} disabled={stepIndex === 0 || saving} className="rounded-lg border border-subtle px-5 py-3 text-sm font-medium text-fg-2 transition-colors hover:text-fg disabled:opacity-30">
            Back
          </button>
          {step === 'first-entry' ? (
            <button onClick={() => complete()} disabled={saving} className="rounded-lg bg-blue-500 hover:bg-blue-600 px-6 py-3 text-sm font-semibold text-surface-0 disabled:opacity-50 transition-colors">
              {saving ? 'Finishing...' : 'Finish setup'}
            </button>
          ) : (
            <div className="flex flex-col items-end">
              <button
                onClick={next}
                disabled={step === 'profile' && (!firstName.trim() || !lastName.trim() || !careerStage || (isMedicalStudent && !studentGraduationDate))}
                className="rounded-lg bg-blue-500 hover:bg-blue-600 px-6 py-3 text-sm font-semibold text-surface-0 disabled:opacity-40 transition-colors"
              >
                Continue
              </button>
              {(step === 'specialties' || step === 'arcp') && (
                <button
                  type="button"
                  onClick={next}
                  className="mt-2 text-sm text-fg-3 transition-colors hover:text-fg-2"
                >
                  Skip for now
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
