import { describe, it, expect } from 'vitest'
import { SPECIALTY_CONFIGS, isEvidenceBased } from '@/lib/specialties'
import type { PreInterviewGate } from '@/lib/specialties'

// Structural invariants over every specialty config (AUDIT-38). These ran as
// a scratch suite during the 2026-06-10 audit and caught the only two config
// bugs (IMT / ACCS-AM bonus points folded into the displayed total); they are
// committed so new or edited configs cannot silently violate the data model.
//
// Note on totalMax: it is the official DOMAIN maximum. Bonus points (e.g.
// IMT's 5-pt single-specialty commitment bonus) are awarded on top of it by
// the official matrices, so totalMax must equal the sum of domain maxima and
// must NOT include bonusOptions.

// Higher-specialty (ST3/ST4) configs were removed - Clerkfolio's users are
// FY1/FY2 doctors applying to ST1/CT1 entry-level programmes only. Pinning
// this denylist (rather than an exact config count) catches an accidental
// re-addition without being brittle against future entry-level additions.
const REMOVED_HIGHER_SPECIALTY_KEYS = [
  'plastic_surgery_st3_2026',
  'cardiology_st4_2026',
  'to_st3_2026',
  'dermatology_st3_2026',
  'em_st4_2026',
  'general_surgery_st3_2026',
]

// Pre-interview gate group membership (the six-group "getting in the door"
// taxonomy, 2026 cycle). Pinned exactly so a config cannot silently change
// shortlisting group without the test being updated alongside the re-verified
// official source.
const EXPECTED_GATE_GROUPS: Record<PreInterviewGate, string[]> = {
  self_assessment_rank: ['imt_2026', 'accs_am_2026', 'histopathology_st1_2026', 'cardiothoracic_st1_2026'],
  assessor_scored_written: ['paediatrics_st1_2026'],
  msra_rank: [
    'radiology_st1_2026',
    'cst_2026',
    'anaesthetics_ct1_2026',
    'accs_anaes_2026',
    'og_st1_2026',
    'ophthalmology_st1_2026',
    'neurosurgery_st1_2026',
    'accs_em_2026',
    'csrh_st1_2026',
  ],
  msra_is_selection: ['gp_st1_2026', 'core_psych_2026', 'child_adolescent_psych_st1_2026', 'psych_learning_disability_st1_2026'],
  cognitive_tests: ['public_health_st1_2026', 'ph_gp_dual_st1_2026'],
  none_all_eligible: ['omfs_st1_2026'],
}

// Official points totals pinned per matrix so a band edit that shifts a
// domain maximum cannot slip through the generic sum check unnoticed.
const EXPECTED_TOTAL_MAX: Record<string, number> = {
  imt_2026: 30,
  accs_am_2026: 30,
  histopathology_st1_2026: 71,
  radiology_st1_2026: 24,
  cardiothoracic_st1_2026: 59,
}

// The staleness tripwire window. Sources are re-verified once per recruitment
// cycle (see SPECIALTY-REFRESH.md); 18 months leaves headroom for one annual
// refresh, so this failing means a full cycle's re-verification was skipped.
// That failure is deliberate - refresh the data, don't widen the window.
const STALENESS_LIMIT_MONTHS = 18

