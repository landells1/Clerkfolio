'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import ToastProvider from '@/components/ui/toast-provider'
import QuickAddModal from '@/components/dashboard/quick-add-modal'

type EntryType = 'case' | 'teaching' | 'reflection' | 'procedure'
type QuickAddInitial = { type?: EntryType; domain?: string; tags?: string[] }
type QuickAddCtx = { openQuickAdd: (initial?: QuickAddInitial) => void }

const QuickAddContext = createContext<QuickAddCtx>({ openQuickAdd: () => {} })
export function useQuickAdd() { return useContext(QuickAddContext) }

export default function DashboardProviders({ children, userInterests }: { children: React.ReactNode; userInterests: string[] }) {
  const [open, setOpen] = useState(false)
  const [initial, setInitial] = useState<QuickAddInitial | undefined>()

  const openQuickAdd = useCallback((init?: QuickAddInitial) => {
    setInitial(init)
    setOpen(true)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'n' && e.key !== 'N') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (document.activeElement as HTMLElement)?.isContentEditable) return
      e.preventDefault()
      openQuickAdd()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openQuickAdd])

  return (
    <QuickAddContext.Provider value={{ openQuickAdd }}>
      <ToastProvider>
        {children}
        {open && <QuickAddModal onClose={() => setOpen(false)} userInterests={userInterests} initialValues={initial} />}
      </ToastProvider>
    </QuickAddContext.Provider>
  )
}
