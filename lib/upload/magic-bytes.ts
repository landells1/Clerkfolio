export function hasValidMagicBytes(bytes: Uint8Array, mimeType: string) {
  const hex = Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('')
  const ascii = String.fromCharCode(...Array.from(bytes))

  if (mimeType === 'application/pdf') return ascii.startsWith('%PDF')
  if (mimeType === 'image/png') return hex.startsWith('89504e470d0a1a0a')
  if (mimeType === 'image/jpeg') return hex.startsWith('ffd8ff')
  if (mimeType === 'application/msword') return hex.startsWith('d0cf11e0a1b11ae1')
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return hex.startsWith('504b0304') || hex.startsWith('504b0506') || hex.startsWith('504b0708')
  }
  return false
}

export async function fileHasValidMagicBytes(file: File) {
  return hasValidMagicBytes(new Uint8Array(await file.slice(0, 16).arrayBuffer()), file.type)
}
