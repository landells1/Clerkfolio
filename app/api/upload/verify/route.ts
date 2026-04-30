import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import { hasValidMagicBytes } from '@/lib/upload/magic-bytes'

const BUCKET = 'evidence'

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const fileId = typeof body?.fileId === 'string' ? body.fileId : ''
  if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 })

  const { data: file, error: fileError } = await service
    .from('evidence_files')
    .select('id, user_id, file_path, mime_type')
    .eq('id', fileId)
    .eq('user_id', user.id)
    .single()

  if (fileError || !file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  await service
    .from('evidence_files')
    .update({ scan_status: 'scanning' })
    .eq('id', file.id)

  const { data: blob, error: downloadError } = await service.storage
    .from(BUCKET)
    .download(file.file_path)

  if (downloadError || !blob) {
    await service.from('evidence_files').update({ scan_status: 'quarantined', scan_provider: 'mime_only', scan_completed_at: new Date().toISOString() }).eq('id', file.id)
    return NextResponse.json({ error: 'Could not verify uploaded file' }, { status: 500 })
  }

  const bytes = new Uint8Array(await blob.slice(0, 512).arrayBuffer())
  const clean = file.mime_type ? hasValidMagicBytes(bytes, file.mime_type) : false
  const scanStatus = clean ? 'clean' : 'quarantined'

  await service
    .from('evidence_files')
    .update({ scan_status: scanStatus, scan_provider: 'mime_only', scan_completed_at: new Date().toISOString() })
    .eq('id', file.id)

  return NextResponse.json({ ok: clean, scan_status: scanStatus, scan_provider: 'mime_only' })
}
