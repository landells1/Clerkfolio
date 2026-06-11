import { describe, it, expect } from 'vitest'
import { SPECIALTY_CONFIGS, isEvidenceBased } from '@/lib/specialties'

// Structural invariants over every specialty config (AUDIT-38). These ran as
// a scratch suite during the 2026-06-10 audit and caught the only two config
// bugs (IMT / ACCS-AM bonus points folded into the displayed total); they are
// committed so new or edited configs cannot silently violate the data model.
//
// Note on totalMax: it is the official DOMAIN maximum. Bonus points (e.g.
// IMT's 5-pt single-specialty commitment bonus) are awarded on top of it by
// the official matrices, so totalMax must equal the sum of domain maxima and
// must NOT include bonusOptions.

describe('specialty config invariants', () => {
  it('has unique specialty keys', () => {
    const keys = SPECIALTY_CONFIGS.map(c => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it.each(SPECIALTY_CONFIGS.map(c => [c.key, c] as const))('%s is structurally valid', (_key, config) => {
    // Source must be present so the UI's "Official criteria" link works.
    expect(config.source).toMatch(/^https?:\/\//)
    expect(config.sourceLabel.length).toBeGreaterThan(0)
    expect(config.cycleYear).toBeGreaterThanOrEqual(2026)

    // Domain keys unique within the config.
    const domainKeys = config.domains.map(d => d.key)
    expect(new Set(domainKeys).size).toBe(domainKeys.length)

    for (const domain of config.domains) {
      // Band labels unique within a domain.
      const bandLabels = domain.bands.map(b => b.label)
      expect(new Set(bandLabels).size).toBe(bandLabels.length)
      // No band can be worth more than the domain maximum.
      for (const band of domain.bands) {
        expect(band.points).toBeLessThanOrEqual(domain.maxPoints)
        expect(band.points).toBeGreaterThanOrEqual(0)
      }
    }

    if (isEvidenceBased(config)) {
      // Evidence-based configs don't score; every domain needs a criteria type.
      for (const domain of config.domains) {
        expect(domain.criteriaType, `${config.key}/${domain.key} missing criteriaType`).toBeDefined()
      }
    } else {
      // Points-based configs: totalMax must equal the sum of scored domain
      // maxima (essentials are gates, not points), excluding bonusOptions.
      const domainSum = config.domains
        .filter(d => d.criteriaType !== 'essential' && !d.isEvidenceOnly)
        .reduce((s, d) => s + d.maxPoints, 0)
      expect(domainSum, `${config.key}: totalMax should equal scored-domain sum (bonus excluded)`).toBe(config.totalMax)
    }

    if (config.applicationWindow) {
      const opens = new Date(config.applicationWindow.opensDate)
      const closes = new Date(config.applicationWindow.closesDate)
      expect(Number.isNaN(opens.getTime())).toBe(false)
      expect(Number.isNaN(closes.getTime())).toBe(false)
      expect(opens.getTime(), `${config.key}: window opens after it closes`).toBeLessThan(closes.getTime())
      expect(config.applicationWindow.source).toMatch(/^https?:\/\//)
    }

    if (config.bonusOptions) {
      const bonusKeys = config.bonusOptions.map(b => b.key)
      expect(new Set(bonusKeys).size).toBe(bonusKeys.length)
      for (const bonus of config.bonusOptions) {
        expect(bonus.points).toBeGreaterThan(0)
      }
    }
  })
})
