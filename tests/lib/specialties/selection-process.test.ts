import { describe, it, expect } from 'vitest'
import {
  getSelectionProcess,
  getSelectionFamilyLabel,
  getPreInterview,
  getPreInterviewGateMeta,
  getPortfolioTimingNote,
  PRE_INTERVIEW_GATE_ORDER,
} from '@/lib/specialties'
import type { PreInterview, SelectionProcessFamily, SpecialtyConfig } from '@/lib/specialties'

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

describe('pre-interview gate helpers', () => {
  it('covers all six gates exactly once in the display order', () => {
    expect(new Set(PRE_INTERVIEW_GATE_ORDER).size).toBe(6)
  })

  it.each(PRE_INTERVIEW_GATE_ORDER)('returns non-empty meta without em dashes for %s', gate => {
    const meta = getPreInterviewGateMeta(gate)
    expect(meta.label.length).toBeGreaterThan(0)
    expect(meta.description.length).toBeGreaterThan(0)
    expect(meta.label.includes('—')).toBe(false)
    expect(meta.description.includes('—')).toBe(false)
  })

  it('returns undefined preInterview when a config has no selectionProcess', () => {
    const config = { key: 'x', domains: [] } as unknown as SpecialtyConfig
    expect(getPreInterview(config)).toBeUndefined()
  })

  it('returns no timing note when portfolio counts pre-interview', () => {
    const pre: PreInterview = { gate: 'self_assessment_rank', portfolioCountsPreInterview: true }
    expect(getPortfolioTimingNote(pre)).toBeNull()
  })

  it.each(['msra_rank', 'msra_is_selection', 'cognitive_tests', 'none_all_eligible'] as const)(
    'returns a subtle timing note for %s',
    gate => {
      const note = getPortfolioTimingNote({ gate, portfolioCountsPreInterview: false })
      expect(note).not.toBeNull()
      expect(note!.length).toBeGreaterThan(0)
      expect(note!.includes('—')).toBe(false)
    }
  )
})
