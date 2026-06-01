import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import JSZip from 'jszip'
import { formatSpecialtyLabel } from '@/lib/specialties'
import { filterLinksToActivePortfolioEntries } from '@/lib/specialties/active-links'
import type { SpecialtyEntryLink } from '@/lib/specialties'
import type { ARCPEntryLink } from '@/lib/types/arcp'

const BACKUP_SCHEMA_VERSION = 1

function formatTag(tag: string) {
  return formatSpecialtyLabel(tag)
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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const includeEvidence = body?.includeEvidence !== false

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
    { data: personalLog },
    { data: auditLog },
    { data: shareLinks },
    { data: notifications },
    { data: customThemes },
    { data: snippets },
    { data: savedSearches },
    { data: sessionFingerprints },
    { data: referrals },
    { data: apiKeys },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('portfolio_entries').select('*').eq('user_id', user.id),
    supabase.from('cases').select('*').eq('user_id', user.id),
    supabase.from('deadlines').select('*').eq('user_id', user.id),
    supabase.from('goals').select('*').eq('user_id', user.id),
    supabase.from('specialty_applications').select('*').eq('user_id', user.id),
    supabase.from('arcp_entry_links').select('*').eq('user_id', user.id),
    supabase.from('templates').select('*').or(`user_id.eq.${user.id},user_id.is.null`),
    includeEvidence
      ? supabase.from('evidence_files').select('*').eq('user_id', user.id).eq('scan_status', 'clean')
      : Promise.resolve({ data: [] }),
    // GDPR Art. 20 — additional tables containing personal data
    supabase.from('personal_log').select('*').eq('user_id', user.id),
    supabase.from('audit_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('share_links').select('id, created_at, scope, specialty_key, theme_slug, expires_at, view_count, revoked, revoked_at, hide_notes, hide_reflection, redact_tags').eq('user_id', user.id),
    supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('custom_competency_themes').select('*').eq('user_id', user.id),
    supabase.from('snippets').select('*').eq('user_id', user.id),
    supabase.from('saved_searches').select('*').eq('user_id', user.id),
    // Exclude ip_hash from session fingerprints (derived from PII, not PII itself)
    supabase.from('session_fingerprints').select('id, user_id, user_agent, created_at, last_seen_at, revoked_at').eq('user_id', user.id),
    supabase.from('referrals').select('*').or(`referrer_id.eq.${user.id},referred_id.eq.${user.id}`),
    // Include key names and prefixes; exclude hash (not personal data, not reconstructable)
    supabase.from('api_keys').select('id, user_id, name, prefix, scopes, created_at, last_used_at, revoked_at').eq('user_id', user.id),
  ])

  const appIds = (specialtyApps ?? []).map(a => a.id)
  const { data: rawSpecialtyLinks } = appIds.length > 0
    ? await supabase.from('specialty_entry_links').select('*').in('application_id', appIds)
    : { data: [] }
  const filteredLinks = await filterLinksToActivePortfolioEntries(
    supabase,
    (rawSpecialtyLinks ?? []) as SpecialtyEntryLink[]
  )
  const filteredArcpLinks = await filterLinksToActivePortfolioEntries(
    supabase,
    (arcpLinks ?? []) as ARCPEntryLink[]
  )
  const activePortfolioIds = new Set((portfolioEntries ?? []).map(entry => entry.id))
  const activeCaseIds = new Set((cases ?? []).map(c => c.id))
  const filteredEvidenceFiles = (evidenceFiles ?? []).filter(file => {
    if (file.entry_type === 'portfolio') return activePortfolioIds.has(file.entry_id)
    if (file.entry_type === 'case') return activeCaseIds.has(file.entry_id)
    return false
  })
  const shareLinkIds = (shareLinks ?? []).map(link => link.id)
  const [{ data: shareViews }, { data: shareAccessAttempts }] = shareLinkIds.length > 0
    ? await Promise.all([
        supabase.from('share_views').select('id, share_link_id, viewed_at').in('share_link_id', shareLinkIds),
        supabase.from('share_access_attempts').select('id, share_link_id, success, created_at').in('share_link_id', shareLinkIds),
      ])
    : [{ data: [] }, { data: [] }]

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
      specialty_entry_links: filteredLinks.length,
      arcp_links: filteredArcpLinks.length,
      templates: templates?.length ?? 0,
      evidence_files: filteredEvidenceFiles.length,
      personal_log: personalLog?.length ?? 0,
      audit_log: auditLog?.length ?? 0,
      share_links: shareLinks?.length ?? 0,
      share_views: shareViews?.length ?? 0,
      share_access_attempts: shareAccessAttempts?.length ?? 0,
      notifications: notifications?.length ?? 0,
      custom_competency_themes: customThemes?.length ?? 0,
      snippets: snippets?.length ?? 0,
      saved_searches: savedSearches?.length ?? 0,
      session_fingerprints: sessionFingerprints?.length ?? 0,
      referrals: referrals?.length ?? 0,
      api_keys: apiKeys?.length ?? 0,
    },
    import_notes: includeEvidence
      ? 'Files in raw/ preserve database-shaped records. Files in readable/ add display labels for human review. Evidence binaries are grouped by entry id in evidence/.'
      : 'Files in raw/ preserve database-shaped records. Evidence binaries were excluded from this export.',
  }

  root.file('manifest.json', JSON.stringify(manifest, null, 2))
  raw.file('profile.json', JSON.stringify(profile ?? {}, null, 2))
  raw.file('portfolio-entries.json', JSON.stringify(portfolioEntries ?? [], null, 2))
  raw.file('cases.json', JSON.stringify(cases ?? [], null, 2))
  raw.file('deadlines.json', JSON.stringify(deadlines ?? [], null, 2))
  raw.file('goals.json', JSON.stringify(goals ?? [], null, 2))
  raw.file('specialty-applications.json', JSON.stringify(specialtyApps ?? [], null, 2))
  raw.file('specialty-entry-links.json', JSON.stringify(filteredLinks, null, 2))
  raw.file('arcp-links.json', JSON.stringify(filteredArcpLinks, null, 2))
  raw.file('templates.json', JSON.stringify(templates ?? [], null, 2))
  raw.file('personal-log.json', JSON.stringify(personalLog ?? [], null, 2))
  raw.file('audit-log.json', JSON.stringify(auditLog ?? [], null, 2))
  raw.file('share-links.json', JSON.stringify(shareLinks ?? [], null, 2))
  raw.file('share-views.json', JSON.stringify(shareViews ?? [], null, 2))
  raw.file('share-access-attempts.json', JSON.stringify(shareAccessAttempts ?? [], null, 2))
  raw.file('notifications.json', JSON.stringify(notifications ?? [], null, 2))
  raw.file('custom-competency-themes.json', JSON.stringify(customThemes ?? [], null, 2))
  raw.file('snippets.json', JSON.stringify(snippets ?? [], null, 2))
  raw.file('saved-searches.json', JSON.stringify(savedSearches ?? [], null, 2))
  raw.file('session-fingerprints.json', JSON.stringify(sessionFingerprints ?? [], null, 2))
  raw.file('referrals.json', JSON.stringify(referrals ?? [], null, 2))
  raw.file('api-keys.json', JSON.stringify(apiKeys ?? [], null, 2))

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
  if (filteredEvidenceFiles.length > 0) {
    const evidenceFolder = root.folder('evidence')!
    await Promise.allSettled(
      filteredEvidenceFiles.map(async (ef: { entry_id: string; file_path: string; file_name?: string }) => {
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
          // Skip files that fail to download - don't block the whole export
        }
      })
    )
  }

  // Generate ZIP as ArrayBuffer - directly accepted as BodyInit
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
