'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  ['Dashboard', 'Watch your recent activity, streak, and deadlines here.'],
  ['Log first case', 'Use Cases for anonymised clinical encounters.'],
  ['Set up specialty', 'Track a programme to organise evidence by criteria.'],
  ['Invite a friend', 'Referral links live in Settings.'],
] as const

export default function GuidedTour({ userId, initialStep }: { userId: string; initialStep: number }) {
  const [step, setStep] = useState(initialStep)
  if (step >= STEPS.length) return null
  async function setNext(next: number) {
    setStep(next)
    await createClient().from('profiles').update({ guided_tour_step: next }).eq('id', userId)
  }
  const [title, body] = STEPS[step]
  return (
    <div className="fixed bottom-20 right-4 z-40 w-[320px] rounded-2xl border border-white/[0.1] bg-[#141416] p-5 shadow-2xl">
      <p className="text-xs text-[rgba(245,245,242,0.4)]">Step {step + 1} of {STEPS.length}</p>
      <h2 className="mt-1 text-base font-semibold text-[#F5F5F2]">{title}</h2>
      <p className="mt-1 text-sm text-[rgba(245,245,242,0.58)]">{body}</p>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setNext(STEPS.length)} className="min-h-[40px] flex-1 rounded-xl border border-white/[0.08] text-sm text-[rgba(245,245,242,0.62)]">Skip</button>
        <button onClick={() => setNext(step + 1)} className="min-h-[40px] flex-1 rounded-xl bg-[#1B6FD9] text-sm font-semibold text-[#0B0B0C]">{step === STEPS.length - 1 ? 'Done' : 'Next'}</button>
      </div>
    </div>
  )
}
