# Seven Pro templates: correctness and redesign plan

Status: **implemented locally, not committed or deployed**, 2026-10-25. Baseline: `dev`, `808555e`. Correctness fixes, all seven redesigned compositions, explicit version switching and regression/browser coverage are implemented. **Release acceptance is not complete:** latest local Lighthouse mobile scores are 76–80 (target 90+); owner visual approval and real-account save/undo checks remain. See [validation and handoff](pro-template-validation.md) for measured results and precise limits. The findings below describe the pre-implementation baseline, not outstanding defects unless noted.

## Scope and decisions

- Redesign the seven Pro templates first. Keep the three free templates, billing, AI generation, account flow and middleware out of scope.
- Keep the existing ten template IDs and 3-free/7-Pro entitlement split from [lib/plans.ts](../lib/plans.ts).
- Fix misleading claims and missing content before visual polish. An attractive screenshot is not proof of a truthful, complete portfolio.
- No new AI calls, inferred qualifications, invented achievements, fake charts or assumed job availability.
- Major visual changes are opt-in for existing portfolios. Small correctness fixes to existing renderers are separate, reviewed changes; do not hide them inside a mass snapshot refresh.

## 1. Findings from code, not screenshots

| Template | Specific issue to address | Proposed visual identity |
|---|---|---|
| Developer | Uses Inter; project cards ignore repository-only links; mobile menu lacks descriptive accessibility state. | Engineering field notes: graphite and paper, numbered technical case studies, Space Grotesk with restrained JetBrains Mono, explicit demo/repository links. Distinguish it from free Bold rather than making another dark sidebar. |
| Designer | Invented Research/Design/Deliver process or skills presented as process; education/certifications/testimonials not rendered; panoramic image crop can conceal work. | Art-directed studio gallery: warm paper, oversized Syne/DM Sans typography, asymmetric image-led work with a strong text-only fallback. |
| Data scientist | Numeric extraction loses units and decimals and adds a plus sign; substring matching can classify Docker/Azure as languages; heading semantics need repair. | Research notebook: IBM Plex, light canvas, numbered analyses, clear methods and full outcome statements. Never invent notebook links or data visualisations. |
| Product manager | About is omitted; first-number extraction produces context-free KPI tiles; each name token is forced onto its own line. | Product decision brief: a strong introduction, generous editorial spacing, problem/approach/outcome case studies, contextual evidence rather than dashboard tiles. |
| Finance | Detached numeric fragments masquerade as metrics; mobile sidebar puts secondary information before selected work; uses Inter. | Investment memorandum: ivory, navy, restrained burgundy, Playfair Display/DM Sans, precise readable case studies and attributed outcomes. |
| Graduate | University employers are inferred as education and filtered from employment; about/certifications omitted; contact copy assumes the person is seeking entry-level work. | Early-career evidence journal: confident introduction, capstone/personal work, real education and work records. Bricolage Grotesque/Hanken Grotesk; professional rather than childish. |
| Cybersecurity | Skills and short uppercase words can be labelled as certifications while explicit certifications are ignored; headline/about omitted; contact text assumes consulting/pentest availability. | Security assurance dossier: charcoal/paper with restrained green, readable evidence-led reports, explicit credentials, technical labels only where useful. No theatrical terminal interface. |

Source components: [components/templates](../components/templates). These directions are proposals, not completed visual assessments.

### Existing tests have a material gap

[tests/templates-matrix.test.ts](../tests/templates-matrix.test.ts) says its long-profile case checks every project, role, degree and certificate, but the assertions only check project titles and company names. It does not prove all fields or credentials survive. Its hostile-link check uses `safeContent`; it is not proof every preview and demo path applies that boundary.

## 2. Phase A — truthfulness and content coverage

Write failing regression tests before corrections:

- An explicit certification must render; SQL, SIEM, AWS or Azure skills must never manufacture a certification.
- Preserve metric meaning: decimals, units, signs, currencies and surrounding explanation. Prefer full outcome text over regex-generated metric tiles. Include `95%`, `1.5M`, currency, negative values and dates in fixtures.
- A university employee remains in experience even when the same institution also appears in education. Never infer a qualification from an employer.
- Assert headline, about, skills, grouped skills, each project field/link, experience bullets, education fields, certificates and testimonials according to an explicit coverage contract.
- Honour both supported education date forms (`year` and historical `period`) without inventing dates.
- No hardcoded personal process, availability or specialist service offer. Use neutral contact wording unless the person supplied the claim.
- Render repository-only projects correctly; audit image and outbound-link handling across public pages, previews, gallery and demos. Preserve the existing safe-URL boundary.
- Hide empty sections and their navigation links; do not hide populated sections to make a layout look cleaner.

Run targeted tests and review corrections separately. Existing markup hashes will intentionally change for some correctness fixes: update only affected, reviewed baselines, not all ten blindly. Keep free-template baselines unchanged.

## 3. Phase B — design and safe rollout foundation

