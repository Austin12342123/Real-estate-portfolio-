/* Category N: Asset numbering. 100 automated points on their own scale (not part of A-E + R, F-K).
   The policy under test (see numbering-bugs.md): numbers are contiguous from 1 in purchase order inside the portfolio view an asset belongs to.
   Planned page = every asset that is not owned (sold-in-plan ones keep their place), in list order (= purchase order); Real page = every owned asset, oldest first.
   Removing an asset shifts every later number down by one at once, everywhere. One engine function (Engine.numbering) feeds every consumer.
   Plugged in from grade.js: require('./numbering-grade.js').run(X) -> { earned, max, checks }.   Standalone: NUM_ONLY=1 node grade.js   (N_ONLY=N2,N4 for single checks).
   Expected numbers are computed HERE from the definition (list position / oldest first), not by calling Engine.numbering, except in N1 which tests that function against the same definition. Never modifies the app. */
const fs = require('fs'), path = require('path');
const BOOT = require('./boot.js');

exports.run = async function run(X) {
  const { E, Parts, DATA_V, KEY, mkCtx, mkPage, base, collect, EXPAND_JS } = X;
  const UIKEY = 'rep-v4-ui', checks = [];
  async function ncheck(id, name, points, repro, fn) {
    if (process.env.N_ONLY && process.env.N_ONLY.split(',').indexOf(id) < 0) return;
    let r; const t0 = Date.now();
    try { r = await fn(); } catch (e) { r = { ratio: 0, detail: 'CRASH in check: ' + (e && e.stack || e).toString().slice(0, 500) }; }
    if (r instanceof Parts) r = { ratio: r.ratio, detail: r.detail };
    const ratio = Math.max(0, Math.min(1, r.ratio));
    const rec = { id, category: 'N', name, points, earned: Math.round(points * ratio * 100) / 100, ratio, detail: r.detail || '', repro, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
    checks.push(rec);
    console.log(`  [${rec.earned.toFixed(2)}/${points}] ${id} ${name}  (${rec.seconds}s)${ratio < 1 ? '  <-- ' + String(rec.detail).slice(0, 500) : ''}`);
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let seed = 20261116; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), pick = (l) => l[Math.floor(rnd() * l.length)];

  /* ---------- state builders ---------- */
  const mk = (houses, extra) => { const S = E.normalize(Object.assign({ g: Object.assign({}, E.GDEF), houses }, extra || {})); S.v = DATA_V; S.orderV = 2; S.added = E.seedPlan().added.slice(); return S; };
  const HOUSE = (id, o) => E.newAsset('house', undefined, Object.assign({ id, addr: id + ' Oak St', price: 150000, rent: 1650, tax: 150, ins: 70 }, o || {}));
  const COMM = (id, o) => E.newAsset('commercial', undefined, Object.assign({ id, addr: id + ' Retail Strip', price: 900000, rent: 9000, ins: 400 }, o || {}));
  const BIZ = (id, o) => E.newAsset('business', undefined, Object.assign({ id, addr: id + ' Services', rent: 14000 }, o || {}));
  const MULTI = (id, o) => E.newAsset('house', undefined, Object.assign({ id, addr: id + ' Quad', kind: 'multi', units: 4, price: 520000, rent: 5200, tax: 500, ins: 240 }, o || {}, E.mfDefaults ? {} : {}));
  const OWN = (a, paid) => { a.status = 'owned'; a.paid = paid; return a; };
  /* expected numbers from the definition */
  const expectOf = (S) => {
    const pl = {}, ow = {};
    S.houses.filter((h) => h.status !== 'owned').forEach((h, i) => { pl[h.id] = i + 1; });
    S.houses.map((h, i) => [h, i]).filter(([h]) => h.status === 'owned').sort((a, b) => (+b[0].paid || 0) - (+a[0].paid || 0) || a[1] - b[1]).forEach(([h], k) => { ow[h.id] = k + 1; });
    return { planned: pl, owned: ow };
  };
  const seqOk = (nums) => { const s = nums.slice().sort((a, b) => a - b); return s.every((v, i) => v === i + 1); }; /* exactly 1..n, none skipped, none twice */

  /* ---------- browser ---------- */
  const ctx = await mkCtx(); const page = await mkPage(ctx, 'num');
  let seq = 0;
  async function load(S, hash, extraLS) {
    await BOOT.boot(page, { base: base(), tag: 'n', S, DATA_V, hash, write: [([k, s, uk, ex]) => { try { localStorage.clear(); if (s) localStorage.setItem(k, JSON.stringify(s)); (ex || []).forEach(([a, b]) => localStorage.setItem(a, JSON.stringify(b))); } catch (e) {} }, [KEY, S || null, UIKEY, extraLS || []]] }); await settle();
  }
  const settle = async () => { await page.waitForTimeout(40); for (let i = 0; i < 3; i++) { const n = await page.evaluate(EXPAND_JS).catch(() => 0); if (!n) break; await page.waitForTimeout(20); } };
  const store = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  const tab = async (k) => { await page.waitForSelector('[data-testid=tab-' + k + ']'); if ((await page.getAttribute('[data-testid=tab-' + k + ']', 'aria-selected')) !== 'true') { await page.click('[data-testid=tab-' + k + ']'); await page.waitForTimeout(40); } await settle(); };
  const toMain = async () => { if (await page.evaluate(() => location.hash !== '' && location.hash !== '#')) { await page.evaluate(() => { location.hash = ''; }); await page.waitForTimeout(60); } await page.waitForSelector('[data-testid=page-tabs]'); await settle(); };
  /* every row on the page that is showing: id, badge text, aria-label, section */
  const READ = () => [...document.querySelectorAll('[data-testid=ledger-row]')].map((r) => { const b = r.querySelector('[data-testid=buy-no]'), sec = r.closest('section.cat'); return { id: r.dataset.row, no: b ? +b.textContent.trim() : NaN, txt: b ? b.textContent.trim() : '', aria: b ? b.getAttribute('aria-label') : '', sec: sec ? sec.dataset.testid : '' }; });
  const rows = async (view) => { await tab(view === 'owned' ? 'real' : 'planned'); await settle(); return page.evaluate(READ); };
  const isRowsOk = (rs, want, P, label, w) => {
    const ids = Object.keys(want), got = {}; rs.forEach((r) => { got[r.id] = r; });
    const complete = rs.length === ids.length && ids.every((id) => got[id]);
    P.t(complete, label + ': the page lists exactly the assets of this view (' + ids.length + ')', w, rs.map((r) => r.id).join());
    P.t(seqOk(rs.map((r) => r.no)), label + ': numbers are exactly 1..' + rs.length + ', none skipped, none twice', w, rs.map((r) => r.no).join());
    P.t(ids.every((id) => got[id] && got[id].no === want[id]), label + ': every row shows the expected number (purchase order)', w, ids.map((id) => id + ':' + (got[id] && got[id].no) + '/' + want[id]).join(' '));
    P.t(rs.every((r) => r.aria === 'Buy number ' + r.no), label + ': every aria-label says "Buy number N" with the same N as the badge', w, rs.filter((r) => r.aria !== 'Buy number ' + r.no).map((r) => r.id + ':' + r.aria).join());
  };
  const header = async (id) => { await page.evaluate((i) => { location.hash = '#house-' + i; }, id); await page.waitForSelector('[data-testid=asset-buy-no]'); await page.waitForTimeout(40); return page.evaluate(() => { const t = document.querySelector('[data-testid=asset-buy-no]'); return { txt: t.textContent.trim(), no: +t.dataset.no, view: t.dataset.nview, aria: t.getAttribute('aria-label'), page: document.getElementById('app').innerText }; }); };
  const checkHeader = async (S, id, P, w) => {
    const ex = expectOf(S), h = S.houses.find((x) => x.id === id), own = h.status === 'owned', n = (own ? ex.owned : ex.planned)[id], hd = await header(id);
    P.t(hd.no === n && hd.view === (own ? 'owned' : 'planned') && new RegExp('^#' + n + ' ' + (own ? 'bought' : 'planned') + '\\b').test(hd.txt), 'asset page header of ' + id + ' says "#' + n + ' ' + (own ? 'bought' : 'planned') + '"', w, hd.txt);
    P.t(hd.aria === (own ? 'Bought' : 'Planned') + ' asset number ' + n, 'asset page header aria-label of ' + id + ' names the view and the number', w, hd.aria);
    const mentions = [...hd.page.matchAll(/(?:^|[\s(])#(\d+)\b/g)].map((m) => +m[1]);
    P.t(mentions.every((m) => m === n), 'asset page ' + id + ': every "#N" mention in its text is its own number ' + n, w, mentions.join());
    await page.evaluate(() => { location.hash = ''; }); await page.waitForTimeout(40);
  };
  /* both views of a state, rows + a few headers */
  async function sweep(S, P, label, w, nHeaders) {
    await toMain(); const ex = expectOf(S);
    if (Object.keys(ex.planned).length || true) isRowsOk(await rows('planned'), ex.planned, P, label + ' Planned', w);
    isRowsOk(await rows('owned'), ex.owned, P, label + ' Real', w);
    const ids = S.houses.map((h) => h.id); const some = [];
    for (let i = 0; i < Math.min(nHeaders || 0, ids.length); i++) some.push(ids.splice(ri(0, ids.length - 1), 1)[0]);
    for (const id of some) await checkHeader(S, id, P, w * 0.5);
    await toMain(); await tab('planned');
  }
  /* open a row's panel and press a button in it */
  const selRow = async (id) => { await settle(); if (!(await page.$(`[data-for="${id}"]`))) { await page.click(`[data-row="${id}"] [data-testid=row-extra-toggle]`); await page.waitForTimeout(40); } };
  const removeRow = async (id) => { await selRow(id); await page.click(`[data-for="${id}"] [data-testid=row-remove]`); await page.click(`[data-for="${id}"] [data-del-yes]`); }; /* no wait: the DOM is read at once after */
  const nums = (rs) => { const o = {}; rs.forEach((r) => { o[r.id] = r.no; }); return o; };
  const without = (S, id) => { const c = clone(S); c.houses = c.houses.filter((h) => h.id !== id); return c; };

  /* a mixed portfolio used by several checks: 2 owned (one house, one commercial), planned: home, commercial, business, home, multi-family */
  const mixed = () => mk([OWN(HOUSE('o1'), 40), OWN(COMM('o2'), 90), HOUSE('p1'), COMM('p2'), BIZ('p3'), HOUSE('p4'), MULTI('p5')]);

  /* ============ N1 pure numbering function (engine level, fast) ============ */
  await ncheck('N1', 'Engine numbering(): contiguous 1..n per view in purchase order on 300 seeded random portfolios, pure, shifts by one on removal', 10, 'node -e "E=require(\'./v4/engine.js\'); E.numbering(S, E.plan(S))"', async () => {
    const P = new Parts(); let bad = { contig: 0, planned: 0, owned: 0, pure: 0, shift: 0, view: 0, cnt: 0 }, info = {}, tot = 0, seen = new Set();
    P.t(typeof E.numbering === 'function', 'Engine.numbering exists', 1);
    for (let t = 0; t < 300; t++) {
      const n = ri(1, 10), hs = [];
      for (let i = 0; i < n; i++) {
        const k = ri(0, 4), id = 'r' + i, o = { status: rnd() < 0.3 ? 'owned' : 'planned' };
        if (o.status === 'owned') o.paid = ri(0, 70); else if (rnd() < 0.25) o.buyIn = ri(0, 90);
        if (rnd() < 0.2) { o.exit = rnd() < 0.5 ? 'sell' : 'merge'; o.exitMonth = ri(30, 110); if (o.exit === 'merge') o.mergeInto = 'auto'; }
        hs.push(k < 2 ? HOUSE(id, o) : k === 2 ? COMM(id, o) : k === 3 ? BIZ(id, o) : MULTI(id, o));
      }
      for (let i = n - 1; i > 0; i--) { const j = ri(0, i); [hs[i], hs[j]] = [hs[j], hs[i]]; } /* any list order: removed, added, dragged, imported */
      const S = E.normalize({ g: Object.assign({}, E.GDEF), houses: hs }), before = JSON.stringify(S), pl = E.plan(S), N = E.numbering(S, pl), ex = expectOf(S); tot++;
      const pn = S.houses.filter((h) => h.status !== 'owned').map((h) => N.num[h.id]), on = S.houses.filter((h) => h.status === 'owned').map((h) => N.num[h.id]);
      if (!seqOk(pn) || !seqOk(on)) { bad.contig++; info.contig = info.contig || JSON.stringify([pn, on]); }
      if (!S.houses.every((h) => h.status === 'owned' || N.num[h.id] === ex.planned[h.id])) { bad.planned++; info.planned = info.planned || pn.join(); }
      if (!S.houses.every((h) => h.status !== 'owned' || N.num[h.id] === ex.owned[h.id])) { bad.owned++; info.owned = info.owned || on.join(); }
      if (JSON.stringify(S) !== before || JSON.stringify(E.numbering(S, pl).num) !== JSON.stringify(N.num)) bad.pure++;
      if (!S.houses.every((h) => N.view[h.id] === (h.status === 'owned' ? 'owned' : 'planned')) || N.count.planned !== pn.length || N.count.owned !== on.length) bad.view++;
      /* funded planned assets: numbers follow purchase months (an asset is never bought before one above it) */
      const fp = S.houses.filter((h) => h.status !== 'owned' && isFinite(pl.purchase[h.id])).sort((a, b) => N.num[a.id] - N.num[b.id]);
      if (!fp.every((h, i) => i === 0 || pl.purchase[fp[i - 1].id] <= pl.purchase[h.id])) { bad.planned++; info.planned = info.planned || 'purchase order broken'; }
      const mid = S.houses[ri(0, S.houses.length - 1)], S2 = E.without(E.normalize(clone(S)), mid.id), N2 = E.numbering(S2, E.plan(S2));
      const vw = mid.status === 'owned' ? 'owned' : 'planned';
      if (!S2.houses.every((h) => { const was = N.num[h.id]; const want = N.view[h.id] === vw && was > N.num[mid.id] ? was - 1 : was; return N2.num[h.id] === want; })) { bad.shift++; info.shift = info.shift || mid.id + ' ' + JSON.stringify(N.num) + '->' + JSON.stringify(N2.num); }
      Object.keys(N.num).forEach((k) => seen.add(N.view[k] + N.num[k]));
    }
    P.t(bad.contig === 0, 'every view is exactly 1..n (' + tot + ' states)', 3, info.contig);
    P.t(bad.planned === 0, 'planned numbers = list position among planned assets, in purchase order', 2, info.planned);
    P.t(bad.owned === 0, 'owned numbers = oldest first (most months paid = 1), ties by list order', 1.5, info.owned);
    P.t(bad.pure === 0, 'pure: does not change the portfolio, same answer twice', 1);
    P.t(bad.view === 0, 'view and count are right for every asset', 1);
    P.t(bad.shift === 0, 'removing one asset lowers every later number of its view by exactly one and changes nothing else', 3, info.shift);
    P.t([...seen].some((s) => /planned1$/.test(s)) && [...seen].some((s) => /owned1$/.test(s)), 'both views start at 1 (an owned asset does not take number 1 of Planned)', 1);
    const e0 = { houses: [] }; P.t(JSON.stringify(E.numbering(E.normalize({ g: Object.assign({}, E.GDEF), houses: [] }), E.plan(E.normalize({ g: Object.assign({}, E.GDEF), houses: [] }))).count) === '{"planned":0,"owned":0}', 'an empty portfolio numbers nothing', 0.5);
    return P;
  });

  /* ============ N2 the user's screenshot ============ */
  await ncheck('N2', 'The screenshot: one planned commercial + one planned home (+ a bought asset) show 1 and 2 in purchase order, nothing skipped', 10, 'state: [owned house, planned commercial, planned home] and the same without the owned one; read the Planned badges', async () => {
    const P = new Parts();
    for (const withOwned of [true, false]) {
      const S = mk((withOwned ? [OWN(HOUSE('own1'), 24)] : []).concat([COMM('cm1'), HOUSE('hm1')])), lab = withOwned ? 'with a hidden bought asset' : 'without';
      await load(S); await toMain(); const rs = await rows('planned'), n = nums(rs);
      P.t(n.cm1 === 1 && n.hm1 === 2, lab + ': the commercial property is 1 and the home is 2 (was 2 and 3 with the bought asset hidden)', 2.5, JSON.stringify(n));
      P.t(rs.length === 2 && seqOk(rs.map((r) => r.no)), lab + ': two rows, numbers 1 and 2, no asset 1 missing', 1.5, rs.map((r) => r.no).join());
      P.t(rs.find((r) => r.id === 'cm1').sec === 'cat-commercial' && rs.find((r) => r.id === 'hm1').sec === 'cat-house', lab + ': they sit in the Commercial and Homes cards', 0.5);
      const bt = await page.evaluate(() => [...document.querySelectorAll('[data-testid=buy-no]')].map((b) => b.textContent.trim())); P.t(bt.sort().join() === '1,2', lab + ': badges on screen are exactly 1,2', 0.5, bt.join());
      if (withOwned) { const ro = await rows('owned'); P.t(ro.length === 1 && ro[0].no === 1, 'Real page numbers the bought asset 1', 1, JSON.stringify(ro)); }
    }
    await load(mk([OWN(HOUSE('own1'), 24), COMM('cm1'), HOUSE('hm1')])); await toMain();
    const hd = await header('hm1'); P.t(hd.no === 2 && /^#2 planned/.test(hd.txt), 'the home\'s asset page says #2 planned (not #3)', 1.5, hd.txt);
    const ho = await header('own1'); P.t(ho.no === 1 && /^#1 bought/.test(ho.txt), 'the bought asset\'s asset page says #1 bought', 1, ho.txt);
    return P;
  });

  /* ============ N3 several hidden / other-type / sold assets ============ */
  await ncheck('N3', 'Hidden assets never take a Planned number: two bought assets, a bought commercial and business, a sold-in-plan asset', 10, 'state with owned house + owned business + owned commercial + planned mix + a plan-sold asset', async () => {
    const P = new Parts();
    const S = mk([OWN(HOUSE('o1'), 10), OWN(BIZ('o2'), 55), OWN(COMM('o3'), 30), HOUSE('p1'), HOUSE('p2', { exit: 'sell', exitMonth: 70 }), COMM('p3'), BIZ('p4'), HOUSE('p5')]);
    await load(S); const ex = expectOf(S); await toMain();
    isRowsOk(await rows('planned'), ex.planned, P, 'Planned', 1.5); isRowsOk(await rows('owned'), ex.owned, P, 'Real', 1);
    const rs = await rows('planned'); const sold = rs.filter((r) => r.sec === 'cat-sold');
    P.t(sold.length >= 1, 'the sold-in-plan asset sits in the Sold card of Planned', 0.5, rs.map((r) => r.id + '@' + r.sec).join());
    P.t(sold.every((r) => r.no === ex.planned[r.id]), 'a sold-in-plan asset keeps its place in the plan order (its number is missing from the other cards)', 1, sold.map((r) => r.id + ':' + r.no).join());
    P.t(/counted from 1 on this page only/.test(await page.evaluate(() => (document.querySelector('[data-testid=sold-note]') || {}).textContent || '')) || sold.length === 0, 'the Sold note explains the policy (numbers per page, sold keep their place)', 0.5);
    const real = await rows('owned'); P.t(real.map((r) => r.no).join() === '1,2,3' && real.map((r) => r.id).join() === 'o2,o3,o1' || real.map((r) => r.no).sort().join() === '1,2,3', 'Real numbers the 3 bought assets 1..3', 0.5, real.map((r) => r.id + ':' + r.no).join());
    /* Real page rows are shown oldest first = by their number */
    P.t(real.every((r) => r.no === ex.owned[r.id]) , 'Real rows carry oldest-first numbers (o2 paid 55 = 1, o3 = 2, o1 = 3)', 0.5, real.map((r) => r.id + ':' + r.no).join());
    await sweep(S, P, 'mixed', 1, 3);
    return P;
  });

  /* ============ N4 Remove (first / middle / last) + stale render guard ============ */
  await ncheck('N4', 'Remove an asset (first / middle / last) shifts every later number down by one at once, read without reloading, and again after a reload', 12, 'select row > Remove > Yes; read the badges immediately', async () => {
    const P = new Parts(); const base0 = mk([OWN(HOUSE('o1'), 40), HOUSE('p1'), COMM('p2'), HOUSE('p3'), BIZ('p4'), HOUSE('p5'), HOUSE('p6')]);
    for (const [lab, id] of [['first planned', 'p1'], ['middle planned', 'p3'], ['last planned', 'p6']]) {
      await load(base0); await toMain(); const b = nums(await rows('planned')); await removeRow(id); /* NO reload, NO wait: the DOM must already be renumbered */
      const rs = await page.evaluate(READ), S2 = without(base0, id), ex = expectOf(S2).planned;
      P.t(rs.length === 5 && !rs.some((r) => r.id === id) && rs.every((r) => r.no === ex[r.id]), lab + ': right after Remove (no reload) the numbers are the new contiguous 1..5', 1.5, rs.map((r) => r.id + ':' + r.no).join());
      P.t(rs.every((r) => r.no === (b[r.id] > b[id] ? b[r.id] - 1 : b[r.id])), lab + ': every later number dropped by exactly one, earlier ones unchanged', 1, rs.map((r) => r.id + ':' + r.no).join() + ' was ' + JSON.stringify(b));
      await page.reload(); await page.waitForSelector('#app > *'); await settle(); await tab('planned'); const rs2 = await page.evaluate(READ);
      P.t(rs2.every((r) => r.no === ex[r.id]) && rs2.length === 5, lab + ': the same after a reload', 0.5, rs2.map((r) => r.id + ':' + r.no).join());
    }
    /* remove a bought asset: Planned is untouched, Real renumbers */
    await load(mk([OWN(HOUSE('o1'), 10), OWN(HOUSE('o2'), 50), OWN(COMM('o3'), 30), HOUSE('p1'), COMM('p2')])); await tab('real'); const rb = nums(await page.evaluate(READ)); await removeRow('o3');
    const ra = await page.evaluate(READ); P.t(ra.length === 2 && nums(ra).o2 === 1 && nums(ra).o1 === 2, 'removing the middle bought asset: Real is 1,2 at once', 1, JSON.stringify(rb) + '>' + JSON.stringify(nums(ra)));
    await tab('planned'); P.t(Object.values(nums(await page.evaluate(READ))).sort().join() === '1,2', 'Planned numbers are unchanged by removing a bought asset', 0.5);
    /* remove twice in a row, then a selected-row panel and expanded state do not leave a stale number */
    await load(base0); await toMain(); await removeRow('p3'); await removeRow('p1'); const r3 = await page.evaluate(READ), e3 = expectOf(without(without(base0, 'p3'), 'p1')).planned;
    P.t(r3.length === 4 && r3.every((r) => r.no === e3[r.id]), 'two removals in a row: 1..4', 1, r3.map((r) => r.id + ':' + r.no).join());
    await selRow('p5'); const sel = await page.evaluate(() => { const r = document.querySelector('[data-row=p5]'); return { no: +r.querySelector('[data-testid=buy-no]').textContent, open: !!document.querySelector('[data-for=p5]') }; });
    P.t(sel.open && sel.no === e3.p5, 'a selected / expanded row shows the renumbered value too', 0.5, JSON.stringify(sel));
    const st = await store(); P.t(st.houses.every((h) => !('n' in h) && !('no' in h) && !('num' in h) && !('number' in h) && !('buyNo' in h) && !('order' in h)), 'no number is stored on the assets (numbers are recomputed from the list)', 0.5);
    return P;
  });

  /* ============ N5 Remove-all and Undo ============ */
  await ncheck('N5', 'Remove all planned assets, Undo, and add after Remove-all keep the numbers right (bought assets stay 1..m, new planned asset is 1)', 8, 'Planned > Remove > Yes, remove all; Undo; add a home', async () => {
    const P = new Parts(); const S = mk([OWN(HOUSE('o1'), 10), OWN(COMM('o2'), 60), HOUSE('p1'), COMM('p2'), HOUSE('p3')]);
    await load(S); await toMain(); await page.click('[data-testid=clear-plan-btn]'); await page.click('[data-clear-yes]');
    const rp = await page.evaluate(READ); P.t(rp.length === 0, 'Remove all leaves no planned row', 1, rp.map((r) => r.id).join());
    const ro = await rows('owned'); P.t(ro.length === 2 && nums(ro).o2 === 1 && nums(ro).o1 === 2, 'bought assets stay numbered 1..2 oldest first after Remove all', 1.5, JSON.stringify(nums(ro)));
    await tab('planned'); await page.click('[data-undo]'); await page.waitForTimeout(80); await settle(); const ex = expectOf(S);
    isRowsOk(await rows('planned'), ex.planned, P, 'after Undo Planned', 1); isRowsOk(await rows('owned'), ex.owned, P, 'after Undo Real', 0.5);
    /* Remove all again, then add one home through the Add flow: it is number 1 */
    await tab('planned'); await page.click('[data-testid=clear-plan-btn]'); await page.click('[data-clear-yes]'); await page.waitForTimeout(60);
    await page.click('[data-add=house]'); await page.waitForTimeout(40); await page.click('[data-testid=confirm-add]'); await page.waitForSelector('[data-testid=asset-buy-no]');
    const hd = await page.evaluate(() => ({ no: +document.querySelector('[data-testid=asset-buy-no]').dataset.no, txt: document.querySelector('[data-testid=asset-buy-no]').textContent.trim() }));
    P.t(hd.no === 1 && /^#1 planned/.test(hd.txt), 'the first asset added after Remove all is #1 planned (the bought assets do not count)', 1.5, hd.txt);
    return P;
  });

  /* ============ N6 Undo of a removal, Duplicate, reorder, status toggle ============ */
  await ncheck('N6', 'Undo of a removal, Duplicate, Move up/down and the owned <-> planned toggle all leave contiguous numbers in order', 12, 'row panel buttons: Remove+Undo, Duplicate, Move down, asset page Owned/Planned', async () => {
    const P = new Parts(); const S0 = mk([OWN(HOUSE('o1'), 20), HOUSE('p1'), HOUSE('p2'), HOUSE('p3'), COMM('p4'), HOUSE('p5')]);
    /* Undo restores the old numbers */
    await load(S0); await toMain(); const b = nums(await rows('planned')); await removeRow('p2'); await page.click('[data-undo]'); await page.waitForTimeout(60); await settle();
    const u = nums(await page.evaluate(READ)); P.t(JSON.stringify(u) === JSON.stringify(b), 'Undo of a removal brings back every old number', 2, JSON.stringify(b) + ' / ' + JSON.stringify(u));
    /* Duplicate */
    await load(S0); await toMain(); await selRow('p3'); await page.click('[data-for=p3] [data-testid=row-duplicate]'); await page.waitForTimeout(80); await settle(); await toMain();
    let st = await store(), S1 = clone(st), ex = expectOf(S1).planned, rs = await rows('planned');
    P.t(rs.length === 6 && seqOk(rs.map((r) => r.no)) && rs.every((r) => r.no === ex[r.id]), 'Duplicate: 6 planned assets numbered 1..6', 1.5, rs.map((r) => r.id + ':' + r.no).join());
    const cp = S1.houses.find((h) => /\(copy\)/.test(h.addr)); P.t(cp && ex[cp.id] === ex.p3 + 1, 'the copy sits right after the original (number +1) and the later ones moved up by one', 1, JSON.stringify(ex));
    /* Duplicate of a BOUGHT asset gives a planned copy: Planned grows, Real unchanged */
    await load(S0); await tab('real'); await selRow('o1'); await page.click('[data-for=o1] [data-testid=row-duplicate]'); await page.waitForTimeout(80); await settle(); await toMain();
    st = await store(); S1 = clone(st); ex = expectOf(S1); isRowsOk(await rows('planned'), ex.planned, P, 'duplicate of a bought asset, Planned', 0.6); isRowsOk(await rows('owned'), ex.owned, P, 'duplicate of a bought asset, Real', 0.4);
    /* Move down */
    await load(S0); await toMain(); await selRow('p1'); await page.click('[data-for=p1] [data-testid=move-down]'); await page.waitForTimeout(80); await settle(); await toMain();
    st = await store(); S1 = clone(st); ex = expectOf(S1).planned; rs = await rows('planned'); const hs = S1.houses.filter((h) => h.status !== 'owned').map((h) => h.id);
    P.t(hs.join() !== 'p1,p2,p3,p4,p5' && rs.every((r) => r.no === ex[r.id]) && seqOk(rs.map((r) => r.no)), 'Move down: the order changed and the numbers follow the new order, 1..5', 1.5, rs.map((r) => r.id + ':' + r.no).join() + ' list ' + hs.join());
    const h1 = nums(rs); P.t(h1.p2 === 1 && h1.p1 === 2, 'p1 and p2 swapped numbers (2 and 1)', 1, JSON.stringify(h1));
    /* status toggle planned -> owned and back */
    await load(S0); await toMain(); await page.evaluate(() => { location.hash = '#house-p2'; }); await page.waitForSelector('[data-status=owned]'); await page.click('[data-status=owned]'); await page.waitForTimeout(60);
    st = await store(); S1 = clone(st); ex = expectOf(S1); await toMain(); isRowsOk(await rows('planned'), ex.planned, P, 'p2 marked bought, Planned', 0.8); isRowsOk(await rows('owned'), ex.owned, P, 'p2 marked bought, Real', 0.8);
    P.t(Object.keys(ex.planned).length === 4 && !ex.planned.p2, 'p2 left the Planned numbers (now 4 planned assets numbered 1..4)', 0.5);
    await page.evaluate(() => { location.hash = '#house-p2'; }); await page.waitForSelector('[data-status=planned]'); await page.click('[data-status=planned]'); await page.waitForTimeout(60);
    st = await store(); S1 = clone(st); ex = expectOf(S1); await toMain(); isRowsOk(await rows('planned'), ex.planned, P, 'p2 back to planned, Planned', 0.8); isRowsOk(await rows('owned'), ex.owned, P, 'p2 back to planned, Real', 0.4);
    return P;
  });

  /* ============ N7 Add flow ============ */
  await ncheck('N7', 'Adding an asset (Add flow, an example, a bought asset) numbers it last in its own view and renumbers nothing else', 8, 'Planned > + Add home > Add; + Add a bought asset; an example', async () => {
    const P = new Parts(); const S = mk([OWN(HOUSE('o1'), 20), HOUSE('p1'), COMM('p2')]);
    await load(S); await toMain(); const before = nums(await rows('planned'));
    await page.click('[data-add=house]'); await page.waitForTimeout(40); await page.click('[data-testid=confirm-add]'); await page.waitForSelector('[data-testid=asset-buy-no]');
    let hd = await page.evaluate(() => ({ no: +document.querySelector('[data-testid=asset-buy-no]').dataset.no, txt: document.querySelector('[data-testid=asset-buy-no]').textContent.trim() }));
    P.t(hd.no === 3 && /^#3 planned/.test(hd.txt), 'a new planned home is #3 planned (the next number in buy order)', 2, hd.txt);
    await toMain(); let rs = await rows('planned'); P.t(rs.length === 3 && seqOk(rs.map((r) => r.no)) && nums(rs).p1 === before.p1 && nums(rs).p2 === before.p2, 'the other numbers did not change', 1.5, JSON.stringify(nums(rs)));
    /* via an example */
    await page.click('[data-add=commercial]'); await page.waitForTimeout(40); const exb = await page.$('[data-testid^=ex-]');
    if (exb) { await exb.click().catch(() => {}); await page.waitForTimeout(40); }
    await page.click('[data-testid=confirm-add]'); await page.waitForSelector('[data-testid=asset-buy-no]');
    hd = await page.evaluate(() => ({ no: +document.querySelector('[data-testid=asset-buy-no]').dataset.no, txt: document.querySelector('[data-testid=asset-buy-no]').textContent.trim() }));
    P.t(hd.no === 4 && /^#4 planned/.test(hd.txt), 'a second new planned asset (added from the example list) is #4 planned', 1.5, hd.txt);
    /* a bought asset: Real m+1, Planned unchanged */
    await toMain(); await tab('real'); await page.click('[data-testid=add-owned]'); await page.waitForTimeout(40); await page.click('[data-testid=confirm-add]').catch(() => {}); await page.waitForSelector('[data-testid=asset-buy-no]').catch(() => {});
    hd = await page.evaluate(() => { const t = document.querySelector('[data-testid=asset-buy-no]'); return t ? { no: +t.dataset.no, view: t.dataset.nview, txt: t.textContent.trim() } : null; });
    P.t(hd && hd.view === 'owned' && /^#\d+ bought/.test(hd.txt), 'a bought asset added from the Real page is numbered in the Real view', 1, JSON.stringify(hd));
    const st = await store(), ex = expectOf(clone(st)); await toMain(); isRowsOk(await rows('planned'), ex.planned, P, 'after adds, Planned', 1); isRowsOk(await rows('owned'), ex.owned, P, 'after adds, Real', 1);
    return P;
  });

  /* ============ N8 load paths: scenario, Saved, backup import, ADDITIONS, migration ============ */
  await ncheck('N8', 'Scenario load, Saved open, backup import, ADDITIONS append and an old unsorted save all give contiguous numbers in both views', 12, 'Assumptions > sample > Yes; Saved > Open; Restore backup; state without the lost-creek-704 key; v8 save with shuffled assets', async () => {
    const P = new Parts(); const SRC = mk([OWN(HOUSE('o1'), 10), OWN(COMM('o2'), 70), HOUSE('p1'), COMM('p2'), BIZ('p3'), HOUSE('p4')]);
    const full = async (label, w) => { await toMain(); const st = await store(); const ex = expectOf(clone(st)); isRowsOk(await rows('planned'), ex.planned, P, label + ' Planned', w); isRowsOk(await rows('owned'), ex.owned, P, label + ' Real', w * 0.5); return st; };
    /* (a) scenario load through the UI */
    await load(SRC, '#assumptions'); await page.waitForSelector('[data-testid=samples-card]'); const sb = await page.$('[data-testid=samples-card] button.scn'); await sb.click(); await page.waitForTimeout(40);
    const yes = await page.$('[data-testid=samples-card] .confirm button.btn, [data-testid=samples-card] [data-big-yes], [data-testid=samples-card] .confirm button'); if (yes) await yes.click(); await page.waitForTimeout(150);
    await page.evaluate(() => { location.hash = ''; }); await page.waitForTimeout(60); await full('after loading a sample portfolio,', 1);
    /* (b) Saved open */
    await load(SRC); await toMain(); await tab('saved'); await page.click('[data-testid=saved-save]').catch(() => {}); await page.waitForTimeout(60);
    let cards = await page.$$('[data-testid=saved-card]');
    if (!cards.length) { await page.evaluate((k) => localStorage.setItem(k, JSON.stringify([{ id: 's1', name: 'Alpha', ts: Date.now(), state: JSON.parse(localStorage.getItem('rep-v4')) }])), 'rep-v4-saved'); const other = mk([HOUSE('q1'), COMM('q2'), HOUSE('q3', { exit: 'sell', exitMonth: 80 }), OWN(BIZ('q4'), 5)]); await load(other); await page.evaluate((s) => localStorage.setItem('rep-v4-saved', JSON.stringify([{ id: 's1', name: 'Alpha', ts: Date.now(), state: s }])), SRC); await page.reload(); await page.waitForSelector('#app > *'); await settle(); await tab('saved'); }
    await page.click('[data-testid=saved-open]'); await page.click('[data-load-yes]'); await page.waitForTimeout(120); await settle();
    let st = await full('after opening a Saved portfolio,', 1.2); P.t(st.houses.map((h) => h.id).sort().join() === SRC.houses.map((h) => h.id).sort().join(), 'the Saved portfolio is what is open now', 0.3);
    await page.click('[data-undo]').catch(() => {}); await page.waitForTimeout(100); await full('after Undo of the Saved open,', 0.8);
    /* (c) backup import through Assumptions */
    const back = Object.assign(clone(SRC), { houses: clone(SRC.houses).reverse() }); /* a backup whose list is not in the usual order */
    await load(mk([HOUSE('z1')]), '#assumptions'); await page.fill('#bkin', JSON.stringify(back)); await page.click('[data-restore-text]'); await page.waitForTimeout(60); await page.click('[data-import-yes]'); await page.waitForTimeout(120);
    await page.evaluate(() => { location.hash = ''; }); await page.waitForTimeout(60); st = await full('after a backup import (list reversed),', 1.2);
    P.t(st.houses.length >= 6, 'the backup replaced the portfolio', 0.2, String(st.houses.length));
    /* (d) ADDITIONS appended once, last in Planned */
    const sa = clone(SRC); sa.added = ['premier-fl-gc-bizbuysell-2564259']; sa.v = DATA_V; await load(sa); await toMain(); st = await store(); const lc = st.houses.find((h) => h.id === 'lostcreek');
    const ex = expectOf(clone(st)), nPl = Object.keys(ex.planned).length;
    P.t(!!lc && ex.planned[lc.id] === nPl && nPl === 5, 'the ADDITIONS asset is appended as the LAST planned asset (number 5 here) and the 4 planned assets keep 1..4', 1.5, lc ? lc.id + ':' + ex.planned[lc.id] + '/' + nPl : 'no addition found');
    await full('after the ADDITIONS append,', 1.2); const again = await store(); await page.reload(); await page.waitForSelector('#app > *'); await settle(); const st3 = await store(); P.t(st3.houses.length === again.houses.length, 'the addition is applied once (a reload does not add it again)', 0.5);
    /* (e) migration of an old, unsorted v8 save */
    const old = clone(SRC); delete old.orderV; old.v = 8; old.houses = [old.houses[3], old.houses[0], old.houses[5], old.houses[1], old.houses[2], old.houses[4]]; delete old.added; await load(old); await toMain(); await full('after migrating an old unsorted save,', 1.5);
    st = await store(); const pl = E.plan(E.normalize(clone(st))), fp = st.houses.filter((h) => h.status !== 'owned' && isFinite(pl.purchase[h.id]));
    P.t(fp.every((h, i) => i === 0 || pl.purchase[fp[i - 1].id] <= pl.purchase[h.id]), 'migrated order: numbers follow purchase months', 0.5);
    return P;
  });

  /* ============ N9 seeded random mixes ============ */
  await ncheck('N9', 'Seeded random portfolios (home / commercial / business / multi-family, planned / bought / sold / merged): both pages contiguous, headers and labels agree, and after a random Remove', 10, '9 random states loaded in the app; sweep rows, headers, then remove one', async () => {
    const P = new Parts();
    for (let t = 0; t < 9; t++) {
      const n = ri(3, 11), hs = [];
      for (let i = 0; i < n; i++) {
        const k = ri(0, 5), id = 'x' + i, o = {}; if (rnd() < 0.28) { o.status = 'owned'; o.paid = ri(0, 80); } else if (rnd() < 0.2) o.buyIn = ri(0, 70);
        if (rnd() < 0.2) { o.exit = rnd() < 0.5 ? 'sell' : 'merge'; o.exitMonth = ri(40, 110); if (o.exit === 'merge') o.mergeInto = 'auto'; }
        hs.push(k < 2 ? HOUSE(id, o) : k === 2 ? COMM(id, o) : k === 3 ? BIZ(id, o) : MULTI(id, o));
      }
      const S = mk(hs); await load(S); await sweep(S, P, 'random#' + t, 1, 2);
      await toMain(); await tab('planned'); let cand = await page.evaluate(() => [...document.querySelectorAll('[data-testid=row-extra-toggle]')].map((b) => b.closest('[data-row]').dataset.row)), view = 'planned';
      if (!cand.length) { await tab('real'); view = 'owned'; cand = await page.evaluate(() => [...document.querySelectorAll('[data-testid=row-extra-toggle]')].map((b) => b.closest('[data-row]').dataset.row)); }
      if (!cand.length) continue; const gone = pick(cand); await removeRow(gone);
      const S2 = without(S, gone), ex = expectOf(S2), isOwn = S.houses.find((h) => h.id === gone).status === 'owned', rs = await page.evaluate(READ), want = isOwn ? ex.owned : ex.planned;
      P.t(rs.length === Object.keys(want).length && rs.every((r) => r.no === want[r.id]) && seqOk(rs.map((r) => r.no)), 'random#' + t + ': after removing ' + gone + ' the view is renumbered 1..' + rs.length + ' with no reload', 0.8, rs.map((r) => r.id + ':' + r.no).join() + ' want ' + JSON.stringify(want));
    }
    return P;
  });

  /* ============ N10 text consistency: '#N' mentions, Finances, default plan, Saved ============ */
  await ncheck('N10', 'Every "#N" the app prints is a real number of its own view; Finances and Saved pages carry no stale numbers; the default plan is 1..36 in order and unchanged', 8, 'scan the text of Planned, Real, Finances, Assumptions and an asset page; default plan numbers', async () => {
    const P = new Parts(); const S = mixed(); await load(S); await toMain(); const ex = expectOf(S);
    const maxPl = Object.keys(ex.planned).length, maxOw = Object.keys(ex.owned).length;
    for (const [lab, go] of [['Planned', async () => { await toMain(); await tab('planned'); }], ['Real', async () => { await toMain(); await tab('real'); }], ['Finances', async () => { await page.evaluate(() => { location.hash = '#finances'; }); await page.waitForTimeout(100); await settle(); }], ['Assumptions', async () => { await page.evaluate(() => { location.hash = '#assumptions'; }); await page.waitForTimeout(100); await settle(); }]]) {
      await go(); const t = await page.evaluate(() => document.getElementById('app').innerText), m = [...t.matchAll(/(?:^|[\s(])#(\d+)\b/g)].map((x) => +x[1]);
      P.t(m.every((v) => v >= 1 && v <= Math.max(maxPl, maxOw)), lab + ' page: every "#N" mention is a number that exists (' + (m.join() || 'none') + ')', 1);
      P.t(!/\b(NaN|undefined|\[object)/.test(t), lab + ' page: no NaN / undefined text', 0.3);
    }
    await toMain(); await tab('real'); const rsR = await page.evaluate(READ); const labels = await page.evaluate(() => [...document.querySelectorAll('[aria-label^="Buy number"]')].map((e) => e.getAttribute('aria-label')));
    P.t(labels.length === rsR.length, 'Real page: one "Buy number N" label per row', 0.5);
    const rn = (await rows('owned')).map((r) => r.no); P.t(seqOk(rn), 'Real page numbers are 1..' + maxOw, 0.5);
    /* Saved cards / Finances list assets by name, not by number: no number can go stale there */
    const fin = await (async () => { await page.evaluate(() => { location.hash = '#finances'; }); await page.waitForTimeout(100); return page.evaluate(() => document.getElementById('app').innerText); })();
    P.t(!/\bAsset \d+\b|\bnumber \d+\b/i.test(fin), 'Finances names assets by address, never by a stored number', 0.5);
    /* default plan */
    await load(null); await toMain(); const rs = await rows('planned'), st = await store(); const seedN = E.seedPlan().houses.length;
    P.t(rs.length === seedN && seedN === 36 && !st.houses.some((h) => h.status === 'owned'), 'default plan: 36 assets, nothing bought', 1, String(rs.length));
    const byNo = rs.slice().sort((a, b) => a.no - b.no).map((r) => r.id), listOrder = st.houses.map((h) => h.id);
    P.t(seqOk(rs.map((r) => r.no)) && byNo.join() === listOrder.join(), 'default plan: numbers 1..36 in list order = purchase order', 1.5, byNo.slice(0, 5).join());
    const pl = E.plan(E.normalize(clone(st))), fm = st.houses.map((h) => pl.purchase[h.id]); P.t(fm.every((v, i) => i === 0 || v >= fm[i - 1]) && fm.every(isFinite), 'default plan: purchase months never go down the list and every asset is funded', 1, fm.slice(0, 6).join());
    const verdict = await page.evaluate(() => (document.querySelector('[data-testid=plan-headline]') || {}).textContent || '');
    P.t(/^Nothing bought yet\. All 36 planned are possible/.test(verdict) && E.plan(E.normalize(clone(st))).unfunded.length === 0, 'default plan verdict still reads Yes (all 36 possible, none unfunded)', 0.5, String(verdict).slice(0, 80));
    return P;
  });

  const max = checks.reduce((s, c) => s + c.points, 0), earned = checks.reduce((s, c) => s + c.earned, 0);
  return { earned: Math.round(earned * 100) / 100, max, checks };
};
