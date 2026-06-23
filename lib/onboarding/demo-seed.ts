import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

// Seeds the one-time demo starter pack (one example case + one example audit).
//
// Called exactly once from /api/onboarding/complete now, not on every dashboard
// render (F-031: the per-render count-then-insert was a hot-path cost), and is
// idempotent: the partial unique indexes portfolio_entries_one_active_demo_per_user
// / cases_one_active_demo_per_user guarantee at most one active demo row per user
// per table, so a racing/duplicate insert returns 23505 (unique_violation), which
// we treat as a successful no-op rather than a failure (F-014: the old non-atomic
// guard could seed twice). Best-effort: never throws, so a seed hiccup can't break
// onboarding completion.
export async function ensureDemoStarterPack(supabase: Supabase, userId: string, dismissedAt?: string | null) {
  if (dismissedAt) return false
  const [{ count: entryCount }, { count: caseCount }] = await Promise.all([
    supabase.from('portfolio_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('deleted_at', null),
    supabase.from('cases').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('deleted_at', null),
  ])
  if ((entryCount ?? 0) + (caseCount ?? 0) > 0) return false

  const today = new Date().toISOString().split('T')[0]
  const [caseResult, entryResult] = await Promise.all([
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
  // 23505 means a concurrent request already seeded this account; that is the
  // exactly-once outcome we want, so swallow it. Surface anything else for logs.
  for (const result of [caseResult, entryResult]) {
    if (result.error && result.error.code !== '23505') {
      console.error('demo-seed: insert failed:', result.error.message)
    }
  }
  return true
}
