# Launch readiness audit (read-only). 2026-11-21

Nothing here is applied. Nothing was sent or posted. `main` was not touched by this audit. Sections: 1 copy audit, 2 README audit and proposed README, 3 launch asset drafts, 4 pre-send gates.

## What is now true (the checklist the copy is checked against)

1. Assistant connection (ChatGPT, Claude, Claude Code, Gemini CLI, Cursor, VS Code) at https://liveportfolio.site/mcp. **Pro only.** `MCP_ENABLED` is the kill switch.
2. OAuth 2.1 sign-in with a consent screen, a "Verified" badge for chatgpt.com and claude.ai, access per person, revoke at /oauth/connections (the next call fails).
3. Direct edits are saved as a version and can be undone. Removals, whole-list replacement, batches, **new links**, sharp cuts and restoring an old version need the person's approval.
4. Approval page: before and after, "Approved. Go back to your chat.", a Copy "I approved it" button, an "Open Claude/ChatGPT" button (only for connections made after the optional SQL column exists).
5. Edit coverage (56 tools): profile, contact, skills (flat and groups), experience and highlight lines, projects, education, certifications, testimonials, photos, template, look, Pro design version; edit-one, remove-one and reorder tools.
6. Power BI interactive dashboard on a project ("Publish to web" only), free designs only, public-data warning.
7. Limits: 30 flat skills, 1500 characters per project text field, 60 operations per batch; the page shows the first 5 stack items, the first testimonial, skill groups when any exist (not the flat list), and in the "index" layout the first bullet of a role. The assistant is warned about these.
8. The assistant cannot publish, change the address, touch billing, change sign-in, or delete anything. It cannot create the first portfolio.
9. Prices (single source `lib/billing/prices.ts`): Basic ₦15,000, Pro ₦45,000, each one payment for 12 months, no auto-renewal, 7-day refund guarantee.

## 1. Copy audit

Priority: **H** fix before announcing, **M** fix this week, **L** polish.

