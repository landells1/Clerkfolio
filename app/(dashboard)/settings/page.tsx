'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    career_stage: '',
  })
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || '')

      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, career_stage')
        .eq('id', user.id)
        .single()

      if (data) setProfile({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        career_stage: data.career_stage || '',
      })
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
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
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
      setPasswordSaved(true)
      setPasswordForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPasswordSaved(false), 3000)
    }
    setPasswordLoading(false)
  }

  async function handleDeleteAccount() {
    // Sign out and redirect — actual deletion handled server-side in a future stage
    await supabase.auth.signOut()
    router.push('/login')
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
            <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] mb-1.5 uppercase tracking-wide">Email address</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[rgba(245,245,242,0.4)] cursor-not-allowed"
            />
            <p className="text-xs text-[rgba(245,245,242,0.3)] mt-1">Email changes coming in a future update.</p>
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
            {saved && <span className="text-sm text-[#1D9E75]">✓ Saved</span>}
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
            {passwordSaved && <span className="text-sm text-[#1D9E75]">✓ Password updated</span>}
          </div>
        </form>
      </section>

      {/* Privacy & Security */}
      <section className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-[#F5F5F2] mb-3">Privacy & security</h2>
        <div className="space-y-3 text-sm text-[rgba(245,245,242,0.55)] leading-relaxed">
          <p>Your data is stored securely on UK servers (London region) with AES-256 encryption at rest and TLS 1.3 in transit.</p>
          <p>Clinidex does not store patient-identifiable data. All case entries must be anonymised before saving.</p>
          <p>We do not share your data with third parties. <a href="#" className="text-[#1D9E75] hover:underline">See our privacy policy</a> for full details.</p>
        </div>
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeleteAccount}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
            >
              Yes, delete my account
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
