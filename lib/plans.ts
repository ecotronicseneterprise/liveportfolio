// THE one source of truth for what each plan includes. Pure and client-safe (no server imports).
// The pricing section, upgrade modal, template step, FAQ and the server-side entitlement checks all read from here, so
// copy cannot drift from what is built. A feature is either 'available' (it has an implementing entitlement below and a
// test that proves it) or 'soon' (never listed as included, never in checkout). tests/plans.test.ts enforces both.
//
// Prices are DISPLAY-ONLY here and in naira. What is actually charged is decided by the Paystack plan; the webhook's
// expected prices (PAYSTACK_EXPECTED_PRICES) must match. Currency display for other countries is a separate piece of work.

export type PlanId = 'free' | 'basic' | 'pro'
export const PLAN_ORDER: readonly PlanId[] = ['free', 'basic', 'pro']

export const FREE_TEMPLATES = ['minimal', 'bold', 'creative'] as const
export const PRO_TEMPLATES = ['developer', 'designer', 'data-scientist', 'product-manager', 'finance', 'graduate', 'cybersecurity'] as const
export const ALL_TEMPLATES = [...FREE_TEMPLATES, ...PRO_TEMPLATES] as const
export type TemplateId = (typeof ALL_TEMPLATES)[number]

export const isTemplateId = (v: unknown): v is TemplateId => typeof v === 'string' && (ALL_TEMPLATES as readonly string[]).includes(v)
export const isProTemplate = (v: string): boolean => (PRO_TEMPLATES as readonly string[]).includes(v)

export type FeatureStatus = 'available' | 'soon'
export type FeatureId =
  | 'build_preview' | 'free_templates' | 'preview_all' | 'publish' | 'pro_templates'
  | 'analytics' | 'qr' | 'weekly_score' | 'ai_assistant' | 'mcp' | 'github_sync'

export interface Feature {
  id: FeatureId
  label: string
  status: FeatureStatus
  /** Plans that include it. For a 'soon' feature: the plan it is planned for. Never shown as included while 'soon'. */
  plans: readonly PlanId[]
}

export const FEATURES: readonly Feature[] = [
  { id: 'build_preview', label: 'Build, edit and preview your portfolio privately', status: 'available', plans: ['free', 'basic', 'pro'] },
  { id: 'free_templates', label: `Switch between ${FREE_TEMPLATES.length} templates`, status: 'available', plans: ['free', 'basic', 'pro'] },
  { id: 'preview_all', label: 'Preview every template with your own details', status: 'available', plans: ['free', 'basic', 'pro'] },
  { id: 'publish', label: 'Publish at your own address (liveportfolio.site/yourname)', status: 'available', plans: ['basic', 'pro'] },
  { id: 'pro_templates', label: `${PRO_TEMPLATES.length} more role-specific templates (${ALL_TEMPLATES.length} in total)`, status: 'available', plans: ['pro'] },
  { id: 'analytics', label: 'See who views your portfolio: country, source and timing', status: 'available', plans: ['pro'] },
  { id: 'qr', label: 'QR code for your portfolio', status: 'available', plans: ['pro'] },
  { id: 'weekly_score', label: 'Weekly AI career score', status: 'available', plans: ['pro'] },
  { id: 'ai_assistant', label: 'AI assistant', status: 'soon', plans: ['pro'] },
  { id: 'mcp', label: 'Connect your own AI tools (MCP)', status: 'soon', plans: ['pro'] },
  { id: 'github_sync', label: 'GitHub sync', status: 'soon', plans: ['pro'] },
]

export interface PlanMeta {
  id: PlanId
  name: string
  tagline: string
  /** Display only, naira per year. */
  priceNgn: number | null
}
export const PLANS: Record<PlanId, PlanMeta> = {
  free: { id: 'free', name: 'Free', tagline: 'Always free', priceNgn: null },
  basic: { id: 'basic', name: 'Basic', tagline: 'To go live', priceNgn: 15000 },
  pro: { id: 'pro', name: 'Pro', tagline: 'For serious applicants', priceNgn: 45000 },
}

export const features = (status: FeatureStatus = 'available') => FEATURES.filter((f) => f.status === status)

/** Available features this plan includes (everything lower plans include too). */
export const includedFeatures = (plan: PlanId): Feature[] => features('available').filter((f) => f.plans.includes(plan))

/** Available features that first appear at this plan (what "Everything in <lower plan> and:" lists). */
export function newFeatures(plan: PlanId): Feature[] {
  const lower = PLAN_ORDER[PLAN_ORDER.indexOf(plan) - 1]
  return includedFeatures(plan).filter((f) => !lower || !f.plans.includes(lower))
}

/** Features that are not built yet, with no promise of dates. Shown as "coming soon" only. */
export const comingSoon = (): Feature[] => features('soon')

// ── entitlements ────────────────────────────────────────────────────────────────────────────────────────────
export interface Entitlements {
  plan: PlanId
  /** Edit content and switch template (privately; nothing here publishes). */
  canEdit: boolean
  /** Publishing is driven by payment (the webhook), never by a client call; this only says whether the plan includes it. */
  canPublish: boolean
  templates: 'free' | 'all'
  analytics: boolean
  qr: boolean
  weeklyScore: boolean
}

const has = (plan: PlanId, id: FeatureId) => FEATURES.some((f) => f.id === id && f.status === 'available' && f.plans.includes(plan))

export function entitlementsFor(plan: PlanId): Entitlements {
  return {
    plan,
    canEdit: has(plan, 'build_preview'),
    canPublish: has(plan, 'publish'),
    templates: has(plan, 'pro_templates') ? 'all' : 'free',
    analytics: has(plan, 'analytics'),
    qr: has(plan, 'qr'),
    weeklyScore: has(plan, 'weekly_score'),
  }
}

/** May this plan SELECT this template? (Previewing any template is always allowed; that is client-side and saves nothing.) */
export function canUseTemplate(plan: PlanId, id: unknown): id is TemplateId {
  if (!isTemplateId(id)) return false
  return entitlementsFor(plan).templates === 'all' || !isProTemplate(id)
}
