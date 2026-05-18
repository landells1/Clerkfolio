import { createClient } from './client'
import { fileHasValidMagicBytes } from '@/lib/upload/magic-bytes'

const BUCKET = 'evidence'
export const FREE_CAP_BYTES = 100 * 1024 * 1024        // 100 MB
export const STUDENT_CAP_BYTES = 1024 * 1024 * 1024    // 1 GB
export const PRO_CAP_BYTES  = 5 * 1024 * 1024 * 1024  // 5 GB
export const MAX_FILE_BYTES = 50 * 1024 * 1024         // 50 MB per file

// Must stay in sync with the Supabase evidence bucket's allowed MIME types.
// GIF and WEBP are intentionally excluded - they are not in the bucket config.
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/heic',
  'image/heif',
])

export type EvidenceFile = {
  id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string | null
  scan_status?: 'pending' | 'scanning' | 'clean' | 'quarantined'
  scan_provider?: 'clamav' | 'mime_only' | null
  created_at: string
}

type AuthorizeResponse = {
  fileId: string
  path: string
  signedUrl: string
  token: string
}

/**
 * Upload all pending files after an entry is saved. New 2-step flow (signed
 * upload URL + finalize) - direct user storage INSERT was removed in
 * 2026-05-18-phase2 so this is the only legitimate path now.
 *
 *   1. POST /api/upload/authorize  ->  pre-creates evidence_files row, returns
 *      signed upload URL. Server validates entry ownership, MIME, quota.
 *   2. PUT signedUrl               ->  browser uploads bytes directly to
 *      Supabase storage. The URL is one-time, bound to the path and TTL.
 *   3. POST /api/upload/verify     ->  server downloads a prefix of the object,
 *      runs the magic-byte check, flips scan_status from 'pending' to
 *      'clean' / 'quarantined'.
 *
 * If step 2 or 3 fails, the pending row + any partial storage object are
 * cleaned up by /api/cron/purge-orphan-uploads after 24h.
 */
export async function uploadPendingFiles(
  files: File[],
  userId: string,
  entryId: string,
  entryType: 'portfolio' | 'case',
): Promise<string[]> {
  const supabase = createClient()
  const errors: string[] = []

  for (const file of files) {
    // Client-side MIME guard (UX only - server enforces via /api/upload/authorize)
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      errors.push(`${file.name}: File type not allowed. Accepted: PDF, DOC, DOCX, XLSX, PPTX, TXT, PNG, JPEG, or HEIC.`)
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push(`${file.name}: File too large. Maximum size is 50 MB.`)
      continue
    }
    if (!(await fileHasValidMagicBytes(file))) {
      errors.push(`${file.name}: File contents do not match the selected file type.`)
      continue
    }

    // 1. Pre-create row + get signed upload URL (server enforces ownership +
    //    quota + MIME).
    const authRes = await fetch('/api/upload/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryId,
        entryType,
        fileSize: file.size,
        mimeType: file.type,
        fileName: file.name,
      }),
      credentials: 'same-origin',
    })
    if (!authRes.ok) {
      const body = await authRes.json().catch(() => ({}))
      errors.push(`${file.name}: ${body.error ?? 'Upload not authorised'}`)
      continue
    }
    const { fileId, signedUrl } = (await authRes.json().catch(() => ({}))) as Partial<AuthorizeResponse>
    if (!fileId || !signedUrl) {
      errors.push(`${file.name}: Upload not authorised`)
      continue
    }

    // 2. PUT the bytes. Signed URLs do not need our session cookies; omit
    //    credentials so the browser doesn't try to send them cross-origin.
    let uploadOk = false
    try {
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      })
      uploadOk = uploadRes.ok
    } catch {
      uploadOk = false
    }
    if (!uploadOk) {
      errors.push(`${file.name}: Upload failed - please try again`)
      // Don't try to clean up here - the orphan cron handles it. Leaving the
      // pending row also surfaces the failure if the user reloads.
      continue
    }

    // 3. Server-side verify (magic bytes + flip scan_status). Try the edge
    //    function first when available; fall back to /api/upload/verify so
    //    every path still ends in a finalised row.
    const { data: scanData, error: scanError } = await supabase.functions.invoke('scan-evidence', {
      body: { fileId },
    })

    if (scanError) {
      const verifyRes = await fetch('/api/upload/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })
      if (!verifyRes.ok) {
        const body = await verifyRes.json().catch(() => ({}))
        errors.push(`${file.name}: ${body.error ?? 'Could not verify uploaded file'}`)
      } else {
        const body = await verifyRes.json().catch(() => ({}))
        if (body.scan_status === 'quarantined') errors.push(`${file.name}: File failed server-side verification`)
      }
    } else if (scanData?.status === 'quarantined') {
      errors.push(`${file.name}: File failed server-side verification`)
    }
  }

  return errors
}

/** Get a 1-hour signed download URL for a stored file */
export async function getSignedUrl(path: string): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: file } = await supabase
    .from('evidence_files')
    .select('scan_status, user_id')
    .eq('file_path', path)
    .eq('user_id', user.id)
    .single()

  if (file?.scan_status !== 'clean') return null

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

/**
 * Delete a file from storage and remove its evidence_files record.
 * Verifies ownership before deleting to prevent IDOR. The storage delete uses
 * `file_path` from the owned DB row, not a caller-supplied path, so a caller
 * cannot delete a different file by mismatching the id and path arguments.
 */
export async function deleteEvidenceFile(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: file, error: fetchError } = await supabase
    .from('evidence_files')
    .select('user_id, file_path')
    .eq('id', id)
    .single()

  if (fetchError || !file) return { error: 'File not found' }
  if (file.user_id !== user.id) return { error: 'Unauthorised' }
  if (!file.file_path) return { error: 'File path missing' }

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([file.file_path])
  if (storageError) return { error: storageError.message }
  const { error: dbError } = await supabase.from('evidence_files').delete().eq('id', id)
  if (dbError) return { error: dbError.message }
  return { error: null }
}
