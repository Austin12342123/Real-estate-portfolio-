/* M1.4 Grader checks K38-K58 (prototype/grader/design-grade.js) ported as named Playwright tests. One Playwright project per profile (8), 60 s per test.
   PORT STATUS: K38-K43, K46, K50 (touch pages) are faithful ports of the grader's measurements (same in-page sweep). K47, K48, K52, K53 are reduced ports (the core assertion, not every sub-rule).
   K54-K58 are REDUCED: they assert the copy / structure exists on the screen, not the engine-derived numbers. K44 (touch drag) and K45 (screenshots) are not ported (listed as skipped).
   The grader stays the full authority; these tests exist to name each phone / iPad problem. Real Safari is only exercised in CI (WebKit); a local Chromium stand-in is labelled in the hand-back. */
const { test, expect } = require('@playwright/test');
const L = require('./lib');
const SCHEMES = ['light', 'dark'];
test.beforeEach(async ({ context }) => { await L.pin(context); });
const vwOf = (page) => page.viewportSize().width;
const where = (page, name, sc) => name + '@' + vwOf(page) + 'x' + page.viewportSize().height + (sc ? ' ' + sc : '');

/* per-screen sweep: ONE page load per screen and colour scheme runs K39 (overflow + clipped), K40 (tap size, light), K41 (contrast), K42 (fonts, radii, input size, light) and the clipping detector.
   Each rule is an expect.soft with its K-number in the message, so every failure is still named (screen, size, scheme, element). Merged from 5 loads to 1 to fit the 10-minute CI limit; assertions unchanged. */
