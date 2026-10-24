// Bench-only fetch interceptor around the OpenAI SDK traffic produced by lib/llm/callLLM.
//  - records the model id the API actually returned, and usage incl. reasoning + cached tokens
//  - for non-gpt-4o models rewrites the request body the way those models require (no temperature,
//    max_completion_tokens, explicit reasoning_effort) WITHOUT touching production code
// callLLM captures globalThis.fetch when it first builds its client, so install() must run before the
// first call. Never logs prompts, responses or keys.
import { AsyncLocalStorage } from 'node:async_hooks'

export interface CallRecord {
  requestedModel: string
  returnedModel: string
  effort: string
  prompt: number
  completion: number
  reasoning: number
  cached: number
  ms: number
  status: number
}

export interface Ctx { calls: CallRecord[]; config: { model: string; effort: string | null } }
export const als = new AsyncLocalStorage<Ctx>()

let installed = false
export function installSpy() {
  if (installed) return
  installed = true
  const real = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const ctx = als.getStore()
    if (!ctx || !url.includes('/v1/chat/completions') || typeof init?.body !== 'string') return real(input, init)

    const body = JSON.parse(init.body) as Record<string, unknown>
    const cfg = ctx.config
    if (cfg.effort !== null) {
      delete body.temperature
      delete body.max_tokens
      body.max_completion_tokens = 16000 // reasoning tokens count against this cap; don't let it cause fake failures
      body.reasoning_effort = cfg.effort
    }
    body.model = cfg.model
    const t0 = Date.now()
    const res = await real(input, { ...init, body: JSON.stringify(body) })
    const clone = res.clone()
    try {
      const j = (await clone.json()) as {
        model?: string
        usage?: { prompt_tokens?: number; completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number }; prompt_tokens_details?: { cached_tokens?: number } }
      }
      ctx.calls.push({
        requestedModel: cfg.model,
        returnedModel: j.model ?? '?',
        effort: cfg.effort ?? '—',
        prompt: j.usage?.prompt_tokens ?? 0,
        completion: j.usage?.completion_tokens ?? 0,
        reasoning: j.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
        cached: j.usage?.prompt_tokens_details?.cached_tokens ?? 0,
        ms: Date.now() - t0,
        status: res.status,
      })
    } catch {
      ctx.calls.push({ requestedModel: cfg.model, returnedModel: '?', effort: cfg.effort ?? '—', prompt: 0, completion: 0, reasoning: 0, cached: 0, ms: Date.now() - t0, status: res.status })
    }
    return res
  }) as typeof fetch
}

/** USD per 1M tokens: [input, cached input, output]. Source: OpenAI model pages (re-check before relying on them). */
export const PRICES: Record<string, [number, number, number]> = {
  'gpt-4o-mini': [0.15, 0.075, 0.6],
  'gpt-6-luna': [0.1, 0.01, 0.5],
  'gpt-5.4-mini': [0.75, 0.075, 4.5],
  'gpt-5.6-terra': [2, 0.2, 12],
  'gpt-6.1-sol': [2, 0.1, 10],
}

export function costOf(model: string, c: Pick<CallRecord, 'prompt' | 'completion' | 'cached'>): number {
  const p = PRICES[model]
  if (!p) return NaN
  return ((c.prompt - c.cached) * p[0] + c.cached * p[1] + c.completion * p[2]) / 1e6 // completion includes reasoning tokens
}
