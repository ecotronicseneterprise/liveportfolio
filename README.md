# LivePortfolio

Turn your CV into a professional portfolio website, publish it at `yourname.liveportfolio.site`, and keep it up to date by chatting with Claude or ChatGPT.

Live: [liveportfolio.site](https://liveportfolio.site) · Docs: [liveportfolio.site/docs](https://liveportfolio.site/docs) · Connect your AI: [liveportfolio.site/connect](https://liveportfolio.site/connect)

---

## Tell your AI you got certified. Your portfolio updates itself.

Pro accounts can connect their own AI assistant. After a one-time setup, you can say things like:

- "I just passed the Azure AI-102 exam."
- "Add this job to my experience: ..."
- "Turn this README into a project."
- "Tighten my About section. Keep every fact."
- "Undo that."

**Connect in three steps** (the easy page is [liveportfolio.site/connect](https://liveportfolio.site/connect)):

1. Copy the address `https://liveportfolio.site/mcp`.
2. Add it to your assistant. Claude has a one-click button on the connect page; in ChatGPT add a custom connector with that address. Claude Code: `claude mcp add --transport http liveportfolio https://liveportfolio.site/mcp`.
3. Sign in to LivePortfolio, choose what the assistant may do, approve, and start chatting.

**You stay in control**

- Every change is saved as a version and can be undone. Your portfolio from before an assistant first touched it is kept permanently.
- Removing things, adding or changing links, large cuts, whole-list replacements, batches and restoring old versions need your approval on liveportfolio.site. The assistant only gets a link and cannot approve for itself.
- Your email, phone and WhatsApp are hidden from the assistant unless you allow them. You can connect read-only.
- It can never publish, change your address, touch billing, change your sign-in or delete anything. Those are not tools, so no instruction can make an assistant do them.
- Disconnect any time at `/oauth/connections`; the next request from that app is refused.

Under the hood this is a Model Context Protocol (MCP) server: Streamable HTTP, OAuth 2.1 with PKCE, over 40 documented tools. Developer docs and the generated tools reference: [liveportfolio.site/docs/mcp](https://liveportfolio.site/docs/mcp). Agent index: [liveportfolio.site/llms.txt](https://liveportfolio.site/llms.txt).

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
