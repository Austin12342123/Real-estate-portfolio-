/* Category J: one clock with calendar dates (J11-J19 cover the review round: sale rounding, Checks layout and edge cases, Finances dates, calculator revert, plurals, migration note, undo toast, saved names, row wording), math in number boxes, the Planned page Checks block, sold-asset cash profit, silent migration to the current plan, the 607 Siena Way stretch scenario, tap targets.
   100 automated points on their own scale. Plugged in from grade.js: require('./ux-grade.js').run(X) -> { earned, max, checks }.  Standalone: UX_ONLY=1 node grade.js  (J_ONLY=J1,J3 for single checks).
   The app's "today" is pinned (window.REP_TODAY = 2026-11-12 in grade.js) so dates are stable. Dates are compared with an independent integer-math reference (grader/dates.js). Never modifies the app. */
const fs = require('fs'), path = require('path');
const D = require('./dates.js');

exports.run = async function run(X) {
  const { E, Parts, DATA_V, KEY, mkCtx, mkPage, base } = X;
  const UIKEY = 'rep-v4-ui', SKEY = 'rep-v4-saved', checks = [];
  async function jcheck(id, name, points, repro, fn) {
    if (process.env.J_ONLY && process.env.J_ONLY.split(',').indexOf(id) < 0) return;
    let r; const t0 = Date.now();
    try { r = await fn(); } catch (e) { r = { ratio: 0, detail: 'CRASH in check: ' + (e && e.stack || e).toString().slice(0, 500) }; }
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
    const note = (await page.locator('[data-testid=buyin-note]').textContent()) || '', mo = E.plan(E.normalize(clone(S))).purchase.maple;
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
    const headTxt = await page.locator('[data-testid=plan-headline]').textContent(), lr = E.plan(E.seedPlan()), lastM = Math.max(...E.seedPlan().houses.map((h) => lr.purchase[h.id]).filter(isFinite));
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
    const Sx = E.normalize(clone(await store())), pl = E.plan(Sx), v = pl.V.maple;
    await page.goto(base() + '/index.html?j=' + seq++ + '#house-maple'); await page.waitForSelector('#app > *'); await openAllColl();
    P.t(near2(num(await page.locator('[data-testid=rent-noi]').first().textContent()), v.noi, 1.5), 'asset page income after costs follows the typed math', 1, '');
    await page.goto(base() + '/index.html?j=' + seq++); await page.waitForSelector('#app > *');
    const rowTxt = await page.locator('[data-row=maple] [data-testid=row-cashflow] b').first().textContent(); const sp = pl.snap.find((x) => x.id === 'maple'); P.t(sp && near2(Math.abs(num(rowTxt)), Math.abs(sp.cf), Math.max(2, Math.abs(sp.cf) * 0.002)) || !sp, 'Planned row and totals follow the typed rent', 1, rowTxt);
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
    const pk = E.plan(E.seedPlan()).worst.dti;
    P.t((await lvlOf(mk((T) => { T.g.dti = Math.floor(pk) - 2; }), '[data-testid=check-dti]')) === 'bad', 'DTI over the limit is red (limit ' + (Math.floor(pk) - 2) + '% vs peak ' + pk.toFixed(1) + '%)', 1.5, '');
    P.t((await lvlOf(mk((T) => { T.g.dti = Math.floor(pk / 0.85); }), '[data-testid=check-dti]')) === 'warn', 'DTI inside 85% of the limit but under it is amber', 1.5, '');
    P.t((await lvlOf(mk(() => {}), '[data-testid=check-dti]')) === 'ok', 'DTI far under the limit is plain', 0.5, '');
    P.t((await lvlOf(mk((T) => { T.p.living = 5050; }), '[data-testid=check-pace]')) === 'warn', 'a tight profile (about $580/mo of job money) shows the plan-timing row amber (the last purchase comes after the plan ends)', 1.5, '');
    await load(mk((T) => { T.p.living = 5050; }), ''); const chip = await page.locator('[data-testid=afford-chip]').getAttribute('data-lvl'), chk = await page.locator('[data-testid=checks-flag]').count();
    P.t(chip === 'warn' && chk === 1, 'the Can I afford this chip and the Checks header turn amber together only when a number is past safe', 1, chip + ' flag ' + chk);
    await load(S, ''); P.t((await page.locator('[data-testid=afford-chip]').getAttribute('data-lvl')) === 'ok', 'afford chip is neutral (level ok) when the verdict is Yes', 0.5, '');
    return P;
  });

  /* ---------- J4 sold profit ---------- */
  await jcheck('J4', 'Sold assets show how much cash was profited: Sold row, Sold category and the asset page all match the engine (price - selling costs - loan - tax - cash put in)', 12, 'load the default plan (birch is sold) and read the row, category strip and asset page', async () => {
    const P = new Parts(); const S0 = E.seedPlan(), pl = E.plan(S0), id = S0.houses.find((h) => pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM).id, ex = pl.exits[id];
    await load(withV(S0), ''); await page.click('[data-testid=cat-header-sold]').catch(() => {}); await page.waitForTimeout(60);
    const line = (await page.locator(`[data-row=${id}] .exitline`).textContent().catch(() => '')) || '', cell = (await page.locator(`[data-row=${id}] [data-testid=row-cashflow]`).textContent().catch(() => '')) || '', strip = (await page.locator('[data-testid^=cat-profit-]').first().evaluate((e) => e.parentElement.textContent).catch(() => '')) || '';
    const money = (t) => num(t) * (/M/.test(t) ? 1e6 : /B/.test(t) ? 1e9 : 1), signOk = (t, v) => (/^[+]/.test(t.trim()) || t.includes('+')) === (v >= 0);
    const rp = ((await page.locator(`[data-row=${id}] [data-testid=row-payment]`).textContent().catch(() => 'x')) || '').trim();
    P.t(/^sold for \$[\d,.]+[MB]? in month/.test(line.trim()) && !/cash profit/.test(line) && rp === '', 'Sold row states the cash profit once (right column and category header, not again inline) and has no stray lone "sold" word under edit', 3, line + ' / pay: [' + rp + ']');
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
    const pl = E.plan(E.seedPlan()); P.t(Math.abs(num(f.nw) - pl.horizon.nw / 1e6) < 0.1 && f.chip === 'Yes' && pl.horizon.nw >= 125e6, 'the screen shows the $125M+ plan and "Yes" (' + f.nw + ', ' + f.chip + ')', 3, JSON.stringify(f));
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
    const S1 = E.normalize(clone(st)), pl = E.plan(S1), f = E.finance(S1, pl); P.t(h && isFinite(pl.purchase[h.id]) && pl.purchase[h.id] <= pl.planM && f.status !== 'no', 'it is bought inside the plan (month ' + (h && pl.purchase[h.id]) + ') and the verdict is ' + f.status, 3, '');
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
    const t = await page.locator('[data-testid=checks]').textContent(); P.t(!/Last purchase/.test(t) && !/Lenders/.test(t) && !/beyond the trust/.test(t) && /Paid from your own pocket/.test(t) && /grows with inflation/.test(t), 'plain-word rows only; cushion says it grows with inflation', 2, t.slice(0, 200));
    const pk = E.plan(E.seedPlan()).worst.dti, T = withV(E.seedPlan()); T.g.dti = Math.floor(pk) - 2; await load(T, '');
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
  await jcheck('J13', 'Finances writes every month as "month N (Mon YYYY)" (or "today"), including the Biggest cash calls rows; the Breakdown table keeps every figure inside the card at 320px', 6, 'Finances page with a cash call; Planned breakdown at 320px', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 });
    const S = withV(E.seedPlan()); S.p.cash = 0; S.p.living = 3000; await load(S, '#finances'); await openAllColl();
    const calls = await page.evaluate(() => [...document.querySelectorAll('#app .drv span:first-child')].map((e) => e.textContent.trim()));
    P.t(calls.length >= 1 && calls.every((t) => /^(Month \d+ \([A-Z][a-z]{2} \d{4}\)|Today)/.test(t)), 'Biggest cash calls rows start with "Month N (Mon YYYY)"', 2.5, calls.join(' | '));
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
    const Sx = E.normalize(clone(await store())), v = E.plan(Sx).V.maple;
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
        const lines = (n) => { const r = document.createRange(); r.selectNodeContents(n); return new Set([...r.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top / 4))).size; };
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

  await ctx.close();
  const earned = checks.reduce((a, c) => a + c.earned, 0), max = checks.reduce((a, c) => a + c.points, 0);
  return { earned: Math.round(earned / max * 10000) / 100, max: 100, checks: checks.map((c) => Object.assign({}, c, { points: Math.round(c.points / max * 10000) / 100, earned: Math.round(c.earned / max * 10000) / 100 })) };
};
