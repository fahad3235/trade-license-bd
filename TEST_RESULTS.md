# TEST_RESULTS.md — trade-license-bd

Run: TBD at record time (max+1 rule; see PROJECT_LEDGER.md)
Date: 2026-11-10 (14:00 slot, Asia/Dhaka)
Stack: vanilla HTML/CSS/JS, no build step, no dependencies.

## Unit tests — 18/18 pass

Command: `node --test tests/logic.test.js` (Node v24.22.1)
Run: 2026-11-10 ~14:15 +06. Result: 18 pass, 0 fail.

Hand-computed cases (all verified against the schedule math by hand):

| Case | Expected | Got |
|---|---|---|
| Grocer ৳500, DNCC renewal, 10 sq ft signboard, 0 late | fee 500 + sign 800 + VAT 75 + tax 3000 = **৳4,375** | ৳4,375 ✓ |
| Five-star hotel ৳50,000, DSCC new, 100 sq ft | 50000 + 8000 + 7500 = **৳65,500** (no income tax / surcharge on new) | ৳65,500 ✓ |
| Restaurant A/C ৳2,500, other CC renewal, 20 sq ft, 2 late | 2500 + 1600 + 375 + 2000 + 2×250 = **৳6,975** | ৳6,975 ✓ |
| Pharmacy retail ৳1,000, paurashava renewal, 0 sq ft, 3 late | 1000 + 0 + 150 + 1000 + 3×100 = **৳2,450** (surcharge floor 100/mo) | ৳2,450 ✓ |
| Grocer renewal, 3 late | surcharge 3×max(100, 50) = **৳300** | ৳300 ✓ |
| Grocer new with monthsLate=5 passed in | tax 0, surcharge 0, total **৳575** | ৳575 ✓ |
| Deadline 2026-11-10 | FY 2026–27, deadline 2026-09-30, **41 days overdue, 1 month late, overdue** | ✓ |
| Deadline 2026-09-15 / 2026-08-01 | 15 days left / soon; 60 days left / ok | ✓ |
| Deadline 2026-09-30 | 0 days left, soon (not overdue) | ✓ |
| Deadline 2027-03-15 | FY 2026–27, **166 days overdue, 5 months late** | ✓ |
| Deadline 2026-07-01 | FY 2026–27, 91 days left, ok | ✓ |
| Invalid dates (2026-02-30, 2026-13-01, garbage, empty, null) | null | ✓ |
| Search grocer / hotel / empty / no-match / ফার্মেসি | 1 / 4 / 40 / 0 / 2 | ✓ |
| formatBDT ৳4,375 / ৳65,500 / ৳55,87,200; BN ৳৪,৩৭৫.০০ | lakh grouping + Bengali digits | ✓ |
| Export/import round-trip; wrong app / wrong version / bad record rejected | ok / rejected | ✓ |

Data checks: 40 categories, fees ৳500–৳50,000; 5 authorities with income
tax 3000/3000/3000/2000/1000; 7 + 5 guide steps; 10 checklist items.

Repairs: 1 test-side fix only — my expected Bengali-digit string for ৳4,375
was mistyped as ৪,৫৭৫ (the app's ৪,৩৭৫ was correct). 0 app-logic bugs.

## Headless-Chrome smoke — 70/70 pass

Command: `node tests/smoke.js` (raw CDP, headless_shell-1187, file://)
Run: 2026-11-10 ~14:16 +06. Result: 70 checks, 0 failed.

Hand-verified in the browser:

- Load: title mentions Trade License, subtitle present, 41 category options
  (40 + placeholder), authority defaults DNCC, kind defaults new, late input
  disabled for new, results hidden.
- Validation: calculate with no category shows the inline error.
- Grocer / DNCC / renewal / 10 sq ft / 0 late → total ৳4,375.00 with bill
  lines fee ৳500.00, signboard ৳800.00, VAT ৳75.00, income tax ৳3,000.00,
  surcharge ৳0.00.
- Five-star hotel / DSCC / new / 100 sq ft → ৳65,500.00.
- Save "Gulshan hotel" → saved list 1 item, total ৳65,500.00; persists
  across reload; load restores category hotel-5star and total ৳65,500.00.
- Fee table: 40 rows; search "hotel" → 4 rows; clear → 40; tap grocer row
  loads calculator and computes ৳575.00 (new, 0 sq ft).
- Deadline: 2026-11-10 → FY 2026–27, deadline 2026-09-30, 41 days overdue,
  1 month late, "Overdue" badge, apply-late button visible; 2026-08-01 →
  60 days left, "On time"; apply-late sets kind=renewal, months=1.
- Guides: 7 new + 5 renewal steps, 10 checklist items, progress "0 of 10"
  → check 2 → "2 of 10"; step + checklist state persist across reload.
- Export payload is trade-license-bd v1 and carries "Gulshan hotel";
  eraseAll empties saved; valid import restores it; wrong-app import
  rejected and leaves data intact; bad UI import shows error; good UI
  import succeeds.
- Typed-DELETE: wrong word rejected and keeps data; DELETE erases and
  shows the success message.
- BN toggle: title in Bengali, total ৳৪,৩৭৫.০০, tab label in Bengali;
  persists across reload; back to EN.
- 390px mobile: no horizontal overflow on all 6 tabs (calc, table,
  deadline, guides, saved, data).
- Zero non-file network requests; 0 console/page errors.

Repairs: 2 test-side fixes only — (1) the grocer tap-to-load check ran with
the signboard still at 100 from the hotel test (reset to 0 in the test);
(2) the same Bengali-digit typo as in the unit tests (৪,৫৭৫ → ৪,৩৭৫).
0 app-logic bugs.

## Ground truth

- All 40 category fees copied verbatim from the bdnewsnet Dhaka City
  Corporation fee list (Model Tax Schedule 2016); spot-checked 20+ rows
  against the page while writing the generator (see DATA_NOTES.md).
- Bill components (signboard ৳80/sq ft, 15% VAT, s.131 income tax bands,
  surcharge formula, 30 September deadline, FY 1 July–30 June) confirmed
  by trw.co's 2026 trade-licence-fee guide and cross-checked against
  bdadvocacy.com and learninggov.com.
- Pure-ASCII app sources (Bengali as \uXXXX escapes via .scratch/gen.py;
  grep zero non-ASCII matches in data.js / i18n.js).
