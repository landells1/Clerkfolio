import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import JSZip from 'jszip'
import { getSpecialtyConfig } from '@/lib/specialties'

const BACKUP_SCHEMA_VERSION = 1

function formatTag(tag: string) {
  return getSpecialtyConfig(tag)?.name ?? tag
}

function withSpecialtyLabels<T extends { specialty_tags?: string[] | null }>(row: T) {
  return {
    ...row,
    specialty_tag_labels: (row.specialty_tags ?? []).map(formatTag),
  }
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const zip = new JSZip()
  const dateStr = new Date().toISOString().split('T')[0]
  const root = zip.folder(`clerkfolio-export-${dateStr}`)!
  const raw = root.folder('raw')!
  const readable = root.folder('readable')!

  // Fetch all user data in parallel (specialty_entry_links fetched separately after we have app IDs)
  const [
    { data: profile },
    { data: portfolioEntries },
    { data: cases },
    { data: deadlines },
    { data: goals },
    { data: specialtyApps },
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
    supabase.from('arcp_entry_links').select('*').eq('user_id', user.id),
    supabase.from('templates').select('*').or(`user_id.eq.${user.id},user_id.is.null`),
    supabase.from('evidence_files').select('*').eq('user_id', user.id).eq('scan_status', 'clean'),
  ])

  const appIds = (specialtyApps ?? []).map(a => a.id)
  const { data: filteredLinks } = appIds.length > 0
    ? await supabase.from('specialty_entry_links').select('*').in('application_id', appIds)
    : { data: [] }

  const manifest = {
    schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    app: 'clerkfolio',
    contents: {
      profile: 1,
      portfolio_entries: portfolioEntries?.length ?? 0,
      cases: cases?.length ?? 0,
      deadlines: deadlines?.length ?? 0,
      goals: goals?.length ?? 0,
      specialty_applications: specialtyApps?.length ?? 0,
      specialty_entry_links: filteredLinks?.length ?? 0,
      arcp_links: arcpLinks?.length ?? 0,
      templates: templates?.length ?? 0,
      evidence_files: evidenceFiles?.length ?? 0,
    },
    import_notes: 'Files in raw/ preserve database-shaped records. Files in readable/ add display labels for human review. Evidence binaries are grouped by entry id in evidence/.',
  }

  root.file('manifest.json', JSON.stringify(manifest, null, 2))
  raw.file('profile.json', JSON.stringify(profile ?? {}, null, 2))
  raw.file('portfolio-entries.json', JSON.stringify(portfolioEntries ?? [], null, 2))
  raw.file('cases.json', JSON.stringify(cases ?? [], null, 2))
  raw.file('deadlines.json', JSON.stringify(deadlines ?? [], null, 2))
  raw.file('goals.json', JSON.stringify(goals ?? [], null, 2))
  raw.file('specialty-applications.json', JSON.stringify(specialtyApps ?? [], null, 2))
  raw.file('specialty-entry-links.json', JSON.stringify(filteredLinks, null, 2))
  raw.file('arcp-links.json', JSON.stringify(arcpLinks ?? [], null, 2))
  raw.file('templates.json', JSON.stringify(templates ?? [], null, 2))

  readable.file('portfolio-entries.json', JSON.stringify((portfolioEntries ?? []).map(withSpecialtyLabels), null, 2))
  readable.file('cases.json', JSON.stringify((cases ?? []).map(c => ({
    ...withSpecialtyLabels(c),
    clinical_area_labels: c.clinical_domains?.length ? c.clinical_domains : c.clinical_domain ? [c.clinical_domain] : [],
  })), null, 2))
  readable.file('specialty-applications.json', JSON.stringify((specialtyApps ?? []).map(app => ({
    ...app,
    specialty_label: formatTag(app.specialty_key),
  })), null, 2))
  readable.file('README.txt', [
    'Clerkfolio backup',
    `Schema version: ${BACKUP_SCHEMA_VERSION}`,
    '',
    'Use raw/*.json for future import workflows.',
    'Use readable/*.json for manual inspection and support.',
    'Evidence files are stored under evidence/<entry_id>/ when available.',
  ].join('\n'))

  // Download evidence files from Supabase Storage
  if (evidenceFiles && evidenceFiles.length > 0) {
    const evidenceFolder = root.folder('evidence')!
    await Promise.allSettled(
      evidenceFiles.map(async (ef: { entry_id: string; file_path: string; file_name?: string }) => {
        try {
          const { data: blob } = await supabase.storage
            .from('evidence')
            .download(ef.file_path)
          if (blob) {
            const entryFolder = evidenceFolder.folder(ef.entry_id)!
            const filename = ef.file_name ?? ef.file_path.split('/').pop() ?? 'file'
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
      'Content-Disposition': `attachment; filename="clerkfolio-export-${dateStr}.zip"`,
    },
  })
}
