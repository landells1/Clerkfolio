import type { Guide } from './types'
import { arcpPreparation } from './content/arcp-preparation'
import { foundationArcpEvidenceRequirements } from './content/foundation-arcp-evidence-requirements'
import { documentingTeachingPortfolio } from './content/documenting-teaching-portfolio'
import { documentingAuditQip } from './content/documenting-audit-qip'
import { reflectivePracticePortfolio } from './content/reflective-practice-portfolio'
import { commonMedicalPortfolioMistakes } from './content/common-medical-portfolio-mistakes'

export type { Guide, GuideBlock, GuideSource } from './types'

// Hub display order: pillar first, then the cluster in reading order.
export const GUIDES: Guide[] = [
  arcpPreparation,
  foundationArcpEvidenceRequirements,
  documentingTeachingPortfolio,
  documentingAuditQip,
  reflectivePracticePortfolio,
  commonMedicalPortfolioMistakes,
]

const GUIDES_BY_SLUG = new Map(GUIDES.map(guide => [guide.slug, guide]))

export function getGuide(slug: string): Guide | undefined {
  return GUIDES_BY_SLUG.get(slug)
}

export function relatedGuides(guide: Guide): Guide[] {
  return guide.related
    .map(slug => GUIDES_BY_SLUG.get(slug))
    .filter((related): related is Guide => Boolean(related))
}

/** Newest lastReviewed across all guides - used as the hub's sitemap date. */
export function latestGuideReviewDate(): string {
  return GUIDES.map(guide => guide.lastReviewed).sort().at(-1) ?? ''
}
