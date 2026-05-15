import { createClient } from '@supabase/supabase-js'

// Tables truncated between E2E runs so tests don't accumulate stale rows.
// Uses the TEST project's service role key — never run against production.
const TRUNCATE_TABLES = [
  'portfolio_entries',
  'specialty_applications',
  'specialty_entry_links',
  'share_links',
  'share_access_logs',
  'goals',
  'profiles',
]

export default async function globalSetup() {
  const url = process.env.SUPABASE_TEST_URL
  const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.warn(
      '[e2e/global-setup] SUPABASE_TEST_URL or SUPABASE_TEST_SERVICE_ROLE_KEY not set — skipping DB truncation.',
    )
    return
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

  for (const table of TRUNCATE_TABLES) {
    // Soft-delete tables use deleted_at; hard-truncate everything for a clean slate.
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) {
      console.warn(`[e2e/global-setup] truncate ${table} failed:`, error.message)
    }
  }

  console.log('[e2e/global-setup] test DB truncated')
}
