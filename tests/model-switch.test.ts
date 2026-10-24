// The model is switchable with LLM_MODEL (no deploy), /api/generate sends the parameters the chosen family accepts, and the
// e-mail address is never put in the prompt. Parameter facts for gpt-6-luna were verified against the live API on 2026-10-24.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  user: { id: 'u', email: 'ada@example.com' } as { id: string; email: string },
  calls: [] as Array<Record<string, unknown>>,
  failFirst: false,
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: h.user }, error: null }) } }) }))
vi.mock('@/lib/supabase', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  h.ctx = createFakeDb()
  return { getSupabaseAdmin: () => h.ctx!.admin, getSupabaseClient: () => ({}) }
})
vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: async (args: Record<string, unknown>) => {
          h.calls.push(args)
          if (h.failFirst && h.calls.length === 1) throw new Error('boom')
          return { choices: [{ message: { content: JSON.stringify({ headline: 'h', about: 'a', skills_narrative: 's', skills_grouped: [], projects: [], experience: [], education: [], certifications: [], seo_title: 't', seo_description: 'd' }) } }] }
        },
      },
    }
  },
}))

import '@/lib/supabase'
import { NextRequest } from 'next/server'
import { POST } from '../app/api/generate/route'
import { paramsFor, resolveModel, DEFAULT_MODEL } from '../lib/llm/model'
import { buildGenerationPrompt } from '../lib/prompts'

const ENV_KEYS = ['LLM_MODEL', 'LLM_REASONING_EFFORT'] as const
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k] }
  h.calls.length = 0
  h.failFirst = false
  if (h.ctx) h.ctx.db.portfolios = []
})
afterEach(() => {
  for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] }
})

let n = 0
const generate = () =>
  POST(new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    headers: { authorization: 'Bearer t', 'content-type': 'application/json', 'x-forwarded-for': `10.9.0.${++n}` },
    body: JSON.stringify({ name: 'Ada', role: 'Backend engineer', email: 'ada@example.com', location: 'Lagos', bio: 'I build payment systems.', skills: ['Go'], projects: [{ title: 'Invoice parser', description: 'd', stack: ['go'] }], experience: [], education: [], template: 'minimal' }),
  }))

describe('resolveModel', () => {
  it('defaults to gpt-4o-mini, follows LLM_MODEL (trimmed), and an explicit argument wins', () => {
    expect(DEFAULT_MODEL).toBe('gpt-4o-mini')
    expect(resolveModel()).toBe('gpt-4o-mini')
    process.env.LLM_MODEL = '  gpt-6-luna  '
    expect(resolveModel()).toBe('gpt-6-luna')
    expect(resolveModel('gpt-4o')).toBe('gpt-4o')
    process.env.LLM_MODEL = ''
    expect(resolveModel()).toBe('gpt-4o-mini')
  })
})

describe('paramsFor', () => {
  it('gpt-4o family keeps temperature and max_tokens', () => {
    expect(paramsFor('gpt-4o-mini', {})).toEqual({ temperature: 0.2, max_tokens: 1200 })
    expect(paramsFor('gpt-4o-mini', { temperature: 0.7, maxTokens: 900 })).toEqual({ temperature: 0.7, max_tokens: 900 })
  })
  it('gpt-6 sends reasoning_effort none and max_completion_tokens, never max_tokens', () => {
    const p = paramsFor('gpt-6-luna', { maxTokens: 900 })
    expect(p).toEqual({ reasoning_effort: 'none', max_completion_tokens: 900 })
    expect(p).not.toHaveProperty('max_tokens')
    expect(paramsFor('GPT-6-Luna', {})).toMatchObject({ max_completion_tokens: 1200 })
  })
  it('gpt-6 sends temperature only when the caller asks for one AND effort is none', () => {
    expect(paramsFor('gpt-6-luna', { temperature: 0.7 })).toMatchObject({ temperature: 0.7, reasoning_effort: 'none' })
    expect(paramsFor('gpt-6-luna', {})).not.toHaveProperty('temperature')
    process.env.LLM_REASONING_EFFORT = 'low'
    const p = paramsFor('gpt-6-luna', { temperature: 0.7 })
    expect(p).toMatchObject({ reasoning_effort: 'low' })
    expect(p).not.toHaveProperty('temperature')
  })
})

describe('/api/generate model and parameters', () => {
  it('unchanged by default: gpt-4o-mini, temperature 0.7, max_tokens 1200', async () => {
    expect((await generate()).status).toBe(200)
    expect(h.calls[0]).toMatchObject({ model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 1200, response_format: { type: 'json_object' } })
    expect(h.calls[0]).not.toHaveProperty('reasoning_effort')
    expect(h.calls[0]).not.toHaveProperty('max_completion_tokens')
  })

  it('LLM_MODEL=gpt-6-luna switches it, with the parameters Luna accepts', async () => {
    process.env.LLM_MODEL = 'gpt-6-luna'
    expect((await generate()).status).toBe(200)
    expect(h.calls[0]).toMatchObject({ model: 'gpt-6-luna', reasoning_effort: 'none', max_completion_tokens: 1200, temperature: 0.7, response_format: { type: 'json_object' } })
    expect(h.calls[0]).not.toHaveProperty('max_tokens')
  })

  it('the retry uses the same model with the smaller cap in the right parameter', async () => {
    process.env.LLM_MODEL = 'gpt-6-luna'
    h.failFirst = true
    expect((await generate()).status).toBe(200)
    expect(h.calls).toHaveLength(2)
    expect(h.calls[1]).toMatchObject({ model: 'gpt-6-luna', max_completion_tokens: 1000 })
    expect(h.calls[1]).not.toHaveProperty('max_tokens')
  })
})

describe('the e-mail address is not sent to OpenAI', () => {
  it('not in the prompt text, and the schema no longer asks the model for it', () => {
    const p = buildGenerationPrompt({ name: 'Ada', role: 'Engineer', bio: '', location: 'Lagos', email: 'ada@example.com', skills: ['Go'], projects: [] })
    expect(p).not.toContain('ada@example.com')
    expect(p).not.toMatch(/\bEMAIL:/)
    expect(p).not.toMatch(/"email":/)
  })
  it('and not in what /api/generate actually sends', async () => {
    await generate()
    expect(JSON.stringify(h.calls[0])).not.toContain('ada@example.com')
    // the portfolio still gets the account's address (set by the route, not the model)
    expect(h.ctx!.db.portfolios[0].content.email).toBe('ada@example.com')
  })
})
