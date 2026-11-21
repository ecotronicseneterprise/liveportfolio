# Switching on the assistant connection (owner steps)

Everything is deployed OFF. Nothing changes for any user until step 3. Do the steps in order; after each one run the login check.
No Custom Access Token Hook is used, so sign-in is never touched by this feature.

**Login check (after every step):** open a private window, sign in with email, sign out, sign in with Google, open /dashboard. Keep your normal browser signed in meanwhile.

## 1. Run the SQL (Supabase, SQL editor)
Paste and run `supabase/manual/20261121100000_mcp.sql`. Verify: the query at the bottom returns three rows with `relrowsecurity = true`.
Rollback: `supabase/rollbacks/20261121100000_mcp.rollback.sql`.

## 2. Turn on the OAuth server (Supabase dashboard)
1. Authentication, then **OAuth Server**.
2. Enable it. Set **Authorization Path** to `/oauth/consent`.
3. Turn on **Allow Dynamic OAuth Apps** (this lets Claude and ChatGPT register themselves). It is safe now because the consent page is live and nobody can use a connection without your allow-list entry (step 3).
4. Authentication, then URL Configuration: confirm the Site URL is `https://liveportfolio.site`.
Run the login check. Rollback: switch the OAuth Server toggle off.

## 3. Allow yourself (Vercel, project liveportfolio, Settings, Environment Variables, Production)
- `MCP_ENABLED` = `true`
- `MCP_ALLOWED_EMAILS` = your account email (comma-separated for more people)
Redeploy (Deployments, latest, Redeploy). Rollback: delete `MCP_ENABLED` and redeploy; every call is refused.

## 4. Test with Claude Code first
```
claude mcp add --transport http liveportfolio https://liveportfolio.site/mcp
```
Inside Claude Code run `/mcp`, choose liveportfolio, Authenticate. A browser opens on the consent page: tick what you want, Connect.
Try: "read my portfolio", "change my headline to ...", "undo", "remove project 1" (you will be sent an approval link), "give me a link to upload a profile photo".
Then try claude.ai (Customize, Connectors, Add custom connector, address `https://liveportfolio.site/mcp`) and ChatGPT (developer mode, same address).

## 5. Check these and tell me what you see
- The consent page shows the app name and your email.
- A second account NOT on the allow-list is told it is not available.
- Disconnect at `/oauth/connections`, then ask the assistant again: it must fail.
- ChatGPT: if it refuses to connect with an audience or resource error, tell me the exact message (that is the case where I add the token hook).

## 6. Going to all Pro users
Remove `MCP_ALLOWED_EMAILS`, set the `mcp` feature to `available` in `lib/plans.ts` (I do this with its test), redeploy.
