// CI check: all LLM traffic goes through lib/llm/callLLM.
// Fails if the `openai` package (any subpath) or api.openai.com appears outside lib/llm.
//
//   node scripts/check-llm-boundary.mjs        (npm run check:llm)

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FORBIDDEN = [
  { re: /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]openai(?:\/[^'"]*)?['"]/, what: "import of the 'openai' package" },
  { re: /api\.openai\.com/, what: 'direct call to api.openai.com' },
]

// Files allowed to bypass the gateway, with the reason. Keep this list short and temporary.
export const ALLOWLIST = new Map([
  // pending approval — /api/generate is out of scope until the PII gateway is A/B tested on fixtures
  ['app/api/generate/route.ts', 'pending approval'],
])

const SKIP_DIRS = new Set(['node_modules', '.next', '.next-template-review', '.git', 'tests', 'fixtures'])
const EXT = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) yield* walk(full)
    else if (EXT.test(name)) yield full
  }
}

export function scan(root, allow = ALLOWLIST) {
  const violations = []
  for (const file of walk(root)) {
    const rel = path.relative(root, file).split(path.sep).join('/')
    if (rel.startsWith('lib/llm/') || rel === 'scripts/check-llm-boundary.mjs') continue
    if (allow.has(rel)) continue
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line, i) => {
      if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) return // comments may mention the package
      for (const { re, what } of FORBIDDEN) {
        if (re.test(line)) violations.push({ file: rel, line: i + 1, what })
      }
    })
  }
  return violations
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const v = scan(root)
  if (v.length) {
    console.error('LLM boundary violations (use lib/llm callLLM instead):')
    for (const x of v) console.error(`  ${x.file}:${x.line}  ${x.what}`)
    process.exit(1)
  }
  console.log(`LLM boundary OK (allowlisted: ${[...ALLOWLIST].map(([f, r]) => `${f} — ${r}`).join('; ')})`)
}