const K42_JS = () => { const bad = []; document.querySelectorAll('#app *').forEach((el) => { if (el.closest('svg') || el.closest('.info')) return; const rc = el.getBoundingClientRect(), s = getComputedStyle(el); if (rc.width < 1 || s.display === 'none') return;
  if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(s.fontSize) < 12) bad.push('small text ' + (el.className || el.tagName) + '=' + s.fontSize);
  if ((el.tagName === 'INPUT' && !/^(hidden|checkbox|radio|file|range)$/.test(el.type) || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') && parseFloat(s.fontSize) < 16) bad.push('input under 16px (iOS zooms) ' + (el.dataset.p || el.dataset.testid || el.tagName) + '=' + s.fontSize); }); return [...new Set(bad)].slice(0, 40); /* full unique list (was the first 5) so card M2 sees every element */ };
for (const name of L.PAGE_NAMES) for (const sc of SCHEMES) {
  test('sweep K39 K40 K41 K42 clipping: ' + name + ' (' + sc + ')', async ({ page }) => {
    await page.emulateMedia({ colorScheme: sc }); await L.goPage(page, name);
    const r = await page.evaluate(L.SWEEP_JS), clip = await page.evaluate(L.CLIP_JS), w = where(page, name, sc);
    expect.soft([r.ov ? 'page scrolls sideways' : null].concat(r.wide.slice(0, 3), r.clipped.slice(0, 3)).filter(Boolean), 'K39 ' + w).toEqual([]);
    expect.soft(clip, 'clipping ' + w).toEqual([]);
    expect.soft(r.low.slice(0, 3), 'K41 contrast ' + w).toEqual([]);
    if (sc === 'light') { expect.soft(r.small.slice(0, 6), 'K40 tap targets ' + w).toEqual([]);
      expect.soft([].concat(r.fonts.slice(0, 3), r.radii.slice(0, 3), await page.evaluate(K42_JS)), 'K42 ' + w).toEqual([]); }
  });
}

test('K38 layout mode follows the width (phone column < 600, tablet column 600-899, master-detail >= 900)', async ({ page }) => {
  const w = vwOf(page); await L.goPage(page, 'asset');
  const T = await page.evaluate(() => { const a = document.getElementById('app'), r = a.getBoundingClientRect(); return { appW: Math.round(r.width), pl: parseFloat(getComputedStyle(a).paddingLeft), mdw: !!document.querySelector('.mdw'), mdd: (() => { const l = document.querySelector('.mdl'), d = document.querySelector('.mdd'); return l && d ? [l.getBoundingClientRect().right, d.getBoundingClientRect().left] : null; })() }; });
  const msg = where(page, 'asset') + ' ' + JSON.stringify(T);
  if (w < 600) { expect(T.appW <= Math.min(w, 520) && !T.mdw, msg).toBe(true); }
  else if (w < 900) { expect(T.appW >= Math.min(w, 720) - 2 && T.appW <= 720 && !T.mdw && T.pl >= 32, msg).toBe(true); }
  else { expect(T.mdw && T.mdd && T.mdd[0] <= T.mdd[1] + 1, msg).toBe(true); await L.goPage(page, 'planned'); const cols = await page.evaluate(() => getComputedStyle(document.querySelector('#app .pg')).gridTemplateColumns.split(' ').filter(Boolean).length); expect(cols, 'landscape Planned: two columns').toBe(2); }
});
test('K38b turning the device changes the layout live (no reload)', async ({ page }) => {
  const vp = page.viewportSize(); await L.goPage(page, 'asset'); await page.evaluate(() => { window.__stay = 1; });
  const mode = () => page.evaluate(() => ({ mdw: !!document.querySelector('.mdw'), stay: window.__stay === 1, ov: document.documentElement.scrollWidth > innerWidth + 1 }));
  const a = await mode(); await page.setViewportSize({ width: vp.height, height: vp.width }); await page.waitForFunction((want) => !!document.querySelector('.mdw') === want, vp.height >= 900, { timeout: 4000 }).catch(() => {}); /* wait on the real condition (layout follows width) instead of a fixed 250 ms; WebKit on CI is slower */ const b = await mode();
  expect(b.stay && !b.ov, 'after rotating ' + vp.width + 'x' + vp.height + ' -> ' + vp.height + 'x' + vp.width + ': ' + JSON.stringify(b)).toBe(true);
  expect(b.mdw, 'master-detail follows the new width (' + vp.height + ')').toBe(vp.height >= 900);
  expect(a.mdw).toBe(vp.width >= 900);
});
test('K43 page tabs float at the bottom on a tablet, inside the screen, and a tap switches page', async ({ page }) => {
  test.skip(vwOf(page) < 600, 'tablet only');
  await L.goPage(page, 'planned'); const t = await page.evaluate(() => { const e = document.querySelector('[data-testid=page-tabs]'), r = e.getBoundingClientRect(); return { pos: getComputedStyle(e).position, bottom: r.bottom, vh: innerHeight, h: Math.round(r.height), btnH: Math.min.apply(null, [...e.querySelectorAll('button')].map((b) => Math.round(b.getBoundingClientRect().height))) }; });
  expect(t.pos, 'tabs position on ' + where(page, 'planned')).toBe('fixed'); expect(t.bottom).toBeLessThanOrEqual(t.vh); expect(t.btnH, 'tab button height >= 48').toBeGreaterThanOrEqual(48);
  await page.click('[data-testid=tab-real]'); await expect(page.locator('[data-testid=tab-real]')).toHaveAttribute('aria-selected', 'true');
});
/* K44 port: WebKit has no CDP, so the touch is dispatched as real PointerEvents (pointerType 'touch') on the row; the app's hold / move / up handlers see the same events a finger produces. */
const touchSeq = (page, fromSel, toSel, holdMs, steps) => page.evaluate(async ([fromSel, toSel, holdMs, steps]) => {
  const pt = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + 30, y: r.top + r.height / 2 }; };
  const f = pt(fromSel), t = pt(toSel), el = document.querySelector(fromSel), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ev = (type, x, y, tgt) => (tgt || document).dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
  ev('pointerdown', f.x, f.y, el); await sleep(holdMs);
  const lifted = !!document.querySelector('.rw.lift') && document.getElementById('app').classList.contains('dragmode');
  for (let i = 1; i <= steps; i++) { ev('pointermove', f.x, f.y + (t.y - f.y - 6) * i / steps, document); await sleep(16); }
  ev('pointerup', f.x, t.y, document); await sleep(150);
  return { lifted, left: !!document.querySelector('.rw.lift') };
}, [fromSel, toSel, holdMs, steps]);
test('K44 touch drag on Buy order: hold lifts a row and a drag reorders it; a quick swipe moves nothing; O / N / ? do nothing on touch', async ({ page }) => {
  test.skip(Math.min(vwOf(page), page.viewportSize().height) < 600, 'the grader runs K44 on iPad only (a phone, either orientation)');
  const ids = () => page.evaluate(() => [...document.querySelectorAll('[data-testid=order-row]')].map((e) => e.dataset.row));
  await L.boot(page, L.seedS(), '#order'); const a = await ids();
  const row = (id) => '[data-row="' + id + '"] [data-testid=order-status]';
  const r1 = await touchSeq(page, row(a[2]), row(a[0]), 560, 10); const b = await ids();
  expect(r1.lifted && b[0] === a[2] && b.length === a.length, where(page, 'order') + ' hold 560 ms lifts the row and a drag moves row 3 to the top ' + JSON.stringify([r1, a.slice(0, 3), b.slice(0, 3)])).toBe(true);
  await L.boot(page, L.seedS(), '#order'); const r2 = await touchSeq(page, row(a[2]), row(a[0]), 0, 6); const c = await ids();
  expect(c.join() === a.join() && !r2.left, where(page, 'order') + ' a quick swipe moves nothing ' + c.slice(0, 3)).toBe(true);
  await L.boot(page, L.seedS(), '#'); for (const k of ['o', 'n', 'f', '?', '2']) { await page.keyboard.press(k); await page.waitForTimeout(40); }
  const st = await page.evaluate(() => ({ h: location.hash, sheet: !!document.querySelector('#infopop'), real: document.querySelector('[data-testid=tab-planned]').getAttribute('aria-selected') }));
  expect(st.h === '' || st.h === '#', 'O / N / F do not navigate on touch: ' + st.h).toBe(true); expect(!st.sheet && st.real === 'true', '? and 2 do nothing on touch ' + JSON.stringify(st)).toBe(true);
});
/* K45 port: every page screenshotted light and dark at this project's size (PNGs go to test-results/, uploaded by CI) */
/* K45: every page, light and dark; split into groups of 6 screens per test so each test (and each CI shard) stays well under its timeout; every screenshot is kept */
const K45_GROUPS = []; for (let i = 0; i < L.PAGE_NAMES.length; i += 6) K45_GROUPS.push(L.PAGE_NAMES.slice(i, i + 6));
for (const sc of SCHEMES) K45_GROUPS.forEach((names, gi) => test('K45 screenshots at this size: ' + sc + ' group ' + (gi + 1) + '/' + K45_GROUPS.length + ' (' + names[0] + '..' + names[names.length - 1] + ')', async ({ page }, info) => {
  test.skip(Math.min(vwOf(page), page.viewportSize().height) < 600, 'the grader runs K45 on iPad only'); test.setTimeout(120000);
  const bad = []; let n = 0; await page.emulateMedia({ colorScheme: sc });
  for (const name of names) { try { await L.goPage(page, name); const buf = await page.screenshot({ fullPage: false }); if (buf.length < 1000) throw new Error('empty'); await info.attach('v7-' + name + '-' + info.project.name + '-' + sc + '.png', { body: buf, contentType: 'image/png' }); n++; } catch (e) { bad.push(name); } }
  expect(bad, n + ' screenshots saved').toEqual([]); expect(n).toBe(names.length);
}));

test('K46 page margin: gutter >= 20px phone / 32px tablet on every screen', async ({ page }) => { test.setTimeout(180000); /* loops over every screen; 60 s default exceeded on CI WebKit */
  const w = vwOf(page), need = w < 600 ? 20 : 32, bad = [];
  for (const name of ['planned', 'real', 'saved', 'asset', 'finances', 'assumptions', 'order', 'add', 'import']) {
    await L.goPage(page, name);
    const g = await page.evaluate(() => { let minL = 1e9, maxR = 0; document.querySelectorAll('#app *').forEach((el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); if (r.width < 1 || r.height < 1 || el.closest('svg') || s.display === 'none' || s.visibility === 'hidden') return; if (s.position !== 'fixed' && !el.closest('.infopop,.toast,.pagetabs,.info,.chint,.dropline')) { minL = Math.min(minL, r.left); maxR = Math.max(maxR, r.right); } }); return [Math.round(minL), Math.round(innerWidth - maxR)]; });
    if (g[0] < need - 0.5 || g[1] < need - 0.5) bad.push(where(page, name) + ' gutter left/right ' + g.join('/') + ' < ' + need);
  }
  expect(bad).toEqual([]);
});
test('K47 Planned order: Health, More figures, then Sold directly after it', async ({ page }) => {
  await L.goPage(page, 'planned');
  const o = await page.evaluate(() => { const m = document.querySelector('[data-testid=more-figures]'), s = document.querySelector('[data-testid=cat-sold]'); return m && s ? { next: m.nextElementSibling === s } : { miss: true }; });
  expect(o, where(page, 'planned')).toEqual({ next: true });
});
test('K48 cap rate chip (Good / Okay / Low word) on the asset page', async ({ page }) => {
  await L.goPage(page, 'asset'); const txt = await page.evaluate(() => document.getElementById('app').innerText);
  expect(/\b(Good|Okay|Low)\b/.test(txt) && /cap rate/i.test(txt), where(page, 'asset') + ' cap rate chip').toBe(true);
});
test('K50 one scroll only: no element other than the page scrolls', async ({ page }) => { test.setTimeout(180000); /* loops over every screen; 60 s default exceeded on CI WebKit */
  const bad = [];
  for (const name of ['planned', 'asset', 'real', 'saved', 'finances', 'assumptions', 'order', 'add', 'import', 'health', 'shortfall']) { await L.goPage(page, name);
    const r = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { if (/^(TEXTAREA|SELECT|INPUT|svg)$/i.test(e.tagName) || e.closest('svg') || e.id === 'infopop') return false; const s = getComputedStyle(e); return /(auto|scroll|overlay)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1; }).map((e) => (e.className || e.tagName) + ' ' + e.scrollHeight + '>' + e.clientHeight).slice(0, 3));
    if (r.length) bad.push(where(page, name) + ': ' + r.join(', ')); }
  expect(bad).toEqual([]);
});
test('K52 info popover (grader selector #app button.info, DOM click): opens, fixed child of body, inside the screen gutter, closes on Escape', async ({ page }) => {
  await L.goPage(page, 'asset'); const g = vwOf(page) < 600 ? 20 : 32;
  const r = await page.evaluate(async (g) => { const b = document.querySelector('#app button.info'); if (!b) return { none: true }; b.scrollIntoView({ block: 'center' }); b.click(); await new Promise((q) => setTimeout(q, 20));
    const pop = document.getElementById('infopop'); if (!pop) return { open: false }; const rc = pop.getBoundingClientRect(), cs = getComputedStyle(pop), vw = document.documentElement.clientWidth, vh = innerHeight; const out = [];
    if (rc.left < g - 0.5 || rc.top < g - 0.5 || rc.right > vw - g + 0.5 || rc.bottom > vh - g + 0.5) out.push('outside ' + [rc.left, rc.top, rc.right, rc.bottom].map(Math.round) + ' of ' + vw + 'x' + vh + ' (gutter ' + g + ')');
    if (pop.parentElement !== document.body || cs.position !== 'fixed') out.push('not a fixed child of body');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await new Promise((q) => setTimeout(q, 20)); return { open: true, out, closed: !document.getElementById('infopop') }; }, g);
  expect(r.open, 'popover opens on ' + where(page, 'asset')).toBe(true); expect(r.out, where(page, 'asset')).toEqual([]); expect(r.closed, 'closes on Escape').toBe(true);
});
test('K53 accent token is calm blue, not red/orange', async ({ page }) => {
  await L.goPage(page, 'planned');
  const hues = await page.evaluate(() => { const out = {}; for (const sc of ['light']) { const c = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim(); const cv = document.createElement('canvas').getContext('2d'); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const [r, g, b] = cv.getImageData(0, 0, 1, 1).data; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0; if (mx !== mn) { const d = mx - mn; h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } out[sc] = Math.round(h); out.c = c; } return out; });
  expect(hues.light >= 180 && hues.light <= 290, '--acc ' + hues.c + ' hue ' + hues.light).toBe(true);
});

