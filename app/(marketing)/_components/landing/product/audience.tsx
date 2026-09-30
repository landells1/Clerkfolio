'use client'

import { useState } from 'react'
import { VERIFIED_STORAGE_MB, formatStorageQuota } from '@/lib/entitlements/limits'
import { CheckIcon } from './icons'
import { CONTAINER } from './shared'
import styles from './product.module.css'

const audiences = [
  {
    label: 'Medical students',
    title: 'Start your portfolio before foundation training.',
    body: 'Keep audits, teaching, prizes, reflections and anonymised cases from the start. Tag anything you may want for foundation or academic applications.',
    bullets: ['Anonymised case journal', 'Track audits, QIPs and prizes', `A verified .ac.uk email gives you up to ${formatStorageQuota(VERIFIED_STORAGE_MB)} storage`],
  },
  {
    label: 'Foundation doctors',
    title: 'Keep your evidence in one place.',
    body: 'Log a case while it is fresh, save the supporting files and tag it for a specialty if it is relevant. When applications open, you can find what you need.',
    bullets: ['Quick logging from phone or desktop', 'Specialty self-assessment mapping', 'Share selected portfolio evidence'],
  },
  {
    label: 'Preparing applications',
    title: 'Your portfolio stays with you.',
    body: 'Your Clerkfolio portfolio belongs to you, not your trust. Move hospital, deanery, specialty or role and keep the same record.',
    bullets: ['Track supported specialties', 'Structured achievement categories', 'PDF, CSV, JSON and ZIP exports'],
  },
] as const

export function Audience() {
  const [active, setActive] = useState(0)
  const current = audiences[active]

  return (
    <section id="audience" aria-labelledby="audience-title" className="scroll-mt-20 py-24 sm:py-32">
      <div className={`${CONTAINER} text-center`}>
        <h2 id="audience-title" className={`${styles.display} mx-auto max-w-[20ch] text-[clamp(2.1rem,4vw,3.4rem)]`}>For medical school, foundation training and beyond.</h2>
        <p className={`${styles.prose} mx-auto mt-5 max-w-[32rem] text-[18px] leading-[1.6] text-[var(--p-ink-2)]`}>Keep one record as your role and priorities change.</p>
        <div role="tablist" aria-label="Career stage" className="mx-auto mt-10 inline-flex max-w-full flex-wrap justify-center gap-1 rounded-full bg-[var(--p-surface-2)] p-1">
          {audiences.map((audience, index) => (
            <button
              key={audience.label}
              type="button"
              role="tab"
              id={`audience-tab-${index}`}
              aria-selected={index === active}
              aria-controls="audience-panel"
              onClick={() => setActive(index)}
              className={`min-h-11 rounded-full px-4 text-[14.5px] font-medium transition-colors sm:px-5 ${index === active ? 'bg-[var(--p-ground)] text-[var(--p-ink)] shadow-[var(--p-shadow-card)]' : 'text-[var(--p-ink-2)] hover:text-[var(--p-ink)]'}`}
            >
              {audience.label}
            </button>
          ))}
        </div>
      </div>
      <div
        id="audience-panel"
        role="tabpanel"
        aria-labelledby={`audience-tab-${active}`}
        className={`${CONTAINER} mt-10`}
      >
        <div className="mx-auto grid max-w-[980px] grid-cols-1 gap-8 rounded-3xl border border-[var(--p-line)] bg-[var(--p-ground)] p-7 shadow-[var(--p-shadow-card)] sm:p-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:gap-12">
          <div>
            <h3 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{current.title}</h3>
            <p className={`${styles.prose} mt-4 text-[17px] leading-[1.6] text-[var(--p-ink-2)]`}>{current.body}</p>
          </div>
          <ul className="space-y-3.5 self-center">
            {current.bullets.map(bullet => (
              <li key={bullet} className="flex gap-3 text-[16px] leading-snug">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--p-teal-soft)] text-[var(--p-teal-text)]">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
