# PII & LLM gateway

All LLM calls go through `lib/llm/call.ts` → `callLLM()`. It is the only module that may import `openai` or call `api.openai.com`.

```
text ─▶ detect (PiiEngine) ─▶ tokenise ([EMAIL_1]…) ─▶ model ─▶ restore tokens in every JSON string ─▶ caller
```

## What this is — and is not

- **Pseudonymisation, not anonymisation.** Placeholders are replaced back locally. Pseudonymised data is still personal data, and the remaining text (employers, schools, locations, project descriptions) goes to OpenAI as written, so a person can often still be re-identified from it.
- **Best-effort detection.** A phone number written in words, a URL broken across lines, or a personal domain outside the TLD list will pass through. Never describe results as "anonymous" or "PII-free".
- Purpose: stop direct contact identifiers (and names the user typed in) reaching the provider, and make sure the model cannot invent or alter them.

## What is redacted

| Entity | Detected | Notes |
|---|---|---|
| `EMAIL` | RFC-ish email addresses | |
| `PHONE` | Nigerian (`+234…`, `234…`, `0[789][01]…`), `+`-prefixed international (incl. `+ (234) 803 …`), US `(xxx) xxx-xxxx` | 9–15 digits |
| `URL` | `http(s)://`, `www.`, social/code hosts (linkedin, github, gitlab, twitter/x, behance, dribbble, medium, kaggle), bare domains on `com/org/dev/me/app/site/xyz/ng/tech/online/work`, `@handles` | `.io`, `.js`, `.ai`, `.co`, `.net` excluded so *Socket.io*, *Next.js*, *ASP.NET* survive |
| `ID` | 8–16 digit numbers within ~25 chars after a context word (NIN, BVN, NIMC, national id, passport, SSN, tax id…) | A bare 11-digit number is **not** flagged (could be a phone or reference) |
| `CARD` | 13–19 digits passing Luhn | |
| `NAME` | Exact, case-insensitive, whole-word match of names the caller passes in `names` (and "Last First" for two-part names) | Not NER. No names are guessed. |

Deliberately **not** redacted: organisations, locations, dates, skills, job titles — they are the content being extracted. Overlaps are resolved deterministically: `ID > CARD > EMAIL > URL > PHONE > NAME`, then longer span, then earlier start.

## Engines

`PiiEngine.detect(text) → spans[{entity,start,end,score}]`. Only `RegexEngine` ships.

Presidio was evaluated and **not adopted**: with spaCy `en_core_web_sm` it measured RSS 173 MB but p50 463 ms / p95 729 ms for 5k characters (spaCy NER alone: p95 444 ms) against a 300 ms gate, and `PERSON` flagged 4–15 spans per CV where there are 1–2 people. **Timings were taken on an x86 Windows desktop, not the ARM VPS**, which will be slower. arm64 availability of the prebuilt images was not verified. The interface is kept so an engine can be added later.

## Environment

| Var | Default | Meaning |
|---|---|---|
| `PII_ENGINE` | `regex` | Any other value is treated as an engine failure |
| `PII_SCORE_THRESHOLDS` | none | e.g. `URL=0.7,PHONE=0.6`; per-entity minimum score. RegexEngine scores: email .95, full URL .95, social URL .9, bare domain/handle .6, NG phone .7–.9, intl phone .8, ID .85, card .9 |
| `PII_ON_ENGINE_FAILURE` | `block` | `block` → `LlmError('pii_engine_unavailable')` (HTTP 503), nothing is sent. `regex_only` → fall back to RegexEngine |
| `PII_REDACT_PERSON` | off | Reserved for NER-capable engines; **no effect** on RegexEngine |

## Failure modes

| Situation | Result |
|---|---|
| Engine throws / unknown `PII_ENGINE` | 503 (default), raw text never forwarded |
| `pii: 'block'` and PII detected | `LlmError('pii_blocked')`, 422, nothing sent |
| `pii: 'off'` without `reason` | refused |
| Model returns an unknown/mangled placeholder | placeholder removed, warning returned, no crash |
| Model refuses / empty / bad format | `LlmError('upstream_failed' \| 'bad_response')` |

## Rules

- **Never log** input text, model output, placeholder tokens or the token map. The map exists only in `callLLM`'s request scope.
- Do not import `openai` elsewhere. `npm run check:llm` fails CI otherwise. The allowlist in `scripts/check-llm-boundary.mjs` currently holds only `app/api/generate/route.ts` ("pending approval").
- Contact fields on the import path (`email`, `github_url`, `linkedin_url`) come from local regexes in `lib/connectors/document.ts`, never from model output; the extraction schema doesn't include them. Project URLs are kept only if they literally appear in the source text.

## Call sites

| Call | Purpose | Via gateway |
|---|---|---|
| `lib/connectors/structure.ts` | CV / pasted text → profile | yes (`redact`, names from the form) |
| `app/api/score/route.ts` | career score | yes (`redact`, portfolio name) |
| `app/api/generate/route.ts` | portfolio copy | **no — pending approval** (see below) |

### `/api/generate` (report only, unchanged)

Sent to OpenAI: `name`, `role`, `location`, `email`, `github_url`, `linkedin_url`, `bio`, `skills`, `certifications`, project `title/description/stack/url`, experience `role/company/period` (bullets are **not** sent), education `degree/institution/year/grade`.

Actually needed for the output: `name`, `role`, `location` (copy mentions), `bio`, skills, projects, experience, education. The route **overwrites** `name`, `role`, `email`, `location`, `github_url`, `linkedin_url` with the user's input after generation, so `email`, `github_url` and `linkedin_url` never need to be sent. Project `url` is returned by the model and stored as-is (so a hallucinated URL would be saved); it could instead be re-attached by index like `image_url`. Related quality issue: experience bullets are requested ("2-3 accomplishment bullets, metric-driven") without any source bullets, so the model invents them.

## Adding an entity or recogniser

1. Add the entity to `PiiEntity` (`lib/llm/pii/types.ts`) and a priority in `PRIORITY` (`redact.ts`) — plus the token regex alternation.
2. Add the pattern and score in `regex-engine.ts`.
3. Add positive cases **and** a negative case (company/skill/date strings that must survive) in `tests/pii-gateway.test.ts`.
4. Run `npm run test` and `npm run check:llm`. For real-world tuning, run the engine over `fixtures/cvs` and look at counts and span lengths only — don't print CV text.

## Privacy policy mapping

`app/privacy/page.tsx` currently states that identifying information such as email is not sent to OpenAI. With this gateway that is true for the import and score paths (direct identifiers are replaced), but **not for `/api/generate`**, which still sends email and URLs, and not for names/employers in free text. The wording needs your decision before `IMPORT_ENABLED` is turned on; suggested: "direct contact identifiers are replaced with placeholders before processing; the rest of your text is sent to OpenAI."

## Tests and fixtures

- `npm run test` (vitest) and `npm run check:llm`.
- `npm run fixtures:snapshot` / `fixtures:diff` compare `/api/parse-cv` output across commits (local server, non-production key). To isolate redaction's effect, snapshot at commit `927b686` and diff after this change.
- Sizing spike (not in repo): `presidio-analyzer` + `en_core_web_sm` in a throwaway venv, timing `analyze()` over `fixtures/cvs` text truncated to 5k characters.
