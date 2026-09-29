import { describe, it, expect } from 'vitest'
import { DEADLINE_REMINDER_DAYS, EXPIRY_REMINDER_DAYS, isReminderDay, ukDaysUntil } from '@/lib/notifications/reminder-schedule'

describe('reminder schedule', () => {
  it('counts UK calendar days, including across BST midnight', () => {
    const now = new Date('2026-10-05T23:30:00Z') // 00:30 BST on 6 Oct
    expect(ukDaysUntil('2026-10-06', now)).toBe(0)
    expect(ukDaysUntil('2026-10-09', now)).toBe(3)
    expect(ukDaysUntil('2026-10-07T08:00:00Z', now)).toBe(1)
  })

  it('fires each item on milestone days only, not every day', () => {
    const fired = Array.from({ length: 31 }, (_, i) => 30 - i).filter(d => isReminderDay(d, EXPIRY_REMINDER_DAYS))
    expect(fired).toEqual([30, 7, 1, 0])
    expect([3, 2, 1, 0].filter(d => isReminderDay(d, DEADLINE_REMINDER_DAYS))).toEqual([3, 1, 0])
  })
})
