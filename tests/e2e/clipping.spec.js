/* M1.3 Clipping detector: on every screen, fail if any table, card or input is wider than its container (or passes the screen edge),
   or a scrolling/hidden box cuts text. Runs at each project's own size: iPhone SE 320x568, iPhone 15, iPad, iPad Pro (portrait + landscape) and desktop 1280, 1024, 768. */
const { test, expect } = require('@playwright/test');
const L = require('./lib');

test.beforeEach(async ({ context }) => { await L.pin(context); });
for (const name of L.PAGE_NAMES) for (const scheme of ['light', 'dark']) {
  test('clipping: ' + name + ' (' + scheme + ')', async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await L.goPage(page, name);
    const bad = await page.evaluate(L.CLIP_JS);
    const vp = page.viewportSize();
    expect(bad, 'screen "' + name + '" at ' + vp.width + 'x' + vp.height + ' ' + scheme + ' has clipped / too-wide elements').toEqual([]);
  });
}
