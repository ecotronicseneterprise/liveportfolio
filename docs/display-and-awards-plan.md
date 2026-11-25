# Plan: show everything the user wrote, and add an Awards section

Status: PLAN ONLY. Nothing here is built. Wait for the owner's go-ahead on each phase.
Branch: work on `dev`, one phase per commit group, merge to `main` only when told. No Claude attribution in commit messages. No SQL run by the assistant. No live data touched.

## Why

1. Free designs (Creative, Minimal, Bold) hide some saved content, and nothing tells the user. Pro designs show everything.
2. There is no place for awards (for example competition placings). Users put them in certifications or About, where they are lost.

Goal: what the user enters is what visitors can see, and when something is not shown, the user is told.

## What the investigation found (code read, live data not read)

| Content | Free designs show | Stored or allowed |
|---|---|---|
| Experience bullets | `index` arrangement: first bullet only. Others: all | 12 per role |
| Project problem, solution, outcome | silently cut at 800 characters (`lib/blocks/adapt.ts`) | 1500 |
| Project stack | first 5 | 12 |
| Testimonials | first one only, cut at 500 characters | 10, 600 characters |
| About | `proof` and "short bio": first paragraph only | 6000 |
| Showcase projects | outcome or solution, never both | |
| Education | period ignored | |

Pro designs show all of it. No mobile or CSS reason found for any cap. The old per-template components with stack caps of 3, 4 and 5 are not used on public pages.

## Live check (owner's portfolio, version 101, read-only)

- No project text is over 800 characters (longest about 710), so the cut is not hurting the live page today. Phase 1 is preventive.
- Stack: LivePortfolio loses PostgreSQL, BodyBalance loses AI, GATEMAN loses IoT on free designs (5-chip limit).
- Bullets: on `index`, the roles with 10, 9 and 8 bullets show only the first. The owner's arrangement still needs checking in the dashboard.
- No testimonials stored.
- Flag: confirm the Data Sense figures (1,700+ staff, 27,800+ queries, 84%) and the CRIS account count (330K) are cleared for public use.

## Decisions (owner, settled)

1. **Desktop (above about 640px): show everything in every arrangement, including `index`. No folding.**
2. **Mobile (640px and below): three lists fold behind a "Show N more" button:** experience bullets (first 3), testimonials (first 3), stack chips (first 5, "+N more"). Stack at 5 is assumed until the owner says otherwise.
3. Order: keep the user's order; never reorder automatically. The assistant and dashboard only suggest moving the strongest bullet (with real figures) first.
4. Phase 1 (remove the 800 cut, testimonial 600) goes out first, on its own.
5. Awards (Phase 4) wait for the owner's go-ahead after the 4a investigation report.
6. Work on `dev`, one phase per commit group, no attribution lines, no SQL run by the assistant, no live data touched, no push or deploy until told.

## Principles

- The fold is NOT a `<details>` element (a closed one hides content on desktop too). All items are in the HTML; extras are hidden by a width media query; the toggle is a no-JavaScript checkbox or a small accessible client component. Content stays in the HTML for search engines.
- No change to Pro designs, saved data, or existing field limits. Display only.
- One shared "shown X of Y" function is the single source for dashboard notices, assistant warnings and tests.
- Every phase: `npm run verify`, plus a render test across all designs and arrangements. Deploy only when told.

## Phase 1: stop silent truncation (small, first)

- `lib/blocks/adapt.ts`: raise project problem/solution/outcome from 800 to the real limit (1500). Testimonial text from 500 to its stored limit (600).
- Text renders in full on desktop: no clamp and no "Read more" there. Any clamp is mobile-only, behind a labelled control; never cut characters.
- Tests: a 1500-character solution renders in full on every free design.
- Rollback: revert one commit.

## Phase 2: split in two

**2a (ships right after Phase 1): desktop shows all.** Remove the caps so every bullet (including `index`), every stack chip and every testimonial shows at all widths for now, plus the education period, all About paragraphs and `showcase` solution and outcome. Mostly deletes code, low risk.

**2b (after 2a): the mobile fold** described below. This is where the layout risk is.

Order overall: Phase 1, 2a, 2b, Phase 3, then Awards.

### Detail (2a and 2b)

Files: `components/blocks/blocks.tsx`, `lib/blocks/adapt.ts`, `lib/blocks/presets.ts` (read only to confirm).

How the fold works:
- Every item is rendered in the HTML. Extras are hidden with CSS only under a width breakpoint (about 640px), never by detecting the device, so search engines and desktop see everything and desktop needs no JavaScript.
- Control: a no-JavaScript toggle (checkbox or `<details>` styled as a button). A small client component is used only if it is clearly simpler and accessible, and then the reason is reported. The label states the hidden count ("Show 6 more").
- Print and PDF show everything. Pro designs unchanged.

Changes:
1. Experience bullets: desktop all (including `index`, replacing the first-bullet-only line); mobile first 3 plus "Show N more".
2. Stack chips: desktop all; mobile first 5 plus "+N more". `showcase` shows both solution and outcome.
3. Testimonials: desktop all; mobile first 3 plus "Show N more". The `quote` block takes a list instead of one item.
4. About: all paragraphs. In `proof` and "short bio", first paragraph plus "Read more".
5. Education: show the period.
6. Check at 375px, 768px (tablet, the awkward middle) and 1280px for every design; no horizontal scroll at 375px.

