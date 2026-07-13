// Typed content modules for the public /guides content hub.
//
// Guides are TS data, not MDX, deliberately: the repo's convention for
// structured, sourced content is typed modules (lib/specialties/*.ts,
// lib/marketing/pricing.ts, lib/marketing/faqs.ts), the type system makes the
// non-negotiable fields (lastReviewed, cited sources with jurisdiction,
// related links) required at compile time, content invariants are unit
// testable (tests/lib/guides), and the Article JSON-LD derives from the same
// object as the visible page so schema and content cannot drift - the same
// single-source rule as the landing FAQPage schema.
//
// Editorial rules (owner red-lines - enforced by review, pinned where a test
// can express them):
// - No named author bylines and no implied medical-review process. Guides are
//   published as Clerkfolio, the organisation.
// - Neutral factual guidance only: no readiness verdicts, no predictions.
//   Official requirements go in `official` blocks; Clerkfolio's own practical
//   suggestions go in `tip` blocks so readers can always tell them apart.
// - Every requirement claim must trace to a cited official source, and
//   `lastReviewed` states when the sources were last checked.
// - No fabricated statistics or testimonials, and no em dashes in visible
//   copy (hyphens only - same sweep as the specialty configs).

export type GuideSource = {
  label: string
  url: string
  /** Publisher and where it applies, e.g. 'UKFPO - UK-wide' or 'NES - Scotland, Wales and Northern Ireland'. */
  jurisdiction: string
}

/**
 * Topical clusters on the /guides hub. Each cluster has exactly one pillar
 * guide (test-pinned). Hub display order follows GUIDE_CLUSTERS in index.ts -
 * specialty applications lead because ARCP is a significant but secondary
 * feature in the marketing importance order (owner rule).
 */
export type GuideClusterKey = 'specialty-applications' | 'arcp'

export type GuideCluster = {
  key: GuideClusterKey
  /** Section label on the /guides hub. */
  label: string
  /** One-line section intro on the hub. */
  blurb: string
}

export type GuideBlock =
  /** Section heading (h2). `id` becomes the anchor. */
  | { kind: 'heading'; id: string; text: string }
  /** Sub-heading (h3). */
  | { kind: 'subheading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'numbered'; items: string[] }
  /** Official requirement callout - only verifiable claims from the cited sources. */
  | { kind: 'official'; title: string; items: string[] }
  /** In-body links to other guides (contextual internal linking; slugs are test-validated). */
  | { kind: 'guideList'; items: { slug: string; text: string }[] }
  /** Clerkfolio suggestion callout - clearly ours, never presented as a requirement. */
  | { kind: 'tip'; title: string; text: string }

export type Guide = {
  /** URL segment under /guides/. */
  slug: string
  /** Short label for cards and related-guide lists. */
  shortTitle: string
  /** Page H1. */
  title: string
  /** <title> tag. */
  metaTitle: string
  metaDescription: string
  /** Lede paragraph on the page and card text on the hub. */
  summary: string
  /** Which hub cluster the guide belongs to. */
  cluster: GuideClusterKey
  /** The pillar page is featured first in its cluster section and linked from every cluster guide. */
  isPillar?: boolean
  /** ISO date the guide was first published (Article datePublished). */
  published: string
  /** ISO date the cited sources were last re-verified (visible + Article dateModified). */
  lastReviewed: string
  blocks: GuideBlock[]
  sources: GuideSource[]
  /** Slugs of related guides rendered at the end of the page. */
  related: string[]
}
