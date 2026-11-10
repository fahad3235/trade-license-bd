// trade-license-bd -- headless-Chrome smoke test via raw CDP (no puppeteer).
// Usage: node tests/smoke.js
// Exits non-zero on any failed assertion; fails on page console errors.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 9360;
const BASE = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?asof=2026-11-10';
let failures = 0;
let count = 0;
const pageErrors = [];
function check(name, cond, extra) {
  count++;
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (cond ? '' : ' :: ' + (extra || '')));
  if (!cond) failures++;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const CHROME_BIN = process.env.CHROME_BIN ||
    require('os').homedir() + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
  const chrome = spawn(CHROME_BIN, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/tlbd-smoke-' + process.pid,
    'about:blank',
  ], { stdio: 'ignore' });
  let targets = [];
  for (let i = 0; i < 50 && targets.length === 0; i++) {
    await wait(200);
    try {
      targets = JSON.parse(await new Promise((res, rej) => {
        http.get('http://127.0.0.1:' + PORT + '/json/list', (r) => {
          let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d));
        }).on('error', rej);
      }));
    } catch (e) { /* retry */ }
  }
  if (!targets.length) { console.log('FAIL - chrome did not start'); process.exit(2); }
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((res) => { ws.onopen = res; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      pageErrors.push('console.error: ' + JSON.stringify(msg.params.args).slice(0, 300));
    }
  };
  function send(method, params) {
    return new Promise((res) => {
      const id = ++seq;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const nav = async (url) => { await send('Page.navigate', { url }); await wait(1400); };
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { error: JSON.stringify(r.result.exceptionDetails).slice(0, 300) };
    return r.result ? r.result.result.value : undefined;
  };
  const clickTab = async (name) => ev(`document.querySelector('[data-tab="${name}"]').click()`);
  const BN_TITLE = '\u099f\u09cd\u09b0\u09c7\u09a1 \u09b2\u09be\u0987\u09b8\u09c7\u09a8\u09cd\u09b8 \u09ac\u09bf\u09a1\u09bf';

  // ---- Load: defaults ----
  await nav(BASE);
  check('page title mentions Trade License', (await ev('document.title'))?.includes('Trade License'));
  check('subtitle present', (await ev(`document.getElementById('subtitle').textContent`)).length > 40);
  check('category select has 41 options (40 + placeholder)', (await ev(`document.querySelectorAll('#catSelect option').length`)) === 41);
  check('authority defaults to dncc', (await ev(`document.getElementById('authSelect').value`)) === 'dncc');
  check('kind defaults to new', (await ev(`document.getElementById('kindSelect').value`)) === 'new');
  check('late input disabled for new licence', (await ev(`document.getElementById('lateInput').disabled`)) === true);
  check('results hidden before calculate', (await ev(`document.getElementById('results').hidden`)) === true);

  // ---- Validation: no category ----
  await ev(`document.getElementById('calcBtn').click()`);
  check('no category shows inline error', (await ev(`document.getElementById('calcError').hidden`)) === false);

  // ---- Calculate: grocer, DNCC renewal, 10 sqft, 0 late = 4,375 ----
  await ev(`document.getElementById('catSelect').value='grocer'; document.getElementById('authSelect').value='dncc'; document.getElementById('kindSelect').value='renewal'; document.getElementById('kindSelect').dispatchEvent(new Event('change')); document.getElementById('signInput').value='10'; document.getElementById('lateInput').value='0'; document.getElementById('calcBtn').click()`);
  check('results shown after calculate', (await ev(`document.getElementById('results').hidden`)) === false);
  check('total is \u09f34,375.00', (await ev(`document.getElementById('totalValue').textContent`)) === '\u09f34,375.00');
  const lines = await ev(`document.getElementById('billLines').textContent`);
  check('bill lines show fee 500 / sign 800 / VAT 75 / tax 3000 / surcharge 0',
    lines.includes('\u09f3500.00') && lines.includes('\u09f3800.00') && lines.includes('\u09f375.00') &&
    lines.includes('\u09f33,000.00') && lines.includes('\u09f30.00'), lines.slice(0, 200));
  check('late input enabled for renewal', (await ev(`document.getElementById('lateInput').disabled`)) === false);

  // ---- Five-star hotel, DSCC new, 100 sqft = 65,500 ----
  await ev(`document.getElementById('catSelect').value='hotel-5star'; document.getElementById('authSelect').value='dscc'; document.getElementById('kindSelect').value='new'; document.getElementById('kindSelect').dispatchEvent(new Event('change')); document.getElementById('signInput').value='100'; document.getElementById('calcBtn').click()`);
  check('hotel 5-star new = \u09f365,500.00', (await ev(`document.getElementById('totalValue').textContent`)) === '\u09f365,500.00');

  // ---- Save estimate ----
  await ev(`document.getElementById('saveName').value='Gulshan hotel'; document.getElementById('saveBtn').click()`);
  check('save success message shows', (await ev(`document.getElementById('saveOk').hidden`)) === false);
  await clickTab('saved');
  check('saved list has 1 item', (await ev(`document.querySelectorAll('#savedList li').length`)) === 1);
  check('saved name shown', (await ev(`document.querySelector('#savedList li').textContent`)).includes('Gulshan hotel'));
  check('saved total \u09f365,500.00', (await ev(`document.getElementById('savedTotalValue').textContent`)) === '\u09f365,500.00');

  // ---- Persistence across reload ----
  await nav(BASE);
  await clickTab('saved');
  check('saved estimate persists after reload', (await ev(`document.querySelectorAll('#savedList li').length`)) === 1);

  // ---- Load saved into calculator ----
  await ev(`document.querySelector('#savedList .btn.mini').click()`);
  check('load switches to calc tab', (await ev(`document.getElementById('panel-calc').hidden`)) === false);
  check('loaded category is hotel-5star', (await ev(`document.getElementById('catSelect').value`)) === 'hotel-5star');
  check('loaded total is \u09f365,500.00', (await ev(`document.getElementById('totalValue').textContent`)) === '\u09f365,500.00');

  // ---- Fee table: 40 rows, search filters, tap-to-load ----
  await clickTab('table');
  check('table has 40 rows', (await ev(`document.querySelectorAll('#tableBody tr').length`)) === 40);
  check('table count says 40', (await ev(`document.getElementById('tableCount').textContent`)).includes('40'));
  await ev(`document.getElementById('tableSearch').value='hotel'; document.getElementById('tableSearch').dispatchEvent(new Event('input'))`);
  check('search hotel -> 4 rows', (await ev(`document.querySelectorAll('#tableBody tr').length`)) === 4);
  await ev(`document.getElementById('tableSearch').value=''; document.getElementById('tableSearch').dispatchEvent(new Event('input'))`);
  check('search cleared -> 40 rows', (await ev(`document.querySelectorAll('#tableBody tr').length`)) === 40);
  await ev(`document.getElementById('signInput').value='0'; document.querySelector('#tableBody tr[data-cat="grocer"]').click()`);
  check('tap grocer row loads calculator', (await ev(`document.getElementById('catSelect').value`)) === 'grocer');
  check('tap grocer row calculates 575 (new, 0 sqft)', (await ev(`document.getElementById('totalValue').textContent`)) === '\u09f3575.00');

  // ---- Deadline: 2026-11-10 -> overdue 41 days, 1 month late ----
  await clickTab('deadline');
  await ev(`document.getElementById('dateInput').value='2026-11-10'; document.getElementById('checkBtn').click()`);
  check('deadline result shown', (await ev(`document.getElementById('deadlineResult').hidden`)) === false);
  check('FY is 2026\u201327', (await ev(`document.getElementById('fyValue').textContent`)) === '2026\u201327');
  check('deadline is 2026-09-30', (await ev(`document.getElementById('dlValue').textContent`)) === '2026-09-30');
  check('41 days overdue', (await ev(`document.getElementById('daysValue').textContent`)) === '41');
  check('1 month late', (await ev(`document.getElementById('monthsValue').textContent`)).includes('1'));
  check('status badge overdue', (await ev(`document.getElementById('statusBadge').textContent`)).includes('Overdue'));
  check('apply-late button visible', (await ev(`document.getElementById('applyLateBtn').hidden`)) === false);
  await ev(`document.getElementById('dateInput').value='2026-08-01'; document.getElementById('checkBtn').click()`);
  check('2026-08-01: 60 days left, on time', (await ev(`document.getElementById('daysValue').textContent`)) === '60' && (await ev(`document.getElementById('statusBadge').textContent`)).includes('On time'));
  await ev(`document.getElementById('dateInput').value='2026-11-10'; document.getElementById('checkBtn').click(); document.getElementById('applyLateBtn').click()`);
  check('apply late switches to calc tab', (await ev(`document.getElementById('panel-calc').hidden`)) === false);
  check('apply late sets renewal + 1 month', (await ev(`document.getElementById('kindSelect').value`)) === 'renewal' && (await ev(`document.getElementById('lateInput').value`)) === '1');

  // ---- Guides + checklist: progress persists ----
  await clickTab('guides');
  check('7 new-licence steps', (await ev(`document.querySelectorAll('#guideNewList li').length`)) === 7);
  check('5 renewal steps', (await ev(`document.querySelectorAll('#guideRenList li').length`)) === 5);
  check('10 checklist items', (await ev(`document.querySelectorAll('#checklist label').length`)) === 10);
  check('checklist progress 0 of 10', (await ev(`document.getElementById('checklistProgress').textContent`)).includes('0 of 10'));
  await ev(`document.querySelector('#guideNewList li input').click(); document.querySelectorAll('#checklist input')[0].click(); document.querySelectorAll('#checklist input')[1].click()`);
  check('checklist progress 2 of 10', (await ev(`document.getElementById('checklistProgress').textContent`)).includes('2 of 10'));
  await nav(BASE);
  await clickTab('guides');
  check('guide step persists after reload', (await ev(`document.querySelector('#guideNewList li input').checked`)) === true);
  check('checklist persists after reload', (await ev(`document.getElementById('checklistProgress').textContent`)).includes('2 of 10'));

  // ---- Export / erase / import round-trip via test hooks ----
  const payload = await ev(`window.__tlbd.exportPayload()`);
  check('export payload is trade-license-bd v1', payload.includes('"app": "trade-license-bd"') && payload.includes('"version": 1'), payload.slice(0, 120));
  check('export carries Gulshan hotel', payload.includes('Gulshan hotel'));
  await ev(`window.__tlbd.eraseAll()`);
  check('eraseAll empties saved', (await ev(`window.__tlbd.exportPayload()`)).includes('"saved": []'));
  const imp = await ev(`JSON.stringify(window.__tlbd.importPayload(${JSON.stringify(payload)}))`);
  check('import valid payload ok', imp.includes('"ok":true'), imp);
  check('import restores saved record', (await ev(`window.__tlbd.exportPayload()`)).includes('Gulshan hotel'));
  const badImp = await ev(`JSON.stringify(window.__tlbd.importPayload('{"app":"land-tax-bd","version":1,"saved":[]}'))`);
  check('import wrong app rejected', badImp.includes('"ok":false'));
  check('invalid import leaves data intact', (await ev(`window.__tlbd.exportPayload()`)).includes('Gulshan hotel'));

  // ---- Bad import via UI textarea; good import succeeds ----
  await clickTab('data');
  await ev(`document.getElementById('importText').value='{not json'; document.getElementById('importBtn').click()`);
  check('bad UI import shows error', (await ev(`document.getElementById('importFail').hidden`)) === false);
  await ev(`document.getElementById('importText').value=${JSON.stringify(payload)}; document.getElementById('importBtn').click()`);
  check('good UI import succeeds', (await ev(`document.getElementById('importOk').hidden`)) === false);

  // ---- Typed-DELETE erase via UI; wrong word rejected ----
  await ev(`document.getElementById('eraseInput').value='delete'; document.getElementById('eraseBtn').click();`);
  check('wrong erase word rejected', (await ev(`document.getElementById('eraseWrong').hidden`)) === false);
  check('wrong erase keeps data', (await ev(`window.__tlbd.exportPayload()`)).includes('Gulshan hotel'));
  await ev(`document.getElementById('eraseInput').value='DELETE'; document.getElementById('eraseBtn').click();`);
  check('DELETE erases data', (await ev(`window.__tlbd.exportPayload()`)).includes('"saved": []'));
  check('erase success message shows', (await ev(`document.getElementById('erasedMsg').hidden`)) === false);

  // ---- BN toggle ----
  await clickTab('calc');
  await ev(`document.getElementById('catSelect').value='grocer'; document.getElementById('authSelect').value='dncc'; document.getElementById('kindSelect').value='renewal'; document.getElementById('kindSelect').dispatchEvent(new Event('change')); document.getElementById('signInput').value='10'; document.getElementById('lateInput').value='0'; document.getElementById('calcBtn').click()`);
  await ev(`document.getElementById('langBtn').click()`);
  check('BN toggle: title in Bengali', (await ev(`document.getElementById('title').textContent`)) === BN_TITLE);
  check('BN toggle: total in Bengali digits', (await ev(`document.getElementById('totalValue').textContent`)) === '\u09f3\u09ea,\u09e9\u09ed\u09eb.\u09e6\u09e6');
  check('BN toggle: tab label in Bengali', (await ev(`document.getElementById('tab-calc').textContent`)) === '\u09ab\u09bf \u09b9\u09bf\u09b8\u09be\u09ac');
  await nav(BASE);
  check('BN toggle persists after reload', (await ev(`window.__tlbd.state.lang`)) === 'bn');
  await ev(`document.getElementById('langBtn').click()`);
  check('back to EN', (await ev(`window.__tlbd.state.lang`)) === 'en');

  // ---- Mobile 390px: no horizontal overflow on any tab ----
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await nav(BASE);
  await ev(`document.getElementById('catSelect').value='grocer'; document.getElementById('kindSelect').value='renewal'; document.getElementById('kindSelect').dispatchEvent(new Event('change')); document.getElementById('calcBtn').click()`);
  for (const tab of ['calc', 'table', 'deadline', 'guides', 'saved', 'data']) {
    await clickTab(tab);
    await wait(300);
    const overflow = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    check('390px no overflow on ' + tab + ' tab', overflow <= 0, 'overflow=' + overflow);
  }

  // ---- Zero network requests: app is fully offline (only file:// loads) ----
  const reqs = await ev(`performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith('file://')).length`);
  check('zero non-file network requests', reqs === 0, 'non-file=' + reqs);

  check('no console/page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  chrome.kill();
  console.log('\n' + count + ' checks, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('FAIL - harness error: ' + e.message); try { chrome.kill(); } catch (_) {} process.exit(2); });
