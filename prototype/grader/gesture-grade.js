/* Category I: Portfolio sections, reorder, auto-funding, duplicate, extra-payment panel, loan line, swipe-back and keyboard dismiss.
   100 automated points on their own scale (not part of A-E + R, F, G or H).  Plugged in from grade.js: require('./gesture-grade.js').run(X) -> { earned, max, checks }.
   Standalone: GEST_ONLY=1 node grade.js   (I_ONLY=I2,I4 for single checks).  Runs with section auto-expansion OFF: collapsed defaults are part of what is tested.
   Touch gestures are sent as real touch events through the Chrome DevTools protocol (Input.dispatchTouchEvent); the long-press drag is also tried with the mouse. Never modifies the app. */
const path = require('path');

exports.run = async function run(X) {
  const { E, Parts, mkS, KEY, money, mkCtx, mkPage, base, collect } = X;
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
    await page.goto(base() + '/index.html?i=' + seq++);
    await page.evaluate(([k, s, uk, u]) => { try { localStorage.clear(); if (s) localStorage.setItem(k, JSON.stringify(s)); if (u) localStorage.setItem(uk, JSON.stringify(u)); } catch (e) {} }, [KEY, S || null, UIKEY, ui || null]);
    await page.goto(base() + '/index.html?i=' + seq++ + (hash || ''));
    await page.waitForSelector('#app > *');
  }
  const store = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  const hash = () => page.evaluate(() => location.hash);
  const openCat = async (tp) => { const h = page.locator(`[data-testid=cat-header-${tp}]`); if ((await h.getAttribute('aria-expanded')) === 'false') { await h.click(); await page.waitForTimeout(40); } };
  const openAll = async () => { for (const t of ['house', 'commercial', 'business']) await openCat(t); };
  const sel = async (id) => { if (!(await page.$(`[data-for="${id}"]`))) { await openAll(); await page.click(`[data-row="${id}"] [data-testid=row-extra-toggle]`); await page.waitForTimeout(60); } };
  const ids = (tp) => page.evaluate((t) => [...document.querySelectorAll(`[data-catbody=${t}] [data-testid=ledger-row]`)].map((r) => r.dataset.row), tp);
  const box = async (sl) => (await page.locator(sl).first().boundingBox());
  async function touch(points) { /* points: [{x,y,wait?}] first = start, last = end */
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0].x, y: points[0].y }] });
    if (points[0].wait) await page.waitForTimeout(points[0].wait);
    for (let i = 1; i < points.length; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: points[i].x, y: points[i].y }] }); await page.waitForTimeout(points[i].wait || 16); }
    const l = points[points.length - 1]; await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  const line = (x0, y0, x1, y1, n = 8, wait0) => Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, wait: i === 0 ? wait0 : 16 }));
  const home = (id, o) => E.newAsset('house', 'conv30', Object.assign({ id, addr: id.toUpperCase() + ' House', price: 200000, rent: 2400, tax: 150, ins: 80, growth: 3, closingPct: 3 }, o || {}));
  const mk = (houses, extra) => { const S = mkS({}, houses); S.orderV = 1; return Object.assign(S, extra || {}); };
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
    P.t(before.join() === 'maple,cedar,birch,willow,linden', 'Homes list shows the saved (buy) order, sold homes live under Sold', 0.4, before.join());
    const m = await box('[data-rw=maple]'), c = await box('[data-rw=cedar]');
    await page.mouse.move(m.x + 40, m.y + 18); await page.mouse.down(); await page.waitForTimeout(150);
    P.t((await page.locator('.rw.lift').count()) === 0, 'no lift before the hold time (450 ms)', 0.4);
    await page.waitForTimeout(450); P.t((await page.locator('.rw.lift').count()) === 1 && (await page.locator('#app.dragmode').count()) === 1, 'after the hold the row lifts (shadow) and the list enters drag mode', 1);
    const sh = await page.evaluate(() => getComputedStyle(document.querySelector('.rw.lift')).boxShadow); P.t(sh && sh !== 'none', 'lifted row has a visible shadow', 0.3);
    const dy = (c.y + c.height / 2) - (m.y + m.height / 2) + 28;
    for (let i = 1; i <= 8; i++) { await page.mouse.move(m.x + 40, m.y + 18 + dy * i / 8); await page.waitForTimeout(20); }
    const tr = await page.evaluate(() => document.querySelector('.rw.lift').style.transform); P.t(/translateY/.test(tr), 'the lifted row follows the pointer', 0.4, tr);
    await page.mouse.up(); await page.waitForTimeout(120);
    const after = (await ids('house')), st = await store(); const nz = (a) => a.filter((x) => x !== 'elm').join(); /* a re-link can change the plan, so a home may move between Homes and Sold */
    P.t(nz(after) === 'cedar,maple,birch,willow,linden', 'drop puts maple after cedar in the list', 2.5, after.join());
    P.t(st.houses.map((h) => h.id).filter((x) => after.includes(x)).join() === after.join(), 'the new order is saved (list order = buy order)', 1.5);
    P.t((await page.locator('[data-testid=asset-panel]').count()) === 0 && (await hash()) === '' || /^#?$/.test(await hash()), 'releasing a drag does not also open a panel or navigate', 0.6);
    await page.waitForTimeout(400); await page.click('[data-row=birch] [data-testid=row-extra-toggle]'); await page.waitForTimeout(60); P.t((await page.locator('[data-for=birch]').count()) === 1, 'a normal tap still opens the row panel', 0.6);
    /* touch drag in Commercial */
    await openCat('commercial'); const cb0 = await ids('commercial'); const lake = await box('[data-rw=' + cb0[1] + ']'), harb = await box('[data-rw=' + cb0[0] + ']');
    await touch([{ x: lake.x + 60, y: lake.y + 20, wait: 650 }].concat(line(lake.x + 60, lake.y + 20, lake.x + 60, harb.y - 4, 8).slice(1))); await page.waitForTimeout(150);
    const cb1 = await ids('commercial'); P.t(cb1.join() === cb0.slice().reverse().join(), 'touch long-press and drag up swaps the two commercial rows', 2.5, cb0.join() + ' -> ' + cb1.join());
    P.t(nz(await ids('house')) === nz(after), 'dragging stays inside its category (homes unchanged)', 0.5);
    /* a quick swipe is a scroll, not a drag */
    const b0 = (await ids('house')).join(); const hb = await box('[data-rw=cedar]'); await touch(line(hb.x + 60, hb.y + 20, hb.x + 60, hb.y + 80, 4)); await page.waitForTimeout(100); P.t((await ids('house')).join() === b0 && (await page.locator('.rw.lift').count()) === 0, 'a quick touch-and-move (scroll) does not start a drag', 0.8);
    /* auto-scroll near the screen edge while dragging */
    await load(sample(), null, { coll: { drivers: true } }); await page.evaluate(() => window.scrollTo(0, 0));
    const w = await box('[data-rw=linden]'); await page.evaluate((y) => window.scrollTo(0, y - 500), w.y + 0);
    const lb = await box('[data-rw=linden]'); const y0 = lb.y + 20, sc0 = await page.evaluate(() => window.scrollY);
    await touch([{ x: lb.x + 60, y: y0, wait: 650 }, { x: lb.x + 60, y: y0 - 40 }, { x: lb.x + 60, y: 40, wait: 700 }, { x: lb.x + 60, y: 40, wait: 300 }]); await page.waitForTimeout(100);
    const sc1 = await page.evaluate(() => window.scrollY); P.t(sc1 < sc0 - 20, 'dragging near the top edge auto-scrolls the page', 1, sc0 + ' -> ' + sc1);
    return P; });

  /* ---------------------------------------------------------------- I3 move buttons */
  await icheck('I3', 'Move up / Move down buttons in the row panel (accessible alternative): reorder, disabled at the ends, panel stays open', 8, 'Select row, press Move', async () => {
    const P = new Parts(); await load(sample()); await sel('cedar');
    P.t((await page.locator('[data-for=cedar] [data-testid=move-up]').count()) === 1 && (await page.locator('[data-for=cedar] [data-testid=move-down]').count()) === 1, 'panel has Move up and Move down', 1);
    await page.click('[data-testid=move-down]'); await page.waitForTimeout(80); let o = await ids('house'); const nz = (a) => a.filter((x) => x !== 'elm').join(); P.t(nz(o) === 'maple,birch,cedar,willow,linden', 'Move down swaps with the next home', 2, o.join());
    P.t((await page.locator('[data-for=cedar]').count()) === 1, 'the panel stays open on the moved row', 1);
    await page.click('[data-testid=move-up]'); await page.click('[data-testid=move-up]'); await page.waitForTimeout(80); o = await ids('house'); P.t(nz(o) === 'cedar,maple,birch,willow,linden', 'Move up twice brings it to the top', 1.5, o.join());
    P.t(await page.locator('[data-testid=move-up]').isDisabled(), 'Move up is disabled on the first row', 1);
    await sel('linden'); P.t(await page.locator('[data-for=linden] [data-testid=move-down]').isDisabled(), 'Move down is disabled on the last row', 0.5);
    const st = await store(); P.t(st.houses.findIndex((h) => h.id === 'cedar') < st.houses.findIndex((h) => h.id === 'maple'), 'saved list order follows', 1); return P; });

  /* ---------------------------------------------------------------- I4 auto funding */
  await icheck('I4', 'Funding auto-assigns by list order: the asset before another funds it (1,2,3 and 1,3,2), stale in-category links clear, other categories untouched, no re-link on plain load', 16, 'Reorder with Move buttons; read Funds selects + saved targets + plan', async () => {
    const P = new Parts(); const tgt = async () => Object.fromEntries((await store()).houses.map((h) => [h.id, h.target]));
    const S0 = mk([home('h1', { status: 'owned', paid: 24 }), home('h2', { buyIn: 30 }), home('h3', { buyIn: 40 })]);
    await load(S0); const t0 = await tgt(); P.t(t0.h1 === '' && t0.h2 === '' && t0.h3 === '', 'plain load never relinks (targets as saved)', 1.5, JSON.stringify(t0));
    const sm = await load(sample()).then(store); P.t(sm.houses.find((h) => h.id === 'maple').target === 'birch' && sm.houses.find((h) => h.id === 'cedar').target === 'willow', 'the sample keeps its calibrated links on load (maple -> birch, cedar -> willow)', 1, '');
    await load(S0); await sel('h2'); await page.click('[data-testid=move-down]'); await page.waitForTimeout(60); await page.click('[data-testid=move-up]'); await page.waitForTimeout(80);
    let t = await tgt(); P.t((await ids('house')).join() === 'h1,h2,h3' && t.h1 === 'h2' && t.h2 === 'h3' && t.h3 === '', 'order 1,2,3: house 1 funds house 2 and house 2 funds house 3', 3, JSON.stringify(t));
    const dpl = (id) => page.locator(`[data-row=${id}] [data-testid=dp-line]`).textContent().catch(() => ''); P.t(/H1 House/.test(await dpl('h2')) && /H2 House/.test(await dpl('h3')) && (await page.locator('[data-row=h1] [data-testid=dp-line]').count()) === 0, 'the waits on the rows name the funder (house 2 <- house 1, house 3 <- house 2; the first row has none)', 1);
    let pl = E.plan((await store())); P.t(pl.purchase.h2 === pl.purchase.h1 + pl.V.h1.locM && pl.purchase.h3 === pl.purchase.h2 + pl.V.h2.locM, 'purchase months follow the chain (house 2 when house 1 line opens, house 3 when house 2 line opens)', 1.5, JSON.stringify(pl.purchase));
    await sel('h3'); await page.click('[data-for=h3] [data-testid=move-up]'); await page.waitForTimeout(80);
    t = await tgt(); P.t((await ids('house')).join() === 'h1,h3,h2' && t.h1 === 'h3' && t.h3 === 'h2' && t.h2 === '', 'order 1,3,2: house 1 funds house 3 and house 3 funds house 2; the old 2 -> 3 link is cleared', 3.5, JSON.stringify(t));
    pl = E.plan((await store())); P.t(pl.purchase.h3 === pl.purchase.h1 + pl.V.h1.locM, 'house 3 is now bought when house 1 line of credit opens', 1, JSON.stringify(pl.purchase));
    await page.evaluate(() => { location.hash = '#house-h1'; }); await page.waitForTimeout(100); if (!(await page.$('[data-sel=h1]'))) await page.click('[data-coll=loc]'); await page.selectOption('[data-sel=h1]', 'h2'); t = await tgt(); P.t(t.h1 === 'h2', 'the Funds picker on the asset page still works as a manual override', 0.8, JSON.stringify(t));
    /* cross-category links and owned targets */
    const biz = E.newAsset('business', 'sba7a', { id: 'b1', addr: 'Biz One', price: 400000, rent: 9000, buyIn: 20 });
    const S1 = mk([home('x1', { status: 'owned', paid: 24, target: 'b1' }), home('x2', { buyIn: 30 }), home('x3', { status: 'owned', paid: 10 }), biz]);
    await load(S1); await sel('x2'); await page.click('[data-testid=move-up]'); await page.waitForTimeout(80); t = await tgt();
    P.t(t.x1 === 'b1', 'a link to another category is left alone (home -> business)', 1.5, JSON.stringify(t)); P.t(t.x2 === '' , 'an asset whose next row is already owned does not fund it', 0.7, JSON.stringify(t));
    /* engine unit checks */
    const U = mk([home('u1', { status: 'owned', target: 'u3' }), home('u2'), home('u3'), E.newAsset('commercial', 'comm25', { id: 'c1', target: 'u2' })]); E.relink(U); const ut = Object.fromEntries(U.houses.map((h) => [h.id, h.target]));
    P.t(ut.u1 === 'u2' && ut.u2 === 'u3' && ut.u3 === '' && ut.c1 === 'u2', 'Engine.relink: consecutive pairs linked, stale link cleared, cross-category link kept', 0.5, JSON.stringify(ut));
    return P; });

  /* ---------------------------------------------------------------- I5 duplicate */
  await icheck('I5', 'Duplicate: from the row panel and the asset page; copy sits right after the original, named "(copy)", planned, funding relinked', 10, 'Panel > Duplicate; asset page > Duplicate', async () => {
    const P = new Parts(); await load(sample()); await sel('maple'); const n0 = (await store()).houses.length; const homesBefore = await ids('house');
    await page.click('[data-for=maple] [data-testid=row-duplicate]'); await page.waitForTimeout(100);
    const st = await store(), i = st.houses.findIndex((h) => h.id === 'maple'), cp = st.houses[i + 1];
    P.t(st.houses.length === n0 + 1 && cp && cp.addr === '1412 Maple Ridge Dr (copy)' && cp.status === 'planned' && cp.id !== 'maple', 'copy added right after the original in the saved list, "(copy)", planned', 2.5, cp && cp.addr);
    const hb = await ids('house'); P.t(hb.filter((x) => x !== 'elm').join() === ['maple', cp.id].concat(homesBefore.slice(1)).join(), 'the Homes list shows the copy right after the original', 1.5, hb.join());
    P.t((await page.locator(`[data-for="${cp.id}"]`).count()) === 1, 'the copy is selected so you can edit it', 0.7);
    P.t(st.houses[i].target === cp.id && cp.target === '' /* the next home (cedar) is owned, so nothing to fund */ && (cp.price === st.houses[i].price) && cp.rent === st.houses[i].rent, 'funding relinked: original funds the copy (it is planned); the copy does not fund an owned home; the numbers are copied', 2.5, st.houses[i].target + ' / ' + cp.target);
    const ct = await page.locator('[data-testid=cat-count-house]').textContent(); P.t(ct.trim() === String(hb.length), 'the category stat strip counts it', 1, ct);
    await page.click('[data-for="' + cp.id + '"] [data-testid=open-details]'); await page.waitForTimeout(80); await page.click('[data-testid=h-duplicate]'); await page.waitForTimeout(120);
    const s2 = await store(); P.t(s2.houses.length === n0 + 2 && /#house-/.test(await hash()) && (await hash()) !== '#house-' + cp.id && /\(copy\) \(copy\)$/.test((await page.inputValue('input.t'))), 'asset page Duplicate makes another copy and opens it', 1.8, await page.inputValue('input.t'));
    return P; });

  /* ---------------------------------------------------------------- I6 sections */
  await icheck('I6', 'Portfolio = total row + Homes / Commercial / Businesses dropdowns (name left, chevron right, stat strip: count, before/after loan, worth, DSCR, lasts), empty sections, Sold section only when something sold', 12, 'Headers, subtitles, collapse state, empty portfolio', async () => {
    const P = new Parts(); await load(sample());
    const hd = await page.evaluate(() => [...document.querySelectorAll('[data-testid^=cat-header-]')].map((h) => ({ t: h.dataset.testid.replace('cat-header-', ''), name: h.querySelector('b').textContent, sub: h.parentElement.querySelector('.cats').textContent.trim(), chev: !!h.querySelector('.chev'), x: h.querySelector('b').getBoundingClientRect().left, cx: h.querySelector('.chev').getBoundingClientRect().left, exp: h.getAttribute('aria-expanded'), sy: h.parentElement.querySelector('.cats').getBoundingClientRect().top - h.querySelector('b').getBoundingClientRect().bottom })));
    P.t(hd.map((h) => h.t).join() === 'house,commercial,business,sold' && hd.slice(0, 3).map((h) => h.name).join() === 'Homes,Commercial,Businesses', 'three category headers (plus Sold when something is sold)', 1.5, hd.map((h) => h.name).join());
    P.t(hd.every((h) => h.chev && h.cx > h.x + 150 && h.sy >= -2 && h.sy < 14), 'name on the left, chevron on the right, subtitle directly below the name', 1, JSON.stringify(hd.map((h) => [Math.round(h.x), Math.round(h.cx), Math.round(h.sy)])));
    P.t(hd[0].exp === 'true' && hd[1].exp === 'false' && hd[2].exp === 'false' && hd[3].exp === 'false', 'default: Homes open, the others collapsed', 1, hd.map((h) => h.exp).join());
    const S = sample(), pl = E.plan(S), vis = (tp) => S.houses.filter((h) => (h.type || 'house') === tp && !(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM));
    const cnt = (tp) => S.houses.filter((h) => (h.type || 'house') === tp && !(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM)).length;
    const strip = (x, tp) => x.sub.startsWith(String(cnt(tp))) && /before loan/.test(x.sub) && /after loan/.test(x.sub) && /worth/.test(x.sub) && /DSCR/.test(x.sub) && /lasts/.test(x.sub);
    P.t(strip(hd[0], 'house') && strip(hd[1], 'commercial') && strip(hd[2], 'business') && (await page.locator('[data-testid=cat-count-house]').textContent()).trim() === String(cnt('house')), 'each header carries the stat strip: count, cash flow before and after loans, worth, DSCR, lasts', 2, hd.map((h) => h.sub).join(' | '));
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
    const rd = async () => page.evaluate(() => { const g = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : ''; }; const nx = document.querySelector('[data-testid=eff-next]'); return { term: g('[data-testid=eff-term]'), termSub: document.querySelector('[data-testid=eff-term]').nextElementSibling.textContent, pay: g('[data-testid=eff-payment]'), next: g('[data-testid=eff-next]'), nextSub: nx.nextElementSibling.textContent, open: nx.dataset.open, sooner: nx.dataset.sooner, cfs: nx.dataset.cfSooner, val: document.querySelector('[data-testid=extra-input]').value }; });
    const check1 = async (label, X) => {
      const St = S(); const h = E.H(St, 'maple'); h.extra = X; const pl = E.plan(St), v = pl.V.maple, p0 = E.payoffN(h, 0), pX = E.payoffN(h, X), l0 = E.locMonths(St, h, 0), lnc = E.locMonths(St, h, X, { noCash: true });
      const r = await rd(); const nums = (s) => (s.match(/\d+/g) || []).map(Number);
      P.t(r.term.startsWith('Paid off in ' + pX + ' mo'), label + ': loan term "Paid off in ' + pX + ' mo" matches the engine', 1, r.term);
      P.t(X > 0 ? new RegExp('^' + (p0 - pX) + ' mo( \\([^)]*\\))? sooner').test(r.termSub) : /extra payments pay it off sooner/.test(r.termSub), label + ': months sooner vs no extra = ' + (p0 - pX), 1, r.termSub);
      P.t(r.pay === $f(v.payment), label + ': monthly payment = engine payment now ' + $f(v.payment), 0.8, r.pay);
      P.t(+r.open === pl.purchase.maple + v.locM && r.next === 'in ' + (v.locM < 24 ? v.locM + ' mo' : v.locM + ' mo (' + Math.floor(v.locM / 12) + 'y ' + (v.locM % 12) + 'm)'), label + ': next down payment in ' + v.locM + ' mo (engine)', 1.2, r.next + ' / open ' + r.open);
      P.t(+r.sooner === l0 - v.locM && new RegExp(X > 0 ? '^' + (l0 - v.locM) + ' mo( \\([^)]*\\))? sooner than with no extra' : 'extra payments make it sooner').test(r.nextSub), label + ': "' + (l0 - v.locM) + ' mo sooner" = locMonths(0) - locMonths(extra)', 1.2, r.nextSub);
      P.t(+r.cfs === lnc - v.locM && lnc - v.locM > 0 && new RegExp('your \\$' + Math.round(v.cfSaved).toLocaleString('en-US') + '/mo cash flow is saved toward it \\(' + (lnc - v.locM) + ' mo sooner\\)').test(r.nextSub), label + ': the home\'s own cash flow ($' + Math.round(v.cfSaved) + '/mo) is counted and shown as ' + (lnc - v.locM) + ' mo sooner', 1.2, r.nextSub);
      return { v, pl }; };
    await check1('maple as saved (extra 600)', 600);
    await setX('0'); await check1('extra 0', 0);
    await setX('1500'); const { v } = await check1('extra 1500', 1500);
    async function setX(val) { await page.evaluate((val) => { const el = document.querySelector('[data-testid=extra-input]'); el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); document.activeElement.blur(); }, val); await page.waitForTimeout(80); }
    /* engine: saved cash flow really is money toward the down payment (independent simulation) */
    const St = S(); const h = E.H(St, 'maple'), t = E.H(St, 'birch'), g = St.g; const Pm = E.payment(h), i = h.rate / 1200, egi = h.rent * (1 - g.vac / 100), noi = egi - (h.tax + h.ins + h.hoa + g.maint / 100 * h.price / 12 + g.mgmt / 100 * egi); const cf = Math.max(0, noi - Pm); const D = t.price * (t.dp / 100 + (t.closingPct == null ? g.closing : t.closingPct) / 100);
    let b = E.loan(h); for (let k = 0; k < h.paid; k++) b = b * (1 + i) - Pm; let sim = Infinity, cum = 0, simCum = 0; const gr = h.growth; for (let k = 0; k <= 600; k++) { const val = h.price * Math.pow(1 + gr / 100, (h.paid + k) / 12); if (Math.max(0, g.cap / 100 * val - b) + cum >= D) { sim = k; simCum = cum; break; } cum += Math.max(0, noi * Math.pow(1 + gr / 100, k / 12) - (b > 0.005 ? Pm : 0)); b = Math.max(0, b * (1 + i) - Pm - 600); } /* the saved cash flow grows with the rent */
    P.t(sim === E.view(St, h).locM, 'independent simulation (balance + value + saved cash flow >= down payment + closing) gives the same months as the engine', 1.5, sim + ' vs ' + E.view(St, h).locM);
    const pl2 = E.plan(St); const dpc = pl2.dpCash[pl2.purchase.birch]; P.t(Math.abs(dpc - Math.min(D, simCum)) < 1 && dpc > 0, 'cash used toward the purchase = the saved cash flow summed month by month as it grows (reaches the Finances cash line)', 0.8, dpc + ' vs ' + Math.min(D, simCum));
    /* Finances page: the saved cash is taken out of the cash line in the purchase month */
    const f = E.finance(St, pl2), mo = pl2.purchase.birch; const f0 = E.finance((() => { const c = clone(St); return c; })(), (() => { const q = E.plan(St); q.dpCash = q.dpCash.map(() => 0); return q; })());
    P.t(Math.abs((f0.series.liquid[mo] - f.series.liquid[mo]) - dpc) < 1, 'Finances cash line drops by exactly that amount in the purchase month', 0.8, Math.round(f0.series.liquid[mo] - f.series.liquid[mo]) + ' vs ' + Math.round(dpc));
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
    const P = new Parts(); await load(sample()); await sel('maple'); await openAll(); let bad = [];
    for (const w of [320, 390, 430]) { await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(60); const r = await page.evaluate(() => ({ sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), W: window.innerWidth })); if (r.sw > r.W + 1) bad.push(w + ':' + r.sw); }
    await page.setViewportSize({ width: 390, height: 844 }); P.t(bad.length === 0, 'no horizontal overflow with a panel open', 1, bad.join());
    const small = await page.evaluate(() => [...document.querySelectorAll('[data-testid=asset-panel] button, [data-testid^=cat-header-], [data-testid=row-toggle]')].filter((e) => e.offsetParent).map((e) => { const b = e.getBoundingClientRect(); return b.width >= 43.5 && b.height >= 43.5 ? null : (e.dataset.testid || e.className) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height); }).filter(Boolean)); P.t(small.length === 0, 'panel buttons, row toggles and section headers are >= 44 px', 1.2, small.join());
    const m = await box('[data-rw=cedar]'); await page.mouse.move(m.x + 40, m.y + 18); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.move(m.x + 40, m.y + 60); const sw = await page.evaluate(() => document.documentElement.scrollWidth); await page.mouse.up(); await page.waitForTimeout(100); P.t(sw <= 391, 'no sideways overflow while a row is lifted', 0.6, sw);
    const errs = collect.errors.slice(errStart), reqs = collect.requests.slice(reqStart), ext = reqs.filter((u) => !/^(http:\/\/127\.0\.0\.1|http:\/\/localhost|data:|blob:|about:)/.test(u));
    P.t(errs.length === 0 && ext.length === 0, 'no console errors / page errors and no outside requests (' + errs.length + ' / ' + ext.length + ')', 1.2, [...new Set(errs)].slice(0, 2).join(' || ').slice(0, 300)); return P; });

  try { await ctx.close(); } catch (e) {}
  const order = ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8', 'I9', 'I10']; checks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const earned = checks.reduce((s, c) => s + c.earned, 0), max = checks.reduce((s, c) => s + c.points, 0);
  return { earned: Math.round(earned * 100) / 100, max, checks };
};
