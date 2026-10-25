# Editable elements and agent-assisted editing

**Status:** proposed plan, not an implementation or deployment claim.  
**Baseline inspected:** local `dev` working tree, 2026-10-25, including uncommitted editor/template changes.  
**Goal:** users and approved agents can edit the same supported portfolio elements through one validated, reversible editing system.

## 1. Product scope

“Every element is an editable tool” should mean **every supported content or presentation element has a stable target, declared capabilities, and validated operations**. It should not mean arbitrary HTML/CSS or a free-positioned website builder.

- Manual editing remains available to all plans, without AI calls. Existing Pro template restrictions remain server-enforced.
- Text, projects, experience, education, skills, certifications, images and supported presentation settings share one editing contract.
- Start styling with name, headline, section headings, project titles and images; expand through an explicit coverage matrix.
- Allow bounded typography, approved colours, alignment, spacing, image fit and layout slots. Position means supported alignment/order/layout—not arbitrary x/y coordinates.
- Keep platform branding, billing, account identity, plan, publication status and executable markup outside agent tools. Portfolio contact email is distinct from account email.
- No drag-and-drop builder, AI regeneration or mandatory framework replacement in this plan.
- Agent editing is a separately approved, metered Pro feature. Do not interpret it as permission to bypass the one-time initial-generation guard or launch unapproved AI rewriting.

**Recommended first deliverable:** one free block look and one Pro redesign supporting select → edit/style → preview → save → undo, with identical targets usable by a later assistant.

## 2. Verified foundations and gaps

| Area | Current foundation | Work required |
|---|---|---|
| Operations | `set_field`, project/experience CRUD and movement, skills, education, certifications, template/layout/design operations | Stable item IDs; missing granular operations such as testimonials; uniform validation |
| Save | Authenticated ownership checks, server entitlements, compare-and-set writes | Mandatory expected version on new mutation paths; atomic history/save; idempotent retries |
| History | Before-snapshots and restore | Fail-closed guarantees for new granular/agent writes and undo; version-checked restores |
| Appearance | `content.layout`, `content.pro_designs`, curated settings and opt-in render modes | Versioned per-element overrides and per-renderer capability registry |
| Dashboard | Structured forms, design selection, History | Shared draft model, selectable preview, property inspector and precise diffs |
| Agent/MCP | Existing operations can underpin integrations | No finished user-facing agent or delegated external authorization |

Sources: [operations](../lib/portfolio/ops.ts), [commit service](../lib/portfolio/commit.ts), [update API](../app/api/update/route.ts), [history API](../app/api/revisions/route.ts), [dashboard](../app/dashboard/page.tsx), [render modes](../lib/portfolio/render-mode.ts), [Pro presentation](../lib/portfolio/presentation.ts).

Current commits snapshot and update in separate database calls. Current manual saves may continue if history is unavailable. Existing optimistic checks are useful, but these are not yet the stronger transactional guarantees needed below.

**Public-page consequence:** saving an already-published portfolio changes its public content. An agent without a publish-status tool can still change a live page. For the first release, use a private unsaved proposal and clearly labelled “Apply to live portfolio” confirmation; do not silently invent a second persistent draft/publish system.

## 3. Phased delivery and release gates

### P0 — Prove the existing manual journey

1. Inventory the uncommitted changes; identify the exact build under test. Do not assume an existing Vercel preview contains them.
2. Run existing unit/API tests and synthetic browser checks without production credentials.
3. Test the actual authenticated app on an owner-controlled account: edit name/text/contact; add/edit/remove a project; save; refresh; switch design; inspect the public subdomain if published; undo; refresh again.
4. Verify applied revision migrations and whether the API actually reports history available. Check both current and opted-in render modes.
5. Record build/commit, account ownership, migration state, results and known failures. Do not include credentials or portfolio PII in reports.

**Exit:** persisted edits, template selection and undo have been demonstrated in the real app. Fix failures before extending editing. Design-review screenshots alone do not pass this gate.

Preview/local may use production Supabase and live payment services. Use local port 3101, only an account the owner controls, and no real payment, email, account deletion or unrelated database changes for this exercise. Live edits require deliberate confirmation and restoration of the test account afterward.

