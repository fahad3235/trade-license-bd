// trade-license-bd -- node unit tests for logic.js (pure engine).
// Run: node --test tests/logic.test.js
// All expected values were hand-computed; see TEST_RESULTS.md.
const test = require('node:test');
const assert = require('node:assert/strict');
const TL = require('../logic.js');

const BDT = (taka) => Math.round(taka * 100); // BDT -> paisa

test('data: 40 categories, fees 500..50000, 5 authorities', () => {
  assert.equal(TL.CATEGORIES.length, 40);
  const fees = TL.CATEGORIES.map((c) => c.fee);
  assert.equal(Math.min(...fees), 500);
  assert.equal(Math.max(...fees), 50000);
  assert.equal(TL.categoryById('hotel-5star').fee, 50000);
  assert.equal(TL.categoryById('grocer').fee, 500);
  assert.equal(TL.AUTHORITIES.length, 5);
  assert.equal(TL.authorityById('dncc').incomeTax, 3000);
  assert.equal(TL.authorityById('dscc').incomeTax, 3000);
  assert.equal(TL.authorityById('ctg').incomeTax, 3000);
  assert.equal(TL.authorityById('other-cc').incomeTax, 2000);
  assert.equal(TL.authorityById('paurashava').incomeTax, 1000);
  assert.equal(TL.SIGNBOARD_RATE, 80);
  assert.equal(TL.VAT_RATE, 0.15);
});

test('bill: grocer, DNCC renewal, 10 sqft, 0 late = 4375', () => {
  const b = TL.calculateBill({
    categoryId: 'grocer', authorityId: 'dncc', kind: 'renewal',
    signboardSqft: 10, monthsLate: 0,
  });
  assert.ok(b);
  assert.equal(b.feePaisa, BDT(500));
  assert.equal(b.signPaisa, BDT(800)); // 10 x 80
  assert.equal(b.vatPaisa, BDT(75)); // 15% of 500
  assert.equal(b.taxPaisa, BDT(3000));
  assert.equal(b.surchargePaisa, 0);
  assert.equal(b.totalPaisa, BDT(4375));
  const sum = b.lines.reduce((a, l) => a + l.paisa, 0);
  assert.equal(sum, b.totalPaisa);
});

test('bill: five-star hotel, DSCC new, 100 sqft = 65500 (no income tax, no surcharge)', () => {
  const b = TL.calculateBill({
    categoryId: 'hotel-5star', authorityId: 'dscc', kind: 'new',
    signboardSqft: 100, monthsLate: 0,
  });
  assert.ok(b);
  assert.equal(b.feePaisa, BDT(50000));
  assert.equal(b.signPaisa, BDT(8000));
  assert.equal(b.vatPaisa, BDT(7500));
  assert.equal(b.taxPaisa, 0);
  assert.equal(b.surchargePaisa, 0);
  assert.equal(b.totalPaisa, BDT(65500));
});

test('bill: restaurant A/C, other CC renewal, 20 sqft, 2 late = 6975', () => {
  const b = TL.calculateBill({
    categoryId: 'restaurant-ac', authorityId: 'other-cc', kind: 'renewal',
    signboardSqft: 20, monthsLate: 2,
  });
  assert.ok(b);
  assert.equal(b.feePaisa, BDT(2500));
  assert.equal(b.signPaisa, BDT(1600));
  assert.equal(b.vatPaisa, BDT(375));
  assert.equal(b.taxPaisa, BDT(2000));
  assert.equal(b.surchargePaisa, BDT(500)); // 2 x max(100, 10% of 2500=250)
  assert.equal(b.totalPaisa, BDT(6975));
});

test('bill: pharmacy retail, paurashava renewal, 0 sqft, 3 late = 2450 (surcharge floor 100/mo)', () => {
  const b = TL.calculateBill({
    categoryId: 'pharmacy-retail', authorityId: 'paurashava', kind: 'renewal',
    signboardSqft: 0, monthsLate: 3,
  });
  assert.ok(b);
  assert.equal(b.feePaisa, BDT(1000));
  assert.equal(b.signPaisa, 0);
  assert.equal(b.vatPaisa, BDT(150));
  assert.equal(b.taxPaisa, BDT(1000));
  assert.equal(b.surchargePaisa, BDT(300)); // 3 x max(100, 10% of 1000=100)
  assert.equal(b.totalPaisa, BDT(2450));
});

