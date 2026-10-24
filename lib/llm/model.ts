// Which model, and which request parameters it accepts. Pure (no OpenAI import) so the gateway (call.ts) and /api/generate
// share ONE answer, and the model can be switched or rolled back with the LLM_MODEL environment variable, no deploy needed.

export const DEFAULT_MODEL = 'gpt-4o-mini'

/** Model for every call. Override with LLM_MODEL; an explicit argument wins for one-off calls. */
export function resolveModel(explicit?: string): string {
  return explicit || process.env.LLM_MODEL?.trim() || DEFAULT_MODEL
}

export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/**
 * Parameter support differs by model family. Do not assume gpt-4o-mini's.
 * GPT-6 family. Verified against the live API on 2026-10-24 with gpt-6-luna (invented text, three calls) and OpenAI's model page:
 *  - strict Structured Outputs (json_schema) and json_object both work, with `reasoning_effort: 'none'` (zero reasoning tokens);
 *  - `max_tokens` is REJECTED (400 "Unsupported parameter"): the output cap is `max_completion_tokens`;
 *  - `temperature` is ACCEPTED at effort 'none' (an earlier note here said third parties report a 400; the API did not);
 *    OpenAI's guide says it must be removed at any other effort, so it is sent only at 'none' and only when the caller asks;
 *  - effort defaults to 'medium' on OpenAI's side, which spends hidden reasoning tokens, so we send 'none' unless
 *    LLM_REASONING_EFFORT says otherwise.
 * Everything else (gpt-4o*, gpt-4.1*, …) keeps temperature + max_tokens.
 */
export function paramsFor(model: string, o: { temperature?: number; maxTokens?: number }): Record<string, unknown> {
  if (/^gpt-6/i.test(model)) {
    const effort = (process.env.LLM_REASONING_EFFORT?.trim() || 'none') as ReasoningEffort
    const p: Record<string, unknown> = { reasoning_effort: effort, max_completion_tokens: o.maxTokens ?? 1200 }
    if (o.temperature !== undefined && effort === 'none') p.temperature = o.temperature
    return p
  }
  return { temperature: o.temperature ?? 0.2, max_tokens: o.maxTokens ?? 1200 }
}
