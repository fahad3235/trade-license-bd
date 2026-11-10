// trade-license-bd -- pure logic (node + browser).
// Trade licence fee estimator for Bangladesh.
// Bill rules (see DATA_NOTES.md):
//   licence fee = category fee from the City Corporation Model Tax Schedule
//     2016 (SRO 13-Ain/2016), as reported for Dhaka City Corporation.
//   signboard tax = 80 BDT per sq ft of signboard.
//   VAT = 15% of the licence fee.
//   income tax (renewal only, s.131 ITA 2023): DNCC/DSCC/Chattogram 3000,
//     other city corporation 2000, paurashava 1000.
//   late surcharge (renewal only, after 30 September): per month
//     max(100, 10% of licence fee). Months-late estimate for the deadline
//     checker is floor(days overdue / 30), minimum 1 once overdue.
// Money is integer paisa throughout; all bill lines are whole taka.
(function (root) {
  'use strict';

  var DATA = null;
  if (typeof require !== 'undefined') {
    try { DATA = require('./data.js'); } catch (e) { DATA = null; }
  }
  if (!DATA && root && root.TradeLicenseData) DATA = root.TradeLicenseData;
  if (!DATA) throw new Error('trade-license-bd: data.js not loaded');

  var APP = 'trade-license-bd';
  var VERSION = 1;

  function categoryById(id) {
    for (var i = 0; i < DATA.CATEGORIES.length; i++) {
      if (DATA.CATEGORIES[i].id === id) return DATA.CATEGORIES[i];
    }
    return null;
  }
  function authorityById(id) {
    for (var i = 0; i < DATA.AUTHORITIES.length; i++) {
      if (DATA.AUTHORITIES[i].id === id) return DATA.AUTHORITIES[i];
    }
    return null;
  }

  // ---- Validation ----
  // inp: { categoryId, authorityId, kind: 'new'|'renewal',
  //        signboardSqft, monthsLate }
  function validateInputs(inp) {
    var errors = [];
    if (!inp || typeof inp !== 'object') return ['invalid input'];
    if (!categoryById(inp.categoryId)) errors.push('category');
    if (!authorityById(inp.authorityId)) errors.push('authority');
    if (inp.kind !== 'new' && inp.kind !== 'renewal') errors.push('kind');
    if (!(inp.signboardSqft >= 0) || !isFinite(inp.signboardSqft) ||
        inp.signboardSqft > 10000) errors.push('signboard');
    if (inp.kind === 'renewal') {
      if (!(inp.monthsLate >= 0) || !isFinite(inp.monthsLate) ||
          Math.floor(inp.monthsLate) !== inp.monthsLate || inp.monthsLate > 12) {
        errors.push('monthsLate');
      }
    }
    return errors;
  }

  // ---- Core bill ----
  // Returns null when inputs are invalid.
  function calculateBill(inp) {
    if (validateInputs(inp).length) return null;
    var cat = categoryById(inp.categoryId);
    var auth = authorityById(inp.authorityId);
    var feePaisa = Math.round(cat.fee * 100);
    var signPaisa = Math.round(inp.signboardSqft * DATA.SIGNBOARD_RATE * 100);
    var vatPaisa = Math.round(feePaisa * DATA.VAT_RATE);
    var taxPaisa = 0;
    var surchargePaisa = 0;
    if (inp.kind === 'renewal') {
      taxPaisa = Math.round(auth.incomeTax * 100);
      if (inp.monthsLate > 0) {
        var perMonth = Math.max(
          Math.round(DATA.SURCHARGE_MIN * 100),
          Math.round(feePaisa * DATA.SURCHARGE_PCT));
        surchargePaisa = perMonth * inp.monthsLate;
      }
    }
    var totalPaisa = feePaisa + signPaisa + vatPaisa + taxPaisa + surchargePaisa;
    return {
      categoryId: inp.categoryId,
      authorityId: inp.authorityId,
      kind: inp.kind,
      signboardSqft: inp.signboardSqft,
      monthsLate: inp.kind === 'renewal' ? inp.monthsLate : 0,
      feePaisa: feePaisa,
      signPaisa: signPaisa,
      vatPaisa: vatPaisa,
      taxPaisa: taxPaisa,
      surchargePaisa: surchargePaisa,
      totalPaisa: totalPaisa,
      lines: [
        { id: 'fee', paisa: feePaisa },
        { id: 'sign', paisa: signPaisa },
        { id: 'vat', paisa: vatPaisa },
        { id: 'tax', paisa: taxPaisa },
        { id: 'surcharge', paisa: surchargePaisa },
      ],
    };
  }

  // ---- Renewal deadline ----
  // A licence runs for the financial year 1 July - 30 June and must be
  // renewed by 30 September of the FY start year.
  // dateStr: 'YYYY-MM-DD'. Returns null for a bad date.
  function deadlineStatus(dateStr) {
    if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    var parts = dateStr.split('-');
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    var date = new Date(Date.UTC(y, m - 1, d));
    if (isNaN(date.getTime()) || date.getUTCFullYear() !== y ||
        date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    var fyStart = m >= 7 ? y : y - 1;
    var deadline = new Date(Date.UTC(fyStart, DATA.RENEWAL_MONTH - 1, DATA.RENEWAL_DAY));
    var msPerDay = 24 * 60 * 60 * 1000;
    var daysDiff = Math.round((deadline.getTime() - date.getTime()) / msPerDay);
    var overdue = daysDiff < 0;
    var daysOverdue = overdue ? -daysDiff : 0;
    var monthsLate = overdue ? Math.max(1, Math.floor(daysOverdue / 30)) : 0;
    var status = overdue ? 'overdue' : (daysDiff <= 30 ? 'soon' : 'ok');
    return {
      date: dateStr,
      fyStart: fyStart,
      fyLabel: fyStart + '\u2013' + String(fyStart + 1).slice(2),
      deadline: fyStart + '-09-30',
      daysLeft: overdue ? 0 : daysDiff,
      daysOverdue: daysOverdue,
      monthsLate: monthsLate,
      status: status,
    };
  }

  // ---- Search ----
  function searchCategories(query) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return DATA.CATEGORIES.slice();
    return DATA.CATEGORIES.filter(function (c) {
      return c.name_en.toLowerCase().indexOf(q) >= 0 ||
        c.name_bn.toLowerCase().indexOf(q) >= 0 ||
        c.group_en.toLowerCase().indexOf(q) >= 0 ||
        c.group_bn.toLowerCase().indexOf(q) >= 0;
    });
  }

  // ---- Formatting ----
  var BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];
  function toBnDigits(s) {
    return String(s).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }
  function groupThousands(intStr) {
    // Bangladeshi grouping: last 3 digits, then groups of 2 (lakh style).
    var s = String(intStr);
    if (s.length <= 3) return s;
    var tail = s.slice(-3);
    var head = s.slice(0, -3);
    var parts = [];
    while (head.length > 2) { parts.unshift(head.slice(-2)); head = head.slice(0, -2); }
    if (head) parts.unshift(head);
    return parts.join(',') + ',' + tail;
  }
  // paisa (int) -> "Tk 55,87,200.00" (en) or Bengali-digit equivalent (bn).
  function formatBDT(paisa, lang) {
    var neg = paisa < 0;
    var abs = Math.abs(Math.round(paisa));
    var taka = Math.floor(abs / 100);
    var p = abs % 100;
    var out = '\u09f3' + groupThousands(taka) + '.' + (p < 10 ? '0' : '') + p;
    if (lang === 'bn') out = toBnDigits(out);
    return neg ? '-' + out : out;
  }
  function formatNumber(n, lang) {
    var s = String(n);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    s = parts.join('.');
    return lang === 'bn' ? toBnDigits(s) : s;
  }

  // ---- Saved estimates: validation + export/import ----
  function validateSavedRecord(r) {
    if (!r || typeof r !== 'object') return false;
    if (typeof r.id !== 'string' || !r.id) return false;
    if (typeof r.name !== 'string' || !r.name.trim()) return false;
    if (r.name.length > 80) return false;
    if (validateInputs({
      categoryId: r.categoryId, authorityId: r.authorityId, kind: r.kind,
      signboardSqft: r.signboardSqft, monthsLate: r.monthsLate,
    }).length) return false;
    if (!(r.totalPaisa > 0) || !isFinite(r.totalPaisa)) return false;
    if (typeof r.createdAt !== 'string' || !r.createdAt) return false;
    return true;
  }

  function exportPayload(saved, progress) {
    return JSON.stringify({ app: APP, version: VERSION, saved: saved, progress: progress || null }, null, 2);
  }

  function importPayload(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return { ok: false, error: 'not-json' }; }
    if (!data || data.app !== APP) return { ok: false, error: 'wrong-app' };
    if (data.version !== VERSION) return { ok: false, error: 'wrong-version' };
    if (!Array.isArray(data.saved)) return { ok: false, error: 'bad-saved' };
    for (var i = 0; i < data.saved.length; i++) {
      if (!validateSavedRecord(data.saved[i])) return { ok: false, error: 'bad-record:' + i };
    }
    if (data.progress !== undefined && data.progress !== null) {
      if (typeof data.progress !== 'object') return { ok: false, error: 'bad-progress' };
      if (data.progress.guides) {
        var g = data.progress.guides;
        if (typeof g !== 'object') return { ok: false, error: 'bad-progress' };
        var ok = true;
        Object.keys(g).forEach(function (k) {
          if (k !== 'new' && k !== 'renewal') ok = false;
          if (!Array.isArray(g[k])) ok = false;
        });
        if (!ok) return { ok: false, error: 'bad-progress' };
      }
      if (data.progress.checklist && !Array.isArray(data.progress.checklist)) {
        return { ok: false, error: 'bad-progress' };
      }
    }
    return { ok: true, data: data };
  }

  var api = {
    APP: APP, VERSION: VERSION,
    CATEGORIES: DATA.CATEGORIES, AUTHORITIES: DATA.AUTHORITIES,
    GUIDES: DATA.GUIDES, CHECKLIST: DATA.CHECKLIST,
    SIGNBOARD_RATE: DATA.SIGNBOARD_RATE, VAT_RATE: DATA.VAT_RATE,
    categoryById: categoryById, authorityById: authorityById,
    validateInputs: validateInputs, calculateBill: calculateBill,
    deadlineStatus: deadlineStatus, searchCategories: searchCategories,
    toBnDigits: toBnDigits, groupThousands: groupThousands,
    formatBDT: formatBDT, formatNumber: formatNumber,
    validateSavedRecord: validateSavedRecord,
    exportPayload: exportPayload, importPayload: importPayload,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TradeLicense = api;
})(typeof window !== 'undefined' ? window : globalThis);