| # | Where | Current text | Problem | Proposed text | P |
|---|---|---|---|---|---|
| 1 | Privacy policy (`app/privacy/page.tsx`) | Lists OpenAI, Resend, Paystack, etc. Nothing about connecting an assistant. | When someone connects ChatGPT or Claude, their portfolio text is sent to that provider, and we store connection records. A lawyer must check, but the policy is silent. | New section "AI assistants you connect": "If you connect ChatGPT, Claude or another assistant, the assistant can read your portfolio text and, only if you allow it, your email, phone and WhatsApp. That text goes to the assistant provider under its own terms. We store which app is connected, when it was last used, your allow-edits and share-contact choices, and counts of tool calls for limits and safety. We do not store your chat messages. You can disconnect at any time at liveportfolio.site/oauth/connections." | H |
| 2 | Terms (`app/terms/page.tsx`) | Plans, refunds. No assistant clause. | No statement about edits made by an assistant on the person's instruction. | Short clause: "Changes made by an assistant you connect are made on your instruction and are your responsibility. Removals and new links need your approval. You can undo changes from History." | M |
| 3 | Pricing section "Coming soon" (`lib/plans.ts`: `ai_assistant` = 'AI assistant', soon) | Shown under "Coming soon" in the Pro card and in the free dashboard preview. | Reads as if an AI assistant is NOT available, while the assistant connection is live and listed as included two lines above. Confusing. | Rename the planned feature to what it is: "Built-in assistant inside your dashboard" (keep it under Coming soon), or remove it. | H |
| 4 | Home page hook (`app/page.tsx`) | "Tell your AI you got certified. Your portfolio updates itself." | Slightly overclaims: it updates when you tell your assistant in a chat, not on its own in the background. The docs say so; the headline does not. | Keep the hook, add the clarifier already in the section: "...just chat." is present. Optionally: "Tell your AI you got certified. It is on your portfolio." | L |
| 5 | Home page FAQ and meta description | No mention of the assistant. Meta: "Upload your CV and we turn it into a professional portfolio website..." | A visitor and a search engine cannot learn about the feature from the FAQ or the snippet. | FAQ entry: "Can I edit my portfolio from ChatGPT or Claude? Yes, on Pro. Connect once, then tell your assistant about a new job or certification. Every change can be undone and removals need your approval." Meta: add "...and update it by chatting with Claude or ChatGPT." | M |
| 6 | Docs: What the assistant can do (`lib/docs/pages.ts`) | Lists reading, editing text, jobs, projects, designs, pictures. | Missing: testimonials, fixing one education or certification entry, skill group tools, reordering, Power BI dashboard, health check. | Add bullets: "Fix one education entry or one certification", "Add, fix or remove a testimonial", "Add, rename or remove a skill group", "Reorder education, certifications, testimonials and skill groups", "Add an interactive Power BI dashboard to a project (see Editing)". | M |
| 7 | Docs: Editing, Safety, Changelog | No Power BI, no limits, changelog stops at 21 Nov. | New features undocumented. | Editing: "Add an interactive Power BI dashboard under a project picture: in Power BI choose File, Embed report, Publish to web, paste the link in the project's dashboard field. Anyone with the link can see the data, so only use data you are happy to share. Free designs only." Safety: "Limits: 30 skills, 1500 characters per project text. Some things are saved but not shown (first 5 stack items, first testimonial); your assistant will tell you." Changelog: add "Power BI dashboards on projects, edit-one and reorder tools, approval page with before and after, easier connect pages". | M |
| 8 | Docs: /docs/connect/claude, /chatgpt, /other | No statement that it is a Pro feature. | A free user may follow the steps and be refused. | First line on each: "The assistant connection is included with the Pro plan." | M |
| 9 | Docs: Your data | Deletion only. | No mention of connected apps. | Add: "Disconnect any assistant at /oauth/connections. Assistants can never delete your account." | L |
| 10 | Dashboard card (free) | "Tell ChatGPT or Claude your wins. Your portfolio updates itself." + Pro tag + Get Pro | Labelled Pro. Same "updates itself" wording as #4. | Same fix as #4 if changed. | L |
| 11 | Connect pages: "Add to Claude" | "It opens Claude with everything filled in." (/connect), button on the guide and card | The Claude deep link has not been verified by clicking it. A claim we cannot back up yet. | Until verified: "Opens Claude's add-connector dialog" or remove the sentence. | H |
| 12 | Other assistants guide | Gemini CLI command, Cursor and VS Code buttons (card) | The Gemini CLI command and the Cursor/VS Code deeplinks are from third-party notes, unverified. | Verify once each, or label "may need manual setup". | M |
| 13 | Email templates (`lib/email-drip.ts`) | Flows A to D, weekly insight. No assistant mention. | The assistant is the new Pro headline and is absent from every Pro-facing email. | One line in the Basic upgrade flow (B): "Pro also lets you update your portfolio by chatting with Claude or ChatGPT." No change to Pro emails until the feature is announced. | M |
| 14 | README | See section 2. | Says "over 40 tools" (now 56); claims Claude has a one-click button (unverified); no Power BI, limits or tool groups. | Proposed README below. | M |
| 15 | llms.txt / sitemap | Lists docs, tools, connect pages. | OK. Add the Power BI line after docs are updated. | Regenerates from the registry. | L |
| 16 | Pricing and refunds | Basic ₦15,000, Pro ₦45,000, 12 months, no auto-renewal, 7-day refund: same in modal, pricing note, landing, FAQ, terms, checkout. USD shown as an estimate (about $10 and $30). | **No inconsistency found in the app.** The "$3, $5, $9" figures from earlier notes appear nowhere in the repo. The free dashboard panel intentionally omits the refund line (decision). | None. | none |
| 17 | Unbackable claims scan | Searched for "unlimited", "first ever", "#1", "world's", big numbers. | None found in customer copy. "Every change can be undone" holds for saved edits. | None. | none |
| 18 | "Pro" labelling | Home section: "New for Pro". /connect: "Included with Pro". Pricing list: assistant under Pro only. Docs plans page: lists it under Pro. | Consistent except #8. | See #8. | M |

