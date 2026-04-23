import { createClient } from './client'

const BUCKET = 'evidence'
export const FREE_CAP_BYTES = 200 * 1024 * 1024 // 200 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export type EvidenceFile = {
  id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string | null
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

/** Upload a file, returns { path } on success or { error } on failure */
export async function uploadEvidence(
  file: File,
  userId: string,
  entryId: string,
  entryType: 'portfolio' | 'case',
): Promise<{ path: string; error?: string }> {
  const supabase = createClient()

  // Server-side MIME type validation
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { path: '', error: 'File type not allowed. Accepted: PDF, images (JPG/PNG/GIF/WEBP), Word documents.' }
  }

  // Enforce 200 MB free cap
  const used = await getStorageUsage(userId)
  if (used + file.size > FREE_CAP_BYTES) {
    return { path: '', error: 'Storage limit reached (200 MB). You cannot upload more files on the free plan.' }
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
  })
}

/** Upload all pending files after an entry is saved. Returns any errors. */
export async function uploadPendingFiles(
  files: File[],
  userId: string,
  entryId: string,
  entryType: 'portfolio' | 'case',
): Promise<string[]> {
  const errors: string[] = []
  for (const file of files) {
    const { path, error } = await uploadEvidence(file, userId, entryId, entryType)
    if (error) { errors.push(`${file.name}: ${error}`); continue }
    await insertEvidenceRecord(userId, entryId, entryType, file, path)
  }
  return errors
}

/** Get a 1-hour signed download URL for a stored file */
export async function getSignedUrl(path: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

/** Delete a file from storage and remove its evidence_files record.
 *  Verifies ownership before deleting to prevent IDOR.
 *  Returns { error } — non-null on failure so callers can react without alert(). */
export async function deleteEvidenceFile(id: string, path: string): Promise<{ error: string | null }> {
  const supabase = createClient()

  // Verify the file belongs to the authenticated user before deleting
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
