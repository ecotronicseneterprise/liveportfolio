// The look of a portfolio, stored INSIDE the existing portfolio JSON (portfolios.content.layout). No column, no migration.
//   - absent or invalid  => the portfolio is LEGACY and renders through today's template component, byte for byte
//   - present and valid  => the block renderer (components/blocks) draws it
// It never contains words: the person's text lives in PortfolioContent and is untouched by a layout change, and a content change can never
// alter the look. The theme is NOT stored here: it follows the template id (see THEME_BY_TEMPLATE in presets.ts), so the existing template
// picker, plan gating and /api/update template checks keep working unchanged.
import { z } from 'zod'

export const ARRANGEMENTS = ['proof', 'profile', 'index', 'showcase'] as const
export type Arrangement = (typeof ARRANGEMENTS)[number]

/** Curated accents. Every colour is verified (tests/blocks.test.ts) at 4.5:1 or better: text on white, white text on its fill, text on its tint. */
export const ACCENTS = {
  blue: { text: '#084D9A', fill: '#0A66C2', tint: '#E6EFF9' },
  teal: { text: '#0B5F5F', fill: '#0B6E6E', tint: '#E3F2F1' },
  green: { text: '#1B6B3A', fill: '#1B6B3A', tint: '#E4F2E8' },
  crimson: { text: '#A32019', fill: '#B3261E', tint: '#FBE9E7' },
  amber: { text: '#7A4E00', fill: '#8A5A00', tint: '#FFF1CF' },
  slate: { text: '#334155', fill: '#3B4658', tint: '#E9EDF2' },
} as const
export type AccentId = keyof typeof ACCENTS
export const ACCENT_IDS = Object.keys(ACCENTS) as [AccentId, ...AccentId[]]

export const DENSITIES = ['compact', 'comfortable', 'airy'] as const
export type Density = (typeof DENSITIES)[number]
/** Multiplier on the theme's section spacing. */
export const DENSITY_FACTOR: Record<Density, number> = { compact: 0.8, comfortable: 1, airy: 1.25 }

export const LayoutSettings = z
  .object({
    v: z.literal(1),
    arrangement: z.enum(ARRANGEMENTS),
    accent: z.enum(ACCENT_IDS).optional(),
    density: z.enum(DENSITIES).optional(),
    /** "short" shows only the first paragraph of the About text. Display only; the text is never changed. */
    bio: z.enum(['short', 'long']).optional(),
  })
  .strict()
export type LayoutSettings = z.infer<typeof LayoutSettings>

/** The layout of a stored portfolio, or null when there is none or it is not valid (the portfolio is then legacy, never an error). */
export function parseLayout(raw: unknown): LayoutSettings | null {
  if (raw === undefined || raw === null) return null
  const r = LayoutSettings.safeParse(raw)
  return r.success ? r.data : null
}

export const defaultLayout = (arrangement: Arrangement): LayoutSettings => ({ v: 1, arrangement })
