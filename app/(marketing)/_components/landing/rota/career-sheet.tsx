'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CATEGORIES, DEFAULT_SELECTION, ENTRIES, STAGES, cellAddress } from './career-data'
import styles from './rota.module.css'

type Selection = keyof typeof ENTRIES

export function CareerSheet() {
  const [selected, setSelected] = useState<Selection>(DEFAULT_SELECTION)
  const stripRef = useRef<HTMLDivElement>(null)

  // On a phone the strip scrolls sideways: bring the default selection into
  // view so the formula bar never describes a cell the visitor cannot see.
  useEffect(() => {
    const strip = stripRef.current
    const cell = strip?.querySelector<HTMLElement>('[aria-pressed="true"]')?.parentElement
    if (!strip || !cell || strip.scrollWidth <= strip.clientWidth) return
    const frozen = strip.querySelector('th')?.getBoundingClientRect().width ?? 0
    strip.scrollLeft = Math.max(0, cell.offsetLeft - frozen)
  }, [])

  const [stageKey, categoryKey] = selected.split(':')
  const stageIndex = STAGES.findIndex(stage => stage.key === stageKey)
  const categoryIndex = CATEGORIES.findIndex(category => category.key === categoryKey)
  const stage = STAGES[stageIndex]
  const category = CATEGORIES[categoryIndex]
  const entry = ENTRIES[selected]

  return (
    <div className="border-t border-[var(--r-grid)]">
      {/* Formula bar: the selected cell's address and what it holds. */}
      <div className="flex min-h-12 items-stretch border-b border-[var(--r-grid)] bg-[var(--r-ground)] text-sm">
        <div className={`${styles.label} flex w-16 flex-shrink-0 items-center justify-center border-r border-[var(--r-grid)] text-[12px] text-[var(--r-ink)] sm:w-24`}>
          {cellAddress(stageIndex, categoryIndex)}
        </div>
        <div className="flex w-10 flex-shrink-0 items-center justify-center border-r border-[var(--r-grid)] font-medium text-[var(--r-ink-3)]" aria-hidden="true">
          fx
        </div>
        <p aria-live="polite" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 px-3 py-2 leading-snug text-[var(--r-ink-2)] sm:px-4">
          <span className="inline-flex items-center gap-2 font-semibold text-[var(--r-ink)]">
            <span className="h-3 w-3 flex-shrink-0" style={{ background: category.fill }} aria-hidden="true" />
            {category.label}
          </span>
          <span>{entry?.title}</span>
          <span className="text-[var(--r-ink-3)]">{stage.label}, {stage.where}, {entry?.when}</span>
          {entry?.linked ? <span className="text-[var(--r-select)]">Linked to {entry.linked}</span> : null}
        </p>
      </div>

      {/* The career grid scrolls sideways on phones with its row labels frozen, as a real sheet would. */}
      <div ref={stripRef} className={`${styles.scrollStrip} overflow-x-auto`}>
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 text-left">
          <caption className="sr-only">
            Example career record: portfolio categories by training stage. Select a filled cell to see the entry.
          </caption>
          <colgroup>
            <col className="w-[132px] sm:w-[172px]" />
            {STAGES.map(item => <col key={item.key} />)}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={`${styles.cell} sticky left-0 z-10 bg-[var(--r-header)] px-4 py-3 text-[12px] font-normal text-[var(--r-ink-3)]`}>
                <span className="sr-only">Category</span>
              </th>
              {STAGES.map((item, index) => (
                <th
                  key={item.key}
                  scope="col"
                  className={`${styles.cell} ${styles.label} bg-[var(--r-header)] px-3 py-3 text-[12px] ${index === stageIndex ? 'text-[var(--r-select)]' : 'text-[var(--r-ink)]'}`}
                >
                  {item.label}
                </th>
              ))}
            </tr>
            <tr>
              <th scope="row" className={`${styles.cell} sticky left-0 z-10 bg-[var(--r-header)] px-4 py-2.5 text-[13px] font-medium text-[var(--r-ink-3)]`}>
                Where
              </th>
              {STAGES.map(item => (
                <td key={item.key} className={`${styles.cell} bg-[var(--r-header)] px-3 py-2.5 text-[13px] text-[var(--r-ink-2)]`}>
                  {item.where}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((row, rowIndex) => (
              <tr key={row.key}>
                <th scope="row" className={`${styles.cell} sticky left-0 z-10 bg-[var(--r-ground)] px-4 text-[14px] font-semibold text-[var(--r-ink)]`}>
                  <span className="flex items-center gap-2.5">
                    <span className="h-3 w-3 flex-shrink-0" style={{ background: row.fill }} aria-hidden="true" />
                    {row.label}
                  </span>
                </th>
                {STAGES.map((column, columnIndex) => {
                  const key = `${column.key}:${row.key}` as Selection
                  const item = ENTRIES[key]
                  const isSelected = key === selected
                  return (
                    <td key={column.key} className={`${styles.cell} h-[68px] p-0 ${isSelected ? styles.selected : ''}`}>
                      {item ? (
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onMouseEnter={() => setSelected(key)}
                          onFocus={() => setSelected(key)}
                          onClick={() => setSelected(key)}
                          className={`${styles.fill} flex h-full w-full flex-col justify-center px-3 text-left text-[var(--r-on-fill)] focus-visible:outline-none`}
                          style={{ background: row.fill, '--col': columnIndex, '--row': rowIndex } as CSSProperties}
                        >
                          <span className="line-clamp-2 text-[13.5px] font-semibold leading-tight">{item.title}</span>
                          <span className="mt-1 block text-[12px] leading-none opacity-75">{item.when}</span>
                        </button>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
