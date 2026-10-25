# Pro templates: implementation and validation

2026-10-25. Local uncommitted work on `dev`, based on `808555e`. **Not a statement that this code is live or that the full product is launch-ready.**

## Delivered

### Correctness — original and redesigned Pro templates

- Removed certification inference from skills; only explicit certificates are presented as certificates.
- Removed first-number KPI extraction and count-up conversions. Full project outcome wording, signs, currency, decimals and units remain intact.
- University employment is never transformed into education or filtered out.
- Render headline, about, skills narrative, grouped and standalone skills, project fields and both project links, experience bullets, education (including historical `period` dates), actual certificates and all supplied testimonials.
- Removed invented personal process, job availability and specialist-service offers.
- Restored Finance project images and repository-only project links across the templates.
- Added semantic headings, conditional navigation, empty-contact guards, reduced-motion handling and visible content without scroll-reveal animations in original Pro designs.
- The original test matrix now really asserts degree/institution/certificate preservation, not just project titles and company names. New regressions assert individual fields and 50-entry collections.
- Only the seven Pro baseline hashes were updated for these intentional corrections. **All three free-template markup hashes remain unchanged.**

### Seven redesigned compositions

Separate original and redesigned rendering; existing template IDs and plan definitions are unchanged.

| Template | Implemented composition |
|---|---|
| Developer | Graphite field-note rail and numbered build dossiers |
| Designer | Warm studio gallery with staggered image compositions and image-free fallback |
| Data scientist | Light research notebook with margin labels and full result statements |
| Product manager | Oversized editorial introduction and three-column decision briefs on desktop |
| Finance | Centred serif masthead and restrained report columns |
| Graduate | Warm evidence journal, project cards, explicit education/work records |
| Cybersecurity | Dark assurance dossier, case reports and an explicit credential panel |

Typography uses existing self-hosted font assets. Graduate uses Space Grotesk/DM Sans rather than adding the proposed Bricolage/Hanken assets. No selected Pro typography uses Inter, Arial or Roboto. Content rendering is shared, but composition, hierarchy, section order and styling differ. The public redesigned body is server-rendered; only menu/image interactions require hydration. Client previews retain lazy loading.

### Saving and rollback

- Sparse `content.pro_designs` metadata, e.g. `{ "developer": 2 }`, opts into a named version. Missing/unknown entries fall back to the original renderer. Free `content.layout` never opts a Pro portfolio in.
- Strict validation for both whole-content saves and `set_pro_design` operations. Unknown/free IDs and unsupported versions are rejected on writes; stored reads are tolerant.
- Only Pro may newly enable a redesigned Pro template, including inactive-template markers. Lapsed users may retain or remove existing choices. History restoration enforces the same policy.
- Dashboard: choose a Pro template → **Design version** → preview original/redesigned → **Save this design**. Preview state is separate from editable/saved content. This explicit save changes only template/version, not unsaved words.
- The same selection rule is used by public rendering, client registry, previews and demos. The public page still applies plan fallback before version selection.
- Generation discards model-supplied presentation markers. This is the only generation change; the once-only guard and model call remain unchanged.
- No migration is needed: metadata uses existing JSONB and the existing revision pipeline. An older deployment ignores this metadata; it must not be removed from user content to roll back.

### Related editor correctness

- Certification controls now edit a list, rather than storing a string that makes saves fail.
- Removing a skill removes it from both standalone and grouped representations, including group-only skills.
- Explicit empty project links/images are actually removed by typed update operations; omission still preserves them.
- Dashboard saves send the loaded `expected_edit_count`. Stale writes return 409 before writes/history, in addition to the server compare-and-set. Older clients without that optional precondition remain backward compatible and do not gain this stale-tab protection.
- Image updates do not save all unrelated content. Version saves use targeted operations. Saved revision counters update after edits and restores, and undo resets the version-preview state.

## Validation actually run

