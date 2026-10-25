import { storedLayout, type StoredContent } from '@/lib/blocks/mode'
import { usesProDesign, isProTemplateId } from './presentation'

/** Shared server/client decision. The caller applies plan gating BEFORE selecting the public renderer. */
export function portfolioRenderMode(content: Partial<StoredContent>, template: string) {
  if (isProTemplateId(template) && usesProDesign(content, template)) return { kind: 'pro' as const, template }
  const layout = storedLayout(content, template)
  return layout ? { kind: 'blocks' as const, layout } : { kind: 'legacy' as const }
}