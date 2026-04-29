// TODO: ADD REAL CLAMAV SCANNING BEFORE PUBLIC LAUNCH.
// Interim scanner: verifies stored file contents match the recorded MIME type
// before marking evidence clean. Files that fail validation are quarantined.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUCKET = 'evidence'
const OFFICE_OPEN_XML = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

function hex(bytes: Uint8Array) {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function isText(bytes: Uint8Array) {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i)
      if (code === 9 || code === 10 || code === 13) continue
      if (code < 32) return false
    }
    return true
  } catch {
    return false
  }
}

function hasValidMagicBytes(bytes: Uint8Array, mimeType: string) {
  const signature = hex(bytes)
  const ascii = String.fromCharCode(...Array.from(bytes))
  const zipMagic = signature.startsWith('504b0304') || signature.startsWith('504b0506') || signature.startsWith('504b0708')

  if (mimeType === 'application/pdf') return ascii.startsWith('%PDF')
  if (mimeType === 'image/png') return signature.startsWith('89504e470d0a1a0a')
  if (mimeType === 'image/jpeg') return signature.startsWith('ffd8ff')
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return ascii.slice(4, 8) === 'ftyp'
  if (mimeType === 'text/plain') return isText(bytes)
  if (mimeType === 'application/msword') return signature.startsWith('d0cf11e0a1b11ae1')
  if (OFFICE_OPEN_XML.has(mimeType)) return zipMagic
  return false
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { fileId } = await req.json().catch(() => ({ fileId: null }))
  if (typeof fileId !== 'string' || !fileId) {
    return new Response(JSON.stringify({ error: 'fileId required' }), { status: 400 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const service = createClient(supabaseUrl, serviceRoleKey)
  const { data: file, error: fileError } = await service
    .from('evidence_files')
    .select('id, user_id, file_path, mime_type')
    .eq('id', fileId)
    .single()

  if (fileError || !file || file.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'File not found' }), { status: 404 })
  }

  const { data: blob, error: downloadError } = await service.storage
    .from(BUCKET)
    .download(file.file_path)

  const bytes = blob ? new Uint8Array(await blob.slice(0, 512).arrayBuffer()) : new Uint8Array()
  const clean = !downloadError && file.mime_type && hasValidMagicBytes(bytes, file.mime_type)
  const scanStatus = clean ? 'clean' : 'quarantined'

  const { error } = await service
    .from('evidence_files')
    .update({ scan_status: scanStatus, scan_completed_at: new Date().toISOString() })
    .eq('id', fileId)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify({ status: scanStatus }), { status: clean ? 200 : 415 })
})
