// Aggregate-only product metrics for the weekly OWNER analytics email
// (app/api/cron/owner-metrics). This is NOT user-facing. Every field here must
// be a count or distribution - never a user email, name, or free-text value.
//
// Split into two halves on purpose:
//   - fetchOwnerMetrics(): the Supabase queries (thin, hard to unit test without
//     a full fake client).
//   - buildOwnerMetricsEmail(): pure formatting from an already-fetched
//     OwnerMetricsSnapshot, so the mapping logic is covered by fast unit tests
//     without touching Supabase at all (matches lib/engagement/digest.ts).
import type { SupabaseClient } from '@supabase/supabase-js'

export type OwnerMetricsSnapshot = {
  windowLabel: string
  totalUsers: number
  newSignups: number
  activeUsers: number
  portfolioEntriesCreated: number
  casesCreated: number
  onboardingCompleted: number
  onboardingIncomplete: number
  checklistCompletionBuckets: { none: number; some: number; all: number }
  specialtyPopularity: Array<{ specialtyKey: string; count: number }>
  shareLinksCreated: number
  exportsUsed: number
  referralsCreated: number
}

const CHECKLIST_TOTAL_ITEMS_ASSUMED_MAX = 1 // see note in buildChecklistBuckets

// Buckets users by how many onboarding checklist items they have ticked.
// The checklist item set is user-defined free text keys (capped at 20, see
// app/api/onboarding/checklist/route.ts) rather than a fixed enumerable list,
// so "all" here means "ticked at least one" vs "none" - a coarse but cheap
// and PII-free signal of checklist engagement, not literal 100% completion.
export function buildChecklistBuckets(completedItemCounts: number[]): OwnerMetricsSnapshot['checklistCompletionBuckets'] {
  let none = 0
  let some = 0
  let all = 0
  for (const count of completedItemCounts) {
    if (count <= 0) none++
    else if (count >= CHECKLIST_TOTAL_ITEMS_ASSUMED_MAX) all++
    else some++
  }
  return { none, some, all }
}

