'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast-provider'
import { linkedInSnippet, type LinkedInEntry } from '@/lib/export/linkedin-snippet'

// Snippet wording lives in lib/export/linkedin-snippet.ts (facts from
// structured fields only - no claims, no free text).
export default function LinkedInSnippets({ entries }: { entries: LinkedInEntry[] }) {
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
        const text = linkedInSnippet(entry)
        return (
          <article key={entry.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
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
