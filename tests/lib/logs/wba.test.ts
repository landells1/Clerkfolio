// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { groupWbasByRotation, inferWbaType, wbaTypeFor, WBA_TYPE_LABELS } from '@/lib/logs/wba'
import { rotationSpans } from '@/lib/logs/rotations'

const TODAY = '2026-10-01'

describe('inferWbaType (legacy rows without a stored type)', () => {
  it('recognises the named types from free text', () => {
    expect(inferWbaType('Mini-CEX with Dr Patel')).toBe('mini_cex')
    expect(inferWbaType('mini cex - chest pain')).toBe('mini_cex')
    expect(inferWbaType('CBD on sepsis')).toBe('cbd')
    expect(inferWbaType('DOPS: cannula')).toBe('dops')
    expect(inferWbaType('ACAT on take')).toBe('acat')
  })

  it('puts a DCT or anything unrecognised in DCT / other instead of nowhere', () => {
    expect(inferWbaType('DCT - discharge summary')).toBe('other')
    expect(inferWbaType('Feedback from ward round')).toBe('other')
    expect(WBA_TYPE_LABELS.other).toBe('DCT / other')
  })
})

describe('wbaTypeFor', () => {
  it('prefers the stored type over the text', () => {
    expect(wbaTypeFor({ title: 'CBD on sepsis', date: TODAY, meta: { wba_type: 'dops' } })).toBe('dops')
  })

  it('falls back to inference for old rows and unknown stored values', () => {
    expect(wbaTypeFor({ title: 'Assessment', date: TODAY, meta: { detail: 'CBD', wba_type: 'nonsense' } })).toBe('cbd')
  })
})

describe('groupWbasByRotation', () => {
  const spans = rotationSpans([
    { id: 'gs', title: 'General Surgery', date: '2026-04-01', meta: { end_date: '2026-07-31' } },
    { id: 'am', title: 'Acute Medicine', date: '2026-08-01', meta: {} },
  ])

  it('groups by the rotation whose span contains the WBA date, not by the detail text', () => {
    const rows = groupWbasByRotation([
      { title: 'CBD', date: '2026-05-01', meta: { detail: 'with Dr A' } },
      { title: 'CBD', date: '2026-06-01', meta: { detail: 'with Dr B' } },
      { title: 'DCT', date: '2026-08-10', meta: null },
      { title: 'Mini-CEX', date: '2026-08-11', meta: { wba_type: 'mini_cex' } },
      { title: 'DOPS', date: '2026-01-01', meta: null },
    ], spans, TODAY)
    expect(rows.map(row => row.label)).toEqual(['General Surgery', 'Acute Medicine', 'Not in a logged rotation'])
    expect(rows[0].counts).toEqual({ cbd: 2, mini_cex: 0, dops: 0, acat: 0, other: 0 })
    expect(rows[1].counts).toEqual({ cbd: 0, mini_cex: 1, dops: 0, acat: 0, other: 1 })
    expect(rows[2].counts.dops).toBe(1)
    // Every WBA is counted exactly once.
    expect(rows.reduce((sum, row) => sum + row.total, 0)).toBe(5)
  })

  it('omits the unassigned row when every WBA sits in a rotation', () => {
    const rows = groupWbasByRotation([{ title: 'CBD', date: '2026-05-01', meta: null }], spans, TODAY)
    expect(rows.map(row => row.key)).toEqual(['gs'])
  })
})
