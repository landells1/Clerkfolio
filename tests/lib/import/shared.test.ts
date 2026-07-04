import { describe, it, expect } from 'vitest'
import { isRecord, copyInsertable } from '@/lib/import/shared'

describe('isRecord', () => {
  it('accepts plain objects', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ a: 1 })).toBe(true)
  })

  it('rejects arrays, null, and primitives', () => {
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord('x')).toBe(false)
    expect(isRecord(3)).toBe(false)
    expect(isRecord(undefined)).toBe(false)
  })
})

describe('copyInsertable — column allowlist', () => {
  const allowed = new Set(['title', 'date', 'category', 'notes'])

  it('copies only allowlisted columns and forces the owning user_id', () => {
    const row = { title: 'Case', date: '2026-01-01', category: 'reflection', notes: 'n' }
    expect(copyInsertable(row, 'user-9', allowed)).toEqual({
      user_id: 'user-9',
      title: 'Case',
      date: '2026-01-01',
      category: 'reflection',
      notes: 'n',
    })
  })

  it('drops columns not on the allowlist (crafted-import defence)', () => {
    // A malicious import file must not be able to set internal-only columns.
    const row = { title: 'Case', is_demo: true, user_id: 'attacker', deleted_at: 'now', importance: 'high' }
    const result = copyInsertable(row, 'user-9', allowed)
    expect(result).toEqual({ user_id: 'user-9', title: 'Case' })
    // The attacker-supplied user_id is overridden, not honoured.
    expect(result.user_id).toBe('user-9')
    expect(result.is_demo).toBeUndefined()
    expect(result.deleted_at).toBeUndefined()
  })
})
