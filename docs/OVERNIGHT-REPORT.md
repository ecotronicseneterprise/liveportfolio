# Overnight report: free templates and landing page on the block renderer

Branch: `dev` only. Base commit: `88df392d1cb2e797fd2b39e45feb3aa9a5f70808`. One commit on top; `git revert <that SHA>` undoes everything.
Nothing was merged, no Vercel, Paystack or Supabase setting was touched, no SQL was run or is needed.

## What shipped

| Phase | State | Notes |
|---|---|---|
| 1. Safety net, settings schema, renderer, review route | Shipped | Legacy regression guard (SHA-256 of the markup of all 10 legacy templates from a fixed fixture, `tests/legacy-templates.test.ts`), zod-validated `content.layout`, block renderer (10 blocks, 24 variants, 3 themes), internal review route `/design-review` (noindex). |
| 2. Three free templates ported | Shipped | Creative = Studio, Minimal = Journal, Bold = Ledger. 360/390/768/1440 checked, no horizontal scroll, print styles, sparse and long-text data tested. |
| 3. Dashboard picker, new-portfolio defaults | Shipped | Picker (look, layout, colour, spacing, bio length, reset to recommended) shown only when the portfolio stores a layout. Saved through the existing Save, `/api/update` path, so history and undo cover it. New portfolios get a layout recommended from role and content (Studio when two or more projects carry figures). |
| 4. Landing page | Shipped | Slideshow removed. Hero shows a real block-rendered specimen (invented person) with a CSS-only switch between the three looks (radio inputs, no JavaScript, no autoplay, fixed-height frame so nothing shifts). Prices stay in Naira. |
| 5. "Try the new design" for existing owners | NOT built | Out of time. Existing portfolios render exactly as before. `set_layout` (typed op, null = back to classic) exists and is tested, so the switch is a small follow-up. |

## How existing portfolios stay identical

`storedLayout(content, template)` returns a layout only when the stored layout is valid AND the template is one of the three free ids. Everything else (no layout, invalid layout, any Pro template) goes to the untouched legacy component. No column, no migration: the layout lives inside the existing `portfolios.content` JSON. The legacy hash test was recorded at the base commit and passes unchanged.

## Decisions

- Theme is not stored. It follows the template id (creative = Studio, minimal = Journal, bold = Ledger), so Free/Basic/Pro gating is unchanged.
- The draft template default is now empty; the preview and `/api/generate` use `recommend(content).template`.
- CSS is scoped under `.lpb` and uses container queries, so the same renderer works full width, in thumbnails and in the narrow landing column.
- Contact fields and all user text go through the existing escaping; links accept http(s) only.
- All new user-facing strings are in `messages/en.json` (`portfolio.*`, `landing.*`, `lookPicker.*`).
- No new dependency. Fonts are local woff2 files (latin and latin-ext) through `next/font/local`.
- Landing typography root cause: Tailwind's `fontFamily.sans` points at CSS variables that only the templates define, so landing, terms, privacy and the dashboard rendered in the browser's default serif. Fixed for the landing page only (scoped `.lpl`); a global fix would change legacy templates that inherit the page font. **Follow-up:** terms, privacy and the dashboard still fall back to the default serif.

## Not verified / known gaps

- Font preloads: the new fonts are not preloaded (they live in non-layout modules); they use `swap` with size-adjusted fallbacks.
- Landing performance regressed (see below). The largest-contentful-paint element is the headline, and the cause is not proven; fonts are the first suspect.
- One remaining low-severity audit note on the landing page at 1440px (a footer paragraph around 85 characters per line).
- Real-device swipe and the live site were not tested; everything ran on a local production build against dummy build-time env values.

## Lighthouse (mobile preset, local production builds, median of 3)

| Page | Performance before | after | Accessibility before | after | LCP before | after | CLS before | after |
|---|---|---|---|---|---|---|---|---|
| Landing | 88 | 70 | 84 | 100 | 3.0 s | 3.9 s | 0.02 | 0 |
| Public portfolio proxy (Minimal legacy vs `/design-review` Journal) | 95 | 94 | 93 | 100 | 2.8 s | 2.7 s | 0 | 0 |

The landing performance drop is real: the specimen adds three themed panes of markup and CSS. Worth a follow-up (render only the visible pane's markup, preload the heading font) before merging if the score matters. The portfolio "before" is the legacy Minimal template rendered by a temporary route in a worktree of the base commit with the same sample content.

## Landing audit (Impeccable 4.7.0)

Before: 31 and 32 findings at 1440 and 390 (18 low contrast, 7 undersized text, side-tab, kicker above heading, nested cards, pulsing dot). After: 1 finding at 1440, 0 at 390 and 360. Files in `overnight-shots\audit`.

## How to review

- Screenshots: `C:\Users\Clifford.nwanna\Dev\overnight-shots\index.html` (contact sheet). Templates at 360/390/768/1440 full and sparse, dashboard picker at 1440/768/390, landing at four widths, landing before in `before\`.
- Preview: the dev deployment, path `/design-review?p=engineer&t=minimal&a=profile` (p = engineer, finance, clinician, designer, sparse, long, noimg; t = creative, minimal, bold; a = proof, profile, index, showcase).
- Checks: `npm run verify` passes (typecheck, `check:llm`, 792 tests, build).

## Rollback

`git revert <overnight commit SHA>`. No data or schema to undo; a portfolio that stored a `layout` simply ignores it once the code is gone (the field is optional JSON).
