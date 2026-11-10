// trade-license-bd -- UI wiring (browser only).
(function () {
  'use strict';
  var TL = window.TradeLicense;
  var STR = window.TradeLicenseI18n.STR;
  var LS_LANG = 'tlbd.lang';
  var LS_SAVED = 'tlbd.saved';
  var LS_PROGRESS = 'tlbd.progress';

  var state = {
    lang: 'en',
    saved: [],
    progress: { guides: { 'new': [], renewal: [] }, checklist: [] },
    lastBill: null,
    lastInput: null,
    lastDeadline: null,
  };

  function $(id) { return document.getElementById(id); }
  function t(key) { return STR[state.lang][key] || STR.en[key] || key; }
  function fmt(paisa) { return TL.formatBDT(paisa, state.lang); }
  function num(n) { return TL.formatNumber(n, state.lang); }
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function catName(c) { return state.lang === 'bn' ? c.name_bn : c.name_en; }
  function authName(a) { return state.lang === 'bn' ? a.name_bn : a.name_en; }

  function defaultProgress() {
    return {
      guides: {
        'new': TL.GUIDES['new'].map(function () { return false; }),
        renewal: TL.GUIDES.renewal.map(function () { return false; }),
      },
      checklist: TL.CHECKLIST.map(function () { return false; }),
    };
  }

  function loadPersisted() {
    try {
      var lang = localStorage.getItem(LS_LANG);
      if (lang === 'bn' || lang === 'en') state.lang = lang;
      var saved = JSON.parse(localStorage.getItem(LS_SAVED) || 'null');
      if (Array.isArray(saved)) state.saved = saved.filter(TL.validateSavedRecord);
      var prog = JSON.parse(localStorage.getItem(LS_PROGRESS) || 'null');
      if (prog && prog.guides && prog.checklist) {
        var d = defaultProgress();
        ['new', 'renewal'].forEach(function (k) {
          if (Array.isArray(prog.guides[k]) && prog.guides[k].length === d.guides[k].length) {
            d.guides[k] = prog.guides[k].map(Boolean);
          }
        });
        if (Array.isArray(prog.checklist) && prog.checklist.length === d.checklist.length) {
          d.checklist = prog.checklist.map(Boolean);
        }
        state.progress = d;
      }
    } catch (e) { /* corrupted storage -> defaults */ }
  }
  function persist() {
    try {
      localStorage.setItem(LS_LANG, state.lang);
      localStorage.setItem(LS_SAVED, JSON.stringify(state.saved));
      localStorage.setItem(LS_PROGRESS, JSON.stringify(state.progress));
    } catch (e) { /* storage unavailable */ }
  }

  // ---------- Tabs ----------
  var TABS = ['calc', 'table', 'deadline', 'guides', 'saved', 'data'];
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    TABS.forEach(function (n) { $('panel-' + n).hidden = n !== name; });
    if (name === 'saved') renderSaved();
    if (name === 'table') renderTable();
    if (name === 'guides') renderGuides();
  }

  // ---------- i18n ----------
  function applyI18n() {
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    $('title').textContent = t('title');
    $('subtitle').textContent = t('subtitle');
    $('langBtn').textContent = state.lang === 'bn' ? 'English' : '\u09ac\u09be\u0982\u09b2\u09be';
    $('tab-calc').textContent = t('tabCalc');
    $('tab-table').textContent = t('tabTable');
    $('tab-deadline').textContent = t('tabDeadline');
    $('tab-guides').textContent = t('tabGuides');
    $('tab-saved').textContent = t('tabSaved');
    $('tab-data').textContent = t('tabData');
    $('catLabel').textContent = t('catLabel');
    $('catHint').textContent = t('catHint');
    $('authLabel').textContent = t('authLabel');
    $('kindLabel').textContent = t('kindLabel');
    $('signLabel').textContent = t('signLabel');
    $('signHint').textContent = t('signHint');
    $('lateLabel').textContent = t('lateLabel');
    $('lateHint').textContent = t('lateHint');
    $('calcBtn').textContent = t('calcBtn');
    $('billTitle').textContent = t('billTitle');
    $('totalLabel').textContent = t('lineTotal');
    $('saveNameLabel').textContent = t('saveNameLabel');
    $('saveName').placeholder = t('saveNamePh');
    $('saveBtn').textContent = t('saveBtn');
    $('tableTitle').textContent = t('tableTitle');
    $('tableNote').textContent = t('tableNote');
    $('tableSearch').placeholder = t('tableSearchPh');
    $('thBusiness').textContent = t('thBusiness');
    $('thFee').textContent = t('thFee');
    $('deadlineTitle').textContent = t('deadlineTitle');
    $('deadlineNote').textContent = t('deadlineNote');
    $('dateLabel').textContent = t('dateLabel');
    $('checkBtn').textContent = t('checkBtn');
    $('fyLabel').textContent = t('fyLabel');
    $('dlLabel').textContent = t('deadlineLabel');
    $('daysLabel').textContent = state.lang === 'bn' ? '' : '';
    $('monthsLabel').textContent = t('monthsLateEst');
    $('applyLateBtn').textContent = t('applyLateBtn');
    $('guidesTitle').textContent = t('guidesTitle');
    $('guideNewTitle').textContent = t('guideNewTitle');
    $('guideRenTitle').textContent = t('guideRenTitle');
    $('checklistTitle').textContent = t('checklistTitle');
    $('savedTitle').textContent = t('savedTitle');
    $('savedTotalLabel').textContent = t('savedTotal');
    $('dataTitle').textContent = t('tabData');
    $('exportBtn').textContent = t('exportBtn');
    $('importBtn').textContent = t('importBtn');
    $('importLabel').textContent = t('importBtn');
    $('importText').placeholder = t('importPh');
    $('eraseTitle').textContent = t('eraseTitle');
    $('eraseHint').textContent = t('eraseHint');
    $('eraseBtn').textContent = t('eraseBtn');
    $('disclaimer').textContent = t('disclaimer');
    $('footNote').textContent = t('footNote');
    renderCatSelect();
    renderAuthSelect();
    renderKindSelect();
    renderTable();
    renderGuides();
    if (state.lastBill) renderBill(state.lastBill, state.lastInput);
    if (state.lastDeadline) renderDeadline(state.lastDeadline);
    renderSaved();
  }

  function renderCatSelect() {
    var sel = $('catSelect');
    var cur = sel.value || '';
    sel.innerHTML = '';
    var ph = document.createElement('option');
    ph.value = '';
    ph.textContent = t('catPh');
    sel.appendChild(ph);
    TL.CATEGORIES.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.id;
      o.textContent = catName(c) + ' \u2014 ' + fmt(c.fee * 100);
      sel.appendChild(o);
    });
    sel.value = cur;
  }

  function renderAuthSelect() {
    var sel = $('authSelect');
    var cur = sel.value || 'dncc';
    sel.innerHTML = '';
    TL.AUTHORITIES.forEach(function (a) {
      var o = document.createElement('option');
      o.value = a.id;
      o.textContent = authName(a);
      sel.appendChild(o);
    });
    sel.value = cur;
  }

  function renderKindSelect() {
    var sel = $('kindSelect');
    var cur = sel.value || 'new';
    sel.innerHTML = '';
    [['new', t('kindNew')], ['renewal', t('kindRenewal')]].forEach(function (kv) {
      var o = document.createElement('option');
      o.value = kv[0];
      o.textContent = kv[1];
      sel.appendChild(o);
    });
    sel.value = cur;
    $('lateInput').disabled = sel.value !== 'renewal';
  }

  // ---------- Calculator ----------
  function readForm() {
    return {
      categoryId: $('catSelect').value,
      authorityId: $('authSelect').value,
      kind: $('kindSelect').value,
      signboardSqft: parseFloat($('signInput').value),
      monthsLate: parseInt($('lateInput').value, 10) || 0,
    };
  }

  function calculate(ev) {
    if (ev) ev.preventDefault();
    var inp = readForm();
    var errs = TL.validateInputs(inp);
    var errEl = $('calcError');
    $('catSelect').classList.toggle('invalid', errs.indexOf('category') >= 0);
    $('signInput').classList.toggle('invalid', errs.indexOf('signboard') >= 0);
    $('lateInput').classList.toggle('invalid', errs.indexOf('monthsLate') >= 0);
    if (errs.length) {
      errEl.textContent = errs.indexOf('category') >= 0 ? t('errCat')
        : errs.indexOf('signboard') >= 0 ? t('errSign') : t('errLate');
      errEl.hidden = false;
      $('results').hidden = true;
      state.lastBill = null;
      return;
    }
    errEl.hidden = true;
    var bill = TL.calculateBill(inp);
    state.lastBill = bill;
    state.lastInput = inp;
    renderBill(bill, inp);
    $('results').hidden = false;
    $('saveOk').hidden = true;
    $('saveError').hidden = true;
  }

  function renderBill(bill, inp) {
    var box = $('billLines');
    box.innerHTML = '';
    var labels = { fee: 'lineFee', sign: 'lineSign', vat: 'lineVat', tax: 'lineTax', surcharge: 'lineSurcharge' };
    bill.lines.forEach(function (line) {
      var row = document.createElement('div');
      row.className = 'bill-line';
      var nm = document.createElement('span');
      nm.textContent = t(labels[line.id]);
      var amt = document.createElement('strong');
      amt.textContent = fmt(line.paisa);
      row.appendChild(nm);
      row.appendChild(amt);
      box.appendChild(row);
    });
    $('totalValue').textContent = fmt(bill.totalPaisa);
    var cat = TL.categoryById(inp.categoryId);
    var auth = TL.authorityById(inp.authorityId);
    $('resultMeta').textContent = catName(cat) + ' \u00b7 ' + authName(auth) + ' \u00b7 ' +
      (inp.kind === 'renewal' ? t('kindRenewal') : t('kindNew')) +
      ' \u00b7 ' + num(inp.signboardSqft) + ' ' + t('sqft');
  }

  function saveEstimate() {
    var errEl = $('saveError');
    var okEl = $('saveOk');
    errEl.hidden = true; okEl.hidden = true;
    if (!state.lastBill) { errEl.textContent = t('needCalcFirst'); errEl.hidden = false; return; }
    var name = $('saveName').value.trim();
    if (!name) { errEl.textContent = t('nameRequired'); errEl.hidden = false; return; }
    var rec = {
      id: 'est-' + Date.now().toString(36),
      name: name,
      categoryId: state.lastInput.categoryId,
      authorityId: state.lastInput.authorityId,
      kind: state.lastInput.kind,
      signboardSqft: state.lastInput.signboardSqft,
      monthsLate: state.lastInput.monthsLate,
      totalPaisa: state.lastBill.totalPaisa,
      createdAt: todayStr(),
    };
    if (!TL.validateSavedRecord(rec)) { errEl.textContent = t('needCalcFirst'); errEl.hidden = false; return; }
    state.saved.push(rec);
    persist();
    $('saveName').value = '';
    okEl.textContent = t('estimateSaved');
    okEl.hidden = false;
    renderSaved();
  }

  // ---------- Fee table ----------
  function renderTable() {
    var q = $('tableSearch').value || '';
    var rows = TL.searchCategories(q);
    var body = $('tableBody');
    body.innerHTML = '';
    rows.forEach(function (c) {
      var tr = document.createElement('tr');
      tr.className = 'clickable';
      tr.dataset.cat = c.id;
      var td1 = document.createElement('td');
      td1.textContent = catName(c) + ' (' + (state.lang === 'bn' ? c.group_bn : c.group_en) + ')';
      var td2 = document.createElement('td');
      td2.textContent = fmt(c.fee * 100);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.addEventListener('click', function () {
        $('catSelect').value = c.id;
        showTab('calc');
        calculate();
      });
      body.appendChild(tr);
    });
    $('tableCount').textContent = t('tableCount').replace('{n}', num(rows.length));
    $('tableEmpty').hidden = rows.length > 0;
    if (!rows.length) $('tableEmpty').textContent = t('searchNoMatch');
  }

  // ---------- Deadline ----------
  function checkDeadline() {
    var val = $('dateInput').value;
    if (!val) { $('dateInput').value = todayStr(); val = todayStr(); }
    var st = TL.deadlineStatus(val);
    if (!st) return;
    state.lastDeadline = st;
    renderDeadline(st);
    $('deadlineResult').hidden = false;
  }

  function renderDeadline(st) {
    $('fyValue').textContent = st.fyLabel;
    $('dlValue').textContent = st.deadline;
    if (st.status === 'overdue') {
      $('daysLabel').textContent = t('daysOverdue');
      $('daysValue').textContent = num(st.daysOverdue);
    } else {
      $('daysLabel').textContent = t('daysLeft');
      $('daysValue').textContent = num(st.daysLeft);
    }
    $('monthsValue').textContent = num(st.monthsLate) + ' ' + t(st.monthsLate === 1 ? 'month' : 'months');
    var badge = $('statusBadge');
    badge.className = 'status ' + st.status;
    badge.textContent = st.status === 'overdue' ? t('statusOverdue')
      : st.status === 'soon' ? t('statusSoon') : t('statusOk');
    $('applyLateBtn').hidden = st.status !== 'overdue';
  }

  function applyLate() {
    if (!state.lastDeadline) return;
    $('kindSelect').value = 'renewal';
    renderKindSelect();
    $('lateInput').value = String(state.lastDeadline.monthsLate);
    showTab('calc');
  }

  // ---------- Guides + checklist ----------
  function renderGuides() {
    [['new', 'guideNewList'], ['renewal', 'guideRenList']].forEach(function (pair) {
      var key = pair[0];
      var list = $(pair[1]);
      list.innerHTML = '';
      TL.GUIDES[key].forEach(function (step, i) {
        var li = document.createElement('li');
        var done = !!state.progress.guides[key][i];
        li.className = done ? 'done' : '';
        var lab = document.createElement('label');
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = done;
        cb.addEventListener('change', function () {
          state.progress.guides[key][i] = cb.checked;
          persist();
          renderGuides();
        });
        var wrap = document.createElement('span');
        var tt = document.createElement('span');
        tt.className = 'step-title';
        tt.textContent = (i + 1) + '. ' + (state.lang === 'bn' ? step.title_bn : step.title_en);
        var bd = document.createElement('span');
        bd.className = 'step-body';
        bd.textContent = state.lang === 'bn' ? step.body_bn : step.body_en;
        wrap.appendChild(tt);
        wrap.appendChild(bd);
        lab.appendChild(cb);
        lab.appendChild(wrap);
        li.appendChild(lab);
        list.appendChild(li);
      });
    });
    var box = $('checklist');
    box.innerHTML = '';
    var doneCount = 0;
    TL.CHECKLIST.forEach(function (item, i) {
      var done = !!state.progress.checklist[i];
      if (done) doneCount++;
      var lab = document.createElement('label');
      if (done) lab.className = 'done';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = done;
      cb.addEventListener('change', function () {
        state.progress.checklist[i] = cb.checked;
        persist();
        renderGuides();
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' ' + (state.lang === 'bn' ? item.name_bn : item.name_en)));
      box.appendChild(lab);
    });
    $('checklistProgress').textContent = t('checklistProgress')
      .replace('{done}', num(doneCount)).replace('{total}', num(TL.CHECKLIST.length));
  }

  // ---------- Saved ----------
  function renderSaved() {
    var list = $('savedList');
    list.innerHTML = '';
    var total = 0;
    state.saved.forEach(function (rec) {
      total += rec.totalPaisa;
      var li = document.createElement('li');
      var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = rec.name;
      var cat = TL.categoryById(rec.categoryId);
      var auth = TL.authorityById(rec.authorityId);
      var dt = document.createElement('span'); dt.className = 'dt';
      dt.textContent = rec.createdAt + ' \u00b7 ' + (cat ? catName(cat) : rec.categoryId) +
        ' \u00b7 ' + (auth ? authName(auth) : rec.authorityId) +
        ' \u00b7 ' + (rec.kind === 'renewal' ? t('kindRenewal') : t('kindNew'));
      var amt = document.createElement('span'); amt.className = 'amt'; amt.textContent = fmt(rec.totalPaisa);
      var load = document.createElement('button'); load.className = 'btn mini'; load.type = 'button';
      load.textContent = t('loadBtn');
      load.addEventListener('click', function () { loadSaved(rec); });
      var del = document.createElement('button'); del.className = 'btn mini'; del.type = 'button';
      del.textContent = t('deleteBtn');
      del.addEventListener('click', function () {
        if (window.confirm(t('confirmDelete'))) {
          state.saved = state.saved.filter(function (r) { return r.id !== rec.id; });
          persist(); renderSaved();
        }
      });
      li.appendChild(nm); li.appendChild(dt); li.appendChild(amt); li.appendChild(load); li.appendChild(del);
      list.appendChild(li);
    });
    $('savedEmpty').hidden = state.saved.length > 0;
    if (!state.saved.length) $('savedEmpty').textContent = t('savedEmpty');
    $('savedTotalValue').textContent = fmt(total);
  }

  function loadSaved(rec) {
    $('catSelect').value = rec.categoryId;
    $('authSelect').value = rec.authorityId;
    $('kindSelect').value = rec.kind;
    renderKindSelect();
    $('signInput').value = rec.signboardSqft;
    $('lateInput').value = rec.monthsLate;
    $('saveName').value = rec.name;
    calculate();
    showTab('calc');
    var m = $('loadedMsg');
    m.textContent = t('loadedMsg');
    m.hidden = false;
    setTimeout(function () { m.hidden = true; }, 4000);
  }

  // ---------- Data: export / import / erase ----------
  function exportPayload() { return TL.exportPayload(state.saved, state.progress); }

  function doExport() {
    var blob = new Blob([exportPayload()], { type: 'application/json' });
    var a = $('downloadLink');
    a.href = URL.createObjectURL(blob);
    a.hidden = false;
    a.click();
  }

  function importPayloadText(text) {
    var res = TL.importPayload(text);
    var okEl = $('importOk');
    var failEl = $('importFail');
    okEl.hidden = true; failEl.hidden = true;
    if (!res.ok) {
      failEl.textContent = t('importFail') + ' (' + res.error + ')';
      failEl.hidden = false;
      return res;
    }
    state.saved = res.data.saved;
    if (res.data.progress) {
      var d = defaultProgress();
      if (res.data.progress.guides) {
        ['new', 'renewal'].forEach(function (k) {
          if (Array.isArray(res.data.progress.guides[k]) &&
              res.data.progress.guides[k].length === d.guides[k].length) {
            d.guides[k] = res.data.progress.guides[k].map(Boolean);
          }
        });
      }
      if (Array.isArray(res.data.progress.checklist) &&
          res.data.progress.checklist.length === d.checklist.length) {
        d.checklist = res.data.progress.checklist.map(Boolean);
      }
      state.progress = d;
    }
    persist();
    renderSaved();
    renderGuides();
    okEl.textContent = t('importOk');
    okEl.hidden = false;
    return res;
  }

  function eraseAll() {
    try {
      localStorage.removeItem(LS_LANG);
      localStorage.removeItem(LS_SAVED);
      localStorage.removeItem(LS_PROGRESS);
    } catch (e) { /* ignore */ }
    state.saved = [];
    state.progress = defaultProgress();
    state.lastBill = null;
    state.lastInput = null;
    state.lastDeadline = null;
    $('results').hidden = true;
    $('deadlineResult').hidden = true;
    renderSaved();
    renderGuides();
  }

  // ---------- Wire up ----------
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab); });
  });
  $('langBtn').addEventListener('click', function () {
    state.lang = state.lang === 'bn' ? 'en' : 'bn';
    persist();
    applyI18n();
  });
  $('calcForm').addEventListener('submit', calculate);
  $('kindSelect').addEventListener('change', renderKindSelect);
  $('saveBtn').addEventListener('click', saveEstimate);
  $('tableSearch').addEventListener('input', renderTable);
  $('checkBtn').addEventListener('click', checkDeadline);
  $('applyLateBtn').addEventListener('click', applyLate);
  $('exportBtn').addEventListener('click', doExport);
  $('importBtn').addEventListener('click', function () {
    importPayloadText($('importText').value);
  });
  $('eraseBtn').addEventListener('click', function () {
    var wrong = $('eraseWrong');
    var done = $('erasedMsg');
    wrong.hidden = true; done.hidden = true;
    if ($('eraseInput').value.trim() !== 'DELETE') {
      wrong.textContent = t('eraseWrong');
      wrong.hidden = false;
      return;
    }
    eraseAll();
    $('eraseInput').value = '';
    done.textContent = t('erasedMsg');
    done.hidden = false;
  });

  state.progress = defaultProgress();
  loadPersisted();
  $('dateInput').value = todayStr();
  applyI18n();

  // Test hooks (deterministic checks only; no secrets).
  window.__tlbd = {
    state: state,
    todayStr: todayStr,
    exportPayload: exportPayload,
    importPayload: importPayloadText,
    eraseAll: eraseAll,
    calculateBill: function (inp) { return TL.calculateBill(inp); },
    deadlineStatus: function (d) { return TL.deadlineStatus(d); },
  };
})();
