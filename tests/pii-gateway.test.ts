import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const h = vi.hoisted(() => ({
  sent: [] as Array<{ role: string; content: string }[]>,
  respond: (null as unknown) as (messages: { role: string; content: string }[]) => unknown,
}))

vi.mock('openai', () => {
  const handle = async (args: { messages: { role: string; content: string }[] }) => {
    h.sent.push(args.messages)
    const out = h.respond(args.messages)
    return { choices: [{ message: { parsed: out, content: JSON.stringify(out), refusal: null } }] }
  }
  return {
    default: class {
      chat = { completions: { parse: handle, create: handle } }
    },
  }
})

import { RegexEngine, detectKnownNames } from '../lib/llm/pii/regex-engine'
import { redact, restore, mergeSpans, parseThresholds } from '../lib/llm/pii/redact'
import { callLLM } from '../lib/llm'
import { LlmError, type PiiEngine } from '../lib/llm/pii/types'
import { importText } from '../lib/connectors/document'
import { scan } from '../scripts/check-llm-boundary.mjs'

const engine = new RegexEngine()
const found = (text: string) => engine.detect(text).map((s) => `${s.entity}:${text.slice(s.start, s.end)}`)

const ANY_PII = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/,
  /(?:\+?234|\b0)[789][01]\d[\s-]?\d{3}[\s-]?\d{4}/,
  /https?:\/\//,
  /linkedin\.com|github\.com/i,
  /\b\d{11}\b/,
]

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-key'
  delete process.env.PII_ENGINE
  delete process.env.PII_ON_ENGINE_FAILURE
  delete process.env.PII_SCORE_THRESHOLDS
  h.sent.length = 0
})
afterEach(() => vi.restoreAllMocks())

describe('RegexEngine', () => {
  it('finds emails and URLs/handles', () => {
    const t = 'Mail ada@example.com, see https://github.com/ada-l/proj. linkedin.com/in/ada-lovelace and www.ada.org, adadev.dev @ada_dev'
    const f = found(t)
    expect(f).toContain('EMAIL:ada@example.com')
    expect(f).toContain('URL:https://github.com/ada-l/proj')
    expect(f).toContain('URL:linkedin.com/in/ada-lovelace')
    expect(f).toContain('URL:www.ada.org')
    expect(f).toContain('URL:adadev.dev')
    expect(f).toContain('URL:@ada_dev')
  })

  it('finds Nigerian and international phone numbers', () => {
    for (const p of ['08012345678', '0803 123 4567', '+2348012345678', '+234 803 123 4567', '234-803-123-4567', '+1 415 555 2671', '+ (234) 803 123 4567', '(415) 555-2671']) {
      expect(found(`Call ${p} now`).some((x) => x.startsWith('PHONE:')), p).toBe(true)
    }
  })

  it('flags NIN/BVN style numbers only with context words', () => {
    expect(found('NIN: 12345678901')).toContain('ID:12345678901')
    expect(found('BVN 22212345678')).toContain('ID:22212345678')
    expect(found('Reference 12345678901 filed')).toEqual([])
  })

  it('finds Luhn-valid cards only', () => {
    expect(found('Card 4111 1111 1111 1111 expires').some((x) => x.startsWith('CARD:'))).toBe(true)
    expect(found('Card 4111 1111 1111 1112 expires')).toEqual([])
  })

  it('does not redact companies, skills, dates or versions', () => {
    const t = [
      'Node.js, Vue.js, Next.js, ASP.NET, Socket.io, TensorFlow, PyTorch, scikit-learn',
      'Paystack, Flutterwave, Andela, Amazon Web Services, Google Cloud, Microsoft Azure',
      'Lagos, Nigeria · Jan 2019 - Dec 2022 · v3.11.4 · 2021-2023 · 98.5% accuracy · 1,200 users',
      'Increased revenue by 35% across 4 regions; reduced latency from 450ms to 120ms',
    ].join('\n')
    expect(found(t)).toEqual([])
  })
})

