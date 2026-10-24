# Reference study: Reactive Resume (MCP, patching, history, auth) and two landing pages

Status: **Phase A, study only.** Nothing in this document is implemented. Written for Clifford (owner) to approve before any build.

## 0. Scope, sources, limits

| Item | Detail |
|---|---|
| Reactive Resume | Cloned read-only at `./reactive-resume` (repo root of our project; version 6.0.5, HEAD `2c7f41763 fix(mcp): align tool annotations…`). **License: MIT, © 2026 Amruth Pillai** (read from `reactive-resume/LICENSE`). The brief's "Licenses:" line was empty; this is what the file says. |
| CVAurum | **Not cloned.** Studied through its public site `cvaurum.com` (fetched) and its Product Hunt mirror. **Licence conflict:** the site says **AGPL-3.0**, Product Hunt says "MIT". Treat as AGPL: no code, no copy, no wording reuse. |
| rxresu.me | Studied through the fetched page **and** the page source in `reactive-resume/apps/web/src/features/homepage/*.tsx` (the source is more reliable than a fetch). |
| Not verified | No browser tool was available, so no visual/interaction teardown. Supabase claims come from the docs pages listed in §4 (not from a live project). `better-auth` internals are not installed in the clone, so its API-key hashing default is **stated from memory of its docs, unverified**. |
| Housekeeping risk | `reactive-resume/` sits **inside our repo directory as an untracked folder with its own `.git`**. A careless `git add -A` would stage a third-party repo. Move it out or add it to `.git/info/exclude` before the next commit. I did not change anything. |

Only file created in this phase: this document.

---

## 1. Where things live in Reactive Resume, and what ports

Architecture in one line: a pnpm/Turborepo monorepo; `apps/server` mounts API + auth + MCP on one Node process; **every MCP tool is a thin wrapper that calls the same oRPC router the web app uses**, so ownership, locking, validation and permission checks exist once (in the API layer), not per tool. That is the single best idea to copy.

| Concern | Files (all under `reactive-resume/`) | What it does | Port to Next.js + Supabase | Stack-specific (do not port) |
|---|---|---|---|---|
| **MCP server** | `apps/server/src/mcp/handler.ts`, `server.ts`, `auth.ts`; `packages/mcp/src/{tools.ts, tool-meta.ts, parity.ts, annotations.ts, contracts.ts, results.ts, prompts.ts, resources.ts, discovery.ts, mcp-server-card.ts, mcp-tool-names.ts, files.ts}`; `packages/api/src/features/mcp/transport.ts` | **Stateless** Streamable HTTP: a new `McpServer` per POST (`WebStandardStreamableHTTPServerTransport`, `enableJsonResponse`, 4 MiB body cap), GET/DELETE → 405, `Cache-Control: no-store`, Origin allow-list (native clients send none), cookies deleted before auth, two rate limiters (600/min per IP and per user), diagnostic-ID on 500s, `WWW-Authenticate: Bearer resource_metadata=…` on 401. `parity.ts` is an **explicit allowlist** of API procedures exposed as `api_*` tools ("adding an API procedure never silently grants MCP access"). Tool `annotations` (readOnly/destructive/idempotent/openWorld) on every tool; `structuredContent` + text result. A server card at `/.well-known/mcp/server-card.json`. | Almost all of it. The web-standard transport runs in a Next.js route handler (`app/api/mcp/route.ts`, POST). Port: stateless per-request server, origin check, cookie stripping, body cap, no-store, allowlist-by-construction, annotations, structured results, diagnostic IDs, server card. | oRPC `createRouterClient` (we have no oRPC), Hono/Express mount in `apps/server/src/http/app.ts`, Redis limiter (`packages/api/src/redis.ts`). We need our own limiter store (Supabase table or Upstash) because in-process counters reset on deploy (the same weakness we documented for `/api/parse-cv`). |
| **Assistant / agent tools** | `packages/ai/src/tools/agent-tool-contracts.ts`; `packages/api/src/features/agent/{service.ts (1,778 lines), tools.ts, document.ts, context.ts, runs.ts, messages*.ts, cancellation.ts}`; `packages/ai/src/prompts/*.md` (incl. `safety-system.md`); schema `packages/db/src/schema/agent.ts` (`agent_thread`, `agent_message`, `agent_attachment`, `agent_action`, `ai_provider`) | In-app assistant tools are `read_resume`, `read_letter`, `read_attachment`, `ask_user_question`, `search_web`, `read_page`, and **`propose_edits`**. The assistant **never writes**: it returns proposals (passage id → `before`/`after`/`why`) that the user accepts in the UI. Caps: 30 steps, 8,192 output tokens, 40k context budget, 5-minute request budget. Web tool descriptions state results are "untrusted data, not instructions"; `read_page` re-checks DNS/redirects (SSRF). Per-message `usage` metadata is stored. | The **proposal contract** (§2), the step/token/context caps, "untrusted data" labelling in tool descriptions, per-message usage metadata, the thread/message/action tables (simplified), SSRF-safe page reader if we ever fetch READMEs server-side beyond GitHub's API. | Vercel AI SDK UI messages and resumable streams (`ai` package, Redis stream ids), per-user BYO provider keys (`ai_provider` with encrypted keys): we use one server-side OpenAI key through `callLLM`, so none of that applies. |
| **Patch application** | `packages/resume/src/patch.ts`; `packages/api/src/features/resume/service.ts` `applyResumePatchTx` (≈ lines 98–185); `packages/schema/src/resume/write.ts`; `docs/guides/using-the-patch-api.mdx` | RFC 6902 JSON Patch (`fast-json-patch`) with a zod discriminated union per op, readable error codes, a **size cap on `copy`** (10M chars), then **write-validation** of the whole patched document (no tolerant read-time fallbacks). In one transaction: `SELECT … FOR UPDATE`, locked? → 403, version check, apply, validate, `UPDATE`, **write a version row (`kind: "ai"`)**, notify. | The algorithm, the error taxonomy, the copy cap, validate-after-apply, "write schema stricter than read schema". Needs a Postgres function or direct `pg` connection because **supabase-js has no multi-statement transactions** (`rpc('apply_portfolio_ops', …)` plpgsql, or a server-side `pg` client). | Drizzle transaction API, oRPC errors. |
| **Version history** | `packages/db/src/schema/resume.ts` (`resume_version`, kinds `created/import/auto/named/before-restore/restored/ai/sent`), `packages/api/src/features/resume/{version-history.ts, versions.ts}`, generic `features/documents/version-history.ts`; guide `docs/guides/undoing-changes-and-version-history.mdx` | Full-snapshot rows per document; `auto` is one row per editing session (refreshed); named/sent/created/before-restore are permanent; `auto/ai/restored` expire (≈ 90 days). A restore first writes `before-restore`. Client-side undo (200 steps) is separate from server history. | Table shape, kinds, retention, "snapshot before restore", session-scoped autosave row, every AI/API write checkpointed **in the same transaction**. | UI for history lives in `apps/web` (TanStack); not needed. |
| **API keys** | `packages/db/src/schema/auth.ts:206` (`apikey`: `key` (hashed by the plugin), `start`, `prefix`, `permissions`, `expiresAt`, `enabled`, `lastRequest`, `requestCount`, rate-limit columns); `packages/auth/src/config.ts:628` (`apiKey({ enableSessionForAPIKeys:false, … })`); `packages/api/src/context.ts` (`resolveAuthenticationFromRequestHeaders`); UI `apps/web/src/features/settings/ai/{api-keys.tsx, mcp.tsx, page.tsx}`, `routes/dashboard/settings/api-keys.tsx` | Header `x-api-key`. Permissions are three coarse statements **`read` / `write` / `delete`**, resolved per request; `requiredPermission(route)` maps HTTP method / operationId to one of them and returns `WWW-Authenticate: …insufficient_scope`. Keys cannot become a browser session. | Table columns, per-request resolve + active-user check (banned users rejected), `enableSessionForAPIKeys:false` principle, `insufficient_scope` challenge, UI pattern (create → show once → list → revoke). | The `@better-auth/api-key` plugin. **Do not copy:** `permissions == null ⇒ full access` (legacy keys silently get everything) and the 3-scope granularity (no per-resource, no "can propose but not apply"). |
| **OAuth** | `packages/auth/src/config.ts` (`oauthProvider({ loginPage, consentPage:"/auth/consent", scopes:[openid,profile,email,offline_access,api:read,api:write,api:delete], allowDynamicClientRegistration:true, allowUnauthenticatedClientRegistration:true })`, `verifyOAuthToken` ≈ lines 50–100); `apps/web/src/routes/auth/consent.tsx` | DCR + PKCE S256 for MCP clients. **Per-request grant re-check:** loads client (not disabled), the login session (unless `offline_access`), and the **consent row**; rejects if the token's `rr_grant_id` ≠ the current consent id or any token scope exceeds the consent scopes → revoking consent kills already-issued JWTs immediately. DPoP-bound tokens rejected. | The per-request grant re-check pattern; a custom `rr_grant_id`-style claim (Supabase has an access-token hook for custom claims, §4); explicit consent screen; list/revoke connected apps UI. | `better-auth` oauth-provider internals. |
| **Optimistic concurrency** | `packages/api/src/features/resume/service.ts` (`assertResumeVersion`, `resumeVersionConflict`), `crud.ts` (`RESUME_VERSION_CONFLICT`, HTTP 409 with `data.updatedAt`), MCP `apply_resume_patch` takes `expectedUpdatedAt`; cover letters use an integer `revision` (`expectedRevision`) | Compare **inside the row lock, in JS at millisecond precision**; the code comment records a real bug: comparing `updated_at` in SQL fails forever because Postgres stores microseconds. Locked documents (`is_locked`) reject all writes. | Yes, but prefer the **integer `revision`** (they added it for letters) over timestamps. Return `409` with the current revision so the client can reread and retry. Lock flag is a cheap "freeze" we could offer. | — |
| **Skills / agent plugin** | `plugins/reactive-resume/{plugin.json, mcp.json, skills/*}` (resume-builder, resume-tailor, resume-bullet-writer, …) | Markdown "skills" that tell a client how to use the tools. | The idea: ship 2–3 short skill files with our MCP page (e.g. "tidy my portfolio from GitHub"). | Their skills target resumes/jobs. |
| **Rate limits** | `packages/utils/src/rate-limit.ts`, `packages/api/src/redis.ts`, per-route `resumeMutationRateLimit` | Named limiters, per-route mutation limits plus the MCP limiters. | Concept. | Redis. |

