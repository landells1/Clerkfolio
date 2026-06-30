'use client'

import { useState } from 'react'
import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import { useToast } from '@/components/ui/toast-provider'

type Entry = {
  id: string
  title: string
  category: Category
  date: string
  notes: string | null
  refl_free_text: string | null
}

// Generic per-category line, used only as a fallback when an entry has no
// notes / reflection text of its own to draw from.
const CATEGORY_FALLBACK: Record<Category, string> = {
  audit_qip: 'Delivered quality improvement evidence with measurable clinical governance value.',
  teaching: 'Created and delivered teaching with a clear learning impact.',
  conference: 'Expanded specialty knowledge and professional engagement through formal learning.',
  publication: 'Contributed scholarly work with a documented research output.',
  leadership: 'Demonstrated leadership and service contribution in a defined role.',
  prize: 'Received formal recognition for achievement and professional contribution.',
  procedure: 'Logged supervised clinical skill development with reflective learning.',
  reflection: 'Captured reflective practice linked to clinical growth and patient care.',
  custom: 'Added verified portfolio evidence with clear professional relevance.',
}

// Pull the first sentence from the entry's own reflection or notes so two
// same-category entries don't stack identical boilerplate. Capped so the
// snippet stays postable. (F-045)
function highlightFrom(...sources: (string | null | undefined)[]): string | null {
  for (const source of sources) {
    const cleaned = (source ?? '').replace(/\s+/g, ' ').trim()
    if (!cleaned) continue
    const breakAt = cleaned.search(/[.!?](\s|$)/)
    let highlight = breakAt >= 0 ? cleaned.slice(0, breakAt + 1) : cleaned
    if (highlight.length > 200) highlight = `${highlight.slice(0, 197).trimEnd()}…`
    if (!/[.!?…]$/.test(highlight)) highlight += '.'
    return highlight
  }
  return null
}

function sentence(entry: Entry) {
  const label = CATEGORIES.find(category => category.value === entry.category)?.short ?? 'Portfolio'
  const date = new Date(entry.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const body = highlightFrom(entry.refl_free_text, entry.notes) ?? CATEGORY_FALLBACK[entry.category]
  return `Achievement: ${entry.title}. ${body} ${label}. ${date}.`
}

export default function LinkedInSnippets({ entries }: { entries: Entry[] }) {
  const { addToast } = useToast()
  const [copied, setCopied] = useState<string | null>(null)
  const [fallback, setFallback] = useState<{ id: string; text: string } | null>(null)

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setFallback(null)
      addToast('Snippet copied', 'success')
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setFallback({ id, text })
      addToast('Clipboard unavailable. Select the snippet text below.', 'error')
    }
  }

  return (
    <div className="space-y-3">
      {entries.map(entry => {
        const text = sentence(entry)
        return (
          <article key={entry.id} className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5">
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{text}</p>
            <button onClick={() => copy(entry.id, text)} className="mt-4 min-h-[36px] rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-[var(--text-primary)]">
              {copied === entry.id ? 'Copied' : 'Copy'}
            </button>
            {fallback?.id === entry.id && (
              <textarea
                readOnly
                value={fallback.text}
                onFocus={event => event.currentTarget.select()}
                className="mt-3 w-full rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-[var(--warning)]"
                rows={3}
              />
            )}
          </article>
        )
      })}
      {entries.length === 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-8 text-sm text-[var(--text-muted)]">
          No portfolio entries available.
        </div>
      )}
    </div>
  )
}
