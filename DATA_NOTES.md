# DATA_NOTES.md — trade-license-bd

## What the numbers are

Every fee in this app is a **published schedule figure**, not a live quote.
The app is an estimator: it computes the bill the schedule implies, and it
says so on every screen (estimate-not-an-official-bill disclaimer + footer
sources).

## Sources (accessed 2026-11-10)

1. **Category fees (40 categories)** — City Corporation Model Tax Schedule
   2016 (SRO No. 13-Ain/2016, 28 January 2016), as listed for Dhaka City
   Corporation by bdnewsnet.com:
   https://bdnewsnet.com/wiki/trade-license-fee-list-dhaka-city-corporation-comilla/
   The page reproduces the schedule's per-business fees (500 business
   sub-types); this app ships a 40-category representative subset spanning
   every fee level from ৳300 (photo studio, small — not included) to
   ৳50,000. Included range: ৳500 (grocer, vegetable, tea-betel, fruit,
   newspaper, laundry-general, book seller small, stationery small, hair
   salon small, computer training) up to ৳50,000 (five-star hotel).
   Every included fee was copied verbatim from that table; spot checks:
   scheduled bank 10,000; private university 5,000; first-class contractor
   4,000; special-class contractor 6,000; builders 6,000; textile mill
   4,500; pharmaceutical factory 5,000; petrol pump 5,000; recruiting
   agent 5,000; warehouse 10,000; super shop 3,000; fast food 3,000;
   restaurant A/C 2,500 / non-A/C 1,000; pharmacy retail 1,000 /
   wholesale 2,500; private hospital above 40 beds 35,000; four-star
   hotel 25,000; two-star hotel 15,000.
2. **Bill components** — trw.co, "Trade License Fee Bangladesh 2026"
   (updated Oct 2026): https://trw.co/trade-license-fee-bangladesh/
   - Licence runs for the financial year (1 July – 30 June); renew by
     30 September.
   - Signboard tax ৳80 per sq ft.
   - 15% VAT on the licence fee.
   - Income tax at renewal under s.131 Income Tax Act 2023: ৳3,000 in
     Dhaka North, Dhaka South and Chattogram; ৳2,000 in other city
     corporations; ৳1,000 or ৳500 in paurashavas (the app uses ৳1,000).
   - Late surcharge: ৳100 per month or 10% of the trade licence fee per
     month, whichever is higher, after 30 September.
   - Limited companies pay by paid-up capital, ৳1,500–৳12,000 (not
     modelled — see Limitations in README).
3. **Process facts** — e-trade portal etradelicense.gov.bd; licences issued
   by DNCC/DSCC zonal offices; usual processing 3–7 working days
   (learninggov.com / deweyleboeuf.com guides, Nov 2025). The guide steps
   in the app are a plain-language summary of that standard process.

## Assumptions the app states openly

- **Months-late estimate:** the deadline checker estimates months late as
  floor(days overdue / 30), minimum 1 once overdue. The schedule charges
  per calendar month; the UI labels the figure "estimated".
- **Paurashava income tax:** ৳1,000 (the reported band is ৳1,000 or ৳500
  depending on paurashava class); the app uses the higher figure and the
  README notes it.
- **Union parishads:** not included — rates vary by union and were not
  verifiable to a single figure.
- **Category subset:** the 2016 schedule lists ~300 categories (and the
  bdnewsnet page ~500 sub-types). The app ships 40; if your business is
  not listed, use the closest category as a rough guide and confirm at
  the office.
- **No VAT on signboard tax or income tax:** VAT applies to the licence
  fee only, per the reported bill structure.
- **No other charges:** some offices add a small form fee / service
  charge; the app does not model those and says the total is an estimate.
