// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { linkedInSnippet, type LinkedInEntry } from '@/lib/export/linkedin-snippet'

function entry(overrides: Partial<LinkedInEntry>): LinkedInEntry {
  return {
    id: 'e1',
    title: 'Sepsis teaching for students',
    category: 'teaching',
    date: '2026-05-10',
    conf_event_name: null,
    pub_journal: null,
    leader_role: null,
    leader_organisation: null,
    prize_body: null,
    proc_name: null,
    ...overrides,
  }
}

describe('linkedInSnippet', () => {
  it('never asserts an impact the user did not record', () => {
    const text = linkedInSnippet(entry({}))
    expect(text).toBe('Sepsis teaching for students. Teaching, May 2026.')
    expect(text).not.toMatch(/impact|value|achievement/i)
  })

  it('uses structured teaching details when present', () => {
    expect(linkedInSnippet(entry({ teaching_type: 'taught_session', teaching_audience: 'students', teaching_event: 'Royal London' })))
      .toBe('Sepsis teaching for students. Taught session for students at Royal London. Teaching, May 2026.')
  })

  it('does not label a custom entry (e.g. a Balint group) as an achievement', () => {
    const text = linkedInSnippet(entry({ category: 'custom', title: 'Balint group session' }))
    expect(text).not.toMatch(/achievement|verified|relevance/i)
    expect(text.startsWith('Balint group session.')).toBe(true)
  })

  it('only says "Published" for published work', () => {
    expect(linkedInSnippet(entry({ category: 'publication', pub_journal: 'BMJ', pub_status: 'submitted' }))).toContain('BMJ.')
    expect(linkedInSnippet(entry({ category: 'publication', pub_journal: 'BMJ', pub_status: 'submitted' }))).not.toContain('Published')
    expect(linkedInSnippet(entry({ category: 'publication', pub_journal: 'BMJ', pub_status: 'published' }))).toContain('Published in BMJ.')
  })

  it('contains no em dashes', () => {
    expect(linkedInSnippet(entry({ category: 'leadership', leader_role: 'Rep', leader_organisation: 'BMA' }))).not.toContain(String.fromCharCode(0x2014))
  })
})
