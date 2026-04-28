'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Props = {
  userId: string
  completedItems: string[]
  accountCreatedAt: string
}

const ITEMS = [
  { key: 'portfolio_entry', label: 'Log your first portfolio entry', href: '/portfolio/new' },
  { key: 'specialty',       label: 'Add a specialty you\'re interested in', href: '/specialties' },
  { key: 'deadline',        label: 'Add a timeline goal', href: '/timeline' },
  { key: 'case',            label: 'Log your first case', href: '/cases/new' },
  { key: 'export',          label: 'Try exporting your portfolio', href: '/export' },
]

export default function OnboardingChecklist({ userId, completedItems: initialCompleted, accountCreatedAt }: Props) {
  const supabase = createClient()
  const [completed, setCompleted] = useState<string[]>(initialCompleted)
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  const accountAge = Math.floor((Date.now() - new Date(accountCreatedAt).getTime()) / 86400000)
  const allDone = ITEMS.every(i => completed.includes(i.key))

  // Hide if dismissed, or account > 30 days old and all done
  if (dismissed) return null
  if (accountAge > 30 && allDone) return null

  async function toggleItem(key: string) {
    const next = completed.includes(key)
      ? completed.filter(k => k !== key)
      : [...completed, key]
    setCompleted(next)

    await supabase
      .from('profiles')
      .update({ onboarding_checklist_completed_items: next })
      .eq('id', userId)

    // All done — celebrate then auto-dismiss
    if (next.length === ITEMS.length) {
      setCelebrating(true)
      setTimeout(async () => {
        setDismissed(true)
        await supabase
          .from('profiles')
          .update({ onboarding_checklist_dismissed: true })
          .eq('id', userId)
      }, 3000)
    }
  }

  async function handleDismiss() {
    setDismissed(true)
    await supabase
      .from('profiles')
      .update({ onboarding_checklist_dismissed: true })
      .eq('id', userId)
  }

  const progress = completed.length
  const pct = Math.round((progress / ITEMS.length) * 100)

  return (
    <div className="bg-[#141416] border border-white/[0.08] rounded-2xl overflow-hidden mb-6">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#1B6FD9]/15 flex items-center justify-center">
            {celebrating ? (
              <span className="text-base">🎉</span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#F5F5F2]">
              {celebrating ? 'You\'re all set! 🎉' : 'Getting started'}
            </p>
            <p className="text-xs text-[rgba(245,245,242,0.4)]">
              {celebrating ? 'Checklist complete — great work!' : `${progress} of ${ITEMS.length} complete`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          {!celebrating && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1B6FD9] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-[rgba(245,245,242,0.35)] font-mono">{pct}%</span>
            </div>
          )}
          <button
            onClick={e => { e.stopPropagation(); handleDismiss() }}
            className="text-[rgba(245,245,242,0.3)] hover:text-[#F5F5F2] transition-colors p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Dismiss checklist"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          >
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </div>
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
          {ITEMS.map(item => {
            const done = completed.includes(item.key)
            return (
              <div key={item.key} className="flex items-center gap-4 px-5 py-3.5">
                {/* Checkbox */}
                <button
                  onClick={() => toggleItem(item.key)}
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 ${
                    done
                      ? 'bg-[#1B6FD9] border-[#1B6FD9]'
                      : 'bg-transparent border-white/[0.2] hover:border-white/[0.4]'
                  }`}
                >
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
                {/* Label */}
                <span className={`flex-1 text-sm transition-colors ${done ? 'line-through text-[rgba(245,245,242,0.3)]' : 'text-[rgba(245,245,242,0.75)]'}`}>
                  {item.label}
                </span>
                {/* Arrow link */}
                {!done && (
                  <Link
                    href={item.href}
                    className="text-[#1B6FD9] hover:text-[#3884DD] transition-colors p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
