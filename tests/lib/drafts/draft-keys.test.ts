// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isPortfolioDraftKey, portfolioDraftHasContent, portfolioDraftKeysFor } from '@/lib/drafts/draft-keys'

const USER = 'user-123'

describe('isPortfolioDraftKey', () => {
  it('matches a portfolio category draft for the user', () => {
    expect(isPortfolioDraftKey(`clerkfolio-audit_qip-draft:${USER}`, USER)).toBe(true)
    expect(isPortfolioDraftKey(`clerkfolio-conference-draft:${USER}`, USER)).toBe(true)
  })

  it('excludes the separate case draft', () => {
    expect(isPortfolioDraftKey(`clerkfolio-case-draft:${USER}`, USER)).toBe(false)
  })

  it('excludes other users drafts', () => {
    expect(isPortfolioDraftKey('clerkfolio-audit_qip-draft:someone-else', USER)).toBe(false)
  })

  it('ignores unrelated storage keys', () => {
    expect(isPortfolioDraftKey('sb-access-token', USER)).toBe(false)
    expect(isPortfolioDraftKey(`clerkfolio-theme:${USER}`, USER)).toBe(false)
  })
})

describe('portfolioDraftKeysFor', () => {
  it('returns every stale portfolio draft fragment for the user (BUG-005)', () => {
    const keys = [
      `clerkfolio-audit_qip-draft:${USER}`,
      `clerkfolio-conference-draft:${USER}`,
      `clerkfolio-case-draft:${USER}`,
      'clerkfolio-teaching-draft:other-user',
      'sb-access-token',
    ]
    expect(portfolioDraftKeysFor(keys, USER)).toEqual([
      `clerkfolio-audit_qip-draft:${USER}`,
      `clerkfolio-conference-draft:${USER}`,
    ])
  })
})

describe('portfolioDraftHasContent (BUG-005)', () => {
  // The shape an untouched new-entry form autosaves: category + the selects that
  // default to a real option + the auto-filled date, everything else empty.
  const pristine = {
    category: 'audit_qip',
    title: '',
    date: '2026-06-09',
    specialtyTags: [],
    interviewThemes: [],
    auditType: 'audit',
    auditRole: '',
    confType: 'conference',
    reflFramework: 'none',
    _expires: Date.now() + 1000,
  }

  it('treats a pristine default-only draft as empty', () => {
    expect(portfolioDraftHasContent(pristine)).toBe(false)
  })

  it('ignores the auto-filled date on its own', () => {
    expect(portfolioDraftHasContent({ ...pristine, date: '2027-01-01' })).toBe(false)
  })

  it('detects a typed title', () => {
    expect(portfolioDraftHasContent({ ...pristine, title: 'My audit' })).toBe(true)
  })

  it('detects a free-text field other than the defaults', () => {
    expect(portfolioDraftHasContent({ ...pristine, auditRole: 'Lead' })).toBe(true)
  })

  it('detects added specialty tags', () => {
    expect(portfolioDraftHasContent({ ...pristine, specialtyTags: ['imt_2026'] })).toBe(true)
  })

  it('ignores whitespace-only text', () => {
    expect(portfolioDraftHasContent({ ...pristine, title: '   ' })).toBe(false)
  })
})
