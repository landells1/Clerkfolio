'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PREDEFINED_SPECIALTIES, MAX_SPECIALTIES } from '@/lib/constants/specialties'

type Step = 'welcome' | 'features' | 'career' | 'name' | 'specialties' | 'done'

const CAREER_STAGES = [
  { value: 'Y1', label: 'Medical Student', sub: 'Year 1' },
  { value: 'Y2', label: 'Medical Student', sub: 'Year 2' },
  { value: 'Y3', label: 'Medical Student', sub: 'Year 3' },
  { value: 'Y4', label: 'Medical Student', sub: 'Year 4' },
  { value: 'Y5', label: 'Medical Student', sub: 'Year 5' },
  { value: 'Y6', label: 'Medical Student', sub: 'Year 6' },
  { value: 'FY1',  label: 'Foundation Doctor', sub: 'FY1' },
  { value: 'FY2',  label: 'Foundation Doctor', sub: 'FY2' },
]

const FEATURES = [
  {
    icon: '📋',
    title: 'Log everything in one place',
    body: 'Cases, audits, QIPs, teaching, conferences, publications, reflections — all under one roof.',
  },
  {
    icon: '🏷️',
    title: 'Tag by specialty',
    body: 'Attach entries to any specialty so you can filter your portfolio for any application.',
  },
  {
    icon: '📄',
    title: 'Export in one click',
    body: 'Generate a clean PDF of exactly the entries you need — no more copy-pasting from spreadsheets.',
  },
  {
    icon: '🔒',
    title: 'Secure UK hosting',
    body: 'Your data lives on UK servers, encrypted at rest. Yours to keep and export, always.',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('welcome')
  const [careerStage, setCareerStage] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [customSpecialty, setCustomSpecialty] = useState('')
  const [customSpecialties, setCustomSpecialties] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allSpecialties = [...PREDEFINED_SPECIALTIES, ...customSpecialties]
  const totalSelected = selectedSpecialties.length

  function toggleSpecialty(s: string) {
    setSelectedSpecialties(prev =>
      prev.includes(s)
        ? prev.filter(x => x !== s)
        : totalSelected < MAX_SPECIALTIES
          ? [...prev, s]
          : prev
    )
  }

  function addCustomSpecialty() {
    const trimmed = customSpecialty.trim()
    if (!trimmed || allSpecialties.includes(trimmed)) return
    if (totalSelected >= MAX_SPECIALTIES) return
    setCustomSpecialties(prev => [...prev, trimmed])
    setSelectedSpecialties(prev => [...prev, trimmed])
    setCustomSpecialty('')
  }

  async function handleComplete() {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        career_stage: careerStage,
        specialty_interests: selectedSpecialties,
        onboarding_complete: true,
      })
      .eq('id', user.id)

    if (error) {
      setError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('referred_by, pro_features_used')
      .eq('id', user.id)
      .single()

    if (profile?.referred_by) {
      const until = new Date()
      until.setDate(until.getDate() + 30)
      await supabase.from('referrals').upsert({
        referrer_id: profile.referred_by,
        referred_id: user.id,
        status: 'completed',
        reward_granted_at: new Date().toISOString(),
      }, { onConflict: 'referred_id' })
      await Promise.all([
        supabase.from('profiles').update({
          pro_features_used: { ...(profile.pro_features_used ?? {}), referral_pro_until: until.toISOString() },
        }).eq('id', user.id),
        supabase.from('profiles').update({
          pro_features_used: { referral_pro_until: until.toISOString() },
        }).eq('id', profile.referred_by),
      ])
    }

    router.push('/dashboard')
    router.refresh()
  }

  const progress = {
    welcome: 0,
    features: 20,
    career: 40,
    name: 60,
    specialties: 80,
    done: 100,
  }[step]

  return (
    <div className="min-h-screen bg-[#0B0B0C] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#1B6FD9] flex items-center justify-center text-[#0B0B0C] font-bold text-sm font-mono">
            C
          </div>
          <span className="text-[#F5F5F2] font-semibold text-[15px] tracking-tight">Clinidex</span>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="w-32 h-1 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1B6FD9] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-[rgba(245,245,242,0.35)] font-mono">{progress}%</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">

          {/* Step: Welcome */}
          {step === 'welcome' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1B6FD9] flex items-center justify-center text-[#0B0B0C] font-bold text-2xl font-mono mx-auto mb-8">
                C
              </div>
              <h1 className="text-3xl font-semibold text-[#F5F5F2] tracking-tight mb-4">
                Welcome to Clinidex
              </h1>
              <p className="text-[rgba(245,245,242,0.55)] text-lg leading-relaxed mb-10 max-w-md mx-auto">
                Your medical portfolio — organised, searchable, and ready to export for any specialty application.
              </p>
              <button
                onClick={() => setStep('features')}
                className="bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-8 py-3.5 text-base transition-colors"
              >
                Get started →
              </button>
            </div>
          )}

          {/* Step: Features */}
          {step === 'features' && (
            <div>
              <h2 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight mb-2 text-center">
                Everything you need
              </h2>
              <p className="text-[rgba(245,245,242,0.45)] text-center mb-10">
                Here&apos;s what Clinidex does for you.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-10">
                {FEATURES.map(f => (
                  <div key={f.title} className="bg-[#141416] border border-white/[0.08] rounded-xl p-5">
                    <div className="text-2xl mb-3">{f.icon}</div>
                    <h3 className="text-sm font-semibold text-[#F5F5F2] mb-1.5">{f.title}</h3>
                    <p className="text-xs text-[rgba(245,245,242,0.5)] leading-relaxed">{f.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('welcome')}
                  className="flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:border-white/[0.15] rounded-xl py-3 text-sm font-medium transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep('career')}
                  className="flex-[2] bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step: Career stage */}
          {step === 'career' && (
            <div>
              <h2 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight mb-2 text-center">
                Where are you in training?
              </h2>
              <p className="text-[rgba(245,245,242,0.45)] text-center mb-8">
                This helps us tailor your experience.
              </p>
              <div className="grid grid-cols-1 gap-2.5 mb-8">
                {CAREER_STAGES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setCareerStage(s.value)}
                    className={`flex items-center justify-between px-5 py-4 rounded-xl border text-left transition-all ${
                      careerStage === s.value
                        ? 'bg-[#1B6FD9]/15 border-[#1B6FD9]/50 text-[#F5F5F2]'
                        : 'bg-[#141416] border-white/[0.08] text-[rgba(245,245,242,0.7)] hover:border-white/[0.15]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className={`text-xs mt-0.5 ${careerStage === s.value ? 'text-[#1B6FD9]' : 'text-[rgba(245,245,242,0.35)]'}`}>
                        {s.sub}
                      </div>
                    </div>
                    {careerStage === s.value && (
                      <div className="w-5 h-5 rounded-full bg-[#1B6FD9] flex items-center justify-center flex-shrink-0">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('features')}
                  className="flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:border-white/[0.15] rounded-xl py-3 text-sm font-medium transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep('name')}
                  disabled={!careerStage}
                  className="flex-[2] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0B0C] font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step: Name */}
          {step === 'name' && (
            <div>
              <h2 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight mb-2 text-center">
                What&apos;s your name?
              </h2>
              <p className="text-[rgba(245,245,242,0.45)] text-center mb-8">
                This appears in your portfolio and sidebar.
              </p>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">
                    First name
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-[#141416] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && firstName.trim() && lastName.trim() && setStep('specialties')}
                    className="w-full bg-[#141416] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('career')}
                  className="flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:border-white/[0.15] rounded-xl py-3 text-sm font-medium transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep('specialties')}
                  disabled={!firstName.trim() || !lastName.trim()}
                  className="flex-[2] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0B0C] font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step: Specialties */}
          {step === 'specialties' && (
            <div>
              <h2 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight mb-2 text-center">
                Which specialties interest you?
              </h2>
              <p className="text-[rgba(245,245,242,0.45)] text-center mb-2">
                Select all that apply — you can change this anytime.
              </p>
              <p className="text-xs text-[rgba(245,245,242,0.3)] text-center mb-6 font-mono">
                {totalSelected} / {MAX_SPECIALTIES} selected
              </p>

              {/* Custom specialty input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={customSpecialty}
                  onChange={e => setCustomSpecialty(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomSpecialty()}
                  className="flex-1 bg-[#141416] border border-white/[0.08] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1B6FD9] transition-colors"
                  placeholder="Add a custom specialty…"
                />
                <button
                  onClick={addCustomSpecialty}
                  disabled={!customSpecialty.trim() || totalSelected >= MAX_SPECIALTIES}
                  className="bg-[#141416] border border-white/[0.08] hover:border-white/[0.15] disabled:opacity-40 text-[rgba(245,245,242,0.7)] rounded-lg px-3.5 py-2 text-sm transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Specialty grid */}
              <div className="flex flex-wrap gap-2 mb-8 max-h-64 overflow-y-auto pr-1">
                {allSpecialties.map(s => {
                  const selected = selectedSpecialties.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSpecialty(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        selected
                          ? 'bg-[#1B6FD9]/15 border-[#1B6FD9]/50 text-[#1B6FD9]'
                          : 'bg-[#141416] border-white/[0.08] text-[rgba(245,245,242,0.6)] hover:border-white/[0.15] hover:text-[#F5F5F2]'
                      }`}
                    >
                      {selected && <span className="mr-1.5">✓</span>}
                      {s}
                    </button>
                  )
                })}
              </div>

              {error && <p className="text-sm text-red-400 mb-4 text-center">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('name')}
                  className="flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:border-white/[0.15] rounded-xl py-3 text-sm font-medium transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex-[2] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  {saving ? 'Setting up your account…' : selectedSpecialties.length === 0 ? 'Skip for now →' : `Go to dashboard →`}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
