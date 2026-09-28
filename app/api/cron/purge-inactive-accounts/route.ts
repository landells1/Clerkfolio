import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'
import { inactiveAccountCutoff, isAccountInactiveForRetention } from '@/lib/account/inactive-user-retention'
import { logBackgroundJobError } from '@/lib/monitoring'
import { getStripe } from '@/lib/stripe'
import * as Sentry from '@sentry/nextjs'
import type { User } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AUTH_PAGE_SIZE = 1_000
const MAX_DELETIONS_PER_RUN = 20
// Bound per-run work separately from deletions, so accounts that can't be
// deleted yet (subscription winding down, recently active) at the front of
// the list no longer starve everyone behind them.
const MAX_CANDIDATES_PER_RUN = 100
const STORAGE_BUCKET = 'evidence'
const STORAGE_DELETE_CHUNK = 500

type Profile = {
  stripe_subscription_id: string | null
}

type SubscriptionDisposition = 'ready' | 'scheduled' | 'pending' | 'blocked'

function isMissingStripeResource(error: unknown) {
  return (error as { code?: string } | null)?.code === 'resource_missing'
}

async function resolveSubscription(
  profile: Profile | null,
): Promise<SubscriptionDisposition> {
  const subscriptionId = profile?.stripe_subscription_id
  if (!subscriptionId) return 'ready'

  // Never delete an account while we have a subscription pointer but cannot
  // verify that it will stop billing. This mirrors user-initiated deletion.
  if (!process.env.STRIPE_SECRET_KEY) return 'blocked'

  const stripe = getStripe()
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    if (['canceled', 'incomplete_expired', 'unpaid'].includes(subscription.status)) {
      return 'ready'
    }
    if (subscription.cancel_at_period_end) return 'pending'

    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
    return 'scheduled'
  } catch (error) {
    // A stale DB pointer cannot keep personal data forever. Stripe confirms
    // that no subscription exists, so there is no ongoing billing risk.
    if (isMissingStripeResource(error)) return 'ready'
    throw error
  }
}

async function evidencePaths(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<string[]> {
  const { data: files, error: filesError } = await supabase
    .from('evidence_files')
    .select('file_path')
    .eq('user_id', userId)

  if (filesError) throw filesError

  return (files ?? [])
    .map(file => file.file_path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0)
}

async function removeStorageObjects(
  supabase: ReturnType<typeof createServiceClient>,
  paths: string[],
) {
  for (let offset = 0; offset < paths.length; offset += STORAGE_DELETE_CHUNK) {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(paths.slice(offset, offset + STORAGE_DELETE_CHUNK))
    if (error) throw error
  }
}

// auth.users.last_sign_in_at only moves on a real sign-in, NOT when a session
// silently refreshes - so a doctor who stays signed in on their phone for two
// years and uses the app daily looked "inactive". Treat any recent app
// activity (a session seen by the middleware, or an entry/case written) as
// activity too.
async function hasRecentAppActivity(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  cutoffIso: string,
): Promise<boolean> {
  const checks = await Promise.all([
    supabase.from('session_fingerprints').select('id').eq('user_id', userId).gt('last_seen_at', cutoffIso).limit(1),
    supabase.from('portfolio_entries').select('id').eq('user_id', userId).gt('updated_at', cutoffIso).limit(1),
    supabase.from('cases').select('id').eq('user_id', userId).gt('updated_at', cutoffIso).limit(1),
  ])
  for (const { data, error } of checks) {
    if (error) throw error
    if ((data ?? []).length > 0) return true
  }
  return false
}

async function purgeInactiveUser(
  supabase: ReturnType<typeof createServiceClient>,
  user: User,
): Promise<'deleted' | 'subscription_scheduled' | 'subscription_pending' | 'subscription_blocked' | 'active'> {
  // The paginated auth listing is a snapshot. Re-read immediately before any
  // destructive action so a user who signed in during this cron run is kept.
  const { data: latest, error: latestError } = await supabase.auth.admin.getUserById(user.id)
  if (latestError) throw latestError
  if (!latest.user || !isAccountInactiveForRetention(latest.user)) return 'active'
  if (await hasRecentAppActivity(supabase, user.id, inactiveAccountCutoff().toISOString())) return 'active'

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) throw profileError

  const subscriptionDisposition = await resolveSubscription(profile)
  if (subscriptionDisposition === 'scheduled') return 'subscription_scheduled'
  if (subscriptionDisposition === 'pending') return 'subscription_pending'
  if (subscriptionDisposition === 'blocked') return 'subscription_blocked'

  // Collect storage paths first, delete the auth user (cascading its rows and
  // sessions), THEN remove the objects. The previous order removed evidence
  // and then called auth.admin.signOut(userId) - which takes a JWT, not a user
  // id, so it always failed - leaving accounts whose files were wiped but
  // which were never deleted, retried every night.
  const paths = await evidencePaths(supabase, user.id)

  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
  if (deleteError) throw deleteError

  try {
    await removeStorageObjects(supabase, paths)
  } catch (error) {
    // The account and its rows are gone; only orphan storage objects remain,
    // which the owner can clear from the bucket. Log, but count the deletion.
    logBackgroundJobError('cron.purge_inactive_accounts.storage_remove', error, { count: paths.length })
  }

  return 'deleted'
}

async function listUsers(supabase: ReturnType<typeof createServiceClient>) {
  const users: User[] = []
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE })
    if (error) throw error

    const batch = data.users
    users.push(...batch)
    if (batch.length < AUTH_PAGE_SIZE) return users
    page += 1
  }
}

export async function GET(request: NextRequest) {
  const cronError = validateCronSecret(request)
  if (cronError) return cronError

  return Sentry.withMonitor('cron-purge-inactive-accounts', async () => {
    const supabase = createServiceClient()

    let users: User[]
    try {
      users = await listUsers(supabase)
    } catch (error) {
      logBackgroundJobError('cron.purge_inactive_accounts.list_users', error)
      return NextResponse.json({ error: 'Failed to identify inactive accounts.' }, { status: 500 })
    }

    const candidates = users
      .filter(user => isAccountInactiveForRetention(user))
      .slice(0, MAX_CANDIDATES_PER_RUN)

    const results = {
      deleted: 0,
      subscription_scheduled: 0,
      subscription_pending: 0,
      subscription_blocked: 0,
      active: 0,
      failed: 0,
    }

    for (const user of candidates) {
      if (results.deleted >= MAX_DELETIONS_PER_RUN) break
      try {
        const result = await purgeInactiveUser(supabase, user)
        results[result] += 1
      } catch (error) {
        results.failed += 1
        logBackgroundJobError('cron.purge_inactive_accounts.user', error)
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: users.length,
      eligible: candidates.length,
      ...results,
    })
  }, {
    schedule: { type: 'crontab', value: '30 3 * * *' },
    timezone: 'UTC',
    checkinMargin: 5,
    maxRuntime: 60,
    failureIssueThreshold: 1,
  })
}
