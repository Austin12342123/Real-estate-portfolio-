/* Device matrix. CI (Linux) uses real Playwright WebKit. Locally, when WebKit cannot be downloaded, set PW_LOCAL_CHROMIUM=/path/to/chrome:
   the same device emulation runs on Chromium (clearly NOT Safari: results are labelled "chromium-stand-in" in the project names' report). */
const { defineConfig, devices } = require('@playwright/test');
const local = process.env.PW_LOCAL_CHROMIUM;
const PORT = 4173;

function profile(label, device, landscape) {
  const d = Object.assign({}, devices[device + (landscape ? ' landscape' : '')]);
  if (local) { delete d.defaultBrowserType; d.browserName = 'chromium'; d.launchOptions = { executablePath: local }; }
  return { name: label + (landscape ? '-landscape' : '-portrait'), metadata: { kind: 'device' }, testIgnore: /k-grader-desktop/, use: d };
}
const DEVICES = [['iphone-se', 'iPhone SE'], ['iphone-15', 'iPhone 15'], ['ipad', 'iPad (gen 7)'], ['ipad-pro', 'iPad Pro 11']];
const projects = [];
for (const [l, d] of DEVICES) for (const ls of [false, true]) projects.push(profile(l, d, ls));
/* desktop widths: only the clipping detector and the desktop-specific grader checks (K47, K50, K51) run here */
for (const w of [1280, 1024, 768]) projects.push({ name: 'desktop-' + w, metadata: { kind: 'desktop' }, testMatch: /(clipping|k-grader-desktop)\.spec/, use: Object.assign({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false }, local ? { browserName: 'chromium', launchOptions: { executablePath: local } } : { browserName: 'webkit' }) });

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000, /* 60 s per test (card M1.4) */
  expect: { timeout: 5000 },
  fullyParallel: false,
  workers: process.env.CI ? 4 : 3,
  retries: 0, /* a failing check is never "flaky" (CLAUDE.md) */
  reporter: [['list'], ['json', { outputFile: 'test-results/report.json' }]],
  use: { baseURL: 'http://127.0.0.1:' + PORT, serviceWorkers: 'block', reducedMotion: 'reduce' },
  webServer: { command: 'node tests/e2e/server.js ' + PORT, url: 'http://127.0.0.1:' + PORT + '/index.html', reuseExistingServer: !process.env.CI, timeout: 20000 },
  projects
});
