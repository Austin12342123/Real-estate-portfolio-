/* Category I: Portfolio sections, reorder, auto-funding, duplicate, extra-payment panel, loan line, swipe-back and keyboard dismiss.
   100 automated points on their own scale (not part of A-E + R, F, G or H).  Plugged in from grade.js: require('./gesture-grade.js').run(X) -> { earned, max, checks }.
   Standalone: GEST_ONLY=1 node grade.js   (I_ONLY=I2,I4 for single checks).  Runs with section auto-expansion OFF: collapsed defaults are part of what is tested.
   Touch gestures are sent as real touch events through the Chrome DevTools protocol (Input.dispatchTouchEvent); the long-press drag is also tried with the mouse. Never modifies the app. */
const path = require('path');
const BOOT = require('./boot.js');

exports.run = async function run(X) {
  const { E, Parts, mkS, DATA_V, KEY, money, mkCtx, mkPage, base, collect } = X;
  const UIKEY = 'rep-v4-ui', checks = [];
  const errStart = collect.errors.length, reqStart = collect.requests.length;
  async function icheck(id, name, points, repro, fn) {
    if (process.env.I_ONLY && process.env.I_ONLY.split(',').indexOf(id) < 0) return;
    let r; const t0 = Date.now();
    try { r = await fn(); } catch (e) { r = { ratio: 0, detail: 'CRASH in check: ' + (e && e.stack || e).toString().slice(0, 500) }; }
    if (r instanceof Parts) r = { ratio: r.ratio, detail: r.detail };
    const ratio = Math.max(0, Math.min(1, r.ratio));
    const rec = { id, category: 'I', name, points, earned: Math.round(points * ratio * 100) / 100, ratio, detail: r.detail || '', repro, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
    checks.push(rec);
    console.log(`  [${rec.earned.toFixed(2)}/${points}] ${id} ${name}  (${rec.seconds}s)${ratio < 1 ? '  <-- ' + String(rec.detail).slice(0, 400) : ''}`);
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ctx = await mkCtx({ autoExpand: false }); const page = await mkPage(ctx, 'gest'); const cdp = await ctx.newCDPSession(page);
  let seq = 0;
  async function load(S, hash, ui) {
    await BOOT.boot(page, { base: base(), tag: 'i', S, DATA_V, hash, write: [([k, s, uk, u]) => { try { localStorage.clear(); if (s) localStorage.setItem(k, JSON.stringify(s)); if (u) localStorage.setItem(uk, JSON.stringify(u)); } catch (e) {} }, [KEY, S || null, UIKEY, ui || null]] });
  }
  const store = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  const hash = () => page.evaluate(() => location.hash);
  /* the main screen has three pages: Planned | Real | Saved. Planned rows and categories live on Planned, bought ones (owned-*) on Real. */
  const tab = async (k) => { await page.waitForSelector('[data-testid=tab-' + k + ']'); if ((await page.getAttribute('[data-testid=tab-' + k + ']', 'aria-selected')) !== 'true') { await page.click('[data-testid=tab-' + k + ']'); await page.waitForTimeout(60); } };
  const tabOf = async (id) => { const st = await store(); const h = st && st.houses.find((x) => x.id === id); return h && h.status === 'owned' ? 'real' : 'planned'; };
  const openCat = async (tp) => { await tab(/^owned-/.test(tp) || tp === 'sold-owned' ? 'real' : 'planned'); return openCat0(tp); };
  const openCat0 = async (tp) => { const h = page.locator(`[data-testid=cat-header-${tp}]`); if ((await h.count()) && (await h.getAttribute('aria-expanded')) === 'false') { await h.click(); await page.waitForTimeout(40); } };
  const openAll = async () => { for (const t of ['owned-house', 'owned-commercial', 'owned-business', 'house', 'commercial', 'business']) await openCat(t); };
  const sel = async (id) => { await tab(await tabOf(id)); if (!(await page.$(`[data-for="${id}"]`))) { await openAll(); await tab(await tabOf(id)); await page.click(`[data-row="${id}"] [data-testid=row-extra-toggle]`); await page.waitForTimeout(60); } };
  const ids = async (tp) => { await tab(/^owned-/.test(tp) ? 'real' : 'planned'); return ids0(tp); };
  const ids0 = (tp) => page.evaluate((t) => [...document.querySelectorAll(`[data-catbody=${t}] [data-testid=ledger-row]`)].map((r) => r.dataset.row), tp);
  const box = async (sl) => (await page.locator(sl).first().boundingBox());
  async function touch(points) { /* points: [{x,y,wait?}] first = start, last = end */
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0].x, y: points[0].y }] });
    if (points[0].wait) await page.waitForTimeout(points[0].wait);
    for (let i = 1; i < points.length; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: points[i].x, y: points[i].y }] }); await page.waitForTimeout(points[i].wait || 16); }
    const l = points[points.length - 1]; await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  const line = (x0, y0, x1, y1, n = 8, wait0) => Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, wait: i === 0 ? wait0 : 16 }));
  const home = (id, o) => E.newAsset('house', 'conv30', Object.assign({ id, addr: id.toUpperCase() + ' House', price: 200000, rent: 2400, tax: 150, ins: 80, growth: 3, closingPct: 3 }, o || {}));
  const mk = (houses, extra) => { const S = mkS({}, houses); S.orderV = 2; return Object.assign(S, extra || {}); };
  const $f = (n) => { const a = Math.abs(n), sg = n < -0.5 ? '−' : ''; return sg + '$' + Math.round(a).toLocaleString('en-US'); };
  const sample = () => { const S = E.seed(); E.orderByBuy(S); S.v = X.DATA_V; return S; };

  /* ---------------------------------------------------------------- I1 swipe back */
  await icheck('I1', 'Swipe right from the left edge goes back like iOS (touchstart within 24 px, dx > 70, |dy| < 45); ignored elsewhere', 12, 'CDP touch swipes on asset page, deep link, portfolio, inputs', async () => {
    const P = new Parts(); await load(sample());
    await sel('maple'); await page.click('[data-testid=open-details]'); await page.waitForTimeout(80); P.t((await hash()) === '#house-maple', 'Open details goes to the asset page', 0.4, await hash());
    await touch(line(60, 400, 200, 410)); await page.waitForTimeout(100); P.t((await hash()) === '#house-maple', 'a swipe that starts away from the edge does nothing', 1, await hash());
    await touch(line(8, 300, 160, 440)); await page.waitForTimeout(100); P.t((await hash()) === '#house-maple', 'a mostly vertical edge swipe does nothing (|dy| >= 45)', 1, await hash());
    await touch(line(8, 400, 60, 405)); await page.waitForTimeout(100); P.t((await hash()) === '#house-maple', 'a short edge swipe (dx < 70) does nothing', 1, await hash());
    await touch(line(8, 400, 170, 410)); await page.waitForTimeout(150); const h1 = await hash(); P.t(/^#?$/.test(h1) && (await page.locator('[data-testid=summary]').count()) === 1, 'edge swipe right returns to the Portfolio (browser history back)', 3, h1);
    await touch(line(8, 400, 170, 410)); await page.waitForTimeout(100); P.t(/^#?$/.test(await hash()) && (await page.locator('[data-testid=summary]').count()) === 1, 'on the Portfolio itself the swipe does nothing (no exit from the app)', 1);
    await page.evaluate(() => { location.hash = '#assumptions'; }); await page.waitForTimeout(100); await page.evaluate(() => { location.hash = '#add'; }); await page.waitForTimeout(100);
    await touch(line(10, 500, 180, 505)); await page.waitForTimeout(150); P.t((await hash()) === '#assumptions', 'back goes one step in history (Add -> Assumptions)', 1.5, await hash());
    await load(sample(), '#house-cedar'); await touch(line(5, 350, 150, 350, 6)); await page.waitForTimeout(150); P.t(/^#?$/.test(await hash()), 'a page opened from a link (no earlier page) goes to the Portfolio', 2, await hash());
    await load(sample(), '#house-maple'); await page.click('[data-info]'); await page.waitForTimeout(80); await touch(line(8, 300, 170, 305)); await page.waitForTimeout(100); P.t((await page.locator('[data-testid=info-sheet]').count()) === 0 && (await hash()) === '#house-maple', 'with an info sheet open, swipe back closes the sheet first', 0.5);
    return P; });

  /* ---------------------------------------------------------------- I2 long-press drag */
  await icheck('I2', 'Press-and-hold then drag reorders a row inside its category (mouse and touch); list order is saved; a plain tap still opens the panel', 14, 'Hold 600 ms, drag, release; check saved order', async () => {
    const P = new Parts(); await load(sample()); const before = await ids('house');
    P.t(before.join() === 'birch,willow,linden', 'the planned Homes list shows the saved (buy) order, sold homes live under Sold, bought homes in the Bought section', 0.4, before.join());
    await page.evaluate(() => document.querySelector('[data-rw=birch]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(60); const m = await box('[data-rw=birch]'), c = await box('[data-rw=willow]');
    await page.mouse.move(m.x + 40, m.y + 18); await page.mouse.down(); await page.waitForTimeout(150);
    P.t((await page.locator('.rw.lift').count()) === 0, 'no lift before the hold time (450 ms)', 0.4);
    await page.waitForTimeout(450); P.t((await page.locator('.rw.lift').count()) === 1 && (await page.locator('#app.dragmode').count()) === 1, 'after the hold the row lifts (shadow) and the list enters drag mode', 1);
    const sh = await page.evaluate(() => getComputedStyle(document.querySelector('.rw.lift')).boxShadow); P.t(sh && sh !== 'none', 'lifted row has a visible shadow', 0.3);
    const dy = (c.y + c.height / 2) - (m.y + m.height / 2) + 90; /* the finger must end past the middle of the row it passes (rows are tall now) */
    for (let i = 1; i <= 8; i++) { await page.mouse.move(m.x + 40, m.y + 18 + dy * i / 8); await page.waitForTimeout(20); }
    const tr = await page.evaluate(() => document.querySelector('.rw.lift').style.transform); P.t(/translateY/.test(tr), 'the lifted row follows the pointer', 0.4, tr);
    await page.mouse.up(); await page.waitForTimeout(120);
    const after = (await ids('house')), st = await store(); const nz = (a) => a.filter((x) => x !== 'elm').join(); /* a re-link can change the plan, so a home may move between Homes and Sold */
    P.t(nz(after) === 'willow,birch,linden', 'drop puts birch after willow in the list', 2.5, after.join());
    P.t(st.houses.map((h) => h.id).filter((x) => after.includes(x)).join() === after.join(), 'the new order is saved (list order = buy order)', 1.5);
    P.t((await page.locator('[data-testid=asset-panel]').count()) === 0 && (await hash()) === '' || /^#?$/.test(await hash()), 'releasing a drag does not also open a panel or navigate', 0.6);
    await page.waitForTimeout(400); await page.click('[data-row=birch] [data-testid=row-extra-toggle]'); await page.waitForTimeout(60); P.t((await page.locator('[data-for=birch]').count()) === 1, 'a normal tap still opens the row panel', 0.6);
    /* touch drag in Commercial */
    await openCat('commercial'); const cb0 = await ids('commercial'); await page.evaluate((id) => document.querySelector('[data-rw=' + id + ']').scrollIntoView({ block: 'center' }), cb0[1]); await page.waitForTimeout(60); const lake = await box('[data-rw=' + cb0[1] + ']'), harb = await box('[data-rw=' + cb0[0] + ']');
    await touch([{ x: lake.x + 60, y: lake.y + 20, wait: 650 }].concat(line(lake.x + 60, lake.y + 20, lake.x + 60, harb.y - 4, 8).slice(1))); await page.waitForTimeout(150);
    const cb1 = await ids('commercial'); P.t(cb1.join() === cb0.slice().reverse().join(), 'touch long-press and drag up swaps the two commercial rows', 2.5, cb0.join() + ' -> ' + cb1.join());
    P.t(nz(await ids('house')) === nz(after), 'dragging stays inside its category (homes unchanged)', 0.5);
    { await tab('real'); await page.evaluate(() => document.querySelector('[data-rw=cedar]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(60); const ob = await box('[data-rw=cedar]'); await page.mouse.move(ob.x + 40, ob.y + 18); await page.mouse.down(); await page.waitForTimeout(700); P.t((await page.locator('.rw.lift').count()) === 0, 'bought rows are ordered by age and cannot be dragged', 0.5); await page.mouse.move(5, 5); await page.mouse.up(); await page.waitForTimeout(100); if (await hash()) { await page.evaluate(() => { location.hash = ''; }); await page.waitForTimeout(100); } await tab('planned'); }
        /* a quick swipe is a scroll, not a drag */
    await openCat('house'); const b0 = (await ids('house')).join(); await page.evaluate(() => { const e = document.querySelector('[data-catbody=house] [data-rw]'); if (e) e.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(60); const hb = await box('[data-catbody=house] [data-rw]'); await touch(line(hb.x + 60, hb.y + 20, hb.x + 60, hb.y + 80, 4)); await page.waitForTimeout(100); P.t((await ids('house')).join() === b0 && (await page.locator('.rw.lift').count()) === 0, 'a quick touch-and-move (scroll) does not start a drag', 0.8);
    /* auto-scroll near the screen edge while dragging */
    await load(sample(), null, { coll: { drivers: true } }); await page.evaluate(() => window.scrollTo(0, 0));
    const w = await box('[data-rw=linden]'); await page.evaluate((y) => window.scrollTo(0, y - 500), w.y + 0);
    const lb = await box('[data-rw=linden]'); const y0 = lb.y + 20, sc0 = await page.evaluate(() => window.scrollY);
    await touch([{ x: lb.x + 60, y: y0, wait: 650 }, { x: lb.x + 60, y: y0 - 40 }, { x: lb.x + 60, y: 40, wait: 700 }, { x: lb.x + 60, y: 40, wait: 300 }]); await page.waitForTimeout(100);
    const sc1 = await page.evaluate(() => window.scrollY); P.t(sc1 < sc0 - 20, 'dragging near the top edge auto-scrolls the page', 1, sc0 + ' -> ' + sc1);
    return P; });

  /* ---------------------------------------------------------------- I3 move buttons */
  await icheck('I3', 'Move up / Move down buttons in the row panel (accessible alternative): reorder, disabled at the ends, panel stays open', 8, 'Select row, press Move', async () => {
    const P = new Parts(); await load(sample()); await sel('willow');
    P.t((await page.locator('[data-for=willow] [data-testid=move-up]').count()) === 1 && (await page.locator('[data-for=willow] [data-testid=move-down]').count()) === 1, 'panel has Move up and Move down (planned assets)', 1);
    await sel('cedar'); P.t((await page.locator('[data-for=cedar] [data-testid=move-up]').count()) === 0, 'bought assets have no Move buttons (they sit oldest first)', 0.5); await sel('willow');
    await page.click('[data-testid=move-down]'); await page.waitForTimeout(80); let o = await ids('house'); const nz = (a) => a.filter((x) => x !== 'elm').join(); P.t(nz(o) === 'birch,linden,willow', 'Move down swaps with the next planned home', 2, o.join());
    P.t((await page.locator('[data-for=willow]').count()) === 1, 'the panel stays open on the moved row', 1);
    await page.click('[data-testid=move-up]'); await page.click('[data-testid=move-up]'); await page.waitForTimeout(80); o = await ids('house'); P.t(nz(o) === 'willow,birch,linden', 'Move up twice brings it back to the top', 1.5, o.join());
    P.t(await page.locator('[data-testid=move-up]').isDisabled(), 'Move up is disabled on the first row', 1);
    await sel('linden'); P.t(await page.locator('[data-for=linden] [data-testid=move-down]').isDisabled(), 'Move down is disabled on the last row', 0.5);
    const st = await store(); P.t(st.houses.findIndex((h) => h.id === 'willow') < st.houses.findIndex((h) => h.id === 'birch'), 'saved list order follows', 1); return P; });

  /* ---------------------------------------------------------------- I4 auto funding */
  await icheck('I4', 'Funding follows the list order by itself: the trust funds each asset from everything before it (1,2,3 and 1,3,2), the wait lines and purchase months re-work after each move, nothing is stored per asset, no per-asset Funds picker, no re-link on plain load', 16, 'Reorder with Move buttons; read wait lines + saved state + plan', async () => {
    const P = new Parts(); const tgt = async () => Object.fromEntries((await store()).houses.map((h) => [h.id, h.target || '']));
    const S0 = mk([home('h1', { status: 'owned', paid: 24 }), home('h2', { buyIn: 30 }), home('h3', { buyIn: 40 })]);
    await load(S0); const t0 = await tgt(); P.t(t0.h1 === '' && t0.h2 === '' && t0.h3 === '', 'plain load stores no per-asset links', 1.5, JSON.stringify(t0));
    const sm = await load(sample()).then(store); P.t(sm.houses.every((h) => !h.target), 'the sample carries no old funding links either (the trust decides)', 1, '');
    const dpl = async (id) => { await tab(await tabOf(id)); return page.locator(`[data-row=${id}] [data-testid=dp-line]`).textContent().catch(() => ''); }; const mon = (t) => { const m = /in (\d+) mo \(|today/.exec(t); return m ? (m[1] ? +m[1] : 0) : null; }, n0 = (x) => Math.round(x).toLocaleString('en-US'); /* the planned row line 2 is "verdict · needs $X · in N mo (Mon YYYY)": N = months from today = the purchase month */
    await load(S0); await sel('h2'); await page.click('[data-testid=move-down]'); await page.waitForTimeout(60); await page.click('[data-testid=move-up]'); await page.waitForTimeout(80);
    let t = await tgt(); let pl = E.planR(E.normalize(clone(await store())));
    P.t((await ids('house')).join() === 'h2,h3' && Object.values(t).every((v) => v === ''), 'order 1,2,3 after a move down and back up; still no stored links', 2, JSON.stringify(t));
    let l2 = await dpl('h2'), l3 = await dpl('h3'); P.t(mon(l2) === pl.purchase.h2 && l2.includes('needs $' + n0(pl.trust.h2.need)) && pl.trust.h2.n === 1 && mon(l3) === pl.purchase.h3 && l3.includes('needs $' + n0(pl.trust.h3.need)) && pl.trust.h3.n === 2 && /^Possible/.test(l2) && /^Loan due/.test(await dpl('h1')), 'the planned rows show Possible, what the asset needs and the engine purchase month (the pool sizes are the engine\'s: house 2: pool of 1, house 3: pool of 2); the bought row shows its loan', 3, l2 + ' | ' + l3);
    P.t(pl.purchase.h2 >= 30 && pl.purchase.h3 >= Math.max(40, pl.purchase.h2) && pl.trust.h3.n === 2, 'purchase months: each asset is bought when the pool of everything before it can pay, never before its "not before" month', 1.5, JSON.stringify(pl.purchase));
    await sel('h3'); await page.click('[data-for=h3] [data-testid=move-up]'); await page.waitForTimeout(80);
    t = await tgt(); pl = E.planR(E.normalize(clone(await store()))); l2 = await dpl('h2'); l3 = await dpl('h3');
    P.t((await ids('house')).join() === 'h3,h2' && Object.values(t).every((v) => v === ''), 'order 1,3,2 after moving house 3 up; still no stored links', 2, JSON.stringify(t));
    P.t(mon(l3) === pl.purchase.h3 && pl.trust.h3.n === 1 && l3.includes('needs $' + n0(pl.trust.h3.need)) && mon(l2) === pl.purchase.h2 && pl.trust.h2.n === 2 && l2.includes('needs $' + n0(pl.trust.h2.need)) && pl.purchase.h3 <= pl.purchase.h2, 'house 3 is now funded by the pool of house 1 alone and house 2 by houses 1 and 3 (waits and months re-worked at once)', 3, l3 + ' | ' + l2);
    await page.evaluate(() => { location.hash = '#house-h2'; }); await page.waitForTimeout(100);
    P.t((await page.locator('[data-sel]').count()) === 0 && (await page.locator('[data-testid=trust-section]').count()) === 1 && (await page.locator('[data-testid=trust-pool]').count()) === 1, 'the asset page has no Funds picker; it explains how the trust funds the asset', 1.5);
    const biz = E.newAsset('business', 'sba7a', { id: 'b1', addr: 'Biz One', price: 400000, rent: 9000, buyIn: 20 });
    const S1 = mk([home('x1', { status: 'owned', paid: 24 }), home('x2', { buyIn: 30 }), home('x4', { buyIn: 35 }), home('x3', { status: 'owned', paid: 10 }), biz]);
    await load(S1); await sel('x2'); await page.click('[data-testid=move-down]'); await page.waitForTimeout(80); t = await tgt();
    P.t(Object.values(t).every((v) => v === ''), 'reordering inside a category never writes a link', 0.7, JSON.stringify(t));
    const U = mk([home('u1', { status: 'owned', target: 'u3' }), home('u2'), home('u3'), E.newAsset('commercial', 'comm25', { id: 'c1', target: 'u2' })]); E.relink(U); const ut = Object.fromEntries(U.houses.map((h) => [h.id, h.target]));
    const pu = E.planR(U), U2 = mk([home('u1', { status: 'owned' }), home('u2'), home('u3'), E.newAsset('commercial', 'comm25', { id: 'c1' })]), pu2 = E.planR(U2);
    P.t(Object.values(ut).every((v) => v === '') && JSON.stringify(pu.purchase) === JSON.stringify(pu2.purchase), 'Engine.relink clears old links, and old links never change the plan (same purchase months with or without them)', 1.3, JSON.stringify(ut));
    return P; });

  /* ---------------------------------------------------------------- I5 duplicate */
  await icheck('I5', 'Duplicate: from the row panel and the asset page; copy sits right after the original, named "(copy)", planned, funded by the trust like any later asset', 10, 'Panel > Duplicate; asset page > Duplicate', async () => {
    const P = new Parts(); await load(sample()); await sel('maple'); const n0 = (await store()).houses.length; const homesBefore = await ids('house'); await sel('maple');
    await page.click('[data-for=maple] [data-testid=row-duplicate]'); await page.waitForTimeout(100);
    const st = await store(), i = st.houses.findIndex((h) => h.id === 'maple'), cp = st.houses[i + 1];
    P.t(st.houses.length === n0 + 1 && cp && cp.addr === '1412 Maple Ridge Dr (copy)' && cp.status === 'planned' && cp.id !== 'maple', 'copy added right after the original in the saved list, "(copy)", planned', 2.5, cp && cp.addr);
    const hb = await ids('house'); P.t(hb.filter((x) => x !== 'elm').join() === [cp.id].concat(homesBefore.filter((x) => x !== 'elm')).join(), 'the planned Homes list shows the copy (it is planned, so it joins the Planned section at its place in the list)', 1.5, hb.join());
    P.t((await page.locator(`[data-for="${cp.id}"]`).count()) === 1, 'the copy is selected so you can edit it', 0.7);
    const wl = await page.locator(`[data-row="${cp.id}"] [data-testid=dp-line]`).textContent().catch(() => ''); P.t(!cp.target && !st.houses[i].target && /^(Possible|Not possible)/.test(wl.trim()) && (cp.price === st.houses[i].price) && cp.rent === st.houses[i].rent, 'no links to relink: the copy shows its own verdict and math line (planned, funded by everything above it); the numbers are copied', 2.5, wl);
    const ct = await page.locator('[data-testid=cat-count-house]').textContent(); P.t(ct.trim() === String(hb.length), 'the category stat strip counts it', 1, ct);
    await page.click('[data-for="' + cp.id + '"] [data-testid=open-details]'); await page.waitForTimeout(80); await page.click('[data-testid=h-duplicate]'); await page.waitForTimeout(120);
    const s2 = await store(); P.t(s2.houses.length === n0 + 2 && /#house-/.test(await hash()) && (await hash()) !== '#house-' + cp.id && / \(copy1\)$/.test((await page.inputValue('input.t'))), 'asset page Duplicate makes another copy and opens it', 1.8, await page.inputValue('input.t'));
    return P; });

  /* ---------------------------------------------------------------- I6 sections */
  await icheck('I6', 'Portfolio = total row + Homes / Commercial / Businesses dropdowns (name left, chevron right, stat strip: count, before/after loan, worth, DSCR, lasts), empty sections, Sold section only when something sold', 12, 'Headers, subtitles, collapse state, empty portfolio', async () => {
    const P = new Parts(); await load(sample());
    const heads = () => page.evaluate(() => [...document.querySelectorAll('[data-testid^=cat-header-]')].map((h) => ({ t: h.dataset.testid.replace('cat-header-', ''), name: h.querySelector('b').textContent, sub: h.parentElement.querySelector('.cats').textContent.trim(), chev: !!h.querySelector('.chev'), x: h.querySelector('b').getBoundingClientRect().left, cx: h.querySelector('.chev').getBoundingClientRect().left, exp: h.getAttribute('aria-expanded'), sy: h.parentElement.querySelector('.cats').getBoundingClientRect().top - h.querySelector('b').getBoundingClientRect().bottom })));
    const hp = await heads(); await tab('real'); const hr = await heads(); await tab('planned'); const hd = hr.concat(hp); /* Real page first (Homes, Businesses), then the Planned page (Homes, Commercial, Businesses, Sold) */
    P.t(hr.map((h) => h.t).join() === 'owned-house,owned-business' && hp.map((h) => h.t).join() === 'sold,house,commercial,business' /* EXPECTATION CHANGE (Sold card moved under More figures): was house,commercial,business,sold */ && hd.slice(0, 5).map((h) => h.name).join() === 'Homes,Businesses,Sold,Homes,Commercial' /* was Homes,Businesses,Homes,Commercial,Businesses */, 'the Real page has the categories that hold something bought; the Planned page has its three categories, plus Sold when something is sold', 1.5, hd.map((h) => h.name).join());
    P.t(hd.every((h) => h.chev && h.cx > h.x + 150 && h.sy >= -2 && h.sy < 14), 'name on the left, chevron on the right, subtitle directly below the name', 1, JSON.stringify(hd.map((h) => [Math.round(h.x), Math.round(h.cx), Math.round(h.sy)])));
    P.t(hd[0].exp === 'true' && hd[1].exp === 'false' && hd[2].exp === 'false' && hd[3].exp === 'true' && hd[4].exp === 'false' && hd[5].exp === 'false' /* EXPECTATION CHANGE: Sold is now the 3rd header (under More figures), collapsed; the Planned Homes moved from index 2 to 3 */, 'default: the Homes of each page open, the others collapsed', 1, hd.map((h) => h.exp).join());
    const S = sample(), pl = E.planR(S), vis = (tp) => S.houses.filter((h) => (h.type || 'house') === tp && h.status !== 'owned' && !(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM));
    const cnt = (tp, own) => S.houses.filter((h) => (h.type || 'house') === tp && (h.status === 'owned') === !!own && !(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM)).length;
    const strip = (x, tp, own) => x.sub.startsWith(String(cnt(tp, own))) && /^\d+ [a-z ]+ · [+−]\$[\d,.]+[MBK]?\/mo · \$[\d.,]+[KMB]?$/.test(x.sub.replace(/\s+/g, ' '));
    P.t(strip(hd[0], 'house', 1) && strip(hd[1], 'business', 1) && strip(hd[3], 'house') && strip(hd[4], 'commercial') && strip(hd[5], 'business') /* EXPECTATION CHANGE: indices 2,3,4 -> 3,4,5 (Sold header now sits at index 2) */ && (await page.locator('[data-testid=cat-count-house]').textContent()).trim() === String(cnt('house')), 'each header carries the one-line strip: "N homes · +$X/mo · $Y" (count, cash flow today, price)', 2, hd.map((h) => h.sub).join(' | '));
    const tot = await page.evaluate(() => { const t = document.querySelector('[data-testid=ledger-total]'), h = document.querySelector('[data-testid=cat-header-house]'); return { y: t.getBoundingClientRect().top, hy: h.getBoundingClientRect().top, cf: document.querySelector('[data-testid=total-cf]').textContent, kpi: document.querySelector('[data-testid=kpi-cashflow]').textContent }; });
    P.t(tot.y < tot.hy && tot.cf === tot.kpi + '/mo', 'portfolio total row sits above the sections and equals the summary cash flow', 1, JSON.stringify(tot));
    await page.click('[data-testid=cat-header-house]'); await page.waitForTimeout(60); P.t((await page.locator('[data-catbody=house]').count()) === 0, 'tapping a header collapses it', 0.6);
    await page.reload(); await page.waitForSelector('[data-testid=cat-header-house]'); P.t((await page.locator('[data-catbody=house]').count()) === 0, 'the collapsed state is remembered after reload (UI.coll)', 0.8);
    await openCat('house'); await openCat('commercial'); await page.waitForTimeout(40);
    await page.click('[data-testid=add-commercial]'); await page.waitForTimeout(80); P.t((await hash()) === '#add' && (await page.locator('[data-addtype=commercial].on').count()) === 1, 'the Add button in Commercial opens Add with Commercial preselected', 0.7);
    await page.click('[data-testid=confirm-add]'); await page.waitForTimeout(100); const nid = (await hash()).replace('#house-', ''); await page.evaluate(() => { location.hash = '#'; }); await page.waitForTimeout(100);
    const ct = (await page.locator('[data-testid=cat-count-commercial]').textContent()).trim(); P.t(ct === String(vis('commercial').length + 1), 'a newly added asset is counted in its category strip', 1.5, ct);
    /* empty portfolio */
    await load(mk([]), null); const t = await page.evaluate(() => document.getElementById('app').innerText);
    P.t((await page.locator('[data-testid^=cat-header-]').count()) === 3 && !/nothing here yet/i.test(t) && (await page.locator('[data-testid=cat-sub-house]').textContent()).trim() === 'None yet', 'empty portfolio: three dropdowns, each "None yet", no "Nothing here yet" screen', 1.5, t.slice(0, 120).replace(/\n/g, ' '));
    P.t((await page.locator('[data-testid^=cat-empty-]').count()) === 3 && (await page.locator('[data-testid=add-house],[data-testid=add-commercial],[data-testid=add-business]').count()) === 3, 'each empty section shows None yet and an Add button', 1);
    await load(mk([home('s1', { status: 'owned' }), home('s2')]), null); P.t((await page.locator('[data-testid=cat-header-sold]').count()) === 0, 'no Sold section when nothing is sold', 0.8); return P; });

  /* ---------------------------------------------------------------- I7 extra panel */
  await icheck('I7', 'Selecting a row opens a nested panel with the extra payment and live effects: loan term, monthly payment, next down payment (with cash flow); all match the engine and the asset page', 12, 'Panel on maple, type extra, compare with engine + asset page', async () => {
    const P = new Parts(); const S = () => E.seed(); await load(sample());
    P.t((await page.locator('[data-testid=extra-input]').count()) === 0 && (await page.locator('[data-testid=asset-panel]').count()) === 0, 'nothing expanded and no extra field until a row is selected', 0.6);
    await sel('maple'); P.t((await page.locator('[data-for=maple] [data-testid=extra-input]').count()) === 1 && (await page.locator('[data-testid=extra-effects]').count()) === 1 && (await page.locator('[data-for=maple] [data-testid=open-details]').count()) === 1, 'selecting a row opens its panel: extra field, effects, Open details', 0.8);
    const rd = async () => page.evaluate(() => { const g = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : ''; }; const nx = document.querySelector('[data-testid=eff-next]'); return { term: g('[data-testid=eff-term]'), termSub: document.querySelector('[data-testid=eff-term]').nextElementSibling.textContent, pay: g('[data-testid=eff-payment]'), next: g('[data-testid=eff-next]'), nextSub: nx.nextElementSibling.textContent, nextLab: nx.previousElementSibling.textContent, open: nx.dataset.open, sooner: nx.dataset.sooner, val: document.querySelector('[data-testid=extra-input]').value }; });
    const mmy = (m) => require('./dates.js').mond(m), ymf = (m) => (m < 12 ? m + ' mo' : Math.floor(m / 12) + ' yr' + (m % 12 ? ' ' + (m % 12) + ' mo' : ''));
    const check1 = async (label, X) => {
      const St = E.normalize(clone(await store())); const h = E.H(St, 'maple'); const pl = E.planR(St), v = pl.V.maple, S00 = clone(St); E.H(S00, 'maple').extra = 0; const p0 = E.planR(S00).loanEnd.maple, pX = pl.loanEnd.maple;
      const nx = St.houses.slice(St.houses.indexOf(h) + 1).find((q) => q.status === 'planned'), S0x = clone(St); E.H(S0x, 'maple').extra = 0; const open = pl.purchase[nx.id], m0 = E.planR(S0x).purchase[nx.id], sooner = m0 - open, tr = pl.trust[nx.id];
      const r = await rd();
      P.t(r.term.startsWith('Paid off in ' + ymf(pX)), label + ': loan term "Paid off in ' + ymf(pX) + '" matches the plan (with the automatic extra)', 1, r.term);
      P.t(X > 0 ? new RegExp('^' + ymf(p0 - pX).replace(/ /g, ' ') + ' sooner').test(r.termSub) : /extra payments pay it off sooner/.test(r.termSub), label + ': months sooner vs no extra = ' + (p0 - pX), 1, r.termSub);
      P.t(r.pay === $f(v.payment), label + ': monthly payment = engine payment now ' + $f(v.payment), 0.8, r.pay);
      P.t(+r.open === open && r.next === mmy(open) && r.nextLab.includes('Next the trust funds') && r.nextLab.includes(nx.addr), label + ': next purchase (' + nx.addr + ') in ' + open + ' mo (engine)', 1.2, r.next + ' / open ' + r.open + ' / ' + r.nextLab);
      P.t(+r.sooner === sooner && new RegExp(X > 0 ? (sooner > 0 ? '^' + ymf(sooner) + ' sooner than with no extra' : '^no faster than with no extra') : 'extra payments make it sooner').test(r.nextSub), label + ': "' + sooner + ' mo sooner" = purchase month with no extra - with the extra (independent re-run of the plan)', 1.2, r.nextSub);
      P.t(new RegExp('the trust reinvests \\$' + Math.round(tr.cf).toLocaleString('en-US') + '/mo of cash flow toward it').test(r.nextSub), label + ': the trust\'s reinvested cash flow ($' + Math.round(tr.cf) + '/mo) is shown', 1.2, r.nextSub);
      return { v, pl }; };
    await check1('maple as saved (extra 600)', 600);
    await setX('0'); await check1('extra 0', 0);
    await setX('1500'); const { v } = await check1('extra 1500', 1500);
    async function setX(val) { await page.evaluate((val) => { const el = document.querySelector('[data-testid=extra-input]'); el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); document.activeElement.blur(); }, val); await page.waitForTimeout(80); }
    /* engine: the reinvested cash flow really leaves your cash line (Finances) in the month it moves into the trust */
    const St = E.normalize(clone(await store())); const pl2 = E.plan(St), mo = 6, dpc = pl2.dpCash[mo]; /* the identity is an engine property: future dollars */ P.t(dpc > 0, 'pooled cash flow moves into the trust each month while purchases wait (month ' + mo + ': $' + Math.round(dpc) + ')', 0.8, dpc);
    const f = E.finance(St, pl2), Rr = f.series, dl = Rr.liquid[mo] - Rr.liquid[mo - 1], expect = Rr.net[mo] + Rr.interest[mo] + Rr.capitalIn[mo] - Rr.outsideCall[mo] - Rr.oneTime[mo] - Rr.saleTax[mo] - pl2.dpCash[mo] - pl2.jobUsed[mo];
    P.t(Math.abs(dl - expect) < 0.01 && pl2.dpCash[mo] > 0, 'Finances cash line drops by exactly the cash flow reinvested in that month (liquid change = net + interest - reinvested)', 0.8, Math.round(dl) + ' vs ' + Math.round(expect));
    { const fr = E.finance(St, E.planR(St)), gf = (t) => Math.pow(1 + St.p.inflation / 100, t / 12), dlr = fr.series.liquid[mo] - fr.series.liquid[mo - 1], exp2 = expect / gf(mo) + Rr.liquid[mo - 1] * (1 / gf(mo) - 1 / gf(mo - 1)); P.t(Math.abs(dlr - exp2) < 0.01, 'in today\'s dollars the same line changes by that amount divided by the month\'s cost increase, plus the erosion of the cash already held', 0.2, Math.round(dlr) + ' vs ' + Math.round(exp2)); }
    /* asset page sync */
    await page.evaluate(() => { location.hash = '#house-maple'; }); await page.waitForTimeout(100); await page.click('[data-coll=loan]').catch(() => {}); await page.waitForTimeout(40);
    const ap = await page.evaluate(() => ({ x: (document.querySelector('[data-p="h.maple.extra"]') || {}).value, pay: (document.querySelector('[data-testid=h-payment]') || {}).textContent })); P.t(ap.x === '1,500' && ap.pay === $f(v.payment), 'the asset page Extra / month and Payment now equal the panel numbers', 1.2, JSON.stringify(ap));
    await page.fill('[data-p="h.maple.extra"]', '900'); await page.evaluate(() => document.activeElement.blur()); await page.waitForTimeout(60); await page.evaluate(() => { location.hash = '#'; }); await page.waitForTimeout(100); await sel('maple'); P.t((await rd()).val === '900', 'editing Extra on the asset page shows in the panel', 0.8);
    return P; });

  /* ---------------------------------------------------------------- I8 loan line in rent & expenses */
  await icheck('I8', 'Rent & expenses shows the loan payment (P&I + mortgage insurance, extra) and the cash flow after the loan, in sync with Payment now / Cash flow now', 6, 'Asset page > Rent & expenses', async () => {
    const P = new Parts(); const S = sample(); await load(S, '#house-maple'); await page.click('[data-coll=rent]'); await page.waitForTimeout(60);
    const g = () => page.evaluate(() => { const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }; return { noi: t('[data-testid=rent-noi]'), loan: t('[data-testid=rent-loan]'), extra: t('[data-testid=rent-extra]'), cf: t('[data-testid=rent-cf]'), cfx: t('[data-testid=rent-cf-x]'), kcf: t('[data-testid=h-cf]'), kpay: t('[data-testid=h-payment]') }; });
    const h = E.H(S, 'maple'), v = E.view(S, h); let r = await g();
    P.t(r.loan === '−' + $f(v.P + v.mip) && r.cf.replace('+', '') === $f(v.cf) && r.noi.replace('+', '') === $f(v.noi), 'loan payment line = P&I' + (v.mip ? ' + insurance' : '') + ' and cash flow after the loan = engine', 1.5, JSON.stringify(r));
    P.t(r.extra === '−' + $f(v.X) && r.cfx.replace('+', '') === $f(v.cf - v.X) || (r.cfx || '').replace('+', '') === $f(v.cf - v.X), 'extra payment line and "after the extra payment" cash flow shown', 1, JSON.stringify(r));
    P.t(r.cf === r.kcf, 'cash flow after the loan equals "Cash flow now" at the top of the page', 1, r.cf + ' vs ' + r.kcf);
    await page.click('[data-coll=loan]'); await page.waitForTimeout(60); await page.fill('[data-p="h.maple.rate"]', '9'); await page.evaluate(() => document.activeElement.blur()); await page.waitForTimeout(80); h.rate = 9; const v2 = E.view(S, h); r = await g();
    P.t(r.loan === '−' + $f(v2.P + v2.mip) && r.cf === r.kcf && r.cf.replace('+', '') === $f(v2.cf), 'editing the rate updates the loan line and cash flow together', 1, JSON.stringify(r));
    const F = mk([E.newAsset('house', 'fha', { id: 'f1', addr: 'FHA Home', status: 'owned', price: 250000, rent: 2600, paid: 6 })]); await load(F, '#house-f1'); await page.click('[data-coll=rent]'); await page.waitForTimeout(60);
    const fv = E.view(F, F.houses[0]); r = await g(); P.t(r.loan === '−' + $f(fv.P + fv.mip) && fv.mip > 0 && /mortgage insurance/.test(await page.locator('[data-testid=loan-lines]').innerText()), 'mortgage insurance is part of the loan payment line (FHA)', 1, JSON.stringify(r));
    const C = mk([E.newAsset('house', 'cashh', { id: 'c0', addr: 'Cash Home', status: 'owned', price: 150000 })]); await load(C, '#house-c0'); await page.click('[data-coll=rent]'); await page.waitForTimeout(60); r = await g(); P.t(r.loan === 'no loan', 'a cash purchase shows "no loan"', 0.5, r.loan); return P; });

  /* ---------------------------------------------------------------- I9 keyboard */
  await icheck('I9', 'Swipe down closes the keyboard (blurs the focused field); Enter / Done also closes it; swipes inside the field or upward do not', 6, 'Focus the extra field, swipe', async () => {
    const P = new Parts(); await load(sample()); await sel('maple'); const act = () => page.evaluate(() => (document.activeElement && document.activeElement.dataset && document.activeElement.dataset.testid) || document.activeElement.tagName);
    await page.click('[data-testid=extra-input]'); P.t((await act()) === 'extra-input', 'the field is focused (keyboard up)', 0.4, await act());
    await touch(line(200, 700, 200, 640, 5)); await page.waitForTimeout(60); P.t((await act()) === 'extra-input', 'an upward swipe does not close it', 0.8);
    const ib = await box('[data-testid=extra-input]'); await touch(line(ib.x + 20, ib.y + 10, ib.x + 20, ib.y + 120, 6)); await page.waitForTimeout(60); P.t((await act()) === 'extra-input', 'a drag that starts inside the field (selecting) does not close it', 0.8);
    await touch(line(200, 560, 200, 680, 6)); await page.waitForTimeout(80); P.t((await act()) === 'BODY', 'a downward swipe on the page blurs the field (keyboard closes)', 2.5, await act());
    await page.click('[data-testid=extra-input]'); await page.keyboard.press('Enter'); await page.waitForTimeout(60); P.t((await act()) === 'BODY', 'Enter / Done closes the keyboard', 1, await act());
    await page.click('[data-testid=extra-input]'); await page.evaluate(() => window.scrollBy(0, 60)); await touch(line(200, 300, 200, 420, 6)); await page.waitForTimeout(60); P.t((await act()) === 'BODY', 'works on a scrolled page too', 0.5); return P; });

  /* ---------------------------------------------------------------- I10 layout and clean run */
  await icheck('I10', 'Layout and hygiene: no sideways scroll at 320 / 390 / 430 with a panel open and while dragging, new buttons >= 44 px, no console errors or outside requests', 4, 'Resize, measure, collected errors', async () => {
    const P = new Parts(); await load(sample()); await openAll(); await sel('maple'); let bad = [];
    for (const w of [320, 390, 430]) { await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(60); const r = await page.evaluate(() => ({ sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), W: window.innerWidth })); if (r.sw > r.W + 1) bad.push(w + ':' + r.sw); }
    await page.setViewportSize({ width: 390, height: 844 }); P.t(bad.length === 0, 'no horizontal overflow with a panel open', 1, bad.join());
    const small = await page.evaluate(() => [...document.querySelectorAll('[data-testid=asset-panel] button, [data-testid^=cat-header-], [data-testid=row-toggle]')].filter((e) => e.offsetParent).map((e) => { const b = e.getBoundingClientRect(); return b.width >= 43.5 && b.height >= 43.5 ? null : (e.dataset.testid || e.className) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height); }).filter(Boolean)); P.t(small.length === 0, 'panel buttons, row toggles and section headers are >= 44 px', 1.2, small.join());
    await tab('real'); const m = await box('[data-rw=cedar]'); await page.mouse.move(m.x + 40, m.y + 18); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.move(m.x + 40, m.y + 60); const sw = await page.evaluate(() => document.documentElement.scrollWidth); await page.mouse.up(); await page.waitForTimeout(100); P.t(sw <= 391, 'no sideways overflow while a row is lifted', 0.6, sw);
    const errs = collect.errors.slice(errStart), reqs = collect.requests.slice(reqStart), ext = reqs.filter((u) => !/^(http:\/\/127\.0\.0\.1|http:\/\/localhost|data:|blob:|about:)/.test(u));
    P.t(errs.length === 0 && ext.length === 0, 'no console errors / page errors and no outside requests (' + errs.length + ' / ' + ext.length + ')', 1.2, [...new Set(errs)].slice(0, 2).join(' || ').slice(0, 300)); return P; });


  /* ---------------------------------------------------------------- I11 buy order across categories */
  const SHOTS = path.join(__dirname, 'screens');
  const orderState = () => { const S = E.normalize({ g: Object.assign({}, E.GDEF), p: Object.assign(E.samplePersonal(), { cash: 3e6, jobs: [] }), houses: [home('h1'), home('h2'), E.newAsset('commercial', 'comm25', { id: 'c1', addr: 'Strip Mall', price: 900000, rent: 9500, tax: 400, ins: 300, hoa: 0, growth: 3 }), E.newAsset('business', 'bankbiz', { id: 'b1', addr: 'Bakery Business', price: 400000, rent: 14000, growth: 3 })] }); S.v = X.DATA_V; S.orderV = 2; S.added = E.ADDITIONS.map((a) => a.key); return S; };
  const ordIds = async () => (await store()).houses.filter((h) => h.status !== 'owned').map((h) => h.id);
  await icheck('I11', 'Buy order screen: one flat list of all planned assets (homes, commercial, business) with number badges; Up / Down / Top / Move to # / Buy position box / drag move assets ACROSS categories, renumber at once, Undo works, targets >= 44 px, no overflow at 320 / 390 / 430 in light and dark', 14, 'Playwright: #order, buttons, boxes, mouse long-press drag, Undo, screenshots', async () => {
    const P = new Parts(); await load(orderState(), '#order');
    const rows = () => page.evaluate(() => [...document.querySelectorAll('[data-testid=order-row]')].map((r) => ({ id: r.dataset.row, no: r.querySelector('[data-testid=order-no]').textContent.trim(), status: r.querySelector('[data-testid=order-status]').textContent })));
    let r = await rows(); P.t(r.map((x) => x.id).join() === 'h1,h2,c1,b1' && r.map((x) => x.no).join() === '1,2,3,4' && r.every((x) => /Possible|Not possible/.test(x.status)), 'lists all 4 planned assets in one list with badges 1..4 and a status line', 1.5, JSON.stringify(r));
    await page.click('[data-row="b1"] [data-testid=order-up]'); await page.waitForTimeout(80); P.t((await ordIds()).join() === 'h1,h2,b1,c1', 'Up moves the business above the commercial property (across categories)', 1.5, (await ordIds()).join());
    await page.click('[data-row="b1"] [data-testid=order-top]'); await page.waitForTimeout(80); r = await rows(); P.t((await ordIds()).join() === 'b1,h1,h2,c1' && r.map((x) => x.id).join() === 'b1,h1,h2,c1' && r.map((x) => x.no).join() === '1,2,3,4', 'Move to top puts the business above every home; the list and numbers update at once', 1.5, (await ordIds()).join());
    P.t((await page.locator('[data-testid=undo-banner]').count()) === 1, 'an Undo toast appears after a reorder', 1); await page.click('[data-undo]'); await page.waitForTimeout(80); P.t((await ordIds()).join() === 'h1,h2,b1,c1', 'Undo brings the previous order back', 1.5, (await ordIds()).join());
    await page.click('[data-row="c1"] [data-testid=order-down]').catch(() => {}); await page.click('[data-row="h1"] [data-testid=order-down]'); await page.waitForTimeout(80); P.t((await ordIds()).join() === 'h2,h1,b1,c1', 'Down moves a home below the next home', 1, (await ordIds()).join());
    await page.fill('[data-row="c1"] [data-testid=order-pos]', '1'); await page.keyboard.press('Enter'); await page.waitForTimeout(150); P.t((await ordIds()).join() === 'c1,h2,h1,b1', 'Move to # 1 on the commercial property moves it first', 1.5, (await ordIds()).join());
    await page.fill('[data-row="b1"] [data-testid=order-pos]', '9'); await page.keyboard.press('Enter'); await page.waitForTimeout(150); P.t((await ordIds()).join() === 'c1,h2,h1,b1' && (await page.inputValue('[data-row="b1"] [data-testid=order-pos]')) === '4', 'a number past the end is clamped to the last position with a note', 1, (await ordIds()).join() + ' box ' + (await page.inputValue('[data-row="b1"] [data-testid=order-pos]')));
    /* drag: hold the handle of the last row and move it to the top */
    const hb = await box('[data-row="b1"] [data-testid=order-handle]'), top = await box('[data-row="c1"]'); await page.mouse.move(hb.x + 10, hb.y + 10); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.move(hb.x + 10, top.y + 4, { steps: 12 }); await page.waitForTimeout(100); await page.mouse.up(); await page.waitForTimeout(200);
    P.t((await ordIds())[0] === 'b1', 'holding the drag handle and moving the business to the top works across categories', 2, (await ordIds()).join());
    /* buy position box on the asset page and in the Extra panel */
    await load(orderState(), '#house-c1'); await page.waitForSelector('[data-p="h.c1.pos"]'); P.t((await page.inputValue('[data-p="h.c1.pos"]')) === '3', 'the asset page has a Buy position box showing its number', 0.8);
    await page.fill('[data-p="h.c1.pos"]', '1'); await page.keyboard.press('Enter'); await page.waitForTimeout(200); P.t((await ordIds()).join() === 'c1,h1,h2,b1' && (await page.locator('[data-testid=asset-buy-no]').getAttribute('data-no')) === '1', 'typing 1 in Buy position makes it the first asset and renumbers it', 1.5, (await ordIds()).join());
    await load(orderState(), '#'); await tab('planned'); await openAll(); await sel('b1'); await page.waitForSelector('[data-for="b1"] [data-p="h.b1.pos"]'); await page.fill('[data-for="b1"] [data-p="h.b1.pos"]', '2'); await page.keyboard.press('Enter'); await page.waitForTimeout(200); P.t((await ordIds()).join() === 'h1,b1,h2,c1', 'the Extra panel Buy position box moves a business between two homes', 1, (await ordIds()).join());
    /* sizes, overflow, themes, screenshots */
    const bad = []; for (const sch of ['light', 'dark']) { await page.emulateMedia({ colorScheme: sch }); for (const w of [320, 390, 430]) { await page.setViewportSize({ width: w, height: 844 }); await load(orderState(), '#order'); await page.waitForTimeout(100);
        const m = await page.evaluate(() => ({ sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), W: innerWidth, small: [...document.querySelectorAll('[data-testid=order-row] button, [data-testid=order-row] input')].filter((e) => { const b = e.getBoundingClientRect(); return b.width < 43.5 || b.height < 43.5; }).length, over: [...document.querySelectorAll('[data-testid=order-row] *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length }));
        if (m.sw > m.W + 1 || m.small || m.over) bad.push(sch + w + ' ' + JSON.stringify(m)); if (w === 390 || w === 320) await page.screenshot({ path: path.join(SHOTS, 'order-' + w + '-' + sch + '.png'), fullPage: true }); } }
    await page.emulateMedia({ colorScheme: 'light' }); await page.setViewportSize({ width: 390, height: 844 }); P.t(bad.length === 0, 'no sideways scroll, nothing past the edge and every button / box >= 44 px at 320 / 390 / 430 in light and dark', 2, bad.join(' | ')); return P; });

  /* ---------------------------------------------------------------- I13 hold-and-drag reorder with a main button, real touch events */
  const bigState = () => { const S = E.normalize({ g: Object.assign({}, E.GDEF), p: Object.assign(E.samplePersonal(), { cash: 3e6, jobs: [] }), houses: [home('h1'), home('h2'), home('h3'), home('h4'), home('h5'), home('h6'), E.newAsset('commercial', 'comm25', { id: 'c1', addr: 'Strip Mall', price: 900000, rent: 9500, tax: 400, ins: 300, hoa: 0, growth: 3 }), E.newAsset('business', 'bankbiz', { id: 'b1', addr: 'Bakery Business', price: 400000, rent: 14000, growth: 3 })] }); S.v = X.DATA_V; S.orderV = 2; S.added = E.ADDITIONS.map((a) => a.key); return S; };
  await icheck('I13', 'Reorder by hold: a main Reorder button on the Planned page opens the Buy order page; pressing and holding anywhere on a row (real touch events) lifts it, dragging moves it across categories with a drop line and edge auto-scroll, release renumbers; a quick swipe still scrolls and moves nothing; a tap or hold without moving changes nothing; 44 px, no overflow at 320 / 390 / 430 light and dark', 16, 'Playwright + CDP Input.dispatchTouchEvent on #order', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 }); await load(bigState(), '#'); await tab('planned');
    const mb = await box('[data-testid=reorder-main-btn]'); P.t(!!mb && mb.height >= 44 && mb.y >= 0 && mb.y + mb.height <= 200 && mb.y < (await box('[data-testid=page-tabs]')).y && mb.x >= 0 && mb.x + mb.width <= 390 && /Reorder/.test(await page.textContent('[data-testid=reorder-main-btn]')), 'the main Reorder button is visible in the header, above the page tabs and inside the first screen, and at least 44 px tall', 1.5, JSON.stringify(mb));
    await page.click('[data-testid=reorder-main-btn]'); await page.waitForTimeout(150); P.t((await hash()) === '#order' && (await page.locator('[data-testid=order-hint]').count()) === 1 && /hold/i.test(await page.textContent('[data-testid=order-hint]')), 'the main button opens the Buy order page, which says to press and hold a row then drag', 1.5, await hash());
    const rid = (id) => `[data-row="${id}"] [data-testid=order-status]`, press0 = async (id) => { const b = await box(rid(id)); return { x: b.x + 30, y: b.y + b.height / 2 }; };
    const tdown = (x, y) => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }), tmove = (x, y) => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }), tup = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const sy = () => page.evaluate(() => Math.round(scrollY));
    /* quick swipe scrolls the page and moves nothing */
    const before = (await ordIds()).join(); const q = await press0('h2'); await tdown(q.x, q.y); for (let i = 1; i <= 8; i++) { await tmove(q.x, q.y - i * 40); await page.waitForTimeout(12); } await tup(); await page.waitForTimeout(250);
    P.t((await ordIds()).join() === before && (await page.locator('.rw.lift').count()) === 0, 'a quick swipe over a row moves nothing and lifts nothing', 2, (await ordIds()).join());
    P.t((await sy()) > 60, 'the same swipe scrolls the page (scrolling still works)', 2, 'scrollY ' + (await sy())); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(100);
    /* tap or hold without moving: nothing changes, no navigation */
    let p0 = await press0('h2'); await tdown(p0.x, p0.y); await page.waitForTimeout(700); const liftedStill = await page.locator('.rw.lift').count(); await tup(); await page.waitForTimeout(250);
    P.t((await ordIds()).join() === before && (await hash()) === '#order' && liftedStill === 1 && (await page.locator('.rw.lift').count()) === 0, 'holding a row lifts it; letting go without moving drops it in place and changes nothing', 1.5, (await ordIds()).join() + ' ' + (await hash()) + ' lifted ' + liftedStill);
    /* hold b1 (business, last) and drag to the top: crosses categories */
    await page.evaluate(() => document.querySelector('[data-row="b1"]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(150);
    p0 = await press0('b1'); await tdown(p0.x, p0.y); await page.waitForTimeout(150); const pressing = await page.locator('.rw.pressing').count(); await page.waitForTimeout(500); const lifted = await page.locator('.rw.lift[data-rw="b1"]').count();
    P.t(lifted === 1 && pressing === 1, 'pressing shows a tint, and after about 0.4 s the row is lifted', 1.5, 'pressing ' + pressing + ' lifted ' + lifted);
    const sy0 = await sy(); await tmove(p0.x, p0.y - 40); await page.waitForTimeout(50); const sy1 = await sy(); P.t(sy1 === sy0, 'dragging a held row does not scroll the page by itself (finger in the middle of the screen)', 1, sy0 + ' -> ' + sy1);
    const hb = await box('[data-row="h1"]'); for (let i = 0; i <= 10; i++) { await tmove(p0.x, p0.y - 40 - (p0.y - 40 - (hb.y + 10)) * i / 10); await page.waitForTimeout(30); }
    await page.waitForTimeout(100); const dl = await page.locator('[data-testid=drop-line]').count(); const dls = dl ? await box('[data-testid=drop-line]') : null; await tup(); await page.waitForTimeout(300);
    const after = await ordIds(); P.t(after[0] === 'b1' && after.length === 8 && (await hash()) === '#order', 'dragging the business to the top by touch puts it first, across categories', 2.5, after.join());
    P.t(dl === 1 && !!dls, 'a drop line shows while dragging', 1, 'lines ' + dl);
    const nos = await page.evaluate(() => [...document.querySelectorAll('[data-testid=order-row]')].map((r) => r.dataset.row + ':' + r.querySelector('[data-testid=order-no]').textContent.trim()).join()); P.t(nos === 'b1:1,h1:2,h2:3,h3:4,h4:5,h5:6,h6:7,c1:8', 'every number is updated after the drop', 1.5, nos);
    P.t((await page.locator('[data-testid=undo-banner]').count()) === 1, 'an Undo toast appears after the drop', 0.5); await page.click('[data-undo]'); await page.waitForTimeout(100); P.t((await ordIds()).join() === 'h1,h2,h3,h4,h5,h6,c1,b1', 'Undo restores the old order', 1, (await ordIds()).join());
    /* edge auto-scroll: hold the first row, drag to the bottom edge, wait, the page scrolls and the row ends further down */
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(100); p0 = await press0('h1'); await tdown(p0.x, p0.y); await page.waitForTimeout(600); await tmove(p0.x, p0.y + 60); for (let i = 1; i <= 8; i++) { await tmove(p0.x, p0.y + 60 + (825 - p0.y - 60) * i / 8); await page.waitForTimeout(30); }
    await page.waitForTimeout(1200); const sa = await sy(); await tup(); await page.waitForTimeout(300); const ao = await ordIds(); P.t(sa > 150 && ao.indexOf('h1') >= 4, 'holding near the bottom edge auto-scrolls and the row lands far down the list', 2, 'scrollY ' + sa + ' order ' + ao.join());
    /* the whole thing at every width, light and dark: main button, hint, 44 px, no overflow */
    const bad = []; for (const sch of ['light', 'dark']) { await page.emulateMedia({ colorScheme: sch }); for (const w of [320, 390, 430]) { await page.setViewportSize({ width: w, height: 844 }); await load(bigState(), '#'); await tab('planned');
        const m = await page.evaluate(() => { const b = document.querySelector('[data-testid=reorder-main-btn]'), r = b && b.getBoundingClientRect(); return { ok: !!r && r.height >= 44 && r.left >= 0 && r.right <= innerWidth && r.bottom <= 200 && r.top < document.querySelector('[data-testid=page-tabs]').getBoundingClientRect().top, sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), W: innerWidth }; });
        if (!m.ok || m.sw > m.W + 1) bad.push(sch + w + ' ' + JSON.stringify(m)); await page.click('[data-testid=reorder-main-btn]'); await page.waitForTimeout(100);
        const o = await page.evaluate(() => ({ hint: !!document.querySelector('[data-testid=order-hint]'), sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), W: innerWidth, small: [...document.querySelectorAll('[data-testid=order-row] button, [data-testid=order-row] input, [data-testid=reorder-main-btn]')].filter((e) => { const b = e.getBoundingClientRect(); return b.width < 43.5 || b.height < 43.5; }).length })); if (!o.hint || o.sw > o.W + 1 || o.small) bad.push(sch + w + ' order ' + JSON.stringify(o)); if (w === 390) await page.screenshot({ path: path.join(SHOTS, 'reorder-main-' + sch + '.png') }); } }
    await page.emulateMedia({ colorScheme: 'light' }); await page.setViewportSize({ width: 390, height: 844 }); P.t(bad.length === 0, 'main button and hint show, nothing overflows and every target >= 44 px at 320 / 390 / 430 in light and dark', 1.5, bad.join(' | ')); return P; });

  /* ---------------------------------------------------------------- I12 shortfall panel */
  const sfState = (cash) => { const S = E.normalize({ g: Object.assign({}, E.GDEF, { closing: 0, autoPay: false }), p: Object.assign(E.samplePersonal(), { cash, jobs: [], emergencyMonths: 0, living: 0, housing: 0, inflation: 0, cashApy: 0 }), houses: [E.newAsset('business', 'bankbiz', { id: 'b1', addr: 'Ten Million Business', price: 10000000, dp: 25, closingPct: 0, rent: 250000, capex: 0, growth: 0 })] }); S.v = X.DATA_V; S.orderV = 2; S.added = E.ADDITIONS.map((a) => a.key); return S; };
  await icheck('I12', "Shortfall panel: for a $10M business with $2.5M down and $1M to pull out the asset page shows the cash lines, down short -$1,500,000, uncovered -$9,000,000, the monthly lines and ranked changes; the row says Not possible - short $1.5M; the Finances chip and headline say Not yet with that reason; it all updates without a reload; scorecard lists every test", 14, 'Playwright', async () => {
    const P = new Parts(); await load(sfState(1e6), '#house-b1'); await page.waitForSelector('[data-testid=shortfall-panel]');
    const v = (t) => page.getAttribute(`[data-testid=${t}] b`, 'data-v').then(Number); P.t((await v('sf-cashNeeded')) === 2500000 && (await v('sf-pull')) === 1000000 && (await v('sf-downShort')) === -1500000 && (await v('sf-uncovered')) === -9000000, 'cash lines: needed $2,500,000, pull out $1,000,000, down short -$1,500,000, uncovered -$9,000,000', 3, [await v('sf-cashNeeded'), await v('sf-pull'), await v('sf-downShort'), await v('sf-uncovered')].join());
    const cls = await page.evaluate(() => ['sf-downShort', 'sf-uncovered', 'sf-monthShort'].map((t) => document.querySelector(`[data-testid=${t}] b`).className)); P.t(cls[0] === 'bad' && cls[1] === 'bad' && cls[2] === 'ok', 'short lines are red, covered monthly line is green', 1, cls.join());
    const txt = await page.locator('[data-testid=shortfall-panel]').innerText(); P.t(/−\$1,500,000/.test(txt) && /−\$9\.?0?M|−\$9,000,000/.test(txt) && /Raise \$1\.5M more cash/.test(txt) && /Lower the price to \$4M or less/.test(txt) && (await page.locator('[data-testid=sf-changes] li').count()) >= 2, "the panel shows the negative numbers, a 'how' line and ranked changes (raise cash, lower the price)", 2, txt.slice(0, 200));
    P.t(/Not possible: needs \$2\.5M, the plan never reaches it/.test(await page.locator('[data-testid=sf-why]').innerText()) && (await page.locator('[data-testid=sf-verdict]').innerText()) === 'Not possible', 'the first line says Not possible: needs $2.5M, the plan never reaches it', 1.5);
    const sc = await page.evaluate(() => [...document.querySelectorAll('[data-testid=scorecard-list] [data-testid^=sc-]')].map((e) => e.dataset.testid.slice(3))); P.t(['funding', 'dscr', 'ltv', 'loanmax', 'dti', 'reserve', 'runway', 'carry', 'cashflow', 'cap', 'balloon', 'stress-vac', 'stress-rate', 'concentration'].every((k) => sc.includes(k)), 'the scorecard lists every criterion with its status', 1.5, sc.join());
    await goBack(); await tab('planned'); await openAll(); const rowTxt = await page.locator('[data-row="b1"] [data-testid=dp-line]').innerText(); P.t(/Not possible/.test(rowTxt) && /short \$1\.5M/.test(rowTxt), "the planned row says Not possible with 'short $1.5M'", 1.5, rowTxt);
    const chip = await page.locator('[data-testid=afford-chip]').innerText(), line = await page.locator('[data-testid=afford-line]').innerText(); P.t(chip === 'Not yet' && /Not possible: needs \$2\.5M/.test(line), "the main 'Can I afford this?' chip says Not yet (not Tight) with the reason", 1.5, chip + ' / ' + line.slice(0, 120));
    await page.click('[data-testid=afford-chip]'); await page.waitForSelector('[data-testid=verdict-headline]'); const hd = await page.locator('[data-testid=verdict-headline]').innerText(), rs = await page.locator('[data-testid=verdict-card] .rsn').first().innerText(); P.t(/^Not yet\./.test(hd) && /Not possible: needs \$2\.5M/.test(rs), 'Finances: headline Not yet and the first reason is the funding reason', 1.5, hd + ' | ' + rs);
    /* live update with no reload: give the person $3M of cash on Finances, then look at the asset */
    await setCash(3000000); await goHashI('#house-b1'); await page.waitForTimeout(150); P.t((await page.locator('[data-testid=shortfall-panel]').count()) === 0 && /Every test passes/.test(await page.locator('[data-testid=scorecard]').innerText()), 'raising cash to $3M on Finances (no reload) removes the panel and the scorecard says every test passes', 2, (await page.locator('[data-testid=scorecard]').innerText()).slice(0, 80));
    await setCash(1000000); await goHashI('#house-b1'); await page.waitForTimeout(150); P.t((await page.locator('[data-testid=shortfall-panel]').count()) === 1, 'lowering it again brings the panel back', 1);
    const bad = []; for (const sch of ['light', 'dark']) { await page.emulateMedia({ colorScheme: sch }); for (const w of [320, 390, 430]) { await page.setViewportSize({ width: w, height: 844 }); await goHashI('#house-b1'); await page.waitForTimeout(80); const m = await page.evaluate(() => ({ sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), W: innerWidth, over: [...document.querySelectorAll('[data-testid=shortfall-panel] *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length })); if (m.sw > m.W + 1 || m.over) bad.push(sch + w + JSON.stringify(m)); if (w !== 430) await page.screenshot({ path: path.join(SHOTS, 'shortfall-' + w + '-' + sch + '.png'), fullPage: true }); } }
    await page.emulateMedia({ colorScheme: 'light' }); await page.setViewportSize({ width: 390, height: 844 }); P.t(bad.length === 0, 'the panel has no sideways scroll or overflow at 320 / 390 / 430 in light and dark', 1.5, bad.join(' | ')); return P;
    async function goBack() { await page.evaluate(() => { location.hash = '#'; }); await page.waitForTimeout(100); }
    async function goHashI(h) { await page.evaluate((h) => { location.hash = h; }, h); await page.waitForTimeout(100); }
    async function setCash(n) { await goHashI('#finances'); if (!(await page.$('[data-p="p.cash"]'))) await page.click('[data-coll=fin-cash]'); /* design v6: Your cash and expenses is a collapsed group, opened like a user would */ await page.waitForSelector('[data-p="p.cash"]'); await page.fill('[data-p="p.cash"]', String(n)); await page.keyboard.press('Enter'); await page.waitForTimeout(150); } });

  try { await ctx.close(); } catch (e) {}
  const order = ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8', 'I9', 'I10', 'I11', 'I12', 'I13']; checks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const earned = checks.reduce((s, c) => s + c.earned, 0), max = checks.reduce((s, c) => s + c.points, 0);
  return { earned: Math.round(earned * 100) / 100, max, checks };
};
