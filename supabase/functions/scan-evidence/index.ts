// Evidence scanner.
// If CLAMAV_TCP_HOST is configured, streams the uploaded file to a ClamAV daemon
// using the INSTREAM protocol. If not configured, falls back to MIME/magic-byte
// validation so uploads are not permanently stuck in pending during setup.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUCKET = 'evidence'
const CLAMAV_CHUNK_BYTES = 64 * 1024
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

function int32Bytes(value: number) {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, false)
  return bytes
}

async function scanWithClamAv(bytes: Uint8Array) {
  const host = Deno.env.get('CLAMAV_TCP_HOST')
  const port = Number(Deno.env.get('CLAMAV_TCP_PORT') ?? '3310')
  if (!host) return null
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('Invalid CLAMAV_TCP_PORT')
  }

  const connection = await Deno.connect({ hostname: host, port })
  try {
    const writer = connection.writable.getWriter()
    await writer.write(new TextEncoder().encode('zINSTREAM\0'))
    for (let offset = 0; offset < bytes.length; offset += CLAMAV_CHUNK_BYTES) {
      const chunk = bytes.slice(offset, offset + CLAMAV_CHUNK_BYTES)
      await writer.write(int32Bytes(chunk.length))
      await writer.write(chunk)
    }
    await writer.write(int32Bytes(0))
    writer.releaseLock()

    const response = await new Response(connection.readable).text()
    if (response.includes('OK')) return 'clean'
    if (response.includes('FOUND')) return 'quarantined'
    throw new Error(`Unexpected ClamAV response: ${response.slice(0, 200)}`)
  } finally {
    connection.close()
  }
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

  const fullBytes = blob ? new Uint8Array(await blob.arrayBuffer()) : new Uint8Array()
  const headerBytes = fullBytes.slice(0, 512)
  const contentMatchesMime = !downloadError && file.mime_type && hasValidMagicBytes(headerBytes, file.mime_type)
  const clamStatus = contentMatchesMime ? await scanWithClamAv(fullBytes) : null
  const scanStatus = contentMatchesMime ? (clamStatus ?? 'clean') : 'quarantined'
  const scanProvider = clamStatus ? 'clamav' : 'mime_only'

  const { error } = await service
    .from('evidence_files')
    .update({ scan_status: scanStatus, scan_provider: scanProvider, scan_completed_at: new Date().toISOString() })
    .eq('id', fileId)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify({ status: scanStatus, scan_provider: scanProvider }), { status: scanStatus === 'clean' ? 200 : 415 })
})
