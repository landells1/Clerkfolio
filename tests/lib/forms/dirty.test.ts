// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { formSnapshot, isFormDirty } from '@/lib/forms/dirty'

describe('formSnapshot / isFormDirty', () => {
  const pristine = { title: '', notes: null, tags: [], date: '2026-10-01', parts: {} }

  it('is not dirty before a baseline exists', () => {
    expect(isFormDirty(null, formSnapshot({ title: 'x' }))).toBe(false)
  })

  it('is dirty after typing and pristine again once the text is cleared', () => {
    const baseline = formSnapshot(pristine)
    expect(isFormDirty(baseline, formSnapshot({ ...pristine, title: 'A' }))).toBe(true)
    expect(isFormDirty(baseline, formSnapshot({ ...pristine, title: '' }))).toBe(false)
  })

  it('treats null, undefined and empty string as the same value', () => {
    expect(formSnapshot({ notes: null })).toBe(formSnapshot({ notes: undefined }))
    expect(formSnapshot({ notes: '' })).toBe(formSnapshot({}))
  })

  it('ignores key order but not array order', () => {
    expect(formSnapshot({ a: 1, b: 2 })).toBe(formSnapshot({ b: 2, a: 1 }))
    expect(formSnapshot({ tags: ['imt', 'gp'] })).not.toBe(formSnapshot({ tags: ['gp', 'imt'] }))
  })

  it('treats a framework part typed into and cleared as pristine', () => {
    const baseline = formSnapshot(pristine)
    expect(isFormDirty(baseline, formSnapshot({ ...pristine, parts: { description: '' } }))).toBe(false)
  })
})
