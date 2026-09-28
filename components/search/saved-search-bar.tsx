'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseSearchQuery } from '@/lib/search/parser'
import { resolveFilterPersistence, stripNavParams } from '@/lib/search/filter-persistence'
import { storageGet, storageSet, storageRemove } from '@/lib/safe-storage'

type Surface = 'cases' | 'portfolio' | 'timeline' | 'logs'

type SavedSearch = {
  id: string
  name: string
  query: {
    text?: string
    params?: Record<string, string>
  }
}

export default function SavedSearchBar({ surface, q }: { surface: Surface; q: string }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [saved, setSaved] = useState<SavedSearch[]>([])
  const [saving, setSaving] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const key = `clerkfolio-filters:${pathname}`
    const decision = resolveFilterPersistence(searchParams.toString(), storageGet(key))
    if (decision.action === 'restore') {
      router.replace(`${pathname}?${decision.params}`)
    } else if (decision.action === 'persist') {
      storageSet(key, decision.params)
    }
  }, [pathname, router, searchParams])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('saved_searches')
        .select('id, name, query')
        .eq('surface', surface)
        .order('created_at', { ascending: false })
      setSaved((data ?? []) as SavedSearch[])
    }
    load()
  }, [supabase, surface])

  async function saveCurrent(e?: React.FormEvent) {
    e?.preventDefault()
    const name = saveName.trim()
    if (!name) return
    setSaving(true)
    setSaveError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setSaveError('Please sign in again.'); return }
    const params = Object.fromEntries(searchParams.entries())
    const trimmedName = name.slice(0, 60)
    const query = { ...parseSearchQuery(q), text: q, params }
    // Overwrite only a same-named search on THIS page. The old upsert keyed on
    // (user, name) alone, so saving "Leadership" on Cases silently moved and
    // replaced the Portfolio search of the same name.
    const existing = saved.find(item => item.name === trimmedName)
    const { data, error } = existing
      ? await supabase
          .from('saved_searches')
          .update({ query })
          .eq('id', existing.id)
          .select('id, name, query')
          .single()
      : await supabase
          .from('saved_searches')
          .insert({ user_id: user.id, name: trimmedName, surface, query })
          .select('id, name, query')
          .single()
    setSaving(false)
    if (error || !data) {
      setSaveError(error?.code === '23505'
        ? 'You already use that name for a saved search on another page. Pick a different name.'
        : 'Could not save this search. Please try again.')
      return
    }
    setSaved(prev => [data as SavedSearch, ...prev.filter(item => item.id !== data.id)])
    setSaveName('')
    setSaveOpen(false)
  }

  async function removeSaved(id: string) {
    const item = saved.find(row => row.id === id)
    if (!item || !window.confirm(`Remove the saved search "${item.name}"?`)) return
    const { error } = await supabase.from('saved_searches').delete().eq('id', id)
    if (error) { setSaveError('Could not remove that saved search. Please try again.'); return }
    setSaved(prev => prev.filter(row => row.id !== id))
  }

  function applySaved(id: string) {
    const item = saved.find(row => row.id === id)
    if (!item) return
    const params = new URLSearchParams(item.query.params ?? {})
    if (!params.get('q') && item.query.text) params.set('q', item.query.text)
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  // A bare URL re-applies the last remembered filters (resolveFilterPersistence),
  // so simply linking to `pathname` would be undone by the restore effect above.
  // Clearing therefore drops the persisted entry first, then navigates bare, so
  // the surface defaults to the full unfiltered view (QOL-016).
  function clearFilters() {
    try { storageRemove(`clerkfolio-filters:${pathname}`) } catch {}
    router.replace(pathname)
  }

  // Only surface "Clear" when a real filter (not just navigational params) is active.
  const hasActiveFilters = stripNavParams(searchParams.toString()).length > 0

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {hasActiveFilters && (
        <span className="inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 text-xs font-medium text-[var(--warning)]">
          Filtered
          <button
            type="button"
            onClick={clearFilters}
            className="rounded text-[var(--warning)] underline underline-offset-2 hover:text-[var(--text-primary)]"
          >
            Clear
          </button>
        </span>
      )}
      <button
        type="button"
        onClick={() => setSaveOpen(current => !current)}
        disabled={saving}
        className="min-h-[36px] rounded-lg border border-white/[0.08] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-white/[0.16] hover:text-[var(--text-primary)] disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save search'}
      </button>
      {saveOpen && (
        <form onSubmit={saveCurrent} className="flex flex-wrap items-center gap-2">
          <input
            value={saveName}
            onChange={event => setSaveName(event.target.value)}
            maxLength={60}
            placeholder="Search name"
            aria-label="Search name"
            className="min-h-[36px] rounded-lg border border-white/[0.08] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            autoFocus
          />
          <button
            type="submit"
            disabled={saving || !saveName.trim()}
            className="min-h-[36px] rounded-lg bg-[var(--button-primary-bg)] px-3 text-xs font-semibold text-[var(--button-primary-text)] disabled:opacity-50"
          >
            Save
          </button>
        </form>
      )}
      {saveError && <span role="alert" className="text-xs text-[var(--danger)]">{saveError}</span>}
      {saved.length > 0 && (
        <select
          value=""
          onChange={event => {
            const value = event.target.value
            if (value.startsWith('remove:')) void removeSaved(value.slice('remove:'.length))
            else applySaved(value)
          }}
          className="min-h-[36px] rounded-lg border border-white/[0.08] bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-primary)]"
          aria-label="Saved searches"
        >
          <option value="" disabled>Saved searches</option>
          {saved.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          <optgroup label="Remove a saved search">
            {saved.map(item => <option key={`remove-${item.id}`} value={`remove:${item.id}`}>Remove &quot;{item.name}&quot;</option>)}
          </optgroup>
        </select>
      )}
    </div>
  )
}