## Phase 3: tell the user and the assistant

- One function `displayReport(content, design, arrangement)` returns `{section, shown, total, hiddenReason}`.
- Dashboard: a quiet notice per section only when something is hidden ("2 of 9 bullets are behind Show more on this design").
- Assistant: extend the existing warnings and the health check to use the same report, so a saved-but-hidden item is always reported.
- Suggest, never apply: "your strongest bullet has numbers; consider putting it first".
- Dashboard: live character and word counters while typing, plus "will show fully on your current design" from the same function. No AI in the typing path.
- MCP: `portfolio_get` and `portfolio_get_schema` return `{length, limit, remaining}` per text field (characters, with a word count helper). `portfolio_preview_changes` returns `would_display {shown, total, truncated}` from the shared function. `display_limits` becomes dynamic per field and design.
- Blocking invariant test: render every design x arrangement x viewport (375, 768, 1280) with maximum-length and maximum-count data.
  - 1280px: every stored character is visible.
  - 375px: every hidden item is behind a visible, labelled control. The test clicks it and asserts everything is then present.
  - Always: no code-inserted ellipsis, no text ending mid-word, no horizontal scroll at 375px.
- Seeded-bug check (once): on a throwaway branch restore the 800-character cut and show that the invariant test fails.
- AI judge: optional and non-blocking, built only after the above is green. Structured JSON (field, fully_visible, cut_mid_sentence, evidence), calibrated against the seeded bug, with its agreement rate reported. A "Tighten to fit" button, if ever added, is on demand and may only shorten the user's own words.

## Phase 4: Awards section (investigate, then build)

### 4a. Investigate and report before writing code

Confirm and list the files to touch for: where content is stored (certifications is the model to copy), the shared validation layer, every renderer of certifications (free blocks, Pro designs, all four arrangements), the MCP tool registry, `portfolio_get`, the schema tool, `applyOps` operation union, preview, health check and checklist, which operations need approval, and revision, undo and restore handling.

### 4b. Data model

`awards`: array, max 20, default `[]`. Each: `title` (required, 160), `issuer` (required, 160), `year` (optional, 20), `description` (optional, 400), `url` (optional, https only, 500; new links follow the existing approval rule). Old portfolios load unchanged; no migration that rewrites rows unless the codebase already does so for new sections. Award text is user data, never instructions.

### 4c. Dashboard

Awards editor next to Certifications: add, edit, reorder, remove, same validation messages and counters, same removal confirmation.

### 4d. Public pages

Awards section after Education/Certifications in every design that renders certifications, including `index` and the Pro designs. Hidden when empty. JSON-LD `award` on the Person if structured data exists. It uses the Phase 2 "show more" pattern from the start.

### 4e. Assistant (MCP)

- `portfolio_get` returns `awards`; `sections: ["awards"]` works; schema tool documents it.
- New tools: `portfolio_add_award` (direct, undoable, refuses exact duplicates), `portfolio_update_award` (by index, direct), `portfolio_remove_award` (approval).
- `set_awards` operation in apply/preview (replace-all, approval, like other `set_*`).
- Health check and checklist count an award as "something others can vouch for".
- Descriptions: add only awards the person states; never invent issuers, years or links.
- Tool count moves from 56 to 59; update counts in README, docs, `server.json` description if it states a number.

### 4f. Tests

Validation limits, https-only links, duplicate refusal, empty default, portfolios with no `awards` key, add/update/remove/set, version conflict, approval required for remove and set, undo restores. Render tests with 0 and 2 awards for every design.

### 4g. Docs and registry

Update the public MCP repo: tools reference, field coverage, changelog. Bump the server version (1.0.0 to 1.1.0), republish to the registry with mcp-publisher (needs the owner's approval to publish, since it is outward-facing).

## After deploy (owner, through the assistant)

Add these two awards, using only the facts the owner gave:
1. "1st Place (Regional) and 2nd Place (National)", CODET National Engineering Competition
2. "3rd Place", SPE Undergraduate Engineering Project / STEM & AI Fair, 2021

Check the owner's own live page at 375px and 1280px before and after phase 2 (read only until the owner approves edits), and confirm the arrangement used in the dashboard.

## Order and effort

| Phase | What | Effort | Risk |
|---|---|---|---|
| 1 | Remove the 800-character cut | 2-3 hours | low |
| 2a | Desktop shows all (remove caps, education period, about) | 3-4 hours | low |
| 2b | Mobile "Show N more" folds | 0.5-1 day | medium (layout) |
| 3 | Reports, notices, guard test | half a day | low |
| 4 | Awards end to end | 1.5-2 days | medium (touches many layers) |

Each phase can go out on its own and can be rolled back by reverting its commits. Phases 1 and 2 change display only, not data.

## Open items outside this plan

SECURITY.md contact email; audience binding (`aud`) decision; live checklist in ChatGPT/Claude; privacy lawyer review; consent before any announcement email.
