# CV export (PDF and DOCX): plan only

Status: PLAN. Nothing is built, nothing is committed or pushed. Written 2026-11-25 for the owner's review.
Reading of the request: "post" = PDF, "promo" = a launch post for this feature (held until the feature works).

## 0. Four findings that change the brief

1. **There is no "job-application-kit" in the repo.** A search of lib, app, components and docs finds no kit, no ATS rule list and no cover-letter code. The only ATS wording is in marketing copy. So the ATS rules are NOT reusable; section 3 writes them down as the spec, and they should be added to the repo as `lib/cv/ats-rules.md` or a header comment. If the kit lives in another project or chat, paste it and section 3 gets replaced by it.
2. **There is no portfolio-level "hide contact details" setting.** The only privacy flag is `share_contact` on an assistant connection (`mcp_connections`, `lib/mcp/auth.ts`, `visible()` in `lib/mcp/tools.ts`); it hides email, phone and WhatsApp FROM THE ASSISTANT. The public page and the owner's dashboard show whatever the person typed. So "respect the privacy setting" means two different things, handled in section 4.
3. **`CLAUDE.md` says "Resume PDF generation" is in "What Does NOT Exist in v1 (do not build)".** This feature reverses that rule. The owner has to approve the reversal, and that line must be edited in the same change.
4. **Standard PDF fonts cannot print many Nigerian names.** The 14 built-in PDF fonts (Helvetica, Times) have no glyphs for Yoruba letters such as ẹ, ọ, ṣ. The export must embed an ordinary, widely used font (for example Noto Sans or Source Sans, both OFL-licensed) with Latin Extended Additional. "Standard font" in ATS terms means common and embedded, not the PDF built-ins. Without this, names and places would print wrong for the exact audience.

## 1. Where it goes in the dashboard

New card "Your CV" in the share area of `app/dashboard/page.tsx`, directly under the QR and link block (the QR block starts near line 1509; the QR download there is the existing pattern: fetch, blob, anchor download).

```
Your CV                                   (always built from your portfolio)
[ Download PDF ]   [ Download Word (.docx)  Pro ]
[x] Include my email and phone            (checked by default)
Left out of this CV: none   |   Left out: 2 items (shown as a list, with why)
Last built from your portfolio as of 25 Nov 2026
```

- Free plan: the card works on the private portfolio too (a CV does not need a published page).
- The "left out" line comes from the export's own report (section 5), not from a guess.
- No second copy: nothing is stored. Each download is rendered on request from `portfolios.content`.

Files to touch (UI): `app/dashboard/page.tsx`, new `components/dashboard/CvCard.tsx` (keep the 2,000-line page from growing), `messages/en.json` if the dashboard strings are localised.

## 2. Architecture (one source of truth)

```
portfolios.content (jsonb)
  -> lib/blocks/adapt.ts toBlockData()   (same normaliser the public page uses: same caps, https-only links, same ordering)
  -> lib/cv/model.ts   buildCvModel(blockData, { includeContact })  -> CvModel + CvReport
  -> lib/cv/pdf.ts     renderPdf(model)   -> Buffer
  -> lib/cv/docx.ts    renderDocx(model)  -> Buffer
```

- Reuse `toBlockData` so the CV and the page can never disagree about what a project, bullet or award is. The CV only decides layout, never content.
- Pure JS libraries, no headless Chrome: Playwright/Chromium on Vercel serverless is heavy, slow and fragile. Candidates: `@react-pdf/renderer` or `pdfkit` (PDF, real selectable text, embedded TTF) and `docx` (DOCX). Pick one PDF library in the first build step by a 1-hour spike that must pass: Yoruba glyphs, text extraction by `pdf-parse` (already a dependency), cold start under 3 s on Vercel. This is the one real technical risk.
- Node runtime route `GET /api/cv?format=pdf|docx&contact=1`, `Authorization: Bearer` like `/api/score` (the dashboard already uses that pattern), `Content-Disposition: attachment`, `Cache-Control: no-store`.
- No LLM, no cost per export, so no `lib/llm` involvement and `npm run check:llm` is unaffected.
- Rate limit: 20 exports per user per hour (in-memory plus the same approach other routes use).
- Provenance: put "Generated from liveportfolio.site/<name> on <date>" in the PDF/DOCX metadata (not in the visible text, which would be ATS noise). Optional small footer for the free plan is a gating decision (section 7).

