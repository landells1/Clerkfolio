// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { attachLinkedEntryMeta } from '@/lib/specialties/linked-entry-meta'

describe('attachLinkedEntryMeta', () => {
  const base = { id: 'l', application_id: 'app', domain_key: 'd', band_label: 'Evidence linked', points_claimed: 0, is_checkbox: false, created_at: '' }

  it('names the linked entry or case so evidence rows are not all "Evidence linked"', () => {
    const links = [
      { ...base, id: 'l1', entry_id: 'p1', entry_type: 'portfolio' as const },
      { ...base, id: 'l2', entry_id: 'c1', entry_type: 'case' as const },
    ]
    const out = attachLinkedEntryMeta(
      links,
      [{ id: 'p1', title: 'Audit of VTE prophylaxis', date: '2026-05-01' }],
      [{ id: 'c1', title: 'Chest pain on take', date: '2026-06-02' }],
    )
    expect(out.map(link => [link.entry_title, link.entry_date])).toEqual([
      ['Audit of VTE prophylaxis', '2026-05-01'],
      ['Chest pain on take', '2026-06-02'],
    ])
  })

  it('does not cross types (a case id is never resolved from portfolio rows)', () => {
    const out = attachLinkedEntryMeta(
      [{ ...base, entry_id: 'x', entry_type: 'case' as const }],
      [{ id: 'x', title: 'Portfolio row', date: null }],
      [],
    )
    expect(out[0].entry_title).toBeUndefined()
  })

  it('leaves self-claimed checkbox links untouched', () => {
    const link = { ...base, is_checkbox: true, entry_id: null, entry_type: null }
    expect(attachLinkedEntryMeta([link], [], [])[0]).toEqual(link)
  })
})
