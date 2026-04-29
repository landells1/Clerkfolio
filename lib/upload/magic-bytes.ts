export function hasValidMagicBytes(bytes: Uint8Array, mimeType: string) {
  const hex = Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('')
  const ascii = String.fromCharCode(...Array.from(bytes))
  const zipMagic = hex.startsWith('504b0304') || hex.startsWith('504b0506') || hex.startsWith('504b0708')
  const officeOpenXmlTypes = new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ])

  if (mimeType === 'application/pdf') return ascii.startsWith('%PDF')
  if (mimeType === 'image/png') return hex.startsWith('89504e470d0a1a0a')
  if (mimeType === 'image/jpeg') return hex.startsWith('ffd8ff')
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return ascii.slice(4, 8) === 'ftyp'
  if (mimeType === 'text/plain') return isProbablyUtf8Text(bytes)
  if (mimeType === 'application/msword') return hex.startsWith('d0cf11e0a1b11ae1')
  if (officeOpenXmlTypes.has(mimeType)) return zipMagic
  return false
}

function isProbablyUtf8Text(bytes: Uint8Array) {
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

export async function fileHasValidMagicBytes(file: File) {
  return hasValidMagicBytes(new Uint8Array(await file.slice(0, 512).arrayBuffer()), file.type)
}
