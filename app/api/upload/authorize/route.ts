import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchSubscriptionInfo, formatStorageQuota } from '@/lib/subscription'
import { validateOrigin } from '@/lib/csrf'
import { MAX_FILE_BYTES, ALLOWED_MIME_TYPES } from '@/lib/supabase/storage'
import { safeJsonBody, badJson } from '@/lib/safe-json'

const BUCKET = 'evidence'

function sanitiseFileName(name: unknown): string {
  const raw = typeof name === 'string' ? name : 'file'
  const trimmed = raw.trim().slice(0, 200) || 'file'
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * POST /api/upload/authorize
 *
 * Pre-flight + row creation for evidence uploads. Pairs with /api/upload/verify.
 *
 * Enforces (in order):
 *  - Authenticated user
 *  - Ownership of the target portfolio_entry or case (and not soft-deleted)
 *  - MIME type whitelist (matches the Supabase evidence bucket config)
 *  - Per-file size limit
 *  - Plan-aware storage quota
 *
 * On success:
 *  - Pre-creates the evidence_files row with scan_status='pending', using a
 *    deterministic file_path that includes the new row's UUID so storage path
 *    collisions are impossible.
 *  - Returns a one-time signed upload URL the browser PUTs to (signed URLs
 *    bypass RLS but are bound to the specific path and TTL).
 *
 * The browser then PUTs the file and POSTs to /api/upload/verify to finalise.
 * If verify never lands, /api/cron/purge-orphan-uploads removes the row and
 * any half-uploaded storage object after 24h.
 *
 * Storage RLS no longer permits user INSERTs on the evidence bucket - every
 * upload must flow through this route.
 */
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await safeJsonBody<{
    entryId?: unknown
    entryType?: unknown
    fileSize?: unknown
    mimeType?: unknown
    fileName?: unknown
  }>(req)
  if (!body) return badJson()

  const { entryId, entryType, fileSize, mimeType, fileName } = body

  if (typeof entryId !== 'string' || !/^[0-9a-f-]{36}$/i.test(entryId)) {
    return NextResponse.json({ error: 'Invalid entryId' }, { status: 400 })
  }
  if (entryType !== 'portfolio' && entryType !== 'case') {
    return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 })
  }
  if (typeof fileSize !== 'number' || fileSize <= 0 || !Number.isFinite(fileSize)) {
    return NextResponse.json({ error: 'Invalid file size' }, { status: 400 })
  }
  if (typeof mimeType !== 'string') {
    return NextResponse.json({ error: 'Invalid MIME type' }, { status: 400 })
  }

  if (fileSize > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 50 MB.' }, { status: 400 })
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: 'File type not allowed. Accepted: PDF, DOC, DOCX, XLSX, PPTX, TXT, PNG, JPEG, and HEIC.' },
      { status: 415 }
    )
  }

  // Verify the user owns the target entry and it isn't soft-deleted. Without
  // this check, a client could insert a metadata row pointing at someone
  // else's (RLS-protected) entry or at a nonexistent entry, accumulating
  // storage that no UI can manage.
  const table = entryType === 'portfolio' ? 'portfolio_entries' : 'cases'
  const { data: entry, error: entryError } = await supabase
    .from(table)
    .select('id')
    .eq('id', entryId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (entryError) {
    console.error('upload/authorize entry lookup error:', entryError.message)
    return NextResponse.json({ error: 'Failed to authorise upload. Please try again.' }, { status: 500 })
  }
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const subInfo = await fetchSubscriptionInfo(supabase, user.id)
  const quotaMB = subInfo.storageQuotaMB
  // Base-ten units throughout (1 MB = 1,000,000 bytes) to match the entitlement
  // model and storage_used_mb (which the RPC now computes base-ten).
  const quotaBytes = quotaMB * 1_000_000
  const usedBytes = subInfo.usage.storageUsedMB * 1_000_000

  if (usedBytes + fileSize > quotaBytes) {
    // Over-quota policy (F-040): never delete user data; only block NEW uploads.
    return NextResponse.json(
      { error: `Storage limit reached (${formatStorageQuota(quotaMB)}). Your existing files are safe — delete some or upgrade to free up space.` },
      { status: 400 }
    )
  }

  const service = createServiceClient()
  const safeName = sanitiseFileName(fileName)

  // Pre-create the row first so the orphan cron can find it if upload fails.
  // Using service-role insert bypasses the evidence_files RLS so the row is
  // committed even if the user-bound INSERT policy would otherwise pass.
  // file_path is a placeholder until we know the row id; we update it after
  // generating the path.
  const { data: row, error: insertError } = await service
    .from('evidence_files')
    .insert({
      user_id: user.id,
      entry_id: entryId,
      entry_type: entryType,
      file_name: safeName,
      file_path: 'pending',
      file_size: fileSize,
      mime_type: mimeType,
      scan_status: 'pending',
      scan_provider: null,
    })
    .select('id, created_at')
    .single()

  if (insertError || !row) {
    if (insertError) console.error('upload/authorize insert error:', insertError.message)
    return NextResponse.json({ error: 'Could not authorise upload. Please try again.' }, { status: 500 })
  }

  const path = `${user.id}/${entryType}/${entryId}/${row.id}-${safeName}`
  const { error: pathError } = await service
    .from('evidence_files')
    .update({ file_path: path })
    .eq('id', row.id)

  if (pathError) {
    // Roll back the placeholder row so the orphan cron doesn't have to.
    await service.from('evidence_files').delete().eq('id', row.id)
    console.error('upload/authorize path update error:', pathError.message)
    return NextResponse.json({ error: 'Could not authorise upload. Please try again.' }, { status: 500 })
  }

  const { data: signed, error: signedError } = await service.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (signedError || !signed) {
    await service.from('evidence_files').delete().eq('id', row.id)
    if (signedError) console.error('upload/authorize signed URL error:', signedError.message)
    return NextResponse.json({ error: 'Could not issue upload URL. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({
    fileId: row.id,
    path,
    signedUrl: signed.signedUrl,
    token: signed.token,
  })
}
