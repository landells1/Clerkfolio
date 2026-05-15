import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://clerkfolio.co.uk'
  const now = new Date()
  const routes = ['', '/privacy', '/terms', '/cookies', '/dpa', '/subprocessors', '/security', '/contact']
  return routes.map(path => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1.0 : 0.5,
  }))
}
