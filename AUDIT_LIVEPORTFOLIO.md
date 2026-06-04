# PROMPT: Audit LivePortfolio

Paste into Claude Code with ADMIN + the liveportfolio repo open in the workspace.
This is a pre-filled version of ADMIN/prompts/AUDIT_ONE_PRODUCT.md for LivePortfolio.

---

## Product context (pre-filled — verify against code)

- **Product id:** liveportfolio *(in ADMIN/registry/products.json)*
- **Name:** LivePortfolio
- **Domain / URL:** liveportfolio.site · subdomains at slug.liveportfolio.site
- **Status:** Live (accepting payment)
- **Stack:** Next.js 15, TypeScript, Tailwind, Supabase (Postgres + Auth + Storage),
  OpenAI GPT-4o-mini (single generation call), Lemon Squeezy (payments), Resend
  (email), Playwright (screenshot pipeline), Nginx + Hetzner VPS, Cloudflare (SSL/CDN)
- **Pricing:** $9 Launch (one-time) · $19 Professional (one-time)
- **Data collected:** account email, name, role, bio, location, GitHub/LinkedIn URLs,
  uploaded CV content (PDF), portfolio content (projects, experience, skills),
  profile photo, usage analytics (view_count, portfolio views), email subscribers
- **Third-party processors:** Supabase, OpenAI, Lemon Squeezy, Resend, Cloudflare
- **Required footer:** `© 2026 Ecotronics Enterprise · liveportfolio.site`
- **Known open items (from registry):**
  - Contact email is personal Gmail, not support@ecotronicsenterprise.com
  - FAQ uses "get hired faster" language — soften per CLAIMS standard
  - Funnel instrumentation not fully verified
  - Payment_succeeded must fire from Paystack webhook (not client redirect)
  - Privacy Policy may not disclose analytics collection

---

