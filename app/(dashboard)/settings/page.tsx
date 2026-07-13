'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchSubscriptionInfo, type SubscriptionInfo } from '@/lib/subscription'
import { useToast } from '@/components/ui/toast-provider'
import CompetencyThemePicker from '@/components/portfolio/competency-theme-picker'
import { isInstitutionEmail, normaliseEmail } from '@/lib/institutional-email'
import { apiFetch, NETWORK_ERROR_MESSAGE } from '@/lib/api-fetch'
import { applyTheme, type Theme } from '@/lib/theme'
import type { ProfileState } from '@/components/settings/profile-state'
import { ConfirmModal } from '@/components/settings/confirm-modal'
import { CareerStageSection } from '@/components/settings/career-stage-section'
import { ProfileSection } from '@/components/settings/profile-section'
import { AppearanceSection } from '@/components/settings/appearance-section'
import { AccessibilitySection } from '@/components/settings/accessibility-section'
import { PlanSection } from '@/components/settings/plan-section'
import { InstitutionalEmailSection } from '@/components/settings/institutional-email-section'
import { PasswordSection } from '@/components/settings/password-section'
import { DataExportSection } from '@/components/settings/data-export-section'
import { ReferralCodeSection } from '@/components/settings/referral-code-section'

const SETTINGS_ERROR_MESSAGES: Record<string, string> = {
  recovery_required: 'A valid password reset link is required to change your password.',
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
  const [emailForm, setEmailForm] = useState({ open: false, newEmail: '', password: '' })
  const [emailChangeLoading, setEmailChangeLoading] = useState(false)
  const [emailChangeSentTo, setEmailChangeSentTo] = useState<string | null>(null)
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
          .select('first_name, last_name, career_stage, student_graduation_date, referral_code, timezone, display_prefs, student_email, student_email_verified, student_email_verified_at, student_email_verification_due_at, student_email_verification_sent_at')
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
    if (searchParams.get('email') === 'changed') addToast(
      'Email change confirmed. If your old inbox also received a link, open it too to finish.',
      'success'
    )
    if (settingsErrorMessage) addToast(settingsErrorMessage, 'error')
  }, [addToast, searchParams, settingsErrorMessage])

  async function saveProfile(next = profile) {
    setSavingProfile(true)
    const previousProfile = profile

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
        displayPrefs: next.display_prefs,
      }),
    })

    setSavingProfile(false)
    if (!ok) {
      addToast(status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Failed to save settings'), 'error')
      return
    }

    const updatedProfile = next

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

  async function handleEmailChange(e: React.SyntheticEvent) {
    e.preventDefault()
    const newEmail = emailForm.newEmail.trim()
    if (!newEmail) {
      addToast('Enter the new email address.', 'error')
      return
    }
    if (!emailForm.password) {
      addToast('Enter your current password to confirm.', 'error')
      return
    }

    setEmailChangeLoading(true)
    // Server enforces current-password reauth, then triggers Supabase's
    // confirmation email. The login email only changes once the link is opened.
    const { ok, status, data } = await apiFetch<{ error?: string }>('/api/account/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail, currentPassword: emailForm.password }),
    })
    setEmailChangeLoading(false)
    if (!ok) {
      addToast(status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Could not start the email change.'), 'error')
      return
    }
    setEmailChangeSentTo(newEmail)
    setEmailForm({ open: false, newEmail: '', password: '' })
  }

  async function handleDataExport() {
    setExportLoading(true)
    try {
      const { ok, response } = await apiFetch('/api/account/export', { method: 'POST', parse: 'none' })
      if (!ok || !response) throw new Error('Export failed')
      const blob = await response.blob()
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
    const { ok, status, data } = await apiFetch<{ error?: string }>('/api/student-email/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail.email }),
    })
    if (ok) {
      setStudentEmail(current => ({
        ...current,
        verified: false,
        verifiedAt: '',
        dueAt: '',
        sentAt: new Date().toISOString(),
      }))
      addToast('Verification link sent', 'success')
      router.refresh()
    } else {
      const message = status === null ? NETWORK_ERROR_MESSAGE : (data?.error ?? 'Could not send verification link')
      setStudentEmailError(message)
      addToast(message, 'error')
    }
    setSendingStudentEmail(false)
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

  // Appearance: apply instantly (no reload, no flash) and persist to the profile
  // so the choice follows the user across devices.
  function chooseTheme(theme: Theme) {
    if (theme === profile.display_prefs.theme) return
    applyTheme(theme)
    const nextPrefs = { ...profile.display_prefs, theme }
    setProfile(p => ({ ...p, display_prefs: nextPrefs }))
    window.localStorage.setItem('display_prefs', JSON.stringify(nextPrefs))
    apiFetch('/api/settings/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayPrefs: nextPrefs }),
    }).then(({ ok }) => {
      if (!ok) addToast('Theme applied, but saving it to your account failed.', 'error')
    })
  }

  if (loading) {
    return <div className="p-8 text-sm text-[var(--text-muted)]">Loading settings...</div>
  }
  const settingsLinks: Array<[string, string, string]> = ([
    ['/settings/notifications', 'Notifications', 'Email digests and reminders'],
    ['/settings/billing', 'Billing', 'Open Stripe checkout or billing portal'],
    ['/settings/referrals', 'Referrals', 'Invite a colleague, earn export and storage bonuses'],
    ['/settings/snippets', 'Snippets', 'Reusable phrases for portfolio notes'],
    ['/settings/templates', 'Templates', 'Reusable entry shapes you can clone'],
    ['/settings/themes', 'Competency themes', 'Custom competency themes (Leadership, Teaching, etc.)'],
    ['/settings/tags', 'Specialty tags', 'Rename or merge linked-specialty tags'],
    ['/export?tab=share', 'Shared links', 'Manage read-only public share links'],
    ['/settings/audit-log', 'Audit log', 'Recent security-relevant actions on your account'],
    ['/settings/sessions', 'Sessions', 'Active devices and sign-ins'],
    ['/trash', 'Trash', 'Restore items or permanently delete them after 30 days'],
    ['/help', 'Help & glossary', 'Acronyms, concepts and keyboard shortcuts'],
  ] as Array<[string, string, string]>).filter(([, label, description]) => `${label} ${description}`.toLowerCase().includes(settingsSearch.toLowerCase()))

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage your profile, plan, data, and preferences.</p>
      </div>

      {settingsErrorMessage && (
        <div role="alert" className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-[var(--warning)]">
          {settingsErrorMessage}
        </div>
      )}

      {returnedFromCheckout && subInfo && (
        <div role="status" className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-[var(--success)]">
          {subInfo.isPro
            ? "You're now on Pro - enjoy unlimited exports, 5 GB storage, and unlimited share links."
            : 'Completing your upgrade. Pro access will appear here once payment confirmation has been processed.'}
        </div>
      )}

      <CareerStageSection
        profile={profile}
        setProfile={setProfile}
        pendingStage={pendingStage}
        setPendingStage={setPendingStage}
        isMedStudent={subInfo?.isMedStudent}
        onSave={() => saveProfile()}
      />

      <ProfileSection
        profile={profile}
        setProfile={setProfile}
        accountCreatedAt={accountCreatedAt}
        email={email}
        emailForm={emailForm}
        setEmailForm={setEmailForm}
        emailChangeLoading={emailChangeLoading}
        emailChangeSentTo={emailChangeSentTo}
        setEmailChangeSentTo={setEmailChangeSentTo}
        onEmailChange={handleEmailChange}
        savingProfile={savingProfile}
        onSubmit={e => {
          e.preventDefault()
          if (pendingStage && pendingStage !== profile.career_stage) {
            saveProfile({ ...profile, career_stage: pendingStage })
            return
          }
          saveProfile()
        }}
      />

      <AppearanceSection theme={profile.display_prefs.theme} onChooseTheme={chooseTheme} />

      <AccessibilitySection
        displayPrefs={profile.display_prefs}
        onSetDisplayPref={setDisplayPref}
        savingProfile={savingProfile}
        onSave={() => saveProfile()}
      />

      <PlanSection subInfo={subInfo} />

      <InstitutionalEmailSection
        studentEmail={studentEmail}
        setStudentEmail={setStudentEmail}
        sendingStudentEmail={sendingStudentEmail}
        onSubmit={sendStudentEmailVerification}
        studentEmailError={studentEmailError}
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <input value={settingsSearch} onChange={e => setSettingsSearch(e.target.value)} placeholder="Search settings" className="min-h-[44px] rounded-xl border border-white/[0.08] bg-[var(--bg-surface)] px-4 text-sm text-[var(--text-primary)] sm:col-span-2" />
        {settingsLinks.map(([href, label, description]) => <SettingsLink key={href} href={href} label={label} description={description} />)}
        <button onClick={restartTutorial} className="min-h-[44px] text-left bg-[var(--bg-surface)] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:border-white/[0.16]">
          Restart tutorial
        </button>
      </section>

      <section className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Legal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SettingsLink href="/terms" label="Terms and conditions" />
          <SettingsLink href="/privacy" label="Privacy policy" />
        </div>
      </section>

      {profile.referral_code && (
        <ReferralCodeSection referralCode={profile.referral_code} origin={origin} onCopy={copyReferralLink} />
      )}

      <section className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Competency themes</h2>
        <p className="mb-5 text-sm text-[var(--text-muted)]">Create or delete your custom competency themes.</p>
        <CompetencyThemePicker manageOnly />
      </section>

      <PasswordSection
        passwordForm={passwordForm}
        setPasswordForm={setPasswordForm}
        passwordLoading={passwordLoading}
        onSubmit={handlePasswordChange}
      />

      <DataExportSection exportLoading={exportLoading} onExport={handleDataExport} />

      <section className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-[var(--danger)] mb-3">Delete account</h2>
        <button onClick={() => { setDeleteConfirmText(''); setDeleteConfirmPassword(''); setDeleteConfirm(true) }} className="min-h-[44px] border border-red-500/30 text-[var(--danger)] rounded-lg px-5 py-2.5 text-sm hover:bg-red-500/10">
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
    <Link href={href} className="min-h-[44px] flex flex-col bg-[var(--bg-surface)] border border-white/[0.08] rounded-xl px-4 py-3 hover:border-white/[0.16]">
      <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
      {description && <span className="mt-0.5 text-[11px] text-[var(--text-muted)]">{description}</span>}
    </Link>
  )
}
