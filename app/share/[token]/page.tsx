import PublicShareClient from '@/components/share/public-share-client'

export const dynamic = 'force-dynamic'

export default function SharePage({ params }: { params: { token: string } }) {
  return <PublicShareClient token={params.token} />
}
