'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SpecialtyApplication, SpecialtyEntryLink } from '@/lib/specialties'
import { getSpecialtyConfig, SPECIALTY_CONFIGS } from '@/lib/specialties'
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
  initialAppKey?: string
}

export function SpecialtiesShell({ applications: initialApplications, links: initialLinks, isPro = false, initialAppKey }: Props) {
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
    <div className="p-6 max-w-5xl">
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-[#141416] border border-white/[0.08] rounded-xl p-1">
          {(['my_specialties', 'compare', 'archive'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedAppId(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-[#1B6FD9] text-[#0B0B0C]'
                  : 'text-[rgba(245,245,242,0.5)] hover:text-[#F5F5F2]'
              }`}
            >
              {tab === 'my_specialties' ? 'My Specialties' : tab === 'compare' ? 'Compare' : (
                <span className="flex items-center gap-1.5">
                  Archive
                  {archivedApplications.length > 0 && (
                    <span className="text-[10px] bg-white/[0.15] px-1.5 py-0.5 rounded-full">{archivedApplications.length}</span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'my_specialties' && !selectedAppId && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B6FD9] hover:bg-[#155BB0] text-[#0B0B0C] font-semibold text-sm rounded-xl transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Specialty
            {!isPro && (
              <span className="text-[10px] font-normal text-[#0B0B0C]/60 ml-0.5">
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
                  <div className="w-16 h-16 rounded-2xl bg-[#141416] border border-white/[0.08] flex items-center justify-center mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,242,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                      <path d="M9 12h6M9 16h4" />
                    </svg>
                  </div>
                  <p className="text-[#F5F5F2] font-medium mb-1">No specialty trackers yet</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 text-sm text-[#1B6FD9] hover:text-[#155BB0] font-medium transition-colors"
                  >
                    Track your first specialty application
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
                      if (!config) return null
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
              <p className="text-xs text-[rgba(245,245,242,0.3)] mt-1">
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
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[rgba(245,245,242,0.3)] text-xs font-medium border border-white/[0.06]">Archived</span>
                      </div>
                      {app.archived_at && (
                        <p className="text-xs text-[rgba(245,245,242,0.3)] mb-2">
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
          isPro={isPro}
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
      <button onClick={() => setDismissed(true)} className="shrink-0 text-[rgba(245,245,242,0.3)] hover:text-[#F5F5F2] transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
