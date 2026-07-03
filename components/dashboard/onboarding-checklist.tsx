'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api-fetch'

type Props = {
  completedItems: string[]
  accountCreatedAt: string
  autoCompleted?: string[]
}

const ITEMS = [
  { key: 'portfolio_entry', label: 'Log your first portfolio entry', href: '/portfolio/new' },
  { key: 'specialty',       label: 'Add a specialty you\'re interested in', href: '/specialties' },
  { key: 'deadline',        label: 'Add a timeline goal or deadline', href: '/timeline' },
  { key: 'case',            label: 'Log your first case', href: '/cases/new' },
  { key: 'export',          label: 'Preview export options', href: '/export' },
]

export default function OnboardingChecklist({ completedItems: initialCompleted, accountCreatedAt, autoCompleted = [] }: Props) {
  const [completed, setCompleted] = useState<string[]>(() => {
    return Array.from(new Set([...initialCompleted, ...autoCompleted]))
  })
  const [dismissed, setDismissed] = useState(false)
  const [confirmingDismiss, setConfirmingDismiss] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  // The two checklist columns (dismissed flag + ticked items) are protected by
  // the guard_profile_writes DB trigger, which reverts them on any browser-side
  // (authenticated-role) UPDATE. Persist through the service-role API route
  // instead, or the change is silently lost on the next refresh.
  function persistChecklist(payload: { dismissed?: boolean; completedItems?: string[] }) {
    return apiFetch('/api/onboarding/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  // Auto-persist newly-derived completions (e.g. user just logged their first
  // entry in another tab) so the checklist reflects reality without the user
  // having to tick it manually.
  useEffect(() => {
    const newlyAuto = autoCompleted.filter(key => !initialCompleted.includes(key))
    if (newlyAuto.length === 0) return
    const next = Array.from(new Set([...initialCompleted, ...autoCompleted]))
    persistChecklist({ completedItems: next }).then(res => {
      if (!res.ok) console.error('checklist auto-tick failed to persist')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accountAge = Math.floor((Date.now() - new Date(accountCreatedAt).getTime()) / 86400000)
  const allDone = ITEMS.every(i => completed.includes(i.key))

  // Hide if dismissed, or account > 30 days old and all done
  if (dismissed) return null
  if (accountAge > 30 && allDone) return null

  // Two-step confirm before dismiss: dismissing the checklist is not reversible
  // from the dashboard (only from Settings), so make the user opt in.
  if (confirmingDismiss) {
    return (
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl mb-6 px-5 py-4"
        role="group"
        aria-label="Skip tutorial confirmation"
      >
        <p className="text-sm font-semibold text-fg">Skip the tutorial?</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">You can&apos;t get it back.</p>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleDismiss}
            className="px-4 min-h-[32px] rounded-lg text-sm font-medium bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] hover:bg-[var(--button-primary-bg-hover)] transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => setConfirmingDismiss(false)}
            className="px-4 min-h-[32px] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  async function toggleItem(key: string) {
    const next = completed.includes(key)
      ? completed.filter(k => k !== key)
      : [...completed, key]
    setCompleted(next)

    await persistChecklist({ completedItems: next })

    // All done - celebrate then auto-dismiss
    if (next.length === ITEMS.length) {
      setCelebrating(true)
      setTimeout(() => {
        setDismissed(true)
        persistChecklist({ dismissed: true }).then(res => {
          if (!res.ok) console.error('checklist dismiss failed to persist')
        })
      }, 3000)
    }
  }

  async function handleDismiss() {
    setDismissed(true)
    await persistChecklist({ dismissed: true })
  }

  const progress = completed.length
  const pct = Math.round((progress / ITEMS.length) * 100)

  return (
    <div className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl overflow-hidden mb-6">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pill-blue flex items-center justify-center">
            {celebrating ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent-text)]">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-fg">
              {celebrating ? 'Setup complete' : 'Getting started'}
            </p>
            <p className="text-xs text-fg-2">
              {celebrating ? 'Checklist complete.' : `${progress} of ${ITEMS.length} complete`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          {!celebrating && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-secondary)] font-mono">{pct}%</span>
            </div>
          )}
          <button
            onClick={e => { e.stopPropagation(); setConfirmingDismiss(true) }}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Dismiss checklist"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
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
                      ? 'bg-[var(--accent)] border-[var(--accent)]'
                      : 'bg-transparent border-white/[0.2] hover:border-white/[0.4]'
                  }`}
                >
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg-canvas)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
                {/* Label */}
                <span className={`flex-1 text-sm transition-colors ${done ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]'}`}>
                  {item.label}
                </span>
                {/* Arrow link */}
                {!done && (
                  <Link
                    href={item.href}
                    className="text-[var(--accent-text)] hover:text-[var(--accent-bright)] transition-colors p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
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
