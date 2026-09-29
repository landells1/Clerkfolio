import { describe, it, expect } from 'vitest'
import { includedPdfPhrase, pdfAllowance, pdfRemainingLabel, shareAllowance } from '@/lib/entitlements/allowance'
import { yearInReviewYear } from '@/lib/engagement/streaks'

const sub = (referralCount: number, pdfExportsUsed: number, shareLinksUsed = 0) => ({
  referralCount,
  usage: { pdfExportsUsed, shareLinksUsed, specialtiesTracked: 0, storageUsedMB: 0, studentGraduationDate: null },
})

describe('free allowance helpers', () => {
  it('grants 1 base plus 1 per rewarded referral', () => {
    expect(pdfAllowance(sub(0, 0))).toEqual({ allowed: 1, used: 0, remaining: 1 })
    expect(pdfAllowance(sub(2, 1))).toEqual({ allowed: 3, used: 1, remaining: 2 })
    expect(shareAllowance(sub(1, 0, 1))).toEqual({ allowed: 2, used: 1, remaining: 1 })
  })

  it('never reports negative remaining', () => {
    expect(pdfAllowance(sub(0, 4)).remaining).toBe(0)
  })

  it('pluralises labels', () => {
    expect(pdfRemainingLabel(sub(0, 0))).toBe('1 of 1 PDF remaining')
    expect(pdfRemainingLabel(sub(2, 1))).toBe('2 of 3 PDFs remaining')
    expect(includedPdfPhrase(1)).toBe('1 included PDF export')
    expect(includedPdfPhrase(3)).toBe('3 included PDF exports')
    expect(includedPdfPhrase(undefined)).toBe('1 included PDF export')
  })
})


describe('yearInReviewYear', () => {
  it('covers the previous year during UK January', () => {
    expect(yearInReviewYear(new Date('2027-01-02T09:00:00Z'))).toBe(2026)
    expect(yearInReviewYear(new Date('2027-01-31T23:30:00Z'))).toBe(2026)
  })
  it('covers the current year otherwise, in UK time', () => {
    expect(yearInReviewYear(new Date('2027-02-01T00:30:00Z'))).toBe(2027)
    expect(yearInReviewYear(new Date('2026-12-31T23:30:00Z'))).toBe(2026)
  })
})
