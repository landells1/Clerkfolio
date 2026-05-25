import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'

function escapeHeading(value: string | null | undefined) {
  return (value ?? 'Untitled reflection').replace(/\r?\n/g, ' ').trim()
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('portfolio_entries')
    .select('title, date, notes, refl_free_text')
    .eq('user_id', user.id)
    .eq('category', 'reflection')
    .is('deleted_at', null)
    .order('date', { ascending: true })

  if (error) {
    Sentry.captureException(error, { tags: { route: '/api/export/markdown' } })
    return NextResponse.json({ error: 'Could not export reflections. Please try again.' }, { status: 500 })
  }

  const markdown = (data ?? []).map(entry => [
    `# ${entry.date} ${escapeHeading(entry.title)}`,
    entry.refl_free_text,
    entry.notes,
  ].filter(Boolean).join('\n\n')).join('\n\n---\n\n')

  return new NextResponse(markdown || '# Clerkfolio reflections\n\nNo reflections exported.\n', {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="clerkfolio-reflections-${new Date().toISOString().split('T')[0]}.md"`,
    },
  })
}
