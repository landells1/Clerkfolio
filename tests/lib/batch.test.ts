// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { processInBatches } from '@/lib/utils/batch'

describe('processInBatches', () => {
  it('processes every item exactly once', async () => {
    const seen: number[] = []
    await processInBatches([1, 2, 3, 4, 5], 2, async item => {
      seen.push(item)
    })
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it('never runs more than batchSize workers concurrently', async () => {
    const items = Array.from({ length: 9 }, (_, i) => i)
    let inFlight = 0
    let maxInFlight = 0

    await processInBatches(items, 3, async () => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise(resolve => setTimeout(resolve, 5))
      inFlight--
    })

    expect(maxInFlight).toBeLessThanOrEqual(3)
  })

  it('runs batches sequentially: a slow item in batch 1 delays batch 2 from starting', async () => {
    const order: string[] = []
    const items = [1, 2, 3, 4]

    await processInBatches(items, 2, async item => {
      const delay = item === 1 ? 30 : 5
      await new Promise(resolve => setTimeout(resolve, delay))
      order.push(`done:${item}`)
    })

    // Batch 1 = [1, 2]; item 1 is slow (30ms) so item 2 (5ms) finishes first,
    // but BOTH must complete before batch 2 = [3, 4] starts, and within batch 2
    // both are fast so they finish close together after batch 1's slowest item.
    expect(order.indexOf('done:1')).toBeLessThan(order.indexOf('done:3'))
    expect(order.indexOf('done:1')).toBeLessThan(order.indexOf('done:4'))
    expect(order.indexOf('done:2')).toBeLessThan(order.indexOf('done:3'))
  })

  it('handles a batch size larger than the item count (single batch)', async () => {
    const seen: number[] = []
    await processInBatches([1, 2], 10, async item => {
      seen.push(item)
    })
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2])
  })

  it('does nothing for an empty item list', async () => {
    const worker = vi.fn(async () => {})
    await processInBatches([], 5, worker)
    expect(worker).not.toHaveBeenCalled()
  })

  it('handles batchSize of 1 (fully serial)', async () => {
    const order: number[] = []
    await processInBatches([1, 2, 3], 1, async item => {
      order.push(item)
    })
    expect(order).toEqual([1, 2, 3])
  })

  // CURRENT BEHAVIOR (pinning, not endorsing): processInBatches does not catch
  // worker rejections itself. Promise.all rejects on the first failing worker
  // within a batch, which propagates out of processInBatches and aborts any
  // remaining batches entirely - so a single unhandled failure can silently
  // drop every item in later batches from being processed, with no logging at
  // this layer. The doc comment on lib/utils/batch.ts is explicit about this:
  // "Worker errors must be handled inside the worker; a rejection here would
  // abort the whole batch." The real cron callers (weekly-digest,
  // monthly-digest, notifications routes) DO follow that contract - each
  // wraps its resend.emails.send in try/catch and calls logBackgroundJobError
  // on failure - so in practice a single user's send failure does not lose
  // the rest of the batch. This test pins what happens if a FUTURE worker
  // fails to follow that contract (forgets the try/catch): the failure is not
  // isolated to that item, and not logged by processInBatches itself.
  it('BUG-PINNING: a worker rejection propagates and aborts remaining batches (no isolation, no logging)', async () => {
    const processed: number[] = []
    const items = [1, 2, 3, 4, 5, 6]

    const promise = processInBatches(items, 2, async item => {
      if (item === 3) throw new Error('boom')
      processed.push(item)
    })

    await expect(promise).rejects.toThrow('boom')
    // Batch 1 = [1,2] completed (both pushed). Batch 2 = [3,4]: item 4 may or
    // may not have pushed depending on scheduling, but batch 3 = [5,6] never
    // ran because processInBatches awaits each batch before starting the next
    // and the rejection stops the loop outright.
    expect(processed).toContain(1)
    expect(processed).toContain(2)
    expect(processed).not.toContain(5)
    expect(processed).not.toContain(6)
  })

  it('a worker that catches its own error (per the documented contract) lets the batch complete, with that one item skipped', async () => {
    const processed: number[] = []
    const logged: string[] = []
    const items = [1, 2, 3, 4]

    // Mirrors the real cron pattern (try/catch + logBackgroundJobError per
    // item) rather than a silent swallow - this is the CORRECT usage that
    // the production callers actually implement.
    await processInBatches(items, 2, async item => {
      try {
        if (item === 2) throw new Error('email send failed')
        processed.push(item)
      } catch (err) {
        logged.push(`item ${item}: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    })

    expect(processed).toEqual([1, 3, 4])
    expect(logged).toEqual(['item 2: email send failed'])
  })
})
