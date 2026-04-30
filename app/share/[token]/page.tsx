import PublicShareClient from '@/components/share/public-share-client'

export const dynamic = 'force-dynamic'

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <PublicShareClient token={token} />
}
