'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type DisplayPrefs = {
  high_contrast?: boolean
  dyslexic_font?: boolean
}

function applyPrefs(prefs: DisplayPrefs) {
  document.body.classList.toggle('theme-high-contrast', Boolean(prefs.high_contrast))
  document.body.classList.toggle('font-dyslexic', Boolean(prefs.dyslexic_font))
}

export default function PreferencesApplier() {
  useEffect(() => {
    const cached = window.localStorage.getItem('display_prefs')
    if (cached) {
      try { applyPrefs(JSON.parse(cached) as DisplayPrefs) } catch {}
    }

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('display_prefs')
        .eq('id', user.id)
        .single()
      const prefs = (data?.display_prefs ?? {}) as DisplayPrefs
      window.localStorage.setItem('display_prefs', JSON.stringify(prefs))
      applyPrefs(prefs)
    })
  }, [])

  return null
}
