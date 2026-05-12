import path from 'path'

// Load the .cjs PDF runtime through Node's CommonJS Module class directly.
// Why: Next.js 15 aliases 'react' to a vendored React 19 for server code, but
// @react-pdf/reconciler only recognises React 18's element $$typeof Symbol.
// Bundling the renderer through webpack produces React 19 elements that
// trigger error #31 inside renderToBuffer.
//
// Why _compile + __non_webpack_require__: createRequire(import.meta.url) gets
// captured by webpack at build time - its .resolve returns a numeric module
// id (74515 in production) and its require() can't resolve string ids like
// 'react' at runtime. __non_webpack_require__ is the canonical webpack escape
// hatch; it survives the bundle as Node's native CJS require, which CAN walk
// /var/task/node_modules and find the React 18 install we ship via the trace
// includes.
declare const __non_webpack_require__: NodeRequire
const userRequire: NodeRequire = __non_webpack_require__

type CompilableModule = {
  exports: PortfolioPdfRuntime
  require: NodeRequire
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
      // The .cjs lives at /var/task/lib/pdf/, but node_modules/react isn't
      // co-located there - serverExternalPackages keeps react + @react-pdf
      // resolvable from the route bundle's location instead. Delegate the
      // compiled module's require() to userRequire (anchored at the bundled
      // route file) so require('react') and require('@react-pdf/renderer')
      // inside the .cjs hit the same modules the route can already see.
      mod.require = userRequire
      mod._compile(source, candidate)
      runtimeCache = mod.exports
      return runtimeCache
    } catch (err) {
      lastError = err as Error
    }
  }
  // Diagnostic: dump what's actually under /var/task so we can see where
  // react/@react-pdf landed (if anywhere) and adjust the include globs.
  const diag: Record<string, string[] | string> = {}
  try {
    diag.task = fs.readdirSync('/var/task').slice(0, 30)
    diag.taskNm = fs.existsSync('/var/task/node_modules')
      ? fs.readdirSync('/var/task/node_modules').slice(0, 40)
      : '<none>'
    diag.next = fs.existsSync('/var/task/.next/server')
      ? fs.readdirSync('/var/task/.next/server').slice(0, 20)
      : '<none>'
    diag.nextNm = fs.existsSync('/var/task/.next/server/node_modules')
      ? fs.readdirSync('/var/task/.next/server/node_modules').slice(0, 40)
      : '<none>'
    try {
      diag.resolveReact = [userRequire.resolve('react')]
    } catch (e) { diag.resolveReact = [(e as Error).message] }
  } catch (e) { diag.error = (e as Error).message }
  throw new Error(
    `Could not load portfolio-pdf-runtime.cjs. Tried: ${candidates.join(', ')}. Last error: ${lastError?.message ?? 'none'}. cwd=${process.cwd()}. Diag: ${JSON.stringify(diag)}`
  )
}
