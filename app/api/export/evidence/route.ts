import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entryId = req.nextUrl.searchParams.get('entry_id')
  if (!entryId) return NextResponse.json({ error: 'entry_id required' }, { status: 400 })

  // Verify the entry belongs to the authenticated user before serving evidence
  let entryType: 'portfolio' | 'case' | null = null
  const { data: portfolioEntry } = await supabase
    .from('portfolio_entries')
    .select('id')
    .eq('id', entryId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  const { data: caseEntry } = portfolioEntry
    ? { data: null }
    : await supabase
        .from('cases')
        .select('id')
        .eq('id', entryId)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle()
  if (portfolioEntry) entryType = 'portfolio'
  if (caseEntry) entryType = 'case'
  if (!portfolioEntry && !caseEntry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const { data: files, error } = await supabase
    .from('evidence_files')
    .select('file_path, file_name')
    .eq('user_id', user.id)
    .eq('entry_id', entryId)
    .eq('entry_type', entryType)
    .eq('scan_status', 'clean')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!files?.length) return NextResponse.json({ error: 'No clean evidence files found for this entry.' }, { status: 404 })

  const zip = new JSZip()
  await Promise.allSettled(files.map(async file => {
    const { data } = await supabase.storage.from('evidence').download(file.file_path)
    if (!data) return
    zip.file(file.file_name ?? file.file_path.split('/').pop() ?? 'evidence-file', await data.arrayBuffer())
  }))

  const buffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="clerkfolio-evidence-${entryId}.zip"`,
    },
  })
}
