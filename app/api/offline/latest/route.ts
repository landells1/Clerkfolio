import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type OfflineItem = {
  id: string
  type: 'portfolio' | 'case'
  title: string
  date: string
  updated_at: string
  category?: string | null
  clinical_domain?: string | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ items: [] }, { status: 401 })

  const [{ data: entries }, { data: cases }] = await Promise.all([
    supabase
      .from('portfolio_entries')
      .select('id, title, date, updated_at, category')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(50),
    supabase
      .from('cases')
      .select('id, title, date, updated_at, clinical_domain')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(50),
  ])

  const items: OfflineItem[] = [
    ...(entries ?? []).map(entry => ({
      id: entry.id,
      type: 'portfolio' as const,
      title: entry.title,
      date: entry.date,
      updated_at: entry.updated_at,
      category: entry.category,
    })),
    ...(cases ?? []).map(c => ({
      id: c.id,
      type: 'case' as const,
      title: c.title,
      date: c.date,
      updated_at: c.updated_at,
      clinical_domain: c.clinical_domain,
    })),
  ].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 50)

  return NextResponse.json({ generated_at: new Date().toISOString(), items })
}
