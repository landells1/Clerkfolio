import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { safeJsonBody, badJson } from '@/lib/safe-json'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { parseTrashPurgeRequest, purgeTrash } from '@/lib/trash/purge'

const RATE_MAX = 30
const RATE_WINDOW_SECONDS = 60 * 10

/**
 * POST /api/trash/purge
 *
 * Permanently delete items the signed-in user has already moved to Trash -
 * either specific items (`{ items: [{ id, type }] }`, type = entry | case |
 * log) or everything in Trash (`{ all: true }`). Lets a user remove an entry
 * that accidentally contained identifiable detail straight away instead of
 * waiting out the 30-day restore window (the nightly auto-purge still runs).
 *
 * Owner checks: the user's own SSR session (RLS) plus explicit user_id
 * filters, and only rows with deleted_at set are eligible. Evidence is cleaned
 * up with the multi-link rule (lib/trash/purge.ts).
 */
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = await checkRateLimit({ key: user.id, max: RATE_MAX, windowSeconds: RATE_WINDOW_SECONDS, prefix: 'trash-purge' })
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429, headers: rateLimitHeaders(rateLimit, RATE_WINDOW_SECONDS) },
    )
  }

  const body = await safeJsonBody(req)
  if (!body) return badJson()
  const request = parseTrashPurgeRequest(body)
  if (!request) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const result = await purgeTrash(supabase, user.id, request)
  if (result.error) {
    console.error('trash purge failed:', result.error)
    return NextResponse.json({ error: result.error, purged: result.purged }, { status: 500 })
  }
  return NextResponse.json({ purged: result.purged })
}