## 3. ATS-safe layout spec (replaces the missing kit)

- One column, top to bottom, A4 and US Letter selectable (default A4 for the Nigerian market; the page-size choice is a later nicety).
- Order: name, headline/role, contact line, Summary, Skills, Experience, Projects, Education, Certifications, Awards, Links.
- Plain section headings in the words ATS parsers expect: "Experience", "Education", "Skills", "Projects", "Certifications", "Awards". No clever headings.
- Embedded Noto Sans (or chosen font), 10 to 11 pt body, no text in images, no icons, no tables, no text boxes, no header/footer carrying content, real bullets (a real list in DOCX, a `•` glyph in text order in the PDF).
- Dates in one consistent format as stored (`period` is free text; do not reparse).
- Links printed as plain URLs, not only as link annotations.
- Page breaks never split a bullet; an experience entry may split between pages.
- No photo (ATS and bias reasons). Documented as a deliberate choice.

## 4. Contact details and privacy

The person downloading their own CV is the owner, so default is to include email, phone, location and links (a CV without contact details is useless). Two controls:

1. Dashboard checkbox "Include my email and phone" (default on) sets `contact=1|0` for that download. Not persisted in v1 (no new column).
2. MCP path (section 6): if the assistant connection has `share_contact = false`, the generated file excludes email, phone and WhatsApp by default, and the download page shows a one-click "Add my contact details" that only the logged-in owner can use. The assistant never sees file contents, only a link, but the link may be opened by anyone who has it, so the safe default wins.

A genuine per-portfolio "hide contact on the public page" setting does not exist and is NOT part of this plan; if wanted it is a separate feature (migration + page + dashboard + MCP).

## 5. Completeness invariant (test and runtime report)

