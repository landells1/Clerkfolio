'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { INTERVIEW_THEMES } from '@/lib/constants/interview-themes'

type CustomTheme = { id: string; name: string; slug: string; colour: string | null }
type ThemeOption = { value: string; label: string; isCustom: boolean; colour?: string }

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
      .select('id, name, slug, colour')
      .order('name', { ascending: true })
    setCustomThemes((data ?? []) as CustomTheme[])
  }

  useEffect(() => {
    loadCustomThemes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const options = useMemo<ThemeOption[]>(
    () => [
      ...INTERVIEW_THEMES.map(theme => ({ value: theme, label: theme, isCustom: false })),
      ...customThemes.map(theme => ({ value: theme.slug, label: theme.name, isCustom: true, colour: theme.colour ?? '#1B6FD9' })),
    ],
    [customThemes]
  )
  const labelByValue = new Map(options.map(option => [option.value, option.label]))
  const colourByValue = new Map(options.filter(option => option.isCustom).map(option => [option.value, option.colour ?? '#1B6FD9']))

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
      .insert({ user_id: user.id, name, slug, colour: '#1B6FD9' })
      .select('id, name, slug, colour')
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

  async function renameTheme(theme: CustomTheme) {
    const nextName = window.prompt('Rename theme', theme.name)?.trim().slice(0, 40)
    if (!nextName) return
    const nextSlug = slugifyTheme(nextName)
    if (!nextSlug || PRESET_SLUGS.has(nextSlug) || customThemes.some(item => item.slug === nextSlug && item.id !== theme.id)) {
      setError('That theme already exists.')
      return
    }

    const { error: updateError } = await supabase
      .from('custom_competency_themes')
      .update({ name: nextName, slug: nextSlug })
      .eq('id', theme.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    const { error: renameError } = await supabase.rpc('rename_user_tag', { p_old: theme.slug, p_new: nextSlug, p_field: 'interview_themes' })
    if (renameError) {
      // Roll back the theme row so the theme list and the tags on existing
      // entries cannot end up renamed on one side only.
      await supabase.from('custom_competency_themes').update({ name: theme.name, slug: theme.slug }).eq('id', theme.id)
      setError('Could not rename the theme on existing entries. Nothing was changed.')
      return
    }
    setCustomThemes(prev => prev.map(item => item.id === theme.id ? { ...item, name: nextName, slug: nextSlug } : item).sort((a, b) => a.name.localeCompare(b.name)))
    onChange?.(value.map(item => item === theme.slug ? nextSlug : item))
    onDirty?.()
  }

  async function updateThemeColour(theme: CustomTheme, colour: string) {
    const previousColour = theme.colour
    setCustomThemes(prev => prev.map(item => item.id === theme.id ? { ...item, colour } : item))
    const { error: colourError } = await supabase
      .from('custom_competency_themes')
      .update({ colour })
      .eq('id', theme.id)
    if (colourError) {
      setCustomThemes(prev => prev.map(item => item.id === theme.id ? { ...item, colour: previousColour } : item))
      setError('Could not update the theme colour.')
    }
  }

  if (manageOnly) {
    return (
      <ThemeManager
        customThemes={customThemes}
        newTheme={newTheme}
        setNewTheme={setNewTheme}
        addTheme={addTheme}
        removeTheme={removeTheme}
        renameTheme={renameTheme}
        updateThemeColour={updateThemeColour}
        error={error}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide" style={{ marginBottom: 0 }}>
          Competency themes <span className="normal-case font-normal text-[var(--text-secondary)]">(optional)</span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Manage
          </button>
          <button
            type="button"
            onClick={() => setOpen(current => !current)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
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
              style={colourByValue.has(theme) ? { borderColor: `${colourByValue.get(theme)}66`, backgroundColor: `${colourByValue.get(theme)}22`, color: 'var(--text-primary)' } : undefined}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-violet-500/15 text-[var(--cat-violet-text)] border border-violet-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors"
            >
              {labelByValue.get(theme) ?? theme} x
            </button>
          ))}
          <button type="button" onClick={() => setOpen(true)} className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-1">edit</button>
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
                  style={theme.isCustom && active ? { borderColor: `${theme.colour}66`, backgroundColor: `${theme.colour}22`, color: 'var(--text-primary)' } : undefined}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-violet-500/20 border-violet-500/40 text-[var(--cat-violet-text)]'
                      : 'bg-white/[0.04] border-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/[0.15]'
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
              className="min-h-[36px] flex-1 rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button type="button" onClick={addTheme} className="rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-[#1B6FD9]/40">
              + Add theme
            </button>
          </div>
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>
      )}

      {manageOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setManageOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-5 sm:rounded-2xl" onClick={event => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Manage themes</h2>
              <button type="button" onClick={() => setManageOpen(false)} className="text-sm text-[var(--text-muted)]">Close</button>
            </div>
            <ThemeManager
              customThemes={customThemes}
              newTheme={newTheme}
              setNewTheme={setNewTheme}
              addTheme={addTheme}
              removeTheme={removeTheme}
              renameTheme={renameTheme}
              updateThemeColour={updateThemeColour}
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
  renameTheme,
  updateThemeColour,
  error,
}: {
  customThemes: CustomTheme[]
  newTheme: string
  setNewTheme: (value: string) => void
  addTheme: () => void
  removeTheme: (theme: CustomTheme) => void
  renameTheme: (theme: CustomTheme) => void
  updateThemeColour: (theme: CustomTheme, colour: string) => void
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
          className="min-h-[40px] flex-1 rounded-lg border border-white/[0.08] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
        <button type="button" onClick={addTheme} className="rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white">
          Add
        </button>
      </div>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08]">
        {customThemes.length === 0 ? (
          <p className="p-4 text-sm text-[var(--text-muted)]">No custom themes yet.</p>
        ) : customThemes.map(theme => (
          <div key={theme.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">{theme.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">Custom theme</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={theme.colour ?? '#1B6FD9'}
                onChange={event => updateThemeColour(theme, event.target.value)}
                className="h-8 w-9 rounded border border-white/[0.08] bg-transparent"
                aria-label={`Colour for ${theme.name}`}
              />
              <button type="button" onClick={() => renameTheme(theme)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-white/[0.05]">
                Rename
              </button>
              <button type="button" onClick={() => removeTheme(theme)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-[var(--danger)] hover:bg-red-500/10">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
