'use client'

import { useState, useRef } from 'react'
import { useToast } from '@/components/ui/toast-provider'
import { apiFetch } from '@/lib/api-fetch'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

// Rendered always-mounted (returns null when closed) so an unsent draft
// survives closing and reopening the modal.
export function FeedbackModal({
  open,
  onClose,
  prefillName,
  userEmail,
}: {
  open: boolean
  onClose: () => void
  prefillName: string
  userEmail: string
}) {
  const feedbackRef = useRef<HTMLDivElement>(null)
  useFocusTrap(open, feedbackRef, onClose)
  const [feedback, setFeedback] = useState({ name: prefillName, email: userEmail, comment: '' })
  const [feedbackSending, setFeedbackSending] = useState(false)
  const { addToast } = useToast()

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedbackSending(true)

    const res = await apiFetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    })

    if (res.ok) {
      setFeedback({ name: prefillName, email: userEmail, comment: '' })
      onClose()
      addToast('Feedback sent - thank you!', 'success')
    } else {
      addToast('Failed to send feedback. Please try again.', 'error')
    }
    setFeedbackSending(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={feedbackRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="bg-[var(--bg-surface)] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="feedback-title" className="text-base font-semibold text-[var(--text-primary)]">Send feedback</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleFeedbackSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-emphasis)] mb-1.5 uppercase tracking-wide">Your name</label>
              <input
                required
                value={feedback.name}
                onChange={e => setFeedback(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-accent transition-colors"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-emphasis)] mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                required
                value={feedback.email}
                onChange={e => setFeedback(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-accent transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-emphasis)] mb-1.5 uppercase tracking-wide">Comment</label>
              <textarea
                required
                rows={4}
                value={feedback.comment}
                onChange={e => setFeedback(f => ({ ...f, comment: e.target.value }))}
                className="w-full bg-[var(--bg-canvas)] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-accent transition-colors resize-none"
                placeholder="Tell us what's working, what isn't, or what you'd love to see…"
              />
            </div>
            <button
              type="submit"
              disabled={feedbackSending}
              className="w-full bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] disabled:opacity-50 text-[var(--button-primary-text)] font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {feedbackSending ? 'Sending…' : 'Send feedback'}
            </button>
          </form>
      </div>
    </div>
  )
}
