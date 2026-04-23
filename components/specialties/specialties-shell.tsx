'use client'

import { useState } from 'react'
import type { SpecialtyApplication, SpecialtyEntryLink } from '@/lib/specialties'
import { getSpecialtyConfig } from '@/lib/specialties'
import { SpecialtyCard } from './specialty-card'
import { SpecialtyDetail } from './specialty-detail'
import { AddSpecialtyModal } from './add-specialty-modal'
import { CompareView } from './compare-view'

type Tab = 'my_specialties' | 'compare'

type Props = {
  applications: SpecialtyApplication[]
  links: SpecialtyEntryLink[]
}

export function SpecialtiesShell({ applications: initialApplications, links: initialLinks }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('my_specialties')
  const [applications, setApplications] = useState<SpecialtyApplication[]>(initialApplications)
  const [links, setLinks] = useState<SpecialtyEntryLink[]>(initialLinks)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  function handleAddApplication(app: SpecialtyApplication) {
    setApplications(prev => [...prev, app])
  }

  function handleRemoveApplication(appId: string) {
    setApplications(prev => prev.filter(a => a.id !== appId))
    setLinks(prev => prev.filter(l => l.application_id !== appId))
    if (selectedAppId === appId) setSelectedAppId(null)
  }

  function handleLinksChange(newLinks: SpecialtyEntryLink[]) {
    setLinks(newLinks)
  }

  function handleApplicationUpdate(updatedApp: SpecialtyApplication) {
    setApplications(prev => prev.map(a => (a.id === updatedApp.id ? updatedApp : a)))
  }

  const selectedApp = applications.find(a => a.id === selectedAppId) ?? null
  const selectedConfig = selectedApp ? getSpecialtyConfig(selectedApp.specialty_key) : null

  return (
    <div className="p-6 max-w-5xl">
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-[#141416] border border-white/[0.08] rounded-xl p-1">
          {(['my_specialties', 'compare'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setSelectedAppId(null)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-[#1D9E75] text-[#0B0B0C]'
                  : 'text-[rgba(245,245,242,0.5)] hover:text-[#F5F5F2]'
              }`}
            >
              {tab === 'my_specialties' ? 'My Specialties' : 'Compare'}
            </button>
          ))}
        </div>

        {activeTab === 'my_specialties' && !selectedAppId && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] hover:bg-[#178060] text-[#0B0B0C] font-semibold text-sm rounded-xl transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Specialty
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
            />
          ) : (
            <>
              {applications.length === 0 ? (
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
                    className="mt-4 text-sm text-[#1D9E75] hover:text-[#178060] font-medium transition-colors"
                  >
                    Track your first specialty application →
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {applications.map(app => {
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
              )}
            </>
          )}
        </>
      )}

      {/* Compare tab */}
      {activeTab === 'compare' && (
        <CompareView applications={applications} links={links} />
      )}

      {/* Add Specialty Modal */}
      {showAddModal && (
        <AddSpecialtyModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddApplication}
          existingKeys={applications.map(a => a.specialty_key)}
        />
      )}
    </div>
  )
}
