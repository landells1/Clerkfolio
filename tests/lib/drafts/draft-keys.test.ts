// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isPortfolioDraftKey, portfolioDraftKeysFor } from '@/lib/drafts/draft-keys'

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
