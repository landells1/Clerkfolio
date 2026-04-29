'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()

  function goBack() {
    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push('/settings')
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-6 inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-[rgba(245,245,242,0.68)] transition-colors hover:border-white/[0.16] hover:text-[#F5F5F2]"
    >
      Back
    </button>
  )
}
