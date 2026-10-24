// PII detection contract. Engines only DETECT spans; tokenising and restoring is ours (redact.ts).
// Detection is best-effort and never a guarantee that text is free of personal data.

export type PiiEntity = 'EMAIL' | 'PHONE' | 'URL' | 'ID' | 'CARD' | 'NAME'

export interface PiiSpan {
  entity: PiiEntity
  start: number // inclusive
  end: number // exclusive
  score: number // 0..1 engine confidence
}

export interface PiiEngine {
  readonly name: string
  detect(text: string): PiiSpan[] | Promise<PiiSpan[]>
}

export class LlmError extends Error {
  constructor(
    public code: 'pii_engine_unavailable' | 'pii_blocked' | 'not_configured' | 'upstream_failed' | 'bad_response',
    message: string
  ) {
    super(message)
    this.name = 'LlmError'
  }

  get status(): number {
    switch (this.code) {
      case 'pii_engine_unavailable': return 503
      case 'pii_blocked': return 422
      case 'not_configured': return 500
      default: return 502
    }
  }
}