`buildCvModel` returns `{ model, report }` where `report.omitted` lists, with a reason, anything not in the file. Reasons are a closed set: `contact_excluded`, `link_not_https`, `over_cap` (the adapter's 50-item cap), `empty_after_trim`. Nothing else may drop silently.

New `tests/cv-export.test.ts` (same shape as `display-all.test.ts`):
1. Fixture portfolios (the sample set in `lib/blocks/sample.ts` plus a maximal one: 20 awards, long bullets at the character caps, 30 skills, Yoruba names).
2. For each: render PDF and extract text with `pdf-parse`; unzip the DOCX and read `word/document.xml`. Assert every experience bullet, every project title/problem/solution/outcome and stack item, every award title and issuer, every education and certification line and every skill appears in the text, OR is listed in `report.omitted` with an allowed reason. Order must match the stored order.
3. Assert `includeContact=false` removes email, phone, WhatsApp from BOTH the text and the file metadata.
4. Assert the file contains no table, drawing or image parts (DOCX) and no embedded images (PDF).
5. Assert PDF text-extraction order equals reading order (single column).
6. Assert PDF and DOCX report the same omitted list.
7. Feature test: `FEATURES` entries for the CV features appear in `tests/plans.test.ts` rules (an 'available' feature needs a test that proves it).

## 6. MCP tool `portfolio_export_cv`

- Input: `{ format: 'pdf' | 'docx' }` (no contact argument: contact follows the connection's `share_contact`, and the owner can add it on the download page).
- Output: `{ download_url, expires_in_seconds, format, left_out: [...], contact_details_included }`. Tool replies never mention plans, prices or upgrades (the `NO_PRICING` rule), so a DOCX refusal returns a neutral error code `format_not_available`, and the assistant is told to offer PDF.
- Link design: new table `mcp_downloads` (id, user_id, token_hash, format, include_contact, expires_at 10 minutes, used_at), single use, same pattern as `mcp_uploads` (`newUploadToken`, `hashToken` in `lib/mcp/images`). Route `GET /api/cv/download?t=...` hashes the token, checks expiry and unused, streams the file, sets `used_at`. No session needed, so it works from a chat link. Migration `supabase/manual/<ts>_mcp_downloads.sql` MUST enable RLS and revoke anon/authenticated in the same file (CLAUDE.md rule 4b). Run by hand by the owner; I will not run SQL.
- Middleware: `/api/cv/download` is an `/api` route, so the assistant-token isolation rule still applies (assistant OAuth tokens are refused on `/api/*`; the link carries its own one-time token, not the assistant token).
- Counts and versions this touches:
  - Tool count 59 -> 60 (TOOLS array in `lib/mcp/tools.ts`; `tests/mcp-server.test.ts` compares against `TOOLS.length`, so it follows automatically; `tests/mcp-matrix.test.ts` and `docs/mcp-coverage-matrix.md` need a cell).
  - Server version: `serverInfo.version` is still '1.0.0' in `lib/mcp/rpc.ts`; the public registry entry (`liveportfolio-mcp/server.json`) is 1.1.0. Additive tool = minor bump: registry 1.2.0, README, `docs/tools.md`, CHANGELOG. Republish needs the owner's GitHub device login, as before.
  - It is read-only and non-destructive: no approval flow needed.

## 7. Gating options

| Option | Free | Basic | Pro | For | Against |
|---|---|---|---|---|---|
| A (suggested by the reviewer) | PDF | PDF | PDF + DOCX | PDF gives everyone a reason to complete the portfolio and share it; DOCX is the "edit per application" job, which is worth paying for | A free CV tool is a generic commodity, so it does little for conversion by itself |
| B | PDF with a one-line "Built on liveportfolio.site/name" text footer | PDF clean | PDF + DOCX clean | Free exports carry marketing; paying removes it, matching the existing "no badge" Pro feature | A footer on a CV is a visible flaw to the recruiter; people will resent it |
| C | none | PDF | PDF + DOCX | Strongest upgrade pressure | Kills the "gives every user a reason to complete the portfolio" effect; Basic already costs ₦15,000 |
| D | PDF | PDF | PDF + DOCX + MCP export | The assistant path is the differentiator, so Pro-only is consistent with `mcp` already being Pro | Assistant users on Basic cannot export |

Recommendation: A, with MCP export following the same plan rule as the format (PDF for everyone with MCP access, which today is Pro-only anyway, so D is automatic). Implementation: add FEATURES entries `cv_pdf` (free, basic, pro) and `cv_docx` (pro) in `lib/plans.ts`, enforced server-side through `entitlements()`, never only in the UI. This is a bet, not tested.

## 8. Rollout order and what must not be said early

1. Build behind no flag but unlinked: the route and the dashboard card, tested by test account, ATS check with a real parser or two (upload the PDF to a free ATS checker and a Workday-style parse).
2. MCP tool and migration (owner runs SQL), then registry 1.2.0.
3. Landing page and every page that lists features, ONLY after the export is verified end to end on production with a real account.
4. Promo post last. Nothing is announced before it works.

## 9. Landing and docs pages that should mention it (after step 3)

- `lib/plans.ts` FEATURES (drives the pricing and upgrade lists, so one edit propagates)
- `app/page.tsx` (landing), `app/upgrade` pricing, `app/portfolio-builder/page.tsx`, `app/free-portfolio-website/page.tsx`, `app/cv-to-portfolio/page.tsx` (the CV-in direction gets a CV-out line), `app/what-is-a-portfolio/page.tsx`, `app/blog/cv-vs-portfolio-nigeria/page.tsx`
- `app/docs/mcp/page.tsx`, `lib/docs/pages.ts`, `lib/docs/connect.ts`, `llms.txt` and `openapi.json` if they list tools
- `app/privacy/page.tsx` (state that CV files are generated on request and not stored; the download-link table stores a token hash and timestamps only) and `app/terms/page.tsx` if wording changes
- `docs/LIVE-STATUS.md`, `docs/mcp-coverage-matrix.md`, `CLAUDE.md` ("What does NOT exist" line and the tool/feature lists), public `liveportfolio-mcp` README, docs/tools.md, CHANGELOG
- Do NOT touch `lib/email-drip.ts` copy until the feature is live.

## 10. Risks and open questions for the owner

1. Approve reversing the "no resume PDF" rule in CLAUDE.md?
2. Is the job-application-kit somewhere I should read, or write the ATS rules fresh (section 3)?
3. Gating: option A, B, C or D?
4. Include a photo? Plan says no.
5. Font choice (Noto Sans or Source Sans) and A4 as the default.
6. Does the DOCX need Word-style editing affordances (named styles) or just clean paragraphs and real lists? Plan: named styles (Heading 1/2, List Bullet), so it edits well.
7. Effort estimate: PDF + dashboard + tests about 1.5 days; DOCX about 0.5 day; MCP tool, table and docs about 1 day; pages and registry about 0.5 day.
