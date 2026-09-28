import { describe, it, expect } from 'vitest'
import {
  convertReflection,
  buildFrameworkText,
  parseFrameworkText,
  detectFramework,
  GIBBS_FIELDS,
} from '@/lib/portfolio/reflection-frameworks'

describe('reflection frameworks build/parse round-trip', () => {
  it('round-trips Gibbs parts through build -> parse', () => {
    const parts = {
      description: 'A patient deteriorated overnight.',
      feelings: 'Anxious but focused.',
      evaluation: 'Escalation was timely.',
      analysis: 'Early warning score prompted review.',
      conclusion: 'The system worked.',
      action_plan: 'Reinforce SBAR handover.',
    }
    const text = buildFrameworkText('gibbs', parts)
    expect(parseFrameworkText('gibbs', text)).toEqual(parts)
  })

  it('round-trips Rolfe parts', () => {
    const parts = { what: 'Missed cannula.', so_what: 'Delayed antibiotics.', now_what: 'Ask for help sooner.' }
    expect(parseFrameworkText('rolfe', buildFrameworkText('rolfe', parts))).toEqual(parts)
  })

  it('fills missing parts with empty strings on build', () => {
    const text = buildFrameworkText('gibbs', { description: 'Only this.' })
    const parsed = parseFrameworkText('gibbs', text)
    expect(parsed.description).toBe('Only this.')
    for (const f of GIBBS_FIELDS.slice(1)) expect(parsed[f.key]).toBe('')
  })
})

describe('detectFramework', () => {
  it('detects Gibbs by its distinctive labels', () => {
    expect(detectFramework(buildFrameworkText('gibbs', {}))).toBe('gibbs')
  })

  it('detects Rolfe/Driscoll shape as rolfe (they serialise identically)', () => {
    expect(detectFramework(buildFrameworkText('rolfe', {}))).toBe('rolfe')
    expect(detectFramework(buildFrameworkText('driscoll', {}))).toBe('rolfe')
  })

  it('returns none for free text', () => {
    expect(detectFramework('Just some reflective prose with no framework markers.')).toBe('none')
  })
})

describe('convertReflection', () => {
  it('moves free text into the first box of a framework and back without loss', () => {
    const toGibbs = convertReflection('none', 'I saw a patient deteriorate.', {}, 'gibbs')
    expect(toGibbs).toEqual({ freeText: '', parts: { description: 'I saw a patient deteriorate.' } })
    const back = convertReflection('gibbs', '', toGibbs.parts, 'none')
    expect(back.freeText).toContain('I saw a patient deteriorate.')
  })

  it('keeps Rolfe answers when switching to Driscoll (same fields)', () => {
    const parts = { what: 'A', so_what: 'B', now_what: 'C' }
    expect(convertReflection('rolfe', '', parts, 'driscoll').parts).toEqual(parts)
  })

  it('folds every answered Gibbs box into the new framework', () => {
    const out = convertReflection('gibbs', '', { description: 'D', action_plan: 'P' }, 'rolfe')
    expect(out.parts.what).toContain('Description D')
    expect(out.parts.what).toContain('Action Plan P')
  })

  it('does nothing when the text is empty', () => {
    expect(convertReflection('none', '', {}, 'gibbs')).toEqual({ freeText: '', parts: {} })
  })
})
