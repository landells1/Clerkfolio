import type { Guide, GuideCluster } from './types'
import { specialtyTrainingApplications } from './content/specialty-training-applications'
import { imtPortfolioGuide } from './content/imt-portfolio-guide'
import { cstPortfolioGuide } from './content/cst-portfolio-guide'
import { medicalStudentPortfolio } from './content/medical-student-portfolio'
import { arcpPreparation } from './content/arcp-preparation'
import { foundationArcpEvidenceRequirements } from './content/foundation-arcp-evidence-requirements'
import { documentingTeachingPortfolio } from './content/documenting-teaching-portfolio'
import { documentingAuditQip } from './content/documenting-audit-qip'
import { reflectivePracticePortfolio } from './content/reflective-practice-portfolio'
import { commonMedicalPortfolioMistakes } from './content/common-medical-portfolio-mistakes'

export type { Guide, GuideBlock, GuideSource, GuideCluster, GuideClusterKey } from './types'

// Hub section order. Specialty applications lead: ARCP is a significant but
// secondary feature in the marketing importance order (owner rule).
export const GUIDE_CLUSTERS: GuideCluster[] = [
  {
    key: 'specialty-applications',
    label: 'Specialty training applications',
    blurb: 'How UK specialty selection scores portfolio evidence, and what to collect from medical school onwards.',
  },
  {
    key: 'arcp',
    label: 'ARCP and foundation evidence',
    blurb: 'What the annual review expects from foundation doctors, and how to document each evidence type properly.',
  },
]

// Display order within the hub: each cluster's pillar first, then its
// supporting guides in reading order.
export const GUIDES: Guide[] = [
  specialtyTrainingApplications,
  imtPortfolioGuide,
  cstPortfolioGuide,
  medicalStudentPortfolio,
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
