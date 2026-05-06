'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'

export default function TagsSettingsPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [oldTag, setOldTag] = useState('')
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)

  async function renameTag(e: React.FormEvent) {
    e.preventDefault()
    if (!oldTag.trim() || !newTag.trim()) return
    setSaving(true)
    const { error } = await supabase.rpc('rename_user_tag', {
      p_old: oldTag.trim(),
      p_new: newTag.trim(),
      p_field: 'specialty_tags',
    })
    setSaving(false)
    if (error) {
      addToast('Could not rename tag', 'error')
      return
    }
    setOldTag('')
    setNewTag('')
    addToast('Tag renamed across cases and portfolio entries', 'success')
  }

  return (
    <div className="max-w-3xl p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2]">Settings</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#F5F5F2]">Specialty tags</h1>
        <p className="mt-1 text-sm text-[rgba(245,245,242,0.45)]">Rename a specialty tag everywhere it appears in your cases and portfolio.</p>
      </div>
      <form onSubmit={renameTag} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <input required value={oldTag} onChange={event => setOldTag(event.target.value)} placeholder="Current tag" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" />
          <input required value={newTag} onChange={event => setNewTag(event.target.value)} placeholder="New tag" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2]" />
        </div>
        <button disabled={saving} className="mt-4 min-h-[44px] rounded-lg bg-[#1B6FD9] px-4 text-sm font-semibold text-[#0B0B0C] disabled:opacity-50">
          {saving ? 'Renaming...' : 'Rename tag'}
        </button>
      </form>
    </div>
  )
}
