'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fetchSubscriptionInfo, type SubscriptionInfo } from '@/lib/subscription'
import { useToast } from '@/components/ui/toast-provider'

const DEFAULT_PREFS = {
  deadlines: true,
  share_link_expiring: true,
  activity_nudge: false,
  application_window: true,
}

const OPTIONS = [
  { key: 'deadlines', label: 'Deadline reminders' },
  { key: 'share_link_expiring', label: 'Share link expiry' },
  { key: 'activity_nudge', label: 'Activity nudge' },
  { key: 'application_window', label: 'Application windows' },
] as const

export default function NotificationSettingsPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: profile }, subInfo] = await Promise.all([
        // .maybeSingle() returns null on no-row instead of throwing — defensive against
        // a brand-new auth user whose profile trigger hasn't fired yet.
        supabase.from('profiles').select('notification_preferences').eq('id', user.id).maybeSingle(),
        fetchSubscriptionInfo(supabase, user.id),
      ])
      setSubInfo(subInfo)
      if (!profile) return
      setPrefs({ ...DEFAULT_PREFS, ...(profile.notification_preferences ?? {}) })
    }
    load()
  }, [supabase])

  async function save(next: typeof DEFAULT_PREFS) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({ notification_preferences: next }).eq('id', user.id)
    setSaving(false)
    if (error) {
      addToast('Failed to save preferences', 'error')
      return
    }
    setPrefs(next)
    addToast('Notification preferences saved', 'success')
  }

  const isPro = subInfo?.isPro ?? false
  const masterOn = Object.values(prefs).some(Boolean)

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors" aria-label="Back to settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight mb-2">Notifications</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)]">Email reminders are sent once daily at 09:00 UTC when relevant.</p>
        </div>
      </div>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6">
        {!isPro ? (
          <ToggleRow
            label="Email reminders"
            checked={masterOn}
            disabled={saving}
            onChange={checked => save({
              deadlines: checked,
              share_link_expiring: checked,
              activity_nudge: false,
              application_window: checked,
            })}
          />
        ) : (
          <div className="space-y-4">
            {OPTIONS.map(option => (
              <ToggleRow
                key={option.key}
                label={option.label}
                checked={prefs[option.key]}
                disabled={saving}
                onChange={checked => save({ ...prefs, [option.key]: checked })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ToggleRow({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-[44px] items-center justify-between gap-4">
      <span className="text-sm font-medium text-[#F5F5F2]">{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} className="h-5 w-5 accent-[#1B6FD9]" />
    </label>
  )
}
