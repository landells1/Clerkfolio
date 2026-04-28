import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import JSZip from 'jszip'

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const zip = new JSZip()
  const dateStr = new Date().toISOString().split('T')[0]
  const root = zip.folder(`clinidex-export-${dateStr}`)!

  // Fetch all user data in parallel
  const [
    { data: profile },
    { data: portfolioEntries },
    { data: cases },
    { data: deadlines },
    { data: goals },
    { data: specialtyApps },
    { data: specialtyLinks },
    { data: arcpLinks },
    { data: templates },
    { data: evidenceFiles },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('portfolio_entries').select('*').eq('user_id', user.id).is('deleted_at', null),
    supabase.from('cases').select('*').eq('user_id', user.id).is('deleted_at', null),
    supabase.from('deadlines').select('*').eq('user_id', user.id),
    supabase.from('goals').select('*').eq('user_id', user.id),
    supabase.from('specialty_applications').select('*').eq('user_id', user.id),
    supabase.from('specialty_entry_links').select('*'),
    supabase.from('arcp_entry_links').select('*').eq('user_id', user.id),
    supabase.from('templates').select('*').or(`user_id.eq.${user.id},user_id.is.null`),
    supabase.from('evidence_files').select('*').eq('user_id', user.id),
  ])

  // Filter specialty links to user's applications
  const appIds = new Set((specialtyApps ?? []).map(a => a.id))
  const filteredLinks = (specialtyLinks ?? []).filter(l => appIds.has(l.application_id))

  // Add JSON files
  root.file('profile.json', JSON.stringify(profile ?? {}, null, 2))
  root.file('portfolio-entries.json', JSON.stringify(portfolioEntries ?? [], null, 2))
  root.file('cases.json', JSON.stringify(cases ?? [], null, 2))
  root.file('deadlines.json', JSON.stringify(deadlines ?? [], null, 2))
  root.file('goals.json', JSON.stringify(goals ?? [], null, 2))
  root.file('specialty-applications.json', JSON.stringify(specialtyApps ?? [], null, 2))
  root.file('specialty-entry-links.json', JSON.stringify(filteredLinks, null, 2))
  root.file('arcp-links.json', JSON.stringify(arcpLinks ?? [], null, 2))
  root.file('templates.json', JSON.stringify(templates ?? [], null, 2))

  // Download evidence files from Supabase Storage
  if (evidenceFiles && evidenceFiles.length > 0) {
    const evidenceFolder = root.folder('evidence')!
    await Promise.allSettled(
      evidenceFiles.map(async (ef: { entry_id: string; storage_path: string; original_name?: string }) => {
        try {
          const { data: blob } = await supabase.storage
            .from('evidence')
            .download(ef.storage_path)
          if (blob) {
            const entryFolder = evidenceFolder.folder(ef.entry_id)!
            const filename = ef.original_name ?? ef.storage_path.split('/').pop() ?? 'file'
            const arrayBuffer = await blob.arrayBuffer()
            entryFolder.file(filename, arrayBuffer)
          }
        } catch {
          // Skip files that fail to download — don't block the whole export
        }
      })
    )
  }

  // Generate ZIP as ArrayBuffer — directly accepted as BodyInit
  const zipBuffer: ArrayBuffer = await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="clinidex-export-${dateStr}.zip"`,
    },
  })
}