test('bill: surcharge floor wins for small fees (grocer 3 late = 300, not 150)', () => {
  const b = TL.calculateBill({
    categoryId: 'grocer', authorityId: 'dncc', kind: 'renewal',
    signboardSqft: 0, monthsLate: 3,
  });
  assert.equal(b.surchargePaisa, BDT(300)); // 3 x max(100, 50) = 300
  assert.equal(b.totalPaisa, BDT(500 + 75 + 3000 + 300));
});

test('bill: new licence ignores monthsLate (tax + surcharge stay 0)', () => {
  const b = TL.calculateBill({
    categoryId: 'grocer', authorityId: 'dncc', kind: 'new',
    signboardSqft: 0, monthsLate: 5,
  });
  assert.ok(b);
  assert.equal(b.taxPaisa, 0);
  assert.equal(b.surchargePaisa, 0);
  assert.equal(b.monthsLate, 0);
  assert.equal(b.totalPaisa, BDT(575));
});

test('validate: unknown category / authority / kind rejected', () => {
  const base = { categoryId: 'grocer', authorityId: 'dncc', kind: 'new', signboardSqft: 0, monthsLate: 0 };
  assert.deepEqual(TL.validateInputs({ ...base, categoryId: 'nope' }), ['category']);
  assert.deepEqual(TL.validateInputs({ ...base, authorityId: 'nope' }), ['authority']);
  assert.deepEqual(TL.validateInputs({ ...base, kind: 'maybe' }), ['kind']);
  assert.deepEqual(TL.validateInputs({ ...base, signboardSqft: 10001 }), ['signboard']);
  assert.deepEqual(TL.validateInputs({ ...base, signboardSqft: -1 }), ['signboard']);
  assert.deepEqual(
    TL.validateInputs({ ...base, kind: 'renewal', monthsLate: 13 }), ['monthsLate']);
  assert.deepEqual(
    TL.validateInputs({ ...base, kind: 'renewal', monthsLate: -1 }), ['monthsLate']);
  assert.deepEqual(
    TL.validateInputs({ ...base, kind: 'renewal', monthsLate: 1.5 }), ['monthsLate']);
  assert.equal(TL.calculateBill({ ...base, categoryId: 'nope' }), null);
});

test('deadline: 2026-11-10 -> FY 2026-27, overdue 41 days, 1 month late', () => {
  const st = TL.deadlineStatus('2026-11-10');
  assert.ok(st);
  assert.equal(st.fyStart, 2026);
  assert.equal(st.fyLabel, '2026\u201327');
  assert.equal(st.deadline, '2026-09-30');
  assert.equal(st.daysOverdue, 41);
  assert.equal(st.daysLeft, 0);
  assert.equal(st.monthsLate, 1);
  assert.equal(st.status, 'overdue');
});

test('deadline: 2026-09-15 -> 15 days left, due soon; 2026-08-01 -> 60 days, ok', () => {
  const soon = TL.deadlineStatus('2026-09-15');
  assert.equal(soon.daysLeft, 15);
  assert.equal(soon.status, 'soon');
  assert.equal(soon.monthsLate, 0);
  const ok = TL.deadlineStatus('2026-08-01');
  assert.equal(ok.daysLeft, 60);
  assert.equal(ok.status, 'ok');
  assert.equal(ok.fyStart, 2026);
});

test('deadline: 2026-09-30 is the last day (0 days left, still soon, not overdue)', () => {
  const st = TL.deadlineStatus('2026-09-30');
  assert.equal(st.daysLeft, 0);
  assert.equal(st.status, 'soon');
  assert.equal(st.monthsLate, 0);
});

test('deadline: 2027-03-15 belongs to FY 2026-27, 166 days overdue, 5 months late', () => {
  const st = TL.deadlineStatus('2027-03-15');
  assert.equal(st.fyStart, 2026);
  assert.equal(st.daysOverdue, 166);
  assert.equal(st.monthsLate, 5);
  assert.equal(st.status, 'overdue');
});

