import type { MetadataRoute } from 'next'
import { GUIDES, latestGuideReviewDate } from '@/lib/guides'

// Honest per-page lastModified dates (previously every crawl saw "modified
// just now", which teaches crawlers to distrust the sitemap's dates). Update
// a page's date here when its content meaningfully changes — the legal pages
// already carry a matching visible "last updated" line. Guide pages derive
// their dates from each guide's lastReviewed field (single source with the
// visible "Last reviewed" line and the Article JSON-LD).
const PAGES: { path: string; lastModified: string; priority: number }[] = [
  { path: '', lastModified: '2026-07-13', priority: 1.0 },
  { path: '/features', lastModified: '2026-07-13', priority: 0.9 },
  { path: '/pricing', lastModified: '2026-07-13', priority: 0.9 },
  { path: '/about', lastModified: '2026-07-13', priority: 0.8 },
  { path: '/privacy', lastModified: '2026-07-06', priority: 0.5 },
  { path: '/terms', lastModified: '2026-07-06', priority: 0.5 },
  { path: '/cookies', lastModified: '2026-06-09', priority: 0.3 },
  { path: '/subprocessors', lastModified: '2026-07-06', priority: 0.3 },
  { path: '/security', lastModified: '2026-07-06', priority: 0.5 },
  { path: '/contact', lastModified: '2026-07-06', priority: 0.5 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://clerkfolio.co.uk'
  const staticPages = PAGES.map(({ path, lastModified, priority }) => ({
    url: `${base}${path}`,
    lastModified: new Date(lastModified),
    changeFrequency: 'monthly' as const,
    priority,
  }))
  const guidePages = [
    {
      url: `${base}/guides`,
      lastModified: new Date(latestGuideReviewDate()),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    ...GUIDES.map(guide => ({
      url: `${base}/guides/${guide.slug}`,
      lastModified: new Date(guide.lastReviewed),
      changeFrequency: 'monthly' as const,
      priority: guide.isPillar ? 0.8 : 0.7,
    })),
  ]
  return [...staticPages, ...guidePages]
}
