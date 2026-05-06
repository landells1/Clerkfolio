'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Draft = {
  key: string
  title: string
  href: string
  label: string
}

function draftHref(key: string, category?: string) {
  if (key === 'clerkfolio-case-draft') return '/cases/new'
  return category ? `/portfolio/new?category=${category}` : '/portfolio/new'
}

function draftLabel(key: string, category?: string) {
  if (key === 'clerkfolio-case-draft') return 'Case'
  return (category ?? key.replace(/^clerkfolio-/, '').replace(/-draft$/, '')).replace(/_/g, ' ')
}

export default function ResumeDraftsCard() {
  const [drafts, setDrafts] = useState<Draft[]>([])

  useEffect(() => {
    const matches: Draft[] = []
    for (let index = 0; index < sessionStorage.length; index++) {
      const key = sessionStorage.key(index)
      if (!key || !/^clerkfolio-.*-draft$/.test(key)) continue
      try {
        const raw = sessionStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        if (parsed._expires && Date.now() > parsed._expires) {
          sessionStorage.removeItem(key)
          continue
        }
        const category = key === 'clerkfolio-case-draft' ? 'case' : parsed.category ?? key.replace(/^clerkfolio-/, '').replace(/-draft$/, '')
        matches.push({
          key,
          title: parsed.title || 'Untitled draft',
          href: draftHref(key, category),
          label: draftLabel(key, category),
        })
      } catch {
        continue
      }
    }
    setDrafts(matches.slice(0, 3))
  }, [])

  if (drafts.length === 0) return null

  return (
    <section className="mb-6 rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
      <h2 className="text-base font-semibold text-[#F5F5F2]">Pick up where you left off</h2>
      <div className="mt-3 grid gap-2">
        {drafts.map(draft => (
          <Link key={draft.key} href={draft.href} className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-white/[0.06] px-3 py-2 hover:border-white/[0.14]">
            <span className="truncate text-sm text-[#F5F5F2]">{draft.title}</span>
            <span className="shrink-0 text-xs capitalize text-[rgba(245,245,242,0.45)]">{draft.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
