'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SPECIALTY_CONFIGS } from '@/lib/specialties'
import { createClient } from '@/lib/supabase/client'
import { clearClientStateOnAuthChange } from '@/lib/client-cleanup'
import { CAREER_STAGE_OPTIONS as CAREER_STAGES, isMedicalStudentStage } from '@/lib/constants/career-stages'

type Step = 'profile' | 'specialties' | 'arcp' | 'first-entry'

const ALL_STEPS: Step[] = ['profile', 'specialties', 'arcp', 'first-entry']
const MEDICAL_STUDENT_STEPS: Step[] = ['profile', 'specialties', 'first-entry']
function getSteps(careerStage: string): Step[] {
  return isMedicalStudentStage(careerStage) ? MEDICAL_STUDENT_STEPS : ALL_STEPS
}

const MAX_TRACKED_SPECIALTIES = 1
const DRAFT_KEY = 'clerkfolio-onboarding-draft'

function safePostOnboardingNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  const parsed = new URL(value, 'https://clerkfolio.local')
  return parsed.pathname === '/upgrade' ? `${parsed.pathname}${parsed.search}` : null
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState<Step>('profile')
  const [signingOut, setSigningOut] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [careerStage, setCareerStage] = useState('')
  const [studentGraduationDate, setStudentGraduationDate] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [firstEntryTarget, setFirstEntryTarget] = useState<'dashboard' | 'portfolio' | 'case'>('portfolio')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [profileContinueAttempted, setProfileContinueAttempted] = useState(false)
  const [postOnboardingNext] = useState<string | null>(() =>
    typeof window !== 'undefined'
      ? safePostOnboardingNext(new URLSearchParams(window.location.search).get('next'))
      : null
  )

  const steps = getSteps(careerStage)
  const stepIndex = Math.max(steps.indexOf(step), 0)
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)
  const isMedicalStudent = isMedicalStudentStage(careerStage)
  const missingProfileItems = [
    !firstName.trim() ? 'first name' : null,
    !lastName.trim() ? 'last name' : null,
    !careerStage ? 'career stage' : null,
    isMedicalStudent && !studentGraduationDate ? 'expected graduation date' : null,
  ].filter((value): value is string => Boolean(value))
  const profileStepBlocked = step === 'profile' && missingProfileItems.length > 0
  const profileHintId = 'onboarding-profile-requirements'
  const entryLevelSpecialties = useMemo(
    () => SPECIALTY_CONFIGS.slice(0, 18),
    []
  )

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as {
        step?: Step
        firstName?: string
        lastName?: string
        careerStage?: string
        studentGraduationDate?: string
        selectedSpecialties?: string[]
        firstEntryTarget?: 'dashboard' | 'portfolio' | 'case'
      }
      if (draft.step && ALL_STEPS.includes(draft.step)) setStep(draft.step)
      if (typeof draft.firstName === 'string') setFirstName(draft.firstName)
      if (typeof draft.lastName === 'string') setLastName(draft.lastName)
      if (typeof draft.careerStage === 'string') setCareerStage(draft.careerStage)
      if (typeof draft.studentGraduationDate === 'string') setStudentGraduationDate(draft.studentGraduationDate)
      if (Array.isArray(draft.selectedSpecialties)) setSelectedSpecialties(draft.selectedSpecialties.slice(0, MAX_TRACKED_SPECIALTIES))
      if (draft.firstEntryTarget) setFirstEntryTarget(draft.firstEntryTarget)
    } catch {
      window.localStorage.removeItem(DRAFT_KEY)
    } finally {
      setDraftLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!draftLoaded) return
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
      step,
      firstName,
      lastName,
      careerStage,
      studentGraduationDate,
      selectedSpecialties,
      firstEntryTarget,
    }))
  }, [careerStage, draftLoaded, firstEntryTarget, firstName, lastName, selectedSpecialties, step, studentGraduationDate])

  useEffect(() => {
    if (draftLoaded && !steps.includes(step)) setStep('first-entry')
  }, [draftLoaded, step, steps])

  function toggleSpecialty(key: string) {
    setSelectedSpecialties(prev => {
      if (prev.includes(key)) return prev.filter(item => item !== key)
      if (prev.length >= MAX_TRACKED_SPECIALTIES) return [key]
      return [...prev, key]
    })
  }

  function next() {
    if (profileStepBlocked) {
      setProfileContinueAttempted(true)
      return
    }
    setStep(steps[Math.min(stepIndex + 1, steps.length - 1)])
  }

  function back() {
    setStep(steps[Math.max(stepIndex - 1, 0)])
  }

  // Onboarding auto-logs-in the user after email confirmation and middleware
  // redirects /login etc. back here until onboarding completes — so without
  // this control a user who confirmed the wrong account (or wants a different
  // one) is trapped. Mirror the sidebar's robust global-with-local-fallback
  // sign-out, and clear the onboarding draft so the next account doesn't
  // inherit these answers (QOL-003).
  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try { window.localStorage.removeItem(DRAFT_KEY) } catch {}
    clearClientStateOnAuthChange()
    let globalOk = false
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('global-signout-timeout')), 4000)
      )
      const { error } = await Promise.race([
        supabase.auth.signOut({ scope: 'global' }),
        timeout,
      ])
      if (error) throw error
      globalOk = true
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    }
    router.replace(globalOk ? '/login' : '/login?logout=local')
    router.refresh()
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
    window.localStorage.removeItem(DRAFT_KEY)
    if (postOnboardingNext) router.push(postOnboardingNext)
    else if (target === 'portfolio') router.push('/portfolio/new')
    else if (target === 'case') router.push('/cases/new')
    else router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface-0 text-fg">
      <header className="border-b border-subtle px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--button-primary-bg)] text-sm font-bold text-[var(--button-primary-text)]">C</div>
            <span className="text-sm font-semibold tracking-tight">Clerkfolio</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:block h-1 w-28 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-fg-2">{stepIndex + 1} / {steps.length}</span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-xs font-medium text-fg-2 hover:text-fg transition-colors disabled:opacity-50"
            >
              {signingOut ? 'Signing out…' : 'Not you? Sign out'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col px-5 py-10">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-2">Account setup</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {step === 'profile' && 'Set up your portfolio profile'}
            {step === 'specialties' && 'Choose your first tracked specialty'}
            {step === 'arcp' && 'Set up your training tracker'}
            {step === 'first-entry' && 'Start with one useful entry'}
          </h1>
        </div>

        {step === 'profile' && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="rounded-lg border border-subtle bg-surface-1 p-5">
              <p className="text-sm leading-relaxed text-fg-2">
                These details appear in your portfolio exports and help tailor ARCP and application tracking.
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-2">First name</span>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus className="w-full rounded-lg border border-subtle bg-surface-1 px-4 py-3 text-sm outline-none focus:border-strong" />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-2">Last name</span>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full rounded-lg border border-subtle bg-surface-1 px-4 py-3 text-sm outline-none focus:border-strong" />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CAREER_STAGES.map(stage => (
                  <button key={stage.value} onClick={() => setCareerStage(stage.value)} className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${careerStage === stage.value ? 'border-pill-blue bg-pill-blue text-fg' : 'border-subtle bg-surface-1 text-fg-1 hover:border-default'}`}>
                    {stage.label}
                  </button>
                ))}
              </div>
              {isMedicalStudent && (
                <label className="block max-w-xs">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-2">Expected graduation date <span className="text-red-400">*</span></span>
                  <input
                    type="date"
                    required
                    value={studentGraduationDate}
                    onChange={e => setStudentGraduationDate(e.target.value)}
                    className="w-full rounded-lg border border-subtle bg-surface-1 px-4 py-3 text-sm outline-none focus:border-strong"
                  />
                  <span className="mt-1.5 block text-xs normal-case tracking-normal text-fg-3">Required — used to personalise your stage and timeline. You can change this later.</span>
                </label>
              )}
            </div>
          </section>
        )}

        {step === 'specialties' && (
          <section>
            <h2 className="mb-2 text-xl font-semibold tracking-tight">Track your first specialty programme</h2>
            <p className="mb-4 max-w-2xl text-sm text-fg-2">
              We&apos;ll organise relevant evidence and auto-populate application deadlines when available.
            </p>
            <p className="mb-4 max-w-2xl text-sm text-fg-2">
              Free accounts track one specialty at a time. You can change this later from the specialty tracker.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entryLevelSpecialties.map(config => {
                const selected = selectedSpecialties.includes(config.key)
                return (
                  <button key={config.key} onClick={() => toggleSpecialty(config.key)} className={`min-h-[92px] rounded-lg border p-4 text-left transition-colors ${selected ? 'border-pill-blue bg-pill-blue' : 'border-subtle bg-surface-1 hover:border-default'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium">{config.name}</span>
                      <span className={`h-4 w-4 rounded-full border ${selected ? 'border-accent bg-accent' : 'border-fg-3'}`} />
                    </div>
                    <p className="mt-2 text-xs text-fg-2">{config.cycleYear}</p>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {step === 'arcp' && (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

        {error && <p className="mt-6 rounded-lg border border-pill-rose bg-pill-rose px-4 py-3 text-sm text-[var(--cat-rose-text)]">{error}</p>}

        <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={back} disabled={stepIndex === 0 || saving} className="rounded-lg border border-subtle px-5 py-3 text-sm font-medium text-fg-2 transition-colors hover:text-fg disabled:opacity-30">
            Back
          </button>
          {step === 'first-entry' ? (
            <button onClick={() => complete()} disabled={saving} className="rounded-lg bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] px-6 py-3 text-sm font-semibold text-[var(--button-primary-text)] disabled:opacity-50 transition-colors">
              {saving ? 'Finishing...' : 'Finish setup'}
            </button>
          ) : (
            <div className="flex flex-col items-end">
              <button
                onClick={next}
                aria-describedby={profileStepBlocked && profileContinueAttempted ? profileHintId : undefined}
                className="rounded-lg bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] px-6 py-3 text-sm font-semibold text-[var(--button-primary-text)] transition-colors"
              >
                Continue
              </button>
              {profileStepBlocked && profileContinueAttempted && (
                <p id={profileHintId} className="mt-2 max-w-xs text-right text-xs text-[var(--warning)]">
                  Add your {missingProfileItems.join(', ')} to continue.
                </p>
              )}
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
