# Unification plan (dry run)

Status: **proposal only**. Nothing merged, nothing committed, no ref/worktree/stash created, no SQL run.
Written 2026-10-24. Every claim below came from a command run on this machine unless marked *unverified*.

## 0. Decisions needed before anything starts

1. **Where does production deploy?** The repo says Vercel; `CLAUDE.md` says VPS + GitHub Actions.
   - Commit `5e049c8` (2026-06-27) "migrate to Vercel … remove GitHub Actions deploy" deleted `.github/`. No branch or remote ref contains a `.github/` directory. `vercel.json` defines four crons (drip, health, affiliate, expire-plans).
   - `CLAUDE.md` (Deployment, VPS, GitHub Actions secrets, crontab sections) still describes the VPS flow. `docs/deploy-runbook-rls.md` (hotfix commit `0e667d9`) says "merge to main → GitHub Actions" and uses `pm2 logs`. **If Vercel is the live target, that runbook text is wrong** (use Vercel deployment logs; "instant rollback" = promote the previous deployment; env vars live in Vercel).
   - It also matters for design: the in-process rate limiters (`/api/account/profile`, check-slug, generate) are per-serverless-instance on Vercel, i.e. weak. The MCP rate limit planned from `audit_log` counts is unaffected.
   - Please say which is live (or both). I will not edit `CLAUDE.md` or the runbook until you do.
2. **Merge order** (section 1): recommended order is hotfix → (deploy + migrate) → billing → feat. Billing must come after the RLS migration, because until `users` writes are closed a user can set `plan` themselves and the billing work protects nothing.
3. **Uncommitted feat work**: approve the commit grouping in section 2.

## 1. Topology and predicted conflicts

```
a670831  (merge base of all three)
 ├── 0e667d9  main                       security: close browser writes … (hotfix, local only, not pushed)
 ├── 927b686  feat/import-connectors     + 46 uncommitted paths in the working tree
 └── 6fd46db  fix/billing-entitlements   billing entitlements, Basic editing, copy
```

`origin/main` is at a670831; local `main` is 1 ahead (the hotfix).

Method: `git merge-tree --write-tree` (no worktree, no ref updated). Because merge-tree only sees commits, I snapshotted the working tree through a throwaway index into an **unreferenced** commit object (`git add -A` into a temp index file, `write-tree`, `commit-tree`; the dangling objects are removed by `git gc`). This is the only thing written to `.git`.

| Step | Result |
|---|---|
| main → feat/import-connectors (committed only, 927b686) | **0 conflicts** |
| main → feat **including the uncommitted tree** | **0 conflicts** |
| fix/billing-entitlements → (main + feat + uncommitted) | **0 conflicts** |
| fix/billing-entitlements → main alone | 0 conflicts |

Why the hotfix merges cleanly: the identical files exist untracked in the feat working tree (`app/api/account/profile/route.ts`, `lib/slug.ts`, `lib/partners.ts`, `lib/json-ld.ts`, `scripts/rls-verify.mjs`, `supabase/**`, runbook) with byte-identical content (add/add of identical blobs merges clean); `app/create/page.tsx` and `CLAUDE.md` changed in different hunks. In the merged `create/page.tsx` both the profile fetch and the import picker are present.

**Semantic check of the final merged tree** (extracted with `git archive` into the scratchpad, not the repo):
- `tsc --noEmit`: exit 0.
- `vitest`: 4 of 5 files load and **88 tests pass**; `check:llm` passes.
- `tests/pii-gateway.test.ts` failed to *load* there (`SyntaxError: Invalid or unexpected token`, raised while importing `scripts/check-llm-boundary.mjs` under vitest). `node --check` accepts the script and the same suite passes (103/103) in the real working tree, so I believe it is an artifact of the scratch location (a junctioned `node_modules` and CRLF in the extracted copy). **Unverified; it must be re-run in the first real merge.**

Textual conflict-freedom is not the same as correctness. Things to look at at merge time:
- `package.json`: main's lacks `test`, `typecheck`, `check:llm` (all on feat). `package-lock.json` has no mismatch with `package.json` on feat, but `npm ci` on Windows fails on **main's** lockfile (missing `@emnapi/*`). *Unverified on Linux/Vercel.* Regenerate the lockfile once, deliberately, in its own commit.
- `tsconfig.tsbuildinfo` is tracked and modified by every build. Remove it from git (`git rm --cached`) and add to `.gitignore` in the cleanup commit.
- `CLAUDE.md`: three edits land (PII section on feat, rule 4b from the hotfix, the leaked-secret removal from billing). Billing's edit is the placeholder replacing a literal cron secret. The old secret is still in git history on `main`; you said it is rotated, so only rotation matters.

