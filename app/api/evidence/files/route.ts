import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchUserEvidenceLibraryWithTitles } from '@/lib/evidence/server'

/**
 * GET /api/evidence/files
 *
 * The owner's full evidence library for the Import & export -> Files tab:
 * every file they own (all scan statuses - pending/quarantined still count
 * toward the storage quota) with the entries/cases it is linked to, TITLES
 * included. Titles are fine here and only here: this is the owner viewing
 * their own data. The attach-existing picker route (/api/evidence/library)
 * deliberately withholds titles - do not merge the two.
 *
 * `file_path` is included so the client can request signed downloads through
 * the existing owner-checked `getSignedUrl` helper (same as the entry pages).
 * Read-only route, so no validateOrigin; deletion goes through the existing
 * owner-checked `deleteEvidenceFile` path, not this route.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let library
  try {
    library = await fetchUserEvidenceLibraryWithTitles(supabase, user.id)
  } catch (err) {
    console.error('evidence/files lookup error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to load your files. Please try again.' }, { status: 500 })
  }

  const files = library.map(file => ({
    id: file.id,
    file_name: file.file_name,
    file_path: file.file_path,
    file_size: file.file_size,
    mime_type: file.mime_type,
    scan_status: file.scan_status ?? 'clean',
    created_at: file.created_at,
    links: file.links,
  }))

  return NextResponse.json({ files })
}
