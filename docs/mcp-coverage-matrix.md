# MCP coverage matrix (Phase 1, read-only). 2026-11-21

Derived from the DATA MODEL (`PortfolioContent` in `components/templates/Minimal.tsx`, `CONTENT_KEYS` in `lib/portfolio/ops.ts`) and the dashboard editor (`app/dashboard/page.tsx` editor anchors), NOT from the tool list. Then each field is checked against the tools in `lib/mcp/tools.ts`.

Legend: **D** direct (saved at once, undoable) · **A** needs the person's approval · **GAP** no way to do it · **n/a** not applicable · tools shortened (profile = `portfolio_update_profile`, etc.). Read is `portfolio_get` (optionally `sections`) for every field except contact details, which are hidden unless the person allowed them.
Links (any new or changed URL) always need approval (**A**), as do large cuts (shrink guard), on every tool that writes them.

## Profile and contact

| Field | Create / Update | Delete (clear) | Replace-all | Reorder |
|---|---|---|---|---|
| name | `update_profile` D | refused on purpose (a name is required) | n/a | n/a |
| role, headline, about, location, skills_narrative | `update_profile` D; also `append_text`, `replace_snippet` D | `update_profile` with empty text D | n/a | n/a |
| email, phone, whatsapp | `update_contact` D | `update_contact` with empty text D | n/a | n/a |
| linkedin, github, website, twitter, instagram, facebook, youtube, tiktok URLs | `update_contact` **A** (link rule) | `update_contact` with empty value D (removing is not gated) | n/a | n/a |
| avatar_url (photo) | `request_image_upload` D, `set_image_from_url` D | `remove_image` D | n/a | n/a |

## Skills

| Field | Create | Update | Delete | Replace-all | Reorder |
|---|---|---|---|---|---|
| skills (flat list) | `add_skill` D | **GAP** (rename one: use set_skills) | **GAP** dedicated tool (use `set_skills`; works but must resend the list) | `set_skills` D (shrink guard may make it A) | `set_skills` D |
| skills_grouped | `add_skill_to_group` D (also creates a group) | **GAP** rename group / move a skill between groups | **GAP** remove one skill or one group (only via replace-all) | `set_skill_groups` **A** | `set_skill_groups` **A** |

## Experience

| Field | Create | Update | Delete | Replace-all | Reorder |
|---|---|---|---|---|---|
| role entry (company, role, period) | `add_experience` D (date order) | `update_experience` D | `remove_experience` **A** | `apply_changes` **A** | `move_experience` D |
| highlight lines (bullets) | `add_bullet`, `add_achievement` D | `update_bullet` D, `update_experience` D | `remove_bullet` **A** | `update_experience` (bullets) D | `move_bullet` D |

## Projects

| Field | Create | Update | Delete | Replace-all | Reorder |
|---|---|---|---|---|---|
| project (title, problem, solution, outcome) | `add_project` D (**A** if it has a link) | `update_project` D | `remove_project` **A** | `apply_changes` **A** | `move_project` D |
| stack (list) | `add_project` / `update_project` D | `update_project` D (replaces the list) | `update_project` D | `update_project` D | `update_project` D |
| url, github_url | `add_project` / `update_project` **A** | same **A** | clear with empty value D | n/a | n/a |
| project image | `request_image_upload`, `set_image_from_url` D | same D | `remove_image` D | n/a | n/a |
| achievement (outcome sentence) | `add_achievement` D | `update_project` D | `update_project` D | n/a | n/a |

## Education, certifications, testimonials

| Field | Create | Update | Delete | Replace-all | Reorder |
|---|---|---|---|---|---|
| education (degree, institution, year, period, grade) | `add_education` D | **GAP** edit ONE entry (a typo in a degree) | `remove_education` **A** | `set_education` **A** | **GAP** (only via replace-all) |
| certifications (text) | `add_certification` D | **GAP** edit ONE entry | `remove_certification` **A** | `set_certifications` **A** | **GAP** |
| testimonials (text, author, role) | **GAP** add one | **GAP** edit one | **GAP** remove one | `set_testimonials` **A** | **GAP** |
| testimonial `company` | **GAP**: the dashboard model has it, the tool and operation do not | | | | |

## Look and design

| Field | Set | Clear |
|---|---|---|
| template | `set_template` D (Pro designs only if the plan allows) | n/a |
| look: arrangement, accent, density, bio length | `set_look` D | `set_look` with null D |
| Pro design version (original or redesigned) | `set_pro_design` D | `set_pro_design` with null D |

## Not fields (so not gaps in the assistant)

- **Address (slug), publish, plan, billing, account email, delete account:** deliberately not tools.
- **SEO title and description:** derived from role, location and headline on every save; no field to edit (deliberate).
- **Section order and visibility, languages, volunteering, publications, awards, availability status:** the data model has no field, so the dashboard cannot edit them either. These are product gaps, not MCP gaps.
- **Health score, history, analytics:** read-only (`health_check`, `list_history`, undo and restore exist; analytics tool does not).

## GAP list, ranked by how often a real user will hit it

1. **Edit ONE education entry** (fix a degree name, year, institution). Today: remove (approval) and add, or replace the whole list (approval). *Very common.*
2. **Edit ONE certification** (fix a name, add a missing exam code). Today: remove (approval) and add. *Very common.*
3. **Testimonials: add, edit, remove one**, and the missing `company` field. Today only a full replacement (approval). *Common once testimonials are used.*
4. **Skill groups: remove one skill or one group, rename a group, move a skill.** Today only a full replacement (approval). *Common.*
5. **Reorder education, certifications, testimonials.** *Occasional.*
6. **Dedicated remove-one and rename-one for the flat skills list.** Works today through `set_skills`, but needs the whole list. *Occasional.*
7. **Analytics read tool.** Not an edit, but a "how is my portfolio doing" question has no answer. *Occasional.*

Everything else on a portfolio can be created, read, updated, deleted and (where it makes sense) reordered today.

## Proposed new tools to close the gaps (small)

`portfolio_update_education` (by index), `portfolio_update_certification` (by index), `portfolio_add_testimonial`, `portfolio_update_testimonial`, `portfolio_remove_testimonial` (**A**), add `company` to the testimonial shape, `portfolio_remove_skill_from_group` and `portfolio_remove_skill_group` (**A**), `portfolio_rename_skill_group`, `portfolio_move_education`/`move_certification`/`move_testimonial` (D, order only), `portfolio_remove_skill` (D unless it trips the shrink guard).

## Phase 2 and 3 (after you approve this matrix)

- **Tests:** a throwaway test user and portfolio created in the test setup (the repo's fake database helper, no production data, never your account), torn down after. One round-trip, public-render, undo and approval check per matrix cell; boundary and abuse cases per field type; concurrency, isolation, revocation and rate-limit checks. Report: pass or fail per cell, plus anything that passed by accident.
- **Phase 3:** a copy-paste checklist of about 15 natural-language prompts for ChatGPT and Claude, with expected tool, approval, live-page result and a pass/fail column per client.
- Nothing is pushed until you have seen the results.