## 2. The uncommitted work on feat (46 paths)

| Group | Paths | Proposed commit |
|---|---|---|
| A. Already on main via the hotfix (drop from feat before merging; identical content) | `app/api/account/`, `lib/slug.ts`, `lib/partners.ts`, `lib/json-ld.ts`, `scripts/rls-verify.mjs`, `supabase/`, `docs/deploy-runbook-rls.md`, and the hotfix edits in `app/api/admin/invite`, `check-slug`, `cron/affiliate`, `app/create/page.tsx`, `app/portfolio/[slug]/page.tsx` | none: reset these paths after main is merged in |
| B. Hotfix tests (main has no vitest, so they were kept off main) | `tests/account-profile.test.ts` (now 31 tests, includes the null/array body case), `tests/no-browser-writes.test.ts`, `vitest.config.ts` | with feat, commit "test: RLS hotfix guards" |
| C. PII / LLM gateway | `lib/llm/`, `docs/pii-gateway.md`, `scripts/check-llm-boundary.mjs`, `tests/pii-gateway.test.ts`, `app/api/parse-cv`, `app/api/score`, `app/api/import` edits, `.env.local.example`, `package.json` (`check:llm`), `CLAUDE.md` PII section | "feat: PII gateway for all LLM calls" |
| D. GitHub connector rewrite | `lib/connectors/*` (github, github-rank, github-skills, grounding, types, normalize, merge, to-form, document, structure), `tests/connectors.test.ts`, `tests/github-connector.test.ts`, `tests/fixtures/` | "feat: GitHub connector ranking + grounding" |
| E. Create page picker | `app/create/page.tsx` picker UI part | with D or its own commit |
| F. `bench/` (own npm project, not shipped) | `bench/**` (39 files tracked-to-be; `node_modules`, `.env.local`, results ignored) | "chore(bench): evaluation harness" |
| G. Docs | `docs/import-connectors.md`, `docs/import-hardening-proposals.md`, `docs/json-resume-proposal.md`, `docs/reference-study.md`, this file | "docs: import studies" |
| H. Housekeeping | `.gitignore`, `tsconfig.json`, `tsconfig.tsbuildinfo` | cleanup commit (untrack tsbuildinfo) |

C and E touch the same files, so separating them by hunk needs `git add -p`; I would not split them (one commit "feat: PII gateway + import UI") unless you want reviewable pieces.

## 3. `fix/billing-entitlements` (6fd46db): diff and risks

Seven files, +286 / −233 (whitespace-insensitive: +266 / −213).

| File | Change | Risk |
|---|---|---|
| `app/api/paystack-webhook/route.ts` | Rewrite. Tier is derived **only** from the Paystack plan code (env `PAYSTACK_{BASIC,PRO,TEST}_PLAN_CODE`, falling back to the `NEXT_PUBLIC_` ones); unknown codes ignored; handles `subscription.create`, `charge.success`, `subscription.disable`/`not_renew`; `subscriptions.expires_at` is the source of truth; `users.plan` is a cache | **High**: money path. See gaps below |
| `app/api/cron/expire-plans/route.ts` | Also expires lapsed paid subscriptions (3-day grace); Supabase client now created inside `GET` (this also fixes the module-load client that broke `next build` without env) | Medium: downgrades users; logic skips users with a live time-boxed plan or a still-valid subscription |
| `app/api/update/route.ts` | Basic may edit content (was Pro only) | Low; this is a product decision, matches the new copy |
| `lib/getUserPlan.ts` | Counts `cancelled` subscriptions until `expires_at` | Low |
| `app/page.tsx`, `components/PricingSection.tsx` | Copy: removes the custom-domain claim, corrects currency and template count | Low |
| `CLAUDE.md` | Removes a literal cron secret | Rotate the secret regardless |

