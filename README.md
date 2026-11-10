# Trade License BD

Offline, bilingual (English / বাংলা) trade licence fee estimator and renewal
guide for Bangladesh. Pick your business, your issuing authority and your
signboard size, and get an itemised licence bill — licence fee, signboard
tax, VAT, renewal income tax and any late surcharge — plus a searchable fee
table, a renewal-deadline checker, step-by-step new/renewal guides and a
document checklist.

## Problem

Every business in Bangladesh needs a trade licence from its city corporation,
paurashava or union parishad, renewed every financial year. The total bill is
not one number: it is a category fee plus signboard tax, 15% VAT, an income
tax collected at renewal, and a monthly surcharge if you renew late. Small
traders usually learn the total only at the counter — and brokers sometimes
charge more than the schedule. This app computes the bill from the published
schedule before you go.

## Features

- **Fee calculator** — 40 business categories (grocer ৳500 … five-star hotel
  ৳50,000), 5 issuing authorities (DNCC, DSCC, Chattogram CC, other city
  corporation, paurashava), new vs renewal, signboard size, months late.
  Itemised bill: licence fee + signboard tax (৳80/sq ft) + 15% VAT +
  income tax at renewal (s.131 ITA 2023: ৳3,000 / ৳2,000 / ৳1,000) +
  late surcharge (max(৳100, 10% of fee) per month after 30 September).
- **Fee table** — all 40 categories, searchable, tap a row to load it into
  the calculator.
- **Renewal deadline checker** — enter any date: financial year, renewal
  deadline (30 September), days left / overdue, estimated months late, and a
  one-tap "use this in the calculator" for overdue renewals.
- **Guides** — new licence in 7 steps, renewal in 5 steps, with per-step
  progress that persists.
- **Document checklist** — 10 items (NID, e-TIN, photos, rent deed, holding
  tax receipt, …) with progress, persisted.
- **Saved estimates** — save, load and delete estimates; JSON export +
  strict import; typed-DELETE erase-all.
- **Bilingual** — full English/বাংলা UI with Bengali digits, persisted;
  lakh-style ৳ grouping (৳55,87,200.00).
- **Offline & private** — zero network requests; everything in localStorage.
  390px mobile layout with no horizontal overflow.

## Stack

Vanilla HTML / CSS / JavaScript, no build step, no dependencies. Pure logic
in `logic.js` (shared by Node tests and the browser), data in `data.js`
(generated from `.scratch/gen.py` so Bengali stays ASCII-escaped `\uXXXX`
and survives the GitHub push API intact).

## Prerequisites

Any modern browser. Node.js 18+ only if you want to run the tests.

## Install & run

```sh
# open directly — no server needed
open index.html
# or serve locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Dev commands

```sh
node --test tests/logic.test.js   # 18 unit tests (pure engine)
node tests/smoke.js               # 70 headless-Chrome checks (raw CDP)
python3 .scratch/gen.py           # regenerate data.js + i18n.js from source data
```

## Env

None. No keys, no accounts, no backend.

## Testing

- `node --test tests/logic.test.js` — 18/18 pass (bill math for 6 hand-computed
  cases, deadline math for 6 dates, validation, search, formatting,
  export/import).
- `node tests/smoke.js` — 70/70 pass in headless Chromium (raw CDP):
  calculator totals, validation, tap-to-load, deadline checker + apply,
  guide/checklist persistence, save/load/export/import/erase, BN toggle +
  persistence, 390px no-overflow on all 6 tabs, zero non-file network
  requests, 0 console/page errors.
- Ground truth: every category fee was read from the bdnewsnet Dhaka City
  Corporation fee list (City Corporation Model Tax Schedule 2016); bill
  components cross-checked against trw.co's 2026 trade-licence-fee guide.
  See `DATA_NOTES.md` and `TEST_RESULTS.md`.

## Deployment

Static site. Push to GitHub and enable GitHub Pages (main branch, root).
No build step.

## Limitations

- **Estimate only, not an official bill.** Category fees are the 2016 Model
  Tax Schedule as reported for Dhaka City Corporation; your corporation or
  paurashava may charge a different (usually lower) local rate. Confirm at
  the issuing office or etradelicense.gov.bd before paying.
- The surcharge "months late" estimate counts whole 30-day blocks after
  30 September; the corporation counts calendar months — the app says so
  in the UI.
- Limited companies pay by paid-up capital (৳1,500–৳12,000); the app covers
  the 40 listed business categories, not the capital-band table.
- Union parishad rates are not included (they vary by union).
- No live data: the app cannot tell you whether a licence office is open
  or what your ward charges today.

## Status

MVP complete. See `TEST_RESULTS.md` for the verified test record.
