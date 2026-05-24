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
}

function sentence(entry: Entry) {
  const label = CATEGORIES.find(category => category.value === entry.category)?.short ?? 'Portfolio'
  const date = new Date(entry.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const tail = {
    audit_qip: 'Delivered quality improvement evidence with measurable clinical governance value.',
    teaching: 'Created and delivered teaching with a clear learning impact.',
    conference: 'Expanded specialty knowledge and professional engagement through formal learning.',
    publication: 'Contributed scholarly work with a documented research output.',
    leadership: 'Demonstrated leadership and service contribution in a defined role.',
    prize: 'Received formal recognition for achievement and professional contribution.',
    procedure: 'Logged supervised clinical skill development with reflective learning.',
    reflection: 'Captured reflective practice linked to clinical growth and patient care.',
    custom: 'Added verified portfolio evidence with clear professional relevance.',
  }[entry.category]
  return `Achievement: ${entry.title}. ${tail} ${label}. ${date}.`
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
          <article key={entry.id} className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
            <p className="text-sm leading-relaxed text-[rgba(245,245,242,0.78)]">{text}</p>
            <button onClick={() => copy(entry.id, text)} className="mt-4 min-h-[36px] rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-[#F5F5F2]">
              {copied === entry.id ? 'Copied' : 'Copy'}
            </button>
            {fallback?.id === entry.id && (
              <textarea
                readOnly
                value={fallback.text}
                onFocus={event => event.currentTarget.select()}
                className="mt-3 w-full rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100"
                rows={3}
              />
            )}
          </article>
        )
      })}
      {entries.length === 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-8 text-sm text-[rgba(245,245,242,0.45)]">
          No portfolio entries available.
        </div>
      )}
    </div>
  )
}
