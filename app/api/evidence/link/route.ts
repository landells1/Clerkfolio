import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { safeJsonBody, badJson } from '@/lib/safe-json'
import { decideUnlink, type EvidenceEntryType } from '@/lib/evidence/links'

const BUCKET = 'evidence'
const UUID_RE = /^[0-9a-f-]{36}$/i

function isEntryType(v: unknown): v is EvidenceEntryType {
  return v === 'portfolio' || v === 'case'
}

/**
 * Verify the user owns a live (not soft-deleted) entry of the given type.
 * Mirrors /api/upload/authorize's entry-ownership guard.
 */
async function userOwnsEntry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  entryId: string,
  entryType: EvidenceEntryType,
): Promise<boolean> {
  const table = entryType === 'portfolio' ? 'portfolio_entries' : 'cases'
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', entryId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

/**
 * POST /api/evidence/link
 *
 * Attach an already-uploaded evidence file (one the user owns) to another of
 * their live entries. Creates one evidence_file_links row. This is the "upload
 * once, reuse everywhere" path — it never uploads bytes and never changes
 * storage usage (quota counts the physical file once, however many links it
 * has), so it is not quota-gated.
 */
export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await safeJsonBody<{ fileId?: unknown; entryId?: unknown; entryType?: unknown }>(req)
  if (!body) return badJson()
  const { fileId, entryId, entryType } = body

  if (typeof fileId !== 'string' || !UUID_RE.test(fileId)) {
    return NextResponse.json({ error: 'Invalid fileId' }, { status: 400 })
  }
  if (typeof entryId !== 'string' || !UUID_RE.test(entryId)) {
    return NextResponse.json({ error: 'Invalid entryId' }, { status: 400 })
  }
  if (!isEntryType(entryType)) {
    return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 })
  }

  // Ownership of the physical file (only clean files can be attached — a
  // pending/quarantined file has nothing safely viewable to reuse).
  const { data: file, error: fileError } = await supabase
    .from('evidence_files')
    .select('id, scan_status')
    .eq('id', fileId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (fileError) {
    console.error('evidence/link file lookup error:', fileError.message)
    return NextResponse.json({ error: 'Failed to attach file. Please try again.' }, { status: 500 })
  }
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })
  if (file.scan_status !== 'clean') {
    return NextResponse.json({ error: 'This file is not ready to attach yet.' }, { status: 409 })
  }

  // Ownership of the target entry.
  let ownsEntry: boolean
  try {
    ownsEntry = await userOwnsEntry(supabase, user.id, entryId, entryType)
  } catch (err) {
    console.error('evidence/link entry ownership error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to verify entry ownership. Please try again.' }, { status: 500 })
  }
  if (!ownsEntry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const { data: link, error: insertError } = await supabase
    .from('evidence_file_links')
    .insert({ file_id: fileId, entry_id: entryId, entry_type: entryType })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'That file is already attached to this entry.' }, { status: 409 })
    }
    console.error('evidence/link insert error:', insertError.message)
    return NextResponse.json({ error: 'Failed to attach file. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ id: link.id }, { status: 201 })
}

/**
 * DELETE /api/evidence/link?fileId=..&entryId=..&entryType=..
 *
 * Detach a file from ONE entry. Unlinking is not deleting: the physical storage
 * object + evidence_files row are removed ONLY when this was the file's last
 * link. If other live entries still link the file, only the one link row goes.
 */
export async function DELETE(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = await createClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fileId = req.nextUrl.searchParams.get('fileId') ?? ''
  const entryId = req.nextUrl.searchParams.get('entryId') ?? ''
  const entryType = req.nextUrl.searchParams.get('entryType') ?? ''
  if (!UUID_RE.test(fileId)) return NextResponse.json({ error: 'Invalid fileId' }, { status: 400 })
  if (!UUID_RE.test(entryId)) return NextResponse.json({ error: 'Invalid entryId' }, { status: 400 })
  if (!isEntryType(entryType)) return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 })

  // Confirm ownership of the physical file (the RLS SELECT already scopes to the
  // user, but check explicitly so we return 404 rather than a misleading state).
  const { data: file, error: fileError } = await supabase
    .from('evidence_files')
    .select('id, file_path')
    .eq('id', fileId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (fileError) {
    console.error('evidence/unlink file lookup error:', fileError.message)
    return NextResponse.json({ error: 'Failed to remove file. Please try again.' }, { status: 500 })
  }
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  // Current full link set for this file (RLS-scoped to the user's own files).
  const { data: links, error: linksError } = await supabase
    .from('evidence_file_links')
    .select('entry_id, entry_type')
    .eq('file_id', fileId)
  if (linksError) {
    console.error('evidence/unlink links lookup error:', linksError.message)
    return NextResponse.json({ error: 'Failed to remove file. Please try again.' }, { status: 500 })
  }

  const decision = decideUnlink(
    (links ?? []) as { entry_id: string; entry_type: EvidenceEntryType }[],
    entryId,
    entryType,
  )
  if (!decision.linkExists) {
    return NextResponse.json({ error: 'That file is not attached to this entry.' }, { status: 404 })
  }

  // Remove the one link row.
  const { error: deleteLinkError } = await supabase
    .from('evidence_file_links')
    .delete()
    .eq('file_id', fileId)
    .eq('entry_id', entryId)
    .eq('entry_type', entryType)
  if (deleteLinkError) {
    console.error('evidence/unlink link delete error:', deleteLinkError.message)
    return NextResponse.json({ error: 'Failed to remove file. Please try again.' }, { status: 500 })
  }

  if (!decision.deleteFile) {
    // Still linked elsewhere — the file stays. This was a plain unlink.
    return NextResponse.json({ deleted: false, remainingLinks: decision.remainingLinkCount })
  }

  // Last link gone: remove the storage object then the evidence_files row.
  // Service role for the storage remove (matches deleteEvidenceFile / the crons);
  // the file_path comes from the owned row, never from the caller.
  if (file.file_path) {
    const { error: storageError } = await service.storage.from(BUCKET).remove([file.file_path])
    if (storageError) {
      console.error('evidence/unlink storage remove error:', storageError.message)
      // Continue to delete the row anyway: a lingering storage object is less
      // harmful than a row that no UI can manage. The link is already gone.
    }
  }
  const { error: rowError } = await supabase
    .from('evidence_files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', user.id)
  if (rowError) {
    console.error('evidence/unlink row delete error:', rowError.message)
    return NextResponse.json({ error: 'Failed to remove file. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true, remainingLinks: 0 })
}
