// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  calculateDomainScore,
  calculateTotalScore,
  isEvidenceBased,
  getEssentialDomains,
  getDesirableDomains,
  countEssentialsMet,
  countDesirablesEvidenced,
  getEvidenceProgress,
  formatSpecialtyLabel,
  getSpecialtyConfig,
} from '@/lib/specialties'
import type { SpecialtyConfig, SpecialtyDomain, SpecialtyApplication, SpecialtyEntryLink } from '@/lib/specialties'

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeDomain(overrides: Partial<SpecialtyDomain> = {}): SpecialtyDomain {
  return {
    key: 'd1',
    label: 'Test Domain',
    maxPoints: 10,
    scoringRule: 'cumulative_capped',
    bands: [{ label: 'Band A', points: 5 }, { label: 'Band B', points: 3 }],
    ...overrides,
  }
}

function makeLink(domainKey: string, points: number): SpecialtyEntryLink {
  return {
    id: `link-${Math.random()}`,
    application_id: 'app-1',
    domain_key: domainKey,
    entry_id: 'entry-1',
    entry_type: 'portfolio',
    band_label: 'Band A',
    points_claimed: points,
    is_checkbox: false,
    created_at: '2026-01-01T00:00:00Z',
  }
}

function makePointsConfig(domains: SpecialtyDomain[]): SpecialtyConfig {
  return {
    key: 'test_2026',
    name: 'Test Specialty',
    cycleYear: 2026,
    totalMax: 30,
    source: 'https://example.com',
    sourceLabel: 'Test',
    isOfficial: true,
    scoringType: 'points',
    domains,
  }
}

function makeApplication(overrides: Partial<SpecialtyApplication> = {}): SpecialtyApplication {
  return {
    id: 'app-1',
    user_id: 'user-1',
    specialty_key: 'test_2026',
    cycle_year: 2026,
    bonus_claimed: false,
    created_at: '2026-01-01T00:00:00Z',
    is_active: true,
    archived_at: null,
    ...overrides,
  }
}

// ─── calculateDomainScore ────────────────────────────────────────────────────

describe('calculateDomainScore', () => {
  it('returns 0 when no links are present', () => {
    const domain = makeDomain({ key: 'd1', maxPoints: 10, scoringRule: 'cumulative_capped' })
    expect(calculateDomainScore(domain, [])).toBe(0)
  })

  it('returns 0 for evidence-only domains (isEvidenceOnly)', () => {
    const domain = makeDomain({ key: 'd1', maxPoints: 10, isEvidenceOnly: true })
    expect(calculateDomainScore(domain, [makeLink('d1', 5)])).toBe(0)
  })

  it('cumulative_capped: sums points and caps at maxPoints', () => {
    const domain = makeDomain({ key: 'd1', maxPoints: 8, scoringRule: 'cumulative_capped' })
    const links = [makeLink('d1', 5), makeLink('d1', 5)]
    expect(calculateDomainScore(domain, links)).toBe(8) // 10 capped to 8
  })

  it('cumulative_capped: does not exceed zero when under cap', () => {
    const domain = makeDomain({ key: 'd1', maxPoints: 10, scoringRule: 'cumulative_capped' })
    const links = [makeLink('d1', 3), makeLink('d1', 4)]
    expect(calculateDomainScore(domain, links)).toBe(7)
  })

  it('highest: takes the max single link, caps at maxPoints', () => {
    const domain = makeDomain({ key: 'd1', maxPoints: 6, scoringRule: 'highest' })
    const links = [makeLink('d1', 3), makeLink('d1', 8), makeLink('d1', 4)]
    expect(calculateDomainScore(domain, links)).toBe(6) // 8 capped to 6
  })

  it('highest: returns the single link value when it is under the cap', () => {
    const domain = makeDomain({ key: 'd1', maxPoints: 10, scoringRule: 'highest' })
    const links = [makeLink('d1', 4), makeLink('d1', 2)]
    expect(calculateDomainScore(domain, links)).toBe(4)
  })

  it('isSelfAssessed: sums and caps like cumulative_capped', () => {
    const domain = makeDomain({ key: 'd1', maxPoints: 5, isSelfAssessed: true })
    const links = [makeLink('d1', 3), makeLink('d1', 4)]
    expect(calculateDomainScore(domain, links)).toBe(5) // 7 capped to 5
  })

  it('ignores links belonging to a different domain', () => {
    const domain = makeDomain({ key: 'd1', maxPoints: 10, scoringRule: 'cumulative_capped' })
    const links = [makeLink('other', 5), makeLink('other', 5)]
    expect(calculateDomainScore(domain, links)).toBe(0)
  })
})

// ─── calculateTotalScore ─────────────────────────────────────────────────────