---

## 2. Schema and patch semantics → our `PortfolioContent` and `applyOps`

### 2.1 Side by side

| | Reactive Resume | LivePortfolio today |
|---|---|---|
| Storage | `resume.data jsonb` (+ columns `name, slug, tags, is_public, is_locked, password, trashed_at`) | `portfolios.content jsonb` (+ `template, seo_*, health_score, view_count, edit_count`; `users.slug/plan/custom_domain`) |
| Shape | zod `resumeDataSchema` (`packages/schema/src/resume/data.ts`): `picture, basics, summary, sections{…typed item lists}, customSections, metadata{template, layout, page, design, typography, styleRules, stylesheet, check, notes}` | `PortfolioContent` (`components/templates/Minimal.tsx:19`): flat `name, role, headline, about, location, email, github_url, linkedin_url, avatar_url, skills[], skills_narrative, skills_grouped[], projects[{title, problem, solution, outcome, stack, url, github_url, image_url}], experience[], education?, certifications?: string[], testimonials?` |
| Item identity | every item has a stable **`id`** and **`hidden`** flag | **no ids, no hidden flags**; arrays addressed by position |
| Presentation settings | **inside the document** (`metadata`), so they are versioned, patchable and undoable | **outside** the document (`portfolios.template`; nothing else exists: no colours, fonts, section order or visibility) |
| Rich text | HTML strings (`summary.content`, item `description`) | plain strings; some fields AI-written (`problem/solution/outcome`) |
| Validation | strict **write** schema (`write.ts`, 200k-char text cap, 10M doc cap) distinct from tolerant **read** schema | none: `/api/update` allow-lists top-level keys only, then stores any value |
| Versions | `resume_version` snapshots, 8 kinds | none (`edit_count` only) |
| Concurrency | `expectedUpdatedAt` / `expectedRevision` | none (whole-object last-write-wins) |
| Edit protocol | RFC 6902 patch (MCP/API) **and** proposals (assistant) | whole `editContent` PATCH from the dashboard |
| Entitlements | none in the data path (free product) | `users.plan` vs `subscriptions` (two sources of truth) |

### 2.2 What this means for `lib/portfolio-ops`