### P1 — Harden the shared mutation contract

1. Establish a canonical portfolio schema independent of template components. Align granular and whole-content validation without silently dropping legacy content.
2. Centralize ownership, actor permissions, plan restrictions and operation validation. Neither agents nor MCP may call the pure reducer as a substitute for server authorization.
3. Require expected versions for the new editor, agent apply and restores. Return conflicts with the local draft intact; never automatically overwrite a newer version.
4. Implement a transaction for before-snapshot + compare-and-set save + idempotency result. Duplicate requests return the original result; failed saves leave neither changed content nor phantom history.
5. Add request-size/operation limits, server-assigned actor/source metadata and operation summaries. Keep arbitrary full-content replacement unavailable to agents.
6. Require history for new granular writes and undo. Preserve the existing manual fallback only until migration readiness is verified and its retirement is approved.

**Exit:** tests prove cross-user rejection, entitlement enforcement, exact undo, conflict safety, safe retries and rollback on partial failure.

New tables require RLS plus revoked anon/authenticated grants in the same migration. Transaction functions need narrowly restricted execution privileges. Prepare rollback and compatibility tests; do not apply production SQL as part of drafting this plan.

### P2 — Stable targets and constrained presentation

1. Add persistent IDs to repeatable records, starting with projects and experience. Cover other repeatable records before exposing them as individual targets.
2. Use read-compatible adapters for older content and assign IDs once on an intentional version-checked save. Never generate fresh identities on every render or mutate portfolios on public reads.
3. Keep existing index-based operations only as a version-bound compatibility path; new clients target IDs. Missing/deleted targets produce errors, never edits to a neighbouring item.
4. Create a renderer/version capability registry: target, content field, editable properties, allowed values, entitlement and accessibility constraints. Include meaningful text labels; distinguish non-editable decoration.
5. Add versioned presentation metadata within content unless a demonstrated requirement needs another column. Preserve existing `layout` and `pro_designs` semantics.
6. Add proposed operations `set_element_style` and `reset_element_style`; reuse existing content operations. IDs and style metadata must survive form saves and history restore.
7. Use template defaults → section settings → element override precedence. Scope incompatible overrides by template/version; keep them dormant on a switch rather than discarding or blindly applying them.
8. Start with approved colour tokens, bundled font choices, bounded size/weight/line-height/spacing, alignment and image fit. No arbitrary selectors, CSS strings, HTML, remote fonts or URLs as styling values.

**Exit:** editing one project title's appearance affects only that title, follows it after reorder and survives reload/undo. Unsupported properties are rejected server-side. Reset restores the template default. Text remains unchanged by styling. Older snapshots render safely.

### P3 — Manual selectable preview and inspector

1. Extract focused editor components from the dashboard rather than adding another large inline feature.
2. Share a local draft and operation queue across forms, preview and inspector. Keep the existing forms as an accessible alternative.
3. Add click-to-select, a keyboard-accessible element list, visible selection and a property panel containing only supported controls.
4. Separate content and appearance controls; provide reset, pending-change indicators, Cancel and explicit Save.
5. Preview locally with the same renderer used publicly. Group adjustments into one intentional save/revision, not one write per keystroke or slider movement.
6. Make save scope explicit so appearance-only saves cannot accidentally include unrelated unsaved text. Preserve drafts on network failure or conflict.

**Exit:** the first free/Pro pair passes select/edit/style/save/refresh/undo with keyboard, mobile and desktop. Check 375px width, contrast, focus, no horizontal overflow, image failure states and unchanged legacy baselines. Target the existing Lighthouse 90+ performance bar.

### P4 — In-app editing assistant, proposal first

