'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, CATEGORY_COLOURS } from '@/lib/types/portfolio'
import type { Template } from '@/lib/types/templates'
import { useToast } from '@/components/ui/toast-provider'

export default function TemplatesSettingsPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_curated', false)
        .order('created_at', { ascending: false })
      setTemplates((data ?? []) as Template[])
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleRename(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    const res = await fetch('/api/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editName.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      setTemplates(ts => ts.map(t => t.id === id ? { ...t, name: editName.trim() } : t))
      setEditingId(null)
      addToast('Template renamed', 'success')
    } else {
      addToast('Failed to rename template', 'error')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template? This cannot be undone.')) return
    const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTemplates(ts => ts.filter(t => t.id !== id))
      addToast('Template deleted', 'success')
    } else {
      addToast('Failed to delete template', 'error')
    }
  }

  // Group by category
  const grouped = CATEGORIES.reduce<Record<string, Template[]>>((acc, cat) => {
    acc[cat.value] = templates.filter(t => t.category === cat.value)
    return acc
  }, {})

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/settings" className="text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F5F2] tracking-tight">My templates</h1>
          <p className="text-sm text-[rgba(245,245,242,0.45)] mt-0.5">
            Templates you&apos;ve saved from entries. To create a template, open any entry and click &quot;Template&quot;.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-[#1B6FD9] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <p className="text-sm text-[rgba(245,245,242,0.5)] mb-1">No personal templates yet</p>
          <p className="text-xs text-[rgba(245,245,242,0.3)] mb-6 max-w-xs">
            Open any portfolio entry and click the &quot;Template&quot; button in the actions row to save it as a personal template.
          </p>
          <Link href="/portfolio" className="flex items-center gap-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors">
            Go to Portfolio
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map(cat => {
            const ts = grouped[cat.value]
            if (!ts || ts.length === 0) return null
            const colours = CATEGORY_COLOURS[cat.value]
            return (
              <div key={cat.value}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${colours.badge}`}>{cat.short}</span>
                  <h2 className="text-sm font-medium text-[rgba(245,245,242,0.55)]">{cat.label}</h2>
                </div>
                <div className="space-y-2">
                  {ts.map(t => (
                    <div key={t.id} className="flex items-center gap-3 bg-[#141416] border border-white/[0.06] rounded-xl px-4 py-3">
                      {editingId === t.id ? (
                        <>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(t.id); if (e.key === 'Escape') setEditingId(null) }}
                            className="flex-1 bg-[#0B0B0C] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-[#F5F5F2] focus:outline-none focus:border-[#1B6FD9] transition-colors"
                          />
                          <button
                            onClick={() => handleRename(t.id)}
                            disabled={saving}
                            className="text-xs text-[#1B6FD9] hover:text-[#3884DD] transition-colors font-medium disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-[#F5F5F2] truncate">{t.name}</span>
                          <button
                            onClick={() => { setEditingId(t.id); setEditName(t.name) }}
                            className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-xs text-[rgba(245,245,242,0.3)] hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
