import type { Metadata } from 'next'

export const SITE_URL = 'https://clerkfolio.co.uk'
export const SITE_NAME = 'Clerkfolio'

type MarketingMetadataInput = {
  title: string
  description: string
  /** Path beginning with '/' — becomes the canonical URL and og:url. */
  path: string
  noIndex?: boolean
}

// One builder for every public page's metadata so canonical, Open Graph and
// Twitter tags stay consistent and per-page. Without a per-page canonical,
// Next's metadata inheritance would let a parent canonical leak onto child
// pages, marking them as duplicates of that parent.
// The file-based card (app/opengraph-image.tsx). Setting openGraph/twitter on
// a page REPLACES the inherited objects, so without listing the image here
// every page except / shared as a large card with no image.
const SHARE_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: 'Clerkfolio - the UK doctor portfolio that keeps up with your career',
}

export function marketingMetadata({ title, description, path, noIndex }: MarketingMetadataInput): Metadata {
  const url = `${SITE_URL}${path === '/' ? '' : path}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'en_GB',
      type: 'website',
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [SHARE_IMAGE.url],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}
