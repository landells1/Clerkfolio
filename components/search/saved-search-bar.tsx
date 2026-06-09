'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseSearchQuery } from '@/lib/search/parser'
import { resolveFilterPersistence, stripNavParams } from '@/lib/search/filter-persistence'

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

  useEffect(() => {
    const key = `clerkfolio-filters:${pathname}`
    const decision = resolveFilterPersistence(searchParams.toString(), localStorage.getItem(key))
    if (decision.action === 'restore') {
      router.replace(`${pathname}?${decision.params}`)
    } else if (decision.action === 'persist') {
      localStorage.setItem(key, decision.params)
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const params = Object.fromEntries(searchParams.entries())
    const { data, error } = await supabase
      .from('saved_searches')
      .upsert({
        user_id: user.id,
        name: name.slice(0, 60),
        surface,
        query: { ...parseSearchQuery(q), text: q, params },
      }, { onConflict: 'user_id,name' })
      .select('id, name, query')
      .single()
    setSaving(false)
    if (!error && data) {
      setSaved(prev => [data as SavedSearch, ...prev.filter(item => item.id !== data.id)])
      setSaveName('')
      setSaveOpen(false)
    }
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
    try { localStorage.removeItem(`clerkfolio-filters:${pathname}`) } catch {}
    router.replace(pathname)
  }

  // Only surface "Clear" when a real filter (not just navigational params) is active.
  const hasActiveFilters = stripNavParams(searchParams.toString()).length > 0

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {hasActiveFilters && (
        <span className="inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 text-xs font-medium text-amber-200">
          Filtered
          <button
            type="button"
            onClick={clearFilters}
            className="rounded text-amber-100 underline underline-offset-2 hover:text-white"
          >
            Clear
          </button>
        </span>
      )}
      <button
        type="button"
        onClick={() => setSaveOpen(current => !current)}
        disabled={saving}
        className="min-h-[36px] rounded-lg border border-white/[0.08] bg-[#141416] px-3 text-xs font-medium text-[rgba(245,245,242,0.65)] hover:border-white/[0.16] hover:text-[#F5F5F2] disabled:opacity-50"
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
            className="min-h-[36px] rounded-lg border border-white/[0.08] bg-[#141416] px-3 text-xs text-[#F5F5F2] outline-none placeholder:text-[rgba(245,245,242,0.35)] focus:border-[#1B6FD9]"
            autoFocus
          />
          <button
            type="submit"
            disabled={saving || !saveName.trim()}
            className="min-h-[36px] rounded-lg bg-[#1B6FD9] px-3 text-xs font-semibold text-[#0B0B0C] disabled:opacity-50"
          >
            Save
          </button>
        </form>
      )}
      {saved.length > 0 && (
        <select
          defaultValue=""
          onChange={event => applySaved(event.target.value)}
          className="min-h-[36px] rounded-lg border border-white/[0.08] bg-[#141416] px-3 text-xs text-[#F5F5F2]"
          aria-label="Saved searches"
        >
          <option value="" disabled>Saved searches</option>
          {saved.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      )}
    </div>
  )
}