/* K54-K58: REDUCED ports (copy / structure exists on the screen) */
const appText = (page) => page.evaluate(() => document.getElementById('app').innerText);
test('K54 hero: net worth TODAY; status sentence is not in the hero by default (reduced)', async ({ page }) => {
  await L.goPage(page, 'planned'); const t = await appText(page);
  expect(/Nothing bought yet[^\n]*is funded at/.test(t), 'status sentence "Nothing bought yet ... is funded at" must not show in the hero by default').toBe(false);
  expect(/at year \d+/.test(t), 'plan-end figure is a small "$X at year N" line').toBe(true);
});
test('K55 comp value under New appraised value, with Job money saved up (reduced)', async ({ page }) => {
  await L.goPage(page, 'asset'); const t = await appText(page); const a = t.indexOf('New appraised value'), c = t.indexOf('Average comp value');
  expect(a >= 0 && c > a, 'Average comp value follows New appraised value (' + a + ',' + c + ')').toBe(true); expect(/Job money saved up/.test(t)).toBe(true);
});
/* grader K56 scenarios: the line [data-testid=extra-break] directly under the Extra / month field. It is hidden when every part is zero (owned asset while the plan is still buying), so use "owned, nothing left to buy + own extra 150" like the grader */
test('K56 Extra / month breakdown line directly under Extra / month (grader scenario: owned + own extra)', async ({ page }) => {
  const S = L.ownedS(); S.houses = S.houses.slice(0, 2); S.houses.forEach((h) => { h.capex = 0; h.arv = 0; h.arvAuto = false; }); S.houses[0].extra = 150;
  await L.boot(page, S, '#house-' + S.houses[0].id); await L.openAll(page);
  const o = await page.evaluate(() => { const x = document.querySelector('[data-testid=extra-break]'), f = document.querySelector('[data-p$=".extra"]'); if (!x) return null; const r = x.getBoundingClientRect(), fl = f.closest('label').getBoundingClientRect(); return { txt: x.textContent, below: x.previousElementSibling === f.closest('label') && r.top >= fl.bottom - 1, fit: r.right <= innerWidth + 0.5 && x.scrollWidth <= x.clientWidth + 1 }; });
  expect(o, where(page, 'asset-owned') + ' no [data-testid=extra-break] line').not.toBeNull();
  expect(/Total paying this loan down/.test(o.txt) && o.below && o.fit, where(page, 'asset-owned') + ' ' + JSON.stringify(o)).toBe(true);
});
test('K57 job money card: "Total from your job this month" row (reduced)', async ({ page }) => {
  await L.goPage(page, 'asset-owned'); expect(/Total from your job this month/.test(await appText(page))).toBe(true);
});
test('K58 Funded by the trust rows (reduced)', async ({ page }) => {
  await L.boot(page, L.seedS(), '#house-cedar'); await L.openAll(page); const t = await appText(page);
  expect(/Funded by the trust/i.test(t) && /borrowing room/i.test(t) && /pool total/i.test(t), 'Funded by the trust: borrowing room + pool total rows').toBe(true);
});
