// Which version of a Pro template a portfolio shows. The REDESIGNED version is the default for every Pro template (including portfolios saved
// before it existed); a stored marker of 1 means the owner chose to keep the original design, 2 means they saved the redesign explicitly.
// Free-template layout settings never affect a Pro design. Reads tolerate old/future metadata; client writes must use the strict schema below.
import { z } from 'zod'
import { PRO_TEMPLATES, type PlanId } from '@/lib/plans'

export type ProTemplateId = (typeof PRO_TEMPLATES)[number]
export type ProDesigns = Partial<Record<ProTemplateId, 1 | 2>>

export function isProTemplateId(value: unknown): value is ProTemplateId {
  return typeof value === 'string' && (PRO_TEMPLATES as readonly string[]).includes(value)
}

// Check raw keys before Zod strips special object keys such as __proto__.
export const ProDesignsSchema = z.custom<Record<string, unknown>>((value) =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(isProTemplateId),
).pipe(z.partialRecord(z.enum(PRO_TEMPLATES), z.union([z.literal(1), z.literal(2)])))

/** Keep each supported own marker independently; never repair or mutate the stored value. */
export function readProDesigns(value: unknown): ProDesigns {
  const designs: ProDesigns = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return designs
  for (const template of PRO_TEMPLATES) {
    if (Object.prototype.hasOwnProperty.call(value, template)) {
      const v = (value as Record<string, unknown>)[template]
      if (v === 1 || v === 2) designs[template] = v
    }
  }
  return designs
}

export function usesProDesign(content: { pro_designs?: unknown } | null | undefined, template: string): boolean {
  // redesigned unless the owner explicitly kept the original (marker 1)
  return isProTemplateId(template) && readProDesigns(content?.pro_designs)[template] !== 1
}

export function withProDesign<T extends { pro_designs?: unknown }>(content: T, template: ProTemplateId, enabled: boolean): Omit<T, 'pro_designs'> & { pro_designs: ProDesigns } {
  const pro_designs = readProDesigns(content.pro_designs)
  pro_designs[template] = enabled ? 2 : 1 // explicit both ways: 1 keeps the original design
  return { ...content, pro_designs }
}

/** Downgrades may keep/remove stored markers, but cannot newly enable ANY template, including inactive ones. */
export function canTransitionProDesigns(plan: PlanId, before: unknown, after: unknown): boolean {
  if (plan === 'pro') return true
  const current = readProDesigns(before)
  const next = readProDesigns(after)
  return PRO_TEMPLATES.every((template) => next[template] !== 2 || current[template] === 2)
}