Gaps I found by reading the webhook (none are in the diff request, so I changed nothing):
1. **No amount or currency verification.** The plan code decides the tier; `data.amount` and `currency` are recorded but never compared with the expected price. A charge of the wrong amount on a valid plan code would still grant the plan.
2. **No refund / dispute handling.** `refund.processed`, `charge.dispute.*` and `invoice.payment_failed` are ignored; a refund leaves the user entitled until `expires_at`.
3. **Idempotency is check-then-act** (`alreadyProcessed` select, later `payments` insert): two concurrent deliveries can both pass the check. Mostly absorbed by the "expiry still > 30 days away → leave alone" rule and the unique `ls_order_id`, but `applyEntitlement` has no transaction.
4. **DB errors are logged and the response is still 200**, so Paystack will not retry; a failed subscription or user update silently loses an entitlement.
5. **User is matched by `customer.email`** against `users.email`, not by `user_id` metadata. A payer who uses a different email than their account gets nothing (and no alert).
6. `published_at` is overwritten on every renewal.
7. The test plan is honoured only for `PAYSTACK_TEST_EMAIL`; in test mode you also need `PAYSTACK_*_PLAN_CODE` set to the **test-mode** plan codes (they differ from live ones).

### Paystack test-mode checklist (run on a preview/staging deployment with `sk_test_…`, a staging Supabase project, never the live keys)

Setup: test-mode plans created for Basic, Pro and the ₦500 test plan; their codes in `PAYSTACK_{BASIC,PRO,TEST}_PLAN_CODE`; `PAYSTACK_TEST_EMAIL` = your throwaway user; webhook URL = the preview URL `/api/paystack-webhook`. To send signed events by hand: `sig = HMAC-SHA512(secret_key, raw_body)` in the `x-paystack-signature` header (hex).

| # | Case | How | Expected | Pass? |
|---|---|---|---|---|
| 1 | Signature | POST a valid body with a wrong / missing / truncated signature | 400, no DB change. Valid signature → 200 | |
| 2 | Missing secret | Unset `PAYSTACK_SECRET_KEY` on a scratch preview | 500, no processing | |
| 3 | First payment | Pay Basic with a test card via the app | `subscriptions` row `active`, `expires_at ≈ now+1y`; `users.plan='basic'`; one `payments` row; one "live" email | |
| 4 | Tier from plan code | Send `charge.success` whose `reference`/metadata says "pro" but plan code is Basic | Plan = basic (the client reference is ignored) | |
| 5 | Unknown / missing plan code | `charge.success` with `plan_code` unknown, and one with none | Ignored, 200, no rows written | |
| 6 | Test plan guard | Test plan with another email | Rejected, warning logged | |
| 7 | Repeated event | Replay the same `charge.success` (Paystack dashboard "resend" ×3, plus two concurrent curls) | Exactly one `payments` row; expiry unchanged; no second email. *Concurrent case is the one to watch (gap 3)* | |
| 8 | Amount / currency | `charge.success` with a valid plan code but `amount: 100` and `currency: "USD"` | **Expected to FAIL today (gap 1)**: it grants the plan. Decide whether to add the check before merge | |
| 9 | Upgrade | Basic → Pro charge | Subscription row switches to pro, new 1-year term from now, `users.plan='pro'`, no "live" email | |
| 10 | Renewal | Set `expires_at` to now+10d, send `charge.success` (new reference, same plan) | Expiry = old expiry + 1y | |
| 11 | Early echo | Same, with `expires_at` now+200d | Expiry unchanged | |
| 12 | Cancellation | `subscription.disable` then `subscription.not_renew` | Status `cancelled`; access continues (getUserPlan true; `/api/update` 200) until `expires_at` | |
| 13 | Expiry cron | Set `expires_at` to now−4d (past the 3-day grace); `GET /api/cron/expire-plans` with the cron secret | Subscription `expired`, `users.plan='unpublished'`; a user with a live bootcamp plan or an invite free-Pro is untouched | |
| 14 | Cron auth | Call without / with a wrong secret | 401 | |
| 15 | Refund | Refund the test charge in the dashboard | **Expected: no change (gap 2)**; record the decision | |
| 16 | DB failure | Point the preview at a read-only role, send an event | **Expected: 200 and silent loss (gap 4)**; record the decision | |
| 17 | Basic editing | Basic user PATCHes content via `/api/update`; unpaid user | 200 / 403 | |

Do not merge until 1–7, 9–14 and 17 pass and you have decided on 8, 15, 16. Total cost: test mode, no real money.

## 4. Test layout, `npm run verify`, CI

### Layout

Vitest `projects` (or `--dir`) per folder; no behaviour change, files only move. Imports of `../lib/...` become `../../lib/...`.

