# Import / portfolio hardening — PROPOSALS (nothing here is applied)

Evidence lives in `bench/` (run `npm --prefix bench test`, `npm --prefix bench run proposals`, `npm --prefix bench run study:pdf`, `npm --prefix bench run probe:zipbomb`). Prototypes are in `bench/proposals/`; tests are described per item. Ordered by severity.

## 1. [HIGH] Stored XSS via JSON-LD on public portfolios

`app/portfolio/[slug]/page.tsx:228` renders `JSON.stringify(personSchema)` into a `<script type="application/ld+json">` with `dangerouslySetInnerHTML`. `personSchema` is built from user content (`name`, `role`, `headline`, `location`, `email`). `JSON.stringify` does not escape `<`, so `</script><script>…` breaks out. Reproduced with `react-dom/server` (`bench/tests/xss-audit.test.ts`). Values reach storage unsanitised through `/api/update` (key allow-list only, no value sanitiser) and AI output (`headline`, `about`, `seo_*`) is stored as returned. Because middleware serves `/{slug}` on the **main origin**, the injected script runs on `liveportfolio.site` itself (same origin as the dashboard and the Supabase session in `localStorage`).

Fix (≈6 lines): escape `<`, `>`, `&`, U+2028/9 as `\uXXXX` when serialising JSON-LD (`safeJsonLd` in the test). Also: validate/strip tags on `/api/update` string values (reuse `stripHtml`), and cap lengths. Tests: the existing "VULNERABLE" test flips to assert a single `<script>`; add a test per user-controlled field; add `/api/update` tests posting `</script>` payloads.

Related, lower severity: templates render `href={content.github_url | linkedin_url | project.url}` unchecked. React 19.2 blocks `javascript:` at render time, but `data:`, `vbscript:`, `file:` pass. Fix: allow only `http(s)` (reuse `cleanUrl` from `lib/connectors/normalize.ts`) in `/api/update`, `/api/generate` and at render time.

## 2. [HIGH] DOCX zip-bomb → memory exhaustion (DoS)

`mammoth.extractRawText` inflates `word/document.xml` fully. Probe (`bench/robustness-probe.cjs`): a **300 KB** DOCX inflated to 300 MB → **950 MB RSS** in 1.5 s. The 5 MB upload cap allows ratios of ~1000:1, i.e. gigabytes — beyond the 2 GB VPS (OOM history). `/api/parse-cv`'s limiter is in-memory and keyed on a spoofable `x-forwarded-for`, so it is not a barrier.

Fix: before extraction, `JSZip.loadAsync(buffer)` (reads only the central directory: 2 ms, 0 MB measured) and reject if `word/document.xml` declared size > 5 MB or the sum > 20 MB or entries > 200. Declared sizes can lie, so also cap during inflation (extract the XML ourselves via a counting stream, or run mammoth in a child process/worker with a memory limit). Tests: bomb at 6/50/300 MB declared; a bomb with a falsified size header; 5 MB legit DOCX still passes.

## 3. [MEDIUM] No timeout on the OpenAI call

`callLLM` has no deadline. A stalled upstream holds the request (and the import UI spinner) for the SDK default (10 min, with retries). Test `KNOWN GAP — an upstream that never answers…` documents it. Fix: `AbortSignal.timeout(20_000)` and `maxRetries: 1` on the client, map to `upstream_unavailable` (502) with a "try again / fill manually" message. Test: mock a hanging call and assert rejection within the budget.

## 4. [MEDIUM] Replace `pdf-parse@1.1.1` (pdf.js 1.10)

See `bench/pdf-study`. On synthetic PDFs pdf-parse failed **99/200** parses at every concurrency level with "bad XRef entry", and returned the *previous* document's text for three consecutive hand-built PDFs; `pdfjs-dist` and `unpdf` had **0 failures in 2,400 parses** (200 × concurrency 1/4/8 × synthetic/real, per library ×2) at comparable speed (real CVs ≈20–27 ms/parse vs pdf-parse ≈17–19; small synthetic files 4–5 ms vs 1.4 ms because pdf-parse mostly failed early) and +30–120 MB peak RSS. On the four real CVs pdf-parse also had 0 failures, so the production exposure may be low — but a silent stale-text result would be a cross-user data leak, and I could not isolate the cause. Page-render errors are also swallowed to `""` inside pdf-parse. Proposal: use `unpdf` (MIT, serverless pdf.js build, ESM). Tests: the 200-parse matrix as a regression test; a content-correctness check (text belongs to *this* file) over 200 mixed documents.

## 5. Contact-field extraction (email, LinkedIn, phone)

Measured on 144 synthetic documents (44 easy + 100 hard), `npm --prefix bench run proposals`:

| | current | proposal |
|---|---|---|
| Email = candidate's (first match vs scored selection) | 133/144 | **142/144** |
| Injection-before-name hijacked the email | 9/10 | **0/10** |
| LinkedIn handle captured, PDFs | 44/76 | **70/76** with URL de-wrap |
| GitHub handle captured | 139/144 | **144/144** |
| Phone, independent library-generated formats, `+` prefix | 61/64 | libphonenumber-js **64/64** |
| Phone, national formats (country known) | 6/48 | libphonenumber-js **48/48** |
| Nigerian `(0803) 555-0142`, `+234 (0) 803…` | 0/4 | proposed regex **4/4**, libphonenumber-js **4/4** |
| False positives on 30 numeric non-phone strings | 0 | 0 |

- **Email selection** (`bench/proposals/email-select.ts`): score by position in the document, neighbours (phone/LinkedIn/GitHub), name match; penalise referee sections, hand-off phrases ("contact HR at…") and injection phrases **within the same/adjacent line** (a ±200-char window poisoned the real email — first attempt). Return provenance and `ambiguous`; when ambiguous or negative, leave the field empty and ask the user. The weights were tuned after seeing these failures, so re-measure on the held-out *test* split before trusting the 98.6%. Remaining misses are emails wrapped mid-TLD in narrow sidebars (`…@yahoo.co` / `m`).
- **URL de-wrap** (`bench/proposals/dewrap.ts`): join a line ending in a URL-looking token on `- / _ . %` with the next fragment. Narrow by design; ordinary hyphenated prose is untouched (tested). 6/76 PDFs still fail (wrap without a break character).
- **Phones**: `libphonenumber-js` — README verified: `findPhoneNumbersInText(text, defaultCountry)` returns `{number, startsAt, endsAt}` and is a port of Google's `PhoneNumberMatcher`. MIT, 12 MB on disk, ≈80 kB runtime metadata ("min"), 0.25 ms per CV text. National formats need the right default country (the app has the form's location and IPinfo country; fall back to NG). Recommended: run it and keep the regex as a union backstop. Adds one production dependency.
- Tests to add when built: the independent-format matrix above (generated from `libphonenumber-js` examples, not hand-written), the 30-string false-positive list, referee-first and injection-first documents, and a French/Nigerian-conventions document.

## 6. Smaller observations

- Scanned PDFs → `no_text` with an actionable message (tested); encrypted PDFs → `parse_failed` with a password hint (tested). Neither calls the model.
- DOCX headers/footers are dropped by mammoth (realistic; PDFs repeat them per page).
- Upstream failures (network, 429, refusal, schema mismatch) all surface as the generic "could not read that document" — correct for privacy, but a 429 from OpenAI is indistinguishable from a bad CV for the user.
- `x-forwarded-for` trust is unchanged since the import round (see `docs/import-connectors.md`).
