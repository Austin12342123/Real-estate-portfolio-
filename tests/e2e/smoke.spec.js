/* M1.2 Smoke per profile: open the app, visit every tab, add an asset, import a small listing fixture, no sideways scroll anywhere.
   NOTE: the app's "Import listing" flow reads a house listing JSON (schema house-listing/1), not CSV: the fixture is tests/e2e/fixtures/listing-small.house.json. */
const { test, expect } = require('@playwright/test');
const path = require('path');
const L = require('./lib');

test.beforeEach(async ({ context }) => { await L.pin(context); });
const noSideways = async (page, where) => { const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, vw: innerWidth })); expect(Math.max(o.sw, o.bw), 'sideways scroll on ' + where + ' (vw ' + o.vw + ')').toBeLessThanOrEqual(o.vw + 1); };
const houses = (page) => page.evaluate(() => window.__app.state.houses.length);

test('smoke: opens and every tab shows without sideways scroll', async ({ page }) => {
  await L.boot(page, L.seedS(), '#');
  await expect(page.locator('[data-testid=page-tabs]')).toBeVisible();
  for (const t of ['planned', 'real', 'saved']) { await page.click('[data-testid=tab-' + t + ']'); await page.waitForTimeout(80); await noSideways(page, 'tab ' + t); }
  for (const h of ['#finances', '#assumptions', '#order']) { await L.boot(page, L.seedS(), h); await noSideways(page, h); }
});

test('smoke: add an asset', async ({ page }) => {
  await L.boot(page, L.seedS(), '#add');
  const before = await houses(page);
  await page.fill('[data-testid=add-name]', '77 Smoke Test Ln');
  await page.fill('[data-testid=add-price]', '250000');
  await page.fill('[data-testid=add-rent]', '1900');
  await noSideways(page, 'Add screen');
  await page.click('[data-testid=confirm-add]');
  await expect.poll(() => houses(page)).toBe(before + 1);
  await noSideways(page, 'after Add');
});

test('smoke: import a small listing file', async ({ page }) => {
  await L.boot(page, L.seedS(), '#import-new');
  const before = await houses(page);
  await page.setInputFiles('[data-testid=import-listing-file]', path.join(__dirname, 'fixtures/listing-small.house.json'));
  await expect(page.locator('[data-testid=import-preview]')).toBeVisible();
  await noSideways(page, 'Import preview');
  await page.click('[data-testid=import-apply]');
  await expect.poll(() => houses(page)).toBe(before + 1);
  await noSideways(page, 'after Import');
});