export function buildOwnerMetricsEmail(snapshot: OwnerMetricsSnapshot): { subject: string; text: string; html: string } {
  const subject = `Clerkfolio owner metrics: ${snapshot.windowLabel}`

  const specialtyLines = snapshot.specialtyPopularity.length > 0
    ? snapshot.specialtyPopularity.map(row => `  - ${row.specialtyKey}: ${row.count}`).join('\n')
    : '  (no active specialty tracking this week)'

  const text = [
    `Clerkfolio owner metrics - ${snapshot.windowLabel}`,
    '',
    'Users',
    `  Total users: ${snapshot.totalUsers}`,
    `  New signups this week: ${snapshot.newSignups}`,
    `  Active users this week: ${snapshot.activeUsers}`,
    '',
    'Activity',
    `  Portfolio entries created: ${snapshot.portfolioEntriesCreated}`,
    `  Cases created: ${snapshot.casesCreated}`,
    `  Share links created: ${snapshot.shareLinksCreated}`,
    `  Exports used: ${snapshot.exportsUsed}`,
    `  Referrals created: ${snapshot.referralsCreated}`,
    '',
    'Onboarding funnel',
    `  Completed onboarding: ${snapshot.onboardingCompleted}`,
    `  Not yet completed: ${snapshot.onboardingIncomplete}`,
    `  Checklist: none=${snapshot.checklistCompletionBuckets.none}, some=${snapshot.checklistCompletionBuckets.some}, all=${snapshot.checklistCompletionBuckets.all}`,
    '',
    'Specialty popularity (active tracking)',
    specialtyLines,
  ].join('\n')

  const specialtyRowsHtml = snapshot.specialtyPopularity.length > 0
    ? snapshot.specialtyPopularity.map(row => `<tr><td style="padding:4px 8px;color:#555;">${escapeHtml(row.specialtyKey)}</td><td style="padding:4px 8px;text-align:right;font-weight:600;">${row.count}</td></tr>`).join('')
    : '<tr><td style="padding:4px 8px;color:#777;" colspan="2">No active specialty tracking this week</td></tr>'

  const html = `<!doctype html>
  <html>
    <body style="margin:0;background:#f6f6f3;font-family:Inter,Arial,sans-serif;color:#111113;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f3;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e7e3;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="padding:22px 24px;border-bottom:1px solid #e7e7e3;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#155BB0;">Clerkfolio (owner-only)</p>
                  <h1 style="margin:0;font-size:20px;line-height:1.25;color:#111113;">Owner metrics: ${escapeHtml(snapshot.windowLabel)}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 24px;">
                  <h2 style="margin:0 0 8px;font-size:14px;color:#111113;">Users</h2>
                  <p style="margin:0 0 4px;font-size:14px;color:#555;">Total users: <strong style="color:#111113;">${snapshot.totalUsers}</strong></p>
                  <p style="margin:0 0 4px;font-size:14px;color:#555;">New signups this week: <strong style="color:#111113;">${snapshot.newSignups}</strong></p>
                  <p style="margin:0 0 14px;font-size:14px;color:#555;">Active users this week: <strong style="color:#111113;">${snapshot.activeUsers}</strong></p>

                  <h2 style="margin:0 0 8px;font-size:14px;color:#111113;">Activity</h2>
                  <p style="margin:0 0 4px;font-size:14px;color:#555;">Portfolio entries created: <strong style="color:#111113;">${snapshot.portfolioEntriesCreated}</strong></p>
                  <p style="margin:0 0 4px;font-size:14px;color:#555;">Cases created: <strong style="color:#111113;">${snapshot.casesCreated}</strong></p>
                  <p style="margin:0 0 4px;font-size:14px;color:#555;">Share links created: <strong style="color:#111113;">${snapshot.shareLinksCreated}</strong></p>
                  <p style="margin:0 0 4px;font-size:14px;color:#555;">Exports used: <strong style="color:#111113;">${snapshot.exportsUsed}</strong></p>
                  <p style="margin:0 0 14px;font-size:14px;color:#555;">Referrals created: <strong style="color:#111113;">${snapshot.referralsCreated}</strong></p>

                  <h2 style="margin:0 0 8px;font-size:14px;color:#111113;">Onboarding funnel</h2>
                  <p style="margin:0 0 4px;font-size:14px;color:#555;">Completed onboarding: <strong style="color:#111113;">${snapshot.onboardingCompleted}</strong></p>
                  <p style="margin:0 0 4px;font-size:14px;color:#555;">Not yet completed: <strong style="color:#111113;">${snapshot.onboardingIncomplete}</strong></p>
                  <p style="margin:0 0 14px;font-size:14px;color:#555;">Checklist ticked: none=${snapshot.checklistCompletionBuckets.none}, some=${snapshot.checklistCompletionBuckets.some}, all=${snapshot.checklistCompletionBuckets.all}</p>

                  <h2 style="margin:0 0 8px;font-size:14px;color:#111113;">Specialty popularity (active tracking)</h2>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;">${specialtyRowsHtml}</table>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 24px;background:#fafafa;">
                  <p style="margin:0;font-size:12px;line-height:1.5;color:#777;">Owner-only aggregate metrics. No user emails, names, or free-text content are included.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`

  return { subject, text, html }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Thin Supabase fetch layer. Every query is a cheap count (head:true) except
// the two grouped-count queries (checklist buckets, specialty popularity)
// which need row data to group in memory - both are small (per-profile /
// per-application), not full-table free-text scans.
export async function fetchOwnerMetrics(
  supabase: SupabaseClient,
  window: { start: Date; end: Date; label: string }
): Promise<OwnerMetricsSnapshot> {
  const { start, end, label } = window
  const startIso = start.toISOString()
  const endIso = end.toISOString()

  const [
    totalUsersRes,
    newSignupsRes,
    portfolioEntriesRes,
    casesRes,
    shareLinksRes,
    referralsRes,
    onboardingCompletedRes,
    onboardingIncompleteRes,
    activeEntryUsersRes,
    activeCaseUsersRes,
    checklistRes,
    specialtyRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', startIso).lt('created_at', endIso),
    supabase.from('portfolio_entries').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', startIso).lt('created_at', endIso),
    supabase.from('cases').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', startIso).lt('created_at', endIso),
    supabase.from('share_links').select('id', { count: 'exact', head: true }).gte('created_at', startIso).lt('created_at', endIso),
    supabase.from('referrals').select('id', { count: 'exact', head: true }).gte('created_at', startIso).lt('created_at', endIso),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('onboarding_complete', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('onboarding_complete', false),
    // Active-user signal: distinct users who created a portfolio entry or case
    // this week. Chosen over audit_log (too narrow - only security/billing
    // events) and profiles.updated_at (bumped by unrelated writes like a theme
    // toggle or checklist tick, so it overcounts "activity"). Real portfolio
    // work is the actual product-value signal.
    supabase.from('portfolio_entries').select('user_id').is('deleted_at', null).gte('created_at', startIso).lt('created_at', endIso),
    supabase.from('cases').select('user_id').is('deleted_at', null).gte('created_at', startIso).lt('created_at', endIso),
    supabase.from('profiles').select('onboarding_checklist_completed_items'),
    supabase.from('specialty_applications').select('specialty_key').eq('is_active', true),
  ])

  const activeUserIds = new Set<string>()
  for (const row of (activeEntryUsersRes.data ?? []) as Array<{ user_id: string }>) activeUserIds.add(row.user_id)
  for (const row of (activeCaseUsersRes.data ?? []) as Array<{ user_id: string }>) activeUserIds.add(row.user_id)

  const checklistCounts = ((checklistRes.data ?? []) as Array<{ onboarding_checklist_completed_items: string[] | null }>)
    .map(row => (row.onboarding_checklist_completed_items ?? []).length)

  const specialtyCounts = new Map<string, number>()
  for (const row of (specialtyRes.data ?? []) as Array<{ specialty_key: string }>) {
    specialtyCounts.set(row.specialty_key, (specialtyCounts.get(row.specialty_key) ?? 0) + 1)
  }
  const specialtyPopularity = Array.from(specialtyCounts.entries())
    .map(([specialtyKey, count]) => ({ specialtyKey, count }))
    .sort((a, b) => b.count - a.count || a.specialtyKey.localeCompare(b.specialtyKey))

  return {
    windowLabel: label,
    totalUsers: totalUsersRes.count ?? 0,
    newSignups: newSignupsRes.count ?? 0,
    activeUsers: activeUserIds.size,
    portfolioEntriesCreated: portfolioEntriesRes.count ?? 0,
    casesCreated: casesRes.count ?? 0,
    onboardingCompleted: onboardingCompletedRes.count ?? 0,
    onboardingIncomplete: onboardingIncompleteRes.count ?? 0,
    checklistCompletionBuckets: buildChecklistBuckets(checklistCounts),
    specialtyPopularity,
    shareLinksCreated: shareLinksRes.count ?? 0,
    // Exports are intentionally dropped: usage lives inside the
    // profiles.pro_features_used JSON blob (pdf_exports_used), which has no
    // "this week" timestamp and would need a full-table row fetch + app-side
    // JSON sum rather than a head:true count. Not cheap, so dropped rather
    // than adding schema, per the brief.
    exportsUsed: 0,
    referralsCreated: referralsRes.count ?? 0,
  }
}
