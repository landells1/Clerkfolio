import { describe, it, expect } from 'vitest'
import { GUIDES, GUIDE_CLUSTERS, getGuide, relatedGuides, latestGuideReviewDate } from '@/lib/guides'
import type { GuideBlock } from '@/lib/guides'

// Structural invariants over the /guides content modules, mirroring the
// specialty config-invariants suite: guides are typed data, so their
// editorial rules (owner red-lines) are pinned here where a test can express
// them - required review dates, cited sources with jurisdiction, resolvable
// cross-links, and the no-em-dash copy rule.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Official-source hosts the guides are allowed to cite. Add deliberately:
// citations must be official bodies (or their designated publishers), not
// blogs or news coverage.
const ALLOWED_SOURCE_HOSTS = [
  'foundationprogramme.nhs.uk',
  'www.copmed.org.uk',
  'www.gmc-uk.org',
  'www.aomrc.org.uk',
  'www.hqip.org.uk',
  'supporthorus.hee.nhs.uk',
  'www.scotlanddeanery.nhs.scot',
  // Specialty-recruitment officials (specialty-applications cluster).
  'medical.hee.nhs.uk',
  'www.imtrecruitment.org.uk',
  'www.oriel.nhs.uk',
]

function visibleStrings(block: GuideBlock): string[] {
  switch (block.kind) {
    case 'heading':
    case 'subheading':
    case 'paragraph':
      return [block.text]
    case 'bullets':
    case 'numbered':
      return block.items
    case 'official':
      return [block.title, ...block.items]
    case 'guideList':
      return block.items.map(item => item.text)
    case 'tip':
      return [block.title, block.text]
  }
}

function allVisibleStrings(guideIndex: number): string[] {
  const guide = GUIDES[guideIndex]
  return [
    guide.title,
    guide.shortTitle,
    guide.metaTitle,
    guide.metaDescription,
    guide.summary,
    ...guide.blocks.flatMap(visibleStrings),
    ...guide.sources.flatMap(source => [source.label, source.jurisdiction]),
  ]
}

describe('guide content invariants', () => {
  it('has unique slugs', () => {
    const slugs = GUIDES.map(guide => guide.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('assigns every guide to a declared cluster, each with exactly one pillar', () => {
    const clusterKeys = GUIDE_CLUSTERS.map(cluster => cluster.key)
    expect(new Set(clusterKeys).size).toBe(clusterKeys.length)
    for (const guide of GUIDES) {
      expect(clusterKeys).toContain(guide.cluster)
    }
    for (const key of clusterKeys) {
      const clusterGuides = GUIDES.filter(guide => guide.cluster === key)
      expect(clusterGuides.length).toBeGreaterThan(1)
      expect(clusterGuides.filter(guide => guide.isPillar)).toHaveLength(1)
    }
  })

  it('resolves every guide by slug', () => {
    for (const guide of GUIDES) {
      expect(getGuide(guide.slug)).toBe(guide)
    }
    expect(getGuide('missing-guide')).toBeUndefined()
  })

  it.each(GUIDES.map(guide => [guide.slug] as const))('%s has valid dates', slug => {
    const guide = getGuide(slug)!
    expect(guide.published).toMatch(ISO_DATE)
    expect(guide.lastReviewed).toMatch(ISO_DATE)
    // lastReviewed can never precede first publication.
    expect(guide.lastReviewed >= guide.published).toBe(true)
  })

  it.each(GUIDES.map(guide => [guide.slug] as const))(
    '%s cites official sources with jurisdiction',
    slug => {
      const guide = getGuide(slug)!
      expect(guide.sources.length).toBeGreaterThan(0)
      for (const source of guide.sources) {
        expect(source.label.length).toBeGreaterThan(0)
        expect(source.jurisdiction.length).toBeGreaterThan(0)
        const url = new URL(source.url)
        expect(url.protocol).toBe('https:')
        expect(ALLOWED_SOURCE_HOSTS).toContain(url.host)
      }
    }
  )

  it.each(GUIDES.map(guide => [guide.slug] as const))(
    '%s related and in-body guide links resolve and never self-reference',
    slug => {
      const guide = getGuide(slug)!
      expect(guide.related.length).toBeGreaterThan(0)
      for (const related of guide.related) {
        expect(related).not.toBe(guide.slug)
        expect(getGuide(related)).toBeDefined()
      }
      expect(relatedGuides(guide)).toHaveLength(guide.related.length)
      for (const block of guide.blocks) {
        if (block.kind === 'guideList') {
          for (const item of block.items) {
            expect(item.slug).not.toBe(guide.slug)
            expect(getGuide(item.slug)).toBeDefined()
          }
        }
      }
    }
  )

  it.each(GUIDES.map((guide, index) => [guide.slug, index] as const))(
    '%s visible copy contains no em dashes or fabricated-claim red flags',
    (_slug, index) => {
      for (const text of allVisibleStrings(index)) {
        expect(text).not.toContain('—')
        // Owner red-line: neutral factual guidance only - never verdicts or
        // promises about outcomes.
        expect(text.toLowerCase()).not.toContain('guarantee')
        expect(text.toLowerCase()).not.toContain('you will pass')
      }
    }
  )

  it.each(GUIDES.map(guide => [guide.slug] as const))('%s heading anchors are unique', slug => {
    const guide = getGuide(slug)!
    const ids = guide.blocks.flatMap(block => (block.kind === 'heading' ? [block.id] : []))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('reports the newest lastReviewed for the hub sitemap entry', () => {
    const expected = [...GUIDES.map(guide => guide.lastReviewed)].sort().at(-1)
    expect(latestGuideReviewDate()).toBe(expected)
  })
})