| Check | Result |
|---|---|
| TypeScript | Passed |
| LLM boundary | Passed; no source allowlist expansion. Generated review output is excluded like `.next`, with its own regression test |
| Vitest | **1,196 passed in 45 files** |
| Production build | Passed using isolated `.next-template-review` output and dummy service configuration |
| Playwright | **63 passed**: 21 each on Chromium, Firefox and WebKit |
| Responsive checks | No horizontal overflow in tested redesigned fixtures at 320, 360, 375, 768 and 1440px |
| Accessibility | No axe WCAG 2 A/AA + 2.1 AA violations within `.pro-page` for the seven representative redesigned profiles on each engine; keyboard menu checks pass |
| Stress cases | Sparse, chef/no social links, long strings, hostile values, 50 projects/jobs/degrees/certificates/references, missing images |
| Version UI | Write-free preview, explicit local selection/reversion, server/client renderer parity |
| Public page/API | Fake-service tests cover actual public-page plan fallback, both save shapes, unauthorized opt-ins, stale-save rejection, revisions and generation marker stripping |
| Production dependency audit | `npm audit --omit=dev`: **0 vulnerabilities** |
| Full dependency audit | **9 development-tree advisories** (6 moderate, 1 high, 2 critical), in Vitest/Vite and related tooling/Tailwind dependencies; not automatically upgraded in this template task |

Full-page screenshots at 375/768/1440 are generated under ignored `test-results/`. Screenshots across all seven compositions were visually inspected, in addition to automated checks. They are comparison artifacts, not approved golden screenshot baselines. CSS 200% zoom/reflow was tested; this is not hardware iPhone/Safari or browser-UI zoom certification.

Browser testing found and fixed a real pre-hydration image failure: `onError` alone misses an image that has already failed. The image component checks `complete` and `naturalWidth` when hydrated as well.

## Performance: target NOT met

Latest single-run Lighthouse mobile measurements on the isolated production build, default Lighthouse mobile throttling, local Windows machine. Engineer fixture except Finance (finance fixture) and Designer (synthetic SVG artwork). The measured route is the full design-review page, which also includes review/gallery tooling; these are **not measurements of live published customer pages**.

| Template | Performance / 100 | LCP | TBT | CLS |
|---|---:|---:|---:|---:|
| Developer | 78 | 3.4s | 500ms | 0.001 |
| Designer | 80 | 3.4s | 440ms | 0.042 |
| Data scientist | 76 | 3.5s | 550ms | 0 |
| Product manager | 78 | 3.4s | 520ms | 0 |
| Finance | 76 | 3.4s | 600ms | 0.004 |
| Graduate | 77 | 3.3s | 570ms | 0.001 |
| Cybersecurity | 80 | 3.3s | 460ms | 0.007 |

An earlier run ranged from 68–87; moving the public portfolio body out of the client component did not establish 90+. Do not cherry-pick a score or claim that target passed. Main-thread script work and font/content loading need further profiling of the actual public route, isolated from review tooling, followed by repeat measurements. Machine contention also affects single runs.

## Local review and repeatability

- Normal app configuration remains unchanged. A concurrent development server on port 3101 repeatedly interfered with `.next` builds during this session. Validation used `NEXT_BUILD_DIR=.next-template-review` and temporary `TEMPLATE_REVIEW_URL=http://localhost:3102`, not port 3000.
- These are optional **local validation configuration**, not product rollout flags. Do not set them on Vercel for this release.
- The VS Code task **Preview synthetic template review** starts that isolated production output with dummy service credentials. Build that output first with the same configuration; test commands use `npm run test:browser` and the chosen local `TEMPLATE_REVIEW_URL`.
- `/design-review` lists synthetic original/redesigned comparisons. Example paths: `/design-review?p=engineer&t=cybersecurity&v=2`, `/design-review?p=finance&t=finance&v=2`, `/design-review?p=artwork&t=designer&v=2`, `/design-review?p=engineer&t=developer&picker=1`.
- `picker=1` saves only to local component state. It cannot write an account. The browser suite blocks API calls and requests outside the local origin. Real API behavior is separately covered with fake services.
- The temporary validation servers were stopped. No real Supabase, Paystack, Resend or LLM end-to-end flow was run; no SQL, commit, push or deployment was made.

## Remaining release acceptance

1. Meet or explicitly revise the 90+ mobile performance target after profiling the actual public renderer and repeating measurements.
2. Owner visual approval of all seven designs, including image-free and sparse cases; then update any marketing thumbnails deliberately.
3. On an owner-controlled test account, verify save → reload → public page → undo with the actual Supabase/revision table. Preview shares production services: do not treat it as a sandbox.
4. Verify `PAYSTACK_TEST_EMAIL` admin access after the owner sets it in Vercel and redeploys (verified account required; nonempty `ADMIN_EMAILS` takes precedence).
5. Keep the existing billing/live-payment checklist separate. This work does not prove those flows.