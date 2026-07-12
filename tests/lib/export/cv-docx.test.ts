// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildCvDocSections, buildCvDocData, renderCvDocx } from '@/lib/export/cv-docx'
import type { PortfolioEntry } from '@/lib/types/portfolio'

function makeEntry(overrides: Partial<PortfolioEntry> = {}): PortfolioEntry {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    category: 'audit_qip',
    title: 'Falls audit',
    date: '2026-01-15',
    specialty_tags: [],
    notes: null,
    pinned: false,
    deleted_at: null,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    ...overrides,
  } as PortfolioEntry
}

describe('buildCvDocSections', () => {
  it('groups entries by category in the canonical CV order', () => {
    const entries = [
      makeEntry({ id: 'e1', category: 'reflection', title: 'CBD reflection' }),
      makeEntry({ id: 'e2', category: 'audit_qip', title: 'Falls audit' }),
      makeEntry({ id: 'e3', category: 'teaching', title: 'F1 teaching session' }),
    ]
    const sections = buildCvDocSections(entries)
    expect(sections.map(s => s.category)).toEqual(['audit_qip', 'teaching', 'reflection'])
    expect(sections.find(s => s.category === 'audit_qip')?.categoryLabel).toBe('Audit & QIP')
  })

  it('omits empty categories entirely', () => {
    const sections = buildCvDocSections([makeEntry({ category: 'prize', title: 'Best poster' })])
    expect(sections).toHaveLength(1)
    expect(sections[0].category).toBe('prize')
  })

  it('returns no sections for an empty entry list', () => {
    expect(buildCvDocSections([])).toEqual([])
  })

  it('maps category-specific detail fields with labels, skipping empty values', () => {
    const entries = [
      makeEntry({
        category: 'publication',
        title: 'Sepsis outcomes',
        pub_type: 'original_research',
        pub_status: 'published',
        pub_journal: 'BMJ',
        pub_authors: null,
        pub_doi: null,
      }),
    ]
    const [section] = buildCvDocSections(entries)
    const details = section.entries[0].details
    expect(details).toEqual([
      { label: 'Type', value: 'Original research' },
      { label: 'Status', value: 'Published' },
      { label: 'Journal', value: 'BMJ' },
    ])
  })

  it('falls back to title-cased raw values for unlabelled enum values', () => {
    const entries = [makeEntry({ category: 'teaching', teaching_setting: 'bedside_clinic' })]
    const [section] = buildCvDocSections(entries)
    expect(section.entries[0].details).toContainEqual({ label: 'Setting', value: 'Bedside Clinic' })
  })

  it('appends notes as a trailing detail line when present', () => {
    const entries = [makeEntry({ category: 'custom', custom_free_text: 'Did a thing', notes: 'Extra context' })]
    const [section] = buildCvDocSections(entries)
    expect(section.entries[0].details).toEqual([
      { label: 'Description', value: 'Did a thing' },
      { label: 'Notes', value: 'Extra context' },
    ])
  })

  it('formats specialty tags for display', () => {
    const entries = [makeEntry({ specialty_tags: ['general_surgery'] })]
    const [section] = buildCvDocSections(entries)
    expect(section.entries[0].tags.length).toBe(1)
    expect(typeof section.entries[0].tags[0]).toBe('string')
  })

  it('formats the date as day/short-month/year (en-GB)', () => {
    const entries = [makeEntry({ date: '2026-03-02' })]
    const [section] = buildCvDocSections(entries)
    expect(section.entries[0].dateLabel).toBe('2 Mar 2026')
  })
})

describe('buildCvDocData', () => {
  it('carries through the header metadata and total entry count', () => {
    const data = buildCvDocData({
      entries: [makeEntry(), makeEntry({ id: 'e2', category: 'teaching' })],
      userName: 'Dr Jane Doe',
      specialty: 'Clinical CV',
      exportedAt: '6 July 2026',
      templateName: 'Clinical CV',
      templateSubtitle: 'Generated CV summary from your Clerkfolio portfolio',
    })
    expect(data.userName).toBe('Dr Jane Doe')
    expect(data.totalEntries).toBe(2)
    expect(data.sections.length).toBe(2)
  })

  it('defaults logSections to an empty array when none are supplied', () => {
    const data = buildCvDocData({
      entries: [makeEntry()],
      userName: 'Dr Jane Doe',
      specialty: 'Clinical CV',
      exportedAt: '6 July 2026',
      templateName: 'Clinical CV',
      templateSubtitle: 'Generated CV summary from your Clerkfolio portfolio',
    })
    expect(data.logSections).toEqual([])
  })

  it('carries supplied logSections through to the doc data', () => {
    const data = buildCvDocData({
      entries: [],
      userName: 'Dr Jane Doe',
      specialty: 'Clinical CV',
      exportedAt: '6 July 2026',
      templateName: 'Clinical CV',
      templateSubtitle: 'Generated CV summary from your Clerkfolio portfolio',
      logSections: [
        { key: 'exams', title: 'Examinations', entries: [{ id: 'x1', title: 'MRCP', dateLabel: '2 Mar 2026', details: [{ label: 'Score', value: '520' }] }] },
      ],
    })
    expect(data.logSections.map(s => s.key)).toEqual(['exams'])
  })
})

describe('renderCvDocx', () => {
  it('produces a non-empty real .docx (zip/OOXML) buffer', async () => {
    const data = buildCvDocData({
      entries: [makeEntry()],
      userName: 'Dr Jane Doe',
      specialty: 'Clinical CV',
      exportedAt: '6 July 2026',
      templateName: 'Clinical CV',
      templateSubtitle: 'Generated CV summary from your Clerkfolio portfolio',
    })
    const buffer = await renderCvDocx(data)
    expect(buffer.length).toBeGreaterThan(0)
    // .docx files are zip archives - assert the local file header magic bytes
    // ("PK\x03\x04") so a regression can't silently ship plain text/garbage.
    expect(buffer.subarray(0, 4).toString('hex')).toBe('504b0304')
  })

  it('renders successfully with zero entries (empty portfolio)', async () => {
    const data = buildCvDocData({
      entries: [],
      userName: 'Dr Jane Doe',
      specialty: 'Clinical CV',
      exportedAt: '6 July 2026',
      templateName: 'Clinical CV',
      templateSubtitle: 'Generated CV summary from your Clerkfolio portfolio',
    })
    const buffer = await renderCvDocx(data)
    expect(buffer.length).toBeGreaterThan(0)
  })
})