1. Begin with an owner-allow-listed Pro pilot and kill switch. Keep manual editing fully usable if the assistant is disabled.
2. Start with explicit content corrections and project edits; no open-ended rewriting or styling in the initial pilot. Add styling only for controls that have passed P3.
3. Prefer one structured proposal call through `lib/llm` before investing in a multi-step tool loop, AG-UI or a new rendering framework. Validate current package/API requirements before selecting dependencies.
4. Send minimal relevant content through the approved PII gateway after clear consent. Treat portfolio/imported text as untrusted data, never instructions. Retain contact-placeholder protections; never log content or token maps.
5. Validate proposed operations server-side and produce an exact before/after diff plus private preview. Invalid or unsupported requests produce no write.
6. Bind an expiring, single-use approval to user, portfolio, current version and exact operation hash. Consume it atomically with the commit so replay/retry cannot apply twice. Only the authenticated user's explicit confirmation authorizes Apply; the model cannot authorize itself.
7. Require fresh approval after conflicts or changed operations. Cancel and expiry write nothing. Warn when Apply updates a public portfolio.
8. Add durable atomic run/spend reservations, token/time/operation caps, usage reporting and a cost kill switch. Do not rely on memory fallback or count-then-insert quotas for paid agent access.
9. Support version-safe, recorded undo. Exclude account, billing, slug, publication status, arbitrary storage access and full-content replacement from tools.

**Exit:** evaluate scripted corrections/project changes plus injection attempts; verify no unrequested edits, no apply without approval, rejection of stale/replayed tokens, quota failure blocking calls, exact undo and no changes to the initial-generation guard.

**Approval gate:** agree AI editing economics, privacy/consent wording, model evaluation and spend limits before live model use. The pilot is not a promise of unlimited AI editing.

### P5 — External MCP, only after the in-app pilot

1. Spike supported OAuth/MCP authorization with current official specifications and actual target clients. Treat earlier SDK/version advice as historical, not a dependency lock.
2. Launch read-only portfolio/capability access first, with explicit scopes, short-lived credentials and connected-app revocation.
3. Validate issuer, audience, expiry, signature, ownership, scopes and plan on each request. Add durable limits and privacy-safe audit records.
4. Route write proposals through exactly the same validation, approval and commit service. Initially require approval inside LivePortfolio, not only a third-party client's confirmation dialog.
5. A disconnect must block subsequent reads, proposals and pending applies. Do not share Supabase service-role keys. Defer remote image fetching/uploads pending SSRF and storage review.

**Exit:** supported clients connect; cross-user, wrong-audience, expired and revoked credentials fail; external writes meet the same approval/conflict/undo tests as in-app edits.

### P6 — Expand coverage and release gradually

- Extend the capability matrix and adapters across the remaining redesigned templates. Keep legacy pages unchanged unless the user opts in.
- Cover all supported content fields and repeatable items; state remaining exclusions explicitly instead of advertising universal control prematurely.
- Generate tool/schema documentation from the implemented registry; keep manual and programmatic behavior under the same contract tests.
- Roll out owner → small opt-in cohort → broader release. Monitor save failures, conflicts, undo failures, accessibility regressions and assistant cost without collecting portfolio text.
- Update availability and deployment documentation only after gates pass. Roll back a renderer/assistant feature without deleting saved content or overrides.

## 4. Dependency order and effort

**P0 → P1 → P2 → P3** is the first release track. **P4** can start after P1 for a content-only pilot; styling assistance additionally requires P2/P3. **P5 follows a successful P4 pilot.** Template coverage can expand independently once the shared contract is stable.

Indicative solo-engineer effort, not a deadline: P0 1–2 days; P1 3–5; P2 3–5; P3 4–7; P4 3–5. Budget roughly **3–5 working weeks for the first manual pair plus a content-assistant pilot**, excluding substantial discovered bugs, owner testing, migration approval and remaining template coverage. Estimate MCP after its authorization spike rather than promising a fixed date.

## 5. Immediate next action

Complete P0 on the actual app and document evidence. Then implement P1 as a focused change before adding presentation metadata. Do not start by installing an agent SDK or exposing external write tools.

Related plans: [overall roadmap](final-steps-plan.md), [assistant spike](agent-spike-plan.md), [MCP roadmap](mcp-and-roadmap-plan.md), [Pro redesign validation](pro-template-validation.md).

This plan refines those documents; it does not imply that their historical branch, deployment, migration or dependency statements remain current. No application code, production settings or databases were changed to produce this document; no tests were run for this planning task.