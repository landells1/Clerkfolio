'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { CONTAINER } from './shared'
import { FileIcon, LinkIcon, LockIcon } from './icons'
import { Pill } from './mocks'
import styles from './product.module.css'

// Both states of a slot share one grid cell, so the card is always as tall as
// its fullest state: stepping through never changes the page height (which
// made the page jump on phones without scroll anchoring, such as iOS Safari).
function Slot({ shown, content, placeholder }: { shown: boolean; content: ReactNode; placeholder: string }) {
  return (
    <div className="mt-2 grid items-start [&>*]:[grid-area:1/1]">
      <div key={shown ? 'on' : 'off'} className={shown ? styles.fade : 'invisible'}>{content}</div>
      <p className={`rounded-xl border border-dashed border-[var(--p-line-strong)] px-3.5 py-2.5 text-[13px] text-[var(--p-ink-3)] ${shown ? 'invisible' : ''}`}>{placeholder}</p>
    </div>
  )
}

const steps = [
  ['Log', 'Add cases or portfolio entries from your phone or desktop, in a minute or two each.'],
  ['Tag', 'Add clinical-area and specialty tags, then reuse them across your entries.'],
  ['Use', 'Link entries to specialty domains, export a PDF, or share selected portfolio entries with a PIN.'],
] as const

// One example entry walked through log, tag and use. It advances on its own
// until the visitor takes over; reduced motion never autoplays.
export function HowItWorks() {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)

  // Reduced motion: no autoplay, and the entry shows complete.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAuto(false)
      setActive(steps.length - 1)
    }
  }, [])

  useEffect(() => {
    if (!auto) return
    const timer = window.setInterval(() => setActive(step => (step + 1) % steps.length), 3400)
    return () => window.clearInterval(timer)
  }, [auto])

  function choose(index: number) {
    setAuto(false)
    setActive(index)
  }

  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-20 bg-[var(--p-surface)] py-24 sm:py-32">
      <div className={`${CONTAINER} grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20`}>
        <div>
          <h2 id="how-title" className={`${styles.display} text-[clamp(2.1rem,4vw,3.4rem)]`}>Record it once. Use it as you go.</h2>
          <ol className="mt-10 space-y-2">
            {steps.map(([word, body], index) => {
              const isActive = index === active
              return (
                <li key={word}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => choose(index)}
                    className={`flex w-full gap-4 rounded-2xl p-4 text-left transition-colors sm:p-5 ${isActive ? 'bg-[var(--p-ground)] shadow-[var(--p-shadow-card)]' : 'hover:bg-[var(--p-surface-2)]'}`}
                  >
                    <span className={`${styles.mono} flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[14px] font-semibold ${isActive ? 'bg-[var(--p-button)] text-[var(--p-on-button)]' : 'bg-[var(--p-surface-2)] text-[var(--p-ink-3)]'}`}>
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-[20px] font-semibold tracking-[-0.01em]">{word}</span>
                      <span className={`${styles.prose} mt-1 block text-[16px] leading-[1.55] text-[var(--p-ink-2)]`}>{body}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <button
            type="button"
            onClick={() => setAuto(value => !value)}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-medium text-[var(--p-ink-2)] transition-colors hover:bg-[var(--p-surface-2)] hover:text-[var(--p-ink)]"
          >
            <span className="flex h-4 w-4 items-center justify-center" aria-hidden="true">
              {auto ? <span className="flex gap-[3px]"><span className="h-3 w-[3px] rounded-sm bg-current" /><span className="h-3 w-[3px] rounded-sm bg-current" /></span> : <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-current" />}
            </span>
            {auto ? 'Pause the walkthrough' : 'Play the walkthrough'}
          </button>
        </div>
        <figure
          role="img"
          aria-label={`Example entry after the ${steps[active][0].toLowerCase()} step`}
          className="rounded-2xl border border-[var(--p-line)] bg-[var(--p-ground)] p-6 shadow-[var(--p-shadow-frame)] sm:p-8"
        >
          <div aria-hidden="true">
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone="primary">Audit & QIP</Pill>
              <Pill>Aug 2024</Pill>
              <Pill>FY1, North trust</Pill>
            </div>
            <p className="mt-4 text-[24px] font-semibold tracking-[-0.015em]">VTE prophylaxis re-audit</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--p-ink-2)]">Re-audited risk assessment on admission after the new prompt card.</p>
            <p className="mt-6 text-[12px] font-semibold text-[var(--p-ink-3)]">Tags</p>
            <Slot
              shown={active >= 1}
              placeholder="Add tags so you can find it again"
              content={
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone="warm">Haematology</Pill>
                  <Pill tone="warm">Quality improvement</Pill>
                  <Pill tone="primary">IMT</Pill>
                </div>
              }
            />
            <p className="mt-6 text-[12px] font-semibold text-[var(--p-ink-3)]">Use</p>
            <Slot
              shown={active >= 2}
              placeholder="Link it, export it or share it when you need it"
              content={
                <div className="space-y-2">
                  <p className="flex items-center gap-2.5 rounded-xl bg-[var(--p-primary-soft)] px-3.5 py-2.5 text-[13.5px] font-medium text-[var(--p-primary-text)]">
                    <LinkIcon className="h-4 w-4" /> Linked to IMT 2026: Quality Improvement
                  </p>
                  <p className="flex items-center gap-2.5 rounded-xl border border-[var(--p-line)] px-3.5 py-2.5 text-[13.5px]">
                    <FileIcon className="h-4 w-4 text-[var(--p-ink-3)]" /> Included in your application PDF
                  </p>
                  <p className="flex items-center gap-2.5 rounded-xl border border-[var(--p-line)] px-3.5 py-2.5 text-[13.5px]">
                    <LockIcon className="h-4 w-4 text-[var(--p-ink-3)]" /> Shareable through a PIN link
                  </p>
                </div>
              }
            />
          </div>
        </figure>
      </div>
    </section>
  )
}
