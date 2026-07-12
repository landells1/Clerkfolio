import { describe, it, expect } from 'vitest'
import { countGoalProgress, buildGoalProgress } from '@/lib/goals/progress'

describe('countGoalProgress', () => {
  it('counts entries matching category on or after start_date', () => {
    const goal = { category: 'audit_qip', start_date: '2026-01-01' }
    const entries = [
      { category: 'audit_qip', date: '2026-01-01' }, // on start_date: counts
      { category: 'audit_qip', date: '2026-03-15' }, // after: counts
      { category: 'audit_qip', date: '2025-12-31' }, // before start_date: excluded
      { category: 'teaching', date: '2026-02-01' },  // wrong category: excluded
    ]
    expect(countGoalProgress(goal, entries)).toBe(2)
  })

  it('has no upper bound - entries logged after the goal period still count', () => {
    const goal = { category: 'teaching', start_date: '2026-01-01' }
    const entries = [
      { category: 'teaching', date: '2027-06-01' }, // long after any due_date - still progress
    ]
    expect(countGoalProgress(goal, entries)).toBe(1)
  })

  it('counts every matching entry when start_date is null', () => {
    const goal = { category: 'prize', start_date: null }
    const entries = [
      { category: 'prize', date: '2020-01-01' },
      { category: 'prize', date: '2026-01-01' },
      { category: 'teaching', date: '2026-01-01' },
    ]
    expect(countGoalProgress(goal, entries)).toBe(2)
  })

  it('excludes demo entries', () => {
    const goal = { category: 'audit_qip', start_date: '2026-01-01' }
    const entries = [
      { category: 'audit_qip', date: '2026-02-01', is_demo: true },
      { category: 'audit_qip', date: '2026-02-01', is_demo: false },
    ]
    expect(countGoalProgress(goal, entries)).toBe(1)
  })

  it('excludes soft-deleted entries', () => {
    const goal = { category: 'audit_qip', start_date: '2026-01-01' }
    const entries = [
      { category: 'audit_qip', date: '2026-02-01', deleted_at: '2026-02-02T00:00:00Z' },
      { category: 'audit_qip', date: '2026-02-01', deleted_at: null },
    ]
    expect(countGoalProgress(goal, entries)).toBe(1)
  })

  it('returns 0 for no matches', () => {
    expect(countGoalProgress({ category: 'prize', start_date: null }, [])).toBe(0)
  })
})

describe('buildGoalProgress', () => {
  it('attaches loggedCount to each goal, preserving other fields', () => {
    const goals = [
      { category: 'audit_qip', start_date: '2026-01-01', target_count: 3 },
      { category: 'teaching', start_date: null, target_count: 5 },
    ]
    const entries = [
      { category: 'audit_qip', date: '2026-02-01' },
      { category: 'audit_qip', date: '2026-03-01' },
      { category: 'teaching', date: '2020-01-01' },
    ]
    const rows = buildGoalProgress(goals, entries)
    expect(rows).toEqual([
      { category: 'audit_qip', start_date: '2026-01-01', target_count: 3, loggedCount: 2 },
      { category: 'teaching', start_date: null, target_count: 5, loggedCount: 1 },
    ])
  })
})
