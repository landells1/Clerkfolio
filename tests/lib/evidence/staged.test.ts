// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { planEvidenceOperations, stagedEvidenceSignature } from '@/lib/evidence/staged'

describe('planEvidenceOperations', () => {
  it('orders deletes, then unlinks, then attaches', () => {
    expect(planEvidenceOperations(['a'], { b: 'unlink', c: 'delete' })).toEqual([
      { op: 'delete', fileId: 'c' },
      { op: 'unlink', fileId: 'b' },
      { op: 'attach', fileId: 'a' },
    ])
  })

  it('drops an attachment for a file that is being deleted and de-duplicates attaches', () => {
    expect(planEvidenceOperations(['x', 'x', 'y'], { x: 'delete' })).toEqual([
      { op: 'delete', fileId: 'x' },
      { op: 'attach', fileId: 'y' },
    ])
  })

  it('does nothing when nothing is staged (Cancel discards everything)', () => {
    expect(planEvidenceOperations([], {})).toEqual([])
  })
})

describe('stagedEvidenceSignature', () => {
  it('is empty when nothing is staged and stable regardless of order', () => {
    expect(stagedEvidenceSignature([], {})).toBe('')
    expect(stagedEvidenceSignature(['b', 'a'], { z: 'unlink', y: 'delete' }))
      .toBe(stagedEvidenceSignature(['a', 'b'], { y: 'delete', z: 'unlink' }))
  })
})
