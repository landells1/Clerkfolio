import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LinkedInSnippets from '@/components/export/linkedin-snippets'
import type { Category } from '@/lib/types/portfolio'

type LinkedInEntry = {
  id: string
  title: string
  category: Category
  date: string
  notes: string | null
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
        .select('id, title, category, date, notes')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('date', { ascending: false })
    : { data: [] }

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/export" className="text-sm text-[rgba(245,245,242,0.45)] hover:text-[#F5F5F2]">Back</Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F5F5F2]">LinkedIn snippets</h1>
          <p className="mt-0.5 text-sm text-[rgba(245,245,242,0.45)]">One paragraph per portfolio entry.</p>
        </div>
      </div>
      <LinkedInSnippets entries={dedupeEntries((entries ?? []) as LinkedInEntry[])} />
    </div>
  )
}
