import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchUserEvidenceLibrary } from '@/lib/evidence/server'
import type { EvidenceEntryType } from '@/lib/evidence/links'

const UUID_RE = /^[0-9a-f-]{36}$/i

/**
 * GET /api/evidence/library?entryId=..&entryType=..
 *
 * The user's uploaded evidence files for the "attach existing file" picker.
 * Each item carries how many entries the file is linked to and whether it is
 * already attached to the current entry (so the picker can hide/disable those).
 * Only the file's own metadata is returned — never other entries' titles or
 * content — so a multi-linked file cannot leak the entries it belongs to.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entryId = req.nextUrl.searchParams.get('entryId') ?? ''
  const entryType = req.nextUrl.searchParams.get('entryType') ?? ''
  const currentEntryId = UUID_RE.test(entryId) ? entryId : null
  const currentEntryType: EvidenceEntryType | null =
    entryType === 'portfolio' || entryType === 'case' ? entryType : null

  let library
  try {
    library = await fetchUserEvidenceLibrary(supabase, user.id)
  } catch (err) {
    console.error('evidence/library lookup error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to load your files. Please try again.' }, { status: 500 })
  }

  const files = library.map(file => {
    const linkCount = file.links.length
    const attachedHere = Boolean(
      currentEntryId &&
      currentEntryType &&
      file.links.some(l => l.entry_id === currentEntryId && l.entry_type === currentEntryType),
    )
    return {
      id: file.id,
      file_name: file.file_name,
      file_size: file.file_size,
      mime_type: file.mime_type,
      created_at: file.created_at,
      linkCount,
      attachedHere,
    }
  })

  return NextResponse.json({ files })
}
