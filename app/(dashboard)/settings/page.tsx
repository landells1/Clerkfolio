'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchSubscriptionInfo, planProvenance, formatStorageQuota, type SubscriptionInfo } from '@/lib/subscription'
import { VERIFIED_BONUS_MB, REFERRAL_STORAGE_BONUS_MB, REFERRAL_STORAGE_BONUS_AT } from '@/lib/entitlements/limits'
import { useToast } from '@/components/ui/toast-provider'
import CompetencyThemePicker from '@/components/portfolio/competency-theme-picker'
import BillingActionButton from '@/components/upgrade/billing-action-button'
import StorageMeter from '@/components/upgrade/storage-meter'
import { isInstitutionEmail, normaliseEmail } from '@/lib/institutional-email'
import { CAREER_STAGE_OPTIONS as CAREER_STAGES } from '@/lib/constants/career-stages'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'

const SETTINGS_ERROR_MESSAGES: Record<string, string> = {
  recovery_required: 'A valid password reset link is required to change your password.',
}

type ProfileState = {
  first_name: string
  last_name: string
  career_stage: string
  student_graduation_date: string
  referral_code: string
  timezone: string
  public_slug: string
  public_showcase_enabled: boolean
  display_prefs: {
    high_contrast?: boolean
    dyslexic_font?: boolean
  }
}

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const [profile, setProfile] = useState<ProfileState>({
    first_name: '',
    last_name: '',
    career_stage: '',
    student_graduation_date: '',
    referral_code: '',
    timezone: 'Europe/London',
    public_slug: '',
    public_showcase_enabled: false,
    display_prefs: {},
  })
  const [studentEmail, setStudentEmail] = useState({
    email: '',
    verified: false,
    verifiedAt: '',
    dueAt: '',
    sentAt: '',
  })
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null)
  const [accountCreatedAt, setAccountCreatedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [sendingStudentEmail, setSendingStudentEmail] = useState(false)
  const [pendingStage, setPendingStage] = useState<string | null>(null)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [origin, setOrigin] = useState('')
  const [settingsSearch, setSettingsSearch] = useState('')
  const [studentEmailError, setStudentEmailError] = useState<string | null>(null)
  const settingsErrorMessage = SETTINGS_ERROR_MESSAGES[searchParams.get('error') ?? ''] ?? null
  const returnedFromCheckout = searchParams.get('upgraded') === 'true'

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? '')
      setUserId(user.id)
      setAccountCreatedAt(user.created_at ?? '')
      const [{ data }, subInfo] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name, last_name, career_stage, student_graduation_date, referral_code, timezone, public_slug, public_showcase_enabled, display_prefs, student_email, student_email_verified, student_email_verified_at, student_email_verification_due_at, student_email_verification_sent_at')
          .eq('id', user.id)
          .single(),
        fetchSubscriptionInfo(supabase, user.id),
      ])

      if (data) {
        const primaryEmail = normaliseEmail(user.email)
        const suggestedInstitutionEmail = !data.student_email && isInstitutionEmail(primaryEmail) ? primaryEmail : ''
        let referralCode = data.referral_code ?? ''
        if (!/^[A-Z]{5}$/.test(referralCode)) {
          const { ok, data } = await apiFetch<{ code?: string }>('/api/referrals/ensure-code', { method: 'POST' })
          if (ok && data) {
            referralCode = data.code ?? referralCode
          }
        }
        setProfile({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          career_stage: data.career_stage ?? '',
          student_graduation_date: data.student_graduation_date ?? '',
          referral_code: referralCode,
          timezone: data.timezone ?? 'Europe/London',
          public_slug: data.public_slug ?? '',
          public_showcase_enabled: data.public_showcase_enabled ?? false,
          display_prefs: data.display_prefs ?? {},
        })
        setSubInfo(subInfo)
        setStudentEmail({
          email: data.student_email ?? suggestedInstitutionEmail,
          verified: data.student_email_verified ?? false,
          verifiedAt: data.student_email_verified_at ?? '',
          dueAt: data.student_email_verification_due_at ?? '',
          sentAt: data.student_email_verification_sent_at ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  useEffect(() => {
    const status = searchParams.get('student_email')
    if (status === 'verified') addToast('Institutional email verified', 'success')
    if (status === 'expired') addToast('Verification link expired. Request a new one.', 'error')
    if (status === 'invalid') addToast('Verification link is invalid or already used.', 'error')
    if (status === 'already_used') addToast('That institutional email is already verified on another account.', 'error')
    if (status === 'conflict') addToast(
      'Your signup email is already verified on another Clerkfolio account. If that wasn\'t you, please contact support.',
      'error'
    )
    if (settingsErrorMessage) addToast(settingsErrorMessage, 'error')
  }, [addToast, searchParams, settingsErrorMessage])

  async function saveProfile(next = profile) {
    setSavingProfile(true)
    const previousProfile = profile

    const publicSlug = normalisePublicSlug(next.public_slug)
    const gradDate = typeof next.student_graduation_date === 'string' && next.student_graduation_date.trim() !== ''
      ? next.student_graduation_date
      : null

    // Route through the server endpoint so that:
    //   1. Tier is recomputed after every career-stage change (#9).
    //   2. Server enforces the graduation-date invariant for student stages (#10).
    //   3. The foundation gift is returned in the same response (#2 mitigation).
    const { ok, status, data } = await apiFetch<{ error?: string }>('/api/settings/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: next.first_name,
        lastName: next.last_name,
        careerStage: next.career_stage,
        studentGraduationDate: gradDate,
        timezone: next.timezone,
        publicSlug: publicSlug || null,
        publicShowcaseEnabled: next.public_showcase_enabled,
        displayPrefs: next.display_prefs,
      }),
    })

    setSavingProfile(false)
    if (!ok) {
      addToast(status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Failed to save settings'), 'error')
      return
    }

    const updatedProfile = { ...next, public_slug: publicSlug }

    setProfile(updatedProfile)
    if (pendingStage === updatedProfile.career_stage) {
      setPendingStage(null)
    }
    const refreshed = await fetchSubscriptionInfo(supabase, userId)
    setSubInfo(refreshed)
    addToast('Settings saved', 'success')
    router.refresh()
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordForm.current) {
      addToast('Enter your current password to confirm.', 'error')
      return
    }
    if (passwordForm.next.length < 8) {
      addToast('Password must be at least 8 characters', 'error')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      addToast('Passwords do not match', 'error')
      return
    }

    setPasswordLoading(true)
    // Route through /api/account/password so current-password reauth is
    // enforced server-side. supabase.auth.updateUser({ password }) would skip
    // reauth and let anyone with a briefly-unattended logged-in browser
    // change the password.
    const { ok, status, data } = await apiFetch<{ error?: string; signInRequired?: boolean; sessionsRevoked?: boolean }>('/api/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      }),
    })
    setPasswordLoading(false)
    if (!ok) {
      if (data?.signInRequired) {
        router.replace('/login?session=revoked')
        router.refresh()
        return
      }
      addToast(status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Could not update password. Check the password and try again.'), 'error')
      return
    }
    setPasswordForm({ current: '', next: '', confirm: '' })
    addToast(
      data?.sessionsRevoked === false
        ? 'Password updated, but other sessions could not be signed out.'
        : 'Password updated',
      data?.sessionsRevoked === false ? 'error' : 'success'
    )
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
      a.download = `clerkfolio-export-${new Date().toISOString().split('T')[0]}.zip`
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

  async function sendStudentEmailVerification(e: React.FormEvent) {
    e.preventDefault()
    setSendingStudentEmail(true)
    setStudentEmailError(null)
    try {
      const res = await fetch('/api/student-email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail.email }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Could not send verification link')
      setStudentEmail(current => ({
        ...current,
        verified: false,
        verifiedAt: '',
        dueAt: '',
        sentAt: new Date().toISOString(),
      }))
      addToast('Verification link sent', 'success')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send verification link'
      setStudentEmailError(message)
      addToast(message, 'error')
    } finally {
      setSendingStudentEmail(false)
    }
  }

  async function restartTutorial() {
    // These columns are protected by guard_profile_writes for user-role
    // writes, so the reset must go through the service-role API route.
    const { ok, status, data } = await apiFetch<{ error?: string }>('/api/settings/restart-tutorial', { method: 'POST' })
    if (!ok) {
      addToast(status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Failed to restart tutorial'), 'error')
      return
    }
    router.push('/dashboard')
  }

  async function copyReferralLink() {
    if (!profile.referral_code) return
    await navigator.clipboard.writeText(`${origin || window.location.origin}/r/${profile.referral_code}`)
    addToast('Referral link copied', 'success')
  }

  async function deleteAccount() {
    if (!deleteConfirmPassword) {
      addToast('Enter your current password to confirm deletion.', 'error')
      return
    }
    const { ok, status, data } = await apiFetch<{ error?: string }>('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE', currentPassword: deleteConfirmPassword }),
    })
    if (!ok) {
      addToast(status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Failed to delete account'), 'error')
      return
    }
    // Drop the offline dashboard cache (written by offline-cache-primer.tsx).
    // Account delete is privacy-critical - leaving stale portfolio / case
    // titles in localStorage would defeat the deletion.
    try { localStorage.removeItem('clerkfolio-offline-latest') } catch {}
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'LOGOUT' })
    }
    await supabase.auth.signOut()
    router.push('/?deleted=true')
  }

  function setDisplayPref(key: 'high_contrast' | 'dyslexic_font', value: boolean) {
    const nextPrefs = { ...profile.display_prefs, [key]: value }
    setProfile(p => ({ ...p, display_prefs: nextPrefs }))
    window.localStorage.setItem('display_prefs', JSON.stringify(nextPrefs))
    document.body.classList.toggle('theme-high-contrast', Boolean(nextPrefs.high_contrast))
    document.body.classList.toggle('font-dyslexic', Boolean(nextPrefs.dyslexic_font))
  }

  if (loading) {
    return <div className="p-8 text-sm text-[rgba(245,245,242,0.45)]">Loading settings...</div>
  }
  const settingsLinks: Array<[string, string, string]> = ([
    ['/settings/notifications', 'Notifications', 'Email digests and reminders'],
    ['/settings/billing', 'Billing', 'Open Stripe checkout or billing portal'],
    ['/settings/referrals', 'Referrals', 'Invite a colleague, both get Pro'],
    ['/settings/snippets', 'Snippets', 'Reusable phrases for portfolio notes'],
    ['/settings/templates', 'Templates', 'Reusable entry shapes you can clone'],
    ['/settings/themes', 'Competency themes', 'Custom interview themes (Leadership, Teaching, etc.)'],
    ['/settings/tags', 'Specialty tags', 'Rename or merge linked-specialty tags'],
    ['/settings/shared-links', 'Shared links', 'Manage read-only public share links'],
    ['/settings/audit-log', 'Audit log', 'Recent security-relevant actions on your account'],
    ['/settings/sessions', 'Sessions', 'Active devices and sign-ins'],
    ['/trash', 'Trash', 'Restore items or permanently delete them after 30 days'],
    ['/help', 'Help & glossary', 'Acronyms, concepts and keyboard shortcuts'],
  ] as Array<[string, string, string]>).filter(([, label, description]) => `${label} ${description}`.toLowerCase().includes(settingsSearch.toLowerCase()))

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Settings</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">Manage your profile, plan, data, and preferences.</p>
      </div>

      {settingsErrorMessage && (
        <div role="alert" className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {settingsErrorMessage}
        </div>
      )}

      {returnedFromCheckout && subInfo && (
        <div role="status" className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {subInfo.isPro
            ? "You're now on Pro - enjoy unlimited exports, 5 GB storage, and unlimited share links."
            : 'Completing your upgrade. Pro access will appear here once payment confirmation has been processed.'}
        </div>
      )}

      <section className="bg-[#141416] border border-[#1B6FD9]/30 rounded-2xl p-6 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F2] mb-1">Career stage</h2>
            <p className="text-sm text-[rgba(245,245,242,0.45)]">This controls which features are shown in your sidebar. Moving out of medical school changes Student accounts to Foundation accounts.</p>
          </div>
          <select
            value={pendingStage ?? profile.career_stage}
            onChange={e => {
              const nextStage = e.target.value
              setPendingStage(nextStage && nextStage !== profile.career_stage ? nextStage : null)
            }}
            className="min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9]"
          >
            <option value="">Select career stage</option>
            {CAREER_STAGES.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
          </select>
        </div>
        {subInfo?.isMedStudent && (
          <label className="mt-5 block max-w-xs mx-auto text-xs font-medium uppercase tracking-wide text-[rgba(245,245,242,0.55)]">
            Expected graduation date
            <input
              type="date"
              value={profile.student_graduation_date}
              onChange={e => setProfile(p => ({ ...p, student_graduation_date: e.target.value }))}
              onBlur={() => saveProfile()}
              className="mt-1.5 w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3.5 py-2.5 text-sm text-[#F5F5F2] normal-case tracking-normal outline-none focus:border-[#1B6FD9]"
            />
          </label>
        )}
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <div className="mb-5 flex items-center gap-2">
          <h2 className="text-base font-semibold text-[#F5F5F2]">{profileDisplayName(profile) || 'Profile'}</h2>
          {isLoyalAccount(accountCreatedAt) && (
            <span title="One year on Clerkfolio" aria-label="One year on Clerkfolio" className="text-sm">
              🎓
            </span>
          )}
        </div>
        <form
          onSubmit={e => {
            e.preventDefault()
            if (pendingStage && pendingStage !== profile.career_stage) {
              saveProfile({ ...profile, career_stage: pendingStage })
              return
            }
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
          <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wide">
            Timezone
            <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className="mt-1.5 w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2] normal-case tracking-normal">
              <option value="Europe/London">Europe/London</option>
              <option value="UTC">UTC</option>
              <option value="Europe/Dublin">Europe/Dublin</option>
              <option value="Europe/Paris">Europe/Paris</option>
            </select>
            <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-[rgba(245,245,242,0.45)]">
              Used to display deadlines and digest send times in your local time.
            </span>
          </label>
          <button disabled={savingProfile} className="min-h-[44px] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-lg px-5 py-2.5 text-sm">
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F2]">Public showcase</h2>
            <p className="mt-1 text-sm text-[rgba(245,245,242,0.45)]">
              {profile.public_slug ? `${origin || ''}/showcase/${normalisePublicSlug(profile.public_slug)}` : 'Choose a public slug'}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-[rgba(245,245,242,0.65)]">
            <input
              type="checkbox"
              checked={profile.public_showcase_enabled}
              onChange={e => setProfile(p => ({ ...p, public_showcase_enabled: e.target.checked }))}
            />
            Enabled
          </label>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={profile.public_slug}
            onChange={e => setProfile(p => ({ ...p, public_slug: e.target.value }))}
            placeholder="dr-test"
            className="min-h-[44px] flex-1 rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3.5 py-2.5 text-sm text-[#F5F5F2] outline-none focus:border-[#1B6FD9]"
          />
          <button onClick={() => saveProfile()} disabled={savingProfile} className="min-h-[44px] rounded-lg bg-[#1B6FD9] px-5 py-2.5 text-sm font-semibold text-[#0B0B0C] disabled:opacity-50">
            Save showcase
          </button>
        </div>
        {profile.public_slug && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-[rgba(245,245,242,0.5)]">
              Public showcases display entry titles, categories, dates, and linked specialty labels. Private notes and reflection text are not shown.
            </p>
            <Link href={`/showcase/${normalisePublicSlug(profile.public_slug)}`} className="inline-flex text-sm text-[#1B6FD9] hover:text-[#6AA8FF]">
              Preview showcase
            </Link>
          </div>
        )}
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-4">Accessibility</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 text-sm text-[rgba(245,245,242,0.72)]">
            High contrast
            <input
              type="checkbox"
              checked={Boolean(profile.display_prefs.high_contrast)}
              onChange={e => setDisplayPref('high_contrast', e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm text-[rgba(245,245,242,0.72)]">
            Dyslexic-friendly font
            <input
              type="checkbox"
              checked={Boolean(profile.display_prefs.dyslexic_font)}
              onChange={e => setDisplayPref('dyslexic_font', e.target.checked)}
            />
          </label>
        </div>
        <button onClick={() => saveProfile()} disabled={savingProfile} className="mt-5 min-h-[44px] rounded-lg bg-[#1B6FD9] px-5 py-2.5 text-sm font-semibold text-[#0B0B0C] disabled:opacity-50">
          Save display preferences
        </button>
        <p className="mt-4 text-xs text-[rgba(245,245,242,0.55)]">Data encrypted at rest by Supabase, eu-west-2.</p>
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-3">Plan</h2>
        {subInfo && (() => {
          const provenance = planProvenance(subInfo)
          const pdfAllowance = subInfo.isPro ? 'unlimited' : String(1 + subInfo.referralCount)
          const shareAllowance = subInfo.isPro ? 'unlimited' : String(1 + subInfo.referralCount)
          return (
            <div className="space-y-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 text-sm text-[rgba(245,245,242,0.55)]">
                  <p>
                    <span className="text-[#F5F5F2] font-medium">{provenance.label}</span>
                    <span> · {formatStorageQuota(subInfo.storageQuotaMB)} storage</span>
                  </p>
                  {subInfo.isVerified && (
                    <p className="text-xs text-[#6AA8FF]">Institution verified · +{VERIFIED_BONUS_MB} MB storage</p>
                  )}
                  {subInfo.referralCount > 0 && !subInfo.isPro && (
                    <p className="text-xs text-[#6AA8FF]">
                      {subInfo.referralCount} referral{subInfo.referralCount === 1 ? '' : 's'} · +{subInfo.referralCount} PDF export{subInfo.referralCount === 1 ? '' : 's'}, +{subInfo.referralCount} share link{subInfo.referralCount === 1 ? '' : 's'}
                      {subInfo.referralCount >= REFERRAL_STORAGE_BONUS_AT ? `, +${REFERRAL_STORAGE_BONUS_MB} MB` : ''}
                    </p>
                  )}
                  <p>PDF exports used: {subInfo.usage.pdfExportsUsed} / {pdfAllowance}</p>
                  <p>Share links used: {subInfo.usage.shareLinksUsed} / {shareAllowance}</p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Link href="/upgrade" className="min-h-[44px] rounded-lg bg-[#1B6FD9] px-5 py-2.5 text-center text-sm font-semibold text-[#0B0B0C] hover:bg-[#155BB0]">
                    View plans
                  </Link>
                  <BillingActionButton hasStripeBilling={provenance.hasStripeBilling} label={provenance.billingLabel} />
                </div>
              </div>
              <StorageMeter usedMB={subInfo.usage.storageUsedMB} quotaMB={subInfo.storageQuotaMB} />
            </div>
          )
        })()}
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F2]">Institutional email</h2>
            <p className="mt-1 text-sm text-[rgba(245,245,242,0.45)]">
              Verify a university or NHS email for Student storage where eligible and referral rewards. Re-verification is required yearly, and you can change this email when your institution changes.
            </p>
          </div>
          <StudentEmailStatus studentEmail={studentEmail} />
        </div>
        <form onSubmit={sendStudentEmailVerification} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={studentEmail.email}
            onChange={e => setStudentEmail(current => ({ ...current, email: e.target.value }))}
            placeholder="you@university.ac.uk or you@nhs.net"
            className="min-h-[44px] flex-1 rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3.5 py-2.5 text-sm text-[#F5F5F2] outline-none focus:border-[#1B6FD9]"
          />
          <button
            disabled={sendingStudentEmail}
            className="min-h-[44px] rounded-lg bg-[#1B6FD9] px-5 py-2.5 text-sm font-semibold text-[#0B0B0C] hover:bg-[#155BB0] disabled:opacity-50"
          >
            {sendingStudentEmail ? 'Sending...' : studentEmail.verified ? 'Re-verify' : 'Send verification'}
          </button>
        </form>
        <p className="mt-3 text-xs text-[rgba(245,245,242,0.55)]">
          Accepted domains include .ac.uk, nhs.net, nhs.uk, nhs.scot, wales.nhs.uk, and hscni.net.
        </p>
        {studentEmail.sentAt && !studentEmail.verified && (
          <p role="status" className="mt-3 rounded-lg border border-[#1B6FD9]/20 bg-[#1B6FD9]/10 px-3 py-2 text-sm text-blue-100">
            We sent a verification link to {studentEmail.email}. Check your institution inbox.
          </p>
        )}
        {studentEmailError && (
          <p role="alert" className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {studentEmailError}
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <input value={settingsSearch} onChange={e => setSettingsSearch(e.target.value)} placeholder="Search settings" className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[#141416] px-4 text-sm text-[#F5F5F2] sm:col-span-2" />
        {settingsLinks.map(([href, label, description]) => <SettingsLink key={href} href={href} label={label} description={description} />)}
        <button onClick={restartTutorial} className="min-h-[44px] text-left bg-[#141416] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-medium text-[#F5F5F2] hover:border-white/[0.16]">
          Restart tutorial
        </button>
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-3">Legal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SettingsLink href="/terms" label="Terms and conditions" />
          <SettingsLink href="/privacy" label="Privacy policy" />
        </div>
      </section>

      {profile.referral_code && (
        <section className="bg-[#141416] border border-[#1B6FD9]/25 rounded-2xl p-6 mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-[rgba(245,245,242,0.45)] mb-2">Referral code</p>
              <h2 className="text-3xl font-semibold tracking-[0.18em] text-[#F5F5F2]">{profile.referral_code}</h2>
              <p className="mt-3 break-all text-sm text-[rgba(245,245,242,0.45)]">{origin ? `${origin}/r/${profile.referral_code}` : `/r/${profile.referral_code}`}</p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <button
                type="button"
                onClick={copyReferralLink}
                className="min-h-[44px] rounded-lg bg-[#1B6FD9] px-5 py-2.5 text-sm font-semibold text-[#0B0B0C] hover:bg-[#155BB0]"
              >
                Copy link
              </button>
              <Link href="/settings/referrals" className="text-sm text-[rgba(245,245,242,0.5)] hover:text-[#F5F5F2]">
                View referrals
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-3">Competency themes</h2>
        <p className="mb-5 text-sm text-[rgba(245,245,242,0.45)]">Create or delete your custom competency themes.</p>
        <CompetencyThemePicker manageOnly />
      </section>

      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-5">Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <input type="password" autoComplete="current-password" placeholder="Current password" value={passwordForm.current} onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))} className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2]" />
          <input type="password" autoComplete="new-password" placeholder="New password" value={passwordForm.next} onChange={e => setPasswordForm(f => ({ ...f, next: e.target.value }))} className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2]" />
          <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} className="w-full min-h-[44px] bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F2]" />
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
        <button onClick={() => { setDeleteConfirmText(''); setDeleteConfirmPassword(''); setDeleteConfirm(true) }} className="min-h-[44px] border border-red-500/30 text-red-300 rounded-lg px-5 py-2.5 text-sm hover:bg-red-500/10">
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
          body={`This permanently deletes your Clerkfolio account, portfolio entries, cases, evidence metadata, goals, share links, and settings. Type DELETE and enter your current password to confirm.`}
          confirmLabel="Delete account"
          danger
          confirmationText={deleteConfirmText}
          onConfirmationTextChange={setDeleteConfirmText}
          confirmationRequired="DELETE"
          passwordValue={deleteConfirmPassword}
          onPasswordChange={setDeleteConfirmPassword}
          passwordRequired
          onCancel={() => { setDeleteConfirm(false); setDeleteConfirmText(''); setDeleteConfirmPassword('') }}
          onConfirm={deleteAccount}
        />
      )}
    </div>
  )
}

function SettingsLink({ href, label, description }: { href: string; label: string; description?: string }) {
  return (
    <Link href={href} className="min-h-[44px] flex flex-col bg-[#141416] border border-white/[0.08] rounded-xl px-4 py-3 hover:border-white/[0.16]">
      <span className="text-sm font-medium text-[#F5F5F2]">{label}</span>
      {description && <span className="mt-0.5 text-[11px] text-[rgba(245,245,242,0.45)]">{description}</span>}
    </Link>
  )
}

function profileDisplayName(profile: Pick<ProfileState, 'first_name' | 'last_name'>) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(' ')
}

function normalisePublicSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}

function isLoyalAccount(createdAt: string) {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  return Date.now() - created >= 365 * 24 * 60 * 60 * 1000
}

function StudentEmailStatus({ studentEmail }: { studentEmail: { email: string; verified: boolean; verifiedAt: string; dueAt: string } }) {
  if (!studentEmail.email) {
    return <span className="text-xs text-[rgba(245,245,242,0.55)]">Not added</span>
  }

  if (!studentEmail.verified) {
    return <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300">Unverified</span>
  }

  const dueLabel = studentEmail.dueAt
    ? new Date(studentEmail.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'next year'

  return (
    <span className="rounded-full bg-[#1B6FD9]/15 px-2.5 py-1 text-xs font-medium text-[#6AA8FF]">
      Verified until {dueLabel}
    </span>
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
  passwordValue,
  onPasswordChange,
  passwordRequired,
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
  passwordValue?: string
  onPasswordChange?: (value: string) => void
  passwordRequired?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const textGate = confirmationRequired != null && confirmationText !== confirmationRequired
  const passwordGate = passwordRequired === true && (!passwordValue || passwordValue.length === 0)
  const disabled = textGate || passwordGate

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full sm:max-w-md mx-auto bg-[#141416] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6">
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
        {passwordRequired && (
          <input
            type="password"
            autoComplete="current-password"
            value={passwordValue ?? ''}
            onChange={e => onPasswordChange?.(e.target.value)}
            placeholder="Current password"
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
