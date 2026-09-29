import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LinkedInSnippets from '@/components/export/linkedin-snippets'
import type { Category } from '@/lib/types/portfolio'

type LinkedInEntry = {
  id: string
  title: string
  category: Category
  date: string
  conf_event_name: string | null
  pub_journal: string | null
  leader_role: string | null
  leader_organisation: string | null
  prize_body: string | null
  proc_name: string | null
}

function dedupeEntries(entries: LinkedInEntry[]) {
  const seen = new Set<string>()
  return entries.filter(entry => {
    const key = `${entry.category}|${entry.date}|${entry.title.trim().toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default async function LinkedInExportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: entries } = user
    ? await supabase
        .from('portfolio_entries')
        // Structured columns only - never notes or reflection free text, which
        // can carry clinical detail that must not end up in a public post.
        // Reflections are left out entirely for the same reason.
        .select('id, title, category, date, conf_event_name, pub_journal, leader_role, leader_organisation, prize_body, proc_name')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .eq('is_demo', false)
        .neq('category', 'reflection')
        .order('date', { ascending: false })
    : { data: [] }

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/export" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Back</Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">LinkedIn snippets</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">One line per portfolio entry, built from structured fields only. Reflections and notes are never included.</p>
        </div>
      </div>
      <LinkedInSnippets entries={dedupeEntries((entries ?? []) as LinkedInEntry[])} />
    </div>
  )
}
