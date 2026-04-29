import { createClient } from './client'
import { fileHasValidMagicBytes } from '@/lib/upload/magic-bytes'

const BUCKET = 'evidence'
export const FREE_CAP_BYTES = 100 * 1024 * 1024        // 100 MB
export const PRO_CAP_BYTES  = 5 * 1024 * 1024 * 1024  // 5 GB
export const MAX_FILE_BYTES = 50 * 1024 * 1024         // 50 MB per file

// Must stay in sync with the Supabase evidence bucket's allowed MIME types.
// GIF and WEBP are intentionally excluded — they are not in the bucket config.
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
  created_at: string
}

/** Total bytes used by this user across all uploads */
export async function getStorageUsage(userId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('evidence_files')
    .select('file_size')
    .eq('user_id', userId)
  return data?.reduce((sum, f) => sum + (f.file_size ?? 0), 0) ?? 0
}

/**
 * Upload a file after server-side quota/MIME authorization.
 * Callers MUST call /api/upload/authorize first and surface any errors.
 * This function performs a final client-side MIME check as a UX guard only.
 */
export async function uploadEvidence(
  file: File,
  userId: string,
  entryId: string,
  entryType: 'portfolio' | 'case',
): Promise<{ path: string; error?: string }> {
  const supabase = createClient()

  // Client-side MIME guard (UX only — server enforce via /api/upload/authorize)
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { path: '', error: 'File type not allowed. Accepted: PDF, DOC, DOCX, XLSX, PPTX, TXT, PNG, JPEG, or HEIC.' }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { path: '', error: 'File too large. Maximum size is 50 MB.' }
  }
  if (!(await fileHasValidMagicBytes(file))) {
    return { path: '', error: 'File contents do not match the selected file type.' }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${entryType}/${entryId}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false })

  if (error) return { path: '', error: error.message }
  return { path }
}

/** Insert a record into evidence_files after a successful upload */
export async function insertEvidenceRecord(
  userId: string,
  entryId: string,
  entryType: 'portfolio' | 'case',
  file: File,
  path: string,
) {
  const supabase = createClient()
  return supabase.from('evidence_files').insert({
    user_id: userId,
    entry_id: entryId,
    entry_type: entryType,
    file_name: file.name,
    file_path: path,
    file_size: file.size,
    mime_type: file.type || null,
    scan_status: 'pending',
  }).select('id').single()
}

/**
 * Upload all pending files after an entry is saved.
 * Calls the server-side authorize endpoint for each file before uploading.
 * Returns any errors encountered.
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
    // Server-side authorization: quota + MIME + plan limit enforced here
    const authRes = await fetch('/api/upload/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileSize: file.size, mimeType: file.type, entryType }),
    })
    if (!authRes.ok) {
      const body = await authRes.json().catch(() => ({}))
      errors.push(`${file.name}: ${body.error ?? 'Upload not authorized'}`)
      continue
    }

    const { path, error } = await uploadEvidence(file, userId, entryId, entryType)
    if (error) { errors.push(`${file.name}: ${error}`); continue }
    const { data, error: insertError } = await insertEvidenceRecord(userId, entryId, entryType, file, path)
    if (insertError || !data?.id) {
      errors.push(`${file.name}: Could not save file record`)
      continue
    }

    const { data: scanData, error: scanError } = await supabase.functions.invoke('scan-evidence', {
      body: { fileId: data.id },
    })

    if (scanError) {
      const verifyRes = await fetch('/api/upload/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: data.id }),
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
 * Verifies ownership before deleting to prevent IDOR.
 */
export async function deleteEvidenceFile(id: string, path: string): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: file, error: fetchError } = await supabase
    .from('evidence_files')
    .select('user_id')
    .eq('id', id)
    .single()

  if (fetchError || !file) return { error: 'File not found' }
  if (file.user_id !== user.id) return { error: 'Unauthorised' }

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([path])
  if (storageError) return { error: storageError.message }
  const { error: dbError } = await supabase.from('evidence_files').delete().eq('id', id)
  if (dbError) return { error: dbError.message }
  return { error: null }
}
