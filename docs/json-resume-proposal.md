# Proposal: JSON Resume import / export (not implemented)

Status: **proposal only**. Nothing here is built. JSON Resume ([schema](https://jsonresume.org/schema)) is structured, so import needs **no LLM and no PII gateway** — it is deterministic mapping with validation.

## Import: JSON Resume → `ImportDraft`

| JSON Resume | ImportDraft | Notes |
|---|---|---|
| `basics.name` / `label` | `name` / `role` | |
| `basics.email` | `email` | validated with the same email check; first only |
| `basics.summary` | `bio` | capped at 500 chars (warning if truncated) |
| `basics.location.city`, `countryCode` | `location` | `"City, CC"` |
| `basics.profiles[network=GitHub\|LinkedIn].url` | `github_url`, `linkedin_url` | other networks ignored with a warning |
| `basics.url`, `basics.image`, `phone` | — | not in the form schema. `image` is **never fetched** (SSRF/tracking risk) |
| `skills[].keywords` (fallback `name`) | `skills` | deduped, ≤ 15 |
| `work[]` | `experience[]` | `name→company`, `position→role`, `highlights→bullets` (≤ 4), dates → `period` |
| `education[]` | `education[]` | `studyType + area → degree`, `institution`, `endDate → year`, `score → grade` |
| `projects[]` | `projects[]` | `name`, `description`, `keywords→stack`, `url` (http/https only) |
| `certificates[]` | `certifications[]` | `name` (+ ` — issuer`) |
| `volunteer`, `awards`, `publications`, `languages`, `interests`, `references` | — | counted and reported in `warnings`, not imported |

Pipeline: size cap (≤ 256 KB) → `JSON.parse` → validate with `ajv` against the official schema (collect all errors, don't stop at the first) → map → `normalizeProfile` (same caps and sanitising as the CV path) → `ConnectorResult { source: 'json-resume' }`, so `merge.ts` and the review form work unchanged.

## Dates: flag, never guess

`period` is display text in our schema, but JSON Resume dates are ISO-8601 partials. Rules:

1. Accept exactly `YYYY`, `YYYY-MM`, `YYYY-MM-DD` (month 01–12, day valid for the month). Render as `Mon YYYY` / `YYYY` and join with ` – `.
2. Anything else is **kept verbatim** in `period` and reported as a warning with its path, for example:
   `{ path: "work[2].startDate", value: "Summer of 19", reason: "unparseable" }`. We do not coerce it to a year.
3. Ambiguous numeric forms (`03/04/2021`, `2021/04`) are flagged `ambiguous` (day-first vs month-first) unless one part is > 12, in which case the order is unambiguous and accepted.
4. Two-digit years (`'19`, `03/19`) are flagged — no century guessing.
5. Out-of-range or impossible dates (`2021-13`, `2021-02-30`) are flagged `invalid`.
6. Missing `endDate` → render `Present`, with an `info` note (JSON Resume's convention for "current"); an `endDate` earlier than `startDate` is flagged `inverted`.
7. The review form highlights every flagged field so the user confirms or edits it; flagged values never silently enter scoring (`dates` family) or the generated copy.

## Export: portfolio `content` → JSON Resume

- Reverse of the table above. `content.about`, not the raw bio, goes to `basics.summary`.
- `period` strings are parsed with the same rules. If a period can't be parsed, omit `startDate/endDate` and carry the original text in an extension field (`x-liveportfolio-period`) so nothing is lost; list it in the export report.
- `avatar_url` → `basics.image` only if the user opts in.
- Output validated against the same schema before download; export is read-only on the user's own portfolio (auth-checked).

## Tests (when built)

Round-trip on the 44 synthetic gold profiles (`bench/synthetic`) — they are already JSON Resume-shaped, so import(gold) must reproduce the gold label exactly, plus a date table-test covering each rule above, plus malformed/oversized/hostile JSON cases.

## Open questions

- Which JSON Resume `meta.version` to target (v1.0.0 vs the newer community schemas)?
- Should export include `references`/`languages` (not collected today)? Proposed: no.
