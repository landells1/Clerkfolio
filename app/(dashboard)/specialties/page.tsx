'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PREDEFINED_SPECIALTIES, MAX_SPECIALTIES } from '@/lib/constants/specialties'

export default function SpecialtiesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [interests, setInterests] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('specialty_interests').eq('id', user.id).single()
      if (data?.specialty_interests) setInterests(data.specialty_interests)
      setLoading(false)
    }
    load()
  }, [supabase])

  function toggle(s: string) {
    if (interests.includes(s)) {
      setInterests(prev => prev.filter(i => i !== s))
    } else if (interests.length < MAX_SPECIALTIES) {
      setInterests(prev => [...prev, s])
    }
  }

  function addCustom() {
    const trimmed = custom.trim()
    if (!trimmed || interests.includes(trimmed) || interests.length >= MAX_SPECIALTIES) return
    setInterests(prev => [...prev, trimmed])
    setCustom('')
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ specialty_interests: interests }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">Specialty interests</h1>
        <p className="text-sm text-[rgba(245,245,242,0.45)] mt-1">
          Select up to {MAX_SPECIALTIES} specialties. These appear first when tagging entries and personalise your dashboard.
        </p>
      </div>

      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 space-y-6">
        {/* Selected count */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[rgba(245,245,242,0.4)]">
            {interests.length} / {MAX_SPECIALTIES} selected
          </span>
          {interests.length >= MAX_SPECIALTIES && (
            <span className="text-xs text-amber-400">Cap reached</span>
          )}
        </div>

        {/* Predefined chips */}
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_SPECIALTIES.map(s => {
            const selected = interests.includes(s)
            return (
              <button
                key={s}
                onClick={() => toggle(s)}
                disabled={!selected && interests.length >= MAX_SPECIALTIES}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selected
                    ? 'bg-[#1D9E75]/20 text-[#1D9E75] border border-[#1D9E75]/40'
                    : 'bg-white/[0.04] text-[rgba(245,245,242,0.5)] border border-white/[0.06] hover:text-[#F5F5F2] hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>

        {/* Custom input */}
        <div>
          <p className="text-xs text-[rgba(245,245,242,0.4)] mb-2 font-medium uppercase tracking-wide">Add custom specialty</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
              placeholder="e.g. Interventional Radiology"
              className="flex-1 bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3.5 py-2 text-sm text-[#F5F5F2] placeholder-[rgba(245,245,242,0.25)] focus:outline-none focus:border-[#1D9E75] transition-colors"
            />
            <button
              onClick={addCustom}
              disabled={!custom.trim() || interests.length >= MAX_SPECIALTIES}
              className="px-4 py-2 bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-40 text-[#0B0B0C] text-sm font-semibold rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Selected list (custom ones not in predefined list) */}
        {interests.filter(i => !(PREDEFINED_SPECIALTIES as readonly string[]).includes(i)).length > 0 && (
          <div>
            <p className="text-xs text-[rgba(245,245,242,0.4)] mb-2 font-medium uppercase tracking-wide">Custom</p>
            <div className="flex flex-wrap gap-2">
              {interests.filter(i => !(PREDEFINED_SPECIALTIES as readonly string[]).includes(i)).map(s => (
                <button
                  key={s}
                  onClick={() => toggle(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1D9E75]/20 text-[#1D9E75] border border-[#1D9E75]/40 transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                >
                  {s}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
          <span className={`text-xs transition-opacity ${saved ? 'text-[#1D9E75] opacity-100' : 'opacity-0'}`}>
            ✓ Saved
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#1D9E75] hover:bg-[#178060] disabled:opacity-50 text-[#0B0B0C] font-semibold rounded-xl text-sm transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
