import type { createClient } from '@/lib/supabase/server'

type Supabase = ReturnType<typeof createClient>

export async function ensureDemoStarterPack(supabase: Supabase, userId: string, dismissedAt?: string | null) {
  if (dismissedAt) return false
  const [{ count: entryCount }, { count: caseCount }] = await Promise.all([
    supabase.from('portfolio_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('deleted_at', null),
    supabase.from('cases').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('deleted_at', null),
  ])
  if ((entryCount ?? 0) + (caseCount ?? 0) > 0) return false

  const today = new Date().toISOString().split('T')[0]
  await Promise.all([
    supabase.from('cases').insert({
      user_id: userId,
      title: 'Demo case - edit me',
      date: today,
      clinical_domain: 'General Medicine',
      clinical_domains: ['General Medicine'],
      specialty_tags: [],
      notes: 'Demo case. Replace this with an anonymised case summary.',
      is_demo: true,
    }),
    supabase.from('portfolio_entries').insert({
      user_id: userId,
      category: 'audit_qip',
      title: 'Demo audit - edit me',
      date: today,
      specialty_tags: [],
      notes: 'Demo portfolio entry. Replace this with your own audit or QIP work.',
      audit_type: 'audit',
      audit_role: 'Observer',
      audit_cycle_stage: '1st_cycle',
      audit_outcome: 'Demo outcome for orientation.',
      is_demo: true,
    }),
  ])
  return true
}
