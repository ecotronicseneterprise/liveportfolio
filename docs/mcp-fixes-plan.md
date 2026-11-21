# MCP fixes from real use (plan, nothing built yet). 2026-11-21

Source: the owner edited their real portfolio through Claude (7 edits, 2 approvals). The core flow worked: version checks, assistant-labelled history, approvals, undo. Each item below was checked against the code before it was planned.

## What the code check found (corrections to the field report)

| Claim | Verdict |
|---|---|
| "No tool edits seo_title / seo_description" | True, but **not a gap**. `commitState` re-derives the real SEO columns from name, role and About on every save (`lib/portfolio/derive.ts`), and the public page reads those columns. The stale "Data Scientist" text the assistant saw is a leftover copy inside `content` that nothing displays. After the About edit the live description already updates. **Fix: hide those leftover keys from `portfolio_get`, do not add a SEO tool.** |
| "`portfolio_get_schema` returns an empty operations list" | True. Root cause: zod emits the operations under `oneOf`, the tool reads `anyOf`. One-line fix. |
| "Stray 'Highlights' bullet is a convention?" | **No.** Nothing in the code generates or special-cases it (the only match is the editor label "Highlights (one per line)"). Templates print bullets as plain list items. It comes from the imported CV text. Safe to remove by hand or with `portfolio_remove_bullet` (needs approval). |
| `add_education` lacks `period`; flat skills cap 15 vs 17 held; project `solution` cap 600 vs 604 | True, all three. Caps come from `lib/portfolio/ops.ts`. |
| Whole-list tools forced approvals for harmless changes | True. |

## Plan, in order

### 1. Return-to-chat after approval (biggest user-felt gap)
A website cannot push a message into ChatGPT or Claude, so build the best reachable version.
- `/oauth/approve` success screen: "Approved. Go back to your chat.", what was applied, a **Copy "approved"** button, a Close-tab button with a fallback line. No upsell.
- Before approving: show a real **before and after** for the fields that change (server computes it from the proposal against the current portfolio), not only the summary lines.
- Proposal tool result: tell the model to say "Open the link, approve, then reply 'approved'", then call `portfolio_check_proposal`. Neutral wording.
- Research only: log (counts, no content) whether clients declare the `elicitation` / URL capability at `initialize`, for a week, then decide if URL-mode elicitation is worth using.
Files: `app/oauth/approve/page.tsx`, `app/api/mcp/proposals/route.ts`, `lib/mcp/tools.ts`, `lib/mcp/rpc.ts`. Size: about 1 day.

### 2. Broken or missing tool details (small, one commit)
1. `portfolio_get_schema`: read `oneOf` (fixes the empty operations list). Test that every operation appears.
2. `portfolio_get`: drop leftover `seo_title`, `seo_description` and other unused keys from the content it returns (smaller reply, no false "gap"). Add a `sections` filter (for example `["about","skills"]`), always return `version`.
3. `portfolio_add_education`: add `period`.
4. Limits: raise project text fields so existing over-limit text (604 chars) does not block edits to OTHER fields; the check should apply to fields being changed. Raise the flat skills cap from 15 to 25 to match portfolios that already hold 17.
Files: `lib/mcp/tools.ts`, `lib/portfolio/ops.ts`. Tests for each. Size: half a day.

### 3. Approval fatigue: narrow tools
Add `portfolio_add_skill`, `portfolio_add_skill_to_group` (direct, duplicates refused) and `portfolio_remove_certification`, `portfolio_remove_education` (removals, so approval, by index or exact text). Keep the `set_*` tools gated. Files: `lib/mcp/tools.ts`, `lib/mcp/edit-helpers.ts`. Size: half a day.

### 4. History detail (dashboard)
Show a short before and after snippet per revision in History. Needs revisions to store small diffs (the table already stores the full previous content, so the snippet can be computed on read). No new table. Size: half a day. Can wait until after launch.

## Decisions for you
1. Skip the SEO tool (recommended, see above)?
2. Raise the flat skills cap to 25?
3. Do 1 and 2 first, then 3, with 4 after launch?

## Not changing
Token isolation, consent, revocation, revision logic.
