# Import connectors

`POST /api/import` (feature-flagged) and `POST /api/parse-cv` (alias) turn a CV, pasted text or a GitHub username into a draft for the `/create` form. Code: `lib/connectors/`.

## Env

| Var | Where | Purpose |
|---|---|---|
| `IMPORT_ENABLED=true` | server | enables `/api/import` (otherwise 404) |
| `NEXT_PUBLIC_IMPORT_ENABLED=true` | build time | shows the GitHub / paste-text options on `/create` |
| `GITHUB_TOKEN` | server only | optional; lifts GitHub API limit 60/h → 5000/h. Never sent to the client or logged |
| `IMPORT_DAILY_CALL_CAP` | server | best-effort in-process cap on AI-backed imports/day (0 = off) |
| `TRUSTED_IP_HEADER` | server | name of a header that is *proven* to carry the client IP (see below). Unset → all callers share one bucket |

## Client IP — what was verified, what was not

- The Caddyfile is **not in the repo** and I did not SSH to production, so the live config is unverified.
- `docs/deployment.md` shows `header_up X-Real-IP {remote_host}`. If Cloudflare proxies the site (PRD says it does), `{remote_host}` is a **Cloudflare edge IP**, so `x-real-ip` would be the same few values for everyone.
- Every existing route (`generate`, `parse-cv`, `check-slug`, `subscribe`, …) uses the **first** `x-forwarded-for` entry. That entry is client-supplied unless Caddy overwrites it, so those per-IP limits are bypassable by sending a header.
- A trustworthy source exists only if (a) Cloudflare sets `CF-Connecting-IP` **and** (b) the origin (89.167.93.25) accepts :80/:443 only from Cloudflare ranges (firewall / Caddy `remote_ip`). Otherwise anyone hitting the origin directly can forge it.

To verify (read-only, on the VPS): `cat /etc/caddy/Caddyfile`, `sudo ufw status` / Hetzner firewall rules, and `curl -sI --resolve liveportfolio.site:443:89.167.93.25 https://liveportfolio.site` from outside Cloudflare — it should fail if the origin is locked down.

Until then `clientIp()` returns `'unknown'` unless `TRUSTED_IP_HEADER` is set.

## Rate limiting — current state and limitation

Existing persistent mechanisms were inspected (`lib/schema.sql`): `users`, `portfolios`, `payments`, `subscriptions`, `analytics_events` (has `ip_hash`, but for portfolio views and written by a different pipeline), `career_scores`, `email_subscribers`, `invite_tokens`. None is keyed for pre-signup, per-IP, per-day counting. Imports happen **before sign-up**, so per-user limits cannot apply either.

Therefore no persistent limiter is shipped. What exists:

- `/api/import` and `lib/connectors/limits.ts`: in-process per-IP and global-daily counters. **These reset on restart/deploy and are not shared across instances. They are a backstop, not security.**
- `/api/parse-cv` keeps its original in-memory 3/IP/hour limiter, unchanged.
- `/api/import` ships **disabled** (`IMPORT_ENABLED` unset).

Recommended real controls, none needing schema changes:
1. Cloudflare rate-limiting rule (or Turnstile) on `/api/import` and `/api/parse-cv`.
2. A monthly hard spend limit on the OpenAI project (global kill switch).

### Proposal (needs approval — NOT applied)

If a persistent limiter is still wanted:

```sql
create table import_usage (
  key   text not null,          -- 'ip:<sha256(ip)>' or 'global'
  day   date not null default current_date,
  count int  not null default 0,
  primary key (key, day)
);
-- service-role only; RLS on with no policies.
alter table import_usage enable row level security;

create function import_hit(p_key text, p_limit int) returns boolean
language sql security definer as $$
  insert into import_usage(key) values (p_key)
  on conflict (key, day) do update set count = import_usage.count + 1
  returning count <= p_limit;
$$;
```

Only worthwhile once `TRUSTED_IP_HEADER` is verified; keying on a spoofable IP just moves the problem into the database.

## GitHub cache

1h TTL, in-process `Map`, max 200 entries (oldest evicted). Cleared on every restart/deploy, not shared between instances. Fine for a single PM2 fork-mode process.

## Privacy

The CV/pasted text — including name, email and phone — is sent to OpenAI for extraction. `app/privacy/page.tsx` currently says identifying information such as email is **not** sent to OpenAI; that line does not hold for the CV path (it was already untrue for `parse-cv`). The privacy policy wording needs a decision before `IMPORT_ENABLED` goes on. The consent line on `/create` already discloses it.

## Known limitations

- Scanned / image-only PDFs return `no_text` (no OCR yet).
- DOCX is limited by size (5MB) only; there is no uncompressed-size guard against zip bombs.
- Prompt injection in a CV can only influence that user's own draft (schema-enforced output, reviewed in the form), but it is not otherwise filtered.
- Email / profile URLs from the model are kept only if they literally appear in the source text; other fields are not verified against it.
