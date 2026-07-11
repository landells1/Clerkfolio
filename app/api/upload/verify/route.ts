import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { hasValidMagicBytes } from '@/lib/upload/magic-bytes'
import { checkFinalisedUploadSize } from '@/lib/upload/quota'
import { MAX_FILE_BYTES } from '@/lib/supabase/storage'
import { fetchSubscriptionInfo, formatStorageQuota } from '@/lib/subscription'
import { safeJsonBody, badJson } from '@/lib/safe-json'

const BUCKET = 'evidence'

// Finalises an evidence upload created by /api/upload/authorize. The browser
// PUTs the file to the signed URL returned by authorize, then calls this
// route. We download a prefix of the object, magic-byte-check the MIME, and
// flip scan_status from 'pending' to 'clean' or 'quarantined'.
//
// If this route never fires (browser crashed, network drop, user closed tab),
// the row stays in scan_status='pending'. The /api/cron/purge-orphan-uploads
// cron sweeps those rows + their storage objects after 24h.
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await safeJsonBody<{ fileId?: unknown }>(req)
  if (!body) return badJson()
  const fileId = typeof body.fileId === 'string' ? body.fileId : ''
  if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 })

  const { data: file, error: fileError } = await service
    .from('evidence_files')
    .select('id, user_id, file_path, mime_type, scan_status')
    .eq('id', fileId)
    .eq('user_id', user.id)
    .single()

  if (fileError || !file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  // If the row has already been finalised, just echo back the status.
  // /api/upload/authorize -> PUT -> verify is the canonical flow, but a
  // double-submit (e.g. retry after a slow network) should be idempotent.
  if (file.scan_status === 'clean' || file.scan_status === 'quarantined') {
    return NextResponse.json({ ok: file.scan_status === 'clean', scan_status: file.scan_status, scan_provider: 'mime_only' })
  }

  await service
    .from('evidence_files')
    .update({ scan_status: 'scanning' })
    .eq('id', file.id)

  const { data: blob, error: downloadError } = await service.storage
    .from(BUCKET)
    .download(file.file_path)

  if (downloadError || !blob) {
    await service.from('evidence_files').update({
      scan_status: 'quarantined',
      scan_provider: 'mime_only',
      scan_completed_at: new Date().toISOString(),
    }).eq('id', file.id)
    return NextResponse.json({ error: 'Could not verify uploaded file' }, { status: 500 })
  }

  // Reconcile the stored size with the REAL object size, then re-check the caps.
  // /api/upload/authorize trusts the client-declared fileSize (the bytes are not
  // uploaded yet), so a crafted client can declare 1 byte, PUT ~50 MB, and make
  // the quota meter read near-zero (get_profile_entitlements sums file_size).
  // Finalisation is the first point the true size is known: write it, then
  // enforce the per-file cap and quota against it.
  const actualSize = blob.size

  const { error: sizeUpdateError } = await service
    .from('evidence_files')
    .update({ file_size: actualSize })
    .eq('id', file.id)

  if (sizeUpdateError) {
    // Without the corrected size persisted, the quota check below would run
    // against the client-declared figure - the exact hole this route closes.
    // Leave the row in 'scanning' so the orphan cron reclaims it (row +
    // object) if retries never succeed.
    console.error('upload/verify file_size update error:', sizeUpdateError.message)
    return NextResponse.json({ error: 'Could not verify uploaded file' }, { status: 500 })
  }

  const subInfo = await fetchSubscriptionInfo(supabase, user.id)
  const quotaMB = subInfo.storageQuotaMB
  // Base-ten units (1 MB = 1,000,000 bytes), matching /api/upload/authorize and
  // storage_used_mb. usedBytes already includes this file at its corrected size.
  const quotaBytes = quotaMB * 1_000_000
  const usedBytes = subInfo.usage.storageUsedMB * 1_000_000

  const sizeCheck = checkFinalisedUploadSize({
    actualBytes: actualSize,
    maxFileBytes: MAX_FILE_BYTES,
    usedBytes,
    quotaBytes,
  })

  if (!sizeCheck.ok) {
    // Reject this NEW upload: remove the storage object and its row (the link
    // row cascades via FK ON DELETE CASCADE). This never touches previously
    // stored files, so the "over-quota never deletes existing data" rule (F-040)
    // holds - the rejected object was never a successfully stored file. Mirrors
    // the row rollback authorize already performs on its own failure paths.
    // Only delete the row once the object is gone: the orphan cron finds
    // objects via their rows, so a row deleted ahead of a failed storage
    // remove would leak the object forever. On remove failure the row stays
    // in 'scanning' and the cron retries both after 24h.
    const { error: removeError } = await service.storage.from(BUCKET).remove([file.file_path])
    if (removeError) {
      console.error('upload/verify reject storage remove error:', removeError.message)
    } else {
      await service.from('evidence_files').delete().eq('id', file.id)
    }

    if (sizeCheck.reason === 'file_too_large') {
      return NextResponse.json({ error: 'File too large. Maximum size is 50 MB.' }, { status: 400 })
    }
    return NextResponse.json(
      { error: `Storage limit reached (${formatStorageQuota(quotaMB)}). Your existing files are safe — delete some or upgrade to free up space.` },
      { status: 400 }
    )
  }

  const bytes = new Uint8Array(await blob.slice(0, 512).arrayBuffer())
  const clean = file.mime_type ? hasValidMagicBytes(bytes, file.mime_type) : false
  const scanStatus = clean ? 'clean' : 'quarantined'

  await service
    .from('evidence_files')
    .update({ scan_status: scanStatus, scan_provider: 'mime_only', scan_completed_at: new Date().toISOString() })
    .eq('id', file.id)

  return NextResponse.json({ ok: clean, scan_status: scanStatus, scan_provider: 'mime_only' })
}
