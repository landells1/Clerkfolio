// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mergeUniqueFiles } from '@/lib/upload/dedupe-files'

const file = (name: string, size: number) => ({ name, size })

describe('mergeUniqueFiles', () => {
  it('skips files already staged by name+size (BUG-007)', () => {
    const existing = [file('evidence.pdf', 100)]
    const incoming = [file('evidence.pdf', 100), file('evidence.png', 50)]
    expect(mergeUniqueFiles(existing, incoming)).toEqual([
      file('evidence.pdf', 100),
      file('evidence.png', 50),
    ])
  })

  it('de-duplicates within the incoming batch too', () => {
    const incoming = [file('a.txt', 10), file('a.txt', 10)]
    expect(mergeUniqueFiles([], incoming)).toEqual([file('a.txt', 10)])
  })

  it('keeps same-name files that differ in size', () => {
    const incoming = [file('a.txt', 10), file('a.txt', 20)]
    expect(mergeUniqueFiles([], incoming)).toEqual([file('a.txt', 10), file('a.txt', 20)])
  })

  it('returns existing unchanged when nothing new arrives', () => {
    const existing = [file('a.txt', 10)]
    expect(mergeUniqueFiles(existing, [])).toEqual(existing)
  })
})