1. Capture reproducible before screenshots using synthetic fixtures at 375, 768 and 1440 pixels. Include 320/360-pixel stress checks, long names, absent photos and long unbroken text.
2. Produce full-page design prototypes in the existing design-review/test-template surface. Review hero, middle and footer, not just the first viewport.
3. Share content preparation, links, credentials and accessibility primitives where useful. Do not force all seven designs into one card grid with different colours.
4. Preserve lazy template loading and self-hosted fonts; no Inter, Arial or Roboto as selected template typography. Respect reduced motion and keep core content visible without animations.
5. Design a validated, explicit per-template presentation-version marker before wiring redesigned components into saved portfolios. Keep existing IDs, plan gates and portfolio content intact.
   - Missing marker selects the existing renderer.
   - A marker must identify the template/version; the free templates' existing `content.layout` must not accidentally opt someone into a Pro redesign.
   - Previewing never writes. Saving the new design requires an explicit owner action and existing authenticated update/validation flow.
   - Offer a return to the previous design without changing content or billing state.
   - Use one renderer-selection rule for server public rendering and client preview/gallery paths; test their parity.
   - Prefer additive presentation metadata in existing JSONB storage, subject to validator/commit-path inspection. No SQL is assumed necessary; any migration would be separately proposed, never run on shared production silently.

Relevant existing boundaries: [lib/blocks/mode.ts](../lib/blocks/mode.ts), [lib/blocks/presets.ts](../lib/blocks/presets.ts), [components/templates/dynamic.ts](../components/templates/dynamic.ts), [app/portfolio/[slug]/page.tsx](../app/portfolio/[slug]/page.tsx). Today Pro always uses legacy rendering, even when free-layout metadata exists.

## 4. Phase C — build in reviewable batches

| Batch | Work | Exit gate |
|---|---|---|
| 1 | Cybersecurity and Data scientist | No false credentials or changed metrics; two distinctly different, complete desktop/mobile designs. |
| 2 | Graduate and Product manager | Full profile coverage, preserved employment, sparse-profile layouts and natural long-name wrapping. |
| 3 | Developer and Finance | Strong project evidence, complete links, clear mobile reading order and accessible navigation. |
| 4 | Designer | Image-led and image-free layouts both convincing; no destructive image cropping or invented process. |

Review screenshots after each batch before applying that direction elsewhere. Each template needs its own composition, hierarchy and spacing—not merely its own accent colour. Reuse components only where it preserves that distinction.

## 5. Acceptance gates for every template

### Content and correctness

- Synthetic full profile, almost-empty profile, non-technical professional, long name/text, hostile input, missing/broken photo and project images, repository-only projects.
- Long-data fixtures at supported input/edit limits (currently advertised as up to 20 imported and 50 edited entries; confirm against validators during implementation).
- Every supplied supported field is visible or reachable through an accessible disclosure. No silent slicing or permanent line-clamping of substantive content.
- No fabricated metrics, credentials, qualifications, employment status or personal process. No empty, unsafe or misleading links.
- One primary name heading; no duplicate name in the top navigation. Navigation only points to sections that exist.

### Visual, accessibility and performance

- Full-page screenshots at 375/768/1440, overflow checks at 320/360 and long-content checks on each design. No sideways scrolling or covered content.
- Keyboard-operable controls, labelled menu toggle with expanded state, visible focus, semantic headings/landmarks, appropriate image alt text, text contrast at least 4.5:1 (3:1 for qualifying large text), usable at 200% zoom and reduced motion.
- Verify real interactions and broken-image fallback in browsers; a static markup test cannot prove these.
- Test Chromium plus Firefox and WebKit where available; report unavailable coverage honestly.
- Target Lighthouse mobile performance 90+ on a production build using representative fixtures. Record measured results and image/fixture conditions rather than promise a score for every possible user upload.

### Integration and release

- Public, private preview, gallery, demo and saved-selection renderer parity.
- Pro selection enforced server-side; free/basic cannot save a Pro template by changing request data.
- Existing portfolios keep their design until opt-in, apart from separately reviewed correctness fixes. Switching design preserves all data and free-layout preferences.
- Run typecheck, LLM-boundary check, all tests and production build; distinguish new results from previous session claims.
- No payment, Resend or production Supabase calls required for synthetic design validation. Use local port 3101; never assume Preview is a sandbox.
- Update screenshots/thumbnails only after approval; update release docs and merge checklist when implementation ships.
- Merge/deploy only after review. Rollback must tolerate stored new-version metadata and fall back safely; never require deleting user content.

## 6. Owner admin configuration (separate from redesign)

[lib/admin/auth.ts](../lib/admin/auth.ts) uses `ADMIN_EMAILS` when nonempty, otherwise `PAYSTACK_TEST_EMAIL`. Admin requests require both a valid signed-in account and a verified email.

- Set `PAYSTACK_TEST_EMAIL` to the owner's sign-in email in the relevant Vercel environments (Preview for dev testing, Production when deployed there).
- Leave `ADMIN_EMAILS` unset if using this fallback; a different nonempty value takes precedence.
- Redeploy the relevant environment after changing environment variables; sign in normally and open `/admin`.
- The deployed revision must contain the admin dashboard. Setting an environment variable alone does not deploy the current dev code to Production.
- No shared admin password or authentication bypass is proposed.

## First implementation deliverable

Delivered: correctness regression tests/fixes, all seven original/redesigned comparison views, and explicit authenticated version saves. No billing redesign, AI-agent feature, live-service test, SQL, commit or deployment was performed. The full implementation record and remaining acceptance work are in [pro-template-validation.md](pro-template-validation.md).