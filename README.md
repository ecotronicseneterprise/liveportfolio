# LivePortfolio

Turn your CV into a professional portfolio website, publish it at `yourname.liveportfolio.site`, and (on Pro) keep it up to date by chatting with Claude or ChatGPT.

Live: [liveportfolio.site](https://liveportfolio.site) · Docs: [liveportfolio.site/docs](https://liveportfolio.site/docs) · Connect your AI: [liveportfolio.site/connect](https://liveportfolio.site/connect)

---

## Update your portfolio from your AI assistant (Pro)

Tell your assistant "I just passed the Azure AI-102 exam" and it can add that to your portfolio. Every change is saved as a version you can undo.

<!-- DEMO VIDEO: 30 to 45 seconds. Link or embed it here once it is posted. -->

**Assistants:** Claude (web and desktop), ChatGPT and Claude Code have been tested. Gemini CLI, Cursor and VS Code may work (any client that speaks MCP over HTTP with OAuth) but may need manual setup.

**Connect**
1. Add `https://liveportfolio.site/mcp` as a custom connector. Steps with screenshots: [Claude](https://liveportfolio.site/docs/connect/claude), [ChatGPT](https://liveportfolio.site/docs/connect/chatgpt), [others](https://liveportfolio.site/docs/connect/other).
2. Sign in, choose what the assistant may do, and approve. Then start a new chat with the first message shown on the connect page.

**What it can edit (56 tools)**
- Read: portfolio (by section), editing rules, designs, completeness checklist, history, a preview of a change, a health check.
- Profile and contact: name, role, headline, About, location, email, phone, WhatsApp, social links; add to a field or replace one phrase.
- Skills (flat list and groups), experience and highlight lines, projects (stack, links, pictures, optional Power BI dashboard).
- Education, certifications, testimonials: add, fix one, remove one, reorder, replace.
- Photos (upload link or a public https picture), design (template, look, Pro design version).
- Undo, restore an earlier version, and one batch of up to 60 operations for a whole-CV update.

**Security model**
- OAuth 2.1 with PKCE. Assistant tokens work only on `/mcp`; browser tokens do not work there, and assistant tokens are refused on every `/api` route.
- Access is per person and checked on every call. Disconnect at `/oauth/connections`: the next call fails.
- Direct edits are undoable. Removals, whole-list replacements, batches, new links and large cuts need your approval on liveportfolio.site; the assistant cannot approve for itself.
- Your email, phone and WhatsApp are hidden from the assistant unless you allow them. You can connect read-only.

**Limits:** 60 operations per batch, 30 flat skills, 1500 characters per project text field, 120 calls per 10 minutes, 60 edits per hour. The public page shows the first 5 stack items, the first testimonial and, when you have skill groups, the groups rather than the flat list; the assistant is warned when something is saved but not shown.

**It cannot:** publish, change your address or domain, touch billing, change your sign-in, delete anything, or create your first portfolio.

Developer docs and the generated tool reference: https://liveportfolio.site/docs/mcp. Agent index: https://liveportfolio.site/llms.txt

---

## What LivePortfolio does

1. Create an account (email code or Google), upload a CV, import from GitHub, or type a few details.
2. One AI call writes your portfolio copy as structured content; edits after that need no AI.
3. Preview privately, switch between designs, edit anything.
4. Publish at your own address and share it. Pro adds more designs, analytics (visitors, top source, top countries), a QR code, weekly insights and the assistant connection.

Plans: Free (build and preview privately), Basic (publish), Pro (everything). The single source of truth is `lib/plans.ts`; prices are on the home page.

## Stack

Next.js 15 (App Router, TypeScript, Tailwind) · Supabase (Postgres, Auth, Storage) · OpenAI through `lib/llm` · Paystack · Resend · IPinfo · Vercel. Tests with Vitest.

## Run it locally

```bash
npm install
# create .env.local with the variables listed by class in docs/LIVE-STATUS.md
npm run dev -- -p 3101       # port 3101, never 3000
npm run verify               # types, LLM boundary check, tests, production build
```

Preview and local both use the production Supabase project. Push to `main` deploys to production on Vercel; `dev` builds a preview.

## Where things are

| Area | Where |
|---|---|
| Routing by subdomain | `middleware.ts` |
| Plans and features | `lib/plans.ts`, `lib/entitlements.ts` |
| Portfolio edits (typed operations, revisions, undo) | `lib/portfolio/ops.ts`, `lib/portfolio/commit.ts` |
| Assistant connection (MCP) | `lib/mcp/`, `app/mcp/route.ts`, `app/oauth/` |
| Public docs | `lib/docs/pages.ts`, `app/docs/` |
| Billing | `lib/billing/`, `docs/payment-redesign.md` |
| Plans of record and status | `docs/LIVE-STATUS.md`, `docs/mcp-launch-plan.md`, `docs/mcp-setup-guide.md`, `CLAUDE.md` |

Database changes are SQL files in `supabase/manual/` with a matching rollback in `supabase/rollbacks/`; they are run by hand.

## Switching the assistant connection on or off

`MCP_ENABLED=true` is the kill switch. While `MCP_ALLOWED_EMAILS` is set, only those accounts can connect (testing); when it is empty, every Pro account can. Setup steps: `docs/mcp-setup-guide.md`.

## Support

ecotronics.nterprise@gmail.com

Built by Ecotronics Enterprise, Lagos, Nigeria.
