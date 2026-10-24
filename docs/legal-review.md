# Claims for a lawyer to check (privacy policy and consent banner)

Status: **draft, not reviewed by a lawyer.** `app/privacy/page.tsx` carries a LEGAL REVIEW REQUIRED comment. Everything below is what the code does (verified) next to what the text asserts (not verified as law).

## What the code does (verified)
- Google Analytics 4 is the only third-party analytics. It loads only after an explicit "Accept", never on a person's own portfolio (subdomain or `/portfolio/` path), with `anonymize_ip`. "Reject" and "no decision" load nothing. The choice is stored in `localStorage` (`lp_consent`) and can be changed from "Cookie settings" (footer, and the policy). The Meta Pixel was removed.
- The banner appears only when a GA id is configured, so a deployment without analytics asks nothing.
- Import sends CV text to OpenAI with e-mail, phone, URLs and (when known) the name replaced by placeholders; employers, places, dates and skills go as written. Generation sends name, role, location, GitHub and LinkedIn links, bio, skills, certifications, projects, experience and education as typed, never the e-mail. The career score sends portfolio text with the name replaced.
- Published-portfolio views: the visitor's raw IP address goes to IPinfo (server side) for country and organisation; only a 16-character hash of the IP is stored.
- `api.qrserver.com` receives the portfolio URL and the loading browser's IP when a QR image loads.

## Statements to verify (unverified)
1. Whether opt-in consent for GA4 is required in each target region, and whether opt-in everywhere is the right default.
2. Whether the visitor-IP lookup on published portfolios (IPinfo) needs its own notice or a legal basis other than consent, given that visitors never see our banner there.
3. "Strictly necessary" status of the sign-in cookie and the stored consent record.
4. The data-location statement (Supabase EU, Ireland) and the retention statements (account deleted within 14 days; payment records 7 years).
5. The OpenAI statement that API data is not used for training, and whether sending names, bios and project text as written needs more than the current disclosure.
6. Whether a data-processing agreement is in place with each provider listed (Supabase, Vercel, Resend, Paystack, OpenAI, IPinfo, Cloudflare).
7. Cross-border transfer wording (Nigeria, EU, US providers).
8. Whether the hashed IP (SHA-256, truncated) counts as personal data.
