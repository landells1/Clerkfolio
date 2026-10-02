// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { formatCompetencyTheme } from '@/lib/types/portfolio-labels'

describe('formatCompetencyTheme', () => {
  it('returns preset theme names unchanged', () => {
    expect(formatCompetencyTheme('Clinical Reasoning')).toBe('Clinical Reasoning')
  })

  it('uses the custom theme name exactly as the user typed it', () => {
    const custom = [{ slug: 'surgical-skills', name: 'Surgical skills' }, { slug: 'bma-work', name: 'BMA work' }]
    expect(formatCompetencyTheme('surgical-skills', custom)).toBe('Surgical skills')
    expect(formatCompetencyTheme('bma-work', custom)).toBe('BMA work')
  })

  it('falls back to sentence case (never Title Case) for an unknown slug', () => {
    expect(formatCompetencyTheme('surgical-skills')).toBe('Surgical skills')
    expect(formatCompetencyTheme('gbr_safe_working')).toBe('Gbr safe working')
  })
})
