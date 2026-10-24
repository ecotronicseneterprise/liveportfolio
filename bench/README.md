# bench/

Evaluation harnesses for the CV import pipeline. **Nothing here ships.** `bench/` is its own npm project (`bench/package.json` + `bench/package-lock.json`), **not a workspace**: the root `npm ci` (deploy / CI) never installs it. It is excluded from the app's `tsconfig`, imported by no route, and has its own env file (`bench/.env.local`, git-ignored) for a **dedicated low-limit OpenAI project key** — never the app's key.

```
cd bench && npm install
```

| Command (inside `bench/`) | What | API cost |
|---|---|---|
| `npm test` | 62 unit tests: generator, scorer, proposals, robustness (OpenAI mocked), XSS audit | none |
| `npm run typecheck` | type-check bench code | none |
| `npm run synth:build` | easy set: 44 profiles → 352 files (4 layouts × PDF/DOCX) → `synthetic/out/` | none |
| `npm run synth:hard` | hard set: 100 profiles (dev 29 / test 71, split by profile) → `synthetic/out/hard/` | none |
| `npm run proposals` | email selection / URL de-wrap / phone patterns vs current code | none |
| `npm run bench:pii` | RegexEngine vs OpenRedaction | none |
| `npm run study:pdf` | pdf-parse vs pdfjs-dist vs unpdf, 200 parses × concurrency 1/4/8 × synthetic/real | none |
| `npm run probe:zipbomb` | DOCX zip-bomb memory probe | none |
| `npm run bench:variants` | pipeline variants a/b/c on the easy set (round 2) | ≈ $0.15 |
| `MODELS_STAGE=estimate npm run bench:models-hard` | prints the number of calls, nothing else | none |
| `MODELS_STAGE=dev npm run bench:models-hard` | 6 configs × dev profiles, 1 run | ≈ $1.8 (estimate) |
| `MODELS_STAGE=test MODELS_CONFIGS=a,b npm run bench:models-hard` | top-2 configs × test profiles × 3 runs | ≈ $1–5 |
| `npm run bench:models` | round-1 real-CV comparison (needs `fixtures/cvs`) | ≈ $0.02 |

## Data
- **Gold labels** are the JSON Resume source of each synthetic profile. Emails use reserved/`synth` addresses, handles carry `-synth-`, phones are in fictional ranges, employers are invented (universities and tools are real on purpose). Names are random first/last combinations and could coincide with real people.
- **Hard set** features (tags): alt headings, prose jobs, prose skills, abbreviated / ambiguous / "date" / French dates, long careers, missing sections, header/footer, merged-cell tables, typos, referees with emails + phones, French CVs, Nigerian conventions (NYSC, DOB, State of Origin, HND/OND, WASSCE, declaration), injection before/after the name.
- **Real CVs** (sanity set): `../fixtures/cvs/` (git-ignored). Never commit them or paste their contents anywhere.

## Scoring (`lib/score.ts`)
Micro P/R/F1 over skills, employers, positions, bullets (token-Jaccard ≥ 0.6), schools, degrees, projects, certs, dates (year mentioned; `'19`, `date`, `ce jour` accepted), scalars (name, role, email, GitHub, LinkedIn). Absent sections are skipped, not penalised. **Hallucination** = extracted skill/employer/school/project/cert not present in the source text. **Referee leak**, **injection hijack** tracked separately. 95% bootstrap CIs resample *documents*.

## Caveats
- The synthetic sets are template-generated: use them to rank pipeline changes and catch regressions, not to predict absolute accuracy on real CVs.
- `pdf-parse@1.1.1` is unreliable on small generated PDFs (see `docs/import-hardening-proposals.md` §4); bench code retries and counts it.
- Prices in `lib/llm-spy.ts` come from OpenAI's model pages (2026-10-23); re-check before relying on cost numbers.
