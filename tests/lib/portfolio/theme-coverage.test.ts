import { describe, it, expect } from 'vitest'
import { buildThemeCoverage } from '@/lib/portfolio/theme-coverage'
import { COMPETENCY_THEMES } from '@/lib/constants/competency-themes'

describe('buildThemeCoverage', () => {
  it('always includes every preset theme, zero counts shown plainly', () => {
    const rows = buildThemeCoverage([], [])
    expect(rows.map(r => r.slug)).toEqual([...COMPETENCY_THEMES])
    expect(rows.every(r => r.count === 0)).toBe(true)
    expect(rows.every(r => r.isCustom === false)).toBe(true)
  })

  it('tallies across entries and cases together', () => {
    const entries = [
      { interview_themes: ['Leadership', 'Teaching'] },
      { interview_themes: ['Leadership'] },
    ]
    const cases = [
      { interview_themes: ['Leadership'] },
      { interview_themes: null },
    ]
    const rows = buildThemeCoverage(entries, cases)
    const leadership = rows.find(r => r.slug === 'Leadership')
    const teaching = rows.find(r => r.slug === 'Teaching')
    const research = rows.find(r => r.slug === 'Research')
    expect(leadership?.count).toBe(3)
    expect(teaching?.count).toBe(1)
    expect(research?.count).toBe(0)
  })

  it('appends custom themes after presets, tallied by slug', () => {
    const entries = [{ interview_themes: ['gbr-safe-working'] }]
    const rows = buildThemeCoverage(entries, [], [
      { slug: 'gbr-safe-working', name: 'GBR Safe Working' },
      { slug: 'unused-theme', name: 'Unused Theme' },
    ])
    expect(rows).toHaveLength(COMPETENCY_THEMES.length + 2)
    const custom = rows.find(r => r.slug === 'gbr-safe-working')
    expect(custom).toEqual({ slug: 'gbr-safe-working', label: 'GBR Safe Working', count: 1, isCustom: true })
    const unused = rows.find(r => r.slug === 'unused-theme')
    expect(unused?.count).toBe(0)
    expect(unused?.isCustom).toBe(true)
  })

  it('treats a missing interview_themes array as no tags', () => {
    const rows = buildThemeCoverage([{}], [{}])
    expect(rows.every(r => r.count === 0)).toBe(true)
  })
})
