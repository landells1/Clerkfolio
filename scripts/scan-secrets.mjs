import { execFileSync } from 'node:child_process'

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
  { name: 'Supabase service role JWT', regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
]

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

const files = stagedFiles()
const hits = []

for (const file of files) {
  let content = ''
  try {
    content = execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  } catch {
    continue
  }
  for (const pattern of patterns) {
    if (pattern.regex.test(content)) hits.push(`${file}: ${pattern.name}`)
  }
}

if (hits.length > 0) {
  console.error('Potential secrets detected in staged files:')
  hits.forEach(hit => console.error(`- ${hit}`))
  process.exit(1)
}
