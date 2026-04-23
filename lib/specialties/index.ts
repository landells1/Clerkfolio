import { IMT_2026 } from './imt-2026'
import { OPHTHALMOLOGY_ST1_2026 } from './ophthalmology-st1-2026'
import type { SpecialtyConfig, SpecialtyDomain, SpecialtyApplication, SpecialtyEntryLink } from './types'

export const SPECIALTY_CONFIGS: SpecialtyConfig[] = [IMT_2026, OPHTHALMOLOGY_ST1_2026]

export function getSpecialtyConfig(key: string): SpecialtyConfig | undefined {
  return SPECIALTY_CONFIGS.find(s => s.key === key)
}

export function calculateDomainScore(domain: SpecialtyDomain, links: SpecialtyEntryLink[]): number {
  const domainLinks = links.filter(l => l.domain_key === domain.key)
  if (domainLinks.length === 0) return 0
  if (domain.isSelfAssessed || domain.isCheckbox) {
    const total = domainLinks.reduce((s, l) => s + l.points_claimed, 0)
    return Math.min(total, domain.maxPoints)
  }
  if (domain.scoringRule === 'highest') {
    return Math.min(Math.max(...domainLinks.map(l => l.points_claimed)), domain.maxPoints)
  }
  // cumulative_capped
  const total = domainLinks.reduce((s, l) => s + l.points_claimed, 0)
  return Math.min(total, domain.maxPoints)
}

export function calculateTotalScore(
  config: SpecialtyConfig,
  application: SpecialtyApplication,
  links: SpecialtyEntryLink[]
): number {
  const domainTotal = config.domains.reduce((s, d) => s + calculateDomainScore(d, links), 0)
  const bonusTotal = application.bonus_claimed
    ? (config.bonusOptions?.reduce((s, b) => s + b.points, 0) ?? 0)
    : 0
  return domainTotal + bonusTotal
}

export * from './types'
