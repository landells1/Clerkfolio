'use client'

import { useState } from 'react'

export function LegalContactButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, comment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  function handleClose() {
    setOpen(false)
    // Reset after close animation
    setTimeout(() => { setSent(false); setError(null); setName(''); setEmail(''); setComment('') }, 200)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ color: 'inherit', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, padding: 0 }}
      >
        CONTACT
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div style={{
            background: '#141416', border: '1px solid rgba(245,245,242,0.1)',
            borderRadius: 20, width: '100%', maxWidth: 440, padding: 32,
            fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <p style={{ color: '#F5F5F2', fontWeight: 600, fontSize: 16, margin: 0 }}>Get in touch</p>
                <p style={{ color: 'rgba(245,245,242,0.45)', fontSize: 13, margin: '4px 0 0' }}>We&apos;ll reply to your email within 48 hours.</p>
              </div>
              <button
                onClick={handleClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,245,242,0.4)', fontSize: 20, lineHeight: 1, padding: 4 }}
              >
                ×
              </button>
            </div>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#1B6FD9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p style={{ color: '#F5F5F2', fontWeight: 500, margin: '0 0 8px' }}>Message sent!</p>
                <p style={{ color: 'rgba(245,245,242,0.45)', fontSize: 13, margin: 0 }}>Thanks for reaching out. We&apos;ll be in touch soon.</p>
                <button
                  onClick={handleClose}
                  style={{ marginTop: 20, background: 'rgba(245,245,242,0.08)', border: 'none', borderRadius: 10, color: '#F5F5F2', fontSize: 13, padding: '8px 20px', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(245,245,242,0.5)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    style={{ width: '100%', background: '#0B0B0C', border: '1px solid rgba(245,245,242,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#F5F5F2', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(245,245,242,0.5)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ width: '100%', background: '#0B0B0C', border: '1px solid rgba(245,245,242,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#F5F5F2', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(245,245,242,0.5)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Message</label>
                  <textarea
                    required
                    rows={4}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="How can we help?"
                    style={{ width: '100%', background: '#0B0B0C', border: '1px solid rgba(245,245,242,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#F5F5F2', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                {error && (
                  <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  style={{ background: '#1B6FD9', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 600, padding: '11px 0', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1, transition: 'opacity 0.15s' }}
                >
                  {sending ? 'Sending...' : 'Send message'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
