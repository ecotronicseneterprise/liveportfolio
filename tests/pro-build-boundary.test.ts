import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'
import { scan, ALLOWLIST } from '../scripts/check-llm-boundary.mjs'

it('ignores generated review bundles without expanding the source-code LLM allowlist', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'lp-boundary-'))
  try {
    mkdirSync(path.join(root, '.next-template-review'))
    writeFileSync(path.join(root, '.next-template-review', 'bundle.js'), 'fetch("https://api.openai.com")')
    expect(scan(root)).toEqual([])
    writeFileSync(path.join(root, 'unsafe.ts'), 'import OpenAI from "openai"')
    expect(scan(root)).toHaveLength(1)
    expect([...ALLOWLIST.keys()]).toEqual(['app/api/generate/route.ts'])
  } finally { rmSync(root, { recursive: true, force: true }) }
})