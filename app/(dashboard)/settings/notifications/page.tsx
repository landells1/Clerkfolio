'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'

const DEFAULT_PREFS = {
  deadlines: true,
  share_link_expiring: true,
  activity_nudge: false,
  application_window: true,
  weekly_digest: true,
  monthly_digest: true,
}

const OPTIONS = [
  { key: 'deadlines', label: 'Deadline reminders' },
  { key: 'share_link_expiring', label: 'Share link expiry' },
  { key: 'activity_nudge', label: 'Activity nudge' },
  { key: 'application_window', label: 'Application windows' },
  { key: 'weekly_digest', label: 'Weekly digest' },
  { key: 'monthly_digest', label: 'Monthly digest', hint: 'Only sent if your weekly digest is off, so you never get both covering the same activity.' },
] as const

export default function NotificationSettingsPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [prefs, setPrefs] = useState<typeof DEFAULT_PREFS | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setPrefs(DEFAULT_PREFS)
        setLoading(false)
        return
      }
      // .maybeSingle() returns null on no-row instead of throwing - defensive against
      // a brand-new auth user whose profile trigger hasn't fired yet.
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .maybeSingle()
      setPrefs({ ...DEFAULT_PREFS, ...(profile?.notification_preferences ?? {}) })
      setLoading(false)
    }
    load()
  }, [supabase])

  async function save(next: typeof DEFAULT_PREFS) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }
    const { error } = await supabase.from('profiles').update({ notification_preferences: next }).eq('id', user.id)
    setSaving(false)
    if (error) {
      addToast('Failed to save preferences', 'error')
      return
    }
    setPrefs(next)
    addToast('Notification preferences saved', 'success')
  }

  const resolvedPrefs = prefs ?? DEFAULT_PREFS

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Back to settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight mb-2">Notifications</h1>
          <p className="text-sm text-[var(--text-muted)]">Email reminders are sent once daily at 09:00 in your profile timezone when relevant.</p>
        </div>
      </div>

      <section className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading notification preferences...</p>
        ) : (
          <div className="space-y-4">
            {OPTIONS.map(option => (
              <ToggleRow
                key={option.key}
                label={option.label}
                hint={'hint' in option ? option.hint : undefined}
                checked={resolvedPrefs[option.key]}
                disabled={saving}
                onChange={checked => save({ ...resolvedPrefs, [option.key]: checked })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ToggleRow({ label, hint, checked, disabled, onChange }: { label: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-[44px] items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        {hint && <span className="text-xs text-[var(--text-muted)]">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} className="h-5 w-5 accent-[var(--accent-text)] shrink-0" />
    </label>
  )
}
