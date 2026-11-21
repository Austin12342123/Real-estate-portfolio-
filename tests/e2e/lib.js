/* Shared helpers for the device-matrix suite. Test code only: reads prototype/v4 (engine.js for seed data), never edits it. */
const fs = require('fs'), path = require('path');
const V4 = path.resolve(__dirname, '../../prototype/v4');
const E = require(path.join(V4, 'engine.js'));
const KEY = 'rep-v4';
const DATA_V = +((/const DATA_V = (\d+)/.exec(fs.readFileSync(path.join(V4, 'app.js'), 'utf8')) || [0, 0])[1]);
/* the grader's own in-page sweep (overflow, clipped text, tap size, contrast, fonts, radii), copied verbatim into sweep.body.txt */
const SWEEP_JS = eval('(' + fs.readFileSync(path.join(__dirname, 'sweep.body.txt'), 'utf8').replace(/^\s*const SWEEP_JS = /, '').replace(/;\s*$/, '') + ')');

const withV = (S) => Object.assign(JSON.parse(JSON.stringify(S)), { v: DATA_V });
const seedS = () => withV(E.seedPlan());
const ownedS = () => { const S = seedS(); S.houses.slice(0, 2).forEach((h, i) => { h.status = 'owned'; h.boughtOn = '2025-0' + (i + 3) + '-15'; }); return S; };
const feasS = () => { const S = seedS(); S.houses = [E.newAsset('business', 'bankbiz', { id: 'g', addr: 'Premier Florida General Contractor', price: 27000000, rent: 340000, capex: 3010000, closingPct: 2 }), ...S.houses.slice(0, 3)]; S.p.cash = 20000; S.added = E.ADDITIONS.map((a) => a.key); return S; };

/* F1 screens: empty Planned page ("How much do you have saved now?"), the Your savings row, the "Can I buy this?" panel */
const emptyS = () => { const S = seedS(); S.houses = []; S.p.cash = 0; return S; };
const savedS = () => { const S = seedS(); S.p.cash = 25000; return S; };
/* the app pins "today" in the grader; do the same so dates are stable */
async function pin(ctxOrPage) { await ctxOrPage.addInitScript(() => { window.REP_TODAY = '2026-11-12'; }); }

/* write the portfolio from a same-origin page that does not run the app, then open the app once (same as grader/boot.js) */
let n = 0;
async function boot(page, S, hash) {
  await page.goto('/manifest.webmanifest?e=' + n++);
  await page.evaluate(([k, s]) => { try { localStorage.clear(); if (s) localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }, [KEY, S || null]);
  await page.goto('/index.html?e=' + n++ + (hash || ''));
  await page.waitForSelector('#app > *');
}
const openAll = async (pg) => { for (let i = 0; i < 40; i++) { const b = await pg.$('#app [data-coll][aria-expanded=false]'); if (!b) break; await b.click(); await pg.waitForTimeout(20); } };

/* every screen of the app (same list as the grader's ALLP) */
const PAGES = [
  ['planned', seedS, '#'], ['planned-open', seedS, '#', openAll],
  ['real', ownedS, '#', (pg) => pg.click('[data-testid=tab-real]')], ['saved', seedS, '#', (pg) => pg.click('[data-testid=tab-saved]')],
  ['health', seedS, '#', (pg) => pg.click('[data-testid=checks-details]')],
  ['asset', seedS, '#house-maple', openAll], ['asset-owned', ownedS, '#house-' + E.seedPlan().houses[0].id, openAll], ['asset-sell', seedS, '#house-birch', openAll],
  ['shortfall', feasS, '#house-g', openAll], ['finances', seedS, '#finances', openAll], ['assumptions', seedS, '#assumptions', openAll],
  ['order', seedS, '#order'], ['add', seedS, '#add'],
  ['add-open', seedS, '#add', async (pg) => { await pg.click('[data-testid=add-more-toggle]'); await pg.click('[data-testid=loan-row]'); }],
  ['add-owned', seedS, '#', async (pg) => { await pg.click('[data-testid=tab-real]'); await pg.click('[data-testid=add-owned]'); }],
  ['import', seedS, '#import-new'],
  ['planned-empty-savings', emptyS, '#', async (pg) => { await pg.waitForSelector('[data-testid=saved-now]'); }],
  ['your-savings-row', savedS, '#', async (pg) => { await openAll(pg); await pg.locator('text=Your savings').first().waitFor({ state: 'attached' }); }],
  ['can-i-buy', savedS, '#house-maple', async (pg) => { await openAll(pg); await pg.waitForSelector('[data-testid=scorecard],[data-testid=shortfall-panel]'); }]];
const PAGE_NAMES = PAGES.map((p) => p[0]);
async function goPage(pg, name) { const p = PAGES.find((x) => x[0] === name); await boot(pg, p[1](), p[2]); if (p[3]) await p[3](pg); await pg.waitForTimeout(60); }

/* clipping detector: any table, card or input wider than its container (or past the viewport), any scrolling box hiding text */
const CLIP_JS = () => {
  const out = [], vw = innerWidth, nm = (e) => (e.dataset && (e.dataset.testid || e.dataset.p) || String(e.className && e.className.baseVal === undefined ? e.className : '').split(' ')[0] || e.tagName.toLowerCase());
  const de = document.documentElement; if (de.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1) out.push('page scrolls sideways (' + de.scrollWidth + '>' + vw + ')');
  document.querySelectorAll('#app table, #app .card, #app section, #app input, #app select, #app textarea, #app .cmp, #app .iw').forEach((el) => {
    if (el.closest('svg')) return; const cs = getComputedStyle(el), r = el.getBoundingClientRect(); if (cs.display === 'none' || cs.visibility === 'hidden' || r.width < 1) return;
    if (cs.position === 'fixed') return; const p = el.parentElement; if (!p) return; const pr = p.getBoundingClientRect(), pcs = getComputedStyle(p);
    const pl = pr.left + parseFloat(pcs.borderLeftWidth) , prr = pr.right - parseFloat(pcs.borderRightWidth);
    if (r.right > prr + 1.5 || r.left < pl - 1.5) out.push(el.tagName.toLowerCase() + '.' + nm(el) + ' [' + Math.round(r.left) + ',' + Math.round(r.right) + '] outside its container [' + Math.round(pl) + ',' + Math.round(prr) + ']');
    if (r.right > vw + 1 || r.left < -1) out.push(el.tagName.toLowerCase() + '.' + nm(el) + ' passes the screen edge [' + Math.round(r.left) + ',' + Math.round(r.right) + '] vw ' + vw);
    if (el.tagName === 'TABLE' || el.classList.contains('cmp')) { if (el.scrollWidth > el.clientWidth + 1) out.push('table.' + nm(el) + ' content ' + el.scrollWidth + ' wider than box ' + el.clientWidth); }
  });
  document.querySelectorAll('#app *').forEach((el) => { if (el.closest('svg') || el.id === 'app') return; const cs = getComputedStyle(el), r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || cs.display === 'none') return;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (own && (cs.overflowX !== 'visible') && el.scrollWidth > el.clientWidth + 1 && !el.matches('.addr')) out.push('text clipped in ' + nm(el) + ' "' + el.textContent.trim().slice(0, 24) + '" ' + el.scrollWidth + '>' + el.clientWidth); });
  return [...new Set(out)].slice(0, 12);
};

module.exports = { E, KEY, DATA_V, V4, SWEEP_JS, CLIP_JS, seedS, ownedS, feasS, withV, pin, boot, openAll, PAGES, PAGE_NAMES, goPage };