## 2. README audit

Today (README.md): good structure, but: "over 40 documented tools" (56 now); says "Claude has a one-click button on the connect page" (not verified); no Power BI; no limits; no tool list; no demo slot.

### Proposed README (factual; not applied)

```markdown
# LivePortfolio

Build a professional portfolio from your CV, publish it at yourname.liveportfolio.site, and keep it up to date by chatting with Claude or ChatGPT.

Live: https://liveportfolio.site · Docs: https://liveportfolio.site/docs · Connect your AI: https://liveportfolio.site/connect

<!-- DEMO VIDEO: 30 to 45 seconds. Embed or link here once posted. -->

## Update your portfolio from your AI assistant (Pro)

Say "I just passed the Azure AI-102 exam" and your assistant adds it to your portfolio. Every change is saved as a version you can undo.

**Supported assistants:** Claude (web, desktop, mobile), ChatGPT, Claude Code, Gemini CLI, Cursor, VS Code (anything that speaks MCP over HTTP with OAuth).

**Connect in two steps**
1. Add https://liveportfolio.site/mcp as a custom connector (step-by-step with screenshots: /docs/connect/claude, /docs/connect/chatgpt, /docs/connect/other).
2. Sign in, choose what the assistant may do, and approve. Then start a new chat with the first message shown on the connect page.

**What it can edit (56 tools)**
- Read: portfolio (by section), editing rules, designs, completeness checklist, history, preview of a change, health check.
- Profile and contact: name, role, headline, About, location, email, phone, WhatsApp, social links; append or replace a phrase.
- Skills: flat list and groups (add, remove, rename, reorder, replace).
- Experience and highlight lines; projects (including stack, links, pictures and an optional Power BI dashboard).
- Education, certifications, testimonials: add, fix one, remove one, reorder, replace.
- Photos: upload link, or a public https picture; remove.
- Design: template, look, Pro design version.
- Undo, restore an earlier version, one batch of up to 60 operations for a whole-CV update.

**Security model**
- OAuth 2.1 with PKCE. Assistant tokens work only on /mcp; browser tokens do not work there.
- Per-person access, checked on every call. Disconnect any time; the next call fails.
- Direct edits are undoable. Removals, whole-list replacements, batches, new links and large cuts need your approval on liveportfolio.site; the assistant cannot approve for itself.
- Contact details (email, phone, WhatsApp) are hidden from the assistant unless you allow them. You can connect read-only.

**Limits:** 60 operations per batch, 30 flat skills, 1500 characters per project text, 120 calls per 10 minutes, 60 edits per hour. The public page shows the first 5 stack items and the first testimonial; your assistant is warned when something is saved but not shown.

**It cannot:** publish, change your address or custom domain, touch billing, change your sign-in, delete anything, or create your first portfolio.

Developer docs and the generated tool reference: https://liveportfolio.site/docs/mcp · Agent index: https://liveportfolio.site/llms.txt

## What LivePortfolio does
(keep the current section: account, CV or GitHub import, one AI call, edit without AI, publish, plans)

## Stack, run locally, where things are
(keep the current sections)
```

## 3. Launch asset drafts (not sent, not posted)

Rules followed: one call to action, no invented numbers, link carries `?ref=email`, unsubscribe link, nothing that needs the connection to be open to everyone until it is.

### Email A: Pro users
**Subject:** Update your portfolio by chatting
**Preview:** Connect Claude or ChatGPT in two steps.