| Today | New home | Notes |
|---|---|---|
| `tests/connectors.test.ts` | `tests/unit/connectors.test.ts` | Pure parsing / normalize / document guards |
| `tests/github-connector.test.ts` | `tests/unit/github-connector.test.ts` | Network mocked from fixtures |
| `tests/pii-gateway.test.ts` | `tests/unit/pii-gateway.test.ts` | The repo-wide boundary case ("the real repo is clean") moves to `tests/security/llm-boundary.test.ts` |
| `tests/account-profile.test.ts` | `tests/integration/account-profile.test.ts` | Route handler against the in-memory Supabase fake |
| `tests/no-browser-writes.test.ts` | `tests/security/no-browser-writes.test.ts` | Static scan of the source tree |
| `tests/fixtures/github/` | `tests/fixtures/github/` | Stays; committed, synthetic only |
| (none) | `tests/e2e/` | Reserved. First occupant: Paystack test-mode replay script and a signup→edit smoke against staging. Never in `verify` or CI (needs staging secrets) |
| `scripts/rls-verify.mjs` | stays in `scripts/` | Manual, staging only, never in CI |
| `fixtures/` (root) | stays | Local-only CV corpus, git-ignored (section 6) |
| `bench/**` | stays its own project | Not in `verify`, not in CI |

Planned security tests that slot in without new infrastructure: MCP tests (`tests/security/mcp-*.test.ts`), webhook signature/idempotency (`tests/integration/paystack-webhook.test.ts` with the Supabase fake; this also automates checklist rows 1, 4, 5, 7).

### `npm run verify`

```json
"verify": "npm run typecheck && npm run check:llm && npm test && npm run build"
```

`build` needs placeholder env (on `main`, `/api/cron/expire-plans` creates its Supabase client at module load and `next build` throws "supabaseKey is required" without it; the billing branch moves that into the handler, but placeholders are still the safe choice); put them in `scripts/ci-env.example` and have CI export them. `lint` is excluded: `next lint` is not configured to pass today (*unverified*; run it once before adding it).

### GitHub Actions (draft, not created; pin actions to commit SHAs when written)

```yaml
name: ci
on:
  pull_request:
  push: { branches: [main] }
permissions: { contents: read }
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:   # dummy values only. CI holds NO real secrets.
      NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
      NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder
      SUPABASE_SERVICE_ROLE_KEY: placeholder
      NEXT_PUBLIC_ROOT_DOMAIN: liveportfolio.site
      NEXT_PUBLIC_APP_URL: https://liveportfolio.site
      OPENAI_API_KEY: placeholder
      RESEND_API_KEY: placeholder
      PAYSTACK_SECRET_KEY: placeholder
      CRON_SECRET: placeholder
    steps:
      - uses: actions/checkout@<sha>
        with: { fetch-depth: 0 }          # gitleaks scans history
      - uses: actions/setup-node@<sha>
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run check:llm
      - run: npm test
      - run: npm run build
      - run: npm audit --omit=dev --audit-level=high
      - name: gitleaks (CLI, pinned version, no licence key needed)
        run: |
          curl -sSfL https://github.com/gitleaks/gitleaks/releases/download/v<ver>/gitleaks_<ver>_linux_x64.tar.gz -o gl.tgz
          echo "<sha256>  gl.tgz" | sha256sum -c -
          tar xzf gl.tgz gitleaks && ./gitleaks detect --redact --no-banner
```

Notes: the action `gitleaks/gitleaks-action` needs a licence key on organisation accounts; the CLI above does not. A first run will flag the old cron secret in history; add it (by fingerprint, not value) to `.gitleaksignore` only after confirming it is rotated. `npm audit` may fail on existing advisories; start it as non-blocking, then tighten. Dependabot / deployment is a separate decision (section 0).

### Contradiction: CI and bench secrets

I could not find one sentence that contradicts another. What I did find are two documents that point opposite ways: `CLAUDE.md` lists `OPENAI_API_KEY` (and other keys) as **GitHub Actions secrets** for the old deploy workflow, while `bench/README.md` says bench uses its own low-limit OpenAI project key in `bench/.env.local` and "never the app's key", and says the root `npm ci` never installs it. **Resolution (rule):**
- **CI holds no secrets and makes no network call to any LLM.** Unit/integration tests use fakes and fixtures; `check:llm` is static.
- **Bench stays local**, with its own dedicated key and a spend cap, run by hand; its results are git-ignored. No GitHub secret named for bench is created.
- If a deploy pipeline is ever re-added, its secrets belong to the deploy job only, never to the `verify` job above.
- Update the stale `CLAUDE.md` GitHub-secrets list after the Vercel/VPS decision.

## 5. Merge sequence (proposal)

