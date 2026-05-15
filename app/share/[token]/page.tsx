import type { Metadata } from 'next'
import PublicShareClient from '@/components/share/public-share-client'

export const dynamic = 'force-dynamic'

// Share links are tokenised, time-limited, and may be PIN-gated. They are
// intended for a specific recipient - never search-indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <PublicShareClient token={token} />
}
