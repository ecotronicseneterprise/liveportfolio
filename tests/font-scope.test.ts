// The sans-serif fix is scoped to named routes. Portfolio pages, previews, templates, the create flow and the root layout must not use it.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const app = path.resolve(__dirname, '..', 'app')
const uses = (rel: string) => { const f = path.join(app, rel); return fs.existsSync(f) && /SansScope|SansShell/.test(fs.readFileSync(f, 'utf8')) }

describe('font scope', () => {
  it.each(['layout.tsx', 'portfolio/layout.tsx', 'portfolio/[slug]/layout.tsx', 'preview/layout.tsx', 'create/layout.tsx', 'dashboard/layout.tsx'])('%s does not apply the site font wrapper', (rel) => {
    expect(uses(rel)).toBe(false)
  })
  it.each(['login', 'terms', 'privacy', 'blog', 'reset-password', 'portfolio-for'])('%s does', (d) => {
    expect(uses(`${d}/layout.tsx`)).toBe(true)
  })
})