describe('redact / restore', () => {
  it('round-trips and reuses one token per value', async () => {
    const t = 'ada@example.com and again ADA@example.com; phone 08012345678'
    const r = await redact(t)
    expect(r.text).toBe('[EMAIL_1] and again [EMAIL_1]; phone [PHONE_1]')
    const { value } = restore({ a: ['x [EMAIL_1]'], b: { c: '[PHONE_1]' } }, r.map)
    expect(value).toEqual({ a: ['x ada@example.com'], b: { c: '08012345678' } })
  })

  it('defuses token-lookalikes in user text', async () => {
    const r = await redact('literal [EMAIL_9] in text, mail a@b.com')
    expect(r.text).toContain('(EMAIL_9)')
    expect(r.text).toContain('[EMAIL_1]')
  })

  it('merges overlapping spans deterministically (ID beats phone, URL beats embedded email-like)', async () => {
    const spans = mergeSpans([
      { entity: 'PHONE', start: 5, end: 16, score: 0.7 },
      { entity: 'ID', start: 5, end: 16, score: 0.85 },
    ])
    expect(spans).toHaveLength(1)
    expect(spans[0].entity).toBe('ID')
    const r = await redact('NIN 08012345678 ok')
    expect(r.text).toBe('NIN [ID_1] ok')
  })

  it('honours per-entity thresholds', async () => {
    process.env.PII_SCORE_THRESHOLDS = 'URL=0.7'
    expect(parseThresholds()).toEqual({ URL: 0.7 })
    const r = await redact('visit adadev.dev or https://github.com/ada')
    expect(r.text).toBe('visit adadev.dev or [URL_1]') // bare domain (0.6) kept, full URL (0.95) redacted
  })

  it('exact-match names, case-insensitive, whole word only', () => {
    const t = 'Ada Lovelace led it. lovelace ada too. Adaptive systems. ADA  LOVELACE.'
    const spans = detectKnownNames(t, ['Ada Lovelace'])
    expect(spans.map((s) => t.slice(s.start, s.end))).toEqual(['Ada Lovelace', 'lovelace ada', 'ADA  LOVELACE'])
  })

  it('warns on, and strips, unknown tokens', () => {
    const { value, warnings } = restore({ x: 'hi [EMAIL_7] and [URL_1]' }, new Map([['[URL_1]', 'https://a.dev']]))
    expect(value.x).toBe('hi  and https://a.dev')
    expect(warnings).toHaveLength(1)
  })
})

describe('callLLM gateway', () => {
  const sample =
    'Ada Lovelace — ada@example.com — 08012345678 — https://linkedin.com/in/ada — NIN 12345678901. ' +
    'Backend engineer at Paystack, built a payments API.'

  it('sends no email/phone/URL/ID to the provider and restores the response', async () => {
    h.respond = () => ({ email: '[EMAIL_1]', about: 'Reach [NAME_1] at [PHONE_1] or [URL_1]' })
    const res = await callLLM<{ email: string; about: string }>({
      purpose: 't', pii: 'redact', system: 'sys', input: sample, names: ['Ada Lovelace'],
    })
    const payload = h.sent[0].map((m) => m.content).join('\n')
    for (const re of ANY_PII) expect(payload).not.toMatch(re)
    expect(payload).not.toContain('Ada Lovelace')
    expect(payload).toContain('Paystack') // non-contact content is untouched
    expect(res.data.email).toBe('ada@example.com')
    expect(res.data.about).toBe('Reach Ada Lovelace at 08012345678 or https://linkedin.com/in/ada')
    expect(res.redactions).toMatchObject({ EMAIL: 1, PHONE: 1, URL: 1, ID: 1, NAME: 1 })
    expect(h.sent[0][0].content).toContain('Copy a placeholder verbatim') // system prompt carries the token rule
  })

  it('mangled / unknown token → warning, no crash', async () => {
    h.respond = () => ({ note: 'mail [EMAIL_5] or [EMAIL_1]' })
    const res = await callLLM<{ note: string }>({ purpose: 't', pii: 'redact', system: 's', input: sample })
    expect(res.warnings.length).toBe(1)
    expect(res.data.note).not.toContain('[EMAIL_5]')
  })

  it("pii:'off' needs a reason; 'block' refuses when PII is present", async () => {
    h.respond = () => ({})
    await expect(callLLM({ purpose: 't', pii: 'off', reason: '', system: 's', input: 'x' })).rejects.toMatchObject({ code: 'not_configured' })
    await expect(callLLM({ purpose: 't', pii: 'block', system: 's', input: sample })).rejects.toMatchObject({ code: 'pii_blocked' })
    expect(h.sent).toHaveLength(0)
    await callLLM({ purpose: 't', pii: 'off', reason: 'public data only', system: 's', input: sample })
    expect(h.sent).toHaveLength(1)
  })

  it('engine down + block → explicit 503 and nothing is sent', async () => {
    const broken: PiiEngine = { name: 'broken', detect: () => { throw new Error('down') } }
    const err = await callLLM({ purpose: 't', pii: 'redact', system: 's', input: sample, engine: broken }).catch((e) => e)
    expect(err).toBeInstanceOf(LlmError)
    expect(err.status).toBe(503)
    expect(h.sent).toHaveLength(0)
  })

  it('unknown PII_ENGINE (e.g. presidio, not shipped) is an engine failure → 503', async () => {
    process.env.PII_ENGINE = 'presidio'
    await expect(callLLM({ purpose: 't', pii: 'redact', system: 's', input: sample })).rejects.toMatchObject({ code: 'pii_engine_unavailable' })
    expect(h.sent).toHaveLength(0)
  })

  it('regex_only fallback still redacts when the engine fails', async () => {
    process.env.PII_ON_ENGINE_FAILURE = 'regex_only'
    const broken: PiiEngine = { name: 'broken', detect: () => { throw new Error('down') } }
    h.respond = () => ({ ok: true })
    await callLLM({ purpose: 't', pii: 'redact', system: 's', input: sample, engine: broken })
    const payload = h.sent[0].map((m) => m.content).join('\n')
    for (const re of ANY_PII) expect(payload).not.toMatch(re)
  })
})

