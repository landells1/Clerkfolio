// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { formatFileSize, formatStorageUsed } from '@/lib/utils/file-size'

describe('formatFileSize (base-ten, matching the storage quota)', () => {
  it('formats bytes, KB, MB and GB', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1490)).toBe('1.5 KB')
    expect(formatFileSize(2_500_000)).toBe('2.5 MB')
    expect(formatFileSize(1_250_000_000)).toBe('1.25 GB')
  })

  it('gives the same answer the entry page and Files tab now share', () => {
    // A 1,490-byte PNG used to read 1.4 KB (1024-based) on the entry page.
    expect(formatFileSize(1490)).not.toBe('1.4 KB')
  })
})

describe('formatStorageUsed', () => {
  it('never shows a few kilobytes as 0.0 MB', () => {
    expect(formatStorageUsed(0.00149)).toBe('1.5 KB')
    expect(formatStorageUsed(0)).toBe('0 MB')
  })

  it('shows MB with one decimal under 100 MB and whole MB above', () => {
    expect(formatStorageUsed(12.34)).toBe('12.3 MB')
    expect(formatStorageUsed(250.6)).toBe('251 MB')
  })
})
