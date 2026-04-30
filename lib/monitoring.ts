export function logBackgroundJobError(context: string, error: unknown, metadata?: Record<string, unknown>) {
  console.error(JSON.stringify({
    level: 'error',
    context,
    message: error instanceof Error ? error.message : String(error),
    metadata: metadata ?? {},
    at: new Date().toISOString(),
  }))
}