describe('import path: contact fields come from local detection, not the model', () => {
  it('ignores model-supplied contact data and never sends the real email upstream', async () => {
    const text =
      'Ada Lovelace\nada@example.com | +234 803 123 4567 | linkedin.com/in/ada-l | github.com/ada-l\n' +
      'Backend engineer. Built payments API at Paystack. Skills: Go, Postgres.'
    h.respond = () => ({
      name: 'Ada Lovelace', role: 'Backend engineer', location: null, bio: 'Backend engineer reachable at evil@attacker.com',
      skills: ['Go', 'Postgres'], certifications: [],
      projects: [{ title: 'Payments API', description: 'x', stack: ['Go'], url: 'https://made-up.dev' }],
      experience: [], education: [],
      email: 'invented@model.com', github_url: 'https://github.com/invented', // not in schema → must be ignored
    })
    const r = await importText(text, { names: ['Ada Lovelace'] })
    expect(r.profile.email).toBe('ada@example.com')
    expect(r.profile.github_url).toContain('github.com/ada-l')
    expect(r.profile.linkedin_url).toContain('linkedin.com/in/ada-l')
    expect(r.profile.projects![0].url).toBeUndefined() // URL not present in source → dropped
    const payload = h.sent[0].map((m) => m.content).join('\n')
    expect(payload).not.toContain('ada@example.com')
    expect(payload).not.toContain('Ada Lovelace')
    expect(payload).toContain('Paystack')
  })
})

describe('LLM boundary check', () => {
  it('flags openai imports and api.openai.com outside lib/llm, but not inside, in comments or allowlisted', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'llm-boundary-'))
    try {
      for (const [file, body] of Object.entries({
        'app/bad/route.ts': "import OpenAI from 'openai'\n",
        'app/bad2/route.ts': "const r = await fetch('https://api.openai.com/v1/chat/completions')\n",
        'app/bad3/route.ts': "const m = await import('openai/helpers/zod')\n",
        'app/ok/route.ts': "// we used to import OpenAI from 'openai' here\nexport {}\n",
        'lib/llm/call.ts': "import OpenAI from 'openai'\n",
        'app/api/generate/route.ts': "import OpenAI from 'openai'\n",
      })) {
        mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
        writeFileSync(path.join(root, file), body)
      }
      const v = scan(root, new Map([['app/api/generate/route.ts', 'pending approval']]))
      expect(v.map((x: { file: string }) => x.file).sort()).toEqual(['app/bad/route.ts', 'app/bad2/route.ts', 'app/bad3/route.ts'])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('the real repo is clean', () => {
    expect(scan(path.resolve(__dirname, '..'))).toEqual([])
  })
})
