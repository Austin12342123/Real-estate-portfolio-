// @vitest-environment node
// jsdom tap tests for the Add deck basics, against the real app (prototype/v4/index.html). The 162-test port is its own card.
import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM, ResourceLoader } from 'jsdom';
import path from 'path';
import fs from 'fs';
const idx = path.resolve(__dirname, '../../prototype/v4/index.html');
const dir = path.dirname(idx);
class Loader extends ResourceLoader { fetch(url) { const f = path.join(dir, new URL(url).pathname); return Promise.resolve(fs.existsSync(f) ? fs.readFileSync(f) : Buffer.from('')); } }
const html = () => fs.readFileSync(idx, 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let w, d;
const $ = (s) => d.querySelector(s);
const tap = async (s, ms = 30) => { const el = typeof s === 'string' ? $(s) : s; el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(ms); };
const count = () => $('[data-testid=dk-count]').textContent.replace(/\s+/g, ' ');
beforeEach(async () => {
  const dom = new JSDOM(html(), { runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, url: 'http://localhost/', beforeParse(win) { win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }); } });
  w = dom.window; d = w.document;
  await wait(700);
});
describe('Add deck (tap tests)', () => {
  it('main page: category has two buttons and no asset rows', () => {
    expect($('[data-testid=add-house]')).toBeTruthy();
    expect($('[data-testid=view-house]')).toBeTruthy();
    expect(d.querySelectorAll('[data-testid=cat-house] [data-testid=ledger-row]').length).toBe(0);
  });
  it('+ Add an asset opens the deck at card 1 and a pick auto-advances after 260 ms', async () => {
    await tap('[data-testid=add-house]');
    expect(count()).toMatch(/^1 of /);
    await tap('[data-dkpick="Single-family home"]', 400);
    expect(count()).toMatch(/^2 of /);
  });
  it('commercial starts with the type fixed (no type card)', async () => {
    await tap('[data-coll="cat-commercial"]');
    await tap('[data-testid=add-commercial]');
    expect($('#dkcard').dataset.card).toBe('status');
  });
  it('footer shows Skip while empty and Next once an input has a value', async () => {
    await tap('[data-testid=add-house]');
    await tap('[data-dkpick="Single-family home"]', 400);
    await tap('[data-dkpick="Planning to buy"]', 400);
    expect($('.dk-ft [data-dknav="1"]').textContent).toBe('Skip');
    const i = $('[data-dkf="addr:0"]');
    i.value = '1 Test St';
    i.dispatchEvent(new w.Event('input', { bubbles: true }));
    expect($('.dk-ft [data-dknav="1"]').textContent).toMatch(/Next/);
  });
  it('live strip appears after the price card with an engine cash flow', async () => {
    await tap('[data-testid=add-house]');
    await tap('[data-dkpick="Single-family home"]', 400);
    await tap('[data-dkpick="Planning to buy"]', 400);
    await tap('.dk-ft [data-dknav="1"]');
    await tap('.dk-ft [data-dknav="1"]');
    expect($('[data-testid=dk-strip]').textContent).toMatch(/Cash flow/);
    const i = $('[data-dkf="price:0"]');
    i.value = '250000';
    i.dispatchEvent(new w.Event('input', { bubbles: true }));
    expect($('[data-testid=dk-strip]').textContent).toMatch(/\/mo/);
  });
  it('Real page + Add owned opens the deck with status owned', async () => {
    await tap('[data-testid=tab-real]');
    await tap('[data-testid=add-owned]');
    await tap('[data-dkpick="Multi-family"]', 400);
    await tap('[data-dkpick="2 (duplex)"]', 400);
    for (let n = 0; n < 40 && !$('[data-dksave]'); n++) await tap('.dk-ft [data-dknav="1"]', 5);
    expect($('#dkcard').textContent).toMatch(/Yes, I own it/);
  });
});