```
You are auditing the LivePortfolio product repo for Ecotronics Enterprise.
ADMIN is the source of truth and is READ-ONLY: do NOT edit any files. Report
findings and propose diffs only — the founder applies changes manually.

Product: LivePortfolio
Repo dir: liveportfolio/

Steps:

1. Read ADMIN/registry/company.json, ADMIN/registry/products.json (entry id:
   liveportfolio), and ADMIN/standards/ (BRAND, LEGAL, CLAIMS, SECURITY).
   These override anything in this repo.

2. Audit the liveportfolio repo against all four standards:

   A. BRAND
      - Is the legal name "Ecotronics Enterprise" used on Terms, Privacy, and
        any legal/financial page? (Not just "LivePortfolio".)
      - Is the footer on every page exactly:
        © 2026 Ecotronics Enterprise · liveportfolio.site
      - Is there a reachable "a product of Ecotronics" link to
        ecotronicsenterprise.com on the product (landing page or footer)?
      - Does any page use invented entity names ("LivePortfolio Ltd", etc.)?
      - Does positioning avoid the banned language from the PRD: "AI portfolio
        builder", "portfolio generator", "portfolio tool/platform/maker"?

   B. CLAIMS
      - Scan all UI copy, landing page, FAQ, email templates, and marketing text.
      - Priority flag: "get hired faster" — this is a known open item. Find every
        instance. Rewrite to: "helps you look credible online" / "your professional
        presence in minutes" or similar approved tagline.
      - Flag any other guaranteed-outcome language: "get hired", "land the
        interview", "guaranteed job", "employers will notice".
      - Flag implied affiliation/endorsement: "powered by OpenAI partnership",
        "recommended by recruiters" without basis.
      - Approved taglines (from PRD): "The fastest way to look hireable online."
        / "Your professional presence in 5 minutes." / "From bootcamp to
        professional portfolio tonight." / "Paste your info. Go live in minutes."
      - Provide a corrected honest rewrite for every flagged instance.

   C. LEGAL
      - Do Terms of Service and Privacy Policy exist, linked in the footer,
        and reachable at /terms and /privacy?
      - Terms must: name "Ecotronics Enterprise" as the legal entity (not just
        "LivePortfolio"), state the product is a software tool NOT a recruiter
        or employment service, include a refund policy (7-day per PRD FAQ),
        limitation of liability, acceptable-use, governing law (Nigeria).
      - Privacy Policy must accurately disclose:
        * Data collected: account email, name, role, bio, location, GitHub/
          LinkedIn URLs, uploaded CV content (PDF), portfolio content, profile
          photo, usage analytics (view counts), email subscriber data
        * Where stored: Supabase (named explicitly)
        * Third-party processors: OpenAI (AI generation), Lemon Squeezy
          (payments), Resend (email), Cloudflare (CDN/SSL) — each must be named
        * Data retention and how users request deletion/export
        * Applicability of NDPR / NDPA (Nigeria)
        * Contact: support@ecotronicsenterprise.com
      - Check: does the Privacy Policy mention analytics collection
        (view_count, portfolio_viewed events)? Known open item — flag if missing.
      - Check: is the contact email on any page the personal Gmail
        (ecotronics.enterprise@gmail.com or similar)? Must be
        support@ecotronicsenterprise.com. Known open item.

   D. DATA SOURCING
      - LivePortfolio does not ingest third-party job data; skip this section
        unless you find any third-party data ingestion in the code.

   E. SECURITY — Per ADMIN/standards/SECURITY.md:
      - Scan for any secrets, API keys, or tokens committed to the repo.
      - Check .gitignore — is .env.local (or .env) properly ignored?
      - Confirm SUPABASE_SERVICE_ROLE_KEY and OPENAI_API_KEY are server-side
        only (no NEXT_PUBLIC_ prefix, never in client bundle).
      - Confirm LEMON_SQUEEZY_WEBHOOK_SECRET is used for HMAC verification
        on /api/webhook — and that the endpoint rejects requests with invalid
        signatures.
      - Check /api/generate: is it auth-protected (Supabase JWT required)?
        Is the 1-per-user-account DB check enforced?
      - Check /api/update (portfolio edits): does RLS enforce own-row only?
      - Check /api/webhook: is there an idempotency check on ls_order_id to
        prevent double-processing?
      - Check /api/screenshot: is it internal-only (not publicly callable)?
      - Check Supabase Storage: are profile photos and OG images in a bucket
        with appropriate access (public for portfolio pages, not for raw uploads)?
      - Flag any endpoint that mutates data or triggers paid AI/payment calls
        but lacks authentication.

   F. FUNNEL INSTRUMENTATION — Priority check (known open item)
      - Per ADMIN/modules/traction/INSTRUMENTATION.md, these events must fire:
        visit_landing, create_started, preview_generated, publish_initiated,
        payment_succeeded, portfolio_viewed, dashboard_return.
      - For each event: does it exist in the code? Does it fire at the right
        point in the flow?
      - CRITICAL: payment_succeeded must be triggered by the Lemon Squeezy
        webhook (/api/webhook), NOT by a client-side redirect after payment.
        Client redirects are unreliable. Confirm this is the case.
      - Are traffic source / UTM params captured on visit_landing?
      - Flag any missing or misplaced event as High severity (blocks traction
        measurement).

   G. FAQ HONESTY
      - Cross-check every FAQ answer against what the code actually does.
      - PRD FAQ: "Can I preview before paying?" (yes), "Is hosting permanent?"
        (yes), "Can I edit?" (yes — dashboard), "Custom domain?" (Professional
        only), "Refund?" (7-day), "Who is this for?" (tech + creative professionals).
      - Does the FAQ match these answers in the code? Flag any answer that
        describes a feature that doesn't exist or works differently.

3. Registry drift check
   - Compare what you find in the code against ADMIN/registry/products.json
     entry for liveportfolio.
   - Specifically: are data_collected and third_party_processors accurate?
     Does the code reveal any processors or data types not listed?
   - Propose the corrected products.json fields (do not write the file).

Output:
- A prioritised table: Severity (Blocker | High | Medium | Low) | Area (Brand /
  Claims / Legal / Security / Funnel / FAQ / Registry) | Location (file:line or
  page) | Issue | Recommended fix.
- For every Blocker and High item: the corrected copy or config as a ready-to-
  paste diff (file path + before / after), so the founder can apply it manually.
- A "registry drift" section: proposed corrections to the products.json entry.
- A "funnel status" section: one row per instrumentation event — Present /
  Missing / Misplaced — so the traction sprint can start on solid ground.

Do not modify any files. This is a report-only audit.
```
