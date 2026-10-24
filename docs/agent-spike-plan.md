# AG-UI assistant spike: one-page plan (for approval; nothing built)

**Goal.** Prove, in 1 to 2 days, that a person can ask for a change to their portfolio in plain words, see exactly what would change, approve it, and undo it. Pro only, behind a flag, allow-listed to your own accounts. Not a launch.
**Not in the spike:** OAuth, MCP, public access, template or layout changes, payments, anything that publishes, free-text generation of new sections.

## Foundation it stands on (built on `dev`, not merged)
`lib/portfolio/ops.ts` (typed, validated operations) → `lib/portfolio/commit.ts` (snapshot, compare-and-set write) → `/api/revisions` (undo, restore). The assistant gets no write path of its own: every tool ends in `applyOps` and `commitState`.

## Pieces
1. **Route** `POST /api/assistant` (Node runtime, server-sent events). Checks: signed in, `entitlements.plan === 'pro'`, `ASSISTANT_SPIKE=1`, user id or email in `ASSISTANT_ALLOWLIST`. Anything else is a 404, so the feature does not exist for others.
2. **Events** use AG-UI (`@ag-ui/core` 1.0.3, MIT; accepts our zod 3.25.76). We define our own typed catalog on top and reject anything outside it: `RUN_STARTED / RUN_FINISHED / RUN_ERROR`, `TEXT_MESSAGE_*`, `TOOL_CALL_START / ARGS / END / RESULT`, `STATE_SNAPSHOT` (the portfolio the preview shows), and three `CUSTOM` events with zod payloads: `lp.changes_proposed`, `lp.changes_applied`, `lp.undone`. The browser uses a small SSE reader; we do not need `@ag-ui/client` (it adds rxjs) for one panel.
3. **Four tools**, all zod-validated:
   - `get_portfolio()`: read-only; content without account identifiers.
   - `preview_changes(ops)`: dry run through `applyOps`; returns the change list and a one-time token bound to (portfolio version, ops hash), valid 10 minutes. Writes nothing.
   - `apply_changes(token)`: **runs only after the person presses Apply in the UI** (an AG-UI interrupt); the model cannot trigger it alone. Calls `commitState({ source: 'assistant', requireRevisions: true })`: no history, no edit.
   - `undo()`: restores the newest revision; itself recorded.
   Ops the assistant may use: fields, links, skills, projects, experience, education, certifications. Not `replace_content`, not `set_template`, no plan or account fields.
4. **UI**: a side panel in the dashboard Edit tab: conversation, a diff of "what will change", Apply / Cancel, and the existing History panel underneath.

## Safety (the part that matters)
- **Portfolio text is untrusted** (imported CVs and GitHub text can contain instructions). It is passed to the model as data, never as instructions; tool results are labelled as data; the model has only these four tools.
- Bounded: at most 20 ops per call, 6 tool calls and about 8k tokens per run, 15 runs per user per day (counted in `usage_events`).
- Fail closed: no revisions table, no assistant edits. Every run logs counts and tool names only, never content.
- Reversible: one click undo, 50 versions kept.

## Needs your decision or action
1. **`usage_events` SQL first** (`supabase/manual/20261025110000_usage_events.sql`) so per-user limits are real. The `kind` check there lists `parse_cv, import, score`; the spike needs one more value (`assistant`), a one-line migration I would write for you to run.
2. **`portfolio_revisions` SQL** (`supabase/manual/20261026100000_portfolio_revisions.sql`, rollback beside it). Required before the assistant can edit.
3. **LLM gateway.** `lib/llm` today does single structured calls. Tool-calling needs a new function inside that gateway (the only place `openai` may be imported). That is a change to the PII boundary: your sign-off, including whether portfolio text is sent redacted (email and phone replaced by placeholders, as in import) or as is.
4. **Model.** Tool-calling quality is a different test from extraction. Plan: 20 scripted requests ("shorten my headline", "add a project", "remove the third one", plus 5 injection attempts planted in project text) scored on correct ops, no extra changes and refusing the injections, run on `gpt-4o-mini`, `gpt-6-luna` and one other, with the dedicated bench key. The default stays `gpt-4o-mini` until the numbers say otherwise.
5. **Dependencies.** Install `@ag-ui/core` and `@ag-ui/encoder` only. **Do not install json-render**: its core hard-depends on zod `^4.3.6`, ours is 3.25.76 and `openai` 4 needs zod 3, so it cannot be adopted before the zod 4 and `openai` upgrade (which we agreed to do after the benchmark). We copy its pattern, which `lib/portfolio/ops.ts` already follows.

## Acceptance (all automated except the last)
Signed-out, non-Pro and non-allow-listed users get 404. A request without a prior preview cannot apply. A preview token cannot be reused, expires, and fails if the portfolio changed. Planted instructions in project text produce no unrequested ops. Apply without the UI confirmation is impossible. Undo restores exactly. The run is stopped at its limits. Last: you try it on your own account on the `dev` preview.

**Effort:** foundation is done; gateway extension and route about 1 day, panel and tests about 1 day, benchmark half a day once the key exists.
