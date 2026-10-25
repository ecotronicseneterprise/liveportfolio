// Explicit, per-template opt-in. Free-template layout settings never enable a Pro design.
// Reads tolerate old/future metadata; client writes must use the strict schema below.
import { z } from 'zod'
import { PRO_TEMPLATES, type PlanId } from '@/lib/plans'

export type ProTemplateId = (typeof PRO_TEMPLATES)[number]
export type ProDesigns = Partial<Record<ProTemplateId, 2>>

export function isProTemplateId(value: unknown): value is ProTemplateId {
  return typeof value === 'string' && (PRO_TEMPLATES as readonly string[]).includes(value)
}

// Check raw keys before Zod strips special object keys such as __proto__.
export const ProDesignsSchema = z.custom<Record<string, unknown>>((value) =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(isProTemplateId),
).pipe(z.partialRecord(z.enum(PRO_TEMPLATES), z.literal(2)))

/** Keep each supported own marker independently; never repair or mutate the stored value. */
export function readProDesigns(value: unknown): ProDesigns {
  const designs: ProDesigns = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return designs
  for (const template of PRO_TEMPLATES) {
    if (Object.prototype.hasOwnProperty.call(value, template) && (value as Record<string, unknown>)[template] === 2) {
      designs[template] = 2
    }
  }
  return designs
}

export function usesProDesign(content: { pro_designs?: unknown } | null | undefined, template: string): boolean {
  return isProTemplateId(template) && readProDesigns(content?.pro_designs)[template] === 2
}

export function withProDesign<T extends { pro_designs?: unknown }>(content: T, template: ProTemplateId, enabled: boolean): Omit<T, 'pro_designs'> & { pro_designs: ProDesigns } {
  const pro_designs = readProDesigns(content.pro_designs)
  if (enabled) pro_designs[template] = 2
  else delete pro_designs[template]
  return { ...content, pro_designs }
}

/** Downgrades may keep/remove stored markers, but cannot newly enable ANY template, including inactive ones. */
export function canTransitionProDesigns(plan: PlanId, before: unknown, after: unknown): boolean {
  if (plan === 'pro') return true
  const current = readProDesigns(before)
  const next = readProDesigns(after)
  return PRO_TEMPLATES.every((template) => next[template] !== 2 || current[template] === 2)
}