describe('calculateTotalScore', () => {
  it('sums scores across domains', () => {
    const config = makePointsConfig([
      makeDomain({ key: 'd1', maxPoints: 5, scoringRule: 'highest' }),
      makeDomain({ key: 'd2', maxPoints: 5, scoringRule: 'highest' }),
    ])
    const links = [makeLink('d1', 4), makeLink('d2', 3)]
    expect(calculateTotalScore(config, makeApplication(), links)).toBe(7)
  })

  it('adds bonusOptions total when bonus_claimed is true', () => {
    const config = makePointsConfig([makeDomain({ key: 'd1', maxPoints: 5, scoringRule: 'highest' })])
    config.bonusOptions = [{ key: 'b1', label: 'Bonus', points: 5 }]
    const links = [makeLink('d1', 3)]
    const app = makeApplication({ bonus_claimed: true })
    expect(calculateTotalScore(config, app, links)).toBe(8)
  })

  it('does not add bonus when bonus_claimed is false', () => {
    const config = makePointsConfig([makeDomain({ key: 'd1', maxPoints: 5, scoringRule: 'highest' })])
    config.bonusOptions = [{ key: 'b1', label: 'Bonus', points: 5 }]
    const links = [makeLink('d1', 3)]
    expect(calculateTotalScore(config, makeApplication(), links)).toBe(3)
  })

  it('returns 0 for evidence-based configs (no numeric total)', () => {
    const config = makePointsConfig([makeDomain({ key: 'd1', maxPoints: 0, scoringRule: 'highest' })])
    config.scoringType = 'evidence'
    const links = [makeLink('d1', 5)]
    expect(calculateTotalScore(config, makeApplication(), links)).toBe(0)
  })
})

// ─── Evidence-based specialty helpers ────────────────────────────────────────

describe('isEvidenceBased', () => {
  it('returns true for scoringType evidence', () => {
    const config = makePointsConfig([])
    config.scoringType = 'evidence'
    expect(isEvidenceBased(config)).toBe(true)
  })

  it('returns true for legacy isEvidenceOnly flag', () => {
    const config = makePointsConfig([])
    config.isEvidenceOnly = true
    expect(isEvidenceBased(config)).toBe(true)
  })

  it('returns false for points-based configs', () => {
    expect(isEvidenceBased(makePointsConfig([]))).toBe(false)
  })
})

describe('getEssentialDomains / getDesirableDomains', () => {
  const config = makePointsConfig([
    makeDomain({ key: 'e1', criteriaType: 'essential' }),
    makeDomain({ key: 'e2', criteriaType: 'essential' }),
    makeDomain({ key: 'd1', criteriaType: 'desirable' }),
  ])

  it('returns only essential domains', () => {
    const essentials = getEssentialDomains(config)
    expect(essentials.map(d => d.key)).toEqual(['e1', 'e2'])
  })

  it('returns only desirable domains', () => {
    const desirables = getDesirableDomains(config)
    expect(desirables.map(d => d.key)).toEqual(['d1'])
  })
})

describe('countEssentialsMet / countDesirablesEvidenced', () => {
  const config = makePointsConfig([
    makeDomain({ key: 'e1', criteriaType: 'essential' }),
    makeDomain({ key: 'e2', criteriaType: 'essential' }),
    makeDomain({ key: 'd1', criteriaType: 'desirable' }),
    makeDomain({ key: 'd2', criteriaType: 'desirable' }),
  ])

  it('counts essentials that have at least one link', () => {
    const links = [makeLink('e1', 0)]
    expect(countEssentialsMet(config, links)).toBe(1)
  })

  it('counts desirables that have at least one link', () => {
    const links = [makeLink('d1', 5), makeLink('d2', 3)]
    expect(countDesirablesEvidenced(config, links)).toBe(2)
  })

  it('returns 0 when no links present', () => {
    expect(countEssentialsMet(config, [])).toBe(0)
    expect(countDesirablesEvidenced(config, [])).toBe(0)
  })
})

describe('getEvidenceProgress', () => {
  it('returns totals and met counts', () => {
    const config = makePointsConfig([
      makeDomain({ key: 'e1', criteriaType: 'essential' }),
      makeDomain({ key: 'e2', criteriaType: 'essential' }),
      makeDomain({ key: 'd1', criteriaType: 'desirable' }),
    ])
    const links = [makeLink('e1', 0)]
    const progress = getEvidenceProgress(config, links)
    expect(progress.essentialsTotal).toBe(2)
    expect(progress.essentialsMet).toBe(1)
    expect(progress.desirablesTotal).toBe(1)
    expect(progress.desirablesEvidenced).toBe(0)
  })
})

// ─── formatSpecialtyLabel ─────────────────────────────────────────────────────

describe('formatSpecialtyLabel', () => {
  it('returns the config name for a known key', () => {
    expect(formatSpecialtyLabel('imt_2026')).toBe('Internal Medicine Training (IMT)')
  })

  it('returns "Specialty" for null/undefined', () => {
    expect(formatSpecialtyLabel(null)).toBe('Specialty')
    expect(formatSpecialtyLabel(undefined)).toBe('Specialty')
  })

  it('capitalises words from unknown slugs', () => {
    const label = formatSpecialtyLabel('some_unknown_specialty')
    expect(label).toMatch(/Some Unknown Specialty/)
  })

  it('uppercases known acronyms in unknown slugs', () => {
    expect(formatSpecialtyLabel('accs_em_programme')).toContain('ACCS')
    expect(formatSpecialtyLabel('accs_em_programme')).toContain('EM')
  })
})

// ─── getSpecialtyConfig ───────────────────────────────────────────────────────

describe('getSpecialtyConfig', () => {
  it('returns a config for imt_2026', () => {
    const config = getSpecialtyConfig('imt_2026')
    expect(config).toBeDefined()
    expect(config?.key).toBe('imt_2026')
    expect(config?.name).toBe('Internal Medicine Training (IMT)')
  })

  it('returns undefined for an unknown key', () => {
    expect(getSpecialtyConfig('does_not_exist')).toBeUndefined()
  })
})
