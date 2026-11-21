# Can an assistant build a portfolio from scratch? Audit and plan (2026-11-21, nothing built)

Read from the code: `app/create/*`, `lib/onboarding/*`, `lib/connectors/types.ts` (ImportDraft), `app/api/generate`, `lib/portfolio/ops.ts` (CONTENT_KEYS), `lib/mcp/*`.

## How a person gets a portfolio today
account (email code or Google) -> import (CV, pasted text or GitHub) -> review the draft -> address (the slug) -> generate (ONE AI call writes the copy and creates the `portfolios` row) -> preview -> payment publishes.
The onboarding fields are: name, role, bio, location, email, GitHub, LinkedIn, photo, skills, certifications, education, projects, experience, template.

## What the assistant can already do
Every onboarding field has an edit tool (profile, contact, skills and groups, projects, experience and highlight lines, education, certifications, testimonials, template, look, photos). So the DATA is fully covered; the portfolio shape is the same one the dashboard edits.

## The gaps (real ones)
1. **There is nothing to edit until /api/generate has run.** Every tool answers "No portfolio found" for an account that finished sign-up but not generate. So "build from scratch with ChatGPT or Claude" is not possible for a new person today.
2. **Connecting is Pro-only.** A new person has not paid, so they cannot connect at all. Building through an assistant before paying contradicts the current rule (decision below).
3. **The address (slug) is a browser step.** The assistant is deliberately blocked from the address, so a from-scratch build still needs the address step in the website.
4. **A full CV is more than one batch.** `portfolio_apply_changes` takes at most 20 operations, and one project plus one role can already be 2 to 5 operations. A real CV needs about 25 to 60. Direct tools avoid approval, but any new link (project URL, GitHub, LinkedIn) needs approval, so a one-by-one build raises several approval links.
5. **No guidance for "build from my CV".** The assistant can read an attached CV itself, which is better than our parser (the person reviews it in chat), but nothing tells it what to extract, what to leave out (never invent), or what to ask.
6. **Nothing says what to do at the end.** The assistant cannot publish or choose the address; the replies should say, neutrally, "Review it in your dashboard" (no pricing or upsell wording, because ChatGPT forbids it).
7. **The error message is unhelpful** when no portfolio exists.

Not MCP gaps (the product has no field): languages, volunteering, publications, awards, availability status, section order and visibility. These would be new data-model work, for the dashboard too.

## Proposed tools and changes (small, in order)
1. `portfolio_create` (new): creates an EMPTY portfolio for an account that has none (name, role, optional location; template default). No AI call. Refused if one exists. Returns next steps ("set your address in the dashboard"). Needs decision A.
2. A bulk-build path: raise the batch limit to 60 operations for `portfolio_apply_changes` (one approval, one revision, all-or-nothing), keeping every other check. Needs decision B.
3. MCP prompt and tool description `build_portfolio_from_cv`: what to extract, what never to invent, ask for missing facts, use one batch for the first fill, then read the portfolio back and report gaps with `portfolio_health_check`.
4. Better "no portfolio yet" error: tells the person to finish setup at liveportfolio.site/create, or to use `portfolio_create`.
5. End-of-build message: neutral next steps (review in the dashboard; address and publishing are done there).

## Decisions for you
- **A. Who may build with an assistant before paying?** (1) Keep Pro-only: from-scratch means "fill in the portfolio you already generated". (2) Let Free accounts connect to edit privately (they can already edit privately in the dashboard), publishing stays paid. Option 2 makes the assistant a growth channel but changes the "Pro feature" promise on the pricing page and in the docs.
- **B. Raise the batch limit to 60?**
- **C. Should `portfolio_create` exist at all**, or should the first portfolio always come from the website's generate step (keeping "one AI call per user" and the address step in one place)?

## Test to run once built (and a baseline to run today)
Today: a Pro account with a generated portfolio. Attach a real CV in ChatGPT and in Claude: "build my portfolio from this". Count tool calls and approvals, read the live page, list what was missed. This gives the real gap list before more tools are designed.
