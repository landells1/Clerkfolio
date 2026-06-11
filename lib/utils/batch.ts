// Run an async worker over items with bounded concurrency. Used by the cron
// email loops so per-user admin lookups + Resend sends don't run strictly
// serially (which brushes maxDuration as the user base grows) or all at once
// (which trips Resend/Supabase admin rate limits). Worker errors must be
// handled inside the worker; a rejection here would abort the whole batch.
export async function processInBatches<T>(
  items: readonly T[],
  batchSize: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(worker))
  }
}