1. You: staging Supabase project; snapshot queries; paste output → I finalise the rollback.
2. Staging run of the hotfix per the runbook, then production deploy + migration (hotfix is already committed locally on `main`; push is yours).
3. Decide section 0.1 (deploy target) and fix `CLAUDE.md` + runbook text accordingly.
4. Billing: run the checklist; decide rows 8, 15, 16; then merge `fix/billing-entitlements` into `main`.
5. Feat: commit the groups in section 2 on `feat/import-connectors`, reset group A, merge `main` into it (0 conflicts predicted), re-run `verify`, then merge to `main` with `IMPORT_ENABLED` unchanged (off).
6. Cleanup commit: untrack `tsconfig.tsbuildinfo`, regenerate the lockfile once, move tests into the new layout, add `verify` and the workflow.
7. Only then: `feat/mcp-readonly` from the unified `main`.

## 6. Fixtures

State checked: `.gitignore` has `/fixtures/cvs/*` and `!/fixtures/cvs/.gitkeep` (same for `fixtures/baseline/`). `git check-ignore` confirms a `.pdf` in `fixtures/cvs/` is ignored; only `.gitkeep` is tracked. **Four real CVs are in `fixtures/cvs/` right now** (two `.docx`, two `.pdf`; filenames carry personal names, including people other than you). They are not tracked. I did not open them for this plan. Recommend: keep them out of any labelled set unless each person agrees, and use anonymised or synthetic CVs (`bench/synthetic/`) for the committed corpus.

`fixtures/README.md` already exists and says only "do not commit real people's CVs". It would be replaced by this text (draft; a README *inside* `fixtures/cvs/` would be ignored by `/fixtures/cvs/*` unless `!/fixtures/cvs/README.md` is added to `.gitignore`, so I propose keeping it at `fixtures/README.md`):

```md
# fixtures/

## cvs/  (local only, never committed)
- Everything in `cvs/` except `.gitkeep` is git-ignored. Keep it that way: never `git add -f`, never remove the ignore rule.
- Allowed: your own CV; CVs whose owner gave written consent; anonymised or synthetic CVs.
- Not allowed: anyone else's CV without consent; CVs from clients or employers; anything with ID numbers, bank details, or health data.
- Never print, paste, log or screenshot the contents (in terminals, issues, PRs, chats, or to an LLM that isn't the redacting gateway). Scripts report metrics and file ids only.
- Never upload to a third-party service. Delete when the evaluation is done.
- Name files by id (`cv-01.pdf`), not by person.

## baseline/  (local only) snapshot output of `npm run fixtures:snapshot`; same rules.
```

### Hand-labelling format (about 10 CVs)

One label file per CV, next to it and ignored by the same rule: `fixtures/cvs/cv-01.pdf` + `fixtures/cvs/cv-01.label.json`. Labels never contain contact values; they store presence flags and hashes so a diff or log cannot leak PII.

```json
{
  "id": "cv-01",
  "source": "own | consented | synthetic",
  "tags": ["two-column", "scanned", "non-english", "career-gap", "student"],
  "contact": { "email_sha256": "…", "phone_present": true, "github_present": true, "linkedin_present": false },
  "expected": {
    "name_present": true,
    "role": "backend engineer",
    "skills": ["python", "django", "postgresql"],
    "experience": [{ "company": "acme ltd", "title": "software engineer", "start": "2021-03", "end": "present" }],
    "education": [{ "institution": "university of lagos", "level": "bsc" }],
    "projects": [{ "title": "invoice parser" }]
  },
  "must_not": ["invented employers", "skills not in the document"],
  "labelled_by": "initials", "labelled_on": "2026-10-24"
}
```

Scoring (`scripts/fixtures.mjs`, extended later): lowercase and trim; skills = set precision/recall/F1; experience matched on fuzzy company + title, then date accuracy by month; contact = hash equality; "must_not" = count of fabricated items (target 0). Output is numbers per CV id, never text from the CV. Label 10 CVs for diversity (layout, language, seniority, scanned vs text PDF, one with empty sections), 2 of them intentionally hard.

## 7. Open questions

1. Vercel or VPS (section 0.1)?
2. Add amount/currency verification, refund handling and non-silent DB failures to the webhook before merging billing, or merge as is and track them? (Money path; I recommend adding them in a follow-up commit on the billing branch, with tests, before it reaches `main`.)
3. Keep C and E as one commit?
4. OK to delete the four real CVs from `fixtures/cvs/` once synthetic ones exist, or keep local?
