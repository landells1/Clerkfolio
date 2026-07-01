import { describe, it, expect } from 'vitest'
import { getSelectionProcess, getSelectionFamilyLabel } from '@/lib/specialties'
import type { SelectionProcessFamily, SpecialtyConfig } from '@/lib/specialties'

const ALL_FAMILIES: SelectionProcessFamily[] = [
  'self_assessment_points',
  'assessor_scored_written',
  'portfolio_graded_interview',
  'msra_interview',
  'msra_only',
  'multi_stage_selection_centre',
]

describe('getSelectionFamilyLabel', () => {
  it.each(ALL_FAMILIES)('returns a non-empty label for %s', family => {
    expect(getSelectionFamilyLabel(family).length).toBeGreaterThan(0)
  })
})

describe('getSelectionProcess', () => {
  it('returns undefined when a config has no selectionProcess', () => {
    const config = { key: 'x', domains: [] } as unknown as SpecialtyConfig
    expect(getSelectionProcess(config)).toBeUndefined()
  })

  it('passes the selectionProcess object through unchanged when present', () => {
    const selectionProcess = { family: 'msra_interview' as const, stages: [] }
    const config = { key: 'x', domains: [], selectionProcess } as unknown as SpecialtyConfig
    expect(getSelectionProcess(config)).toBe(selectionProcess)
  })
})
