'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import ToastProvider from '@/components/ui/toast-provider'
import QuickAddModal from '@/components/dashboard/quick-add-modal'
import CommandPalette from '@/components/ui/command-palette'
import Cheatsheet from '@/components/ui/cheatsheet'
import OfflineCachePrimer from '@/components/offline/offline-cache-primer'
import OfflineIndicator from '@/components/offline/offline-indicator'
import { FeedbackModal } from '@/components/feedback-modal'
import type { FeedbackCategory } from '@/lib/feedback/validation'

type EntryType = 'case' | 'teaching' | 'reflection' | 'procedure'
type QuickAddInitial = { type?: EntryType; domain?: string; domains?: string[]; tags?: string[] }
type QuickAddCtx = { openQuickAdd: (initial?: QuickAddInitial) => void }
type SearchCtx = { openSearch: () => void }
// Lets any page (e.g. the /specialties "request a specialty" affordance) open
// the single shared feedback modal instance, optionally pre-set to a category.
type FeedbackCtx = { openFeedback: (category?: FeedbackCategory) => void }

const QuickAddContext = createContext<QuickAddCtx>({ openQuickAdd: () => {} })
export function useQuickAdd() { return useContext(QuickAddContext) }

const SearchContext = createContext<SearchCtx>({ openSearch: () => {} })
export function useSearch() { return useContext(SearchContext) }

const FeedbackContext = createContext<FeedbackCtx>({ openFeedback: () => {} })
export function useFeedback() { return useContext(FeedbackContext) }

export default function DashboardProviders({ children, userInterests, careerStage = null, profileName = '', userEmail = '' }: { children: React.ReactNode; userInterests: string[]; careerStage?: string | null; profileName?: string; userEmail?: string }) {
  const [open, setOpen] = useState(false)
  const [initial, setInitial] = useState<QuickAddInitial | undefined>()
  const [searchOpen, setSearchOpen] = useState(false)
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>('general')

  const openQuickAdd = useCallback((init?: QuickAddInitial) => {
    setInitial(init)
    setOpen(true)
  }, [])

  const openSearch = useCallback(() => {
    setSearchOpen(true)
  }, [])

  const openFeedback = useCallback((category?: FeedbackCategory) => {
    setFeedbackCategory(category ?? 'general')
    setFeedbackOpen(true)
  }, [])

  useEffect(() => {
    let gTimer: ReturnType<typeof setTimeout> | null = null
    let waitingForGo = false

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target instanceof HTMLElement ? e.target : document.activeElement as HTMLElement | null
      const tag = target?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag ?? '') || target?.isContentEditable) return

      if (e.key === '?') {
        e.preventDefault()
        setCheatsheetOpen(true)
        return
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        openQuickAdd()
        return
      }

      if (e.key === 'g') {
        waitingForGo = true
        if (gTimer) clearTimeout(gTimer)
        gTimer = setTimeout(() => { waitingForGo = false }, 1000)
        return
      }

      if (waitingForGo) {
        const routes: Record<string, string> = {
          d: '/dashboard',
          p: '/portfolio',
          c: '/cases',
          s: '/specialties',
        }
        const route = routes[e.key.toLowerCase()]
        if (route) {
          e.preventDefault()
          window.location.assign(route)
        }
        waitingForGo = false
        if (gTimer) clearTimeout(gTimer)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (gTimer) clearTimeout(gTimer)
    }
  }, [openQuickAdd])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented) return
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <SearchContext.Provider value={{ openSearch }}>
      <QuickAddContext.Provider value={{ openQuickAdd }}>
        <FeedbackContext.Provider value={{ openFeedback }}>
          <ToastProvider>
            <OfflineCachePrimer />
            <OfflineIndicator />
            {children}
            {open && <QuickAddModal onClose={() => setOpen(false)} userInterests={userInterests} initialValues={initial} />}
            {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} careerStage={careerStage} />}
            {cheatsheetOpen && <Cheatsheet onClose={() => setCheatsheetOpen(false)} />}
            <FeedbackModal
              open={feedbackOpen}
              onClose={() => setFeedbackOpen(false)}
              prefillName={profileName}
              userEmail={userEmail}
              initialCategory={feedbackCategory}
            />
          </ToastProvider>
        </FeedbackContext.Provider>
      </QuickAddContext.Provider>
    </SearchContext.Provider>
  )
}