1. **Typed ops, not raw JSON Patch, as the public surface.** JSON Patch lets a caller address any path; that is acceptable for RR because nothing in a resume is privileged. Ours has privileged fields (`template` Pro gating, URL fields rendered as links, SEO-derived fields). Typed ops allow one entitlement/risk check **per op type** and one validation per op. Keep JSON Patch **internally** only for diff storage in revisions (`fast-json-patch` `compare`) and for the existing guarded-copy/size ideas.
2. **Port their transaction recipe verbatim**: lock row → check lock flag → check `expectedRevision` → apply → validate whole result with the write schema → update with `revision + 1` → insert revision row → insert audit row → revalidate cache. Needs a plpgsql function or a `pg` connection (no transactions in supabase-js).
3. **Add stable ids first.** Projects/experience/education need `id`s (lazy migration: `ensureIds()` on read and on first write; ids never reused). Proposals and ops address `{section, id, field}`, not indices. Indices stay legal only inside one revision.
4. **Move presentation settings into versioned storage** (`portfolio_settings`, §7) so layout changes are revisioned and undoable like content. Today there is nothing to move, so this is greenfield: section order, per-section `hidden`, theme/accent, font pair (limited to our curated pairs; the CLAUDE.md rule "never Inter/Arial/Roboto" becomes an allow-list).
5. **Write schema ≠ read schema.** Introduce `PortfolioContentV1` (zod) with caps and URL scheme allow-list (`http(s)` only), strip `<`/tags from plain-text fields, then validate on every write. This is also the XSS fix's second layer.
6. **Proposal contract** (port `packages/resume/src/proposals.ts` as-is in spirit): `{id, target:{section,itemId?,field}, location, before, after, why, status: pending|accepted|rejected, source}`; `canApply` = the `before` passage still occurs **exactly once** in the field, otherwise the proposal is **stale**; accepted-then-undone returns to pending (`getStateIn`); apply uses a replacer function so `$&` in text stays literal. Add our `source` values: `assistant | github-sync | cv-reimport | mcp-client`.
7. **Differences to keep deliberately:** (a) RR's MCP **applies** patches (`apply_resume_patch`, recorded as an "AI edit" version); ours makes AI/MCP content changes **proposals only** (accepting is a user action). (b) RR scopes are coarse `read/write/delete`; ours are per risk tier (§3). (c) RR's `legacy key ⇒ full access`; ours default-deny. (d) RR has per-user BYO model keys; ours uses `callLLM` with PII redaction.

### 2.3 Op catalogue (shape only)

```ts
type Op =
  // content (proposal-tier when requested by an agent; direct only from the signed-in user UI)
  | { type: 'set_field';        target: Target; value: string }
  | { type: 'add_item';         section: 'projects'|'experience'|'education'|'certifications'; value: Item; after?: string /* id */ }
  | { type: 'update_item';      section: Section; id: string; patch: Partial<Item> }
  | { type: 'remove_item';      section: Section; id: string }
  | { type: 'reorder_items';    section: Section; order: string[] }
  // layout (reversible; Pro gates apply)
  | { type: 'set_template';     template: TemplateId }
  | { type: 'reorder_sections'; order: SectionKey[] }
  | { type: 'set_visibility';   section: SectionKey; itemId?: string; hidden: boolean }
  | { type: 'set_theme';        accent?: AccentId; fonts?: FontPairId }
  // meta
  | { type: 'restore_revision'; revisionId: string }
// user-only ops exist in the service but are NOT reachable from API keys / OAuth tokens:
//   set_slug, set_custom_domain, publish, unpublish, delete_portfolio, accept_proposal (human click), change_plan
type Ctx = { userId; portfolioId; expectedRevision; actor: 'user'|'api_key'|'oauth'|'assistant'|'sync'; actorId?; scopes: Scope[] }
applyOps(ctx, ops[]) → { revision, changed, revisionId } | Conflict{currentRevision} | Invalid{index,code} | Forbidden{scope|entitlement}
```

---

## 3. Our MCP tool surface

