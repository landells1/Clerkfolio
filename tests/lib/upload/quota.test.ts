// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { checkFinalisedUploadSize } from '@/lib/upload/quota'

const MB = 1_000_000 // base-ten, matching storage_used_mb / quota units
const MAX_FILE_BYTES = 50 * 1024 * 1024

const check = (over: Partial<Parameters<typeof checkFinalisedUploadSize>[0]>) =>
  checkFinalisedUploadSize({
    actualBytes: 10 * MB,
    maxFileBytes: MAX_FILE_BYTES,
    usedBytes: 50 * MB,
    quotaBytes: 100 * MB,
    ...over,
  })

describe('checkFinalisedUploadSize', () => {
  it('accepts a file under the per-file cap and within quota', () => {
    expect(check({})).toEqual({ ok: true })
  })

  it('rejects when the real object size exceeds the per-file cap', () => {
    expect(check({ actualBytes: MAX_FILE_BYTES + 1 })).toEqual({
      ok: false,
      reason: 'file_too_large',
    })
  })

  it('allows a file exactly at the per-file cap', () => {
    expect(check({ actualBytes: MAX_FILE_BYTES })).toEqual({ ok: true })
  })

  it('rejects when the corrected total busts the quota', () => {
    // The declared-vs-actual attack: fileSize: 1 passed authorize, but the
    // real object pushes the reconciled total past the quota.
    expect(check({ usedBytes: 100 * MB + 1 })).toEqual({
      ok: false,
      reason: 'over_quota',
    })
  })

  it('allows a total exactly at the quota (same boundary as authorize)', () => {
    // authorize rejects only when usedBytes + fileSize > quotaBytes; the
    // reconciled check must not be stricter or honest users at the boundary
    // would pass authorize and then fail finalisation.
    expect(check({ usedBytes: 100 * MB })).toEqual({ ok: true })
  })

  it('prefers the per-file cap reason when both cap and quota are busted', () => {
    expect(
      check({ actualBytes: MAX_FILE_BYTES + 1, usedBytes: 200 * MB })
    ).toEqual({ ok: false, reason: 'file_too_large' })
  })
})
