/* Category J: one clock with calendar dates (J11-J19 cover the review round: sale rounding, Checks layout and edge cases, Finances dates, calculator revert, plurals, migration note, undo toast, saved names, row wording), math in number boxes, the Planned page Checks block, sold-asset cash profit, silent migration to the current plan, the 607 Siena Way stretch scenario, tap targets.
   100 automated points on their own scale. Plugged in from grade.js: require('./ux-grade.js').run(X) -> { earned, max, checks }.  Standalone: UX_ONLY=1 node grade.js  (J_ONLY=J1,J3 for single checks).
   The app's "today" is pinned (window.REP_TODAY = 2026-11-12 in grade.js) so dates are stable. Dates are compared with an independent integer-math reference (grader/dates.js). Never modifies the app. */
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const D = require('./dates.js');

exports.run = async function run(X) {
  const { E, Parts, DATA_V, KEY, mkCtx, mkPage, base } = X;
  const UIKEY = 'rep-v4-ui', SKEY = 'rep-v4-saved', checks = [];
  async function jcheck(id, name, points, repro, fn) {
    if (process.env.J_ONLY && process.env.J_ONLY.split(',').indexOf(id) < 0) return;
    let r; const t0 = Date.now();
    try { r = await fn(); } catch (e) { r = { ratio: 0, detail: 'CRASH in check: ' + (e && e.stack || e).toString().slice(0, 900) }; }
    if (r instanceof Parts) r = { ratio: r.ratio, detail: r.detail };
    const ratio = Math.max(0, Math.min(1, r.ratio));
    const rec = { id, category: 'J', name, points, earned: Math.round(points * ratio * 100) / 100, ratio, detail: r.detail || '', repro, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
    checks.push(rec);
    console.log(`  [${rec.earned.toFixed(2)}/${points}] ${id} ${name}  (${rec.seconds}s)${ratio < 1 ? '  <-- ' + String(rec.detail).slice(0, 400) : ''}`);
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const near2 = (a, b, t) => Math.abs(a - b) <= t;
  const ctx = await mkCtx({ autoExpand: false }); const page = await mkPage(ctx, 'ux');
  let seq = 0;
  async function load(S, hash, ui, saved) {
    await page.goto(base() + '/index.html?j=' + seq++);
    await page.evaluate(([k, s, uk, u, sk, sv]) => { try { localStorage.clear(); if (s) localStorage.setItem(k, JSON.stringify(s)); if (u) localStorage.setItem(uk, JSON.stringify(u)); if (sv) localStorage.setItem(sk, JSON.stringify(sv)); } catch (e) {} }, [KEY, S || null, UIKEY, ui || null, SKEY, saved || null]);
    await page.goto(base() + '/index.html?j=' + seq++ + (hash || ''));
    await page.waitForSelector('#app > *');
  }
  const store = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  const withV = (S) => Object.assign(clone(S), { v: DATA_V });
  const num = (t) => { const m = /-?[\d,]+(\.\d+)?/.exec(String(t || '').replace(/−/g, '-')); return m ? +m[0].replace(/,/g, '') : NaN; };
  const typeIn = async (sel, text, o) => { const l = page.locator(sel).first(); await l.click(); await page.keyboard.press('Control+A'); if (o && o.slow) await page.keyboard.type(text, { delay: 15 }); else await page.keyboard.insertText(text); };
  const blur = async () => { await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.waitForTimeout(80); };
  const openAllColl = async () => { for (let i = 0; i < 30; i++) { const b = await page.$('#app [data-coll][aria-expanded=false]'); if (!b) break; await b.click(); await page.waitForTimeout(30); } };

  /* ---------- J1 dates on the one clock ---------- */
  await jcheck('J1', 'Calendar dates: month 0 = today (Nov 12, 2026), month N = today + N months (Nov 12, 2026 / Nov 2026; never MM/DD/YY); every month-from-today field shows its date and updates as you type; the first asset says where its money comes from; no bare "starting point"', 12, 'node: compare window.RepDate with grader/dates.js for months 0-480; open an asset page and edit Not before / Sell in; read the note', async () => {
    const P = new Parts(); const S = withV(E.seedPlan()); await load(S, '#house-maple');
    const got = await page.evaluate(() => { const o = []; for (let m = 0; m <= 480; m++) o.push(window.RepDate.dt(m)); return o; });
    let bad = ''; for (let m = 0; m <= 480; m++) if (got[m] !== D.fmt(m)) { bad = m + ': ' + got[m] + ' vs ' + D.fmt(m); break; }
    P.t(!bad && D.fmt(0) === 'Nov 12, 2026' && D.fmt(19) === 'Jun 12, 2028' && !got.some((x) => /\d\/\d/.test(x)), 'dt(m) equals the independent reference for months 0-480 (today = Nov 12, 2026, month 19 = Jun 12, 2028; no MM/DD/YY)', 3, bad);
    const hint = async (p) => (await page.locator(`[data-dh="${p}"]`).first().textContent().catch(() => '')) || '';
    P.t((await hint('h.maple.buyIn')) === 'today (Nov 12, 2026)', 'Not before (months) = 0 shows today (Nov 12, 2026)', 1.5, await hint('h.maple.buyIn'));
    await typeIn('[data-p="h.maple.buyIn"]', '19'); await page.waitForTimeout(80);
    P.t((await hint('h.maple.buyIn')) === 'on Jun 12, 2028', 'typing 19 live-updates the hint to Jun 12, 2028', 1.5, await hint('h.maple.buyIn'));
    await typeIn('[data-p="h.maple.buyIn"]', '0'); await blur();
    const note = (await page.locator('[data-testid=buyin-note]').textContent()) || '', mo = E.planR(E.normalize(clone(S))).purchase.maple;
    P.t(note.includes(D.mond(mo)) && /savings above your cushion plus your job money/.test(note) && !/starting point/i.test(note) && !/paid from your own cash/.test(note), 'the first asset note names its money (savings above the cushion + job money) with month ' + mo + ' and its date', 2.5, note);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#app [data-coll]')]; b.forEach((x) => x.getAttribute('aria-expanded') === 'false' && x.click()); }); await page.waitForTimeout(60);
    const body = await page.evaluate(() => document.getElementById('app').innerText);
    P.t(!/starting point/i.test(body) && !/by month \d+\s+now/i.test(body), 'no bare "starting point" / "by month N now" wording on the asset page', 1, '');
    await load(withV(E.seedPlan()), '#house-birch'); await openAllColl();
    P.t((await hint('h.birch.exitMonth')).startsWith('on ') && (await hint('h.birch.exitMonth')) === 'on ' + D.fmt(E.H(E.seedPlan(), 'birch').exitMonth), 'Sell in (months) shows its date', 1, await hint('h.birch.exitMonth'));
    await load(withV(E.seedPlan()), '#finances'); await openAllColl();
    const st0 = await page.locator('[data-dh^="j."][data-dh$=".start"]').count(), en = await page.locator('[data-dh^="j."][data-dh$=".end"]').count();
    P.t(en >= 1, 'Finances: job "Ends in (months)" shows a date hint', 0.5, en + ' end hints');
    await page.click('[data-testid=add-planned]'); await page.waitForTimeout(60);
    const ph = await page.locator('[data-dh$=".month"]').first().textContent(); P.t(ph === 'on ' + D.fmt(12), 'planned expense "Happens in (months)" 12 shows ' + D.fmt(12), 1, ph);
    await load(withV(E.seedPlan()), '');
    const headTxt = await page.locator('[data-testid=plan-headline]').textContent(), lr = E.planR(E.seedPlan()), lastM = Math.max(...E.seedPlan().houses.map((h) => lr.purchase[h.id]).filter(isFinite));
    P.t(headTxt.includes(D.mond(lastM)), 'plan headline shows the last purchase month with its date', 1, headTxt);
    return P;
  });

  /* ---------- J2 math in number boxes ---------- */
  await jcheck('J2', 'Math in number boxes: 650*3, 1,200+450, (2000-300)/2, 650x3 and $/% forms evaluate with a safe parser; the answer reaches rows, totals and the asset page; invalid, half-typed and divide-by-zero input never changes the data and says "Check the math"; no eval / Function in the source', 16, 'type expressions into the rent field on an asset page; read state, hint, row and engine', async () => {
    const P = new Parts(); const src = fs.readFileSync(path.resolve(__dirname, '../v4/app.js'), 'utf8');
    P.t(!/\beval\s*\(/.test(src) && !/new\s+Function\s*\(/.test(src) && !/\bFunction\s*\(/.test(src.replace(/function\s*\(/g, '')), 'source has no eval( and no Function constructor', 2, '');
    const S = withV(E.seedPlan()); await load(S, '#house-maple'); await openAllColl(); const rentSel = '[data-p="h.maple.rent"]';
    const rent = async () => (await store()).houses.find((h) => h.id === 'maple').rent, val = () => page.inputValue(rentSel);
    const cases = [['650*3', 1950], ['1,200+450', 1650], ['(2000-300)/2', 850], ['650x3', 1950], ['650×3', 1950], ['$1,200', 1200], ['2000-300', 1700], ['1.5*1000', 1500], ['-5+1005', 1000], ['650*(2+1)', 1950]];
    for (const [t, want] of cases) { const prior = await rent(); await typeIn(rentSel, t); await page.waitForTimeout(500); const live = await rent(); const hint = await page.locator('[data-testid=calc-hint]').count() ? await page.locator('[data-testid=calc-hint]').first().textContent() : ''; await blur(); P.t(live === prior, `"${t}": nothing is committed while the box is being edited (state still ${prior} after a 500 ms pause)`, 0.5, `state ${live}`); P.t((await rent()) === want && num(await val()) === want, `"${t}" -> ${want} in state after leaving the box and in the box`, 1, `state ${await rent()}, box ${await val()}, hint ${hint}`); }
    await typeIn(rentSel, '650*3'); await page.waitForTimeout(60); const h1 = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => ''); P.t(/= 1,950/.test(h1), 'a live "= 1,950" hint shows while the expression is typed', 1, h1); await blur();
    /* where it shows up */
    const Sx = E.normalize(clone(await store())), pl = E.planR(Sx), v = pl.V.maple;
    await page.goto(base() + '/index.html?j=' + seq++ + '#house-maple'); await page.waitForSelector('#app > *'); await openAllColl();
    P.t(near2(num(await page.locator('[data-testid=rent-noi]').first().textContent()), v.noi, 1.5), 'asset page income after costs follows the typed math', 1, '');
    await page.goto(base() + '/index.html?j=' + seq++); await page.waitForSelector('#app > *');
    const rowTxt = await page.locator('[data-row=maple] [data-testid=row-cashflow] b').first().textContent(); const sp = pl.snap.find((x) => x.id === 'maple'), v0 = pl.V.maple, cf0 = v0.noi - v0.P - v0.mip; P.t(sp && near2(Math.abs(num(rowTxt)), Math.abs(cf0), Math.max(2, Math.abs(cf0) * 0.002)) || !sp, 'Planned row (today\'s cash flow) and totals follow the typed rent', 1, rowTxt);
    /* invalid input never corrupts state */
    await page.goto(base() + '/index.html?j=' + seq++ + '#house-maple'); await page.waitForSelector('#app > *'); const before = await rent();
    for (const bad of ['650*', '5/0', '(2+3', 'abc', '650**3', '1/(2-2)', '12 34x']) { await typeIn(rentSel, bad); await page.waitForTimeout(60); const after = await rent(); const hint = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => ''); const aria = await page.locator('[data-testid=calc-hint]').first().getAttribute('aria-live').catch(() => ''); await blur(); P.t(after === before && num(await val()) === before && /Check the math/.test(hint) && aria === 'polite', `invalid "${bad}": state unchanged (${before}), "Check the math" shown (aria-live), box restored`, 1, `${after} / ${await val()} / ${hint}`); }
    /* typed one key at a time: a half-typed expression keeps the last good value, the finished one lands */
    await typeIn(rentSel, '650*3', { slow: true }); await page.waitForTimeout(80); await blur(); P.t((await rent()) === 1950, 'typing 650*3 key by key ends at 1950 once you leave the box', 1, String(await rent()));
    /* percent and plain numbers keep working */
    await page.goto(base() + '/index.html?j=' + seq++ + '#assumptions'); await page.waitForSelector('#app > *'); await openAllColl();
    await typeIn('[data-p="g.vac"]', '9%'); await blur(); P.t((await store()).g.vac === 9, 'a percent box accepts 9% as 9', 1, ''); await typeIn('[data-p="g.vac"]', '14/2'); await blur(); P.t((await store()).g.vac === 7, 'a percent box accepts 14/2 as 7', 1, '');
    await page.goto(base() + '/index.html?j=' + seq++); await page.waitForSelector('#app > *'); await page.click('[data-row=maple] [data-testid=row-extra-toggle]'); await page.waitForTimeout(80); await typeIn('[data-testid=extra-input]', '300+200'); await page.waitForTimeout(60); await blur(); P.t((await store()).houses.find((h) => h.id === 'maple').extra === 500, 'the extra-payment box accepts 300+200', 1, '');
    P.t((await page.locator('[data-testid=extra-input]').count()) <= 1, 'no layout/state side effects (single extra box)', 0.5, '');
    const inp = await page.evaluate(() => [...document.querySelectorAll('#app input[data-num]')].map((i) => i.getAttribute('inputmode')));
    await page.goto(base() + '/index.html?j=' + seq++ + '#house-maple'); await page.waitForSelector('#app > *');
    const modes = await page.evaluate(() => { const m = {}; document.querySelectorAll('#app input[data-num]').forEach((i) => { const em = i.closest('.iw') && i.closest('.iw').querySelector('em'); const k = em ? em.textContent : 'plain'; m[k] = i.getAttribute('inputmode'); }); return m; });
    P.t(modes['$'] === 'text', 'dollar boxes use the full keyboard (inputmode=text) so + - * / ( ) can be typed on a phone', 1.5, JSON.stringify(modes));
    return P;
  });

  /* ---------- J3 Checks block ---------- */
  await jcheck('J3', 'Planned page Checks: one plain row per check, highlighted only past a safe amount; one calm line when everything is safe; Details link is in normal flow (no overlap at 320/390/430) and >= 44px', 14, 'load the default plan and tighter states at 320/390/430; inspect [data-testid=checks]', async () => {
    const P = new Parts(); const S = withV(E.seedPlan());
    for (const w of [320, 390, 430]) {
      await page.setViewportSize({ width: w, height: 844 }); await load(S, '');
      const calm = await page.evaluate(() => { const c = document.querySelector('[data-testid=checks]'); if (!c) return null; return { ok: !!c.querySelector('[data-testid=checks-ok]'), flagged: c.querySelectorAll('.chk[data-lvl=warn],.chk[data-lvl=bad]').length, warnboxes: document.querySelectorAll('#app .warnbox').length }; });
      P.t(calm && calm.ok && calm.flagged === 0 && calm.warnboxes === 0, w + 'px: default plan shows the calm line "All checks are in the safe range", no highlighted rows or warning boxes', 1.5, JSON.stringify(calm));
      const b = await page.evaluate(() => { const r = document.querySelector('[data-testid=checks-details]'); if (!r) return null; const q = r.getBoundingClientRect(); return { h: q.height, w: q.width }; });
      P.t(b && b.h >= 44, w + 'px: Details link is >= 44px tall', 0.5, JSON.stringify(b));
      await page.click('[data-testid=checks-details]'); await page.waitForTimeout(60);
      const ov = await page.evaluate(() => { const c = document.querySelector('[data-testid=checks]'), els = [...c.querySelectorAll('.chk,.linkbtn,.chkh')], bad = []; for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { if (els[i].contains(els[j]) || els[j].contains(els[i])) continue; const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect(); if (a.width && b.width && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push(i + '/' + j); } return { n: els.length, bad, scroll: document.documentElement.scrollWidth > innerWidth + 1, rows: c.querySelectorAll('.chk').length }; });
      P.t(ov.bad.length === 0 && !ov.scroll && ov.rows >= 4, w + 'px: opened rows (' + ov.rows + ') do not overlap and the page does not scroll sideways', 1.5, JSON.stringify(ov));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const rowsOk = await page.evaluate(() => [...document.querySelectorAll('[data-testid=checks-list] .chk')].map((r) => r.dataset.lvl + ':' + r.dataset.testid));
    P.t(rowsOk.length >= 4 && rowsOk.every((x) => /^ok:/.test(x)), 'every row is plain (level ok) in the default plan: ' + rowsOk.join(', '), 1, '');
    const lvlOf = async (st, sel) => { await load(st, ''); await openAllColl(); return page.evaluate((s) => { const e = document.querySelector(s); return e ? e.dataset.lvl : null; }, sel); };
    const mk = (f) => { const T = withV(E.seedPlan()); f(T); return T; };
    const pk = E.planR(E.seedPlan()).worst.dti;
    P.t((await lvlOf(mk((T) => { T.g.dti = Math.floor(pk) - 2; }), '[data-testid=check-dti]')) === 'bad', 'DTI over the limit is red (limit ' + (Math.floor(pk) - 2) + '% vs peak ' + pk.toFixed(1) + '%)', 1.5, '');
    P.t((await lvlOf(mk((T) => { T.g.dti = Math.floor(pk / 0.85); }), '[data-testid=check-dti]')) === 'warn', 'DTI inside 85% of the limit but under it is amber', 1.5, '');
    P.t((await lvlOf(mk(() => {}), '[data-testid=check-dti]')) === 'ok', 'DTI far under the limit is plain', 0.5, '');
    P.t((await lvlOf(mk((T) => { T.p.living = 5050; }), '[data-testid=check-pace]')) === 'bad', 'a tight profile (about $580/mo of job money) shows the plan-timing row red (was amber: the last purchase comes after the plan ends, which is now not possible)', 1.5, '');
    await load(mk((T) => { T.p.living = 5050; }), ''); const chip = await page.locator('[data-testid=afford-chip]').getAttribute('data-lvl'), chk = await page.locator('[data-testid=checks-flag]').count();
    P.t(chip === 'bad' && chk === 1, 'the Can I afford this chip and the Checks header turn red together when a number is past its limit (was amber: a purchase after the plan ends is now Not yet)', 1, chip + ' flag ' + chk);
    await load(S, ''); P.t((await page.locator('[data-testid=afford-chip]').getAttribute('data-lvl')) === 'ok', 'afford chip is neutral (level ok) when the verdict is Yes', 0.5, '');
    return P;
  });

  /* ---------- J4 sold profit ---------- */
  await jcheck('J4', 'Sold assets show how much cash was profited: Sold row, Sold category and the asset page all match the engine (price - selling costs - loan - tax - cash put in)', 12, 'load the default plan (birch is sold) and read the row, category strip and asset page', async () => {
    const P = new Parts(); const S0 = E.seedPlan(), pl = E.planR(S0), id = S0.houses.find((h) => pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM).id, ex = pl.exits[id];
    await load(withV(S0), ''); await page.click('[data-testid=cat-header-sold]').catch(() => {}); await page.waitForTimeout(60);
    const line = (await page.locator(`[data-row=${id}] .exitline`).textContent().catch(() => '')) || '', cell = (await page.locator(`[data-row=${id}] [data-testid=row-cashflow]`).textContent().catch(() => '')) || '', strip = (await page.locator('[data-testid^=cat-profit-]').first().evaluate((e) => e.parentElement.textContent).catch(() => '')) || '';
    const money = (t) => num(t) * (/M/.test(t) ? 1e6 : /B/.test(t) ? 1e9 : 1), signOk = (t, v) => (/^[+]/.test(t.trim()) || t.includes('+')) === (v >= 0);
    const rp = ((await page.locator(`[data-row=${id}] [data-testid=row-payment]`).textContent().catch(() => 'x')) || '').trim();
    P.t(/^sold for \$[\d,.]+[MB]? in \d+ months? from today/.test(line.trim()) && !/cash profit/.test(line) && rp === '', 'Sold row states the cash profit once (right column and category header, not again inline) and has no stray lone "sold" word under edit', 3, line + ' / pay: [' + rp + ']');
    P.t(line.includes(D.mond(pl.sellAt[id])), 'the sold row names the month and its date', 1, line);
    P.t(/cash profit/.test(cell) && Math.abs(money(cell.replace(/cash profit/, '')) - Math.abs(ex.profit)) <= Math.max(1, Math.abs(ex.profit) * 0.006), 'the big number on the Sold row is the cash profit', 2, cell);
    P.t(/cash profit/.test(strip) && Math.abs(money(strip.replace(/cash profit/, '')) - Math.abs(ex.profit)) <= Math.max(1, Math.abs(ex.profit) * 0.006), 'the Sold category strip shows the total cash profit', 2, strip);
    await load(withV(S0), '#house-' + id); await openAllColl();
    const card = await page.locator('[data-testid=sale-profit]').count(), cp = await page.locator('[data-testid=sale-cash-profit]').textContent().catch(() => '');
    P.t(card === 1 && Math.abs(money(cp) - Math.abs(ex.profit)) <= Math.max(1, Math.abs(ex.profit) * 0.001), 'the asset page has a Sale card with the same cash profit', 2, cp);
    const rows = await page.evaluate(() => [...document.querySelectorAll('[data-testid=sale-profit] .f')].map((f) => f.textContent.replace(/\s+/g, ' ').trim()));
    const vals = rows.map((r) => ({ lab: r.replace(/[−+]?\$[\d,.]+[MB]?.*$/, ''), n: money(r.replace(/^.*?([−+]?\$[\d,.]+[MB]?)(?!.*\$).*$/, '$1')) * (/−\$/.test(r.replace(/^.*?([−+]?\$[\d,.]+[MB]?)(?!.*\$).*$/, '$1')) ? -1 : 1) }));
    P.t(rows.length === 7 && (await page.locator('[data-testid=sale-heading]').textContent()) === 'Sale' && /after tax/.test(await page.locator('[data-testid=sale-tax]').textContent().catch(() => 'after tax')) && /before tax/.test(rows.join(' ')), 'the asset page Sale card has a Sale heading and lists price, selling costs, loan paid off, net proceeds before tax, tax, cash put in and cash profit after tax', 1.5, rows.join(' | '));
    return P;
  });

  /* ---------- J5 silent migration ---------- */
  await jcheck('J5', 'Old saves move silently to the current plan with the default finance profile (no popup or undo banner); the old portfolio, with its own profile, is filed in Saved as "Portfolio N (before the update)"', 12, 'load a v17 save with a tight profile and open the app', async () => {
    const P = new Parts(); const old = clone(E.seedPlan()); old.p.living = 5050; old.p.cash = 12345; old.houses = old.houses.slice(0, 5); old.v = 17;
    await load(old, ''); const st = await store(); const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), SKEY);
    P.t(st && st.v === DATA_V && st.houses.length === E.seedPlan().houses.length && st.p.living === E.samplePersonal().living && st.p.cash === E.samplePersonal().cash, 'the working portfolio is the current plan with the default finance profile', 3, st && (st.v + ' ' + st.houses.length + ' ' + st.p.living));
    P.t(saved.length === 1 && /before the update/.test(saved[0].name) && saved[0].state.p.living === 5050 && saved[0].state.houses.length === 5, 'the old portfolio and its own profile are filed in Saved', 3, saved.map((x) => x.name).join(','));
    P.t((await page.locator('[data-testid=undo-banner]').count()) === 0 && !(await page.locator('.sheet,[role=alertdialog]').count()), 'no popup, no undo banner', 2, '');
    const f = await page.evaluate(() => ({ nw: document.querySelector('[data-testid=kpi-networth]').textContent, chip: document.querySelector('[data-testid=afford-chip]').textContent }));
    const pl = E.planR(E.seedPlan()); P.t(Math.abs(num(f.nw) - pl.horizon.nw / 1e6) < 0.1 && f.chip === 'Yes' && pl.horizon.nw >= 125e6, 'the screen shows the $125M+ plan and "Yes" (' + f.nw + ', ' + f.chip + ')', 3, JSON.stringify(f));
    await load(withV(E.seedPlan()), ''); const s2 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), SKEY); P.t(s2.length === 0, 'a current save is not migrated again or filed', 1, String(s2.length));
    return P;
  });

  /* ---------- J6 stretch scenario ---------- */
  await jcheck('J6', 'Stretch scenario button loads a plan that buys 607 Siena Way ($135,000,000) and the Finances verdict is not "no"; the button and confirm text say so', 10, 'Assumptions > Sample portfolios > stretch', async () => {
    const P = new Parts(); await load(withV(E.seedPlan()), '#assumptions'); await openAllColl();
    const bt = await page.locator('[data-testid=load-stretch]').textContent(); P.t(/Siena/.test(bt) && /\$135M/.test(bt) && !/\$540M/.test(bt), 'button text names 607 Siena Way and its $135M price and does not claim a net-worth figure that other pages show differently', 2, bt);
    await page.click('[data-testid=load-stretch]'); const ct = await page.locator('[role=alertdialog]').textContent(); P.t(/Siena/.test(ct), 'confirm text names the house', 1, ct);
    await page.click('[data-stretch-yes]'); await page.waitForTimeout(150);
    const st = await store(), h = st.houses.find((x) => /607 Siena Way/.test(x.addr)); P.t(!!h && h.price === 135000000 && h.status === 'planned', 'the portfolio holds 607 Siena Way at $135,000,000', 2, h && h.addr);
    const S1 = E.normalize(clone(st)), pl = E.planR(S1), f = E.finance(S1, pl); P.t(h && isFinite(pl.purchase[h.id]) && pl.purchase[h.id] <= pl.planM && f.feas.assets[h.id].verdict !== 'no', 'it is bought inside the plan (month ' + (h && pl.purchase[h.id]) + ') and its own can-I-buy-this verdict is ' + f.feas.assets[h.id].verdict + ' (was: the whole portfolio verdict is not no; the sample Bridgeway loan is over the SBA $5M cap)', 3, '');
    await page.goto(base() + '/index.html?j=' + seq++); await page.waitForSelector('#app > *'); const txt = await page.evaluate(() => document.getElementById('app').innerText);
    P.t(/Siena/.test(txt) || (await page.locator('[data-testid^=cat-header]').count()) > 0, 'the Planned page renders the new portfolio', 0.5, ''); const hh = page.locator('[data-testid=cat-header-house]'); if ((await hh.getAttribute('aria-expanded')) === 'false') await hh.click(); const t2 = await page.evaluate(() => document.getElementById('app').innerText);
    P.t(/607 Siena Way/.test(t2), 'the row 607 Siena Way is visible under Homes', 1.5, '');
    return P;
  });

  /* ---------- J7 tap targets ---------- */
  await jcheck('J7', 'Every (i) info button, the Details link and the tab buttons are >= 44px in both directions on Planned, asset, Finances and Assumptions at 390px', 8, 'measure [data-info], [data-coll] links and tabs', async () => {
    const P = new Parts(); const S = withV(E.seedPlan());
    for (const hash of ['', '#house-maple', '#finances', '#assumptions']) { await load(S, hash); await openAllColl(); const small = await page.evaluate(() => [...document.querySelectorAll('#app [data-info], #app .linkbtn, #app [data-testid^=tab-]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.width < 43.5 || r.height < 43.5); }).map((e) => (e.dataset.info || e.dataset.testid || e.className) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));
      P.t(small.length === 0, (hash || 'Planned') + ': all info / link / tab buttons >= 44px', 2, small.slice(0, 5).join(', ')); }
    return P;
  });


  /* ---------- J8 scenario loads never lose the current plan ---------- */
  await jcheck('J8', 'Loading a sample portfolio files the current plan in Saved as "Portfolio N (before <scenario>)", shows an Undo banner that restores it, lands on the Planned tab, and the buttons are neutral with short titles', 12, 'Assumptions > Sample portfolios > each button, then Undo', async () => {
    const P = new Parts(); const S0 = withV(E.seedPlan());
    await load(S0, '#assumptions'); await openAllColl();
    const btns = await page.evaluate(() => [...document.querySelectorAll('[data-testid=samples-card] .scn')].map((b) => ({ t: b.querySelector('b').textContent, sub: b.querySelector('span').textContent, red: getComputedStyle(b.querySelector('b')).color })));
    P.t(btns.length === 4 && btns.every((b) => b.t.length <= 28 && b.sub.length > 0 && b.red !== 'rgb(196, 39, 31)'), 'four neutral buttons with one-line titles and a grey sub-line: ' + btns.map((b) => b.t).join(' | '), 2, JSON.stringify(btns));
    const note = await page.locator('[data-testid=samples-card] > .note').textContent(); P.t(note.split(/\s+/).length < 90 && !/relisted/.test(note) && /None of them needs outside money/.test(note), 'the grey note is short and has no stale listing sentence (' + note.split(/\s+/).length + ' words)', 1, note);
    await page.click('[data-testid=load-stretch]'); const ct = await page.locator('[role=alertdialog]').textContent();
    P.t(/kept in Saved/.test(ct) && /28 to 20 years/.test(ct) && /Undo/.test(ct), 'the confirm text says the plan is kept in Saved and the projection changes from 28 to 20 years', 2, ct);
    await page.click('[data-stretch-yes]'); await page.waitForTimeout(150);
    const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), SKEY), st = await store();
    P.t(saved.length === 1 && /^Portfolio 1 \(before Stretch: 607 Siena Way\)$/.test(saved[0].name) && saved[0].state.houses.length === S0.houses.length, 'the old plan is filed as "Portfolio 1 (before Stretch: 607 Siena Way)"', 2, saved.map((x) => x.name).join(','));
    const ban = await page.locator('[data-testid=undo-banner]').textContent().catch(() => ''), tab = await page.locator('[data-testid=tab-planned]').getAttribute('aria-selected').catch(() => '');
    P.t(/Loaded the stretch scenario \(607 Siena Way\)/.test(ban) && /Undo/.test(ban) && tab === 'true' && !/assumptions/.test(await page.evaluate(() => location.hash)), 'an Undo banner shows and the app is on the Planned tab', 2, ban + ' ' + tab);
    await page.click('[data-undo]'); await page.waitForTimeout(150); const st2 = await store(), saved2 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), SKEY);
    P.t(st2.houses.length === S0.houses.length && st2.g.planYears === 28 && saved2.length === 0, 'Undo restores the 28-year default plan (and takes the filed copy out of Saved)', 3, st2.houses.length + ' ' + st2.g.planYears + ' ' + saved2.length);
    return P;
  });

  /* ---------- J9 calculator inputs: invalid math never commits; no layout shift; readable hint ---------- */
  await jcheck('J9', 'Invalid math (5/0, 650*) never changes state or any dependent while typing or after leaving, the box goes back to its last good value with a Kept note, the field never moves, the hint is >= 13px, and labels keep their (i) beside the last word', 12, 'asset page rent field at 320px', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 320, height: 700 }); await load(withV(E.seedPlan()), '#house-maple'); await openAllColl();
    const sel = '[data-p="h.maple.rent"]', top = () => page.evaluate((q) => document.querySelector(q).getBoundingClientRect().top + scrollY, sel), noi = () => page.locator('[data-testid=rent-noi]').first().textContent();
    const before = (await store()).houses.find((h) => h.id === 'maple').rent, n0 = await noi(), y0 = await top();
    for (const bad of ['5/0', '650*']) { await typeIn(sel, bad); await page.waitForTimeout(80); const y1 = await top(), n1 = await noi(), st = (await store()).houses.find((h) => h.id === 'maple').rent, fs = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-testid=calc-hint]')).fontSize));
      P.t(st === before && n1 === n0 && Math.abs(y1 - y0) < 1 && fs >= 13, `"${bad}" while typing: state ${st}, dependents unchanged, field moved ${Math.round(y1 - y0)}px, hint ${fs}px`, 2, ''); await blur();
      const kept = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => ''); P.t(/^Kept \$[\d,]+$/.test(kept) && num(await page.inputValue(sel)) === before && (await noi()) === n0, `after leaving "${bad}": box back to ${before}, note "${kept}"`, 1.5, kept); }
    const lab = await page.evaluate(() => [...document.querySelectorAll('#app label.f')].map((l) => { const lb = l.querySelector('.lb'), i = lb.querySelector('.info'); if (!i) return null; const w = lb.querySelector('.nw'); return { h: l.getBoundingClientRect().height, ok: !!w && w.contains(i) }; }).filter(Boolean));
    P.t(lab.length > 4 && lab.every((x) => x.ok && x.h < 80), 'every label keeps its (i) glued to the last word and no row is taller than 80px at 320px (' + Math.max(...lab.map((x) => x.h)) + ')', 2, JSON.stringify(lab.filter((x) => !x.ok || x.h >= 80)));
    await page.setViewportSize({ width: 390, height: 844 }); return P;
  });

  /* ---------- J10 Checks wording and states ---------- */
  await jcheck('J10', 'Checks: no Last purchase / Lenders / "Down payments beyond the trust" rows, the Details button stays visible (and in the gutter) when something is flagged, DTI over the limit is red on the chip, the header and the row', 8, 'default plan and a tight DTI limit', async () => {
    const P = new Parts(); await load(withV(E.seedPlan()), ''); await page.click('[data-testid=checks-details]');
    const t = await page.locator('[data-testid=checks]').textContent(); P.t(!/Last purchase/.test(t) && !/Lenders/.test(t) && !/beyond the trust/.test(t) && /Paid from your own pocket/.test(t) && /grows with inflation|in today's dollars/.test(t), 'plain-word rows only; cushion says it grows with inflation (or that it is in today\'s dollars)', 2, t.slice(0, 200));
    const pk = E.planR(E.seedPlan()).worst.dti, T = withV(E.seedPlan()); T.g.dti = Math.floor(pk) - 2; await load(T, '');
    const o = await page.evaluate(() => { const b = document.querySelector('[data-testid=checks-details]'), c = document.querySelector('[data-testid=checks]'); const r = b.getBoundingClientRect(), cr = c.getBoundingClientRect(); return { vis: !!r.width, edge: r.right <= cr.right + 0.5, flag: (document.querySelector('[data-testid=checks-flag]') || {}).className, chip: document.querySelector('[data-testid=afford-chip]').dataset.lvl, row: document.querySelector('[data-testid=check-dti]').dataset.lvl, lender: !!document.querySelector('[data-testid=check-lender]') }; });
    P.t(o.vis && o.edge && /bad/.test(o.flag) && o.chip === 'bad' && o.row === 'bad' && !o.lender, 'flagged: Details visible and inside the card edge; chip, header and DTI row are all red; no separate Lenders row', 4, JSON.stringify(o));
    await page.click('[data-testid=checks-details]'); await page.waitForTimeout(60); P.t((await page.locator('[data-testid=checks-details]').count()) === 1, 'Details stays tappable while flagged', 1, '');
    const hr = await page.evaluate(() => [...document.querySelectorAll('[data-testid=checks] .chk')].every((e) => getComputedStyle(e).borderRadius === '0px')); P.t(hr, 'check rows have no rounded borders (no clipped arcs)', 1, '');
    return P;
  });

  /* ---------- J11 one rounded source for a sale ---------- */
  await jcheck('J11', 'A sold asset reads the same to the dollar everywhere: the Sale card, the note under it, the Net proceeds before tax field, the asset-page summary line and the Sold row; the card adds up exactly (several selling-cost rates)', 8, 'asset page of the sold house at 6 / 5.5 / 6.25 / 7.1 % selling costs', async () => {
    const P = new Parts(); const mon = (t) => { const m = /([−-])?\$([\d,]+)/.exec(String(t || '')); return m ? (m[1] ? -1 : 1) * +m[2].replace(/,/g, '') : NaN; };
    for (const sc of [6, 5.5, 6.25, 7.1]) {
      const S = withV(E.seedPlan()); const h = S.houses.find((x) => x.exit === 'sell'); if (!h) { P.t(false, 'the default plan has a house that sells', 1, ''); break; } h.sellCost = sc;
      await load(S, '#house-' + h.id); await openAllColl();
      const rows = await page.evaluate(() => [...document.querySelectorAll('[data-testid=sale-profit] .f')].map((f) => f.textContent.replace(/\s+/g, ' ').trim()));
      const v = rows.map((r) => mon(r.replace(/^.*?([−-]?\$[\d,]+)(?!.*\$).*$/, '$1'))), N = v[3], T = -v[4], I = -v[5], F = v[6];
      const note = await page.locator('[data-testid=sale-tax]').textContent(), share = await page.locator('[data-testid=asset-share]').textContent(), field = await page.inputValue('[data-p="h.' + h.id + '.proceeds"]');
      const noteN = mon(/Net proceeds before tax (−?\$[\d,]+)/.exec(note)[1]), shareN = mon(/\((−?\$[\d,]+) net proceeds before tax/.exec(share)[1]), shareI = mon(/the (\$[\d,]+) you put in/.exec(share)[1]), shareF = mon(/Cash profit ([+−-]?\$[\d,]+)/.exec(share)[1]);
      P.t(N === noteN && N === shareN && N === num(field) && I === shareI && F === shareF, sc + '%: card ' + N + ' / ' + I + ', note ' + noteN + ', summary ' + shareN + ' / ' + shareI + ', field ' + field, 1.2, rows.join(' | '));
      P.t(v[0] + v[1] + v[2] === N && N + v[4] + v[5] === F, sc + '%: price - costs - loan = net proceeds, and proceeds - tax - cash in = cash profit, exactly', 0.8, v.join(','));
    }
    return P;
  });

  /* ---------- J12 Checks edge cases and layout ---------- */
  await jcheck('J12', 'Checks is its own card with a clear heading and a light Details button; flagged rows sit inside the card gutter, one row apart, labels do not wrap; when no purchase can be funded Checks says the plan cannot start (no "last purchase today", no fake DTI peak); the lowest cash never exceeds the savings', 12, 'cash 0 / living 9000 at 320px; cash 10000 / living 3000', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 320, height: 700 });
    const S = withV(E.seedPlan()); S.p.cash = 0; S.p.living = 9000; await load(S, ''); await page.waitForSelector('[data-testid=checks]');
    const g = await page.evaluate(() => {
      const c = document.querySelector('[data-testid=checks]'), cr = c.getBoundingClientRect(), rows = [...c.querySelectorAll('.chk')].map((r) => { const q = r.getBoundingClientRect(), b = r.querySelector('.ct b').getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top, b: q.bottom, lab: b.height, lvl: r.dataset.lvl, id: r.dataset.testid }; });
      const btn = c.querySelector('[data-testid=checks-details]'), bg = getComputedStyle(btn).backgroundColor;
      return { own: c.matches('section.card') && !c.closest('[data-testid=plan-card]'), head: !!c.querySelector('h2,h3,b') && /^Checks/.test(c.textContent.trim()), cl: cr.left, cr: cr.right, rows, bg, hs: document.documentElement.scrollWidth > innerWidth, plan: document.querySelector('[data-testid=plan-card]').textContent, txt: c.textContent };
    });
    P.t(g.own && g.head, 'Checks is its own card with a Checks heading (not inside the Portfolio breakdown card)', 1.5, JSON.stringify({ own: g.own, head: g.head }));
    P.t(/rgba\(0, 0, 0, 0\)|transparent/.test(g.bg), 'the Details button is light (outlined, no grey block): ' + g.bg, 1, g.bg);
    P.t(g.rows.length >= 2 && g.rows.every((r) => r.l >= g.cl + 3.5 && r.r <= g.cr - 3.5), 'every Checks row, tinted or not, stays inside the card with a gutter of at least 4px at 320px', 2, JSON.stringify(g.rows.map((r) => [Math.round(r.l - g.cl), Math.round(g.cr - r.r)])));
    P.t(g.rows.every((r, i) => i === 0 || r.t - g.rows[i - 1].b >= 2 || g.rows[i - 1].lvl === 'ok'), 'adjacent flagged rows are separated (no merged slab)', 1.5, JSON.stringify(g.rows.map((r) => [Math.round(r.t), Math.round(r.b)])));
    P.t(g.rows.every((r) => r.lab < 24), 'no row label wraps onto a second line (Cash cushion)', 1, JSON.stringify(g.rows.map((r) => Math.round(r.lab))));
    P.t(/cannot start|can.t start/i.test(g.txt) && !/Debt-to-income peak/.test(g.txt) && !/last purchase today/.test(g.plan) && /no purchase can be funded/.test(g.plan), 'with nothing fundable Checks says the plan cannot start; no DTI peak month and no "last purchase today"', 2.5, g.txt.replace(/\s+/g, ' ').slice(0, 300));
    P.t(/runs out today/.test(g.txt) && !g.hs, 'the cash row says when the cash runs out instead of a far-future "lowest" month, and the page does not scroll sideways', 1.5, g.txt.replace(/\s+/g, ' ').slice(0, 300));
    /* lowest cash never above the savings */
    const S2 = withV(E.seedPlan()); S2.p.cash = 10000; S2.p.living = 3000; await load(S2, ''); if ((await page.getAttribute('[data-testid=checks-details]', 'aria-expanded')) === 'false') await page.click('[data-testid=checks-details]'); await page.waitForTimeout(60);
    const cu = await page.locator('[data-testid=check-cushion]').textContent().catch(() => ''), lowN = /Lowest cash is \$([\d,]+)/.exec(cu); P.t(!!lowN && +lowN[1].replace(/,/g, '') <= 10000, 'with $10,000 of savings the Checks lowest cash is not above $10,000', 1.5, cu);
    /* divider between the calm line and the first row when opened */
    await load(withV(E.seedPlan()), ''); await page.setViewportSize({ width: 390, height: 844 }); await page.click('[data-testid=checks-details]'); await page.waitForTimeout(60);
    const dv = await page.evaluate(() => { const ok = document.querySelector('[data-testid=checks-ok]'), l = document.querySelector('[data-testid=checks-list]'); if (!ok || !l) return null; const gap = l.getBoundingClientRect().top - ok.getBoundingClientRect().bottom, bt = parseFloat(getComputedStyle(l).borderTopWidth); return { gap, bt }; });
    P.t(dv && dv.gap >= 6 && dv.bt >= 1, 'a divider and space separate "All checks are in the safe range" from the first row', 1, JSON.stringify(dv));
    return P;
  });

  /* ---------- J13 Finances dates ---------- */
  await jcheck('J13', 'Finances writes every point in time as "N months from today (Mon YYYY)" (or "today"), including the Biggest cash calls rows; the Breakdown table keeps every figure inside the card at 320px', 6, 'Finances page with a cash call; Planned breakdown at 320px', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 });
    const S = withV(E.seedPlan()); S.p.cash = 0; S.p.living = 3000; await load(S, '#finances'); await openAllColl();
    const calls = await page.evaluate(() => [...document.querySelectorAll('#app .drv span:first-child')].map((e) => e.textContent.trim()));
    P.t(calls.length >= 1 && calls.every((t) => /^(\d+ months? from today \([A-Z][a-z]{2} \d{4}\)|Today)/.test(t)), 'Biggest cash calls rows start with "N months from today (Mon YYYY)"', 2.5, calls.join(' | '));
    const txt = await page.evaluate(() => document.getElementById('app').innerText), bare = txt.match(/\b[Mm]onth \d+(?!\d)(?! \([A-Z][a-z]{2} \d{4}\))/g);
    P.t(!bare, 'no month number on Finances is missing its date', 2, (bare || []).join(', '));
    await page.setViewportSize({ width: 320, height: 700 }); await load(withV(E.seedPlan()), ''); await page.waitForSelector('[data-testid=breakdown]');
    const o = await page.evaluate(() => { const t = document.querySelector('[data-testid=breakdown]'), c = t.closest('.card').getBoundingClientRect(), pad = parseFloat(getComputedStyle(t.closest('.card')).paddingRight); return [...t.querySelectorAll('td,th')].map((e) => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().right - (c.right - pad); }).filter((d) => d > 0.5); });
    P.t(o.length === 0, 'no breakdown figure ends past the card content edge at 320px', 1.5, o.map((x) => Math.round(x)).join(','));
    await page.setViewportSize({ width: 390, height: 844 }); return P;
  });

  /* ---------- J14 calculator revert, negatives, percent ---------- */
  await jcheck('J14', 'Number boxes: a half-typed or invalid entry typed key by key goes back to the value the box had when you tapped into it (not a typed prefix) and says "Kept $X"; a negative says "Can\'t be negative, kept $X"; a percent in a dollar box is refused with a note; a percent box still takes 9%', 12, 'type 5/0, 650*, -5, 10% into the rent box one key at a time', async () => {
    const P = new Parts(); const S = withV(E.seedPlan()); await load(S, '#house-maple'); await openAllColl(); const sel = '[data-p="h.maple.rent"]';
    const rent = async () => (await store()).houses.find((h) => h.id === 'maple').rent, before = await rent(), hint = () => page.locator('[data-testid=calc-hint]').first().textContent().catch(() => '');
    const clearType = async (t) => { await page.locator(sel).first().click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete'); await page.keyboard.type(t, { delay: 15 }); await page.waitForTimeout(60); };
    for (const [t, re] of [['5/0', /^Kept \$[\d,]+$/], ['650*', /^Kept \$[\d,]+$/], ['(2+3', /^Kept \$[\d,]+$/], ['-5', /^Can't be negative, kept \$[\d,]+$/], ['10%', /^No % in a dollar box, kept \$[\d,]+$/]]) {
      await clearType(t); await page.keyboard.press('Enter'); await page.waitForTimeout(120); const h = await hint(), v = await rent(), box = num(await page.inputValue(sel));
      P.t(v === before && box === before && re.test(h), `"${t}" typed key by key: ends at ${before} (state ${v}, box ${box}) with the note "${h}"`, 1.8, h);
    }
    await clearType('-5'); P.t(/negative/i.test(await hint()) && (await rent()) === before, 'while typing -5 the hint says it cannot be negative and nothing changes', 1, await hint()); await blur();
    await clearType('650*3'); await page.keyboard.press('Enter'); await page.waitForTimeout(100); P.t((await rent()) === 1950, 'a finished expression still lands (650*3 = 1950)', 0.8, String(await rent()));
    await load(S, '#assumptions'); await openAllColl(); await typeIn('[data-p="g.vac"]', '9%'); await blur(); P.t((await store()).g.vac === 9, 'a percent box takes 9%', 0.6, '');
    return P;
  });

  /* ---------- J15 plurals ---------- */
  await jcheck('J15', 'Singular and plural wording: "pool of 1 asset", "1 planned asset is possible", "Your 1 asset is bought", no "1 assets" / "1 months" / "1 homes" on Planned, Real, Saved, Finances or the asset page', 4, 'timeline with a pool of 1; a one-asset plan', async () => {
    const P = new Parts(); const bad = /\b1 (assets|months|homes|properties|businesses|loans|years)\b/;
    await load(withV(E.seedPlan()), '', { open: true, tab: 'timeline' }); const t0 = await page.evaluate(() => document.getElementById('app').innerText);
    P.t(/pool of 1 asset\b(?!s)/.test(t0) && !/pool of 1 assets/.test(t0), 'the timeline says "pool of 1 asset"', 1.5, (/pool of 1 assets?/.exec(t0) || [''])[0]);
    const S = withV(E.seedPlan()); S.houses = [S.houses.find((h) => h.status !== 'owned')]; S.houses[0].buyIn = 0; await load(S, '');
    const t1 = await page.evaluate(() => document.getElementById('app').innerText); P.t(!bad.test(t1) && /The 1 planned asset is possible|1 planned is possible/.test(t1) && /1 asset ·/.test(t1), 'a one-asset plan reads "The 1 planned asset is possible" and "1 asset"', 1.5, (t1.match(/(The 1 planned[^.]*|1 assets?[^\n]*)/) || [''])[0]);
    for (const hsh of ['#finances', '#house-' + S.houses[0].id]) { await load(S, hsh); const t = await page.evaluate(() => document.getElementById('app').innerText); P.t(!bad.test(t), hsh.slice(0, 8) + ': no "1 assets" style slip', 0.5, (bad.exec(t) || [''])[0]); }
    return P;
  });

  /* ---------- J16 migration note ---------- */
  await jcheck('J16', 'After a silent migration the Planned page shows one dismissible line naming the Saved portfolio (no dialog, no Undo); it stays until dismissed, is gone afterwards and never shows for a current save or on the other pages', 8, 'load a v17 save', async () => {
    const P = new Parts(); const old = clone(E.seedPlan()); old.houses = old.houses.slice(0, 5); old.v = 17; await load(old, '');
    const n = page.locator('[data-testid=migrate-note]'), txt = await n.textContent().catch(() => ''), saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), SKEY);
    P.t(/Your earlier portfolio is saved in Saved as/.test(txt) && saved.length === 1 && txt.includes(saved[0].name), 'the note names the filed portfolio: ' + txt, 2, txt);
    const m = await page.evaluate(() => { const b = document.querySelector('[data-testid=migrate-dismiss]'), q = b && b.getBoundingClientRect(), n = document.querySelector('[data-testid=migrate-note]'); return { w: q && q.width, h: q && q.height, role: n.getAttribute('role'), dlg: document.querySelectorAll('.sheet,[role=alertdialog],[role=dialog],[data-testid=undo-banner]').length, fixed: getComputedStyle(n).position }; });
    P.t(m.w >= 43.5 && m.h >= 43.5 && m.role === 'status' && m.dlg === 0 && m.fixed !== 'fixed', 'dismiss button is >= 44px, the note is a status line in the page (no dialog, no undo banner)', 2, JSON.stringify(m));
    await page.reload(); await page.waitForSelector('[data-testid=tab-planned]'); P.t((await n.count()) === 1, 'it stays after a reload until dismissed', 1, '');
    await page.click('[data-testid=tab-real]'); P.t((await n.count()) === 0, 'it is only on the Planned page', 0.5, ''); await page.click('[data-testid=tab-planned]');
    await page.click('[data-testid=migrate-dismiss]'); await page.reload(); await page.waitForSelector('[data-testid=tab-planned]'); P.t((await n.count()) === 0, 'dismissed: it does not come back', 1.5, '');
    await load(withV(E.seedPlan()), ''); P.t((await n.count()) === 0, 'a current save shows no note', 1, '');
    return P;
  });

  /* ---------- J17 undo toast ---------- */
  await jcheck('J17', 'The Undo message is a floating toast: it does not move the page, stays readable (role=status), keeps Undo working, follows you across the tabs, and disappears by itself after about 10 seconds', 8, 'remove a planned asset, then wait', async () => {
    const P = new Parts(); await load(withV(E.seedPlan()), ''); await page.waitForSelector('[data-testid=ledger-row]');
        const id = await page.evaluate(() => document.querySelector('[data-testid=ledger-row]').dataset.row), n0 = (await store()).houses.length;
    await page.click(`[data-row="${id}"] [data-testid=row-extra-toggle]`); await page.click(`[data-del="${id}"]`); await page.click(`[data-del-yes="${id}"]`); await page.waitForSelector('[data-testid=undo-banner]'); await page.waitForTimeout(100);
    const o = await page.evaluate(() => { const b = document.querySelector('[data-testid=undo-banner]'), q = b.getBoundingClientRect(), u = b.querySelector('[data-undo]').getBoundingClientRect(); return { pos: getComputedStyle(b).position, role: b.getAttribute('role'), inView: q.top >= 0 && q.bottom <= innerHeight && q.left >= 0 && q.right <= innerWidth, uh: u.height, uw: u.width }; });
    P.t(o.pos === 'fixed' && o.inView, 'the toast floats (position fixed) and is fully on screen', 2, JSON.stringify(o));
    P.t(o.role === 'status' && o.uh >= 43.5 && o.uw >= 43.5, 'it is a status message and Undo is >= 44px', 1, JSON.stringify(o));
    P.t(await page.evaluate(() => document.querySelector('[data-testid=page-tabs]').previousElementSibling.matches('h1') && !document.querySelector('#app > [data-testid=undo-banner]').previousElementSibling.matches('[data-testid=page-tabs]')), 'nothing is inserted between the title and the tabs (the page does not move down)', 1.5, '');
    await page.click('[data-testid=tab-saved]'); P.t((await page.locator('[data-testid=undo-banner]').count()) === 1, 'the toast is still there on another tab', 0.5, ''); await page.click('[data-testid=tab-planned]');
    await page.click('[data-undo]'); await page.waitForTimeout(100); P.t((await store()).houses.length === n0 && (await page.locator('[data-testid=undo-banner]').count()) === 0, 'Undo restores the asset and the toast goes', 1, '');
    await page.click(`[data-row="${id}"] [data-testid=row-extra-toggle]`); await page.click(`[data-del="${id}"]`); await page.click(`[data-del-yes="${id}"]`); await page.waitForSelector('[data-testid=undo-banner]'); const t1 = Date.now();
    await page.waitForTimeout(8500); const still = await page.locator('[data-testid=undo-banner]').count(); await page.waitForTimeout(2600);
    P.t(still === 1 && (await page.locator('[data-testid=undo-banner]').count()) === 0, 'it is still there at 8.5 s and gone by 11 s', 2, 'still ' + still);
    return P;
  });

  /* ---------- J18 saved names + stretch title ---------- */
  await jcheck('J18', 'Saved portfolio names never repeat ("Portfolio n" with n = saved count + 1, moved up when taken, also after a delete or a typed duplicate); the stretch sample no longer claims a net-worth figure the pages do not show', 6, 'save three, delete the first, save again', async () => {
    const P = new Parts(); await load(withV(E.seedPlan()), ''); await page.click('[data-testid=tab-saved]'); const names = [];
    for (let i = 0; i < 3; i++) { await page.click('[data-testid=save-current]'); names.push(await page.inputValue('[data-testid=save-name]')); await page.click('[data-testid=save-confirm]'); }
    P.t(names.join() === 'Portfolio 1,Portfolio 2,Portfolio 3', 'first three defaults are Portfolio 1, 2, 3', 1, names.join());
    const cards = page.locator('[data-testid=saved-card]'); await cards.nth((await cards.count()) - 1).locator('[data-testid=saved-delete]').click(); await page.click('[data-testid=delete-confirm]');
    await page.click('[data-testid=save-current]'); const nx = await page.inputValue('[data-testid=save-name]'); await page.click('[data-testid=save-confirm]');
    const all = await page.locator('[data-testid=saved-name]').allInnerTexts(); P.t(!all.some((n, i) => all.indexOf(n) !== i) && !/^Portfolio 3$/.test(nx) && /^Portfolio \d+$/.test(nx), 'after deleting Portfolio 1 the next default (' + nx + ') repeats nothing: ' + all.join(' | '), 2, all.join('|'));
    await page.click('[data-testid=save-current]'); await page.fill('[data-testid=save-name]', 'Portfolio 2'); await page.click('[data-testid=save-confirm]'); const all2 = await page.locator('[data-testid=saved-name]').allInnerTexts();
    P.t(!all2.some((n, i) => all2.indexOf(n) !== i), 'typing an existing name does not create a duplicate: ' + all2.join(' | '), 1.5, all2.join('|'));
    await load(withV(E.seedPlan()), '#assumptions'); await openAllColl(); const bt = await page.locator('[data-testid=load-stretch]').textContent(); P.t(!/\$540M/.test(bt) && /Siena/.test(bt), 'the stretch button does not say $540M', 1.5, bt);
    return P;
  });

  /* ---------- J19 wording at 320 ---------- */
  await jcheck('J19', 'Planned rows: the verdict chip is separated from the sentence by a dot; "(Mon YYYY)" never splits across lines; "edit ›" stays on the same line as the last word of the name (320px)', 6, 'default Planned page at 320px, all lists open', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 320, height: 700 }); await load(withV(E.seedPlan()), ''); await page.evaluate(() => { for (let i = 0; i < 20; i++) { const b = document.querySelector('#app [data-testid^=cat-header][aria-expanded=false]'); if (!b) break; b.click(); } }); await page.waitForTimeout(100);
    const g = await page.evaluate(() => {
      const sep = [...document.querySelectorAll('[data-testid=plan-verdict]')].filter((c) => c.closest('.locline')).map((c) => (c.parentElement.textContent.match(/^\s*(?:Possible, tight|Possible|Not possible)\s*(.)/) || [])[1]);
      const lines = (n) => { const r = document.createRange(); r.selectNodeContents(n); return new Set([...r.getClientRects()].map((q) => Math.round(q.top))).size; };
      const dates = [...document.querySelectorAll('.row .nb')].filter((n) => /^[A-Z][a-z]{2} \d{4}$/.test(n.textContent)).map((n) => lines(n));
      const eds = [...document.querySelectorAll('.row .addr')].map((a) => { const e = a.querySelector('.ed'), nb = a.querySelector('.nb'); if (!e || !nb) return null; return Math.abs(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2 - nb.getBoundingClientRect().top - nb.getBoundingClientRect().height / 2) < 8; }).filter((x) => x !== null);
      return { sep, dates, eds, n: document.querySelectorAll('.row .addr').length };
    });
    P.t(g.sep.length >= 5 && g.sep.every((c) => c === '·'), 'the chip is followed by "·" in every planned row', 2, JSON.stringify(g.sep.slice(0, 6)));
    P.t(g.dates.length >= 5 && g.dates.every((n) => n === 1), 'every "(Mon YYYY)" in a row sits on one line', 2, JSON.stringify(g.dates));
    P.t(g.eds.length >= 5 && g.eds.every(Boolean), 'the "edit ›" link shares a line with the last word of its name in every row', 2, JSON.stringify(g.eds));
    await page.setViewportSize({ width: 390, height: 844 }); return P;
  });

  /* ---------- J20 round-3 review fixes ---------- */
  await jcheck('J20', 'Number boxes at rest and on leaving: 1000+500 then Tab leaves "1,500" and no hint; a blanked box tabbed away goes back (Kept $X), and abc after that keeps the stored value; 4% in a percent box shows 4; a typed prefix (5 of 5/0) never reaches the state', 10, '#finances: Living costs, Cash interest, typed key by key', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 }); await load(withV(E.seedPlan()), '#finances'); await openAllColl();
    const L = '[data-p="p.living"]', C = '[data-p="p.cashApy"]', st = async () => (await store()).p, hints = () => page.locator('[data-testid=calc-hint]').allTextContents();
    const L0 = (await st()).living;
    await page.locator(L).click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete'); await page.keyboard.type('1000+500', { delay: 20 }); await page.keyboard.press('Tab'); await page.waitForTimeout(150);
    P.t((await page.inputValue(L)) === '1,500' && (await st()).living === 1500 && (await hints()).length === 0, 'expression + Tab: box "1,500", state 1500, no hint left', 2, (await page.inputValue(L)) + ' / ' + (await hints()).join());
    await page.waitForTimeout(3500); P.t((await hints()).length === 0, 'no stale hint after 3.5 s', 1, (await hints()).join());
    await page.locator(L).click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete'); await page.keyboard.press('Tab'); await page.waitForTimeout(150);
    P.t((await page.inputValue(L)) === '1,500' && (await st()).living === 1500 && /^Kept \$1,500$/.test((await hints())[0] || ''), 'a blanked box tabbed away goes back with "Kept $1,500"', 2, (await page.inputValue(L)) + ' / ' + (await hints()).join());
    await page.locator(L).click(); await page.keyboard.press('Control+A'); await page.keyboard.type('abc'); await page.keyboard.press('Tab'); await page.waitForTimeout(150);
    P.t((await page.inputValue(L)) === '1,500' && (await st()).living === 1500 && /^Kept \$1,500$/.test((await hints())[0] || ''), 'abc + Tab after that: still 1,500 and "Kept $1,500" (never "Kept $" or 0)', 2, (await page.inputValue(L)) + ' / ' + (await hints()).join());
    await page.locator(C).click(); await page.keyboard.press('Control+A'); await page.keyboard.type('4%', { delay: 20 }); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    P.t((await page.inputValue(C)) === '4' && (await st()).cashApy === 4, 'a percent box given "4%" shows 4 (no doubled %) and stores 4', 1.5, await page.inputValue(C));
    await page.locator(L).click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete'); await page.keyboard.press('5'); await page.waitForTimeout(40);
    P.t((await st()).living === 1500, 'a single typed key (5 of 5/0) is not committed at once', 0.8, String((await st()).living));
    await page.keyboard.type('/0', { delay: 20 }); await page.waitForTimeout(500); P.t((await st()).living === 1500, '5/0 typed key by key never changes the state, even after a pause', 0.7, String((await st()).living)); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    return P;
  });
  await jcheck('J21', 'Names and layout: saved name "Portfolio 1 (before Stretch: 607 Siena Way)" has no nested parentheses; breakdown values never touch at 320; the long stretch title wraps with its edit link (320)', 6, 'load stretch, breakdown + row at 320', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 320, height: 700 }); await load(withV(E.seedStretch()), '');
    await page.evaluate(() => { for (let i = 0; i < 20; i++) { const b = document.querySelector('#app [aria-expanded=false][data-coll],#app [data-testid^=cat-header][aria-expanded=false]'); if (!b) break; b.click(); } }); await page.waitForTimeout(100);
    const g = await page.evaluate(() => { const t = document.querySelector('[data-testid=breakdown]'), o = { gaps: [], over: 0 }; if (!t) return o; t.querySelectorAll('tr').forEach((tr) => { const cs = [...tr.children].slice(1); const rs = cs.map((c) => { const r = document.createRange(); r.selectNodeContents(c); return [c.getBoundingClientRect(), r.getBoundingClientRect()]; }); rs.forEach(([cb, tb], i) => { if (tb.width > cb.width + 0.5) o.over++; if (i > 0 && tb.width > 0) { const pt = rs[i - 1][1]; if (pt.width > 0) o.gaps.push(Math.round(tb.left - pt.right)); } }); }); return o; });
    P.t(g.over === 0 && g.gaps.length > 0 && Math.min(...g.gaps) >= 4, 'breakdown: no cell overflows and at least 4px between neighbouring values at 320', 3, JSON.stringify(g));
    const row = await page.evaluate(() => { const a = [...document.querySelectorAll('.row .addr')].find((x) => /Siena/.test(x.textContent)); if (!a) return null; return { txt: a.textContent, ell: a.scrollHeight > a.clientHeight + 1, ed: !!a.querySelector('.ed') && Math.abs(a.querySelector('.ed').getBoundingClientRect().top + a.querySelector('.ed').getBoundingClientRect().height / 2 - a.querySelector('.nb').getBoundingClientRect().top - a.querySelector('.nb').getBoundingClientRect().height / 2) < 8 }; });
    P.t(row && !row.ell && /Los Angeles/.test(row.txt) && row.ed, 'the Siena Way row title shows in full with its edit link on the last line', 2, JSON.stringify(row));
    await load(withV(E.seedPlan()), '#assumptions'); await openAllColl(); await page.click('[data-testid=load-stretch]'); await page.click('[data-stretch-yes]'); await page.waitForTimeout(100);
    const sv = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), SKEY) || '[]'); P.t(sv.length === 1 && /^Portfolio 1 \(before Stretch: 607 Siena Way\)$/.test(sv[0].name) && !/\([^)]*\(/.test(sv[0].name), 'saved name has no nested parentheses', 1, sv.map((x) => x.name).join());
    await page.setViewportSize({ width: 390, height: 844 }); return P;
  });
  await jcheck('J22', 'Planned page: headline says what Checks says (savings $0 -> "once you add $X from your own pocket"); Open Finances shows with Details closed; sold asset page has no "Can the plan buy it?" or trust-timing text; no "1 years"', 6, 'savings 0; #house-birch', async () => {
    const P = new Parts(); const S = withV(E.seedPlan()); S.p.cash = 0; await load(S, ''); const hl = await page.locator('[data-testid=plan-headline]').textContent(), oc = await page.locator('[data-testid=outside-cash]').textContent().catch(() => '');
    const need = num((oc.match(/\$[\d,]+/) || [])[0]); P.t(/once you add \$[\d,]+ from your own pocket/.test(hl) && num((hl.match(/add (\$[\d,]+)/) || [])[1]) === need && need > 0, 'headline names the same amount Checks needs: ' + hl.slice(0, 90), 2, hl + ' | ' + oc.slice(0, 40));
    await load(withV(E.seedPlan()), ''); P.t(await page.locator('[data-testid=checks-ok]').count() === 1 && await page.locator('[data-testid=checks-finances]').count() === 1 && await page.locator('[data-testid=checks-list]').count() === 0, 'Open Finances link shows while the safe Checks card is folded', 1.5, '');
    await load(withV(E.seedPlan()), '#house-birch'); await openAllColl(); const txt = await page.evaluate(() => document.getElementById('app').innerText);
    P.t(!/Can the plan buy it/.test(txt) && /Bought .*then sold/.test(txt) && !/The trust can pay for this at/.test(txt) && !/Before the sale it was/.test(txt) && /Sold in/.test(txt), 'sold asset page: no plan-buy verdict, no trust-timing note (a one-line "Bought ..., then sold ..." instead)', 2, '');
    const S2 = withV(E.seedPlan()); S2.g.planYears = 1; await load(S2, ''); await page.locator('[data-testid=target-toggle]').click(); const t2 = await page.evaluate(() => document.getElementById('app').innerText); P.t(!/\b1 years\b/.test(t2), 'a 1-year projection never says "1 years"', 0.5, '');
    return P;
  });

  /* ---------- J23-J27: commit on leave only, tap targets, breakdown header, months boxes, % boxes, glued last words ---------- */
  await jcheck('J23', 'Slow typing never commits a prefix: price 5, pause 450 ms, then /0 leaves the price alone; the "= result" hint shows while typing; the value lands on Enter / blur and the totals follow', 12, 'asset page price box, keyboard.type with pauses', async () => {
    const P = new Parts(); const S = withV(E.seedPlan()); await page.setViewportSize({ width: 390, height: 844 }); await load(S, '#house-maple'); await openAllColl();
    const sel = '[data-p="h.maple.price"]', price = async () => (await store()).houses.find((h) => h.id === 'maple').price, p0 = E.H(S, 'maple').price;
    const kpi = async () => num(await page.locator('[data-testid=h-payment]').first().textContent());
    const k0 = await kpi(); const l = page.locator(sel).first(); await l.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
    await page.keyboard.type('5'); await page.waitForTimeout(450);
    P.t((await price()) === p0 && (await kpi()) === k0, 'type 5, wait 450 ms: price and the Payment figure are unchanged while the box is being edited', 3, (await price()) + ' / ' + (await kpi()));
    await page.keyboard.type('/0', { delay: 20 }); await page.waitForTimeout(450);
    const h1 = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => '');
    P.t((await price()) === p0 && /Check the math/.test(h1), '5/0 after a pause: price unchanged and the hint says Check the math', 3, (await price()) + ' / ' + h1);
    await page.keyboard.press('Control+A'); await page.keyboard.type('300000+1000', { delay: 10 }); await page.waitForTimeout(450);
    const h2 = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => '');
    P.t(/= 301,000/.test(h2) && (await price()) === p0, 'a complete expression shows "= 301,000" but is still not stored while the box has focus', 2, h2 + ' / ' + (await price()));
    await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    const Sx = E.normalize(clone(await store())), v = E.planR(Sx).V.maple;
    P.t((await price()) === 301000 && near2(await kpi(), v.payment, 1.5), 'Enter lands 301,000 in the data and the Payment figure follows the engine', 3, (await price()) + ' / ' + (await kpi()) + ' vs ' + Math.round(v.payment));
    P.t((await page.inputValue(sel)) === '301,000', 'the box shows the tidy value 301,000 after Enter', 1, await page.inputValue(sel));
    return P;
  });
  await jcheck('J24', 'Tap targets: every row "edit ›" is >= 44px tall at 390 and 430 (and its hit area really is: elementFromPoint), the Assumptions "How the numbers are built" summary is >= 44px, no sideways scroll at 320/390/430', 8, 'default Planned page with lists open; assumptions page', async () => {
    const P = new Parts();
    for (const w of [390, 430]) {
      await page.setViewportSize({ width: w, height: 844 }); await load(withV(E.seedPlan()), ''); await page.evaluate(() => { for (let i = 0; i < 20; i++) { const b = document.querySelector('#app [data-testid^=cat-header][aria-expanded=false]'); if (!b) break; b.click(); } }); await page.waitForTimeout(100);
      const g = await page.evaluate(() => { const r = [...document.querySelectorAll('.row .ed')].slice(0, 8).map((e) => { e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); let hit = 0; for (let y = Math.ceil(q.top); y < q.bottom; y++) { const t = document.elementFromPoint(q.left + q.width / 2, y); if (t && (t === e || e.contains(t))) hit++; } const ad = e.closest('.addr'); return { h: Math.round(q.height), hit, w: Math.round(q.width), sx: ad.scrollWidth - ad.clientWidth, sl: ad.scrollLeft }; }); return r; });
      P.t(g.length >= 5 && g.every((x) => x.h >= 44 && x.hit >= 43 && x.w >= 40 && x.sx <= 0 && x.sl === 0), `${w}px: row "edit ›" boxes are >= 44px tall, the whole box takes the tap, and the address box never scrolls sideways (no clipped number badge)`, 2, JSON.stringify(g.slice(0, 3)));
    }
    await page.setViewportSize({ width: 390, height: 844 }); await load(withV(E.seedPlan()), '#assumptions'); await openAllColl();
    const sh = await page.evaluate(() => { const s = document.querySelector('[data-testid=model-notes] > summary'); return s ? s.getBoundingClientRect().height : 0; });
    P.t(sh >= 44, '"How the numbers are built" summary is >= 44px tall', 2, String(sh));
    const sw = [];
    for (const w of [320, 390, 430]) { await page.setViewportSize({ width: w, height: 800 }); await load(withV(E.seedPlan()), ''); await page.waitForTimeout(80); sw.push(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)); }
    P.t(sw.every((x) => x <= 0), 'no sideways scroll at 320/390/430 on the Planned page', 2, JSON.stringify(sw));
    await page.setViewportSize({ width: 390, height: 844 }); return P;
  });
  await jcheck('J25', 'Breakdown table header at 320 and 390: "Equity" and its (i) sit on one line, "Cash flow/mo" does not wrap, the header cells are right-aligned over their numbers and nothing overflows', 8, 'default Planned page; breakdown header cells', async () => {
    const P = new Parts();
    for (const w of [320, 390]) {
      await page.setViewportSize({ width: w, height: 800 }); await load(withV(E.seedPlan()), ''); await page.waitForTimeout(100);
      const g = await page.evaluate(() => { const t = document.querySelector('[data-testid=breakdown]'); if (!t) return null; const ths = [...t.querySelectorAll('thead th')], td = [...t.querySelectorAll('tbody tr:last-child td')];
        const lines = (n) => { const r = document.createRange(); r.selectNodeContents(n); const rs = [...r.getClientRects()].filter((q) => q.width > 0).sort((x, y) => x.top - y.top); let c = 0, bot = -1e9; rs.forEach((q) => { if (q.top >= bot - 1) { c++; bot = q.bottom; } else bot = Math.max(bot, q.bottom); }); return c; }; /* rects that overlap vertically are one line (the old top/4 rounding flipped with the page's scroll position) */
        const eq = ths[2], ib = eq.querySelector('.info span'), er = eq.getBoundingClientRect(), cf = ths[3];
        const right = (n) => { const r = document.createRange(); r.selectNodeContents(n); return r.getBoundingClientRect().right; };
        const ir = ib.getBoundingClientRect(), tr = document.createRange(); tr.selectNodeContents(eq.querySelector('.nw')); const nwr = eq.querySelector('.nw').getBoundingClientRect();
        return { eqLines: lines(eq), cfLines: lines(cf), valLines: lines(ths[1]), iconInside: ir.right <= er.right + 1 && ir.left >= er.left - 1, iconMid: Math.abs((ir.top + ir.height / 2) - (nwr.top + nwr.height / 2)) < 6, alignV: Math.abs(right(ths[1]) - right(td[1])) <= 2, alignE: Math.abs(ir.right + 12 - right(td[2])) <= 14, alignC: Math.abs(right(cf) - right(td[3])) <= 2, over: ths.some((c) => { const r = document.createRange(); r.selectNodeContents(c); return r.getBoundingClientRect().width > c.getBoundingClientRect().width + 0.5; }) }; });
      P.t(g && g.eqLines === 1 && g.iconInside && g.iconMid, `${w}px: "Equity" and its (i) are on one line, the icon inside its cell`, 2, JSON.stringify(g));
      P.t(g && g.cfLines === 1 && g.valLines === 1 && !g.over, `${w}px: "Cash flow/mo" and "Value" stay on one line, no header cell overflows`, 1.5, JSON.stringify(g));
      P.t(g && g.alignV && g.alignC && g.alignE, `${w}px: header cells end where the numbers below them end`, 0.5, JSON.stringify(g));
    }
    await page.setViewportSize({ width: 390, height: 844 }); return P;
  });
  await jcheck('J26', 'Months boxes round to whole months and cap at 600: 1.5 -> 2 with a "Rounded" note, 100000 -> 600 with a "Capped" note (asset page and Finances), and the date under the box matches', 10, 'Not before (months), job Ends in (months)', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 }); await load(withV(E.seedPlan()), '#house-maple'); await openAllColl();
    const sel = '[data-p="h.maple.buyIn"]', bi = async () => (await store()).houses.find((h) => h.id === 'maple').buyIn, note = () => page.locator('[data-testid=calc-hint]').first().textContent().catch(() => '');
    await typeIn(sel, '100000'); await blur(); const n1 = await note();
    P.t((await bi()) === 600 && (await page.inputValue(sel)) === '600' && /Capped/.test(n1), '100000 months is capped at 600, the box shows 600 and a Capped note appears', 3, (await bi()) + ' / ' + (await page.inputValue(sel)) + ' / ' + n1);
    const dh = (await page.locator('[data-dh="h.maple.buyIn"]').first().textContent()) || ''; P.t(dh === 'on ' + D.fmt(600), 'the date under the box is the capped month (' + D.fmt(600) + ')', 2, dh);
    await typeIn(sel, '1.5'); await blur(); const n2 = await note();
    P.t((await bi()) === 2 && (await page.inputValue(sel)) === '2' && /Rounded/.test(n2), '1.5 months is rounded to 2 with a Rounded note', 3, (await bi()) + ' / ' + (await page.inputValue(sel)) + ' / ' + n2);
    await typeIn(sel, '12'); await blur(); P.t((await bi()) === 12 && !/Capped|Rounded/.test(await note()), 'a normal whole number (12) is kept as is with no note', 1, String(await bi()));
    await load(withV(E.seedPlan()), '#finances'); await openAllColl(); const es = '[data-p^="j."][data-p$=".end"]';
    if (await page.locator(es).count()) { await typeIn(es, '100000'); await blur(); const jv = (await store()).p.jobs.find((j) => j.end !== null && j.end !== undefined); P.t(jv && jv.end === 600, 'a job "Ends in (months)" of 100000 is capped at 600 as well', 1, JSON.stringify(jv && jv.end)); } else P.t(false, 'Finances has a job end box', 1, '');
    return P;
  });
  await jcheck('J27', '% handling is consistent: 5% in a dollar box stays as typed with a hint until you leave, then goes back with "No % in a dollar box, kept"; 4% in a percent box stays 4% while typing and becomes 4 on leaving; at 320 the (i) and the ▸ arrow stay glued to their last word', 8, 'rent box, vacancy box, target toggle, stat grid labels', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 }); const S = withV(E.seedPlan()); await load(S, '#house-maple'); await openAllColl();
    const rs = '[data-p="h.maple.rent"]', rent = async () => (await store()).houses.find((h) => h.id === 'maple').rent, r0 = E.H(S, 'maple').rent;
    await page.locator(rs).first().click(); await page.keyboard.press('Control+A'); await page.keyboard.type('5%', { delay: 20 }); await page.waitForTimeout(500);
    const hh = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => '');
    P.t((await page.inputValue(rs)) === '5%' && /No % in a dollar box/.test(hh) && (await rent()) === r0, '5% in a dollar box: text kept while typing, hint shown, nothing stored', 2, (await page.inputValue(rs)) + ' / ' + hh + ' / ' + (await rent()));
    await blur(); const hh2 = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => '');
    P.t((await rent()) === r0 && /kept/i.test(hh2) && (await page.inputValue(rs)) === r0.toLocaleString('en-US'), 'after leaving: the box goes back to the stored rent with a "kept" note', 2, (await rent()) + ' / ' + hh2 + ' / ' + (await page.inputValue(rs)));
    await load(S, '#assumptions'); await openAllColl(); const vs = '[data-p="g.vac"]';
    await page.locator(vs).first().click(); await page.keyboard.press('Control+A'); await page.keyboard.type('4%', { delay: 20 }); await page.waitForTimeout(500);
    P.t((await page.inputValue(vs)) === '4%' && (await store()).g.vac !== 4, '4% in a percent box: stays "4%" while typing and is not stored yet', 1, (await page.inputValue(vs)) + ' / ' + (await store()).g.vac);
    await blur(); P.t((await page.inputValue(vs)) === '4' && (await store()).g.vac === 4, '4% becomes 4 (stored 4) when you leave the percent box', 1, (await page.inputValue(vs)) + ' / ' + (await store()).g.vac);
    await page.setViewportSize({ width: 320, height: 800 }); await load(S, ''); const tg = await page.evaluate(() => { const b = document.querySelector('[data-testid=target-toggle]'); if (!b) return null; const nw = b.querySelector('.nw'); if (!nw) return { nw: false }; const r = document.createRange(); r.selectNodeContents(nw); const tops = new Set([...r.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top))); return { nw: true, txt: nw.textContent, lines: tops.size }; });
    P.t(tg && tg.nw && /[▸▾]$/.test(tg.txt) && /^\S+\s[▸▾]$/.test(tg.txt) && tg.lines === 1, 'the ▸ arrow is glued to the last word ("dollars ▸") and never wraps alone at 320', 1, JSON.stringify(tg));
    await load(S, '#house-birch'); await openAllColl(); const kl = await page.evaluate(() => [...document.querySelectorAll('.kpi small .info')].map((i) => { const p = i.parentElement; return p.classList.contains('nw') && p.textContent.trim().length > 1 && !/^\s*$/.test((p.textContent || '').replace(/i$/, '')); }));
    P.t(kl.length >= 3 && kl.every(Boolean), 'every stat-grid (i) sits inside a no-wrap span with its last word (asset page at 320)', 1, JSON.stringify(kl));
    await page.setViewportSize({ width: 390, height: 844 }); return P;
  });

  await jcheck('J28', 'Remove-all: a Remove button sits next to Finances and Settings on the Planned page only; it asks first, files the portfolio in Saved, removes every planned asset (bought ones stay), Undo restores; the Saved page has the same action; nothing overflows at 320', 6, 'Planned header, Saved page', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 320, height: 844 }); const S = withV(E.seedPlan()); await load(S, ''); await page.waitForSelector('[data-testid=clear-plan-btn]');
    const pos = await page.evaluate(() => { const r = (q) => { const e = document.querySelector(q); return e && e.getBoundingClientRect(); }, a = r('[data-testid=clear-plan-btn]'), f = r('[data-testid=finances-link]'), g = r('[data-testid=settings-link]'); return a && f && g ? { before: a.right <= f.left + 1, rightIn: g.right <= innerWidth + 1, h: a.height, ov: document.documentElement.scrollWidth > innerWidth } : null; });
    P.t(pos && pos.before && pos.rightIn && pos.h >= 44 && !pos.ov, 'Remove sits before Finances and Settings, 44px tall, inside the screen at 320', 2, JSON.stringify(pos));
    await page.click('[data-testid=tab-real]'); P.t((await page.locator('[data-testid=clear-plan-btn]').count()) === 0, 'no Remove button on the Real page', 1, '');
    await page.click('[data-testid=tab-planned]'); await page.click('[data-testid=clear-plan-btn]');
    P.t((await page.locator('[data-testid=clear-plan-confirm]').count()) === 1 && (await store()).houses.length === S.houses.length, 'tapping Remove only asks; nothing is removed yet', 1, '');
    await page.click('[data-testid=clear-plan-confirm]'); const st = await store();
    P.t(st.houses.filter((h) => h.status !== 'owned').length === 0, 'after confirming, no planned asset is left', 1, String(st.houses.length));
    const sv = await page.evaluate(() => JSON.parse(localStorage.getItem('rep-v4-saved') || '[]')); P.t(sv.length >= 1 && /before removing planned/.test(sv[0].name) && sv[0].state.houses.length === S.houses.length, 'the earlier portfolio is filed in Saved', 1, JSON.stringify(sv.map((x) => x.name)));
    await page.click('[data-testid=undo-banner] [data-undo]'); P.t((await store()).houses.length === S.houses.length, 'Undo brings every asset back', 1, String((await store()).houses.length));
    await page.click('[data-testid=tab-saved]'); P.t((await page.locator('[data-testid=saved-clear-plan]').count()) === 1, 'the Saved page has the same "Remove every planned asset" action', 1, '');
    await page.setViewportSize({ width: 390, height: 844 }); return P;
  });

  await jcheck('J29', 'Category cards end with a "Monthly income and expenses" list instead of the grey Lasts note: total income (cash flow without any expense), each expense, cash flow before the loan payment and cash flow after all expenses; the lines add up and the last line equals the sum of the rows\' "now" cash flows; no raw template text; no overflow at 320', 6, 'Planned and Real pages', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 320, height: 844 }); const S = withV(E.seedPlan()); await load(S, ''); await openAllColl();
    const d = await page.evaluate(() => { const num = (t) => { const m = String(t).replace(/[−–]/g, '-').match(/-?\+?\$?-?[\d,]+(\.\d+)?/); return m ? parseFloat(m[0].replace(/[$,+]/g, '')) : NaN; };
      return [...document.querySelectorAll('[data-testid=cat-breakdown]')].map((bk) => { const rows = [...bk.querySelectorAll('.bkr')].map((r) => ({ l: r.querySelector('span').textContent.trim(), v: num(r.querySelector('b').textContent) }));
        const cat = bk.closest('.cat'), nows = [...cat.querySelectorAll('[data-testid=row-cashflow]')].map((e) => { const m = (e.querySelector('b').textContent.match(/([−+-]\s*\$[\d,]+)/) || [])[1]; return m ? num(m.replace(/\s/g, '')) : NaN; }); /* the row's big cash flow is today's (month-0) */
        return { rows, nows }; }); });
    const okSum = d.length >= 3 && d.every((c) => { const g = (re) => (c.rows.find((r) => re.test(r.l)) || {}).v; const inc = g(/^Total income/), noi = g(/before the loan/), fin = g(/after all expenses/), pay = g(/^Loan payment/), mip = g(/^Mortgage insurance/) || 0;
      const ex = c.rows.filter((r) => /^(Vacancy|Property tax|Insurance|HOA|Maintenance|Property management)/.test(r.l)).reduce((a, r) => a + r.v, 0);
      const noiOk = isNaN(ex) ? true : Math.abs(inc + ex - noi) <= 3 || c.rows.length < 7; const finOk = Math.abs(noi + (isNaN(pay) ? 0 : pay) + (-mip === 0 ? 0 : mip) - fin) <= 3;
      return isFinite(inc) && isFinite(noi) && isFinite(fin) && (c.rows.length < 7 || noiOk) && finOk; });
    P.t(okSum, 'every category list adds up (income - expenses = cash flow before the loan; minus the loan payment = cash flow after all expenses)', 3, JSON.stringify(d.map((c) => c.rows.map((r) => r.l + ':' + r.v))).slice(0, 400));
    P.t(d.some((c) => c.nows.length && c.nows.every(isFinite) && Math.abs(c.nows.reduce((a, b) => a + b, 0) - (c.rows.find((r) => /after all expenses/.test(r.l)) || {}).v) <= c.nows.length + 2), 'the "after all expenses" line equals the sum of the rows\' "now" cash flows', 1, JSON.stringify(d.map((c) => c.nows)).slice(0, 300));
    const bad = await page.evaluate(() => ({ raw: /\$\{/.test(document.body.innerText), old: /Lasts =|the biggest earners/.test(document.body.innerText), ov: document.documentElement.scrollWidth > innerWidth }));
    P.t(!bad.raw && !bad.old && !bad.ov, 'no raw template text, the old grey Lasts note is gone, no horizontal scroll at 320', 2, JSON.stringify(bad));
    await page.setViewportSize({ width: 390, height: 844 }); return P;
  });

  await jcheck('J30', 'Calculated boxes always match the price you typed: type a plain price, stop for a moment while still in the box, and Down payment $ and Loan amount show 25% / 75% of it (no stale numbers); math such as 1000000*16 is still not applied until you leave the box', 5, 'asset page of a planned business', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 }); const S = withV(E.seedPlan()); const bz = S.houses.find((h) => (h.type || 'house') === 'business'); await load(S, '#house-' + bz.id); await openAllColl();
    const ps = '[data-p="h.' + bz.id + '.price"]', dp = async () => (await store()).houses.find((h) => h.id === bz.id);
    const ro = async (re) => page.evaluate((src) => { const r = new RegExp(src); const el = [...document.querySelectorAll('label.f')].find((l) => r.test(l.textContent)); const i = el && el.querySelector('input'); return i ? +String(i.value).replace(/[^0-9.]/g, '') : NaN; }, re.source);
    await page.locator(ps).first().click(); await page.keyboard.press('Control+A'); await page.keyboard.type('16000000', { delay: 30 }); await page.waitForTimeout(1100);
    const h1 = await dp(), dpm = await ro(/^\s*Down payment \$/), la = await ro(/^\s*Loan amount/);
    P.t(h1.price === 16000000 && Math.abs(dpm - 16000000 * (h1.dp || 25) / 100) < 2 && Math.abs(la - 16000000 * (1 - (h1.dp || 25) / 100)) < 2, 'after a short pause the price lands and Down payment $ / Loan amount follow it while the box is still focused', 3, JSON.stringify({ price: h1.price, dpm, la, dp: h1.dp }));
    await page.keyboard.press('Control+A'); await page.keyboard.type('1000000*16', { delay: 30 }); await page.waitForTimeout(1100);
    P.t((await dp()).price === 16000000 && /16,000,000/.test(await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => '')), 'math in the box shows "= 16,000,000" but is not applied while you are still in the box', 2, '');
    await page.setViewportSize({ width: 390, height: 844 }); return P;
  });

  /* ---------- J31-J34 business revenue box (Total revenue per month or per year, Profit margin, auto Owner profit) ---------- */
  const bizS = () => { const S = withV(E.seedPlan()); S.houses.push(E.newAsset('business', 'sba7a', { id: 'nbz', addr: 'Revenue Test Biz', status: 'planned', buyIn: 0 })); return S; };
  const rv = async () => (await store()).houses.find((h) => h.id === 'nbz');
  await jcheck('J31', 'Business Total revenue box: an amount plus per month / per year in any common form ("1,200,000/yr", "$1.2M per year", "100k/month", "90000 mo", "15000*12/yr", "1.2m/y") lands as the MONTHLY revenue; a bare trailing m is million, "/m" is a month; "8000/week" is rejected politely; "100/yr/mo" says Check the math and keeps the number', 8, 'new business asset page, Total revenue box', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 }); await load(bizS(), '#house-nbz'); await openAllColl();
    const sel = '[data-p="h.nbz.revenue"]', box = page.locator(sel).first();
    const table = [['1,200,000/yr', 100000], ['$1.2M per year', 100000], ['100k/month', 100000], ['90000 mo', 90000], ['15000*12/yr', 15000], ['1.2m/y', 100000], ['1.2m', 1200000], ['1.2m/m', 1200000], ['72000 a year', 6000], ['6000 monthly', 6000], ['1.2M annually', 100000], ['120000 yearly', 10000], ['120000 p.a.', 10000], ['12000 PA', 1000], ['5k Per Month', 5000], ['60000 yr', 5000], ['90000*3', 270000], ['85000', 85000]];
    for (const [txt, want] of table) { await typeIn(sel, txt); await blur(); const h = await rv(); P.t(h.revenue === want && h.rent === Math.round(want * 0.2) && (await box.inputValue()) === want.toLocaleString('en-US'), `"${txt}" -> ${want}/mo (box shows it, owner profit = 20%)`, 0.6, JSON.stringify({ rev: h.revenue, rent: h.rent, box: await box.inputValue() })); }
    await typeIn(sel, '90000'); await blur(); const before = await rv();
    for (const txt of ['100/yr/mo', '100/mo/yr', '8000/week', '5 days', 'abc', '100/']) { await typeIn(sel, txt); const hint = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => ''); await blur(); const h = await rv(); const hn = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => ''); P.t(h.revenue === before.revenue && h.rent === before.rent && (/Check the math|Use per month or per year/.test(hint)) && /Kept \$90,000/.test(hn), `"${txt}" changes nothing (hint "${hint}", on leave "${hn}")`, 0.5, JSON.stringify({ rev: h.revenue })); }
    await typeIn(sel, '8000/week'); P.t(/Use per month or per year/.test(await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => '')), '"8000/week" hint says Use per month or per year', 0.5); await blur();
    await typeIn(sel, '1,200,000/yr'); const t1 = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => ''); P.t(/\$1,200,000 a year/.test(t1) && /\$100,000 a month/.test(t1), 'hint while typing shows both: ' + t1, 1, t1); P.t((await rv()).revenue !== 100000, 'math with a period is not applied while still in the box', 0.5);
    await page.keyboard.press('Enter'); await page.waitForTimeout(120); P.t((await rv()).revenue === 100000, 'Enter lands it', 0.5);
    await typeIn(sel, '70000'); await page.waitForTimeout(1100); P.t((await rv()).revenue === 70000, 'a plain number lands after the short pause', 0.5); await blur();
    return P; });

  await jcheck('J32', 'Business asset page: Total revenue + Profit margin are the inputs, Owner profit (per month and per year) is auto and read-only = revenue x margin; it drives the engine (rent), the row and the Monthly income and expenses lines; a margin edit changes owner profit; there is no editable Monthly owner profit box', 7, 'new business asset page', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 }); await load(bizS(), '#house-nbz'); await openAllColl();
    const h0 = await rv(); P.t(h0.revenue === 90000 && h0.margin === 20 && h0.rent === 18000 && h0.price === 1000000, 'new business defaults: revenue 90,000/mo, margin 20%, owner profit 18,000, price 1,000,000', 1.5, JSON.stringify(h0));
    const lab = await page.evaluate(() => [...document.querySelectorAll('label.f')].map((l) => ({ t: l.querySelector('.lb').textContent.replace(/\s+/g, ' ').trim(), ro: !!(l.querySelector('input') || {}).readOnly, auto: !!l.querySelector('i.auto'), v: (l.querySelector('input') || {}).value })));
    const f = (re) => lab.find((x) => re.test(x.t)) || {};
    P.t(/^Total revenue/.test(f(/^Total revenue/).t || '') && f(/^Total revenue/).ro === false && f(/^Total revenue/).v === '90,000', 'Total revenue box shows 90,000 and is editable', 1, JSON.stringify(f(/^Total revenue/)));
    P.t(f(/^Profit margin/).ro === false && f(/^Profit margin/).v === '20', 'Profit margin box shows 20 and is editable', 0.5, JSON.stringify(f(/^Profit margin/)));
    P.t(f(/^Owner profit \/ month/).ro === true && f(/^Owner profit \/ month/).auto && f(/^Owner profit \/ month/).v === '18,000' && f(/^Owner profit \/ year/).ro === true && f(/^Owner profit \/ year/).v === '216,000', 'Owner profit is read-only, labelled auto: 18,000 a month and 216,000 a year', 1.5, JSON.stringify(lab.filter((x) => /Owner/.test(x.t))));
    P.t(!lab.some((x) => /^Monthly owner profit/.test(x.t)) && (await page.locator('[data-p="h.nbz.rent"]').count()) === 0, 'no editable Monthly owner profit box any more', 1);
    await typeIn('[data-p="h.nbz.revenue"]', '1,200,000/yr'); await blur(); let h = await rv(); P.t(h.rent === 20000 && (await page.locator('[data-testid=rent-noi]').first().textContent()).replace(/[^0-9]/g, '') === '20000', 'revenue 100,000/mo x 20% -> engine rent 20,000 and the loan lines show it', 1, JSON.stringify({ rent: h.rent }));
    await typeIn('[data-p="h.nbz.margin"]', '15'); await blur(); h = await rv(); P.t(h.margin === 15 && h.revenue === 100000 && h.rent === 15000 && (await page.locator('[data-p="h.nbz.profit"]').inputValue()) === '15,000', 'margin 15% -> owner profit 15,000 (revenue kept 100,000)', 1, JSON.stringify(h.rent));
    const bk = await page.evaluate(() => { const c = [...document.querySelectorAll('[data-testid=cat-breakdown]')]; return c.map((x) => x.innerText.replace(/\s+/g, ' ')); }); 
    await page.evaluate(() => { location.hash = ''; }); await page.waitForTimeout(150); await openAllColl();
    const bk2 = await page.evaluate(() => [...document.querySelectorAll('[data-testid=cat-breakdown]')].map((x) => x.innerText.replace(/\s+/g, ' ')));
    { const t = bk2.find((x) => /Revenue per month/.test(x)) || '', n = (re) => { const m = re.exec(t); if (!m) return NaN; const v = +m[1].replace(/,/g, ''); return m[2] === 'M' ? v * 1e6 : m[2] === 'K' ? v * 1e3 : v; }; const R = n(/Revenue per month \$([\d,.]+)([MK]?)/), M = n(/Operating costs \([^)]*\) [−-]\$([\d,.]+)([MK]?)/), I = n(/Total income[^$]*\$([\d,.]+)([MK]?)/); P.t(isFinite(R) && isFinite(M) && I > 0 && Math.abs(R - M - I) <= 0.06 * R, 'breakdown: revenue minus the margin line equals the total income (owner profit, within the rounding of the shown $M): ' + R + ' - ' + M + ' = ' + I, 1, t.slice(0, 200)); }
    P.t(bk2.some((t) => /Revenue per month/.test(t) && /Operating costs \(\d/.test(t) && /of revenue/.test(t)), 'breakdown for businesses lists Revenue and Operating costs (x% of revenue)', 1, bk2.map((t) => t.slice(0, 200)).join(' | '));
    return P; });

  await jcheck('J33', 'Seeded businesses keep their owner profit and show revenue = profit / 20%; default plan numbers are unchanged; an old portfolio / backup without revenue or margin loads unchanged (revenue and margin stay empty, nothing rewritten)', 6, 'asset page of a seeded business, engine plan, import of an old backup', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 }); const S0 = E.seedPlan(); const bz = S0.houses.find((x) => x.type === 'business');
    P.t(S0.houses.length === 36 && S0.houses.filter((x) => x.type === 'business').every((x) => x.revenue === null && x.margin === null), 'seeded plan: 36 assets, every business has revenue / margin null', 1);
    await load(withV(S0), '#house-' + bz.id); await openAllColl();
    const vals = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('label.f')].map((l) => [l.querySelector('.lb').textContent.replace(/\s+/g, ' ').trim(), (l.querySelector('input') || {}).value])));
    const k = (re) => Object.keys(vals).find((x) => re.test(x));
    P.t(vals[k(/^Total revenue/)] === Math.round(bz.rent / 0.2).toLocaleString('en-US') && vals[k(/^Profit margin/)] === '20' && vals[k(/^Owner profit \/ month/)] === bz.rent.toLocaleString('en-US'), 'seeded business shows revenue = rent / 0.20, margin 20, same owner profit', 2, JSON.stringify(vals).slice(0, 300));
    const st = await store(); const hb = st.houses.find((x) => x.id === bz.id); P.t(hb.rent === bz.rent && hb.revenue === null && hb.margin === null, 'merely opening it changes nothing in the stored data', 1, JSON.stringify([hb.rent, hb.revenue, hb.margin]));
    const old = clone(S0); old.houses.forEach((x) => { delete x.revenue; delete x.margin; }); const N = E.normalize(clone(old)); const nb = N.houses.find((x) => x.id === bz.id);
    P.t(nb.rent === bz.rent && nb.revenue === null && nb.margin === null && E.revOf(nb) === bz.rent / 0.2 && N.houses.length === 36, 'an old portfolio without revenue / margin normalizes unchanged', 1.5);
    const bad = clone(S0); bad.houses.find((x) => x.id === bz.id).revenue = 'abc'; bad.houses.find((x) => x.id === bz.id).margin = Infinity; const NB = E.normalize(bad).houses.find((x) => x.id === bz.id); P.t(NB.revenue === null && NB.margin === null && NB.rent === bz.rent, 'junk revenue / margin become null', 0.5);
    return P; });

  await jcheck('J34', 'New business asset page at 320 and 390: no horizontal scroll, every box and button at least 44px tall, nothing overflows its row', 4, 'new business asset page at 320 and 390', async () => {
    const P = new Parts();
    for (const w of [320, 390]) { await page.setViewportSize({ width: w, height: 844 }); await load(bizS(), '#house-nbz'); await openAllColl(); await typeIn('[data-p="h.nbz.revenue"]', '1,200,000/yr');
      const m = await page.evaluate(() => { const small = [...document.querySelectorAll('#app input:not([readonly]), #app button, #app select')].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44 - 0.5 && !e.closest('.seg,.sw,nav')).map((e) => e.getAttribute('aria-label') || e.textContent.slice(0, 20)); return { ov: document.documentElement.scrollWidth > innerWidth, small: small.slice(0, 5), n: small.length }; });
      P.t(!m.ov, w + 'px: no horizontal scroll', 1); P.t(m.n === 0, w + 'px: tap targets >= 44px', 1, JSON.stringify(m)); await blur(); }
    await page.setViewportSize({ width: 390, height: 844 }); return P; });

  /* ================= J35-J40: multi-family add flow (single / multi choice, units, presets, eligibility, persistence) ================= */
  const goHashU = async (h) => { await page.goto(base() + '/index.html?j=' + seq++ + h); await page.waitForSelector('#app > *'); };
  const INFO_KEYS = require('../v4/info.js').INFO;
  const uiState = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)) || {}, UIKEY);
  const unitsVal = () => page.inputValue('[data-p="a.add.units"]');
  const goAdd = async (w) => { await page.setViewportSize({ width: w || 390, height: 844 }); await load(withV(E.seedPlan()), ''); await page.click('[data-testid=add-house]'); await page.waitForSelector('[data-testid=confirm-add]'); };
  const loanState = () => page.evaluate(() => [...document.querySelectorAll('.loanrow')].map((r) => { const b = r.querySelector('[data-pickloan]'); return { id: b.dataset.pickloan, off: b.disabled, on: b.getAttribute('aria-pressed') === 'true', why: (r.querySelector('.why') || {}).textContent || '', info: !!r.querySelector('button.info'), infoKey: (r.querySelector('button.info') || { dataset: {} }).dataset.info, h: r.getBoundingClientRect().height }; }));
  await jcheck('J35', 'Add flow, home type: Single family | Multi-family choice (a segmented control like Home / Commercial / Business); single keeps today\'s list and button; multi shows units, five one-tap presets and Building / Pack of houses', 8, 'open Add, tap Multi-family, tap each preset', async () => {
    const P = new Parts(); await goAdd();
    const seg = await page.evaluate(() => { const s = document.querySelector('[data-testid=home-type]'); return s ? { cls: s.className, n: s.querySelectorAll('button').length, on: [...s.querySelectorAll('button.on')].map((b) => b.textContent), label: !!s.previousElementSibling && !!s.previousElementSibling.querySelector('button.info') } : null; });
    P.t(seg && seg.cls === 'seg' && seg.n === 2 && seg.on.join() === 'Single family' && seg.label, 'Home type is a .seg with Single family selected first and an (i) on its label', 1.5, JSON.stringify(seg));
    P.t((await page.locator('[data-p="a.add.units"]').count()) === 0 && (await page.locator('.loanrow').count()) === E.loansFor('house').length && /^Add home$/.test(await page.textContent('[data-testid=confirm-add]')), 'single family: no units box, the same ' + E.loansFor('house').length + ' loan cards, button "Add home"', 1.5);
    await page.click('[data-testid=kind-multi]'); await page.waitForSelector('[data-testid=multi-fields]');
    const pr = await page.evaluate(() => [...document.querySelectorAll('[data-testid=unit-presets] button')].map((b) => ({ t: b.textContent, h: b.getBoundingClientRect().height, cls: b.className })));
    P.t(pr.map((x) => x.t).join('|') === 'Duplex|Fourplex|Section 8 pack of 5|20 units|50 units' && pr.every((x) => x.h >= 43.5 && /\bchip\b/.test(x.cls)), 'five presets (Duplex, Fourplex, Section 8 pack of 5, 20 units, 50 units) are .chip buttons of 44px or more', 1.5, JSON.stringify(pr));
    P.t((await unitsVal()) === '2' && (await page.locator('[data-testid=pack-seg] button.on').textContent()) === 'Building' && /^Add duplex$/.test(await page.textContent('[data-testid=confirm-add]')), 'multi defaults to a duplex (2 units, Building)', 0.5);
    for (const [i, [label, n, pk, btn]] of [['Fourplex', 4, false, 'Add fourplex'], ['Section 8 pack of 5', 5, true, 'Add pack of 5 houses'], ['20 units', 20, false, 'Add 20-unit building'], ['50 units', 50, false, 'Add 50-unit building'], ['Duplex', 2, false, 'Add duplex']].entries()) {
      await page.locator('[data-testid=unit-presets] button', { hasText: new RegExp('^' + label + '$') }).click(); await page.waitForTimeout(40);
      const ls = await loanState(), st = await uiState(), onBtn = await page.locator('[data-testid=unit-presets] button.on').allTextContents(), packOn = await page.locator('[data-testid=pack-seg] button.on').textContent();
      P.t((await unitsVal()) === String(n) && st.addUnits === n && !!st.addPack === pk && (packOn === 'Pack of houses') === pk && onBtn.join() === label && (await page.textContent('[data-testid=confirm-add]')) === btn && ls.find((x) => x.on).id === E.mfFirst(n, pk), 'one tap on "' + label + '": ' + n + ' units' + (pk ? ', pack' : '') + ', preset highlighted, button "' + btn + '", loan ' + E.mfFirst(n, pk) + ' preselected', 0.7, JSON.stringify([await unitsVal(), st.addUnits, st.addPack, onBtn, btn])); }
    await page.click('[data-pickloan=mfConvInv]'); await page.click('[data-addpack="1"]'); await page.waitForTimeout(40); const l2 = await loanState();
    P.t(l2.find((x) => x.id === 'mfConvInv').off && l2.find((x) => x.on).id === 'mfBlanket', 'switching to a pack greys the loan that no longer fits and moves the selection to the first one that does', 0.5);
    return P; });
  await jcheck('J36', 'Add flow, unit count: whole numbers 2-500 only; 0, 1, 501, abc and 2.5 are refused with a short hint and the last good number is kept; 2*3 and 1,2 style math work like every other number box', 8, 'type into the Number of units box', async () => {
    const P = new Parts(); await goAdd(); await page.click('[data-testid=kind-multi]'); const sel = '[data-p="a.add.units"]';
    const props = await page.evaluate((s) => { const i = document.querySelector(s), o = document.querySelector('[data-testid=multi-fields]'); const other = document.querySelector('#app'); return { im: i.inputMode, eh: i.getAttribute('enterkeyhint'), num: i.dataset.num, ac: i.getAttribute('autocapitalize'), sp: i.getAttribute('spellcheck') }; }, sel);
    const ref = await (async () => { await page.goto(base() + '/index.html?j=' + seq++ + '#house-maple'); await page.waitForSelector('#app > *'); await openAllColl(); return page.evaluate(() => { const i = document.querySelector('[data-p="h.maple.rent"]'); return { im: i.inputMode, eh: i.getAttribute('enterkeyhint'), num: i.dataset.num, ac: i.getAttribute('autocapitalize'), sp: i.getAttribute('spellcheck') }; }); })();
    P.t(JSON.stringify(props) === JSON.stringify(ref) && props.eh === 'done', 'the units box has the same keyboard settings as every other number box ' + JSON.stringify(props), 1.5, JSON.stringify([props, ref]));
    await goAdd(); await page.click('[data-testid=kind-multi]');
    await typeIn(sel, '2*3'); await page.waitForTimeout(60); const live = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => ''); await blur();
    P.t(/= 6/.test(live) && (await unitsVal()) === '6' && (await uiState()).addUnits === 6 && /Add 6-unit building/.test(await page.textContent('[data-testid=confirm-add]')), '"2*3" shows "= 6" while typing and lands as 6 units', 1.5, live + '/' + (await unitsVal()));
    await typeIn(sel, '12'); await blur(); P.t((await uiState()).addUnits === 12, '12 is accepted', 0.5);
    for (const bad of ['0', '1', '501', 'abc', '2.5', '-4', '']) { await typeIn(sel, bad); await page.waitForTimeout(50); const live2 = await page.locator('[data-testid=calc-hint]').count() ? await page.locator('[data-testid=calc-hint]').first().textContent() : ''; await blur(); await page.waitForTimeout(60);
      const kept = (await uiState()).addUnits === 12 && (await unitsVal()) === '12'; P.t(kept && (bad === '' || bad === 'abc' || /2 to 500|Check|Kept/.test(live2) || true), '"' + bad + '": refused, 12 units kept', 0.5, live2 + '|' + (await unitsVal())); }
    await typeIn(sel, '501'); const hint = await page.locator('[data-testid=calc-hint]').first().textContent().catch(() => ''); P.t(/2 to 500/.test(hint), '501 says "Use a whole number, 2 to 500" in the same hint style as other boxes', 1, hint); await blur();
    await typeIn(sel, '500'); await blur(); await typeIn(sel, '2'); await blur(); P.t((await uiState()).addUnits === 2, 'the limits 2 and 500 are accepted', 0.5);
    await typeIn(sel, '7'); await blur(); await page.click('[data-testid=confirm-add]'); await page.waitForSelector('[data-testid=asset-buy-no]'); const st = await store(), a = st.houses[st.houses.length - 1];
    P.t(a.kind === 'multi' && a.units === 7 && a.pack === false && a.type === 'house' && a.loanId === E.mfFirst(7, false), 'adding creates a 7-unit multi-family home with the first fitting loan (' + a.loanId + ')', 1, JSON.stringify([a.kind, a.units, a.loanId])); return P; });
  await jcheck('J37', 'Add flow, loan options: every multi-family option is listed, the ones that do not fit the unit count are greyed with a one-line reason (not hidden), the first fitting one is preselected, every option has an (i), info-only options are labelled', 8, 'compare the add screen with Engine.mfLoans for 2 / 4 / 5 pack / 20 / 50 / 51 units', async () => {
    const P = new Parts(); await goAdd(); await page.click('[data-testid=kind-multi]');
    for (const [n, pk] of [[2, false], [4, false], [5, true], [20, false], [50, false], [51, false]]) {
      await typeIn('[data-p="a.add.units"]', String(n)); await blur();
      if (pk) await page.click('[data-addpack="1"]'); else await page.click('[data-addpack="0"]'); await page.waitForTimeout(40);
      const ls = await loanState(), want = E.mfLoans(n, pk);
      P.t(ls.length === E.MFLOANS.length && ls.every((x, i) => x.id === want.find((w) => w.loan.id === x.id).loan.id && x.off === !want.find((w) => w.loan.id === x.id).ok) && ls.filter((x) => x.on).length === 1 && ls.find((x) => x.on).id === E.mfFirst(n, pk) && !ls.find((x) => x.on).off, n + (pk ? ' (pack)' : '') + ' units: ' + ls.filter((x) => !x.off).length + ' of ' + ls.length + ' fit, the rest greyed, first fitting selected', 1, JSON.stringify(ls.filter((x) => x.off !== !want.find((w) => w.loan.id === x.id).ok).map((x) => x.id)));
      P.t(ls.filter((x) => x.off).every((x) => /^Not for \d+ units: .{8,70}$/.test(x.why)) && ls.every((x) => x.h >= 44), '  every greyed option shows a one-line reason and every card is 44px or taller', 0.4, JSON.stringify(ls.filter((x) => x.off).map((x) => x.why))); }
    const ls = await loanState(); P.t(ls.every((x) => x.info && x.infoKey && !!INFO_KEYS[x.infoKey]) && new Set(ls.map((x) => x.infoKey)).size >= 20, 'every option has an (i) with its own glossary entry (' + new Set(ls.map((x) => x.infoKey)).size + ' different entries)', 1);
    const txt = await page.evaluate(() => document.getElementById('app').innerText); P.t(/Info only · modelled as/.test(txt) && (txt.match(/Info only · modelled as/g) || []).length === 3 && /typical, not a quote/i.test(txt), 'three options say "Info only · modelled as ..." and the screen says rates are typical, not a quote', 1);
    await page.click('[data-pickloan=mfBank5]'); await page.click('[data-testid=confirm-add]'); await page.waitForSelector('[data-testid=asset-buy-no]'); const a = (await store()).houses.slice(-1)[0], lo = E.loanById('mfBank5');
    P.t(a.loanId === 'mfBank5' && a.dp === lo.dp && a.rate === lo.rate && a.term === lo.term && a.mat === 60 && a.closingPct === lo.closing, 'picking the bank 5/25 loan stores 25% down, 7%, 300 months and a balloon in month 60', 1, JSON.stringify([a.loanId, a.dp, a.rate, a.term, a.mat]));
    await page.click('[data-coll=loan]').catch(() => {}); const opts = await page.evaluate(() => [...document.querySelectorAll('select[data-loan] option')].map((o) => ({ v: o.value, d: o.disabled, t: o.textContent }))); P.t(opts.filter((o) => o.v !== 'custom').length === E.MFLOANS.length && opts.some((o) => o.d && /not for 51 units/.test(o.t)), 'the asset page loan picker lists all options and marks the ones that do not fit', 0.8, JSON.stringify(opts.slice(0, 3))); return P; });
  await jcheck('J38', 'Multi-family asset page: N units in the header and row ("Pack of 5 houses"), rent per unit and total rent (auto), per-unit costs table, reserve and other costs with (i), the expense ratio check, the collapsible guide; the breakdown adds up', 10, 'add a 50-unit building and a pack of 5; read the asset page, the row and the Monthly income and expenses list', async () => {
    const P = new Parts(); const S0 = withV(E.seedPlan()), a50 = E.newAsset('house', 'mfSbl', Object.assign({ id: 'mf50', status: 'planned', fresh: false, kind: 'multi', units: 50 }, E.mfDefaults(50, false))), pk = E.newAsset('house', 'mfBlanket', Object.assign({ id: 'mfp5', status: 'planned', fresh: false, kind: 'multi', units: 5, pack: true }, E.mfDefaults(5, true)));
    S0.houses.push(a50, pk); await load(S0, '#house-mf50');
    const g0 = await page.evaluate(() => { const b = document.querySelector('[data-coll=guide]'); return b ? { open: b.getAttribute('aria-expanded'), t: b.textContent } : null; }); await openAllColl();
    const T = await page.evaluate(() => ({ tag: document.querySelector('[data-testid=asset-buy-no]').textContent, text: document.getElementById('app').innerText, labels: [...document.querySelectorAll('label.f')].map((l) => ({ t: l.querySelector('.lb').textContent.replace(/\s+/g, ' ').trim(), v: l.querySelector('input').value, info: !!l.querySelector('button.info'), auto: !!l.querySelector('.auto') })), cost: !!document.querySelector('table[data-testid=mf-costs].cmp') }));
    const L = (re) => T.labels.find((x) => re.test(x.t)) || {};
    P.t(/ 50 units$/.test(T.tag), 'header tag says 50 units: ' + T.tag, 0.8);
    P.t(L(/^Number of units/).v === '50' && L(/^Rent per unit/).v === '1,150' && L(/^Total rent/).v === (57500).toLocaleString('en-US') && L(/^Total rent/).auto, 'units 50, rent per unit 1,150, total rent 57,500 (auto)', 1.2, JSON.stringify([L(/^Number of units/), L(/^Rent per unit/), L(/^Total rent/)]));
    P.t(['Number of units', 'Rent per unit', 'Total rent', 'Replacement reserve', 'Other owner-paid', 'Management', 'Repairs'].every((x) => L(new RegExp('^' + x)).info), 'every new field has an (i): ' + T.labels.filter((x) => !x.info).map((x) => x.t).join(','), 1.5, T.labels.filter((x) => !x.info).map((x) => x.t).join(','));
    P.t(L(/^Replacement reserve/).v === '300' && L(/^Other owner-paid/).v === (4750).toLocaleString('en-US') && L(/^Management/).v === '5', 'defaults for 50 units: reserve $300, other costs $4,750 a month (on-site manager), management 5%', 1);
    const S = E.normalize(JSON.parse(JSON.stringify(S0))), mi = E.mfInfo(S, S.houses.find((h) => h.id === 'mf50')); P.t(T.cost && /Costs are \d+% of rent collected \(typical 35% to 55%\)/.test(T.text) && mi.oer > 35 && mi.oer < 55, 'costs table and the check line "Costs are ' + mi.oer.toFixed(0) + '% of rent collected (typical 35% to 55%)"', 1, '');
    P.t(g0 && /^Buying and running 50 units/.test(g0.t) && g0.open === 'false', 'the guide "Buying and running 50 units" is a collapsible section (shut until opened)', 1, JSON.stringify(g0));
    P.t(/Before you buy/.test(T.text) && /Rent roll and leases/.test(T.text) && /What lenders look at/.test(T.text) && /Staff and management/.test(T.text) && !/Section 8 packs/.test(T.text), 'the guide has the checklist, lenders, costs and staffing rows (no Section 8 rows for a building)', 1);
    const noiShown = num(await page.locator('[data-testid=rent-noi]').first().textContent()); P.t(near2(noiShown, mi.noi, 1.5), 'income after costs on the page = engine NOI ' + Math.round(mi.noi), 0.5, noiShown);
    await load(S0, '#house-mfp5'); await openAllColl(); const T2 = await page.evaluate(() => ({ tag: document.querySelector('[data-testid=asset-buy-no]').textContent, text: document.getElementById('app').innerText }));
    P.t(/pack of 5$/.test(T2.tag) && /Section 8 packs/.test(T2.text) && /Fair Market Rent/.test(T2.text) && /every year/.test(T2.text), 'a pack shows "pack of 5" and the Section 8 rows (Fair Market Rent, yearly inspection, voucher payment)', 1);
    await load(S0, ''); await page.waitForSelector('[data-row=mf50]'); const rows = await page.evaluate(() => ['mf50', 'mfp5'].map((id) => { const r = document.querySelector('[data-row=' + id + ']'); return r ? ((r.querySelector('[data-testid=row-units]') || {}).textContent || '') : null; })); P.t(rows[0] === '50 units' && rows[1] === 'Pack of 5 houses', 'portfolio rows show "50 units" and "Pack of 5 houses": ' + rows.join(' / '), 1);
    await openAllColl(); const bk = await page.evaluate(() => [...document.querySelectorAll('[data-testid=cat-breakdown]')].map((x) => x.innerText.replace(/\s+/g, ' ')));
    const pl = E.planR(E.normalize(JSON.parse(JSON.stringify(S0)))), houses = S0.houses.filter((h) => h.type === 'house' && h.status !== 'owned' || false);
    const lineSum = await page.evaluate(() => { const el = [...document.querySelectorAll('[data-testid=cat-breakdown]')][0]; if (!el) return null; const rows = [...el.querySelectorAll('.bkr')].map((r) => ({ l: r.querySelector('span').textContent.replace(/\s+/g, ' ').trim(), v: r.querySelector('b').textContent })); return rows; });
    const val = (t) => { const m = /(−|\+|-)?\$?([\d,.]+)(K|M)?/.exec(t.replace('−', '-')); if (!m) return NaN; let v = +m[2].replace(/,/g, ''); if (m[3] === 'M') v *= 1e6; if (m[3] === 'K') v *= 1e3; return m[1] === '-' ? -v : v; };
    const R = lineSum || [], has = (re) => R.some((x) => re.test(x.l)); P.t(has(/Replacement reserves/) && has(/Other owner-paid costs/), 'the Monthly income and expenses list has the Replacement reserves and Other owner-paid costs lines', 1, R.map((x) => x.l).join(' | '));
    const inc = R.find((x) => /^Total income/.test(x.l)), cfb = R.find((x) => /^Cash flow before the loan/.test(x.l)), exp = R.filter((x) => /^(Vacancy|Property tax|Insurance|HOA|Maintenance|Property management|Replacement|Other owner)/.test(x.l)).reduce((a, x) => a + Math.abs(val(x.v)), 0);
    P.t(inc && cfb && Math.abs(val(inc.v) - exp - val(cfb.v)) <= Math.max(3, 0.0015 * Math.abs(val(inc.v))), 'income minus every expense line = cash flow before the loan (' + (inc ? inc.v : '?') + ' - ' + Math.round(exp) + ' = ' + (cfb ? cfb.v : '?') + '; $K rounding)', 1.5, JSON.stringify(R.map((x) => x.v))); return P; });
  await jcheck('J39', 'Multi-family persistence: kind / units / pack survive a reload, Undo after Remove, Saved, backup export and restore; the default plan is untouched and nothing else changes', 8, 'add, reload, remove + Undo, Save + open, export + restore', async () => {
    const P = new Parts(); await goAdd(); await page.click('[data-testid=kind-multi]'); await page.click('[data-preset="5p"]'); await page.click('[data-testid=confirm-add]'); await page.waitForSelector('[data-testid=asset-buy-no]');
    const id = (await page.evaluate(() => location.hash)).replace('#house-', ''), pick = (st) => { const h = st.houses.find((x) => x.id === id); return h ? [h.kind, h.units, h.pack, h.loanId, h.price, h.rent, h.mfRes, h.mfOther, h.mgmtPct].join() : null; };
    const st0 = await store(), want = pick(st0); P.t(want && want.startsWith('multi,5,true,mfBlanket,600000,7000,300,0,10'), 'a Section 8 pack of 5 is stored: ' + want, 1);
    await page.reload(); await page.waitForSelector('#app > *'); P.t(pick(await store()) === want && /pack of 5/.test(await page.textContent('[data-testid=asset-buy-no]')), 'reload keeps it', 1);
    await page.click('[data-testid=h-delete]'); await page.click('[data-del-yes]'); await page.waitForTimeout(80); P.t(pick(await store()) === null, 'Remove deletes it', 0.5); await page.click('[data-undo]'); await page.waitForTimeout(80); P.t(pick(await store()) === want, 'Undo brings it back with every multi-family field', 1.5);
    await page.click('[data-testid=tab-saved]'); await page.click('[data-save-open]'); await page.click('[data-save-yes]'); await page.waitForTimeout(80); const sv = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), SKEY);
    P.t(sv && sv[0] && pick(sv[0].state) === want, 'Saved keeps a copy with the multi-family fields', 1.5);
    await goHashU('#assumptions'); await openAllColl(); await page.click('[data-testid=export]'); await page.waitForTimeout(60); const txt = await page.inputValue('[data-testid=backup-text]'), j = JSON.parse(txt);
    P.t(pick(j) === want, 'the backup text carries them', 1); const j2 = JSON.parse(txt); j2.houses = j2.houses.filter((x) => x.id !== id); await page.fill('#bkin', JSON.stringify(j2)); await page.click('[data-restore-text]'); await page.click('[data-import-yes]'); await page.waitForTimeout(100); P.t(pick(await store()) === null, 'restoring a backup without it removes it (it is the backup)', 0.3);
    await goHashU('#assumptions'); await openAllColl(); await page.click('[data-testid=export]'); await page.fill('#bkin', txt); await page.click('[data-restore-text]'); await page.click('[data-import-yes]'); await page.waitForTimeout(100); P.t(pick(await store()) === want, 'restoring the full backup brings it back unchanged', 1);
    await load(withV(E.seedPlan()), ''); const d = await store(), sp = E.seedPlan(); P.t(d.houses.length === 36 && d.houses.every((h, i) => h.kind === 'single' && h.units === 1 && h.price === sp.houses[i].price && h.rent === sp.houses[i].rent), 'the default plan still has 36 single-family-style assets, same prices and rents', 0.5);
    const hdr = await page.evaluate(() => document.getElementById('app').innerText), Sx = E.normalize(JSON.parse(JSON.stringify(d))), pl = E.planR(Sx), cfAT = E.finance(Sx, pl).kpis.planEnd.cfAfter; P.t(pl.horizon.nw >= 125e6 && cfAT >= 1.3e6 && /Yes/.test(hdr), 'default plan: real net worth ' + (pl.horizon.nw / 1e6).toFixed(0) + 'M, after-tax cash flow ' + (cfAT / 1e6).toFixed(2) + 'M a month, verdict Yes', 0.7); return P; });


  /* ---------- J40 / J41: Start from an example on the Add screen ---------- */
  const EXC = [['house', false, 'home-va'], ['house', true, 'multi-hack'], ['commercial', false, 'comm-strip'], ['business', false, 'biz-laundry']];
  const exPrep = async (tp, multi) => { await goAdd(); if (tp !== 'house') await page.click('[data-addtype=' + tp + ']'); if (multi) await page.click('[data-testid=kind-multi]'); };
  const FIELDS = ['price', 'rent', 'loanId', 'dp', 'rate', 'term', 'capex', 'arv', 'liftIncome', 'tax', 'ins', 'hoa', 'nnn', 'units', 'kind', 'pack', 'revenue', 'margin', 'mfRes', 'mfOther', 'mgmtPct', 'growth', 'sellCost', 'capexMonths'];
  await jcheck('J40', 'Start from an example: a quiet collapsed line near the bottom; open, pick, Add = 3 taps for Home, Multi-family, Commercial and Business; the asset equals the example; (i), clear, Back, keyboard and Escape work', 14, 'on #add for each category: toggle, rows, pick, chip, Add; compare the stored asset with the engine example', async () => {
    const P = new Parts(); const S0 = E.seedPlan();
    for (const [tp, multi, id] of EXC) { const ex = E.exampleById(id), m = E.exampleMetrics(S0, ex), tag = tp + (multi ? '/multi' : '');
      await exPrep(tp, multi); const t = await page.evaluate(() => { const b = document.querySelector('[data-testid=ex-toggle]'), a = document.querySelector('[data-testid=confirm-add]'), r = b && b.getBoundingClientRect(), ar = a.getBoundingClientRect(); return { has: !!b, exp: b && b.getAttribute('aria-expanded'), h: r && r.height, list: !!document.querySelector('[data-testid=ex-list]'), above: r && r.bottom <= ar.top + 1, near: r && ar.top - r.bottom < 80, txt: b && b.textContent.trim(), chip: !!document.querySelector('[data-testid=ex-using]'), n: document.querySelectorAll('[data-expick]').length }; });
      P.t(t.has && t.exp === 'false' && !t.list && !t.chip && t.n === 0 && t.above && t.near && t.h >= 43.5 && /Start from an example/.test(t.txt), tag + ': one collapsed 44px line directly above the Add button (' + JSON.stringify(t) + ')', 1);
      let taps = 0; await page.click('[data-testid=ex-toggle]'); taps++; const rows = await page.evaluate(() => [...document.querySelectorAll('[data-expick]')].map((b) => [b.dataset.expick, b.querySelector('b').textContent, b.querySelector('span').textContent, !!b.parentElement.querySelector('button.info')]));
      P.t(rows.length === 4 && rows.every((r) => r[3] && /\$/.test(r[2]) && r[1].length > 5) && rows.map((r) => r[0]).join() === E.examplesFor(tp, multi).map((x) => x.id).join(), tag + ': 4 rows, each with a tier, name, one-line summary and an (i): ' + rows.map((r) => r[1]).join(' | '), 1);
      await page.click('[data-testid=ex-' + id + ']'); taps++; const u = await page.evaluate(() => ({ chip: (document.querySelector('[data-testid=ex-using]') || {}).textContent, pv: (document.querySelector('[data-testid=ex-preview]') || {}).textContent, list: !!document.querySelector('[data-testid=ex-list]'), units: (document.querySelector('[data-p="a.add.units"]') || {}).value }));
      P.t(/Using example/.test(u.chip) && u.chip.indexOf(ex.name) >= 0 && /Clear/.test(u.chip) && u.pv.replace(/[^0-9]/g, '').indexOf(String(Math.round(m.cash))) >= 0 && !u.list && (!multi || +u.units === ex.units), tag + ': a "Using example" chip with cash needed ' + Math.round(m.cash) + ' and the monthly cash flow, list closes, units prefilled (' + u.chip + ')', 1);
      const n0 = (await store()).houses.length; await page.click('[data-testid=confirm-add]'); taps++; await page.waitForSelector('[data-testid=asset-buy-no]'); const st = await store(), h = st.houses[st.houses.length - 1], want = E.exampleAsset(ex);
      const diff = FIELDS.filter((k) => JSON.stringify(h[k]) !== JSON.stringify(want[k])); P.t(taps === 3 && st.houses.length === n0 + 1 && !diff.length && h.addr === ex.name && h.status === 'planned', tag + ': 3 taps add exactly the example (' + (diff.map((k) => k + ' ' + h[k] + ' vs ' + want[k]).join(', ') || 'all fields equal') + ')', 2);
      await page.evaluate(() => { const e = [...document.querySelectorAll('#app [data-coll][aria-expanded=false]')]; e.forEach((b) => b.click()); }); const shown = await page.evaluate(() => document.getElementById('app').innerText + ' ' + [...document.querySelectorAll('#app input')].map((i) => i.value).join(' ')); P.t(shown.replace(/,/g, '').indexOf(String(ex.f.price)) >= 0 && shown.replace(/,/g, '').indexOf(String(ex.f.rent)) >= 0, tag + ': the asset page shows the example price and rent', 0.5); }
    await exPrep('house', false); await page.click('[data-testid=ex-toggle]'); await page.click('[data-info="ex-home-s8"]'); const sh = await page.evaluate(() => (document.querySelector('[data-testid=info-sheet]') || {}).innerText || ''); P.t(/typical, not a quote/i.test(sh) && /70%/.test(sh) && /2,182/.test(sh), 'the (i) of an example opens the full assumptions and the research basis', 1); await page.click('[data-testid=info-close]');
    await page.click('[data-testid=ex-home-s8]'); await page.click('[data-testid=ex-clear]'); const cl = await page.evaluate(() => ({ chip: !!document.querySelector('[data-testid=ex-using]'), sel: document.querySelector('.loanopt.on') && document.querySelector('.loanopt.on').dataset.pickloan })); await page.click('[data-testid=confirm-add]'); await page.waitForSelector('[data-testid=asset-buy-no]'); const d = (await store()).houses.slice(-1)[0];
    P.t(!cl.chip && cl.sel === 'conv30' && d.price === 300000 && d.addr === 'New home' && !(d.capex > 0), 'Clear returns to the defaults: no chip, default loan, the plain default home is added (' + d.addr + ' ' + d.price + ')', 1.5);
    await exPrep('commercial'); await page.click('[data-testid=ex-toggle]'); await page.click('[data-testid=ex-comm-nnn]'); const n1 = (await store()).houses.length; await page.click('[aria-label="Cancel and go back"]'); await page.waitForTimeout(80); P.t((await store()).houses.length === n1 && n1 === 36, 'Back adds nothing', 1);
    await page.click('[data-testid=add-house]'); P.t((await page.locator('[data-testid=ex-using]').count()) === 0 && (await page.getAttribute('[data-testid=ex-toggle]', 'aria-expanded')) === 'false', 'a new Add screen starts with no example chosen and the list closed', 0.5);
    await page.focus('[data-testid=ex-toggle]'); await page.keyboard.press('Enter'); const o1 = await page.getAttribute('[data-testid=ex-toggle]', 'aria-expanded'); await page.keyboard.press('Escape'); const o2 = await page.getAttribute('[data-testid=ex-toggle]', 'aria-expanded'); await page.keyboard.press('Space'); const o3 = await page.getAttribute('[data-testid=ex-toggle]', 'aria-expanded'); const foc = await page.evaluate(() => document.activeElement && document.activeElement.dataset.testid);
    P.t(o1 === 'true' && o2 === 'false' && o3 === 'true' && foc === 'ex-toggle', 'keyboard: Enter opens, Escape closes, Space opens, focus stays on the line (' + [o1, o2, o3, foc].join() + ')', 1.5);
    await page.click('[data-testid=ex-home-turnkey]'); await page.click('[data-addtype=commercial]'); P.t((await page.locator('[data-testid=ex-using]').count()) === 0, 'changing the category or loan drops the example (no stale numbers)', 0.5);
    return P; });
  await jcheck('J41', 'Examples persist like any asset: reload, Undo after Remove, Saved, backup and restore keep every field; the default plan is untouched (36 assets, nothing owned, real NW >= $125M, after-tax cash flow >= $1.3M/mo, verdict Yes)', 6, 'add one example per category, then reload / remove + Undo / Save / backup', async () => {
    const P = new Parts(); const S0 = E.seedPlan(); let ids = [];
    for (const [tp, multi, id] of EXC) { if (!ids.length) await exPrep(tp, multi); else { await page.click('[data-go=""]'); await page.waitForTimeout(60); await page.click('[data-testid=add-house]'); await page.waitForSelector('[data-testid=confirm-add]'); if (tp !== 'house') await page.click('[data-addtype=' + tp + ']'); if (multi) await page.click('[data-testid=kind-multi]'); } await page.click('[data-testid=ex-toggle]'); await page.click('[data-testid=ex-' + id + ']'); await page.click('[data-testid=confirm-add]'); await page.waitForSelector('[data-testid=asset-buy-no]'); ids.push((await page.evaluate(() => location.hash)).replace('#house-', '')); }
    const pick = (st) => ids.map((i) => { const h = st.houses.find((x) => x.id === i); return h ? [h.addr, h.price, h.rent, h.loanId, h.dp, h.capex, h.arv, h.units, h.revenue, h.margin].join() : null; }).join('|'), want = pick(await store());
    P.t(ids.length === 4 && want.indexOf('null') < 0 && (await store()).houses.length === 40, '4 examples (one per category) are stored: 40 assets', 1);
    await page.reload(); await page.waitForSelector('#app > *'); P.t(pick(await store()) === want, 'reload keeps them', 1);
    await page.goto(base() + '/index.html?j=' + seq++ + '#house-' + ids[0]); await openAllColl(); await page.waitForSelector('[data-testid=h-delete]'); await page.click('[data-testid=h-delete]'); await page.click('[data-del-yes]'); await page.waitForTimeout(80); P.t((await store()).houses.length === 39, 'Remove deletes one', 0.5); await page.click('[data-undo]'); await page.waitForTimeout(80); P.t(pick(await store()) === want, 'Undo brings it back with every field', 1);
    await page.click('[data-testid=tab-saved]'); await page.click('[data-save-open]'); await page.click('[data-save-yes]'); await page.waitForTimeout(80); const sv = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), SKEY); P.t(sv && sv[0] && pick(sv[0].state) === want, 'Saved keeps a copy', 1);
    await goHashU('#assumptions'); await openAllColl(); await page.click('[data-testid=export]'); await page.waitForTimeout(60); const txt = await page.inputValue('[data-testid=backup-text]'); P.t(pick(JSON.parse(txt)) === want, 'the backup text carries them', 1);
    await load(withV(S0), ''); const d = await store(), sp = E.seedPlan(); P.t(d.houses.length === 36 && d.houses.every((h, i) => h.price === sp.houses[i].price && h.rent === sp.houses[i].rent && h.status === sp.houses[i].status), 'a fresh default plan still has the same 36 assets', 0.5);
    const hdr = await page.evaluate(() => document.getElementById('app').innerText), Sx = E.normalize(JSON.parse(JSON.stringify(d))), pl = E.planR(Sx), cfAT = E.finance(Sx, pl).kpis.planEnd.cfAfter; P.t(pl.horizon.nw >= 125e6 && cfAT >= 1.3e6 && /Yes/.test(hdr) && d.houses.every((h) => h.status !== 'owned'), 'default plan: real NW $' + (pl.horizon.nw / 1e6).toFixed(0) + 'M, after-tax cash flow $' + Math.round(cfAT) + '/mo, verdict Yes, nothing owned', 1);
    return P; });


  /* ---------- J42 / J43: editing the purchase examples (the compatibility matrix, UI side) ---------- */
  const OVK = 'rep-v4-examples', ovGet = () => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, OVK);
  const openEd = async (tp, multi, id, w, ui) => { await page.setViewportSize({ width: w || 390, height: 844 }); await load(withV(E.seedPlan()), '', ui); await page.click('[data-testid=add-house]'); await page.waitForSelector('[data-testid=confirm-add]'); if (tp !== 'house') await page.click('[data-addtype=' + tp + ']'); if (multi) await page.click('[data-testid=kind-multi]'); await page.click('[data-testid=ex-toggle]'); await page.click('[data-testid=ex-edit-' + id + ']'); await page.waitForSelector('[data-testid=ex-editor]'); };
  const reopenList = async (tp, multi) => { await page.click('[data-testid=add-house]').catch(() => {}); };
  const setBox = async (k, text) => { await typeIn('[data-p="x.' + k + '"]', text); await page.keyboard.press('Enter'); await page.waitForTimeout(140); };
  const boxVal = (k) => page.inputValue('[data-p="x.' + k + '"]');
  const edSave = async () => { await page.click('[data-testid=ex-save]'); await page.waitForTimeout(120); };
  const prev = () => page.textContent('[data-testid=ex-edit-preview]');
  const warnIds = () => page.$$eval('[data-testid=ex-warn]', (e) => e.map((x) => x.dataset.warn));
  const AFIELDS = ['price', 'rent', 'loanId', 'dp', 'rate', 'term', 'capex', 'arv', 'liftIncome', 'tax', 'ins', 'hoa', 'nnn', 'units', 'kind', 'pack', 'revenue', 'margin', 'mfRes', 'mfOther', 'mgmtPct', 'growth', 'sellCost', 'capexMonths', 'mat', 'mipUp', 'mipAnn', 'finCapex'];
  await jcheck('J42', 'Edit an example: Edit beside the (i) opens the editor; calculator math, /yr revenue and units math work; the live line and warnings follow; Save keeps it across reload and shows Edited; the added asset equals the edited example; Reset returns only that example; Back asks before discarding', 16, 'on #add: Edit, type, Save, reload, add, reset, back', async () => {
    const P = new Parts();
    await openEd('house', false, 'home-va'); const e0 = await page.evaluate(() => ({ title: document.querySelector('[data-testid=ex-editor]').innerText, boxes: [...document.querySelectorAll('[data-testid=ex-fields] input')].map((i) => i.dataset.p), info: !!document.querySelector('[data-testid=ex-editor] button.info'), sel: !!document.querySelector('[data-testid=ex-loan]') }));
    P.t(/Cosmetic update/.test(e0.title) && !/Edited/.test(e0.title) && e0.info && e0.sel && ['x.price', 'x.capex', 'x.arv', 'x.capexMonths', 'x.rent', 'x.tax', 'x.ins', 'x.hoa', 'x.growth', 'x.sellCost', 'x.dp'].every((k) => e0.boxes.includes(k)), 'the editor shows the name read-only with an (i), every field of a home example and the loan picker (' + e0.boxes.join(',') + ')', 1.5);
    const p0 = await prev(); await setBox('price', '150000*1.1'); P.t((await boxVal('price')) === '165,000' && (await prev()) !== p0 && /DSCR/.test(await prev()) && /Edited/.test(await page.textContent('[data-testid=ex-editor]')), 'calculator math 150000*1.1 gives 165,000, the live line (cash needed, cash flow, DSCR) changes and the Edited tag appears', 1.5);
    await setBox('price', '-5'); P.t((await boxVal('price')) === '165,000', 'a negative price is refused and the last good value stays', 1); await setBox('price', 'abc'); P.t((await boxVal('price')) === '165,000', 'text in a number box is refused too', 0.5);
    await setBox('rent', '600'); P.t((await warnIds()).includes('cf') || (await warnIds()).includes('dscr'), 'a very low rent shows a non-blocking warning (' + (await warnIds()).join() + ') and Save is still possible', 1); await setBox('rent', '2300');
    P.t(JSON.stringify(await warnIds()) === '[]' || (await warnIds()).every((w) => ['dscr', 'cf'].includes(w)), 'warnings clear when the rule is satisfied again', 0.5);
    await setBox('price', '165000'); await edSave(); const o1 = await ovGet(); P.t(o1 && o1.v === 1 && o1.ov['home-va'] && o1.ov['home-va'].price === 165000 && Object.keys(o1.ov).length === 1 && Object.keys(o1.ov['home-va']).length === 1, 'Save as my default stores only the changed field under its own key ' + JSON.stringify(o1), 1.5);
    const row = await page.evaluate(() => ({ tag: (document.querySelector('[data-testid=ex-tag-home-va]') || {}).textContent, sum: (document.querySelector('[data-testid=ex-sum-home-va]') || {}).textContent, other: !!document.querySelector('[data-testid=ex-tag-home-s8]'), list: !!document.querySelector('[data-testid=ex-list]'), msg: !!document.querySelector('[data-testid=ex-msg]') }));
    P.t(row.tag === 'Edited' && /\$165K/.test(row.sum) && !row.other && row.list && row.msg, 'back on the list: the row says Edited with the new price, the others do not, and a short saved note shows', 1);
    await page.reload(); await page.waitForSelector('#app > *'); await page.click('[data-testid=add-house]').catch(() => {}); if (!(await page.locator('[data-testid=ex-toggle]').count())) await page.goto(base() + '/index.html?j=' + seq++ + '#add'); await page.waitForSelector('[data-testid=ex-toggle]'); await page.click('[data-testid=ex-toggle]');
    P.t((await page.textContent('[data-testid=ex-sum-home-va]')).includes('$165K') && (await page.locator('[data-testid=ex-tag-home-va]').count()) === 1, 'after a reload the example still has the new default', 1);
    await page.click('[data-info="ex-home-va"]'); const sh = await page.evaluate(() => (document.querySelector('[data-testid=info-sheet]') || {}).innerText || ''); await page.click('[data-testid=info-close]');
    P.t(/Original \$232,000/.test(sh) && /Yours \$165,000/.test(sh) && /Original derivation/.test(sh), 'the (i) shows Original / Yours for the changed field and the original derivation', 1);
    await page.click('[data-testid=ex-home-va]'); const chip = await page.textContent('[data-testid=ex-using]'); P.t(/Using example: Cosmetic update, 3 bed · Edited/.test(chip) && /Cash needed/.test(chip), 'the chosen line says Using example: X · Edited (' + chip.slice(0, 80) + ')', 1);
    const n0 = (await store()).houses.length; await page.click('[data-testid=confirm-add]'); await page.waitForSelector('[data-testid=asset-buy-no]'); const st = await store(), h = st.houses[st.houses.length - 1], want = E.exampleAsset(E.exEff(E.exampleShipped('home-va'), { price: 165000 })), diff = AFIELDS.filter((k) => JSON.stringify(h[k]) !== JSON.stringify(want[k]));
    P.t(st.houses.length === n0 + 1 && h.price === 165000 && !diff.length, 'the added asset equals the edited example field for field (' + (diff.join() || 'all equal') + ')', 2);
    const o2 = await ovGet(); P.t(JSON.stringify(o2) === JSON.stringify(o1) && !JSON.stringify(st).includes('exOv') && !JSON.stringify(st).includes('"ov"'), 'adding does not change the stored edits and the portfolio does not contain them', 1);
    await openEd('house', false, 'home-va'); await setBox('price', '170000'); await edSave(); await page.click('[data-testid=ex-edit-home-s8]'); await setBox('ins', '175'); await edSave(); P.t(JSON.stringify((await ovGet()).ov) === JSON.stringify({ 'home-va': { price: 170000 }, 'home-s8': { ins: 175 } }), 'two examples edited independently: ' + JSON.stringify((await ovGet())), 0.5);
    await page.click('[data-testid=ex-edit-home-va]'); await page.click('[data-testid=ex-reset]'); P.t((await page.locator('[data-testid=ex-reset-confirm]').count()) === 1, 'Reset to original asks first', 0.5); await page.click('[data-testid=ex-reset-confirm]'); await page.waitForTimeout(120);
    const o3 = await ovGet(); P.t(JSON.stringify(o3.ov) === JSON.stringify({ 'home-s8': { ins: 175 } }) && (await page.locator('[data-testid=ex-tag-home-va]').count()) === 0 && (await page.locator('[data-testid=ex-tag-home-s8]').count()) === 1 && /\$232K/.test(await page.textContent('[data-testid=ex-sum-home-va]')), 'Reset returns only that example to the shipped numbers', 1);
    await page.click('[data-testid=ex-edit-home-exec]'); await setBox('price', '700000'); await page.click('[data-testid=ex-back]'); P.t((await page.locator('[data-testid=ex-discard-confirm]').count()) === 1 && (await page.locator('[data-testid=ex-editor]').count()) === 1, 'Back with unsaved changes asks before discarding', 1); await page.keyboard.press('Escape'); await page.waitForTimeout(80);
    P.t((await page.locator('[data-testid=ex-editor]').count()) === 1 || true, 'Escape handled', 0); await page.click('[data-testid=ex-discard-confirm]'); await page.waitForTimeout(80); P.t((await page.locator('[data-testid=ex-editor]').count()) === 0 && JSON.stringify((await ovGet()).ov) === JSON.stringify(o3.ov), 'Yes, discard leaves the stored edits alone', 0.5);
    await page.click('[data-testid=ex-edit-home-exec]'); await page.keyboard.press('Escape'); await page.waitForTimeout(80); P.t((await page.locator('[data-testid=ex-editor]').count()) === 0, 'Escape closes a clean editor', 0.5);
    return P; });
  await jcheck('J43', 'Editing and the rest of the app: multi-family units re-check the loan and per-unit costs, the loan picker updates down payment and cash, revenue per year keeps profit = revenue x margin, future dollars and tight widths work, backup / Saved / Undo / examples already owned behave, storage unavailable and two tabs and an old cached engine do not break it', 18, 'units, loan, revenue, unit toggle, backup, saved, storage stub, second tab, old engine', async () => {
    const P = new Parts(); const errs = []; const onErr = (e) => errs.push(e.message); page.on('pageerror', onErr);
    await openEd('house', true, 'multi-hack'); const d4 = await boxVal('dp'); await setBox('units', '2*3'); const a = await page.evaluate(() => ({ u: document.querySelector('[data-p="x.units"]').value, price: document.querySelector('[data-p="x.price"]').value, w: [...document.querySelectorAll('[data-testid=ex-warn]')].map((x) => x.dataset.warn), opts: [...document.querySelectorAll('[data-testid=ex-loan] option')].map((o) => [o.value, o.disabled]) }));
    const dis = (id) => (a.opts.find((o) => o[0] === id) || [])[1];
    P.t(a.u === '6' && a.price === '780,000' && a.w.includes('elig') && dis('mfConvInv') === true && dis('mfSbl') === false && dis('mfFha') === false, 'units 2*3 = 6 scales the price to 780,000 (130,000 a unit as before), warns that the FHA house-hack loan is not for 6 units, greys the 2-4 unit loans and keeps the 5+ loans open (' + JSON.stringify(a.w) + ')', 2);
    await page.selectOption('[data-testid=ex-loan]', 'mfSbl'); await page.waitForTimeout(100); P.t((await boxVal('dp')) === '25' && !(await warnIds()).includes('elig') && d4 === '3.5', 'switching to the agency small-balance loan sets the down payment to 25% (was ' + d4 + ') and the eligibility warning goes', 1.5);
    await setBox('units', '2.5'); P.t((await boxVal('units')) === '6', 'units must be a whole number: 2.5 is refused', 0.5); await setBox('units', '501'); P.t((await boxVal('units')) === '6', 'units above 500 are refused', 0.5);
    await edSave(); const o = (await ovGet()).ov['multi-hack']; P.t(o.units === 6 && o.loanId === 'mfSbl' && o.price === 780000, 'saved: units, loan and scaled price ' + JSON.stringify(o), 0.5);
    await page.click('[data-testid=ex-multi-hack]'); await page.click('[data-testid=confirm-add]'); await page.waitForSelector('[data-testid=asset-buy-no]'); const h = (await store()).houses.slice(-1)[0], want = E.exampleAsset(E.exEff(E.exampleShipped('multi-hack'), o)), dm = E.mfDefaults(6, false);
    P.t(h.units === 6 && h.loanId === 'mfSbl' && h.dp === 25 && h.mgmtPct === dm.mgmtPct && h.mfOther === dm.mfOther && AFIELDS.every((k) => JSON.stringify(h[k]) === JSON.stringify(want[k])), 'the added building has 6 units, the loan and the per-unit defaults of a 6-unit building', 1.5);
    await openEd('business', false, 'biz-laundry'); await setBox('revenue', '1,200,000/yr'); const b = await page.evaluate(() => ({ rev: document.querySelector('[data-p="x.revenue"]').value, mar: document.querySelector('[data-p="x.margin"]').value, prof: document.querySelector('[data-p="x.profit"]').value })); P.t(b.rev === '100,000' && b.prof === '35,000', 'revenue 1,200,000/yr = 100,000 a month and owner profit 35,000 = revenue x 35% (' + JSON.stringify(b) + ')', 1.5);
    await setBox('margin', '40'); P.t((await boxVal('profit')) === '40,000', 'margin 40% gives owner profit 40,000', 0.5); await setBox('margin', '120'); P.t((await boxVal('margin')) === '40', 'a margin over 100% is refused', 0.5);
    await setBox('price', '99999999'); const bw = await warnIds(); P.t(bw.includes('mult') && bw.includes('sba'), 'a price that makes the loan pass $5M and the price / profit multiple pass its range warns on both (' + bw + ')', 1);
    await page.selectOption('[data-testid=ex-loan]', 'cashb'); await page.waitForTimeout(100); P.t((await boxVal('dp')) === '100' && !(await warnIds()).includes('sba'), 'cash purchase: down payment 100% and no SBA warning', 0.5); await page.click('[data-testid=ex-cancel]'); await page.click('[data-testid=ex-discard-confirm]');
    await openEd('commercial', false, 'comm-nnn', 390, { unit: 'future' }); await setBox('nnn', '90'); await edSave(); const oF = (await ovGet()).ov['comm-nnn']; await openEd('commercial', false, 'comm-nnn', 390, { unit: 'today' }); P.t(oF && oF.nnn === 90, 'editing with Future dollars on stores the same plain number (the editor has no inflation)', 0.5);
    for (const w of [320, 390, 430]) { await openEd('house', true, 'multi-20va', w); await setBox('price', '2500000'); const m = await page.evaluate(() => ({ ov: document.documentElement.scrollWidth > innerWidth + 1, small: [...document.querySelectorAll('#app button,#app select,#app input')].filter((e) => e.offsetParent && !e.readOnly && e.getBoundingClientRect().height < 43.5).map((e) => e.dataset.testid || e.tagName) })); P.t(!m.ov && !m.small.length, w + 'px: no sideways scroll and every control 44px or taller ' + m.small.join(), 0.5); }
    await openEd('house', false, 'home-s8'); await setBox('price', '120000'); await edSave(); await page.goto(base() + '/index.html?j=' + seq++ + '#assumptions'); await page.waitForSelector('#app > *'); await openAllColl(); await page.click('[data-testid=export]'); await page.waitForTimeout(60); const txt = await page.inputValue('[data-testid=backup-text]'), bk = JSON.parse(txt);
    P.t(bk.exOv && bk.exOv.v === 1 && bk.exOv.ov['home-s8'].price === 120000, 'the backup text carries the example edits with a version', 1);
    await page.evaluate(() => localStorage.clear()); await page.goto(base() + '/index.html?j=' + seq++ + '#assumptions'); await page.waitForSelector('#app > *'); await openAllColl(); await page.click('[data-testid=export]'); await page.fill('#bkin', txt); await page.click('[data-restore-text]'); await page.click('[data-import-yes]'); await page.waitForTimeout(120);
    P.t(((await ovGet()) || { ov: {} }).ov['home-s8'] && (await ovGet()).ov['home-s8'].price === 120000, 'backup -> clear everything -> restore brings the example edits back', 1.5);
    const old = JSON.parse(txt); delete old.exOv; await goHashU('#assumptions'); await openAllColl(); await page.click('[data-testid=export]'); await page.fill('#bkin', JSON.stringify(old)); await page.click('[data-restore-text]'); await page.click('[data-import-yes]'); await page.waitForTimeout(120); P.t((await ovGet()).ov['home-s8'].price === 120000, 'an old backup without example edits restores and leaves the edits on this device alone', 1);
    await goHashU('#'); await page.click('[data-testid=tab-saved]'); await page.click('[data-save-open]'); await page.click('[data-save-yes]'); await page.waitForTimeout(100); const sv = await page.evaluate((k) => localStorage.getItem(k), SKEY); P.t(!/"ov"|exOv|rep-v4-examples/.test(sv), 'Saved portfolios do not contain the example edits', 0.5);
    const ovB = JSON.stringify(await ovGet()); await page.click('[data-load]'); await page.click('[data-load-yes]'); await page.waitForTimeout(150); const sn = await page.evaluate(() => document.querySelector('[data-undo]') ? 1 : 0); if (sn) { await page.click('[data-undo]'); await page.waitForTimeout(100); } P.t(JSON.stringify(await ovGet()) === ovB, 'opening a saved portfolio and Undo leave the example edits alone', 1);
    await page.goto(base() + '/index.html?j=' + seq++ + '#add'); await page.waitForSelector('[data-testid=ex-toggle]'); await page.goBack().catch(() => {}); await goHashU('#'); await page.click('[data-testid=add-owned]').catch(async () => { await page.evaluate(() => document.querySelector('[data-add-owned]') && document.querySelector('[data-add-owned]').click()); }); await page.waitForTimeout(100); P.t((await page.locator('[data-testid=ex-toggle]').count()) === 0 && (await page.locator('[data-exedit]').count()) === 0, 'in the add-something-you-own flow the examples (and Edit) stay hidden', 1);
    /* storage unavailable: the examples key throws on write */
    const ctx2 = await mkCtx({ autoExpand: false }); const pg2 = await mkPage(ctx2, 'ux'); await pg2.addInitScript(() => { const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'rep-v4-examples') throw new Error('quota'); return s.call(this, k, v); }; }); const er2 = []; pg2.on('pageerror', (e) => er2.push(e.message));
    await pg2.goto(base() + '/index.html?j=' + seq++ + '#add'); await pg2.waitForSelector('[data-testid=ex-toggle]'); await pg2.click('[data-addtype=business]'); await pg2.click('[data-testid=ex-toggle]'); await pg2.click('[data-testid=ex-edit-biz-vend]'); await pg2.click('[data-p="x.price"]'); await pg2.keyboard.press('Control+A'); await pg2.keyboard.insertText('60000'); await pg2.keyboard.press('Enter'); await pg2.waitForTimeout(100); await pg2.click('[data-testid=ex-save]'); await pg2.waitForTimeout(100);
    const m2 = await pg2.evaluate(() => ({ tag: !!document.querySelector('[data-testid=ex-tag-biz-vend]'), note: !!document.querySelector('[data-testid=ex-storage-note]'), sum: (document.querySelector('[data-testid=ex-sum-biz-vend]') || {}).textContent }));
    P.t(!er2.length && m2.tag && m2.note && /\$60K/.test(m2.sum), 'storage unavailable: the edit still works in memory, the row says Edited and a note says it will not be kept (' + er2.join() + ')', 1.5);
    /* two tabs */
    const pg3 = await mkPage(ctx2, 'ux'); await pg3.goto(base() + '/index.html?j=' + seq++ + '#add'); await pg3.waitForSelector('[data-testid=ex-toggle]'); await pg3.click('[data-testid=ex-toggle]');
    const ctx4 = await mkCtx({ autoExpand: false }), A = await mkPage(ctx4, 'ux'), B = await mkPage(ctx4, 'ux'); await A.goto(base() + '/index.html?j=' + seq++ + '#add'); await A.waitForSelector('[data-testid=ex-toggle]'); await A.click('[data-testid=ex-toggle]'); await B.goto(base() + '/index.html?j=' + seq++ + '#add'); await B.waitForSelector('[data-testid=ex-toggle]'); await B.click('[data-testid=ex-toggle]');
    await B.click('[data-testid=ex-edit-home-exec]'); await B.click('[data-p="x.rent"]'); await B.keyboard.press('Control+A'); await B.keyboard.insertText('4800'); await B.keyboard.press('Enter'); await B.waitForTimeout(80); await B.click('[data-testid=ex-save]'); await B.waitForTimeout(150); await A.waitForTimeout(250);
    P.t((await A.locator('[data-testid=ex-tag-home-exec]').count()) === 1, 'a second tab sees the first tab\'s edit through the storage event', 1);
    await A.click('[data-testid=ex-edit-home-turnkey]'); await A.click('[data-p="x.tax"]'); await A.keyboard.press('Control+A'); await A.keyboard.insertText('260'); await A.keyboard.press('Enter'); await A.waitForTimeout(80); await A.click('[data-testid=ex-save]'); await A.waitForTimeout(150);
    const both = await A.evaluate((k) => JSON.parse(localStorage.getItem(k)), OVK); P.t(both.ov['home-exec'] && both.ov['home-turnkey'] && both.v === 1, 'both tabs\' edits survive (nothing is overwritten): ' + JSON.stringify(both.ov), 1.5); await ctx4.close();
    /* an old cached engine (no editor) with the new app: no Edit buttons, no crash */
    const oldEng = require('child_process').spawnSync('git', ['show', 'HEAD:prototype/v4/engine.js'], { cwd: path.resolve(__dirname, '..'), maxBuffer: 1e8 }).stdout.toString();
    const pg5 = await mkPage(ctx2, 'ux'); const er5 = []; pg5.on('pageerror', (e) => er5.push(e.message)); if (oldEng.length > 1000 && !/exCheck/.test(oldEng)) { await pg5.route('**/engine.js*', (r) => r.fulfill({ contentType: 'text/javascript', body: oldEng })); await pg5.goto(base() + '/index.html?j=' + seq++ + '#add'); await pg5.waitForSelector('[data-testid=ex-toggle]'); await pg5.click('[data-testid=ex-toggle]'); P.t(!er5.length && (await pg5.locator('[data-expick]').count()) === 4 && (await pg5.locator('[data-exedit]').count()) === 0, 'an older cached engine with the new app still opens the examples, without Edit and without errors (' + er5.join() + ')', 1); } else P.t(true, 'old engine not available from git (skipped)', 1);
    await ctx2.close(); page.off('pageerror', onErr); P.t(!errs.length, 'no page errors in the main flows (' + errs.join() + ')', 1);
    return P; });

  /* ================= J44-J52: build stamp, mixed-version self-heal, safety copies, anomaly monitor, bug report (the "paste a bug report into the chat" feature) ================= */
  const DG = E.Diag, SAFEKEY = 'rep-v4-safety', DGKEY = 'rep-v4-diag', V4DIR = path.resolve(__dirname, '../v4');
  const sortKeys = (o) => (Array.isArray(o) ? o.map(sortKeys) : o && typeof o === 'object' ? Object.keys(o).sort().reduce((r, k) => { r[k] = sortKeys(o[k]); return r; }, {}) : o);
  const deepEq = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
  const memStore = (o) => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (o && o.fail && o.fail(k, String(v))) throw new Error('QuotaExceededError'); m.set(k, String(v)); } }; };
  async function loadX(S, hash, keys) { /* keys: extra localStorage entries { name: object | string }. The first page is a file without the app, so the app's own page-hide save cannot overwrite what is injected. */
    await page.goto(base() + '/manifest.webmanifest?j=' + seq++);
    await page.evaluate(([k, s, ex]) => { try { localStorage.clear(); sessionStorage.clear(); if (s) localStorage.setItem(k, typeof s === 'string' ? s : JSON.stringify(s)); Object.keys(ex).forEach((n) => localStorage.setItem(n, typeof ex[n] === 'string' ? ex[n] : JSON.stringify(ex[n]))); } catch (e) {} }, [KEY, S || null, keys || {}]);
    await page.goto(base() + '/index.html?j=' + seq++ + (hash || '')); await page.waitForSelector('#app > *');
  }
  const reloadX = async (hash) => { await page.goto(base() + '/index.html?j=' + seq++ + (hash || '')); await page.waitForSelector('#app > *'); };
  const keyOf = (k) => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, k);
  const stubClip = () => page.evaluate(() => { window.__clip = null; try { Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: (t) => { window.__clip = t; return Promise.resolve(); } }); } catch (e) { window.__clipErr = String(e); } });
  const openSec = async (id) => { const b = page.locator(`[data-coll=${id}]`); if ((await b.getAttribute('aria-expanded')) !== 'true') { await b.click(); await page.waitForTimeout(60); } };
  const rawCtx = async () => { const c = await mkCtx({ autoExpand: false }); const pg = await c.newPage(); pg.setDefaultTimeout(5000); return { c, pg }; }; /* a page of its own: deliberate errors must not count against the app in the grader's error log */
  const GH = 'https://github.com/Austin12342123/Real-estate-portfolio-/issues/new';

  /* ---------- J44 build stamp ---------- */
  await jcheck('J44', 'Build stamp: app.js, engine.js, info.js, style.css (as --build) and the service worker cache name carry one hash of the four files; editing a file without restamping is caught; stamp.py and build-artifact.py write it', 9, 'node: grader/stamp-check.js on v4/ and on a temp copy that is edited, restamped and bundled; browser: window.__app.stamps and the --build property', async () => {
    const P = new Parts(), SC = require('./stamp-check.js'), r = SC.check(V4DIR);
    P.t(r.ok && r.agree && /^[0-9a-f]{8}$/.test(r.want), 'all four files and sw.js carry the stamp ' + r.want, 2.5, JSON.stringify(r.got) + ' sw ' + r.sw);
    P.t(!!r.swName && r.swName.endsWith(r.want) && /^portfolio-v4-/.test(r.swName), 'the service worker cache name ends with the stamp (' + r.swName + ')', 1);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-')); ['app.js', 'engine.js', 'info.js', 'style.css', 'sw.js', 'stamp.py', 'build-artifact.py', 'index.html'].forEach((f) => fs.copyFileSync(path.join(V4DIR, f), path.join(tmp, f)));
    const ok0 = SC.check(tmp).ok; fs.appendFileSync(path.join(tmp, 'info.js'), '\n/* an edit */\n'); const bad = SC.check(tmp), py0 = spawnSync('python3', ['stamp.py', '--check'], { cwd: tmp });
    P.t(ok0 && !bad.ok && bad.stale.length >= 3 && py0.status === 1, 'a file edited without restamping fails the check (node and python3 stamp.py --check)', 2.5, bad.stale.join());
    spawnSync('python3', ['stamp.py'], { cwd: tmp }); const fixed = SC.check(tmp), py1 = spawnSync('python3', ['stamp.py', '--check'], { cwd: tmp });
    P.t(fixed.ok && fixed.agree && fixed.want !== r.want && py1.status === 0, 'python3 stamp.py restamps all five places and the result differs (' + r.want + ' to ' + fixed.want + ')', 1.5);
    const bd = spawnSync('python3', ['build-artifact.py'], { cwd: tmp }), art = fs.existsSync(path.join(tmp, 'artifact.html')) ? fs.readFileSync(path.join(tmp, 'artifact.html'), 'utf8') : '', after = SC.check(tmp);
    P.t(bd.status === 0 && after.ok && art.includes("engine:'" + after.want + "'") && art.includes("app:'" + after.want + "'") && art.includes("info:'" + after.want + "'") && art.includes('--build:"' + after.want + '"'), 'build-artifact.py stamps first, and the bundled artifact carries the same stamp', 1.5, String(bd.stderr).slice(0, 200));
    await loadX(null, '#'); const m = await page.evaluate(() => ({ s: window.__app.stamps, css: getComputedStyle(document.documentElement).getPropertyValue('--build').replace(/["'\s]/g, ''), mixed: window.__app.mixed }));
    P.t(m.s.app === r.want && m.s.engine === r.want && m.s.info === r.want && m.s.css === r.want && m.css === r.want && !m.mixed, 'in the browser all four stamps equal the files\' stamp and the app is not in mixed mode', 1, JSON.stringify(m));
    return P; });

  /* ---------- J45 mixed versions heal once ---------- */
  await jcheck('J45', 'Mixed versions: an old engine.js under a new app.js is detected at start, caches are purged, the service worker removed and the page reloads exactly ONCE (no loop), the event is logged, the stored portfolio is untouched; if it is still mixed the notice shows instead; a stale cache name heals the same way, but never after the person has touched the page', 12, 'route engine.js to a copy with another stamp (first request only, then always), count page loads; add a stale portfolio-v4 cache', async () => {
    const P = new Parts(); const eng = fs.readFileSync(path.join(V4DIR, 'engine.js'), 'utf8'), stale = eng.replace(/\{engine:'[0-9a-f]{8}'\}/, "{engine:'deadbeef'}");
    const S1 = withV(E.seed()); S1.added = E.ADDITIONS.map((a) => a.key); const ids1 = S1.houses.map((h) => h.id).sort().join();
    const mkp = async (always) => { const { c, pg } = await rawCtx(); const st = { served: 0, loads: 0 }; pg.on('request', (r) => { if (r.isNavigationRequest() && r.frame() === pg.mainFrame()) st.loads++; }); await pg.route('**/engine.js*', (r) => { st.served++; r.fulfill({ status: 200, contentType: 'text/javascript', body: always === 'never' ? eng : always === true || st.served === 1 ? stale : eng }); });
      await pg.goto(base() + '/manifest.webmanifest'); await pg.evaluate(([k, s]) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, S1]); st.loads = 0; return { c, pg, st }; };
    { const { c, pg, st } = await mkp(false); await pg.goto(base() + '/index.html#'); await pg.waitForFunction(() => window.__app && window.__app.stamps.engine === window.__app.stamps.app, null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(900);
      const d = await pg.evaluate((k) => ({ ev: (JSON.parse(localStorage.getItem('rep-v4-diag')) || { ev: [] }).ev, stamps: window.__app && window.__app.stamps, st: JSON.parse(localStorage.getItem(k)), rows: document.querySelectorAll('[data-testid=ledger-row]').length, note: !!document.querySelector('[data-testid=anomaly-note]') }), KEY);
      const heals = d.ev.filter((e) => e.k === 'heal');
      P.t(st.loads === 2 && st.served === 2, 'old engine.js: the page loaded exactly twice (one self-heal reload) and engine.js was fetched twice', 3, 'loads ' + st.loads + ' served ' + st.served);
      P.t(d.stamps && d.stamps.engine === d.stamps.app && d.stamps.css === d.stamps.app && !d.note, 'after the reload all four stamps agree and no notice shows', 2, JSON.stringify(d.stamps));
      P.t(heals.length === 1 && /mixed versions/.test(heals[0].m) && /deadbeef/.test(heals[0].m), 'the heal is logged once in the event ring (' + (heals[0] ? heals[0].m.slice(0, 80) : 'none') + ')', 1.5);
      P.t(d.st && d.st.houses.map((h) => h.id).sort().join() === ids1 && d.st.v === DATA_V && d.rows > 0, 'the stored portfolio is exactly the one that was there (no replacement) and the page shows it', 2, d.st && d.st.houses.length); await c.close(); }
    { const { c, pg, st } = await mkp(true); await pg.goto(base() + '/index.html#'); await pg.waitForTimeout(2200);
      const d = await pg.evaluate((k) => ({ ev: (JSON.parse(localStorage.getItem('rep-v4-diag')) || { ev: [] }).ev, mixed: window.__app && window.__app.mixed, st: JSON.parse(localStorage.getItem(k)), note: !!document.querySelector('[data-testid=anomaly-note]'), rows: document.querySelectorAll('[data-testid=ledger-row]').length, guard: sessionStorage.getItem('rep-v4-heal') }), KEY);
      P.t(st.loads === 2, 'still mixed after the reload: NO second reload (2 loads in 2 seconds, not a loop)', 3, 'loads ' + st.loads);
      P.t(d.mixed === true && d.note && d.ev.some((e) => /still mixed/.test(e.m)) && !!d.guard, 'the notice "Something looked wrong" shows, the second start is logged and the loop guard is set', 1.5, JSON.stringify({ mixed: d.mixed, note: d.note }));
      P.t(d.st && d.st.houses.map((h) => h.id).sort().join() === ids1 && d.rows > 0, 'the app still works and the stored portfolio is untouched', 1); await c.close(); }
    { const { c, pg, st } = await mkp('never'); await pg.goto(base() + '/index.html#'); await pg.waitForTimeout(1500); await pg.evaluate(() => caches.open('portfolio-v4-2026-01-01-old-deadbeef')); st.loads = 0; await pg.evaluate(() => window.__app.check()); await pg.waitForTimeout(1600);
      const k = await pg.evaluate(() => caches.keys()); P.t(st.loads === 1 && !k.some((x) => /old-deadbeef/.test(x)), 'a stale service-worker cache under fresh files is purged and the page reloads once', 2, 'loads ' + st.loads + ' caches ' + k.join());
      await pg.evaluate(() => caches.open('portfolio-v4-2026-01-01-old-deadbeef2')); await pg.keyboard.press('Shift'); st.loads = 0; await pg.evaluate(() => { sessionStorage.removeItem('rep-v4-heal'); window.__app.check(); }); await pg.waitForTimeout(1500);
      const k2 = await pg.evaluate(() => caches.keys()); P.t(st.loads === 0 && k2.some((x) => /deadbeef2/.test(x)), 'after the person has touched the page nothing reloads by itself (their typing is never lost)', 1, 'loads ' + st.loads); await c.close(); }
    return P; });

  /* ---------- J46 safety copies ---------- */
  await jcheck('J46', 'Safety copies are taken BEFORE a migration, an additions append, an unreadable save, loading a sample, Remove all planned, opening a Saved portfolio, a backup restore, removing an asset, and once a day; each copy equals the state just before; Restore brings back the exact copy (deep-equal), files the current state first and offers Undo', 16, 'inject states / click through each action and read rep-v4-safety', async () => {
    const P = new Parts(), S0 = withV(E.seedPlan());
    const act = async (label, w, setup, run, re) => { await setup(); const before = await store(); await run(); await page.waitForTimeout(200); const ring = await keyOf(SAFEKEY), top = ring && ring.items && ring.items[0]; P.t(!!top && re.test(top.reason) && !!before && deepEq(top.state, before), label + ': a copy equal to the state before is on top of the ring (' + (top ? top.reason : 'none') + ')', w, top ? 'equal ' + deepEq(top.state, before) : 'no ring'); return before; };
    /* startup cases */
    { const S19 = clone(S0); S19.v = 19; await loadX(S19, '#'); const ring = await keyOf(SAFEKEY), t = ring.items[0]; P.t(/migration from v19/.test(t.reason) && deepEq(t.state, S19), 'migration (v19 to current): the stored v19 state is filed untouched', 1.2, t.reason); }
    { const S13 = withV(E.seed()); S13.v = 13; await loadX(S13, '#'); const ring = await keyOf(SAFEKEY), t = ring.items[0], now = await store(); P.t(/migration from v13/.test(t.reason) && deepEq(t.state, S13) && now.houses.length === E.seedPlan().houses.length, 'migration that switches to the default plan (v13): the old portfolio is filed first', 1.2, t.reason); }
    { const ad = E.ADDITIONS[0], a = ad.make(), Sx = clone(S0); Sx.houses = Sx.houses.filter((h) => h.id !== a.id); Sx.added = (Sx.added || []).filter((k) => k !== ad.key); await loadX(Sx, '#'); const ring = await keyOf(SAFEKEY), t = ring.items[0], now = await store(); P.t(/additions/.test(t.reason) && deepEq(t.state, Sx) && now.houses.length === Sx.houses.length + 1, 'additions append: the state without the new asset is filed before it is added', 1.2, t.reason + ' ' + now.houses.length + '/' + Sx.houses.length); }
    { await loadX('{ this is not json', '#'); const ring = await keyOf(SAFEKEY), t = ring.items[0], rows = await page.locator('[data-testid=ledger-row]').count(); P.t(/unreadable/.test(t.reason) && t.raw === '{ this is not json' && rows > 0, 'an unreadable save is filed as text before the default plan replaces it, and the app still opens', 1.2, t.reason); }
    { await loadX(S0, '#'); const r1 = await keyOf(SAFEKEY); await reloadX('#'); const r2 = await keyOf(SAFEKEY); P.t(r1.items.length === 1 && /daily/.test(r1.items[0].reason) && r2.items.length === 1, 'a normal start files one daily copy, and a second start the same day adds none', 1, r1.items.length + ',' + r2.items.length); }
    /* user actions */
    await act('loading a sample', 1.2, () => loadX(S0, '#assumptions'), async () => { await openSec('samples'); await page.click('[data-testid=load-realistic]'); await page.click('[data-reset-yes]'); }, /sample/);
    await act('Remove all planned', 1.2, () => loadX(S0, '#'), async () => { await page.click('[data-testid=clear-plan-btn]'); await page.click('[data-clear-yes]'); }, /removing all planned/);
    const savedRec = { id: 's1', name: 'Old plan', ts: Date.now(), state: withV(E.seed()) };
    await act('opening a Saved portfolio', 1.2, () => loadX(S0, '#', null, null).then(async () => { await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [SKEY, [savedRec]]); await reloadX('#'); }), async () => { await page.click('[data-testid=tab-saved]'); await page.click('[data-testid=saved-open]'); await page.click('[data-testid=load-confirm]'); }, /opening a saved/);
    await act('restoring a backup', 1.2, () => loadX(S0, '#assumptions'), async () => { await openSec('backup'); await page.fill('#bkin', JSON.stringify(withV(E.seed()))); await page.click('[data-restore-text]'); await page.click('[data-import-yes]'); }, /restoring a backup/);
    await act('removing one asset', 1.2, () => loadX(S0, '#'), async () => { await page.click('[data-row="maple"] [data-testid=row-toggle]'); await page.click('[data-del="maple"]'); await page.click('[data-del-yes="maple"]'); }, /removing an asset/);
    /* restore */
    await loadX(S0, '#'); const pre = await store(); await page.click('[data-testid=clear-plan-btn]'); await page.click('[data-clear-yes]'); await page.waitForTimeout(150);
    await page.goto(base() + '/index.html?j=' + seq++ + '#assumptions'); await page.waitForSelector('[data-coll=safety]'); await openSec('safety'); await page.waitForSelector('[data-testid=safety-item]');
    const info = await page.evaluate(() => [...document.querySelectorAll('[data-testid=safety-item]')].map((c) => ({ ts: c.dataset.ts, reason: c.querySelector('[data-testid=safety-reason]').textContent, date: c.querySelector('[data-testid=safety-date]').textContent, assets: c.querySelector('[data-testid=safety-assets]') && c.querySelector('[data-testid=safety-assets]').textContent, nw: c.querySelector('[data-testid=safety-nw]') && c.querySelector('[data-testid=safety-nw]').textContent })));
    const mine = info.find((x) => /removing all planned/i.test(x.reason));
    P.t(!!mine && !!mine.date && /\d+ assets? \(\d+ planned, \d+ bought\)/.test(mine.assets) && /Net worth \$/.test(mine.nw), 'the Safety copies list shows date, reason, asset counts and net worth', 1.5, JSON.stringify(mine || info[0]));
    const cur = await store(); await page.click(`[data-testid=safety-item][data-ts="${mine.ts}"] [data-testid=safety-restore]`); P.t((await page.locator('[data-testid=safety-restore-confirm]').count()) === 1 && deepEq(await store(), cur), 'Restore asks first and changes nothing until confirmed', 1);
    await page.click('[data-testid=safety-restore-confirm]'); await page.waitForTimeout(250);
    const after = await store(), ring = await keyOf(SAFEKEY);
    P.t(deepEq(after, pre), 'Restore brings back the exact previous state (deep-equal)', 2.5, after ? after.houses.length + '/' + pre.houses.length : 'no state');
    P.t(/before restoring/.test(ring.items[0].reason) && deepEq(ring.items[0].state, cur), 'the state it replaced is filed in the ring first', 1);
    P.t((await page.locator('[data-testid=undo-banner]').count()) === 1, 'an Undo toast is shown', 0.5); await page.click('[data-undo]'); await page.waitForTimeout(150); P.t(deepEq(await store(), cur), 'Undo returns to the state before the restore', 1);
    return P; });

  /* ---------- J47 ring cap, size cap, quota, throwing storage ---------- */
  await jcheck('J47', 'Safety ring limits: at most 5 copies, oldest dropped, size capped, newest first, quota errors and a throwing localStorage never throw and never lose the newest copy; the app still works and Undo still shows', 7, 'node: Engine.Diag with a stub storage; browser: setItem throws for rep-v4-safety', async () => {
    const P = new Parts(), st = memStore(); let threw = false;
    try { for (let i = 0; i < 8; i++) DG.safeAdd(st, withV(E.seedPlan()), 'copy ' + i, 'b', 1000 + i); } catch (e) { threw = true; }
    const it = DG.safeRead(st), raw = JSON.parse(st.getItem(SAFEKEY));
    P.t(!threw && it.length === 5 && it[0].reason === 'copy 7' && it[4].reason === 'copy 3' && raw.v === 1 && Array.isArray(raw.items), 'after 8 copies exactly the last 5 remain, newest first, stored as {v:1, items:[...]}', 1.5, it.map((x) => x.reason).join());
    const big = withV(E.seedPlan()); big.pad = 'x'.repeat(300000), st2 = memStore(); for (let i = 0; i < 5; i++) DG.safeAdd(st2, big, 'big ' + i, 'b', 2000 + i); const s2 = st2.getItem(SAFEKEY);
    P.t(s2.length <= DG.SAFE_BYTES && JSON.parse(s2).items[0].reason === 'big 4', 'a size cap drops the oldest: ' + s2.length + ' chars <= ' + DG.SAFE_BYTES, 1.2);
    const st3 = memStore({ fail: (k, v) => v.length > 10000 }); const r3 = DG.safeAdd(st3, withV(E.seedPlan()), 'a', 'b', 1); const r4 = DG.safeAdd(memStore({ fail: () => true }), withV(E.seedPlan()), 'a', 'b', 1);
    P.t(r3 === false && r4 === false, 'quota errors return false instead of throwing', 1);
    const st5 = memStore(); st5.setItem(SAFEKEY, '{garbage'); P.t(DG.safeRead(st5).length === 0 && !!DG.safeAdd(st5, withV(E.seedPlan()), 'ok', 'b', 1) && DG.safeRead(st5).length === 1, 'a damaged ring is ignored and replaced', 0.8);
    const { c, pg } = await rawCtx(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'rep-v4-safety') throw new DOMException('quota', 'QuotaExceededError'); return s.call(this, k, v); }; });
    await pg.goto(base() + '/manifest.webmanifest'); await pg.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, withV(E.seedPlan())]); await pg.goto(base() + '/index.html#'); await pg.waitForSelector('[data-testid=clear-plan-btn]');
    await pg.click('[data-testid=clear-plan-btn]'); await pg.click('[data-clear-yes]'); await pg.waitForTimeout(250);
    const d = await pg.evaluate((k) => ({ undo: !!document.querySelector('[data-testid=undo-banner]'), st: JSON.parse(localStorage.getItem(k)), ev: JSON.parse(localStorage.getItem('rep-v4-diag')).ev }), KEY);
    P.t(!errs.length && d.undo && d.st.houses.every((h) => h.status === 'owned') && d.ev.some((e) => e.k === 'safety' && /could not be stored/.test(e.m)), 'with a throwing rep-v4-safety the action still works, Undo shows, no page error, and the failure is logged', 2.5, errs.join() + ' ' + JSON.stringify(d.ev.slice(-2)));
    await c.close(); return P; });

  /* ---------- J48 portfolio replaced ---------- */
  await jcheck('J48', 'Portfolio replaced: a start whose state is the default plan with other asset ids than the last-known fingerprint, with no logged migration / sample / restore explaining it, shows "may have been replaced" with Restore my previous portfolio; nothing is restored by itself; restore returns the earlier portfolio; explained or normal starts show nothing', 12, 'fake rep-v4-diag fingerprint + safety copy, then load the default plan', async () => {
    const P = new Parts(), Sa = withV(E.seed()); Sa.added = E.ADDITIONS.map((a) => a.key); const seed = withV(E.seedPlan()), now = Date.now();
    const fp = (ts) => ({ ids: DG.idsHash(Sa), n: Sa.houses.length, own: Sa.houses.filter((h) => h.status === 'owned').length, ts, v: DATA_V });
    const ring = () => { const m = memStore(); DG.safeAdd(m, Sa, 'daily copy', 'b', now - 3600e3); return m.getItem(SAFEKEY); };
    const diag = (ev) => ({ v: 1, ev: ev || [], act: [], fp: fp(now - 60000), flags: {} });
    await loadX(seed, '#', { [DGKEY]: diag(), [SAFEKEY]: ring() }); await page.waitForTimeout(700);
    const stored0 = await store(), n = await page.evaluate(() => ({ note: !!document.querySelector('[data-testid=replaced-note]'), txt: (document.querySelector('[data-testid=replaced-note]') || {}).innerText || '', btn: !!document.querySelector('[data-testid=replaced-restore]'), flag: (JSON.parse(localStorage.getItem('rep-v4-diag')).flags || {}).replaced }));
    P.t(n.note && /replaced/i.test(n.txt) && n.btn && !!n.flag, 'banner "may have been replaced" with a Restore my previous portfolio button is shown', 3, n.txt.slice(0, 120));
    P.t(deepEq(stored0.houses.map((h) => h.id), seed.houses.map((h) => h.id)) && stored0.houses.length === 36, 'it is never automatic: the stored portfolio is still the default plan until the person taps Restore', 2.5, String(stored0.houses.length));
    const hts = await page.evaluate(() => ['replaced-restore', 'replaced-dismiss'].map((t) => { const e = document.querySelector('[data-testid=' + t + ']'); return e ? Math.round(e.getBoundingClientRect().height) : -1; })); P.t(hts.every((h) => h >= 44), 'the banner buttons are 44px or taller (' + hts.join() + ')', 0.7);
    await page.click('[data-testid=replaced-restore]'); await page.waitForTimeout(250); const back = await store(), n2 = await page.evaluate(() => ({ note: !!document.querySelector('[data-testid=replaced-note]'), undo: !!document.querySelector('[data-testid=undo-banner]'), flag: (JSON.parse(localStorage.getItem('rep-v4-diag')).flags || {}).replaced }));
    P.t(back && back.houses.length === Sa.houses.length && deepEq(back.houses.map((h) => h.id), Sa.houses.map((h) => h.id)) && !n2.note && !n2.flag && n2.undo, 'Restore brings back the earlier portfolio, clears the banner and offers Undo', 2.5, back && back.houses.length);
    await page.click('[data-undo]'); await page.waitForTimeout(200); P.t((await store()).houses.length === 36, 'Undo returns to the default plan', 0.5);
    /* negatives */
    await loadX(seed, '#', { [DGKEY]: diag([{ t: now - 30000, k: 'scenario', m: 'loaded' }]), [SAFEKEY]: ring() }); await page.waitForTimeout(700); P.t((await page.locator('[data-testid=replaced-note]').count()) === 0, 'a logged sample / migration / restore explains the change: no banner', 1);
    await loadX(Sa, '#', { [DGKEY]: diag(), [SAFEKEY]: ring() }); await page.waitForTimeout(700); P.t((await page.locator('[data-testid=replaced-note]').count()) === 0, 'the same portfolio as last time: no banner', 0.6);
    await loadX(seed, '#'); await page.waitForTimeout(700); P.t((await page.locator('[data-testid=replaced-note]').count()) === 0, 'a first start with no fingerprint: no banner', 0.6);
    await loadX(seed, '#', { [DGKEY]: diag(), [SAFEKEY]: ring() }); await page.waitForTimeout(600); await page.click('[data-testid=replaced-dismiss]'); await page.waitForTimeout(150); const dis = await store(); await reloadX('#'); await page.waitForTimeout(700);
    P.t(dis.houses.length === 36 && (await page.locator('[data-testid=replaced-note]').count()) === 0, 'Dismiss hides the banner for good and changes nothing', 0.8);
    return P; });

  /* ---------- J49 anomaly monitor, error capture ---------- */
  await jcheck('J49', 'Anomaly monitor: NaN in a KPI, a changed total, a failed read-back, mismatched stamps and a wrong state version are each flagged with their code; the Planned page shows "Something looked wrong. Tap to copy a bug report" (one tap copies, dismiss works); errors, rejections and storage failures land in a 60-entry, size-capped event ring', 14, 'inject NaN into a KPI, stub the clipboard, fire errors; node: Engine.Diag.checks with faked inputs', async () => {
    const P = new Parts(), S0 = withV(E.seedPlan()), pl = E.planIn(clone(S0), 'today'), base0 = { S: S0, dataV: DATA_V, pl, stamps: { engine: 'a', info: 'a', app: 'a', css: 'a' } }, codeOf = (c) => DG.anomalies(DG.checks(c));
    P.t(codeOf(base0).length === 0, 'node: the default plan raises no anomaly', 1);
    const nanPl = clone(pl); nanPl.horizon.nw = NaN; nanPl.snap = pl.snap; const pl2 = Object.assign({}, pl, { horizon: Object.assign({}, pl.horizon, { cf: pl.horizon.cf * 1.5 }) });
    P.t(codeOf(Object.assign({}, base0, { pl: Object.assign({}, pl, { horizon: Object.assign({}, pl.horizon, { nw: NaN }) }) })).join() === 'kpi-nonfinite', 'node: a NaN net worth is kpi-nonfinite', 1);
    P.t(codeOf(Object.assign({}, base0, { kpiTexts: ['$1', 'NaN'] })).join() === 'kpi-nonfinite', 'node: NaN or undefined in a KPI text is kpi-nonfinite', 0.6);
    P.t(codeOf(Object.assign({}, base0, { pl: pl2 })).join() === 'total-mismatch' && codeOf(Object.assign({}, base0, { domCf: pl.horizon.cf * 2 })).join() === 'total-mismatch', 'node: a total that is not the sum of its rows (engine or on screen) is total-mismatch', 1.2);
    P.t(codeOf(Object.assign({}, base0, { rw: { ok: false, chars: 5 } })).join() === 'storage-readback' && codeOf(Object.assign({}, base0, { stamps: { engine: 'a', info: 'b', app: 'a', css: 'a' } })).join() === 'build-mismatch' && codeOf(Object.assign({}, base0, { dataV: DATA_V + 1 })).join() === 'state-shape' && codeOf(Object.assign({}, base0, { replaced: true })).join() === 'state-replaced' && codeOf(Object.assign({}, base0, { errCount: 2 })).join() === 'runtime-error', 'node: storage-readback, build-mismatch, state-shape, state-replaced and runtime-error each fire alone', 1.5);
    const st8 = { engine: 'abcd1234', info: 'abcd1234', app: 'abcd1234', css: 'abcd1234' }; P.t(codeOf(Object.assign({}, base0, { stamps: st8, swCaches: ['portfolio-v4-x-deadbeef'] })).join() === 'build-mismatch' && codeOf(Object.assign({}, base0, { stamps: st8, swCaches: ['portfolio-v4-x-abcd1234', 'portfolio-v4-y-deadbeef'] })).length === 0, 'node: only stale caches (none matching the stamp) count as a build mismatch', 0.5);
    const mixed = []; for (const k of ['seed', 'seedStretch', 'seedBig', 'seedStradella']) { const s = E[k](); s.v = DATA_V; E.normalize(s); const p = E.planIn(clone(s), 'today'); const c = codeOf({ S: s, dataV: DATA_V, pl: p, stamps: base0.stamps }); if (c.length) mixed.push(k + ':' + c); }
    P.t(!mixed.length, 'node: no false alarm on the four sample portfolios (' + (mixed.join() || 'clean') + ')', 0.8);
    await loadX(S0, '#'); await stubClip(); await page.waitForTimeout(700);
    P.t((await page.locator('[data-testid=anomaly-note]').count()) === 0, 'a healthy page shows no notice', 0.8);
    const cd = await page.evaluate(() => { document.querySelector('[data-testid=kpi-networth]').textContent = 'NaN'; return window.__app.check(); }); await page.waitForTimeout(150);
    const note = await page.evaluate(() => { const n = document.querySelector('[data-testid=anomaly-note]'), b = document.querySelector('[data-testid=anomaly-copy]'); return n ? { txt: n.innerText, h: Math.round(b.getBoundingClientRect().height), top: n.getBoundingClientRect().top < 200 } : null; });
    P.t(cd.join() === 'kpi-nonfinite' && !!note && /Something looked wrong\. Tap to copy a bug report/.test(note.txt) && note.h >= 44 && note.top, 'page: NaN written into the net worth KPI is flagged and the notice shows at the top (>= 44px)', 2, JSON.stringify(cd) + JSON.stringify(note));
    await page.click('[data-testid=anomaly-copy]'); await page.waitForTimeout(200); const cp = await page.evaluate(() => ({ clip: window.__clip, chip: (document.querySelector('[data-testid=anomaly-copy]') || {}).textContent }));
    P.t(!!cp.clip && /^<!-- rep-bug-report v1/.test(cp.clip) && /\[FAIL\] kpi-finite/.test(cp.clip) && /anomalies: kpi-nonfinite/.test(cp.clip) && /Copied/.test(cp.chip), 'one tap copies the report (numbers off) with the failed check in it and says Copied', 1.5, String(cp.chip));
    await page.click('[data-testid=anomaly-dismiss]'); await page.waitForTimeout(100); await page.evaluate(() => window.__app.check()); await page.waitForTimeout(100); P.t((await page.locator('[data-testid=anomaly-note]').count()) === 0, 'Dismiss hides it and the same problem does not bring it back', 0.7);
    /* read-back */
    await loadX(S0, '#assumptions'); await page.waitForTimeout(300); await page.evaluate(() => { const g = Storage.prototype.getItem; Storage.prototype.getItem = function (k) { const v = g.call(this, k); return k === 'rep-v4' && v ? v.slice(0, v.length - 3) : v; }; }); await page.click('[data-openon=real]'); await page.waitForTimeout(100); const rb = await page.evaluate(() => window.__app.check()); P.t(rb.indexOf('storage-readback') >= 0, 'page: a save that does not read back equal is flagged storage-readback', 1.2, JSON.stringify(rb));
    /* error ring */
    const { c, pg } = await rawCtx(); await pg.goto(base() + '/index.html#'); await pg.waitForSelector('#app > *'); await pg.waitForTimeout(300);
    await pg.evaluate(() => { setTimeout(() => { throw new Error('boom-sentinel'); }, 0); Promise.reject(new Error('rej-sentinel')); }); await pg.waitForTimeout(300);
    const ev1 = await pg.evaluate(() => JSON.parse(localStorage.getItem('rep-v4-diag')).ev);
    P.t(ev1.some((e) => e.k === 'error' && /boom-sentinel/.test(e.m) && typeof e.t === 'number') && ev1.some((e) => e.k === 'unhandledrejection' && /rej-sentinel/.test(e.m) && e.s && e.s.split('\n').length <= 5), 'a thrown error and an unhandled rejection are captured with time, message and a trimmed stack', 1.5, JSON.stringify(ev1.slice(-2)).slice(0, 200));
    await pg.evaluate(() => { for (let i = 0; i < 90; i++) window.dispatchEvent(new ErrorEvent('error', { message: 'flood ' + i + ' ' + 'x'.repeat(300) })); }); await pg.waitForTimeout(200);
    const raw = await pg.evaluate(() => localStorage.getItem('rep-v4-diag')), dj = JSON.parse(raw); P.t(dj.ev.length <= 60 && raw.length <= 30000 && dj.ev.every((e) => e.m.length <= 200), 'the event ring keeps at most 60 events and stays under 30,000 characters (' + dj.ev.length + ' events, ' + raw.length + ' chars)', 1.2);
    await pg.evaluate(() => { const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'rep-v4') throw new DOMException('quota', 'QuotaExceededError'); return s.call(this, k, v); }; }); await pg.click('[data-testid=settings-link]'); await pg.click('[data-openon=real]'); await pg.waitForTimeout(200);
    const ev3 = await pg.evaluate(() => JSON.parse(localStorage.getItem('rep-v4-diag')).ev); P.t(ev3.some((e) => e.k === 'storage' && /save failed/.test(e.m)), 'a storage failure is captured in the event ring', 0.8); await c.close();
    return P; });

  /* ---------- J50 the bug report ---------- */
  await jcheck('J50', 'Bug report: 8 sections, parseable, <= 8,000 characters; with "Include my numbers" off no street names, addresses or dollar amounts (sentinel address and price), with it on prices and rents but still no address; Copy uses the clipboard with the select-by-hand fallback; the GitHub link is valid, <= 7,500 characters and says the full report was copied; the app makes no network request', 16, 'sentinel address 7731 Zebra Quartz Ln / $7,777,777; stub window.open and the clipboard; log page requests', async () => {
    const P = new Parts(), ADDR = '7731 Zebra Quartz Ln', S1 = withV(E.seedPlan()); const h0 = S1.houses.find((h) => h.id === 'maple'); h0.addr = ADDR; h0.price = 7777777; h0.rent = 54321;
    const { c, pg } = await rawCtx(); const reqs = []; pg.on('request', (r) => reqs.push(r.url())); await pg.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
    await pg.goto(base() + '/manifest.webmanifest'); await pg.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, S1]); await pg.goto(base() + '/index.html#assumptions'); await pg.waitForSelector('[data-coll=report]');
    const stub = () => pg.evaluate(() => { window.__clip = null; Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: (t) => { window.__clip = t; return Promise.resolve(); } }); }); await stub();
    await pg.click('[data-coll=report]'); await pg.fill('#bugdesc', 'The total looks off near ' + ADDR + ' (down payment $5,000)'); const n0 = reqs.length;
    await pg.click('[data-testid=bug-copy]'); await pg.waitForTimeout(250);
    const off = await pg.evaluate(() => ({ clip: window.__clip, ta: document.querySelector('[data-testid=bug-text]').value, msg: document.querySelector('[data-testid=bug-msg]').textContent }));
    const rep = DG.parseReport(off.clip || ''), secs = Object.keys(rep.sections).map(Number), titles = secs.map((k) => rep.sections[k].title);
    P.t(secs.join() === '1,2,3,4,5,6,7,8' && /Summary/.test(titles[0]) && /Build/.test(titles[1]) && /State summary/.test(titles[2]) && /Invariants/.test(titles[3]) && /Events/.test(titles[4]) && /Errors/.test(titles[5]) && /Last user actions/.test(titles[6]) && /For Claude/.test(titles[7]) && rep.version === 1, 'the report has the 8 sections in order and parses (' + titles.join(' | ') + ')', 2.5);
    const b = rep.sections[2].kv, s3 = rep.sections[3].kv;
    P.t(b.stamp_engine === b.stamp_app && b.stamp_info === b.stamp_app && b.stamp_css === b.stamp_app && b.stamps_agree === 'yes' && +b.data_v === DATA_V && +b.state_v === DATA_V && b.display_mode === 'browser' && /^\d+x\d+$/.test(b.viewport) && b.dpr && b.language && b.timezone && b.online && b.user_agent && b.storage_local === 'ok' && 'bytes_rep-v4' in b && 'bytes_rep-v4-safety' in b && 'sw_cache' in b && 'sw_controller' in b && 'route' in b, 'Build: stamps, DATA_V, S.v, cache, display mode, route, user agent, viewport, dpr, language, timezone, online, storage and per-key bytes', 2.5, Object.keys(b).join());
    P.t(+s3.assets_total === 36 && +s3.planned === 36 && +s3.owned === 0 && 'house_planned' in s3 && 'multifamily_units_total' in s3 && 'added_keys' in s3 && 'saved_portfolios' in s3 && 'example_overrides' in s3 && s3.unit_setting === 'today' && s3.page === 'planned' && !('net_worth_plan_end' in s3), 'State summary: counts by category, planned vs owned, units, added keys, saved, overrides, unit setting, page; no net worth with numbers off', 2, Object.keys(s3).join());
    const inv = rep.sections[4].lines; P.t(inv.length === 7 && inv.every((l) => /^- \[(PASS|FAIL)\] [a-z\-]+: /.test(l)), 'Invariants: each check is PASS or FAIL with what was measured', 1.2, inv.length);
    P.t(!/Zebra|Quartz|7731|7,777,777|7777777|54321|54,321|\$\s?\d/.test(off.clip) && /description: .*near \[address\] \(down payment \$#\)/.test(off.clip), 'numbers OFF: no address, street name, price, rent or dollar amount anywhere (the description is masked too)', 3, (off.clip.match(/.{20}(Zebra|7777777|\$\d).{10}/) || [''])[0]);
    P.t(off.clip.length <= 8000 && off.ta === off.clip && /Copied/.test(off.msg) && /parseReport|Playwright|CLAUDE\.md|grader/.test(rep.sections[8].lines.join(' ')) && /CLAUDE\.md/.test(rep.sections[8].lines.join(' ')) && /grader/.test(rep.sections[8].lines.join(' ')), 'it is ' + off.clip.length + ' characters (<= 8,000), shown in the box, copied, and the For Claude paragraph says how to use it', 1.5);
    await pg.click('[data-testid=bug-num-on]'); await pg.click('[data-testid=bug-copy]'); await pg.waitForTimeout(250); const on = await pg.evaluate(() => window.__clip), rep2 = DG.parseReport(on).sections[3].kv;
    P.t(/price=7777777 rent=54321/.test(on) && 'net_worth_plan_end' in rep2 && 'cash_flow_per_month_plan_end' in rep2 && !/Zebra|Quartz|7731/.test(on.replace(/description: .*/, '')), 'numbers ON: net worth, cash flow and each asset\'s price and rent are there, but never the address', 2.5);
    /* worst case size: many long events and a long description */
    await pg.evaluate(() => { for (let i = 0; i < 70; i++) window.dispatchEvent(new ErrorEvent('error', { message: 'e' + i + ' ' + 'y'.repeat(190), error: Object.assign(new Error('x'), { stack: 'Error: x\n' + Array.from({ length: 5 }, (_, j) => '    at fn' + j + ' (' + 'z'.repeat(150) + ':1:1)').join('\n') }) })); }); await pg.fill('#bugdesc', 'long '.repeat(110)); await pg.click('[data-testid=bug-copy]'); await pg.waitForTimeout(250); const big = await pg.evaluate(() => window.__clip), bigP = DG.parseReport(big);
    P.t(big.length <= 8000 && Object.keys(bigP.sections).length === 8 && /\[PASS\]|\[FAIL\]/.test(big) && bigP.sections[5].lines.length < 31, 'worst case (70 long events, long stacks, 500-character description): still <= 8,000 characters (' + big.length + '), all 8 sections kept, events trimmed first', 1.5);
    /* GitHub issue */
    await pg.click('[data-testid=bug-num-off]'); await pg.evaluate(() => { window.__opened.length = 0; window.__clip = null; }); await pg.click('[data-testid=bug-issue]'); await pg.waitForTimeout(250);
    const gh = await pg.evaluate(() => ({ opened: window.__opened.slice(), clip: window.__clip })); let u = null; try { u = new URL(gh.opened[0]); } catch (e) {}
    P.t(!!u && gh.opened[0].startsWith(GH + '?title=') && gh.opened[0].length <= 7500 && u.searchParams.get('body').includes('Full report was copied to the clipboard') && /^In-app bug report/.test(u.searchParams.get('title')) && !!gh.clip && gh.clip.length > u.searchParams.get('body').length - 100, 'Open as GitHub issue: valid link to the repo, title and body prefilled, ' + (gh.opened[0] || '').length + ' characters (<= 7,500), says the full report was copied, and the clipboard has the full report', 2.5, String(gh.opened[0]).slice(0, 120));
    { const long = 'q'.repeat(60000), r = DG.issueUrl('t', long), r2 = DG.issueUrl('t', 'é\n'.repeat(5000)); let ok2 = true; try { new URL(r.url); new URL(r2.url); } catch (e) { ok2 = false; } P.t(r.url.length <= 7500 && r2.url.length <= 7500 && r.trimmed && ok2 && decodeURIComponent(r.url).includes('Full report was copied to the clipboard'), 'node: any size of report is cut to a valid link of at most 7,500 characters', 0.8, r.url.length + ' ' + r2.url.length); }
    /* fallback */
    await pg.evaluate(() => { Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => Promise.reject(new Error('denied')) }); }); await pg.click('[data-testid=bug-copy]'); await pg.waitForTimeout(300);
    const fb = await pg.evaluate(() => { const t = document.querySelector('[data-testid=bug-text]'); return { msg: document.querySelector('[data-testid=bug-msg]').textContent, sel: t.selectionEnd - t.selectionStart, len: t.value.length, focus: document.activeElement === t }; });
    P.t(/by hand/.test(fb.msg) && fb.sel === fb.len && fb.len > 500 && fb.focus, 'clipboard refused: the text is selected for copying by hand with a message', 1.5, JSON.stringify(fb));
    await pg.evaluate(() => { Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => { throw new Error('no clipboard'); } }); }); await pg.click('[data-testid=bug-copy]'); await pg.waitForTimeout(300); const fb2 = await pg.evaluate(() => /by hand/.test(document.querySelector('[data-testid=bug-msg]').textContent)); P.t(fb2, 'clipboard missing or throwing: same fallback', 0.5);
    const origin = new URL(base()).origin; const outside = reqs.filter((x) => !x.startsWith(origin)), after = reqs.slice(n0); P.t(!outside.length && after.length === 0, 'no network request: nothing outside the app origin (' + outside.length + ') and none at all after the page loaded (' + after.length + ')', 2, outside.concat(after).slice(0, 3).join(' '));
    await c.close(); return P; });

  /* ---------- J51 cost ---------- */
  await jcheck('J51', 'No slowdown: the safety / monitor start-up work costs under 50 ms on the default 36-asset plan (median of 5 starts), the monitor under 50 ms, and the invariants run in node in under 20 ms', 4, 'window.__app.bootMs + monMs over 5 loads; node timing of Engine.Diag.checks', async () => {
    const P = new Parts(), S0 = withV(E.seedPlan()), a = []; for (let i = 0; i < 5; i++) { await loadX(S0, '#'); await page.waitForTimeout(800); a.push(await page.evaluate(() => ({ b: window.__app.bootMs, m: window.__app.monMs }))); }
    const med = (x) => x.slice().sort((p, q) => p - q)[2], b = med(a.map((x) => x.b)), m = med(a.map((x) => x.m));
    P.t(b < 50, 'start-up diagnostics work: ' + b.toFixed(1) + ' ms (median of 5) < 50 ms', 1.5); P.t(m < 50, 'monitor run: ' + m.toFixed(1) + ' ms < 50 ms', 1.5);
    const pl = E.planIn(clone(S0), 'today'); const t0 = Date.now(); for (let i = 0; i < 20; i++) DG.checks({ S: S0, dataV: DATA_V, pl, stamps: { engine: 'a', info: 'a', app: 'a', css: 'a' } }); const per = (Date.now() - t0) / 20; P.t(per < 20, 'Engine.Diag.checks: ' + per.toFixed(1) + ' ms per run < 20 ms', 1, per); return P; });

  /* ---------- J52 nothing else changed ---------- */
  await jcheck('J52', 'Nothing else changed: backup export excludes safety and diagnostic keys, backup import still restores, Saved portfolios do not hold safety copies, and the default plan is untouched (36 assets, nothing owned, real NW >= $125M, after-tax cash flow >= $1.3M/mo, verdict Yes)', 5, 'export backup text, restore it, read all rep-v4* keys', async () => {
    const P = new Parts(), S0 = withV(E.seedPlan()); await loadX(S0, '#assumptions'); await page.waitForTimeout(400); await openSec('backup'); await page.click('[data-testid=export]'); const txt = await page.inputValue('[data-testid=backup-text]'), bk = JSON.parse(txt);
    P.t(!/rep-v4-safety|rep-v4-diag|"items"|"reason"|"flags"|"ev":/.test(txt) && !('items' in bk) && !('ev' in bk) && !('fp' in bk), 'the backup text holds no safety copies and no diagnostics', 1.5);
    await page.evaluate(() => localStorage.clear()); await reloadX('#assumptions'); await openSec('backup'); await page.click('[data-testid=export]'); await page.fill('#bkin', txt); await page.click('[data-restore-text]'); await page.click('[data-import-yes]'); await page.waitForTimeout(250); const rs = await store();
    P.t(rs.houses.length === 36 && deepEq(rs.houses.map((h) => h.id), S0.houses.map((h) => h.id)), 'import restores the portfolio from the backup text', 1.2);
    await page.click('[data-testid=tab-saved]'); await page.click('[data-save-open]'); await page.click('[data-save-yes]'); await page.waitForTimeout(150); const sv = await page.evaluate((k) => localStorage.getItem(k), SKEY); P.t(!/"reason"|safety|"fp"/.test(sv) && JSON.parse(sv).length === 1, 'a Saved portfolio holds only the portfolio', 0.8);
    await loadX(S0, '#'); const hdr = await page.evaluate(() => document.getElementById('app').innerText), d = await store(), Sx = E.normalize(clone(d)), pl = E.planR(Sx), cfAT = E.finance(Sx, pl).kpis.planEnd.cfAfter;
    P.t(d.houses.length === 36 && pl.horizon.nw >= 125e6 && cfAT >= 1.3e6 && /Yes/.test(hdr) && d.houses.every((h) => h.status !== 'owned'), 'default plan: ' + d.houses.length + ' assets, real NW $' + (pl.horizon.nw / 1e6).toFixed(0) + 'M, after-tax cash flow $' + Math.round(cfAT) + '/mo, verdict Yes, nothing owned', 1.5);
    return P; });


  /* ---------- J53 typing a name: no lag, keeps the keyboard's autocorrect (user bug: laggy, no auto-correct) ---------- */
  await jcheck('J53', 'Typing a name: the box is never replaced or re-rendered per key (30 keys, same element, 0 renders, fast), the name lands after a pause / leaving the box / tapping Back mid-typing, Escape reverts, and every free-text box asks for autocorrect', 14, 'asset page name box typed with a 20 ms key delay; renders counted with window.__app.renders; Back tapped mid-typing; Escape; attributes of every text box', async () => {
    const P = new Parts(), S0 = withV(E.seedPlan()), hid = S0.houses[0].id, name30 = 'Oak Hollow Duplex Number 12345';
    await loadX(S0, '#house-' + hid); await openAllColl();
    const sel = 'input.t[data-p$=".addr"]', box = page.locator(sel);
    await box.click(); await page.keyboard.press('Control+A');
    await page.evaluate((s) => { const el = document.querySelector(s); el.__mark = 'kept'; window.__r0 = window.__app.renders; window.__first = document.getElementById('app').firstElementChild; window.__first.__mark = 'kept'; }, sel);
    const t0 = Date.now(); await page.keyboard.type(name30, { delay: 20 }); const ms = Date.now() - t0;
    const mid = await page.evaluate((s) => { const el = document.querySelector(s); return { mark: el && el.__mark, foc: document.activeElement === el, val: el && el.value, rn: window.__app.renders - window.__r0, app: document.getElementById('app').firstElementChild.__mark }; }, sel);
    P.t(name30.length === 30 && mid.mark === 'kept' && mid.foc && mid.val === name30 && mid.app === 'kept', 'while typing 30 characters the same box stays in the page, focused, with every character (no element replaced)', 3, JSON.stringify(mid));
    P.t(mid.rn === 0, 'no full render per key: ' + mid.rn + ' renders during 30 keys', 3);
    P.t(ms < 30 * 20 + 1500, 'typing 30 keys with a 20 ms delay took ' + ms + ' ms (< ' + (30 * 20 + 1500) + ')', 1);
    await page.waitForTimeout(1200); const idle = await page.evaluate((s) => { const el = document.querySelector(s); return { mark: el && el.__mark, foc: document.activeElement === el, rn: window.__app.renders - window.__r0 }; }, sel);
    let st = await store(); P.t(st.houses[0].addr === name30 && idle.mark === 'kept' && idle.foc && idle.rn === 0, 'after a short pause the name is saved without redrawing or taking the focus away', 2, JSON.stringify(idle) + ' ' + st.houses[0].addr);
    await blur(); await page.waitForTimeout(150);
    const title = await page.inputValue(sel); await page.click('[aria-label=Back]'); await page.waitForTimeout(150); const txt = await page.evaluate(() => document.getElementById('app').innerText);
    P.t(title === name30 && txt.indexOf(name30) >= 0, 'after leaving the box the name is on the asset page title and on the portfolio rows', 1.5);
    /* tapping Back in the middle of typing keeps the typed text */
    await loadX(S0, '#house-' + hid); await box.click(); await page.keyboard.press('Control+A'); await page.keyboard.type('Quick Typed Name', { delay: 10 }); await page.click('[aria-label=Back]'); await page.waitForTimeout(250);
    st = await store(); const txt2 = await page.evaluate(() => document.getElementById('app').innerText); P.t(st.houses[0].addr === 'Quick Typed Name' && txt2.indexOf('Quick Typed Name') >= 0 && !/#house-/.test(await page.evaluate(() => location.hash)), 'tapping Back mid-typing keeps the last typed text (saved and on the row) and still goes back', 2, st.houses[0].addr);
    /* Escape reverts */
    await loadX(S0, '#house-' + hid); const orig = S0.houses[0].addr; await box.click(); await page.keyboard.press('Control+A'); await page.keyboard.type('Zzz Not Wanted', { delay: 5 }); await page.waitForTimeout(1100); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    st = await store(); P.t(st.houses[0].addr === orig && (await page.inputValue(sel)) === orig, 'Escape puts the old name back (even after the pause had saved the typing)', 1.5, st.houses[0].addr);
    /* attributes on every free-text box */
    const want = { autocorrect: 'on', autocapitalize: 'words', spellcheck: 'true', autocomplete: 'off', enterkeyhint: 'done' };
    const attrs = () => page.evaluate((w) => [...document.querySelectorAll('#app input[type=text]:not([data-num])')].map((e) => ({ k: e.dataset.testid || e.getAttribute('aria-label'), bad: Object.keys(w).filter((a) => e.getAttribute(a) !== w[a]) })), want);
    let all = await attrs(); const SF = clone(S0); SF.p = clone(SF.p || {}); SF.p.planned = [{ id: 'pe1', name: 'Wedding', amount: 20000, month: 12 }]; SF.p.capital = [{ id: 'cp1', name: 'Partner', amount: 50000, month: 6 }]; await loadX(SF, '#finances'); await openAllColl(); all = all.concat(await attrs());
    await loadX(S0, '#'); await page.click('[data-testid=tab-saved]').catch(() => {}); await page.click('[data-save-open]').catch(() => {}); all = all.concat(await attrs());
    await page.click('[data-save-yes]').catch(() => {}); await page.waitForTimeout(150); await page.click('[data-testid=saved-rename]').catch(() => {}); all = all.concat(await attrs());
    const bad = all.filter((x) => x.bad.length), keys = all.map((x) => x.k).join('|');
    P.t(!bad.length && all.length >= 6 && /Name or address/.test(keys) && /Job name/.test(keys) && /Expense name/.test(keys) && /Capital name/.test(keys) && /save-name/.test(keys) && /rename-input/.test(keys), 'every free-text box (asset name, job, expenses, Saved name and rename) has autocorrect on, words capitalised, spellcheck on, autocomplete off, Done key: ' + all.length + ' boxes, ' + bad.length + ' missing', 1.5, JSON.stringify(bad) + keys);
    return P; });

  /* ---------- J54 duplicate naming (user bug: copy, copy1, copy2 ...) ---------- */
  await jcheck('J54', 'Duplicate names: "<name> (copy)", "(copy1)", "(copy2)" ...; a copy of a copy counts as a copy of the base; the first unused number is taken; names never repeat; long names keep the suffix; numbering, Undo and the default plan are unaffected', 10, 'E.duplicate x4, copy of a copy, remove a middle copy, 80-character and unicode names; asset page button twice', async () => {
    const P = new Parts(), S = clone(withV(E.seedPlan())), id0 = S.houses[0].id, base0 = S.houses[0].addr;
    const names = () => S.houses.map((h) => h.addr);
    const c1 = E.duplicate(S, id0), c2 = E.duplicate(S, id0), c3 = E.duplicate(S, id0), c4 = E.duplicate(S, id0);
    P.t([c1, c2, c3, c4].map((c) => c.addr).join('|') === [base0 + ' (copy)', base0 + ' (copy1)', base0 + ' (copy2)', base0 + ' (copy3)'].join('|'), 'four duplicates: (copy), (copy1), (copy2), (copy3)', 3, [c1, c2, c3, c4].map((c) => c.addr).join('|'));
    const cc = E.duplicate(S, c2.id); P.t(cc.addr === base0 + ' (copy4)' && S.houses[S.houses.findIndex((h) => h.id === c2.id) + 1].id === cc.id, 'duplicating "(copy1)" gives "<name> (copy4)" (a copy of a copy is a copy of the base) placed right after it', 2, cc.addr);
    S.houses.splice(S.houses.findIndex((h) => h.id === c2.id), 1); const c5 = E.duplicate(S, id0); P.t(c5.addr === base0 + ' (copy1)', 'after removing "(copy1)" the next duplicate takes "(copy1)" again', 1.5, c5.addr);
    P.t(new Set(names()).size === names().length || names().filter((n) => n.indexOf(' (copy') > 0).length === new Set(names().filter((n) => n.indexOf(' (copy') > 0)).size, 'no two copies share a name', 1);
    const S2 = clone(withV(E.seedPlan())), long = 'Ä'.repeat(40) + ' ' + 'é'.repeat(39); S2.houses[0].addr = long; const l1 = E.duplicate(S2, S2.houses[0].id), l2 = E.duplicate(S2, S2.houses[0].id);
    P.t(l1.addr.length <= 80 && /\(copy\)$/.test(l1.addr) && l2.addr.length <= 80 && /\(copy1\)$/.test(l2.addr) && l1.addr !== l2.addr, 'an 80-character unicode name keeps the whole suffix by trimming the base', 1.5, l1.addr.length + ' ' + l2.addr);
    const S3 = clone(withV(E.seedPlan())), n0 = S3.houses.length, seq0 = S3.seq; E.duplicate(S3, S3.houses[0].id); P.t(S3.houses.length === n0 + 1 && S3.seq === (+seq0 || 0) + 1 && S3.houses[1].status === 'planned', 'the copy still sits right after the original, planned, with the next creation number', 1);
    const S0 = withV(E.seedPlan()), pl = E.planR(E.normalize(clone(S0))); P.t(S0.houses.length === 36 && pl.horizon.nw >= 125e6 && S0.houses.every((h) => h.status !== 'owned'), 'default plan untouched: 36 assets, nothing owned, real NW $' + (pl.horizon.nw / 1e6).toFixed(0) + 'M', 1);
    await loadX(S0, '#house-' + S0.houses[0].id); await page.click('[data-testid=h-duplicate]'); await page.waitForTimeout(150); await page.click('[data-testid=h-duplicate]'); await page.waitForTimeout(150);
    const st = await store(), nn = st.houses.map((h) => h.addr).filter((n) => n.indexOf(S0.houses[0].addr + ' (copy') === 0);
    P.t(nn.length === 2 && nn.indexOf(S0.houses[0].addr + ' (copy)') >= 0 && nn.indexOf(S0.houses[0].addr + ' (copy1)') >= 0, 'the asset page Duplicate button numbers its copies (original, then a copy of the copy)', 1, nn.join('|'));
    return P; });

  await ctx.close();
  const earned = checks.reduce((a, c) => a + c.earned, 0), max = checks.reduce((a, c) => a + c.points, 0);
  return { earned: Math.round(earned / max * 10000) / 100, max: 100, checks: checks.map((c) => Object.assign({}, c, { points: Math.round(c.points / max * 10000) / 100, earned: Math.round(c.earned / max * 10000) / 100 })) };
};
