'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getStorageUsage, FREE_CAP_BYTES } from '@/lib/supabase/storage'
import { getSubscriptionInfo } from '@/lib/subscription'
import { useToast } from '@/components/ui/toast-provider'

function formatStorageBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const CAREER_STAGES = [
  { value: 'Y1-2', label: 'Medical Student — Year 1–2' },
  { value: 'Y3-4', label: 'Medical Student — Year 3–4' },
  { value: 'Y5-6', label: 'Medical Student — Year 5–6' },
  { value: 'FY1',  label: 'Foundation Year 1 (FY1)' },
  { value: 'FY2',  label: 'Foundation Year 2 (FY2)' },
]

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    career_stage: '',
  })
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [showEmailChange, setShowEmailChange] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailChangeLoading, setEmailChangeLoading] = useState(false)
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [storageUsed, setStorageUsed] = useState<number | null>(null)
  const [subInfo, setSubInfo] = useState<ReturnType<typeof getSubscriptionInfo> | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [upgradedMsg, setUpgradedMsg] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || '')

      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, career_stage, trial_started_at, subscription_status, subscription_period_end')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          career_stage: data.career_stage || '',
        })
        setSubInfo(getSubscriptionInfo({
          trial_started_at: data.trial_started_at,
          subscription_status: data.subscription_status,
          subscription_period_end: data.subscription_period_end,
        }))
      }

      const used = await getStorageUsage(user.id)
      setStorageUsed(used)

      // Show success message if redirected back from Stripe
      if (window.location.search.includes('upgraded=true')) {
        setUpgradedMsg(true)
        window.history.replaceState({}, '', '/settings')
      }

      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', user.id)

    if (error) {
      setError('Failed to save changes.')
    } else {
      addToast('Profile saved', 'success')
    }
    setSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)

    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('New passwords do not match.')
      return
    }
    if (passwordForm.next.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.next })

    if (error) {
      setPasswordError(error.message)
    } else {
      addToast('Password updated', 'success')
      setPasswordForm({ current: '', next: '', confirm: '' })
    }
    setPasswordLoading(false)
  }

  async function handleUpgrade() {
    setBillingLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const json = await res.json()
    if (json.url) window.location.href = json.url
    else {
      addToast('Could not open billing page. Please try again.', 'error')
      setBillingLoading(false)
    }
  }

  async function handleManageBilling() {
    setBillingLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const json = await res.json()
    if (json.url) window.location.href = json.url
    else {
      addToast('Could not open billing page. Please try again.', 'error')
      setBillingLoading(false)
    }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    setEmailChangeLoading(true)
    setEmailChangeError(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) {
      setEmailChangeError(error.message)
    } else {
      addToast('Confirmation email sent. Check your inbox.', 'success')
      setNewEmail('')
      setShowEmailChange(false)
    }
    setEmailChangeLoading(false)
  }

  async function handleDeleteAccount() {
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to delete account. Please contact hello@clinidex.co.uk.')
        return
      }
      // Auth user is deleted server-side; sign out client session and redirect
      await supabase.auth.signOut()
      router.push('/?deleted=true')
    } catch {
      setError('Failed to delete account. Please contact hello@clinidex.co.uk.')
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-[rgba(245,245,242,0.35)] text-sm">Loading settings…</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Settings</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">Manage your account and preferences.</p>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { href: '/portfolio', label: 'View portfolio' },
          { href: '/export',    label: 'Export PDF' },
          { href: '/cases',     label: 'Cases' },
          { href: '/specialties', label: 'Specialties' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] border border-white/[0.06] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:border-white/[0.12] transition-colors"
          >
            {label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Profile */}
      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-5">Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">First name</label>
              <input
                type="text"
                value={profile.first_name}
                onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1D9E75] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Last name</label>
              <input
                type="text"
                value={profile.last_name}
                onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1D9E75] transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wide">Email address</label>
              <button
                type="button"
                onClick={() => { setShowEmailChange(v => !v); setEmailChangeError(null) }}
                className="text-xs text-[#1D9E75] hover:underline"
              >
                Change email
              </button>
            </div>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[rgba(245,245,242,0.4)] cursor-not-allowed"
            />
            {emailChangeError && <p className="text-xs text-red-400 mt-1">{emailChangeError}</p>}
            {showEmailChange && (
              <form onSubmit={handleEmailChange} className="mt-3 flex gap-2">
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="New email address"
                  className="flex-1 bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1D9E75] transition-colors"
                />
                <button
                  type="submit"
                  disabled={emailChangeLoading}
                  className="bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
                >
                  {emailChangeLoading ? 'Sending…' : 'Send confirmation'}
                </button>
              </form>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Stage of training</label>
            <select
              value={profile.career_stage}
              onChange={e => setProfile(p => ({ ...p, career_stage: e.target.value }))}
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1D9E75] transition-colors"
            >
              {CAREER_STAGES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      {/* Password */}
      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-5">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">New password</label>
            <input
              type="password"
              value={passwordForm.next}
              onChange={e => setPasswordForm(f => ({ ...f, next: e.target.value }))}
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1D9E75] transition-colors"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Confirm new password</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1D9E75] transition-colors"
              placeholder="••••••••"
            />
          </div>
          {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={passwordLoading}
              className="bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              {passwordLoading ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </section>

      {/* Privacy & Security */}
      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-3">Privacy & security</h2>
        <div className="space-y-3 text-sm text-[rgba(245,245,242,0.55)] leading-relaxed">
          <p>Your data is stored securely on UK servers (London region) with AES-256 encryption at rest and TLS 1.3 in transit.</p>
          <p>Clinidex does not store patient-identifiable data. All case entries must be anonymised before saving.</p>
          <p>We do not share your data with third parties. <a href="/privacy" className="text-[#1D9E75] hover:underline">See our privacy policy</a> and <a href="/terms" className="text-[#1D9E75] hover:underline">terms of service</a> for full details.</p>
        </div>
      </section>

      {/* Subscription */}
      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-5">Plan & billing</h2>

        {upgradedMsg && (
          <div className="mb-4 bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-lg px-4 py-3 text-sm text-[#1D9E75]">
            ✓ You&apos;re now on Clinidex Pro. Thank you!
          </div>
        )}

        {subInfo ? (
          <div className="space-y-4">
            {/* Status badge */}
            <div className="flex items-center gap-3">
              {subInfo.isPro ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
                  Pro
                </span>
              ) : subInfo.isTrial ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Free trial
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Trial expired
                </span>
              )}

              <span className="text-sm text-[rgba(245,245,242,0.45)]">
                {subInfo.isPro
                  ? 'Full access — all features unlocked'
                  : subInfo.isTrial
                  ? `${subInfo.daysRemaining} day${subInfo.daysRemaining === 1 ? '' : 's'} remaining in free trial`
                  : 'Upgrade to continue exporting'}
              </span>
            </div>

            {/* Features list */}
            <div className="grid grid-cols-2 gap-2 text-xs text-[rgba(245,245,242,0.5)]">
              {[
                'Unlimited portfolio entries',
                'Unlimited case logging',
                subInfo.isPro ? '5 GB evidence storage' : '200 MB evidence storage',
                subInfo.canExport ? 'PDF export — included' : 'PDF export — Pro only',
              ].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <svg className={subInfo.canExport || !f.includes('export') ? 'text-[#1D9E75]' : 'text-[rgba(245,245,242,0.2)]'} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            {subInfo.isPro ? (
              <button
                onClick={handleManageBilling}
                disabled={billingLoading}
                className="text-sm text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                {billingLoading ? 'Opening portal…' : 'Manage subscription →'}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={billingLoading}
                className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
              >
                {billingLoading ? 'Redirecting…' : 'Upgrade to Pro — £10/year'}
              </button>
            )}
          </div>
        ) : (
          <div className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
        )}
      </section>

      {/* Storage usage */}
      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-1">Storage</h2>
        <p className="text-xs text-[rgba(245,245,242,0.4)] mb-4">Evidence files attached to portfolio entries and cases.</p>
        {storageUsed !== null ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[rgba(245,245,242,0.55)]">
              <span>{formatStorageBytes(storageUsed)} used</span>
              <span>{formatStorageBytes(FREE_CAP_BYTES)} free plan limit</span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  storageUsed / FREE_CAP_BYTES > 0.9
                    ? 'bg-red-400'
                    : storageUsed / FREE_CAP_BYTES > 0.7
                    ? 'bg-amber-400'
                    : 'bg-[#1D9E75]'
                }`}
                style={{ width: `${Math.min(100, (storageUsed / FREE_CAP_BYTES) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-[rgba(245,245,242,0.3)]">
              {Math.round((storageUsed / FREE_CAP_BYTES) * 100)}% of free plan used
            </p>
          </div>
        ) : (
          <div className="h-2 bg-white/[0.06] rounded-full animate-pulse" />
        )}
      </section>

      {/* Danger zone */}
      <section className="bg-red-500/5 border border-red-500/15 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-red-400 mb-2">Danger zone</h2>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mb-4">
          Deleting your account is permanent and cannot be undone. All your data will be removed.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Delete account
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <svg className="shrink-0 mt-0.5 text-red-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-400">This is permanent and cannot be undone</p>
                <p className="text-sm text-[rgba(245,245,242,0.45)]">
                  We recommend exporting your data before deleting.{' '}
                  <Link href="/export" className="text-[#1D9E75] hover:underline">Export your portfolio →</Link>
                </p>
              </div>
            </div>
            <div>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full bg-[#0B0B0C] border border-red-500/30 rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-red-500/60 transition-colors"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
              >
                Yes, delete my account
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                className="text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
