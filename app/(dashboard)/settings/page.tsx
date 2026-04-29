'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSubscriptionInfo, type SubscriptionInfo } from '@/lib/subscription'
import { useToast } from '@/components/ui/toast-provider'
import CompetencyThemePicker from '@/components/portfolio/competency-theme-picker'

const CAREER_STAGES = [
  { value: 'Y1', label: 'Year 1 (Medical Student)' },
  { value: 'Y2', label: 'Year 2 (Medical Student)' },
  { value: 'Y3', label: 'Year 3 (Medical Student)' },
  { value: 'Y4', label: 'Year 4 (Medical Student)' },
  { value: 'Y5', label: 'Year 5 (Medical Student)' },
  { value: 'Y6', label: 'Year 6 (Medical Student)' },
  { value: 'FY1', label: 'Foundation Year 1 (FY1)' },
  { value: 'FY2', label: 'Foundation Year 2 (FY2)' },
  { value: 'POST_FY', label: 'Core/Specialty Training (CT/ST)' },
]

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()

  const [profile, setProfile] = useState({ first_name: '', last_name: '', career_stage: '' })
  const [email, setEmail] = useState('')
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [pendingStage, setPendingStage] = useState<string | null>(null)
  const [passwordForm, setPasswordForm] = useState({ next: '', confirm: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? '')
      const [{ data }, { count: specialtiesTracked }, { data: files }] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name, last_name, career_stage, tier, subscription_status, pro_features_used, student_grace_until')
          .eq('id', user.id)
          .single(),
        supabase
          .from('specialty_applications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('evidence_files')
          .select('file_size')
          .eq('user_id', user.id),
      ])

      if (data) {
        setProfile({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          career_stage: data.career_stage ?? '',
        })
        const storageUsedMB = (files ?? []).reduce((sum, file) => sum + (file.file_size ?? 0), 0) / (1024 * 1024)
        setSubInfo(getSubscriptionInfo(data, {
          specialtiesTracked: specialtiesTracked ?? 0,
          storageUsedMB,
        }))
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  async function saveProfile(next = profile) {
    setSavingProfile(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update(next)
      .eq('id', user.id)

    setSavingProfile(false)
    if (error) {
      addToast('Failed to save settings', 'error')
      return
    }
    setProfile(next)
    addToast('Settings saved', 'success')
    router.refresh()
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (passwordForm.next.length < 8) {
      addToast('Password must be at least 8 characters', 'error')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      addToast('Passwords do not match', 'error')
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.next })
    setPasswordLoading(false)
    if (error) {
      addToast(error.message, 'error')
      return
    }
    setPasswordForm({ next: '', confirm: '' })
    addToast('Password updated', 'success')
  }

  async function handleDataExport() {
    setExportLoading(true)
    try {
      const res = await fetch('/api/account/export', { method: 'POST' })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clinidex-export-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      addToast('Failed to generate export', 'error')
    } finally {
      setExportLoading(false)
    }
  }

  async function openBilling() {
    setBillingLoading(true)
    const hasStripePlan = subInfo?.tier === 'pro'
    const endpoint = hasStripePlan ? '/api/stripe/portal' : '/api/stripe/checkout'
    try {
      const res = await fetch(endpoint, { method: 'POST' })
      const body = await res.json()
      if (!res.ok || !body.url) throw new Error(body.error ?? 'Billing unavailable')
      window.location.href = body.url
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to open billing', 'error')
      setBillingLoading(false)
    }
  }

  async function restartTutorial() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('profiles')
      .update({ onboarding_complete: false, onboarding_checklist_completed_items: [] })
      .eq('id', user.id)
    router.push('/onboarding')
  }

  async function deleteAccount() {
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE' }),
    })
    if (!res.ok) {
      addToast('Failed to delete account', 'error')
      return
    }
    await supabase.auth.signOut()
    router.push('/?deleted=true')
  }

  if (loading) {
    return <div className="p-8 text-sm text-[rgba(245,245,242,0.45)]">Loading settings...</div>
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Settings</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">Manage your profile, plan, data, and preferences.</p>
      </div>

      <section className="bg-[#141416] border border-[#1B6FD9]/30 rounded-2xl p-6 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F2] mb-1">Career stage</h2>
            <p className="text-sm text-[rgba(245,245,242,0.45)]">This controls which features are shown in your sidebar. Your data is not affected.</p>
          </div>
          <select
            value={profile.career_stage}
            onChange={e => setPendingStage(e.target.value)}
            className="min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9]"
          >
            <option value="">Select career stage</option>
            {CAREER_STAGES.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
          </select>
        </div>
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-5">Profile</h2>
        <form
          onSubmit={e => {
            e.preventDefault()
            saveProfile()
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wide">
              First name
              <input
                value={profile.first_name}
                onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                className="mt-1.5 w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] normal-case tracking-normal"
              />
            </label>
            <label className="text-xs font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wide">
              Last name
              <input
                value={profile.last_name}
                onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                className="mt-1.5 w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] normal-case tracking-normal"
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wide">
            Email
            <input value={email} disabled className="mt-1.5 w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[rgba(245,245,242,0.45)] normal-case tracking-normal" />
          </label>
          <button disabled={savingProfile} className="min-h-[44px] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-lg px-5 py-2.5 text-sm">
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-3">Plan</h2>
        {subInfo && (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 text-sm text-[rgba(245,245,242,0.55)]">
              <p><span className="text-[#F5F5F2] font-medium">{subInfo.isPro ? 'Pro access' : 'Free tier'}</span> - {subInfo.storageQuotaMB} MB storage quota</p>
              <p>PDF exports used: {subInfo.usage.pdfExportsUsed} / {subInfo.isPro ? 'unlimited' : '1'}</p>
              <p>Share links used: {subInfo.usage.shareLinksUsed} / {subInfo.isPro ? 'unlimited' : '1'}</p>
            </div>
            <button
              onClick={openBilling}
              disabled={billingLoading}
              className="min-h-[44px] rounded-lg bg-[#1B6FD9] px-5 py-2.5 text-sm font-semibold text-[#0B0B0C] hover:bg-[#155BB0] disabled:opacity-50"
            >
              {billingLoading ? 'Opening...' : subInfo.tier === 'pro' ? 'Manage billing' : 'Upgrade to Pro'}
            </button>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <SettingsLink href="/settings/notifications" label="Notifications" />
        <SettingsLink href="/settings/referrals" label="Referrals" />
        <SettingsLink href="/settings/templates" label="Templates" />
        <SettingsLink href="/settings/shared-links" label="Shared links" />
        <SettingsLink href="/trash" label="Trash" />
        <button onClick={restartTutorial} className="min-h-[44px] text-left bg-[#141416] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-medium text-[#F5F5F2] hover:border-white/[0.16]">
          Restart tutorial
        </button>
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-3">Competency themes</h2>
        <p className="mb-5 text-sm text-[rgba(245,245,242,0.45)]">Create or delete your custom competency themes.</p>
        <CompetencyThemePicker manageOnly />
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-5">Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <input type="password" placeholder="New password" value={passwordForm.next} onChange={e => setPasswordForm(f => ({ ...f, next: e.target.value }))} className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2]" />
          <input type="password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2]" />
          <button disabled={passwordLoading} className="min-h-[44px] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-lg px-5 py-2.5 text-sm">
            {passwordLoading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-3">Data</h2>
        <button onClick={handleDataExport} disabled={exportLoading} className="min-h-[44px] bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-50 text-[#F5F5F2] font-medium rounded-lg px-5 py-2.5 text-sm">
          {exportLoading ? 'Preparing backup...' : 'Download personal data backup'}
        </button>
      </section>

      <section className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-red-300 mb-3">Delete account</h2>
        <button onClick={() => { setDeleteConfirmText(''); setDeleteConfirm(true) }} className="min-h-[44px] border border-red-500/30 text-red-300 rounded-lg px-5 py-2.5 text-sm hover:bg-red-500/10">
          Delete account
        </button>
      </section>

      {pendingStage && (
        <ConfirmModal
          title="Change career stage?"
          body="Changing your career stage will adjust which features are shown in the sidebar. Your data will not be affected. Continue?"
          confirmLabel="Continue"
          onCancel={() => setPendingStage(null)}
          onConfirm={() => {
            const next = { ...profile, career_stage: pendingStage }
            setPendingStage(null)
            saveProfile(next)
          }}
        />
      )}

      {deleteConfirm && (
        <ConfirmModal
          title="Delete account?"
          body={`This permanently deletes your Clinidex account, portfolio entries, cases, evidence metadata, goals, share links, and settings. Type DELETE to confirm.`}
          confirmLabel="Delete account"
          danger
          confirmationText={deleteConfirmText}
          onConfirmationTextChange={setDeleteConfirmText}
          confirmationRequired="DELETE"
          onCancel={() => { setDeleteConfirm(false); setDeleteConfirmText('') }}
          onConfirm={deleteAccount}
        />
      )}
    </div>
  )
}

function SettingsLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="min-h-[44px] bg-[#141416] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-medium text-[#F5F5F2] hover:border-white/[0.16]">
      {label}
    </Link>
  )
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  danger,
  confirmationText,
  onConfirmationTextChange,
  confirmationRequired,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  confirmationText?: string
  onConfirmationTextChange?: (value: string) => void
  confirmationRequired?: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const disabled = confirmationRequired != null && confirmationText !== confirmationRequired

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#141416] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-[#F5F5F2] mb-2">{title}</h2>
        <p className="text-sm text-[rgba(245,245,242,0.5)] leading-relaxed mb-6">{body}</p>
        {confirmationRequired && (
          <input
            value={confirmationText ?? ''}
            onChange={e => onConfirmationTextChange?.(e.target.value)}
            placeholder={confirmationRequired}
            className="mb-4 w-full min-h-[44px] rounded-lg border border-red-500/20 bg-[#0B0B0C] px-3.5 py-2.5 text-sm text-[#F5F5F2] outline-none focus:border-red-400"
          />
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="min-h-[44px] flex-1 border border-white/[0.08] text-[rgba(245,245,242,0.65)] rounded-lg px-4 py-2.5 text-sm">
            Cancel
          </button>
          <button disabled={disabled} onClick={onConfirm} className={`min-h-[44px] flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-40 ${danger ? 'bg-red-500 text-white' : 'bg-[#1B6FD9] text-[#0B0B0C]'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
