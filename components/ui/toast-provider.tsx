'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  message: string
  type: ToastType
  undo?: () => void
}

type ToastContextValue = {
  addToast: (message: string, type?: ToastType) => void
  addUndoToast: (message: string, undo: () => void) => void
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {}, addUndoToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

function maybeVibrateForSave(message: string, type: ToastType) {
  if (type !== 'success') return
  if (!/(saved|logged|updated)/i.test(message)) return
  navigator.vibrate?.(30)
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    maybeVibrateForSave(message, type)
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const addUndoToast = useCallback((message: string, undo: () => void) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type: 'info', undo }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, addUndoToast }}>
      {children}
      {/* Toast stack - fixed top-right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation on next tick
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const accent =
    toast.type === 'success' ? 'var(--accent)' :
    toast.type === 'error'   ? 'var(--danger)' :
                               'var(--text-muted)'

  const bg =
    toast.type === 'success' ? 'bg-[#1B6FD9]/10 border-[#1B6FD9]/20' :
    toast.type === 'error'   ? 'bg-red-500/10 border-red-500/20' :
                               'bg-[var(--bg-surface)] border-white/[0.1]'

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-sm w-full ${bg} transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Coloured dot */}
      <span className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: accent, marginTop: 6 }} />
      <p className="text-sm text-[var(--text-primary)] flex-1 leading-snug">{toast.message}</p>
      {toast.undo && (
        <button
          onClick={() => { toast.undo?.(); onDismiss() }}
          className="text-sm font-medium text-[var(--accent-text)] hover:text-[var(--accent-bright)]"
        >
          Undo
        </button>
      )}
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