describe('specialty config invariants', () => {
  it('has unique specialty keys', () => {
    const keys = SPECIALTY_CONFIGS.map(c => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('does not contain any removed higher-specialty (ST3/ST4) configs', () => {
    const keys = SPECIALTY_CONFIGS.map(c => c.key)
    for (const removed of REMOVED_HIGHER_SPECIALTY_KEYS) {
      expect(keys).not.toContain(removed)
    }
  })

  it('assigns every config to exactly its expected pre-interview gate group', () => {
    const expectedAll = Object.values(EXPECTED_GATE_GROUPS).flat().sort()
    const actualAll = SPECIALTY_CONFIGS.map(c => c.key).sort()
    // Every config is in exactly one expected group, and no group names a
    // config that no longer exists.
    expect(actualAll).toEqual(expectedAll)

    for (const [gate, keys] of Object.entries(EXPECTED_GATE_GROUPS)) {
      for (const key of keys) {
        const config = SPECIALTY_CONFIGS.find(c => c.key === key)
        expect(config?.selectionProcess?.preInterview?.gate, `${key} gate`).toBe(gate)
      }
    }
  })

  it('marks portfolioCountsPreInterview true only for the self-scored and assessor-scored gates', () => {
    for (const config of SPECIALTY_CONFIGS) {
      const pre = config.selectionProcess?.preInterview
      expect(pre, `${config.key} missing preInterview`).toBeDefined()
      if (!pre) continue
      const shouldCount = pre.gate === 'self_assessment_rank' || pre.gate === 'assessor_scored_written'
      expect(pre.portfolioCountsPreInterview, `${config.key} portfolioCountsPreInterview`).toBe(shouldCount)
    }
  })

  it.each(Object.entries(EXPECTED_TOTAL_MAX))('%s keeps its official totalMax of %d', (key, totalMax) => {
    const config = SPECIALTY_CONFIGS.find(c => c.key === key)
    expect(config?.totalMax).toBe(totalMax)
    expect(config && isEvidenceBased(config)).toBe(false)
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

    if (config.bonusOptions) {
      const bonusKeys = config.bonusOptions.map(b => b.key)
      expect(new Set(bonusKeys).size).toBe(bonusKeys.length)
      for (const bonus of config.bonusOptions) {
        expect(bonus.points).toBeGreaterThan(0)
      }
    }

    // Provenance: every config must carry at least one official citation, and
    // lastVerified must be a real, past, non-stale date (the annual-refresh
    // tripwire - see SPECIALTY-REFRESH.md before touching STALENESS_LIMIT_MONTHS).
    expect(config.sources, `${config.key} missing sources`).toBeDefined()
    expect(config.sources!.length).toBeGreaterThan(0)
    const staleCutoff = new Date()
    staleCutoff.setMonth(staleCutoff.getMonth() - STALENESS_LIMIT_MONTHS)
    for (const source of config.sources!) {
      expect(source.url, `${config.key} source url`).toMatch(/^https:\/\//)
      expect(source.claim.length, `${config.key} source claim`).toBeGreaterThan(0)
      expect(source.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const verified = new Date(source.lastVerified)
      expect(Number.isNaN(verified.getTime()), `${config.key} lastVerified parses`).toBe(false)
      expect(verified.getTime(), `${config.key} lastVerified is in the future`).toBeLessThanOrEqual(Date.now())
      expect(verified.getTime(), `${config.key}/${source.url} lastVerified is stale (>${STALENESS_LIMIT_MONTHS} months) - run the SPECIALTY-REFRESH.md playbook`).toBeGreaterThanOrEqual(staleCutoff.getTime())
    }

    // Owner decision (2026-07-02): no em dashes in any user-visible copy.
    const visibleText = [
      config.name,
      config.sourceLabel,
      ...config.domains.flatMap(d => [d.label, d.notes ?? '', ...d.bands.map(b => b.label)]),
      ...(config.bonusOptions?.map(b => b.label) ?? []),
      ...(config.selectionProcess?.stages.flatMap(s => [s.label, s.notes ?? '', s.weightLabel ?? '']) ?? []),
      config.selectionProcess?.preInterview?.cutoffNotes ?? '',
      ...(config.sources?.map(s => s.claim) ?? []),
    ].join('\n')
    expect(visibleText.includes('—'), `${config.key} contains an em dash`).toBe(false)

    if (config.selectionProcess) {
      const sp = config.selectionProcess
      const stageKeys = sp.stages.map(s => s.key)
      expect(new Set(stageKeys).size, `${config.key}: duplicate selectionProcess stage keys`).toBe(stageKeys.length)

      // If every stage declares a weightPct, they should sum to ~100 - a
      // tolerance (not exact) because some official splits are derived from
      // point totals rather than clean percentages, but this still catches a
      // real typo (e.g. 30/60 instead of 33/67).
      const allWeighted = sp.stages.length > 0 && sp.stages.every(s => s.weightPct !== undefined)
      if (allWeighted) {
        const sum = sp.stages.reduce((s, st) => s + (st.weightPct ?? 0), 0)
        expect(sum, `${config.key}: selectionProcess stage weightPct sum should be ~100`).toBeGreaterThanOrEqual(95)
        expect(sum).toBeLessThanOrEqual(105)
      }

      if (sp.recruitmentOffice) {
        expect(sp.recruitmentOffice.url).toMatch(/^https?:\/\//)
        expect(sp.recruitmentOffice.name.length).toBeGreaterThan(0)
      }
    }
  })
})