test('deadline: 2026-07-01 starts FY 2026-27 with 91 days left', () => {
  const st = TL.deadlineStatus('2026-07-01');
  assert.equal(st.fyStart, 2026);
  assert.equal(st.daysLeft, 91);
  assert.equal(st.status, 'ok');
});

test('deadline: invalid dates return null', () => {
  assert.equal(TL.deadlineStatus('2026-02-30'), null);
  assert.equal(TL.deadlineStatus('not-a-date'), null);
  assert.equal(TL.deadlineStatus('2026-13-01'), null);
  assert.equal(TL.deadlineStatus(''), null);
  assert.equal(TL.deadlineStatus(null), null);
});

test('search: grocer -> 1, hotel -> 4, empty -> all 40', () => {
  assert.equal(TL.searchCategories('grocer').length, 1);
  assert.equal(TL.searchCategories('hotel').length, 4);
  assert.equal(TL.searchCategories('').length, 40);
  assert.equal(TL.searchCategories('zzz-no-match').length, 0);
  assert.equal(TL.searchCategories('ফার্মেসি').length, 2);
});

test('formatBDT: lakh grouping + Bengali digits', () => {
  assert.equal(TL.formatBDT(BDT(4375), 'en'), '\u09f34,375.00');
  assert.equal(TL.formatBDT(BDT(65500), 'en'), '\u09f365,500.00');
  assert.equal(TL.formatBDT(BDT(5587200), 'en'), '\u09f355,87,200.00');
  assert.equal(TL.formatBDT(BDT(4375), 'bn'), '\u09f3\u09ea,\u09e9\u09ed\u09eb.\u09e6\u09e6'); // ৪,৩৭৫.০০
  assert.equal(TL.groupThousands('5587200'), '55,87,200');
  assert.equal(TL.groupThousands('500'), '500');
  assert.equal(TL.formatNumber(40, 'bn'), '\u09ea\u09e6');
});

test('guides + checklist data shape', () => {
  assert.equal(TL.GUIDES['new'].length, 7);
  assert.equal(TL.GUIDES.renewal.length, 5);
  TL.GUIDES['new'].forEach((s) => {
    assert.ok(s.title_en.length > 3 && s.title_bn.length > 3);
    assert.ok(s.body_en.length > 20 && s.body_bn.length > 10);
  });
  assert.equal(TL.CHECKLIST.length, 10);
});

test('export/import: round-trip, wrong app, bad json, bad record rejected', () => {
  const rec = {
    id: 'est-abc', name: 'Mirpur grocery', categoryId: 'grocer',
    authorityId: 'dncc', kind: 'renewal', signboardSqft: 10, monthsLate: 0,
    totalPaisa: BDT(4375), createdAt: '2026-11-10',
  };
  assert.equal(TL.validateSavedRecord(rec), true);
  assert.equal(TL.validateSavedRecord({ ...rec, name: '' }), false);
  assert.equal(TL.validateSavedRecord({ ...rec, categoryId: 'nope' }), false);
  assert.equal(TL.validateSavedRecord({ ...rec, totalPaisa: 0 }), false);
  const payload = TL.exportPayload([rec], { guides: { 'new': [true, false, false, false, false, false, false], renewal: [false, false, false, false, false] }, checklist: [true, false, false, false, false, false, false, false, false, false] });
  const imp = TL.importPayload(payload);
  assert.equal(imp.ok, true);
  assert.equal(imp.data.saved.length, 1);
  assert.equal(imp.data.saved[0].name, 'Mirpur grocery');
  assert.equal(TL.importPayload('{not json').ok, false);
  assert.equal(TL.importPayload('{"app":"land-tax-bd","version":1,"saved":[]}').ok, false);
  assert.equal(TL.importPayload('{"app":"trade-license-bd","version":2,"saved":[]}').ok, false);
  assert.equal(TL.importPayload('{"app":"trade-license-bd","version":1,"saved":[{"id":"x"}]}').ok, false);
});
