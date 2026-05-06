'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AnniversaryBanner({ userId, year }: { userId: string; year: number }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profiles')
      .update({ last_anniversary_seen_year: year })
      .eq('id', userId)
      .then(() => undefined)
  }, [userId, year])

  if (!visible) return null

  return (
    <section className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#F5F5F2]">
            {year} {year === 1 ? 'year' : 'years'} on Clerkfolio
          </h2>
          <p className="mt-1 text-sm leading-6 text-[rgba(245,245,242,0.6)]">
            Your portfolio has another training year of entries to look back on.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-lg border border-white/[0.08] px-3 py-2 text-sm text-[rgba(245,245,242,0.6)] hover:text-[#F5F5F2]"
        >
          Dismiss
        </button>
      </div>
    </section>
  )
}
