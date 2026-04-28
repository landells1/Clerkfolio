import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo } from '@/lib/subscription'
import { validateOrigin } from '@/lib/csrf'
import { FREE_CAP_BYTES, PRO_CAP_BYTES, MAX_FILE_BYTES, ALLOWED_MIME_TYPES } from '@/lib/supabase/storage'

/**
 * POST /api/upload/authorize
 *
 * Server-side gate for evidence file uploads. Enforces:
 *  - Authentication
 *  - MIME type whitelist (matches the Supabase evidence bucket config)
 *  - Per-file size limit (50 MB)
 *  - Plan-aware storage quota (200 MB free / 5 GB Pro)
 *
 * The client must call this before uploading. The quota check runs against the
 * evidence_files table which is the authoritative record of used storage.
 */
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { fileSize?: unknown; mimeType?: unknown; entryType?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { fileSize, mimeType, entryType } = body

  if (typeof fileSize !== 'number' || fileSize <= 0 || !Number.isFinite(fileSize)) {
    return NextResponse.json({ error: 'Invalid file size' }, { status: 400 })
  }
  if (typeof mimeType !== 'string') {
    return NextResponse.json({ error: 'Invalid MIME type' }, { status: 400 })
  }
  if (entryType !== 'portfolio' && entryType !== 'case') {
    return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 })
  }

  // Per-file size limit
  if (fileSize > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is 50 MB.` },
      { status: 400 }
    )
  }

  // MIME type whitelist
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: 'File type not allowed. Accepted: PDF, JPEG, PNG, Word documents.' },
      { status: 400 }
    )
  }

  // Resolve plan-aware quota limit via subscription info (fetches storage usage internally)
  const subInfo = await fetchSubscriptionInfo(supabase, user.id)
  const quotaMB = subInfo.storageQuotaMB
  const quotaBytes = quotaMB * 1024 * 1024
  const usedBytes = subInfo.usage.storageUsedMB * 1024 * 1024
  const limitLabel = subInfo.isPro ? '5 GB' : '100 MB'

  if (usedBytes + fileSize > quotaBytes) {
    return NextResponse.json(
      { error: `Storage limit reached (${limitLabel}). Delete some files to free up space.` },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}
