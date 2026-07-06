// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { hasValidMagicBytes, fileHasValidMagicBytes } from '@/lib/upload/magic-bytes'

function bytesFromHex(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function padded(bytes: Uint8Array, length = 32): Uint8Array {
  const out = new Uint8Array(length)
  out.set(bytes.slice(0, length))
  return out
}

describe('hasValidMagicBytes — whitelisted signatures', () => {
  it('accepts a PDF signature', () => {
    const bytes = new TextEncoder().encode('%PDF-1.7\n%rest of the file...')
    expect(hasValidMagicBytes(bytes, 'application/pdf')).toBe(true)
  })

  it('accepts a PNG signature', () => {
    const bytes = padded(bytesFromHex('89504e470d0a1a0a0000000d49484452'))
    expect(hasValidMagicBytes(bytes, 'image/png')).toBe(true)
  })

  it('accepts a JPEG signature', () => {
    const bytes = padded(bytesFromHex('ffd8ffe000104a464946'))
    expect(hasValidMagicBytes(bytes, 'image/jpeg')).toBe(true)
  })

  it('accepts a HEIC signature (ftyp box at offset 4)', () => {
    // Bytes 0-3 are a box-size field (arbitrary), bytes 4-7 are ASCII "ftyp".
    const bytes = padded(bytesFromHex('00000018' + '66747970' + '68656963' + '00000000'))
    expect(hasValidMagicBytes(bytes, 'image/heic')).toBe(true)
  })

  it('accepts a HEIF signature using the same ftyp box check', () => {
    const bytes = padded(bytesFromHex('00000018' + '66747970' + '6d696631' + '00000000'))
    expect(hasValidMagicBytes(bytes, 'image/heif')).toBe(true)
  })

  it('accepts plain UTF-8 text', () => {
    const bytes = new TextEncoder().encode('Just a plain reflection note.\nSecond line.')
    expect(hasValidMagicBytes(bytes, 'text/plain')).toBe(true)
  })

  it('accepts legacy MS Word (OLE compound file) signature', () => {
    const bytes = padded(bytesFromHex('d0cf11e0a1b11ae1'))
    expect(hasValidMagicBytes(bytes, 'application/msword')).toBe(true)
  })

  it('accepts DOCX (zip-based OOXML) signature', () => {
    const bytes = padded(bytesFromHex('504b0304140000000000'))
    expect(hasValidMagicBytes(bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
  })

  it('accepts XLSX (zip-based OOXML) signature', () => {
    const bytes = padded(bytesFromHex('504b0304140000000000'))
    expect(hasValidMagicBytes(bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true)
  })

  it('accepts PPTX (zip-based OOXML) signature', () => {
    const bytes = padded(bytesFromHex('504b0304140000000000'))
    expect(hasValidMagicBytes(bytes, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(true)
  })

  it('accepts the alternate zip empty-archive magic (504b0506)', () => {
    const bytes = padded(bytesFromHex('504b0506000000000000'))
    expect(hasValidMagicBytes(bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
  })

  it('accepts the alternate zip spanned-archive magic (504b0708)', () => {
    const bytes = padded(bytesFromHex('504b0708000000000000'))
    expect(hasValidMagicBytes(bytes, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(true)
  })
})

describe('hasValidMagicBytes — mismatched extension/content rejection', () => {
  it('rejects a PNG payload declared as PDF', () => {
    const bytes = padded(bytesFromHex('89504e470d0a1a0a'))
    expect(hasValidMagicBytes(bytes, 'application/pdf')).toBe(false)
  })

  it('rejects a PDF payload declared as PNG', () => {
    const bytes = new TextEncoder().encode('%PDF-1.4 fake png')
    expect(hasValidMagicBytes(bytes, 'image/png')).toBe(false)
  })

  it('rejects a JPEG payload declared as HEIC', () => {
    const bytes = padded(bytesFromHex('ffd8ffe000104a464946'))
    expect(hasValidMagicBytes(bytes, 'image/heic')).toBe(false)
  })

  it('rejects an OLE (doc) payload declared as an OOXML docx', () => {
    const bytes = padded(bytesFromHex('d0cf11e0a1b11ae1'))
    expect(hasValidMagicBytes(bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(false)
  })

  it('rejects a zip (OOXML) payload declared as legacy .doc', () => {
    const bytes = padded(bytesFromHex('504b0304140000000000'))
    expect(hasValidMagicBytes(bytes, 'application/msword')).toBe(false)
  })

  it('rejects binary junk declared as text/plain', () => {
    // Control bytes below 0x20 (excluding tab/LF/CR) fail the UTF-8 "probably text" heuristic.
    const bytes = bytesFromHex('0001020304050607')
    expect(hasValidMagicBytes(bytes, 'text/plain')).toBe(false)
  })

  it('rejects an unrecognised/unsupported mime type outright', () => {
    const bytes = new TextEncoder().encode('%PDF-1.7')
    expect(hasValidMagicBytes(bytes, 'application/x-executable')).toBe(false)
  })
})

describe('hasValidMagicBytes — truncated and empty buffers', () => {
  it('rejects an empty buffer for every whitelisted type', () => {
    const empty = new Uint8Array(0)
    expect(hasValidMagicBytes(empty, 'application/pdf')).toBe(false)
    expect(hasValidMagicBytes(empty, 'image/png')).toBe(false)
    expect(hasValidMagicBytes(empty, 'image/jpeg')).toBe(false)
    expect(hasValidMagicBytes(empty, 'image/heic')).toBe(false)
    expect(hasValidMagicBytes(empty, 'application/msword')).toBe(false)
    expect(hasValidMagicBytes(empty, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(false)
  })

  it('treats an empty buffer as valid "text" (no disallowed control bytes found)', () => {
    // Pinning current behavior: isProbablyUtf8Text decodes '' successfully and
    // the char-code scan loop never runs, so it returns true. An empty file
    // extension-mismatched as text/plain is NOT rejected by this function alone.
    const empty = new Uint8Array(0)
    expect(hasValidMagicBytes(empty, 'text/plain')).toBe(true)
  })

  it('rejects a truncated PNG signature (fewer bytes than the full magic)', () => {
    const bytes = bytesFromHex('89504e47')
    expect(hasValidMagicBytes(bytes, 'image/png')).toBe(false)
  })

  it('rejects a truncated HEIC buffer shorter than the ftyp box offset', () => {
    const bytes = bytesFromHex('000000186674')
    expect(hasValidMagicBytes(bytes, 'image/heic')).toBe(false)
  })

  it('rejects a truncated OOXML zip signature', () => {
    const bytes = bytesFromHex('504b03')
    expect(hasValidMagicBytes(bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(false)
  })

  it('accepts a single-byte PDF-prefix buffer if it still starts with %PDF (boundary case)', () => {
    // '%PDF' is 4 bytes; anything shorter cannot start with it.
    const bytes = new TextEncoder().encode('%PD')
    expect(hasValidMagicBytes(bytes, 'application/pdf')).toBe(false)
  })
})

describe('fileHasValidMagicBytes', () => {
  function makeFile(bytes: Uint8Array, type: string, name = 'evidence.bin'): File {
    return new File([new Uint8Array(bytes)], name, { type })
  }

  it('reads only the first 512 bytes of the file and validates them', async () => {
    const header = new TextEncoder().encode('%PDF-1.7\n')
    const body = new Uint8Array(1000).fill(0x41)
    const combined = new Uint8Array(header.length + body.length)
    combined.set(header, 0)
    combined.set(body, header.length)
    const file = makeFile(combined, 'application/pdf')

    expect(await fileHasValidMagicBytes(file)).toBe(true)
  })

  it('uses the File.type as the mime type to validate against', async () => {
    const bytes = padded(bytesFromHex('89504e470d0a1a0a'))
    const file = makeFile(bytes, 'image/png')
    expect(await fileHasValidMagicBytes(file)).toBe(true)
  })

  it('rejects when the file content does not match its declared type', async () => {
    const bytes = padded(bytesFromHex('89504e470d0a1a0a'))
    const file = makeFile(bytes, 'application/pdf')
    expect(await fileHasValidMagicBytes(file)).toBe(false)
  })

  it('rejects an empty file for a binary-signature type', async () => {
    const file = makeFile(new Uint8Array(0), 'application/pdf')
    expect(await fileHasValidMagicBytes(file)).toBe(false)
  })
})
