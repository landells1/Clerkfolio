'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { INTERVIEW_THEMES } from '@/lib/constants/interview-themes'

type CustomTheme = { id: string; name: string; slug: string }

type Props = {
  value?: string[]
  onChange?: (next: string[]) => void
  onDirty?: () => void
  manageOnly?: boolean
}

const PRESET_SLUGS = new Set(INTERVIEW_THEMES.map(slugifyTheme))

function slugifyTheme(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function CompetencyThemePicker({ value = [], onChange, onDirty, manageOnly = false }: Props) {
  const supabase = createClient()
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([])
  const [open, setOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(manageOnly)
  const [newTheme, setNewTheme] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function loadCustomThemes() {
    const { data } = await supabase
      .from('custom_competency_themes')
      .select('id, name, slug')
      .order('name', { ascending: true })
    setCustomThemes((data ?? []) as CustomTheme[])
  }

  useEffect(() => {
    loadCustomThemes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const options = useMemo(
    () => [
      ...INTERVIEW_THEMES.map(theme => ({ value: theme, label: theme, isCustom: false })),
      ...customThemes.map(theme => ({ value: theme.slug, label: theme.name, isCustom: true })),
    ],
    [customThemes]
  )
  const labelByValue = new Map(options.map(option => [option.value, option.label]))

  function toggleTheme(theme: string) {
    const next = value.includes(theme) ? value.filter(item => item !== theme) : [...value, theme]
    onChange?.(next)
    onDirty?.()
  }

  async function addTheme() {
    const name = newTheme.trim().slice(0, 40)
    const slug = slugifyTheme(name)
    setError(null)

    if (!name || !slug) {
      setError('Enter a theme name.')
      return
    }
    if (PRESET_SLUGS.has(slug) || customThemes.some(theme => theme.slug === slug)) {
      setError('That theme already exists.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sign in required.')
      return
    }

    const { data, error: insertError } = await supabase
      .from('custom_competency_themes')
      .insert({ user_id: user.id, name, slug })
      .select('id, name, slug')
      .single()

    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not add theme.')
      return
    }

    setCustomThemes(prev => [...prev, data as CustomTheme].sort((a, b) => a.name.localeCompare(b.name)))
    onChange?.([...value, slug])
    onDirty?.()
    setNewTheme('')
    setOpen(true)
  }

  async function removeTheme(theme: CustomTheme) {
    const { error: deleteError } = await supabase
      .from('custom_competency_themes')
      .delete()
      .eq('id', theme.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setCustomThemes(prev => prev.filter(item => item.id !== theme.id))
    onChange?.(value.filter(item => item !== theme.slug))

    const [{ data: portfolioRows }, { data: caseRows }] = await Promise.all([
      supabase.from('portfolio_entries').select('id, interview_themes').contains('interview_themes', [theme.slug]),
      supabase.from('cases').select('id, interview_themes').contains('interview_themes', [theme.slug]),
    ])

    await Promise.all([
      ...((portfolioRows ?? []) as { id: string; interview_themes: string[] | null }[]).map(row =>
        supabase.from('portfolio_entries').update({
          interview_themes: (row.interview_themes ?? []).filter(item => item !== theme.slug),
        }).eq('id', row.id)
      ),
      ...((caseRows ?? []) as { id: string; interview_themes: string[] | null }[]).map(row =>
        supabase.from('cases').update({
          interview_themes: (row.interview_themes ?? []).filter(item => item !== theme.slug),
        }).eq('id', row.id)
      ),
    ])
  }

  if (manageOnly) {
    return (
      <ThemeManager
        customThemes={customThemes}
        newTheme={newTheme}
        setNewTheme={setNewTheme}
        addTheme={addTheme}
        removeTheme={removeTheme}
        error={error}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-[rgba(245,245,242,0.55)] uppercase tracking-wide" style={{ marginBottom: 0 }}>
          Competency themes <span className="normal-case font-normal text-[rgba(245,245,242,0.35)]">(optional)</span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors"
          >
            Manage
          </button>
          <button
            type="button"
            onClick={() => setOpen(current => !current)}
            className="text-xs text-[rgba(245,245,242,0.4)] hover:text-[#F5F5F2] transition-colors"
          >
            {open ? '-' : '+'}
          </button>
        </div>
      </div>

      {value.length > 0 && !open && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {value.map(theme => (
            <button
              key={theme}
              type="button"
              onClick={() => toggleTheme(theme)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors"
            >
              {labelByValue.get(theme) ?? theme} x
            </button>
          ))}
          <button type="button" onClick={() => setOpen(true)} className="text-[11px] text-[rgba(245,245,242,0.35)] hover:text-[#F5F5F2] px-1">edit</button>
        </div>
      )}

      {open && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5 mt-1">
            {options.map(theme => {
              const active = value.includes(theme.value)
              return (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => toggleTheme(theme.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] hover:border-white/[0.15]'
                  }`}
                >
                  {theme.label}{theme.isCustom ? ' *' : ''}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <input
              value={newTheme}
              onChange={event => setNewTheme(event.target.value)}
              maxLength={40}
              placeholder="Theme name"
              className="min-h-[36px] flex-1 rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2] outline-none focus:border-[#1B6FD9]"
            />
            <button type="button" onClick={addTheme} className="rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-[#F5F5F2] hover:border-[#1B6FD9]/40">
              + Add theme
            </button>
          </div>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
      )}

      {manageOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setManageOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl border border-white/[0.08] bg-[#141416] p-5 sm:rounded-2xl" onClick={event => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F5F5F2]">Manage themes</h2>
              <button type="button" onClick={() => setManageOpen(false)} className="text-sm text-[rgba(245,245,242,0.45)]">Close</button>
            </div>
            <ThemeManager
              customThemes={customThemes}
              newTheme={newTheme}
              setNewTheme={setNewTheme}
              addTheme={addTheme}
              removeTheme={removeTheme}
              error={error}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ThemeManager({
  customThemes,
  newTheme,
  setNewTheme,
  addTheme,
  removeTheme,
  error,
}: {
  customThemes: CustomTheme[]
  newTheme: string
  setNewTheme: (value: string) => void
  addTheme: () => void
  removeTheme: (theme: CustomTheme) => void
  error: string | null
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newTheme}
          onChange={event => setNewTheme(event.target.value)}
          maxLength={40}
          placeholder="Theme name"
          className="min-h-[40px] flex-1 rounded-lg border border-white/[0.08] bg-[#0B0B0C] px-3 text-sm text-[#F5F5F2] outline-none focus:border-[#1B6FD9]"
        />
        <button type="button" onClick={addTheme} className="rounded-lg bg-[#1B6FD9] px-3 text-sm font-semibold text-[#0B0B0C]">
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08]">
        {customThemes.length === 0 ? (
          <p className="p-4 text-sm text-[rgba(245,245,242,0.45)]">No custom themes yet.</p>
        ) : customThemes.map(theme => (
          <div key={theme.id} className="flex items-center justify-between gap-3 p-3">
            <div>
              <p className="text-sm font-medium text-[#F5F5F2]">{theme.name}</p>
              <p className="text-xs text-[rgba(245,245,242,0.35)]">{theme.slug}</p>
            </div>
            <button type="button" onClick={() => removeTheme(theme)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
