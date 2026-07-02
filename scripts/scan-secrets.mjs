import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const patterns = [
  // Stripe key alphabets include underscores and hyphens; raise the minimum body length to 20.
  { name: 'Stripe secret key', regex: /sk_(live|test)_[A-Za-z0-9_-]{20,}/ },
  { name: 'Stripe restricted key', regex: /rk_(live|test)_[A-Za-z0-9_-]{20,}/ },
  { name: 'Stripe webhook secret', regex: /whsec_[A-Za-z0-9]{16,}/ },
  // Real Resend keys are mixed-case alphanumeric and always contain digits.
  // The previous pure-letter+underscore form false-positived on identifiers
  // like `ensure_profile_for_current_user` (matches `re_profile_for_current_user`).
  // Require at least one digit anywhere in the suffix to discriminate.
  { name: 'Resend API key', regex: /re_(?=[A-Za-z0-9_]*[0-9])[A-Za-z0-9_]{16,}/ },
  // Require realistic minimum lengths on all three JWT segments so obvious
  // placeholders like `eyJ...dummy.dummy` (used in CI's dummy build env and
  // .github/workflows/ci.yml) no longer false-positive, while real Supabase
  // tokens (long base64url header/payload/signature) still match.
  { name: 'Supabase service role JWT', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
]

// Default mode diff-scans git-STAGED files (the pre-commit hook design), so a
// run on a clean tree always passes and certifies nothing. Pass --all to scan
// every tracked file in the working tree instead, which makes the script
// meaningful as a standalone audit gate.
const scanAll = process.argv.includes('--all')

function stagedFiles() {
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean)
      .filter(file => !file.endsWith('package-lock.json'))
  } catch {
    return []
  }
}

function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean)
      .filter(file => !file.endsWith('package-lock.json'))
  } catch {
    return []
  }
}

function fileContent(file) {
  try {
    // Staged mode reads the index (what will actually be committed); --all
    // reads the working tree.
    if (scanAll) {
      return readFileSync(file, 'utf8')
    }
    return execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  } catch {
    return null
  }
}

const files = scanAll ? trackedFiles() : stagedFiles()
const hits = []

for (const file of files) {
  const content = fileContent(file)
  if (content === null) continue
  for (const pattern of patterns) {
    if (pattern.regex.test(content)) hits.push(`${file}: ${pattern.name}`)
  }
}

if (hits.length > 0) {
  console.error(`Potential secrets detected in ${scanAll ? 'tracked' : 'staged'} files:`)
  hits.forEach(hit => console.error(`- ${hit}`))
  process.exit(1)
}