Naming: plain verbs like Reactive Resume (`get_portfolio`), no vendor prefix. Every tool carries MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) as hints only; **enforcement is server-side** (annotations are not a security boundary). A single table `TOOL_SCOPES` maps every registered tool to exactly one scope and a unit test fails if a tool is registered without an entry (the equivalent of RR's allowlist rule).

Scopes: `portfolio:read`, `contact:read` (email, phone, links: **off by default**; without it contact fields come back as `"[withheld]"`), `analytics:read`, `layout:write`, `content:propose`, `sync:propose`. There is **no** scope for publish, slug, domain, billing, deletion, key/grant management or accepting proposals.

### 3.1 Tiers and tools

| Tier | Tool | Input (zod-style) | Annotations | Scope |
|---|---|---|---|---|
| **Read** | `get_portfolio` | `{ include?: ('content'\|'settings'\|'seo'\|'plan')[] }` → content with stable ids, `revision`, settings, published URL/state (read-only), Pro-template flags | readOnly, idempotent | `portfolio:read` (+ `contact:read` for contact fields) |
| Read | `get_content_schema` / resource `portfolio://_meta/schema` | `{}` | readOnly | `portfolio:read` |
| Read | `list_revisions` | `{ limit?:1..50, cursor?:string }` | readOnly | `portfolio:read` |
| Read | `get_revision` | `{ revisionId:string }` | readOnly | `portfolio:read` |
| Read | `diff_revisions` | `{ from:string, to:string }` | readOnly | `portfolio:read` |
| Read | `list_templates` | `{}` → ids, labels, `requiresPro` | readOnly | `portfolio:read` |
| Read | `list_proposals` | `{ status?: 'pending'\|'accepted'\|'rejected'\|'stale', limit?:number }` | readOnly | `portfolio:read` |
| Read | `get_analytics_summary` | `{ range?: '7d'\|'30d' }` (Pro entitlement checked server-side, not only in the UI) | readOnly | `analytics:read` |
| Read (external) | `preview_github_sync` | `{ login?:string }` → what the GitHub connector *would* suggest, nothing stored | readOnly, openWorld | `sync:propose` |
| **Reversible layout** (auto-applied, revisioned, undoable) | `set_template` | `{ template:TemplateId, expectedRevision:number }`; Pro template without Pro → `FORBIDDEN entitlement` | non-idempotent write | `layout:write` |
| Layout | `reorder_sections` | `{ order:SectionKey[], expectedRevision }` | idempotent write | `layout:write` |
| Layout | `set_section_visibility` | `{ section:SectionKey, itemId?:string, hidden:boolean, expectedRevision }` | idempotent write | `layout:write` |
| Layout | `set_theme` | `{ accent?:AccentId, fonts?:FontPairId, expectedRevision }` (curated ids only) | idempotent write | `layout:write` |
| Layout | `restore_revision` | `{ revisionId:string, expectedRevision }` (writes a `before-restore` snapshot first) | non-idempotent write | `layout:write` |
| **Content proposal** (stored as pending, applied only by the user) | `propose_edits` | `{ title:string(≤80), basedOnRevision:number, edits: {target:{section,itemId?,field}, text:string(≤2000), why:string(≤240), add?:boolean}[] (1..12) }` → proposal id, per-edit `before/after`, `skipped[]` (passage not found) | write (creates a proposal only) | `content:propose` |
| Content proposal | `propose_add_item` | `{ section, value:Item, basedOnRevision }` | write (proposal) | `content:propose` |
| Content proposal | `propose_remove_item` | `{ section, id, why, basedOnRevision }` | write (proposal) | `content:propose` |
| Content proposal | `withdraw_proposal` | `{ proposalId }` (only proposals this client created, still pending) | write | `content:propose` |
| Content proposal | `sync_github_suggest` | `{ login?:string }` runs the GitHub connector and stores suggestions (new/changed repos, stale descriptions) as proposals with `source:'github-sync'` and evidence | write, openWorld | `sync:propose` |

Tools that **must never exist** (user-only; also enforced by the service refusing these ops for non-session actors): publish / unpublish, change slug, custom domain, pay / plan / billing, delete portfolio or account, create/revoke API keys or grants, change email/password, **accept** or reject a proposal, export all personal data, change another user's anything. Where RR hands such flows to the browser (`open_account_settings`, `api_resume_set_password` returning an editor link), ours may return a **link** to the dashboard page (a read-only convenience), never an action.

Prompts (ready-made instructions, like RR `build_resume / improve_resume / review_resume`): `tidy_portfolio` (read → propose small edits), `from_github` (preview sync → propose), `review_portfolio` (critique only). Resources: `portfolio://_meta/schema`, `portfolio://current` (JSON, respects `contact:read`).

### 3.2 Result conventions (ported)
Lists: `limit` ≤ 50, `{ items, nextCursor }` in `structuredContent`; ISO-8601 dates; conflicts return `409 PORTFOLIO_REVISION_CONFLICT` + `{ currentRevision }` ("reread before retrying"); validation errors name the op index and a stable code, never the whole document; `X-Request-Id` / diagnostic id on 500s.

---

## 4. Auth plan

### 4.1 API keys v1 (ship first)

Works with every MCP client that can send a header (Claude Code, Cursor, Codex, `mcp-remote`), needs nothing from Supabase's beta OAuth server.

```sql
create table api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  name          text not null,
  key_prefix    text not null,            -- 'lp_live_' + first 6 chars of the secret (display only)
  key_hash      bytea not null unique,    -- sha256(secret) ; secret is 32 random bytes, base64url, shown ONCE
  scopes        text[] not null,          -- explicit; empty array = no access (NO "null means everything")
  expires_at    timestamptz not null,     -- default now()+90d, max 365d
  revoked_at    timestamptz,
  last_used_at  timestamptz,              -- updated at most once per minute per key
  last_used_ua  text, last_used_ip_hash text,
  use_count     bigint not null default 0,
  created_at    timestamptz not null default now()
);
alter table api_keys enable row level security;   -- no policies: service role only
```
- **Hashed** (sha256 is sufficient for 256-bit random secrets; no salt needed; constant-time via indexed hash lookup), **scoped** (subset of §3 scopes, checked per tool), **revocable** (looked up on every request, so revocation is immediate), **last-used logged** (throttled write), **expiring**, max 5 active per user, rate-limited per key and per user, accepted only as `x-api-key` or `Authorization: Bearer lp_…` **on `/api/mcp` and `/api/v1/*`** (never as a browser session), `Cache-Control: no-store`. Secret scanning prefix `lp_live_` so leaked keys can be detected.
- Creation/revocation UI is **user-only** and requires a fresh session; every create/revoke/use-failure is audit-logged. Whether Basic users may create keys or only Pro is a **product/entitlement decision** (see §7 dependencies).
- `get_portfolio` etc. reuse the same `applyOps`/read service as the dashboard, so no second authorization implementation.

### 4.2 Can Supabase Auth be our OAuth 2.1 server (PKCE + dynamic client registration)? Findings

Short answer: **yes for the standard parts, with caveats that change the design (custom scopes, beta status, revocation semantics, DCR verification).** All below is from Supabase's docs, not from a live project.

| Question | Finding | Source |
|---|---|---|
| Is it an OAuth 2.1 / OIDC authorization server for third-party apps? | Yes: "Supabase Auth can act as an OAuth 2.1 and OpenID Connect (OIDC) identity provider." | https://supabase.com/docs/guides/auth/oauth-server |
| Status / plans | **"OAuth 2.1 server is in beta and available on all Supabase plans."** No separate charge; users who sign in through it **count toward MAUs**. | https://supabase.com/docs/guides/auth/oauth-server/getting-started |
| PKCE | Required ("mandatory PKCE"); the flow table lists `code_challenge_method` **`S256` (recommended) or `plain`** → the server does not obviously force S256-only; we cannot rely on that and must test what our project accepts. | https://supabase.com/docs/guides/auth/oauth-server/oauth-flows |
| Dynamic client registration | Documented for MCP: "Automatic registration for MCP-compatible clients"; optional dashboard toggle (Authentication → OAuth Server) and CLI `allow_dynamic_registration`. **The registration endpoint path/metadata field is not stated**, and the docs warn: "Dynamic registration allows any MCP client to register with your project." Recommended safeguards: require user approval for all clients, monitor registered clients, validate redirect URIs. | https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication |
| Consent UI | **We build it** (`authorization_url_path`, e.g. `/oauth/consent`); calls `supabase.auth.oauth.getAuthorizationDetails / approveAuthorization / denyAuthorization`. A Next.js "OAuth Consent" block exists. | getting-started; https://supabase.com/library/docs/nextjs/oauth-consent |
| Discovery | AS metadata: `https://<ref>.supabase.co/auth/v1/.well-known/oauth-authorization-server`; OIDC: `…/auth/v1/.well-known/openid-configuration`; JWKS: `…/auth/v1/.well-known/jwks.json`. The MCP page also cites `https://<ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1`. | oauth-flows; mcp-authentication |
| Endpoints | authorize `…/auth/v1/oauth/authorize`; token `…/auth/v1/oauth/token` (code exchange + refresh; refresh tokens may rotate). | oauth-flows |
| Token | Standard Supabase **JWT** with extra **`client_id`** claim; **no `scope` claim in the documented example**; docs say scopes "control OIDC data" (openid/email/profile/phone), "Enforce data access in RLS, not through scopes". Default access-token lifetime 3600 s. Default signing **HS256**; **asymmetric (RS256/ES256) recommended and required for OIDC ID tokens**. | token-security; getting-started |
| Custom scopes (our `content:propose`, …) | **Not documented as supported.** The access-token hook can add/override *claims* (e.g. `aud`, per-client metadata), not define scopes. | https://supabase.com/docs/guides/auth/oauth-server/token-security |
| Revocation | `supabase.auth.oauth.revokeGrant(clientId)`: "all active sessions and refresh tokens for that client are immediately invalidated"; **already-issued access JWTs: not stated** (assume valid until `exp` ≤ 1 h unless we check). `getUserGrants()` lists authorised apps. | oauth-flows |
| What the MCP server must do | Publish **protected-resource metadata + `WWW-Authenticate`** challenge (the docs point to `withOAuthProtectedResource()` from `@supabase/server`; the package exists on npm, v1.9.2, MIT, but I did not inspect it) and verify access tokens like any OAuth resource server. | mcp-authentication |
| Self-hosted | CLI/local: `[auth.oauth_server] enabled=true, authorization_url_path="/oauth/consent"` in `supabase/config.toml`. | getting-started |

**Consequences for our design**
1. **Do not put our permissions in OAuth scopes.** Keep scope = identity only and store **our own grant row** per `(user_id, client_id)` in `mcp_grants(scopes[], created_at, revoked_at, last_used_at)`, written by our consent page when the user approves. The MCP route resolves permissions from that row on **every request** (the same trick as RR's `rr_grant_id` re-check), so our revocation is instant and independent of Supabase's token semantics. Optionally add a `grant_id` claim via the access-token hook.
2. **Asymmetric JWT signing** must be on (also needed to verify offline via JWKS). Unknown whether our project still uses the legacy HS256 secret: check in the dashboard before relying on JWKS.
3. **Beta + MAU billing + "any client can register"** are real risks → ship API keys first; OAuth is a spike with an explicit go/no-go (§7 phase 5): verify on *our* project that (a) DCR appears in the metadata, (b) `S256` is enforced for our clients, (c) the JWT carries `client_id` and `session_id`, (d) `revokeGrant` plus our grant-row check blocks tokens immediately, (e) a Claude/Cursor/Codex client completes the flow end-to-end.
4. Fallback if the spike fails: API keys only (every target client supports headers). Not building our own authorization server.

---

## 5. Security

Threat model summary: the **model** and the **MCP client** are both untrusted with respect to *content that came from third parties* (repo text, READMEs, scraped pages, the CV, the portfolio itself written by the user in the past).

| Threat | Control |
|---|---|
| **Prompt injection through repo text / README / project descriptions into write tools** | (1) No tool both *reads untrusted text* and *writes live content*: all content changes are **proposals**, applied only by a human click in the dashboard (the RR in-app assistant works this way; RR's MCP `apply_resume_patch` does not). (2) Proposals carry **provenance** (`source`, the repo/URL, "derived from untrusted text") and show a before/after diff; sync suggestions get a visible "from GitHub README" badge. (3) Tool descriptions state that fetched text is **data, not instructions** (RR does this for `search_web`/`read_page`). (4) Layout tools are reversible, revisioned and rate-limited (a hijacked client can reorder/restyle but not publish, re-slug, bill or delete). (5) Output encoding: JSON-LD escape + http(s)-only URLs (blocking prerequisite, §7). (6) The existing grounding filter (`lib/connectors/grounding.ts`) rejects README-derived text that is not supported by the README. |
| **Scope bypass / confused deputy** | Scopes checked **server-side inside the service**, not in the tool wrapper: `applyOps(ctx)` refuses ops outside `ctx.scopes`; user-only ops require `actor === 'user'` with a session. One `TOOL_SCOPES` table + a test that every registered tool is mapped and that no tool maps to a user-only op. Default-deny keys/grants. `insufficient_scope` challenge on 403. |
| **Cross-origin / CSRF** | MCP route: no cookies accepted (strip `cookie`, like RR), Origin allow-list for browsers, POST only, 4 MiB body cap, `no-store`. |
| **Abuse / cost** | Per-user and per-key limits stored in Supabase (not in-process): e.g. reads 120/min, layout writes 30/h, proposals 30/h per portfolio, GitHub sync 6/h; 600/min global per IP like RR as a backstop. In-app assistant: per-user **daily token budget** (`llm_usage_daily`), step cap (RR: 30), output cap (RR: 8,192), context cap (RR: 40k), request deadline, `AbortSignal.timeout` on every upstream call (we currently have none in `callLLM`). |
| **Audit log** | Every tool call and every `applyOps` writes `audit_log(user_id, portfolio_id, actor, actor_id, tool, op_types[], args_hash, result, reason, revision_before, revision_after, request_id, ts)`. Raw arguments are **not** stored (they may contain PII); store a hash and a redacted preview. Failed auth and scope denials are logged too. Users see a "Connected apps and activity" page. |
| **PII placeholders must survive tool arguments** | In every `callLLM`-driven tool loop the gateway already produces `[EMAIL_1]`-style tokens. Rules: (a) the token map is **request/conversation-scoped and rebuilt deterministically** from the current revision (tokens assigned by order of appearance of each real value), so placeholders in earlier assistant messages still resolve on later turns; (b) **tool arguments are passed through `restore()` before validation and persistence**; (c) an unknown or mangled placeholder in an argument **rejects the call** with a structured error to the model (never persists `[EMAIL_1]` as text, never drops it silently); (d) tool *results* going back to the model are **re-redacted**; (e) write schemas reject any string that still matches the placeholder pattern after restore; (f) proposals store restored (real) text. For **external MCP clients** (the user's own Claude/Cursor) there is no redaction layer: content returned is what the user's client sees by design, which is why contact fields are behind `contact:read` (default off) and the MCP page says so plainly. |
| **Secrets** | Keys hashed at rest; shown once; prefix for secret scanning; grants table service-role only; never log headers. |
| **Entitlements** | One server function `entitlements(userId)` (subscriptions.expires_at as truth). Pro-only ops (Pro templates, analytics) are checked in the service, **not** only in the UI (today `/api/score` and `/api/analytics/summary` are ownership-checked only). |
| **Direct DB writes** | Today `schema.sql` RLS lets the browser `UPDATE users` and `UPDATE portfolios` with the anon key; if live, that bypasses every control above (self-upgrade of `plan`, content edits without a plan). **Must be verified and closed before any of this ships** (§7 phase 0). |

---

## 6. Landing page teardown

### 6.1 rxresu.me (source: `apps/web/src/features/homepage/{page,hero,write,design,check,tailor,share,prepare,remember,sections,faq,footer}.tsx`; fetched page agrees)

One scroll-driven story ("Everything you've done, on one page"), prerendered so every word is in the first HTML response. Order:

| # | Section | Headline / device | CTA | What it proves |
|---|---|---|---|---|
| 1 | Hero | "A free, open-source resume builder and career manager." (an animated resume page assembling: role, school, impact numbers) | **Build your resume** → `/auth/register` | The product's category and price in one line; the sample document is the demo |
| 2 | 01 Write | "Write your professional resume." Live editor beside a page, "Saved · version n", assistant suggests, "you decide" | none | Autosave, version history, **AI never overrides the user** |
| 3 | 02 Design | "18 free resume templates. Make any of them yours." (type/colour/spacing; "words stay put") | link → `/resume-templates` | Template switching without losing content |
| 4 | 03 ATS check | "Check your resume's ATS readability." | **Check any PDF, no account needed** → `/ats-checker` | A free tool that works before sign-up (proof of competence + SEO) |
| 5 | 04 Tailor | paste a posting → tailored copy, match score, cover letter, tracker | none | The workflow depth beyond a builder |
| 6 | 05 Share | "Your resume, live at rxresu.me/alex-morgan." Public / password / private; PDF, Word, JSON | none | Ownership, portability, no lock-in |
| 7 | 06 Prepare | interview plan, practice, debrief | none | Product breadth |
| 8 | 07 Remember | stories written once, reused; facts can be switched off | none | Reuse of the user's own material |
| 9 | Social proof | "In good company": live totals (users, resumes, GitHub stars; refreshed every 6 h) | none | Real, measured numbers |
| 10 | Languages | "Speaks your language." 54 languages | help translate (Crowdin) | Community |
| 11 | Support / community | "Keep it free." + "A second pair of eyes." | Translate, Report a bug, Contribute, **Join Discord** | Open-source health |
| 12 | Pricing receipt | every feature at **$0.00**, ads/tracking "none", tips optional | GitHub Sponsors / Open Collective | The business model, stated plainly |
| 13 | FAQ | 9 questions: free? ATS? who sees it? import? formats? AI? interview prep? self-host? languages? | Try ATS checker; self-hosting guide | Objection handling with specifics |
| 14 | Closing CTA | "Put it all on one page." | **Build your resume** + Google Play | Repeat of the single CTA |
| — | Footer | links, MIT licence, "By the community, for the community." | — | Trust |

Patterns worth copying (not wording): one primary CTA repeated twice; a **live demo document** as the hero; a **pre-signup free tool**; objection-handling FAQ with concrete answers; "pricing receipt" honesty device; real totals instead of testimonials; section kickers that name the job each section does.

### 6.2 cvaurum.com (AGPL-3.0, local-only builder)

| # | Section | Content | What it proves |
|---|---|---|---|
| 1 | Hero | "A resume this beautiful never leaves your browser." Links: Create a résumé, Browse the 75 templates, 108 examples, 6 prompts for an AI assistant, GitHub | Privacy as the hook; abundance of content (templates/examples) |
| 2 | Three steps | pick template → fill in → export | Simplicity |
| 3 | Head-to-head table | data location, source code, ATS check (deterministic), offline, export formats, price | Differentiation by comparison |
| 4 | Privacy | no server/account/analytics/cookies, zero external requests, IndexedDB | Verifiable claims (invites a network-tab check) |
| 5 | "What reaches the exported file's text layer" | measured parser-compatibility numbers (e.g. 623 markers, 3,523 lines checked, PDF/A-2B, PDF/UA-1) | Evidence instead of adjectives |
| 6 | Questions | privacy, cost, ATS score, storage, accounts, transfer, exports, links, mobile, contrast, length | Objections |
| 7 | Templates / Examples / Prompts | 75 designs; 108 invented résumés by field/stage/country; 6 copy-paste prompts that output JSON Resume | SEO surface + AI-assistant-friendly import |
| — | Footer | AGPL-3.0, GitHub | Trust |

Patterns worth copying: **measured, falsifiable claims** with the evidence method stated; example gallery as SEO surface; AI-prompt page that targets assistant users.

### 6.3 Mapping to our `app/page.tsx`

Today (`app/page.tsx`): Hero ("Turn Your CV Into a Portfolio in Minutes…", CTA `/create`) → How it works (3 steps) → Templates (CSS mock cards, not real previews) → Pricing (`PricingSection`) → FAQ → Closing CTA → tagline strip → footer. No live sample, no social proof, no pre-signup free tool, no AI/MCP section, no import-source section.

| Proposed section (order) | Our honest content | Replaces / adds | Condition |
|---|---|---|---|
| 1 Hero | Keep promise "CV → portfolio"; replace the mock with a **real, public sample portfolio** (a fictional profile built with our own templates, labelled "sample") | adds a live demo | Sample is fictional and labelled |
| 2 Sources | "Start from what you already have": CV (PDF/Word), GitHub username, pasted text. Say what is sent to OpenAI (see §6.4) | adds | Only after `IMPORT_ENABLED` is on |
| 3 How it works | existing 3 steps, updated to import → review → publish | edit | — |
| 4 Templates | real screenshots of all templates (10); Pro templates marked | replaces CSS mocks | Screenshots of our own templates only |
| 5 Keep it current | GitHub sync suggestions, version history, one-click restore | adds | **Only when built** (phases 1 and 4) |
| 6 Connect your AI (`/mcp` page teaser) | "Let Claude/Cursor/Codex suggest edits; you approve every change"; link to the MCP docs page | adds | Only when phase 2+ ships |
| 7 Pricing | keep, one currency story, annual billing, what Basic vs Pro actually includes | edit | Billing fixes merged first |
| 8 FAQ | rewrite with true answers (§6.4) | edit | — |
| 9 Closing CTA | one primary CTA, repeated | keep | — |
| Footer | add MCP/Docs, Privacy, Terms | edit | — |

Social proof: use **only real numbers** from our own DB (published count already exists: `PublishedCount`), never invented totals or testimonials.

### 6.4 Claims we must NOT copy (false or unproven for us)

| Their claim | Why it is false/unproven for LivePortfolio |
|---|---|
| "Free forever, no paid tier, $0.00 receipt", "no paywall", "free templates" | We charge (annual Basic/Pro); publishing is paid |
| "No ads, no tracking, no cookies, zero external requests" (both) | We run analytics/pixels (`TrackingScripts`), call external services (OpenAI, Paystack, IPinfo, GitHub, `api.qrserver.com` for QR) |
| "Never leaves your browser", "no server", "no account", "works offline", data in IndexedDB (CVAurum) | We are a hosted SaaS with accounts, a database, and server-side AI |
| "Without an AI key, nothing is sent to an AI service" | Our CV import and portfolio generation send text to OpenAI by default (direct contact details are replaced with placeholders on the import and score paths; `/api/generate` still sends email and URLs). Disclose accurately; do not claim "private" or "anonymous" |
| "Open source / MIT / AGPL / self-hostable" | Our repo is private; no self-host story |
| "Bring your own AI key" | We use our key |
| "Keeps every version", "saves as you type", "undo", "restore a version" | None exist today (no revisions, no autosave) |
| "Unlimited exports, no watermark", PDF/Word/Markdown/JSON export, ATS checker, cover letters, job tracker, interview prep | None of these exist; free portfolios carry a watermark |
| "ATS checker: 0 uploads" | No such tool |
| "54 languages", "18/75 templates", "108 examples" | We have 10 templates, English UI |
| "Resumes created / users / stars" live totals | Only publish **real** counts from our DB; no GitHub stars, no invented totals |
| "Deleting your account deletes your resumes" | We do delete the user row, portfolio and storage objects, but backups, analytics events and email-list rows (`email_subscribers`) are not necessarily purged: verify before copying |
| "MCP: every change appears in history as AI edit; you can restore" | Needs revisions first (phase 1) |
| "MCP never accepts cookies / read-only keys / OAuth with DCR" | True only once §4 ships and is verified |
| "Community Discord, Crowdin, Android app" | We have none |
| CVAurum "Free, forever", "no tiers", measured PDF/UA facts | not ours; do not reuse the numbers or the structure's claims |

---

## 7. Phased plan

Sizing: S ≈ days, M ≈ 1–2 weeks, L ≈ several weeks (one developer).

### Phase 0: must merge/verify **before** anything below (blockers)
| Item | Why it blocks | Evidence in repo |
|---|---|---|
| **RLS check and hardening** | If `users_update_own` / `portfolios_update_own` are live, any logged-in user can set `plan='pro'` or rewrite content from the browser, bypassing every API/ops check. Verify in Supabase (policies + column grants); drop browser writes to `users`/`portfolios` except via service-role APIs. | `lib/schema.sql` policies; `app/create/page.tsx` inserts `users` with the anon client; dashboard reads both tables with the anon client |
| **XSS fix** | Stored XSS via JSON-LD (`app/portfolio/[slug]/page.tsx:228`) plus unvalidated URL schemes; ops/MCP would widen the write surface | `docs/import-hardening-proposals.md` §1, `bench/tests/xss-audit.test.ts` |
| **Billing fixes** (`fix/billing-entitlements`) merged, **test-mode verified** | `entitlements()` must read `subscriptions.expires_at`; tier-from-plan-code; renewals/expiry; Basic can edit | branch `fix/billing-entitlements` (commit `6fd46db`), not merged |
| **One entitlements function** + server-side gating of Pro features | analytics/score currently gated only in the UI; `template` accepts any string | `app/api/update/route.ts`, `app/api/score`, `app/api/analytics/summary` |
| `/api/update` input validation (allow-listed template ids, URL scheme allow-list, tag stripping, caps) | becomes the write schema used by ops | — |
| Move `reactive-resume/` out of the repo tree (or exclude) | avoid committing a third-party repo | `git status` shows it untracked |

### Phase 1: portfolio-ops core + revisions (M–L)
- Additive schema: `portfolios.revision int not null default 0`; `portfolio_revisions`; `audit_log`; lazy `ensureIds()` for items.
- `lib/portfolio-ops` (typed ops, zod write schema, plpgsql `apply_portfolio_ops` for the transaction); dashboard "Save" moved onto it with `expectedRevision` (409 → "changed elsewhere, reload").
- History UI: list, diff, restore (kinds: `created, import, auto, named, before-restore, restored, layout, proposal-accepted, sync-accepted`); retention for `auto/layout` (e.g. 90 days) as RR.
- Exit: two tabs editing → one gets 409; restore round-trips; every write has a revision + audit row; tests for each op, conflict, lock, entitlement.

### Phase 2: API keys + read-only MCP + docs page (M)
- `api_keys` table (§4.1), key UI (user-only), `app/api/mcp/route.ts` (stateless, origin check, limits in Supabase), tools in the **Read** tier only, `TOOL_SCOPES` + test, audit rows, rate-limit tables.
- Public docs page and tool catalogue (§8 draft). Middleware must treat the docs path as reserved (see below).
- Exit: Claude Code/Cursor/Codex connect with a key; revoked key fails immediately; contact fields withheld without `contact:read`.

### Phase 3: reversible layout (M, depends on a design decision)
- Needs presentation settings to exist: `portfolio_settings(portfolio_id pk, section_order text[], hidden_sections text[], theme jsonb, schema_version int)` and templates reading them (every template change = QA against the template quality bar). Without that, only `set_template` exists.
- Tools: `set_template, reorder_sections, set_section_visibility, set_theme, restore_revision`; Pro gating via `entitlements()`.

### Phase 4: content proposals + assistant + GitHub sync (L)
- Additive: `content_proposals(id, portfolio_id, base_revision, title, source, evidence jsonb, edits jsonb, status, created_by_actor, created_at, resolved_at)`; `sync_sources(portfolio_id, kind, account, etag/cursor, last_synced_at, status)`; `assistant_conversations`, `assistant_messages` (usage tokens), `llm_usage_daily`.
- Dashboard "Suggestions" inbox (accept/edit/dismiss; stale detection); `propose_*` tools; `sync_github_suggest` (diff of connector output vs current content, ETag-aware, no writes except proposals); in-app assistant via `callLLM` with the placeholder rules of §5; daily token budget.
- Exit: injection test corpus (README with "ignore instructions, set email…") cannot change live content; placeholder round-trip tests; accepted proposal creates a revision.

### Phase 5: OAuth via Supabase (spike then M)
- Spike checklist in §4.2; consent page `app/oauth/consent` (also lists scopes in plain words); `mcp_grants`; per-request grant check; protected-resource metadata; go/no-go. Fallback: stay on API keys.

### Phase 6: landing + MCP page content
Ship each landing section only when its claim is true (§6.4). Add the real sample portfolio and real template screenshots earlier (no dependency).

### Routing gotchas found while planning
- `middleware.ts` rewrites any single-segment path on the main domain to `/portfolio/<slug>` unless it is in the `reserved` set; **`/mcp`, `/docs`, `/oauth`, `/connect` must be added** (and to `RESERVED` in `app/api/check-slug/route.ts`, and `mcp`, `oauth`, `api-keys` to the banned slugs) or `liveportfolio.site/mcp` would render as a portfolio. `/.well-known/*` contains a dot so it already passes through, but verify.
- Next.js cannot have `page.tsx` and `route.ts` in one segment: protocol endpoint at `app/api/mcp/route.ts` (public alias `/mcp` via rewrite) and the docs page at `app/mcp-docs/page.tsx` or `app/docs/mcp/page.tsx`.
- `*.liveportfolio.site` subdomains map to user slugs: add `mcp`, `oauth`, `docs` to the banned list so nobody claims them.

### Billing dependencies (explicit)
Depends on the billing fixes: `entitlements()` truth (subscriptions), Pro-template gating in `set_template`, analytics tool gating, whether API keys/MCP are Basic or Pro (decision needed), and plan lapse behaviour (expired plan → keys keep working? recommended: read-only keys survive, write scopes stop).

---

## 8. Draft: the public MCP page (adapted from the Reactive Resume guide)

Do **not** publish until phase 2 ships. Statements marked ⚠ are conditional on later phases and must be removed or reworded until true. Location: docs page route (not `/mcp`, which is the protocol endpoint).

---

**Connect your AI assistant to LivePortfolio**

LivePortfolio runs a [Model Context Protocol](https://modelcontextprotocol.io) server. AI clients such as Claude, Cursor and Codex can read your portfolio and *suggest* changes in plain language. **You approve every content change in your dashboard.** The assistant can never publish, change your address, touch billing or delete anything.

**Before you start**
- A LivePortfolio account with a portfolio. ⚠ (Plan requirement: TBD.)
- A client that supports remote MCP servers over Streamable HTTP, or the [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) bridge.

**Server address:** `https://liveportfolio.site/mcp` (shown in *Settings → Connect AI*).

**Connect with an API key** (available at launch)
1. *Settings → Connect AI → Create key.* Choose the permissions (read-only is the default; "contact details" is a separate switch). Copy the key once; it is not shown again.
2. Add the server, sending the key in the `x-api-key` header:
```bash
npx add-mcp https://liveportfolio.site/mcp --name liveportfolio --header "x-api-key: YOUR_API_KEY"
```
(`add-mcp` is a third-party CLI; verify before recommending.) Or edit your client's config:
```json
{ "mcpServers": { "liveportfolio": { "url": "https://liveportfolio.site/mcp", "headers": { "x-api-key": "YOUR_API_KEY" } } } }
```
For clients that only run local commands: `npx mcp-remote https://liveportfolio.site/mcp --header "x-api-key:YOUR_API_KEY"`.

> **Warning.** A key in a config file grants its permissions. Keep the file private and revoke the key in Settings if it leaks. Keys expire after 90 days by default.

**Connect with OAuth** ⚠ *(only if the phase-5 spike passes)* — your client opens a browser, you review the permissions on the consent screen and choose **Allow** or **Deny**.

**What it can do**

| Group | Tools | Needs |
|---|---|---|
| Read | `get_portfolio`, `get_content_schema`, `list_revisions`, `get_revision`, `diff_revisions`, `list_templates`, `list_proposals`, `get_analytics_summary` | read (analytics: Pro) |
| Layout (applied immediately, undoable) ⚠ | `set_template`, `reorder_sections`, `set_section_visibility`, `set_theme`, `restore_revision` | layout |
| Suggestions (you approve) ⚠ | `propose_edits`, `propose_add_item`, `propose_remove_item`, `withdraw_proposal`, `sync_github_suggest` | suggest |

Every change is recorded in your portfolio's history ⚠ and can be restored. Suggestions appear in your dashboard under **Suggestions** with a before/after view; nothing changes until you accept.

**What it can never do:** publish or unpublish, change your address or domain, change plan or payment details, delete your portfolio or account, create or revoke keys, or accept its own suggestions.

**Try it:** "Show my portfolio." · "Suggest sharper wording for my first project." · "Check my GitHub for new projects I should add." · "Switch to the Bold template." ⚠

**Limits and privacy:** content your client reads is sent to that client's AI provider; contact details are withheld unless you enable them. Requests are rate-limited. Keys and connections can be revoked at any time under *Settings → Connect AI*; revoking takes effect immediately.

**Troubleshooting**

| Problem | What to do |
|---|---|
| `401 Unauthorized` | Key wrong, expired or revoked: create a new one |
| `403 insufficient_scope` | The key lacks the permission for that tool: create a key with it |
| `409 revision conflict` | Your portfolio changed after the client read it: ask it to read again |
| "Pro feature" | That template/tool needs the Pro plan |
| `429` | Too many requests: wait for the time in `Retry-After` |

**Related:** privacy policy, terms, ⚠ agent skills (short markdown workflows) and the tool reference.

---

## 9. Open questions for you (answers change the plan)

1. Plan gating: are API keys/MCP **Basic, Pro, or both**? What happens to keys when a plan lapses?
2. Are AI content changes **proposal-only** for v1 (recommended), or do you want an opt-in "auto-apply with undo" key flag later?
3. Is the Supabase project on asymmetric JWT signing keys, and are the live RLS policies the ones in `schema.sql`? (Needs a dashboard check; I have not accessed production.)
4. Phase 3 needs real presentation settings (accent/fonts/section order). Do you want those in the product at all, or should layout tools stop at `set_template` + visibility?
5. OK to treat OAuth as an optional spike (go/no-go) and ship API keys first?
