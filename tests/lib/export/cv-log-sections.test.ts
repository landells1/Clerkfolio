// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildCvLogSections, type CvLogRow } from '@/lib/export/cv-log-sections'

const TODAY = '2026-10-01'

function makeRow(overrides: Partial<CvLogRow> = {}): CvLogRow {
  return {
    id: 'log-1',
    kind: 'course',
    title: 'Advanced Life Support',
    date: '2026-01-15',
    expires_at: null,
    cpd_hours: null,
    attempts: null,
    score: null,
    ...overrides,
  }
}

describe('buildCvLogSections', () => {
  it('returns no sections for an empty row list', () => {
    expect(buildCvLogSections([], TODAY)).toEqual([])
  })

  it('omits the Courses section entirely when there are no course/training rows', () => {
    const sections = buildCvLogSections([makeRow({ kind: 'exam', title: 'MRCP Part 1' })], TODAY)
    expect(sections.map(s => s.key)).toEqual(['exams'])
  })

  it('omits the Examinations section entirely when there are no exam rows', () => {
    const sections = buildCvLogSections([makeRow({ kind: 'course' })], TODAY)
    expect(sections.map(s => s.key)).toEqual(['courses'])
  })

  it('places Courses & Certifications before Examinations', () => {
    const sections = buildCvLogSections([
      makeRow({ id: 'a', kind: 'exam', title: 'MRCP' }),
      makeRow({ id: 'b', kind: 'course' }),
    ], TODAY)
    expect(sections.map(s => s.title)).toEqual(['Courses & Certifications', 'Examinations'])
  })

  it('groups both course and mandatory_training kinds into Courses & Certifications, sorted by date descending', () => {
    const sections = buildCvLogSections([
      makeRow({ id: 'old', kind: 'course', title: 'Old course', date: '2025-02-01' }),
      makeRow({ id: 'new', kind: 'mandatory_training', title: 'IG training', date: '2026-06-01' }),
    ], TODAY)
    const courses = sections.find(s => s.key === 'courses')!
    expect(courses.entries.map(e => e.id)).toEqual(['new', 'old'])
  })

  it('maps course fields to structured details (Type, CPD hours), never free text', () => {
    const [section] = buildCvLogSections([makeRow({ kind: 'course', cpd_hours: 6 })], TODAY)
    expect(section.entries[0].details).toEqual([
      { label: 'Type', value: 'Course' },
      { label: 'CPD hours', value: '6' },
    ])
  })

  it('maps mandatory_training to a Mandatory training type with a formatted expiry date', () => {
    const [section] = buildCvLogSections([makeRow({ kind: 'mandatory_training', expires_at: '2027-03-02' })], TODAY)
    expect(section.entries[0].details).toEqual([
      { label: 'Type', value: 'Mandatory training' },
      { label: 'Expires', value: '2 Mar 2027' },
    ])
  })

  it('maps exam fields to structured details (Attempt, Score)', () => {
    const [section] = buildCvLogSections([makeRow({ kind: 'exam', title: 'MRCP Part 1', attempts: 2, score: '520' })], TODAY)
    expect(section.entries[0].details).toEqual([
      { label: 'Attempt', value: '2nd' },
      { label: 'Score', value: '520' },
    ])
  })

  it('formats the entry date as day/short-month/year (en-GB)', () => {
    const [section] = buildCvLogSections([makeRow({ date: '2026-03-02' })], TODAY)
    expect(section.entries[0].dateLabel).toBe('2 Mar 2026')
  })

  it('emits a title+date entry with a minimal detail set when optional numeric fields are absent', () => {
    const [section] = buildCvLogSections([makeRow({ kind: 'exam', title: 'MRCPCH', attempts: null, score: null })], TODAY)
    expect(section.entries[0].title).toBe('MRCPCH')
    expect(section.entries[0].details).toEqual([])
  })

  it('leaves out exams dated after today so a booked exam never reads as sat', () => {
    const sections = buildCvLogSections([
      makeRow({ id: 'sat', kind: 'exam', title: 'MRCP Part 1', date: '2026-09-01' }),
      makeRow({ id: 'booked', kind: 'exam', title: 'MSRA', date: '2027-01-15', attempts: 1 }),
    ], TODAY)
    expect(sections.find(s => s.key === 'exams')!.entries.map(e => e.id)).toEqual(['sat'])
  })

  it('omits the Examinations section when every exam is still in the future', () => {
    const sections = buildCvLogSections([makeRow({ kind: 'exam', date: '2027-01-15' })], TODAY)
    expect(sections).toEqual([])
  })

  it('counts an exam dated today as sat', () => {
    const sections = buildCvLogSections([makeRow({ kind: 'exam', date: TODAY })], TODAY)
    expect(sections.map(s => s.key)).toEqual(['exams'])
  })

  it('adds a Rotations & placements section first, with month-year spans and no free text', () => {
    const sections = buildCvLogSections([
      makeRow({ id: 'c', kind: 'course' }),
      makeRow({ id: 'r1', kind: 'rotation', title: 'General Surgery', date: '2026-08-06', end_date: '2026-12-01' }),
      makeRow({ id: 'r2', kind: 'rotation', title: 'Acute Medicine', date: '2026-12-02', end_date: null }),
    ], '2027-01-10')
    expect(sections.map(s => s.key)).toEqual(['rotations', 'courses'])
    const rotations = sections[0]
    expect(rotations.title).toBe('Rotations & placements')
    expect(rotations.entries).toEqual([
      { id: 'r2', title: 'Acute Medicine', dateLabel: 'Dec 2026 - present', details: [] },
      { id: 'r1', title: 'General Surgery', dateLabel: 'Aug 2026 - Dec 2026', details: [] },
    ])
  })

  it('ignores an end date before the rotation start (treated as ongoing)', () => {
    const [section] = buildCvLogSections([
      makeRow({ id: 'r', kind: 'rotation', title: 'GP', date: '2026-04-01', end_date: '2026-01-01' }),
    ], TODAY)
    expect(section.entries[0].dateLabel).toBe('Apr 2026 - present')
  })

  it('leaves out rotations that have not started yet', () => {
    const sections = buildCvLogSections([makeRow({ kind: 'rotation', date: '2027-04-01' })], TODAY)
    expect(sections).toEqual([])
  })
})
