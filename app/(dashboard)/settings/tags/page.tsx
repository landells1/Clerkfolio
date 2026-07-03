'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { apiFetch } from '@/lib/api-fetch'

export default function TagsSettingsPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [oldTag, setOldTag] = useState('')
  const [newTag, setNewTag] = useState('')
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadTags() {
      const [{ data: portfolioRows }, { data: caseRows }, { data: apps }] = await Promise.all([
        supabase.from('portfolio_entries').select('specialty_tags').is('deleted_at', null),
        supabase.from('cases').select('specialty_tags').is('deleted_at', null),
        supabase.from('specialty_applications').select('specialty_key').eq('is_active', true),
      ])
      const tags = new Set<string>()
      portfolioRows?.forEach(row => row.specialty_tags?.forEach((tag: string) => tags.add(tag)))
      caseRows?.forEach(row => row.specialty_tags?.forEach((tag: string) => tags.add(tag)))
      apps?.forEach(row => row.specialty_key && tags.add(row.specialty_key))
      setAvailableTags(Array.from(tags).sort((a, b) => formatSpecialtyLabel(a).localeCompare(formatSpecialtyLabel(b))))
      setLoaded(true)
    }
    loadTags()
  }, [supabase])

  async function renameTag(e: React.FormEvent) {
    e.preventDefault()
    if (!oldTag.trim() || !newTag.trim()) return
    setSaving(true)
    const res = await apiFetch('/api/settings/rename-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_old: oldTag.trim(), p_new: newTag.trim(), p_field: 'specialty_tags' }),
    })
    setSaving(false)
    if (!res.ok) {
      addToast('Could not rename tag', 'error')
      return
    }
    setOldTag('')
    setNewTag('')
    addToast('Tag merged across cases and portfolio entries', 'success')
  }

  const canMerge = availableTags.length >= 2

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Settings</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Merge specialty tags</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Merge one specialty tag into another across your cases and portfolio entries. Specialty labels are fixed catalogue names, so this reassigns entries from one tag to another — it is not a free-text rename.</p>
      </div>
      {loaded && !canMerge ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
          <p>You need at least two specialty tags before you can merge. You currently have {availableTags.length === 1 ? 'one specialty tag' : 'no specialty tags'} across your cases and portfolio entries, so there is nothing to merge into.</p>
          <p className="mt-3">A second tag appears once you tag entries with another specialty or track an additional specialty. Tracking more than one specialty at a time requires Pro.</p>
        </div>
      ) : (
        <form onSubmit={renameTag} className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-6">
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            Choose the specialty tag you want to merge, and the tag to merge it into. Clerkfolio keeps the internal key hidden.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
              Merge this tag
              <select required value={oldTag} onChange={event => setOldTag(event.target.value)} className="mt-1.5 min-h-[44px] w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]">
                <option value="">Select current tag</option>
                {availableTags.map(tag => <option key={tag} value={tag}>{formatSpecialtyLabel(tag)}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-emphasis)]">
              Into this tag
              <select required value={newTag} onChange={event => setNewTag(event.target.value)} className="mt-1.5 min-h-[44px] w-full rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]">
                <option value="">Select destination tag</option>
                {availableTags.map(tag => <option key={tag} value={tag}>{formatSpecialtyLabel(tag)}</option>)}
              </select>
            </label>
          </div>
          <button disabled={saving} className="mt-4 min-h-[44px] rounded-lg bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] disabled:opacity-50">
            {saving ? 'Merging...' : 'Merge tags'}
          </button>
        </form>
      )}
    </div>
  )
}
