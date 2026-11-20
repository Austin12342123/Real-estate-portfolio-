/* Desktop-only grader checks (K47 inset, K50 one scroll) at 1280 / 1024 / 768. K47: nothing in a left-column card touches the card edge (>= 8px inside) and cards are >= 32px from the screen edge;
   this is the "clipped left column / cash-flow figure at desktop widths" report. Runs in the three desktop projects only. */
const { test, expect } = require('@playwright/test');
const L = require('./lib');
test.beforeEach(async ({ context }) => { await L.pin(context); });

for (const name of ['planned', 'planned-open', 'asset']) for (const sc of ['light', 'dark']) {
  test('K47 card text stays 8px inside its card, cards 32px from the screen edge: ' + name + ' ' + sc, async ({ page }) => {
    await page.emulateMedia({ colorScheme: sc }); await L.goPage(page, name);
    const r = await page.evaluate(() => { const out = []; document.querySelectorAll('#app .card').forEach((c) => { const cr = c.getBoundingClientRect(); if (cr.width < 1 || cr.height < 1 || getComputedStyle(c).position === 'fixed') return;
      if (cr.left < 31.5 || innerWidth - cr.right < 31.5) out.push('card edge ' + Math.round(cr.left) + '/' + Math.round(innerWidth - cr.right));
      c.querySelectorAll('*').forEach((e) => { if (e.closest('svg') || e.closest('.info')) return; const a = e.getBoundingClientRect(); if (!a.width || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
        if (a.left < cr.left + 7.5 || a.right > cr.right - 7.5) out.push((e.className || e.tagName) + ' "' + e.textContent.trim().slice(0, 20) + '" ' + Math.round(a.left - cr.left) + '/' + Math.round(cr.right - a.right)); }); }); return [...new Set(out)].slice(0, 5); });
    expect(r, name + '@' + page.viewportSize().width + ' ' + sc).toEqual([]);
  });
}