> Hi {name},
>
> You can now update your LivePortfolio from Claude or ChatGPT. Tell your assistant about a new certification, job or project and it is added to your portfolio. Every change can be undone, and nothing is removed without your approval.
>
> Connect in two steps:
> 1. Add the connection (one click for Claude, a few taps for ChatGPT).
> 2. Start a new chat with the first message we give you.
>
> **[Connect your assistant]** → https://liveportfolio.site/connect?ref=email
>
> Your email and phone stay hidden from the assistant unless you allow them. You can disconnect any time.
>
> {sender}
> Unsubscribe: {unsubscribe_link}

### Email B: Free users
**Subject:** What Pro adds to your portfolio
**Preview:** Update it by chatting, plus all designs and visitor insights.

> Hi {name},
>
> Your portfolio is ready to preview for free. Pro adds:
> - Update your portfolio by chatting with Claude or ChatGPT
> - All 10 designs and no LivePortfolio badge
> - Who viewed your portfolio: visitors, top source, top countries
> - A QR code and a weekly career insight
>
> Pro is one payment for 12 months, with a 7-day refund guarantee.
>
> **[See Pro]** → https://liveportfolio.site/?ref=email#pricing
>
> Unsubscribe: {unsubscribe_link}

### WhatsApp status / broadcast
> Tell your AI you got certified. Your portfolio updates itself 🎓
> I built it so you can update your portfolio by chatting with Claude or ChatGPT. Every change can be undone, and nothing is removed without your approval.
> Watch: {VIDEO}
> Connect: liveportfolio.site/connect

### LinkedIn page post
> I got certified last week and did not touch my portfolio. I told my AI, and it added the certification. When I asked it to remove a project, it could not do it alone: it sent me an approval link. And "undo" put everything back.
> LivePortfolio now connects to Claude and ChatGPT, so your portfolio keeps up with your career. Included with Pro.
> {VIDEO}
> liveportfolio.site/connect

### Facebook page post
> New on LivePortfolio: update your portfolio by chatting with your AI assistant. Say you passed an exam or started a new job, and it is on your portfolio. You approve removals and new links, and you can undo any change.
> {VIDEO} (upload natively)
> Connect (Pro): liveportfolio.site/connect

## 4. Pre-send gates (status only)

| Gate | Status | Evidence |
|---|---|---|
| `MCP_ALLOWED_EMAILS` removed | **Pass** | Production env lists `MCP_ENABLED` and no `MCP_ALLOWED_EMAILS` (checked with `vercel env ls production`) |
| Feature live on main and production | **Pass** | `/api/flags` reports commit 0f9b483 on branch main, env production; origin main, dev and local all at 0f9b483 |
| Pricing consistent | **Pass** | One source (`lib/billing/prices.ts`); terms, FAQ, pricing, modal agree; no stale figures found |
| Screenshots in `public/connect/` | **Mostly** | 6 of 7 present, committed and served (200); `claude-oauth-register-automatically.png` missing (optional, hidden gracefully) |
| Connect pages load | **Pass** | /connect, /docs/connect, /docs/connect/claude, /chatgpt, /other, /docs/mcp, /docs/safety all 200 |

**Blocking an email to all subscribers**
1. **Privacy policy has no assistant section (item 1).** Fix before telling people to connect their data to a third party.
2. **"Coming soon: AI assistant" contradicts the live feature (item 3).**
3. **The live checklist (docs/mcp-live-test-checklist.md) has not been run** on ChatGPT and Claude with a throwaway Pro account, and the Claude deep link is unverified (item 11).
4. **The optional SQL column** for the Open Claude/ChatGPT button has not been run (the button will not appear), and existing connections need a reconnect.
5. **Email list consent:** this audit cannot see whether subscribers agreed to product announcements. The drip emails already carry an unsubscribe link; confirm consent for a one-off launch email.
6. **Send a test to yourself first**, and send only the Pro segment until a fresh Pro account has connected successfully end to end.
