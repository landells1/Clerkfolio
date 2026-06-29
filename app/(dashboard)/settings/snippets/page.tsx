'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast-provider'

type Snippet = {
  id: string
  shortcut: string
  body: string
}

export default function SnippetsPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [shortcut, setShortcut] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('snippets')
      .select('id, shortcut, body')
      .order('shortcut', { ascending: true })
    setSnippets((data ?? []) as Snippet[])
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!shortcut.trim() || !body.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('snippets').upsert({
      user_id: user.id,
      shortcut: shortcut.trim().replace(/^\//, ''),
      body: body.trim(),
    }, { onConflict: 'user_id,shortcut' })
    setSaving(false)
    if (error) {
      addToast('Failed to save snippet', 'error')
      return
    }
    setShortcut('')
    setBody('')
    addToast('Snippet saved', 'success')
    load()
  }

  async function remove(id: string) {
    const { error } = await supabase.from('snippets').delete().eq('id', id)
    if (error) {
      addToast('Failed to delete snippet', 'error')
      return
    }
    setSnippets(current => current.filter(snippet => snippet.id !== id))
  }

  return (
    <div className="max-w-2xl p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/settings" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Back to settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Snippets</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Reusable phrases for portfolio and case notes. In fields with the snippets menu, type a slash followed by the shortcut
            name (e.g. <span className="font-mono">/reflection</span>) to insert the body.
          </p>
        </div>
      </div>

      <form onSubmit={save} className="mb-6 rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
        <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
          <input value={shortcut} onChange={e => setShortcut(e.target.value)} placeholder="/reflection" className="min-h-[44px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]" />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Key learning: " rows={4} className="min-h-[96px] rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm text-[var(--text-primary)]" />
        </div>
        <button disabled={saving} className="mt-3 min-h-[44px] rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Saving...' : 'Save snippet'}
        </button>
      </form>

      <section className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)]">
        {snippets.length === 0 ? (
          <div className="p-5 space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">No snippets yet</p>
            <p className="text-xs text-[var(--text-secondary)]">A few examples to inspire your first one:</p>
            <div className="rounded-lg border border-white/[0.06] bg-[var(--bg-canvas)] p-3 text-xs">
              <p><span className="font-mono text-[var(--accent-text)]">/audit</span><span className="text-[var(--text-muted)]"> -&gt; </span>I led an audit on … against … standard. Round 1 found …; we implemented …; Round 2 showed …</p>
              <p className="mt-2"><span className="font-mono text-[var(--accent-text)]">/cbd</span><span className="text-[var(--text-muted)]"> -&gt; </span>Description: … Reflection: … Action: …</p>
              <p className="mt-2"><span className="font-mono text-[var(--accent-text)]">/teaching</span><span className="text-[var(--text-muted)]"> -&gt; </span>Designed and delivered a 30-minute teaching session on … to …. Feedback: …</p>
            </div>
          </div>
        ) : snippets.map(snippet => (
          <div key={snippet.id} className="flex items-start justify-between gap-4 p-4">
            <div>
              <p className="font-mono text-sm text-[var(--text-primary)]">/{snippet.shortcut}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{snippet.body}</p>
            </div>
            <button onClick={() => remove(snippet.id)} className="text-sm text-red-300 hover:text-red-200">Delete</button>
          </div>
        ))}
      </section>
    </div>
  )
}
