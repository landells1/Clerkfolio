'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast-provider'

export default function DemoStarterCard({ show }: { show: boolean }) {
  const router = useRouter()
  const { addToast } = useToast()
  const [removing, setRemoving] = useState(false)
  if (!show) return null

  async function removeDemos() {
    setRemoving(true)
    const res = await fetch('/api/onboarding/demos', { method: 'DELETE' })
    setRemoving(false)
    if (!res.ok) {
      addToast('Could not remove demo entries', 'error')
      return
    }
    addToast('Demo entries removed', 'success')
    router.refresh()
  }

  return (
    <div className="mb-6 rounded-2xl border border-[#1B6FD9]/25 bg-[#1B6FD9]/10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#F5F5F2]">5-minute starter pack added</h2>
          <p className="mt-1 text-sm text-[rgba(245,245,242,0.6)]">A demo case and demo audit are labelled “edit me” so you can see how entries work.</p>
        </div>
        <button onClick={removeDemos} disabled={removing} className="min-h-[40px] rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-[#F5F5F2] disabled:opacity-50">
          {removing ? 'Removing...' : 'Remove demos'}
        </button>
      </div>
    </div>
  )
}
