# Cohort access: free 6-month links for bootcamps and universities

Written for the owner. No SQL is needed to create or switch off a link. Nothing here changes payments.

## What a person experiences

1. They open your link, for example `https://liveportfolio.site/bootcamp/uniben-cs`.
2. They land on sign-up with a note: "<Name> students get 6 months of LivePortfolio free". (The link redirects to `/create/account?bootcamp=uniben-cs&name=...`.)
3. They create an account, import or type their details, review, and choose their address.
4. **The moment their address is saved, they get 6 months of the plan attached to the link** and a welcome e-mail. Then the portfolio is generated and they land on the dashboard.
5. The dashboard shows a banner with a **live countdown** ("143 days left", then hours in the last two days), the end date, what happens at the end, and one button to keep the portfolio live. The Account tab shows the same.
6. They get the e-mail sequence below. If they pay at any point, the countdown disappears and the e-mails stop.
7. When the 6 months end, the daily job sets them back to Free: the portfolio goes **private** (nothing is deleted), the banner changes to "Your free access has ended" with a button to bring it back, and the "after" e-mails continue.

If someone creates the account on a laptop and opens the confirmation e-mail on their phone, the confirmation link now carries the cohort code, so they still get the access.

## Creating a link (you do this; no SQL)

You need the `CRON_SECRET` value from Vercel. Run from any terminal (replace the secret; do not paste it anywhere else):

```
curl -s -X POST https://liveportfolio.site/api/admin/bootcamps \
  -H "x-cron-secret: YOUR_CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"code":"uniben-cs","name":"UNIBEN Computer Science","plan_to_grant":"basic","max_uses":200}'
```

- `code`: 2 to 40 lowercase letters, numbers or hyphens. It becomes the link: `https://liveportfolio.site/bootcamp/<code>`.
- `name`: shown to students and in e-mails (the name of the programme or school).
- `plan_to_grant`: `basic` (default) or `pro`. **Basic is recommended**: it publishes the portfolio, and Pro is what you then sell.
- `max_uses`: optional cap on sign-ups (leave it out for no cap).
- The reply contains `"link"`. That is what you send.

List links with their sign-up counts: `curl -s https://liveportfolio.site/api/admin/bootcamps -H "x-cron-secret: YOUR_CRON_SECRET"`.

Switch a link off (people who already used it keep their 6 months): `curl -s -X PATCH https://liveportfolio.site/api/admin/bootcamps -H "x-cron-secret: YOUR_CRON_SECRET" -H "Content-Type: application/json" -d '{"code":"uniben-cs","active":false}'`. The same call with `"active":true` turns it back on, and `"max_uses":300` changes the cap.

The table behind this (`bootcamp_codes`) already exists in your database; the calls only add and change rows.

## The e-mail sequence (Flow D)

Sent by the existing daily job (`/api/cron/drip`, 07:00 UTC), one e-mail per person per run, each exactly once, never to someone who unsubscribed, never to someone who has paid. A step that was missed by a few days is still sent; one that is long out of date is skipped.

| When | Subject | Purpose |
|---|---|---|
| At sign-up (instant) | Your 6 months of free access has started | Their end date; finish the portfolio; put the link on CV and LinkedIn |
| Day 3 | Put your portfolio link where people will see it | Get it shared |
| Day 14 | Make your best project impossible to miss | Improve the content |
| Day 45 | Add what you have built since | Come back and update |
| About 3 months left | Halfway through your free access | First honest explanation of the end, and the price of keeping it |
| 30 days left | 30 days left on your free access | Convert |
| 14 days left | Two weeks left on your free access | Convert |
| 7 days left | Seven days left on your free access | Convert |
| 1 day left | Your free access ends tomorrow | Convert |
| Just after it ends | Your free access has ended: your portfolio is saved | Win-back |
| 2 weeks after | Your portfolio is still saved | Win-back |
| About 6 weeks after | Your saved portfolio is ready when you are | Last note |

Every conversion e-mail says plainly: the portfolio goes private on the end date, nothing is deleted, Basic ₦15,000 for 12 months, Pro ₦45,000 (prices read from `lib/plans.ts`), one payment, no automatic renewal, 7-day refund guarantee. No countdown tricks, no invented numbers. The copy is in `lib/email-drip.ts` (`renderCohortEmail`); edit it there.

## Fixed while building this (these affected conversion)

- **Someone who paid in month 5 would have been set back to Free in month 6.** The expiry job ignored paid subscriptions. It now skips anyone with a running paid plan.
- **A cohort link could overwrite a paid plan.** Redeeming now leaves anyone who already pays untouched.
- **Cohort people got the wrong e-mails.** The generic "publish your portfolio" nudges (Flow A) said "permanent, no expiry" and counted from sign-up; cohort people are now excluded from them and have their own sequence.
- **The 30-day renewal e-mail said "renews automatically"**, which is false for one-time plans, and converted students would have received it. It now says the plan ends, does not renew automatically, and how to renew.
- **The sign-up link lost the cohort on a second device** (the confirmation e-mail opened on a phone). Fixed as described above.

## How to test it end to end (about 15 minutes, throwaway accounts only)

1. Create a test link with `max_uses` of 3 (command above), for example code `test-cohort`, name `Test Cohort`.
2. Open the link in a private window. Check the sign-up page shows the free-access note.
3. Sign up with a throwaway e-mail, import or type details, choose an address. Check: a "Your 6 months of free access has started" e-mail arrives at once, and the dashboard shows the countdown (about 182 or 183 days) and the end date.
4. Check the Account tab shows "Free access through Test Cohort" and a "Keep my portfolio live" button, and that the portfolio is live at its address.
5. **Fast-forward** (you run this SQL in Supabase for the throwaway user only):
   `update public.users set plan_expires_at = now() + interval '6 days' where email = 'THROWAWAY_EMAIL';`
   Reload the dashboard: it should say about 6 days left, in amber. Then trigger the job:
   `curl -s -H "x-cron-secret: YOUR_CRON_SECRET" https://liveportfolio.site/api/cron/drip`
   The reply lists what was sent (`flow_d left7 sent`). The e-mails for earlier steps are not repeated late; run it again and nothing more is sent.
6. Expire it: `update public.users set plan_expires_at = now() - interval '1 hour' where email = 'THROWAWAY_EMAIL';` then call `https://liveportfolio.site/api/cron/expire-plans` with the same header. The portfolio goes private, the banner says the access has ended, and the next drip run sends "Your free access has ended".
7. Convert: pay (the ₦500 owner test works for the owner account, otherwise a real Basic payment) and check the countdown disappears, the plan stays, and no more cohort e-mails come. Refund it afterwards.
8. Switch the test link off and confirm a new visitor sees "This link is no longer active".

## Things to know

- The plan is granted when the address is saved. Someone who signs up through the link but never reaches that step gets nothing (and there is no countdown).
- One free grant per account. Using a second link later changes nothing. A person who already pays is never touched.
- The cap (`max_uses`) counts accounts. Two people redeeming in the same second cannot both slip past it unnoticed.
- The 6 months are fixed in code (`lib/cohort/schedule.ts` and the redeem route). Different lengths per link would need a column that does not exist yet.
- E-mail needs `RESEND_API_KEY` and a verified sending domain (already in use for your other e-mails). If an e-mail fails to send it is not marked as sent and the next daily run tries again.
- Unsubscribe links work as for the other sequences. An unsubscribed student still has the access and the dashboard countdown; they just receive no e-mails.
- Not built: a page listing sign-ups per link (use the `GET` call above for counts), per-link branded sign-up pages, and a "convert now" discount. Say if you want any of them.
