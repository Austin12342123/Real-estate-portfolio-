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

/* per-screen sweep tests: K39 (overflow + clipped), K40 (tap size), K41 (contrast), K42 (fonts, radii, input size) */
for (const name of L.PAGE_NAMES) {
  test('K39 no sideways scroll, nothing past the edge, no clipped text: ' + name, async ({ page }) => {
    const bad = [];
    for (const sc of SCHEMES) { await page.emulateMedia({ colorScheme: sc }); await L.goPage(page, name); const r = await page.evaluate(L.SWEEP_JS);
      if (r.ov) bad.push(where(page, name, sc) + ' page scrolls sideways'); if (r.wide.length) bad.push(where(page, name, sc) + ' past edge: ' + r.wide.slice(0, 3).join(',')); if (r.clipped.length) bad.push(where(page, name, sc) + ' clipped: ' + r.clipped.slice(0, 3).join(' | ')); }
    expect(bad).toEqual([]);
  });
  test('K40 tap targets >= 44px: ' + name, async ({ page }) => {
    await L.goPage(page, name); const r = await page.evaluate(L.SWEEP_JS);
    expect(r.small.slice(0, 6), where(page, name)).toEqual([]);
  });
  test('K41 contrast >= 4.5:1 light and dark: ' + name, async ({ page }) => {
    const bad = [];
    for (const sc of SCHEMES) { await page.emulateMedia({ colorScheme: sc }); await L.goPage(page, name); const r = await page.evaluate(L.SWEEP_JS); if (r.low.length) bad.push(where(page, name, sc) + ': ' + r.low.slice(0, 3).join(' | ')); }
    expect(bad).toEqual([]);
  });
  test('K42 Manrope everywhere, token radii, inputs 16px, text >= 12px: ' + name, async ({ page }) => {
    await L.goPage(page, name); const r = await page.evaluate(L.SWEEP_JS);
    const t = await page.evaluate(() => { const bad = []; document.querySelectorAll('#app *').forEach((el) => { if (el.closest('svg') || el.closest('.info')) return; const rc = el.getBoundingClientRect(), s = getComputedStyle(el); if (rc.width < 1 || s.display === 'none') return;
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(s.fontSize) < 12) bad.push('small text ' + (el.className || el.tagName) + '=' + s.fontSize);
      if ((el.tagName === 'INPUT' && !/^(hidden|checkbox|radio|file|range)$/.test(el.type) || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') && parseFloat(s.fontSize) < 16) bad.push('input under 16px (iOS zooms) ' + (el.dataset.p || el.dataset.testid || el.tagName) + '=' + s.fontSize); }); return bad.slice(0, 5); });
    expect([].concat(r.fonts.slice(0, 3), r.radii.slice(0, 3), t), where(page, name)).toEqual([]);
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
  const a = await mode(); await page.setViewportSize({ width: vp.height, height: vp.width }); await page.waitForTimeout(250); const b = await mode();
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
test('K44 touch drag on Buy order (NOT PORTED: needs CDP touch sequences)', async () => { test.skip(true, 'not ported in M1; the grader K44 stays authoritative'); });
test('K45 screenshots (NOT PORTED: the grader saves PNGs; CI uploads Playwright traces instead)', async () => { test.skip(true, 'not ported in M1'); });

test('K46 page margin: gutter >= 20px phone / 32px tablet on every screen', async ({ page }) => {
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
test('K50 one scroll only: no element other than the page scrolls', async ({ page }) => {
  const bad = [];
  for (const name of ['planned', 'asset', 'real', 'saved', 'finances', 'assumptions', 'order', 'add', 'import', 'health', 'shortfall']) { await L.goPage(page, name);
    const r = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { if (/^(TEXTAREA|SELECT|INPUT|svg)$/i.test(e.tagName) || e.closest('svg') || e.id === 'infopop') return false; const s = getComputedStyle(e); return /(auto|scroll|overlay)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1; }).map((e) => (e.className || e.tagName) + ' ' + e.scrollHeight + '>' + e.clientHeight).slice(0, 3));
    if (r.length) bad.push(where(page, name) + ': ' + r.join(', ')); }
  expect(bad).toEqual([]);
});
test('K52 info popover: opens on tap of (i), sits inside the screen, closes on Escape', async ({ page }) => {
  await L.goPage(page, 'asset'); const i = page.locator('#app .info, #app [data-info]').first(); await i.scrollIntoViewIfNeeded(); await i.click();
  const pop = page.locator('#infopop'); await expect(pop, 'popover opens on ' + where(page, 'asset')).toBeVisible();
  const r = await pop.boundingBox(); const vp = page.viewportSize(); expect(r.x >= 0 && r.x + r.width <= vp.width + 1, 'popover inside the screen ' + JSON.stringify(r)).toBe(true);
  await page.keyboard.press('Escape'); await expect(pop).toBeHidden();
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
test('K56 Extra / month breakdown line (reduced)', async ({ page }) => {
  await L.goPage(page, 'asset-owned'); expect(/Total paying this loan down/.test(await appText(page)), 'breakdown line under Extra / month').toBe(true);
});
test('K57 job money card: "Total from your job this month" row (reduced)', async ({ page }) => {
  await L.goPage(page, 'asset-owned'); expect(/Total from your job this month/.test(await appText(page))).toBe(true);
});
test('K58 Funded by the trust rows (reduced)', async ({ page }) => {
  await L.boot(page, L.seedS(), '#house-cedar'); await L.openAll(page); const t = await appText(page);
  expect(/Funded by the trust/i.test(t) && /borrowing room/i.test(t) && /pool total/i.test(t), 'Funded by the trust: borrowing room + pool total rows').toBe(true);
});
