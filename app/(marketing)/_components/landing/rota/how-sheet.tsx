'use client'

import { useState } from 'react'
import styles from './rota.module.css'

// One example entry walked across three columns. Each step's cell holds the
// entry as it stands after that step, so the record visibly accumulates.
// Selecting a cell reads it into the formula bar, as in the career grid.
const steps = [
  {
    word: 'Log',
    body: 'Add cases or portfolio entries from your phone or desktop, in a minute or two each.',
    lines: ['Audit & QIP, Aug 2024'],
    readout: ['New entry', 'Audit & QIP, Aug 2024, FY1 at North trust'],
  },
  {
    word: 'Tag',
    body: 'Add clinical-area and specialty tags, then reuse them across your entries.',
    lines: ['Audit & QIP, Aug 2024', 'Haematology, Quality improvement', 'Specialty tag: IMT'],
    readout: ['Tagged', 'Haematology, Quality improvement, specialty tag IMT'],
  },
  {
    word: 'Use',
    body: 'Link entries to specialty domains, export a PDF, or share selected portfolio entries with a PIN.',
    lines: ['Audit & QIP, Aug 2024', 'Haematology, Quality improvement', 'Linked to IMT 2026: Quality Improvement'],
    readout: ['Linked', 'IMT 2026: Quality Improvement, ready for your application PDF or a PIN share link'],
  },
] as const

const ENTRY = 'VTE prophylaxis re-audit'

export function HowSheet() {
  const [active, setActive] = useState(0)
  const [status, detail] = steps[active].readout

  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-16 border-t-2 border-[var(--r-ink)]">
      <div className="px-4 pb-10 pt-20 sm:px-6 sm:pt-24 lg:px-10 lg:pb-12 lg:pt-28">
        <h2 id="how-title" className={`${styles.display} max-w-[22ch] text-[clamp(2.4rem,5.2vw,4.25rem)]`}>
          Record it once. Use it as you go.
        </h2>
      </div>
      <div className="flex min-h-12 items-stretch border-y border-[var(--r-grid)] text-sm">
        <div className={`${styles.label} flex w-16 flex-shrink-0 items-center justify-center border-r border-[var(--r-grid)] text-[12px] sm:w-24`}>
          {String.fromCharCode(66 + active)}2
        </div>
        <div className="flex w-10 flex-shrink-0 items-center justify-center border-r border-[var(--r-grid)] font-medium text-[var(--r-ink-3)]" aria-hidden="true">
          fx
        </div>
        <p aria-live="polite" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 px-3 py-2 leading-snug text-[var(--r-ink-2)] sm:px-4">
          <span className="font-semibold text-[var(--r-ink)]">{status}:</span>
          <span className="inline-flex items-center gap-2 text-[var(--r-ink)]">
            <span className="h-3 w-3 flex-shrink-0 bg-[var(--r-cat-audit)]" aria-hidden="true" />
            {ENTRY}
          </span>
          <span className={active === 2 ? 'text-[var(--r-select)]' : 'text-[var(--r-ink-3)]'}>{detail}</span>
        </p>
      </div>
      <div className={`${styles.scrollStrip} overflow-x-auto`}>
        <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-left">
          <caption className="sr-only">One example entry, logged, tagged and used. Select a step to read it.</caption>
          <colgroup>
            <col className="w-[132px] sm:w-[172px]" />
            {steps.map(step => <col key={step.word} />)}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={`${styles.cell} sticky left-0 z-10 bg-[var(--r-header)]`}>
                <span className="sr-only">Row</span>
              </th>
              {steps.map((step, index) => (
                <th key={step.word} scope="col" className={`${styles.cell} bg-[var(--r-header)] px-4 pb-4 pt-5 sm:px-6`}>
                  <span className={`${styles.display} block text-[clamp(3rem,6vw,4.75rem)] ${index === active ? 'text-[var(--r-ink)]' : 'text-[var(--r-ink-3)]'}`}>
                    {step.word}.
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className={`${styles.cell} sticky left-0 z-10 bg-[var(--r-ground)] px-4 text-[14px] font-semibold sm:px-6`}>
                The entry
              </th>
              {steps.map((step, index) => (
                <td key={step.word} className={`${styles.cell} h-[132px] p-0 align-top ${index === active ? styles.selected : ''}`}>
                  <button
                    type="button"
                    aria-pressed={index === active}
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    onClick={() => setActive(index)}
                    className="flex h-full w-full flex-col justify-start gap-1 bg-[var(--r-cat-audit)] px-4 py-4 text-left text-[var(--r-on-fill)] focus-visible:outline-none sm:px-5"
                  >
                    <span className="text-[15px] font-semibold leading-tight">{ENTRY}</span>
                    {step.lines.map(line => (
                      <span key={line} className="text-[13px] leading-snug opacity-80">{line}</span>
                    ))}
                  </button>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={`${styles.cell} sticky left-0 z-10 bg-[var(--r-ground)] px-4 text-[14px] font-semibold sm:px-6`}>
                What you do
              </th>
              {steps.map(step => (
                <td key={step.word} className={`${styles.cell} ${styles.prose} px-4 py-5 align-top text-[16px] leading-[1.6] text-[var(--r-ink-2)] sm:px-6`}>
                  {step.body}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
