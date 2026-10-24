import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import type { ZodType } from 'zod'
import { LlmError, PiiEngine, PiiEntity } from './pii/types'
import { TOKEN_INSTRUCTION, redact, restore } from './pii/redact'
import { resolveModel, paramsFor } from './model'

// THE ONLY MODULE ALLOWED TO TALK TO OPENAI (enforced by scripts/check-llm-boundary.mjs).
//
// Flow: detect PII → replace with [TOKEN_n] → call model → restore tokens in the response.
// Pseudonymised text is still personal data, and detection is best-effort: this reduces what
// the provider sees, it does not make anything "anonymous".
//
// The token map lives in this function's scope only. Nothing here logs input, output, tokens
// or the map.

export type PiiMode =
  | { pii: 'redact' }
  | { pii: 'block' } // refuse (422) if any PII is detected
  | { pii: 'off'; reason: string } // caller must justify sending raw text

export type CallLLMOptions<T> = PiiMode & {
  /** Short label for the call site, e.g. 'import.cv'. Used in error messages only. */
  purpose: string
  system: string
  /** User content. This is what gets redacted; `system` is assumed to contain no user data. */
  input: string
  /** With a schema: OpenAI Structured Outputs + zod validation. Without: JSON-object mode. */
  schema?: ZodType<T>
  schemaName?: string
  model?: string
  maxTokens?: number
  temperature?: number
  /** Names the caller already knows (e.g. from the form) — exact-match redacted as [NAME_n]. */
  names?: string[]
  /** Test seam / future engines. Defaults to the engine selected by PII_ENGINE. */
  engine?: PiiEngine
}

export interface CallLLMResult<T> {
  data: T
  warnings: string[]
  redactions: Partial<Record<PiiEntity, number>>
  /** Token usage reported by the provider (0 when unavailable). Counts only; never content. */
  usage: { promptTokens: number; completionTokens: number }
}

// Model choice and per-family parameters live in ./model (shared with /api/generate); re-exported for the bench.
export { resolveModel, paramsFor } from './model'

// Benchmark hook: lets bench/ read token usage without changing any call site or logging content.
type UsageObserver = (u: { model: string; purpose: string; promptTokens: number; completionTokens: number; ms: number }) => void
let usageObserver: UsageObserver | null = null
export function setUsageObserver(fn: UsageObserver | null) {
  usageObserver = fn
}

let client: OpenAI | null = null
function openai(): OpenAI {
  // Native fetch: openai@4 defaults to node-fetch, which fails with "Premature close" on newer Node (seen on Node 24).
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, fetch: globalThis.fetch as never })
  return client
}

export async function callLLM<T = unknown>(opts: CallLLMOptions<T>): Promise<CallLLMResult<T>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new LlmError('not_configured', 'AI is not configured.')
  }
  if (opts.pii === 'off' && !opts.reason?.trim()) {
    throw new LlmError('not_configured', `pii:'off' requires a reason (${opts.purpose}).`)
  }

  let userText = opts.input
  let map = new Map<string, string>()
  let redactions: Partial<Record<PiiEntity, number>> = {}

  if (opts.pii !== 'off') {
    const r = await redact(opts.input, { names: opts.names, engine: opts.engine })
    if (opts.pii === 'block' && Object.keys(r.counts).length > 0) {
      throw new LlmError('pii_blocked', 'This text contains personal details and cannot be sent for AI processing.')
    }
    userText = r.text
    map = r.map
    redactions = r.counts
  }

  const system = map.size > 0 ? `${opts.system}\n\n${TOKEN_INSTRUCTION}` : opts.system
  const model = resolveModel(opts.model)
  const base = {
    model,
    ...paramsFor(model, opts),
    messages: [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: userText },
    ],
  }
  const startedAt = Date.now()
  let usage: { prompt_tokens?: number; completion_tokens?: number } | undefined

  let raw: unknown
  try {
    if (opts.schema) {
      const completion = await openai().chat.completions.parse({
        ...base,
        response_format: zodResponseFormat(opts.schema, opts.schemaName ?? 'result'),
      })
      usage = completion.usage
      const msg = completion.choices[0]?.message
      if (msg?.refusal) throw new LlmError('upstream_failed', 'The AI declined to process this content.')
      raw = msg?.parsed
    } else {
      const completion = await openai().chat.completions.create({
        ...base,
        response_format: { type: 'json_object' },
      })
      usage = completion.usage
      const content = completion.choices[0]?.message?.content
      if (!content) throw new LlmError('bad_response', 'The AI returned an empty response.')
      raw = JSON.parse(content)
    }
  } catch (err) {
    if (err instanceof LlmError) throw err
    throw new LlmError('upstream_failed', 'The AI service is unavailable.')
  }

  const tokenUsage = { promptTokens: usage?.prompt_tokens ?? 0, completionTokens: usage?.completion_tokens ?? 0 }
  usageObserver?.({
    model,
    purpose: opts.purpose,
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    ms: Date.now() - startedAt,
  })

  if (raw === null || raw === undefined) {
    throw new LlmError('bad_response', 'The AI returned an unreadable response.')
  }

  const { value, warnings } = restore(raw as T, map)

  if (opts.schema) {
    const check = opts.schema.safeParse(value)
    if (!check.success) throw new LlmError('bad_response', 'The AI returned an unexpected format.')
    return { data: check.data, warnings, redactions, usage: tokenUsage }
  }
  return { data: value, warnings, redactions, usage: tokenUsage }
}
