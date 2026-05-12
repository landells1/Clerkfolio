'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SpecialtyApplication, SpecialtyEntryLink } from '@/lib/specialties'
import { getSpecialtyConfig, SPECIALTY_CONFIGS, formatSpecialtyLabel } from '@/lib/specialties'
import { SpecialtyCard } from './specialty-card'
import { SpecialtyDetail } from './specialty-detail'
import { AddSpecialtyModal } from './add-specialty-modal'
import { CompareView } from './compare-view'

type Tab = 'my_specialties' | 'compare' | 'archive'

const FREE_SPECIALTY_LIMIT = 1

type Props = {
  applications: SpecialtyApplication[]
  links: SpecialtyEntryLink[]
  isPro?: boolean
  canTrackAnotherSpecialty?: boolean
  initialAppKey?: string
}

export function SpecialtiesShell({ applications: initialApplications, links: initialLinks, isPro = false, canTrackAnotherSpecialty = false, initialAppKey }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('my_specialties')
  const [applications, setApplications] = useState<SpecialtyApplication[]>(initialApplications)
  const [links, setLinks] = useState<SpecialtyEntryLink[]>(initialLinks)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(
    initialAppKey ? (initialApplications.find(a => a.specialty_key === initialAppKey)?.id ?? null) : null
  )
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    setSelectedAppId(
      initialAppKey ? (applications.find(a => a.specialty_key === initialAppKey)?.id ?? null) : null
    )
    if (!initialAppKey) setActiveTab('my_specialties')
  }, [applications, initialAppKey])

  function handleAddApplication(app: SpecialtyApplication) {
    setApplications(prev => [...prev, app])
  }

  function handleRemoveApplication(appId: string) {
    setApplications(prev => prev.filter(a => a.id !== appId))
    setLinks(prev => prev.filter(l => l.application_id !== appId))
    if (selectedAppId === appId) setSelectedAppId(null)
  }

  function handleArchiveApplication(oldAppId: string, newApp: SpecialtyApplication) {
    setApplications(prev =>
      prev.map(a => a.id === oldAppId ? { ...a, is_active: false, archived_at: new Date().toISOString() } : a)
        .concat(newApp)
    )
    setSelectedAppId(null)
  }

  function handleLinksChange(newLinks: SpecialtyEntryLink[]) {
    setLinks(newLinks)
  }

  function handleApplicationUpdate(updatedApp: SpecialtyApplication) {
    setApplications(prev => prev.map(a => (a.id === updatedApp.id ? updatedApp : a)))
  }

  const activeApplications = applications.filter(a => a.is_active !== false)
  const archivedApplications = applications.filter(a => a.is_active === false)

  const selectedApp = applications.find(a => a.id === selectedAppId) ?? null
  const selectedConfig = selectedApp ? getSpecialtyConfig(selectedApp.specialty_key) : null

  return (
    <div className="p-6 max-w-container mx-auto">
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-surface-1 border border-subtle rounded-lg p-1">
          {(['my_specialties', 'compare', 'archive'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedAppId(null) }}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-500 text-surface-0'
                  : 'text-fg-2 hover:bg-surface-3 hover:text-fg'
              }`}
            >
              {tab === 'my_specialties' ? 'My specialties' : tab === 'compare' ? 'Compare' : (
                <span className="flex items-center gap-1.5">
                  Archive
                  {archivedApplications.length > 0 && (
                    <span className="text-[10px] bg-surface-3 px-1.5 py-0.5 rounded-full">{archivedApplications.length}</span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'my_specialties' && !selectedAppId && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-surface-0 font-semibold text-sm rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add specialty
            {!canTrackAnotherSpecialty && (
              <span className="text-[10px] font-normal text-surface-0/60 ml-0.5">
                {activeApplications.length}/{FREE_SPECIALTY_LIMIT}
              </span>
            )}
          </button>
        )}
      </div>

      {/* My Specialties tab */}
      {activeTab === 'my_specialties' && (
        <>
          {selectedAppId && selectedApp && selectedConfig ? (
            <SpecialtyDetail
              config={selectedConfig}
              application={selectedApp}
              links={links.filter(l => l.application_id === selectedApp.id)}
              allLinks={links}
              onLinksChange={handleLinksChange}
              onApplicationUpdate={handleApplicationUpdate}
              onBack={() => setSelectedAppId(null)}
              isPro={isPro}
            />
          ) : (
            <>
              {activeApplications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-lg bg-surface-1 border border-subtle flex items-center justify-center mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-fg-2">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                      <path d="M9 12h6M9 16h4" />
                    </svg>
                  </div>
                  <p className="text-fg font-medium mb-1">No specialty trackers yet</p>
                  <p className="max-w-sm text-xs text-fg-2">
                    Pick a specialty to score your evidence by domain and auto-load the application
                    deadlines for the upcoming cycle. Free tier tracks one specialty at a time.
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-surface-0 hover:bg-blue-600 transition-colors"
                  >
                    Track your first specialty
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Cycle migration banners */}
                  {activeApplications.map(app => {
                    const config = getSpecialtyConfig(app.specialty_key)
                    if (!config?.supersededBy) return null
                    const nextConfig = SPECIALTY_CONFIGS.find(c => c.key === config.supersededBy)
                    if (!nextConfig) return null
                    const alreadyTracking = activeApplications.some(a => a.specialty_key === config.supersededBy)
                    if (alreadyTracking) return null
                    return (
                      <NewCycleBanner
                        key={app.id}
                        oldApp={app}
                        oldConfig={config}
                        newConfig={nextConfig}
                        onStartNewCycle={handleArchiveApplication}
                      />
                    )
                  })}

                  <div className="grid gap-4 sm:grid-cols-2">
                    {activeApplications.map(app => {
                      const config = getSpecialtyConfig(app.specialty_key)
                      if (!config) {
                        // Render a placeholder rather than silently dropping
                        // the row. Otherwise the page looks blank when an
                        // application references a key that has been retired
                        // from SPECIALTY_CONFIGS (e.g. an old cycle, or a
                        // tag-only key mistakenly inserted as a tracker).
                        return (
                          <UnknownSpecialtyCard
                            key={app.id}
                            specialtyKey={app.specialty_key}
                            onRemove={() => handleRemoveApplication(app.id)}
                          />
                        )
                      }
                      return (
                        <SpecialtyCard
                          key={app.id}
                          config={config}
                          application={app}
                          links={links.filter(l => l.application_id === app.id)}
                          isSelected={selectedAppId === app.id}
                          onSelect={() => setSelectedAppId(app.id)}
                          onRemove={() => handleRemoveApplication(app.id)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Archive tab */}
      {activeTab === 'archive' && (
        <div>
          {archivedApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm text-[rgba(245,245,242,0.4)]">No archived applications yet.</p>
              <p className="text-xs text-[rgba(245,245,242,0.55)] mt-1">
                Previous cycles appear here when you start a new cycle for the same specialty.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[rgba(245,245,242,0.4)]">
                Archived applications are read-only. Evidence links are preserved for reference.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {archivedApplications.map(app => {
                  const config = getSpecialtyConfig(app.specialty_key)
                  if (!config) return null
                  return (
                    <div key={app.id} className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 opacity-70">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#F5F5F2] text-base">{config.name}</h3>
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[rgba(245,245,242,0.45)] text-xs font-medium">{config.cycleYear}</span>
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[rgba(245,245,242,0.55)] text-xs font-medium border border-white/[0.06]">Archived</span>
                      </div>
                      {app.archived_at && (
                        <p className="text-xs text-[rgba(245,245,242,0.55)] mb-2">
                          Archived {new Date(app.archived_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                      <p className="text-xs text-[rgba(245,245,242,0.4)]">
                        {links.filter(l => l.application_id === app.id).length} evidence links
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compare tab */}
      {activeTab === 'compare' && (
        <CompareView applications={activeApplications} links={links} />
      )}

      {/* Add Specialty Modal */}
      {showAddModal && (
        <AddSpecialtyModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddApplication}
          existingKeys={applications.map(a => a.specialty_key)}
          activeCount={activeApplications.length}
          canTrackAnotherSpecialty={canTrackAnotherSpecialty}
        />
      )}
    </div>
  )
}

// ---------- New Cycle Banner ----------

type NewCycleBannerProps = {
  oldApp: SpecialtyApplication
  oldConfig: import('@/lib/specialties').SpecialtyConfig
  newConfig: import('@/lib/specialties').SpecialtyConfig
  onStartNewCycle: (oldAppId: string, newApp: SpecialtyApplication) => void
}

function NewCycleBanner({ oldApp, oldConfig, newConfig, onStartNewCycle }: NewCycleBannerProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function handleStart() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create new application row
      const { data: newRows, error: insertError } = await supabase
        .from('specialty_applications')
        .insert({ user_id: user.id, specialty_key: newConfig.key, cycle_year: newConfig.cycleYear, bonus_claimed: false })
        .select()
      if (insertError || !newRows?.[0]) { alert('Failed to start new cycle'); setLoading(false); return }

      // Archive the old row
      await supabase
        .from('specialty_applications')
        .update({ is_active: false, archived_at: new Date().toISOString() })
        .eq('id', oldApp.id)

      onStartNewCycle(oldApp.id, newRows[0] as SpecialtyApplication)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#1B6FD9]/8 border border-[#1B6FD9]/25 rounded-xl text-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B6FD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p className="flex-1 text-[rgba(245,245,242,0.7)]">
        <span className="font-medium text-[#F5F5F2]">{newConfig.name} {newConfig.cycleYear}</span> is now available.
        Start a new application cycle to re-link your evidence.
      </p>
      <button
        onClick={handleStart}
        disabled={loading}
        className="shrink-0 px-3 py-1.5 text-xs font-semibold text-[#0B0B0C] bg-[#1B6FD9] hover:bg-[#155BB0] disabled:opacity-50 rounded-lg transition-colors"
      >
        {loading ? 'Starting...' : 'Start new cycle'}
      </button>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-[rgba(245,245,242,0.55)] hover:text-[#F5F5F2] transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

// ---------- Placeholder for tracked-specialty rows whose config has been
// retired or that point at a tag-only key with no scoring matrix.
function UnknownSpecialtyCard({ specialtyKey, onRemove }: { specialtyKey: string; onRemove: () => void }) {
  return (
    <div className="bg-surface-1 border border-subtle rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-fg text-base">{formatSpecialtyLabel(specialtyKey)}</h3>
          <p className="mt-1 text-xs text-fg-2">
            No scoring matrix is available for this specialty (yet). Remove this tracker or pick a different specialty from Add specialty.
          </p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 min-h-[32px] rounded-lg border border-subtle px-3 text-xs font-medium text-fg-2 hover:text-fg hover:border-default transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
