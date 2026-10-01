'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseSearchQuery } from '@/lib/search/parser'
import { hasActiveFilters as queryHasActiveFilters, legacyFilterStorageKey } from '@/lib/search/filter-persistence'
import { storageRemove } from '@/lib/safe-storage'
import ConfirmDialog from '@/components/ui/confirm-dialog'

type Surface = 'cases' | 'portfolio' | 'timeline' | 'logs'

type SavedSearch = {
  id: string
  name: string
  query: {
    text?: string
    params?: Record<string, string>
  }
}

// `showFilteredChip`: pages that render their own FilterBanner (portfolio,
// cases) turn the small "Filtered / Clear" chip off so the state shows once.
export default function SavedSearchBar({ surface, q, showFilteredChip = true }: { surface: Surface; q: string; showFilteredChip?: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [saved, setSaved] = useState<SavedSearch[]>([])
  const [saving, setSaving] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Filters are never restored from a previous visit (see
  // lib/search/filter-persistence.ts); clear what older versions stored.
  useEffect(() => {
    storageRemove(legacyFilterStorageKey(pathname))
  }, [pathname])

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
    // Overwrite only a same-named search on THIS page; names are unique per
    // (user, surface, name). The old upsert keyed on (user, name) alone, so
    // saving "Leadership" on Cases silently moved and replaced the Portfolio
    // search of the same name.
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
      // 23505 now only means the same name was saved on this page from another
      // tab since the list loaded.
      setSaveError(error?.code === '23505'
        ? 'A saved search with that name already exists on this page. Refresh and try again.'
        : 'Could not save this search. Please try again.')
      return
    }
    setSaved(prev => [data as SavedSearch, ...prev.filter(item => item.id !== data.id)])
    setSaveName('')
    setSaveOpen(false)
  }

  const [pendingRemove, setPendingRemove] = useState<SavedSearch | null>(null)

  async function removeSaved(id: string) {
    setPendingRemove(null)
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

  // The bare path is always the unfiltered view (QOL-016).
  function clearFilters() {
    router.replace(pathname)
  }

  // Only surface "Clear" when a real filter (not just navigational params) is active.
  const hasActiveFilters = showFilteredChip && queryHasActiveFilters(searchParams.toString())

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
        className="min-h-[36px] rounded-lg border border-white/[0.08] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
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
            if (value.startsWith('remove:')) setPendingRemove(saved.find(row => row.id === value.slice('remove:'.length)) ?? null)
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
      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove this saved search?"
        confirmLabel="Remove"
        busyLabel="Removing..."
        tone="danger"
        onConfirm={() => pendingRemove ? removeSaved(pendingRemove.id) : undefined}
        onCancel={() => setPendingRemove(null)}
      >
        <p>&quot;{pendingRemove?.name}&quot; will be removed from your saved searches.</p>
      </ConfirmDialog>
    </div>
  )
}
