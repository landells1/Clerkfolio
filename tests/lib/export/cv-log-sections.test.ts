// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildCvLogSections, type CvLogRow } from '@/lib/export/cv-log-sections'

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
    expect(buildCvLogSections([])).toEqual([])
  })

  it('omits the Courses section entirely when there are no course/training rows', () => {
    const sections = buildCvLogSections([makeRow({ kind: 'exam', title: 'MRCP Part 1' })])
    expect(sections.map(s => s.key)).toEqual(['exams'])
  })

  it('omits the Examinations section entirely when there are no exam rows', () => {
    const sections = buildCvLogSections([makeRow({ kind: 'course' })])
    expect(sections.map(s => s.key)).toEqual(['courses'])
  })

  it('places Courses & Certifications before Examinations', () => {
    const sections = buildCvLogSections([
      makeRow({ id: 'a', kind: 'exam', title: 'MRCP' }),
      makeRow({ id: 'b', kind: 'course' }),
    ])
    expect(sections.map(s => s.title)).toEqual(['Courses & Certifications', 'Examinations'])
  })

  it('groups both course and mandatory_training kinds into Courses & Certifications, sorted by date descending', () => {
    const sections = buildCvLogSections([
      makeRow({ id: 'old', kind: 'course', title: 'Old course', date: '2025-02-01' }),
      makeRow({ id: 'new', kind: 'mandatory_training', title: 'IG training', date: '2026-06-01' }),
    ])
    const courses = sections.find(s => s.key === 'courses')!
    expect(courses.entries.map(e => e.id)).toEqual(['new', 'old'])
  })

  it('maps course fields to structured details (Type, CPD hours), never free text', () => {
    const [section] = buildCvLogSections([makeRow({ kind: 'course', cpd_hours: 6 })])
    expect(section.entries[0].details).toEqual([
      { label: 'Type', value: 'Course' },
      { label: 'CPD hours', value: '6' },
    ])
  })

  it('maps mandatory_training to a Mandatory training type with a formatted expiry date', () => {
    const [section] = buildCvLogSections([makeRow({ kind: 'mandatory_training', expires_at: '2027-03-02' })])
    expect(section.entries[0].details).toEqual([
      { label: 'Type', value: 'Mandatory training' },
      { label: 'Expires', value: '2 Mar 2027' },
    ])
  })

  it('maps exam fields to structured details (Attempts, Score)', () => {
    const [section] = buildCvLogSections([makeRow({ kind: 'exam', title: 'MRCP Part 1', attempts: 2, score: '520' })])
    expect(section.entries[0].details).toEqual([
      { label: 'Attempts', value: '2' },
      { label: 'Score', value: '520' },
    ])
  })

  it('formats the entry date as day/short-month/year (en-GB)', () => {
    const [section] = buildCvLogSections([makeRow({ date: '2026-03-02' })])
    expect(section.entries[0].dateLabel).toBe('2 Mar 2026')
  })

  it('emits a title+date entry with a minimal detail set when optional numeric fields are absent', () => {
    const [section] = buildCvLogSections([makeRow({ kind: 'exam', title: 'MRCPCH', attempts: null, score: null })])
    expect(section.entries[0].title).toBe('MRCPCH')
    expect(section.entries[0].details).toEqual([])
  })
})
