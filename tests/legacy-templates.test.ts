// Pro baselines reviewed 2026-10-25: explicit credentials, complete fields/links, semantic headings, no false metrics/process/availability.
// The three FREE baselines remain byte-identical to 808555e. V2 redesigns live separately; they are not these baselines.
// REGRESSION GUARD for existing portfolios. Every portfolio saved before the block renderer has no `layout` field and must keep rendering
// through today's template component, byte for byte. This renders all 10 templates from one fixed fixture and compares a SHA-256 of the
// markup with the value recorded BEFORE the block renderer was added (tests/fixtures/legacy-template-hashes.json).
// If a hash changes you have changed what live portfolios look like. If that is intended for a Pro template, regenerate with:
//   UPDATE_LEGACY_HASHES=1 npx vitest run tests/legacy-templates.test.ts
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useRegion', () => ({ useRegion: () => ({ region: 'NG', loading: false }) }))

import Minimal from '../components/templates/Minimal'
import Bold from '../components/templates/Bold'
import Creative from '../components/templates/Creative'
import Developer from '../components/templates/Developer'
import Designer from '../components/templates/Designer'
import DataScientist from '../components/templates/DataScientist'
import ProductManager from '../components/templates/ProductManager'
import Finance from '../components/templates/Finance'
import Graduate from '../components/templates/Graduate'
import Cybersecurity from '../components/templates/Cybersecurity'
import type { PortfolioContent } from '../components/templates/Minimal'

const FIXTURE: PortfolioContent = {
  name: 'Ada Okonkwo',
  role: 'Backend engineer',
  headline: 'I build payment systems that stay up, and I can show you the numbers.',
  about: 'Five years building payment and ledger systems in Go and Postgres.\n\nI like the unglamorous parts of reliability: idempotency, reconciliation and the dashboards that tell you a problem exists.',
  location: 'Lagos, Nigeria',
  email: 'ada@example.com',
  github_url: 'https://github.com/adaokonkwo',
  linkedin_url: 'https://linkedin.com/in/adaokonkwo',
  skills: ['Go', 'Python', 'SQL', 'Postgres', 'Redis', 'Kafka', 'Kubernetes'],
  skills_narrative: 'Strongest in Go services and Postgres.',
  skills_grouped: [{ category: 'Languages', items: ['Go', 'Python', 'SQL'] }, { category: 'Data', items: ['Postgres', 'Redis', 'Kafka'] }],
  projects: [
    { title: 'Ledger migration', problem: 'The old ledger could not reconcile card and bank transfers.', solution: 'Moved to an append-only double-entry ledger.', outcome: 'Reconciliation went from 3 hours to 9 minutes.', stack: ['Go', 'Postgres'], url: 'https://example.com/ledger' },
    { title: 'Rate limiter', problem: 'Twelve services each rolled their own limits.', solution: 'A shared token-bucket limiter.', outcome: 'p95 latency down 40% during spikes.', stack: ['Go', 'Redis'] },
  ],
  experience: [
    { company: 'Acme Payments', role: 'Senior software engineer', period: '2022 to now', bullets: ['Led the ledger migration.', 'Cut p95 payment latency by 40%.'] },
    { company: 'Kobo Finance', role: 'Software engineer', period: '2019 to 2022', bullets: ['Built the card-settlement service.'] },
  ],
  education: [{ degree: 'B.Eng. Electrical Engineering', institution: 'University of Lagos', year: '2018', grade: 'First class' }],
  certifications: ['AWS Certified Solutions Architect'],
  testimonials: [{ text: 'Ada is the person we call when a number does not add up.', author: 'Tunde Bakare', role: 'Head of Engineering', company: 'Acme Payments' }],
}

const COMPONENTS = { minimal: Minimal, bold: Bold, creative: Creative, developer: Developer, designer: Designer, 'data-scientist': DataScientist, 'product-manager': ProductManager, finance: Finance, graduate: Graduate, cybersecurity: Cybersecurity } as const
const FILE = path.resolve(__dirname, 'fixtures/legacy-template-hashes.json')
const hash = (id: keyof typeof COMPONENTS) => {
  const html = renderToStaticMarkup(createElement(COMPONENTS[id] as React.ComponentType<{ content: PortfolioContent }>, { content: FIXTURE }))
  return { sha256: crypto.createHash('sha256').update(html).digest('hex'), bytes: Buffer.byteLength(html) }
}

describe('legacy templates render exactly as they did before the block renderer', () => {
  const ids = Object.keys(COMPONENTS) as Array<keyof typeof COMPONENTS>
  if (process.env.PRINT_LEGACY_HASHES) {
    it('(print hashes for review; does not update baselines)', () => {
      console.log(JSON.stringify(Object.fromEntries(ids.map((id) => [id, hash(id)])), null, 2))
    })
    return
  }
  if (process.env.UPDATE_LEGACY_HASHES) {
    it('(regenerating the recorded hashes)', () => {
      fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(ids.map((id) => [id, hash(id)])), null, 2) + '\n')
    })
    return
  }
  const recorded = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Record<string, { sha256: string; bytes: number }>
  it('all ten templates are recorded', () => expect(Object.keys(recorded).sort()).toEqual([...ids].sort()))
  it.each(ids)('%s: markup is byte-identical to the recorded output', (id) => {
    const now = hash(id)
    expect(now.bytes, `${id} output size changed`).toBe(recorded[id].bytes)
    expect(now.sha256, `${id} markup changed: existing portfolios would look different`).toBe(recorded[id].sha256)
  })
  it('rendering is deterministic (same input, same bytes, twice)', () => {
    for (const id of ids) expect(hash(id).sha256).toBe(hash(id).sha256)
  })
})
