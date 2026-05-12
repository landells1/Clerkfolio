import path from 'path'
import { createRequire } from 'module'

// Load the .cjs PDF runtime through Node's CommonJS Module class directly.
// Why: Next.js 15 aliases 'react' to a vendored React 19 for server code, but
// @react-pdf/reconciler only recognises React 18's element $$typeof Symbol.
// Bundling the renderer through webpack produces React 19 elements that
// trigger error #31 inside renderToBuffer.
//
// Why _compile and not createRequire(absPath): createRequire's resolver runs
// relative to the calling module (the bundled route file in .next/server/...),
// not the project root, so userRequire('/var/task/lib/pdf/portfolio-pdf-
// runtime.cjs') throws MODULE_NOT_FOUND even when the file is at that exact
// path. Reading the source and compiling it through a fresh Module instance
// skips the resolver entirely and gives the runtime a real Node CJS context
// where 'react' resolves to the React 18 install in node_modules.
const userRequire = createRequire(import.meta.url)

type CompilableModule = {
  exports: PortfolioPdfRuntime
  _compile: (src: string, filename: string) => void
}

export type PortfolioPdfRuntime = {
  renderPortfolioPdf: (props: Record<string, unknown>) => Promise<Buffer>
}

let runtimeCache: PortfolioPdfRuntime | null = null

export function loadPortfolioPdfRuntime(): PortfolioPdfRuntime {
  if (runtimeCache) return runtimeCache
  const fs = userRequire('fs') as typeof import('fs')
  const Module = userRequire('module') as typeof import('module') & {
    new (id: string, parent?: unknown): CompilableModule
  }
  // outputFileTracingIncludes and vercel.json's includeFiles can land the
  // runtime in slightly different places depending on how Vercel packs the
  // lambda - try the standard cwd first, then a couple of fallbacks.
  const candidates = [
    path.join(process.cwd(), 'lib', 'pdf', 'portfolio-pdf-runtime.cjs'),
    path.join(process.cwd(), '.next', 'server', 'lib', 'pdf', 'portfolio-pdf-runtime.cjs'),
    path.join(process.cwd(), '.next', 'server', 'app', 'api', 'export', 'lib', 'pdf', 'portfolio-pdf-runtime.cjs'),
  ]
  let lastError: Error | null = null
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue
      const source = fs.readFileSync(candidate, 'utf-8')
      const mod = new Module(candidate) as unknown as CompilableModule
      mod._compile(source, candidate)
      runtimeCache = mod.exports
      return runtimeCache
    } catch (err) {
      lastError = err as Error
    }
  }
  throw new Error(
    `Could not load portfolio-pdf-runtime.cjs. Tried: ${candidates.join(', ')}. Last error: ${lastError?.message ?? 'none'}. cwd=${process.cwd()}`
  )
}
