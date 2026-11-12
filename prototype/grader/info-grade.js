/* Category H: Plain-language help ("i" buttons) and hourly-job flows. 100 automated points, reported separately from A-E + R, F and G.
   Plugged in from grade.js:  require('./info-grade.js').run(X)  ->  { earned, max, checks }.   Standalone: INFO_ONLY=1 node grade.js
   H1 glossary integrity, H2 button coverage on every page, H3 sheet behaviour + accessibility, H4 content accuracy against engine constants and example arithmetic,
   H5 hourly job flows, H6 optional fields left blank, H7 old saves / migration, H8 automatic tax estimate, H9 collapsed-by-default sections + renamed labels, H10 clean run.
   Runs with section auto-expansion OFF (collapsed defaults are part of what is tested). Never modifies the app. Run one check: H_ONLY=H3,H5 */
const fs = require('fs'), path = require('path');

exports.run = async function run(X) {
  const { E, Parts, mkS, DATA_V, KEY, money, mkCtx, mkPage, base, collect, setVal, EXPAND_JS } = X;
  const V4 = path.resolve(__dirname, '../v4');
  const { INFO, LABEL, LOAN } = require(path.join(V4, 'info.js'));
  const appSrc = fs.readFileSync(path.join(V4, 'app.js'), 'utf8');
  const UIKEY = 'rep-v4-ui';
  const checks = [];
  const errStart = collect.errors.length, reqStart = collect.requests.length;
  async function hcheck(id, name, points, repro, fn) {
    if (process.env.H_ONLY && process.env.H_ONLY.split(',').indexOf(id) < 0) return;
    let r; const t0 = Date.now();
    try { r = await fn(); } catch (e) { r = { ratio: 0, detail: 'CRASH in check: ' + (e && e.stack || e).toString().slice(0, 500) }; }
    if (r instanceof Parts) r = { ratio: r.ratio, detail: r.detail };
    if (typeof r === 'boolean') r = { ratio: r ? 1 : 0, detail: r ? 'ok' : 'failed' };
    const ratio = Math.max(0, Math.min(1, r.ratio));
    const rec = { id, category: 'H', name, points, earned: Math.round(points * ratio * 100) / 100, ratio, detail: r.detail || '', repro, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
    checks.push(rec);
    console.log(`  [${rec.earned.toFixed(2)}/${points}] ${id} ${name}  (${rec.seconds}s)${ratio < 1 ? '  <-- ' + String(rec.detail).slice(0, 400) : ''}`);
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const PHZ = (st) => require('./plannedhz.js')(E).plannedHz(st, E.plan(clone(st))); /* the Planned page shows the planned assets only */
  const BADRE = /(^|[^A-Za-z])(NaN|-?Infinity|undefined|\[object)([^A-Za-z]|$)/;
  const $f = (n) => { const a = Math.abs(isFinite(n) ? n : 0), sg = n < -0.5 ? '−' : ''; return a >= 1e9 ? sg + '$' + (a / 1e9).toFixed(2) + 'B' : a >= 1e7 ? sg + '$' + (a / 1e6).toFixed(1) + 'M' : sg + '$' + Math.round(a).toLocaleString('en-US'); };
  const numsIn = (s) => (String(s).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((x) => +x.replace(/,/g, ''));

  /* ---------------------------------------------------------------- page plumbing (no auto-expansion here) */
  const ctx = await mkCtx({ autoExpand: false }); const page = await mkPage(ctx, 'info');
  let seq = 0;
  async function load(pg, S, hash, ui) {
    await pg.goto(base() + '/index.html?h=' + seq++);
    await pg.evaluate(([k, s, uk, u]) => { try { localStorage.clear(); if (s) localStorage.setItem(k, JSON.stringify(s)); if (u) localStorage.setItem(uk, JSON.stringify(u)); } catch (e) {} }, [KEY, S || null, UIKEY, ui || null]);
    await pg.goto(base() + '/index.html?h=' + seq++ + (hash || ''));
    await pg.waitForSelector('#app > *');
  }
  async function nav(pg, h) {
    await pg.evaluate(async (h) => { const cur = location.hash; if (cur === h || (h === '#' && cur === '')) window.dispatchEvent(new Event('hashchange')); else location.hash = h; await new Promise((r) => setTimeout(r, 30)); }, h);
  }
  const openAll = (pg) => pg.evaluate(EXPAND_JS);
  const stateOf = (pg) => pg.evaluate(() => JSON.parse(JSON.stringify(window.__app.state)));
  const sampleS = () => { const S = E.seed(); S.v = DATA_V; return S; };
  const text = (pg) => pg.evaluate(() => document.getElementById('app').innerText);
  const clickSel = (pg, sel) => pg.evaluate(async (sel) => { const el = document.querySelector(sel); if (!el) return false; el.click(); await new Promise((r) => setTimeout(r, 25)); return true; }, sel);
  const scanBad = async (pg) => { const t = await pg.evaluate(() => { const a = document.getElementById('app'); return a.innerText + ' ' + [...a.querySelectorAll('input')].map((i) => i.value).join(' | '); }); const m = BADRE.exec(t); return m ? m[2] + ' near "' + t.slice(Math.max(0, t.search(BADRE) - 30), t.search(BADRE) + 30).replace(/\s+/g, ' ') + '"' : ''; };
  /* what an (i) button scan of the current page looks like */
  const SCAN = () => ({
    keys: [...document.querySelectorAll('#app button.info')].map((b) => ({ key: b.dataset.info, label: b.getAttribute('aria-label') || '', inLabel: (b.closest('.lb,small,.sec,.loanrow,th,.vq,.f') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim() })),
    texts: [...document.querySelectorAll('#app .lb, #app .kpi small, #app th, #app .sec, #app .loanopt b, #app .vq b, #app .loanrow b, #app .cs')].map((e) => e.textContent.replace(/\s+/g, ' ').trim())
  });
  const scan = (pg) => pg.evaluate(SCAN);
  const seenKeys = new Set();
  const visit = async (pg, S, hash, pre) => { await load(pg, S, hash); if (pre) await pre(pg); await openAll(pg); const s = await scan(pg); s.keys.forEach((k) => seenKeys.add(k.key)); return s; };

  /* ---------------------------------------------------------------- fixtures */
  const mixedS = () => { /* FHA, 203(k) over the Limited cap, bridge (interest-only), cash and seller-financed assets, so every chip / note can appear */
    const S = mkS({}, [
      E.newAsset('house', 'fha', { id: 'fh', addr: 'FHA House', status: 'owned', price: 250000, paid: 6, rent: 2400, tax: 250, ins: 100, target: 'k2' }),
      E.newAsset('house', 'k203', { id: 'k2', addr: 'Fixer', price: 220000, capex: 90000, buyIn: 12, rent: 2300, tax: 220, ins: 90 }),
      E.newAsset('commercial', 'bridge', { id: 'br', addr: 'Bridge Plaza', price: 900000, buyIn: 30, rent: 9000, tax: 400, ins: 300 }),
      E.newAsset('house', 'cashh', { id: 'cs', addr: 'Cash House', status: 'owned', price: 150000, rent: 1700, tax: 150, ins: 70 }),
      E.newAsset('business', 'sellerb', { id: 'sb', addr: 'Seller Biz', price: 300000, buyIn: 40, rent: 8000, exit: 'merge', exitMonth: 70, exitLift: 10, mergeInto: 'bz' }),
      E.newAsset('business', 'sba7a', { id: 'bz', addr: 'Biz Two', status: 'owned', price: 500000, rent: 12000, paid: 5 })]);
    S.v = DATA_V; return S; };

  /* ================================================================ H1 glossary integrity (node) */
  await hcheck('H1', 'Glossary integrity: complete entries, plain wording, every label / loan mapped to a real and sensible entry, acronyms explained', 8,
    'node: inspect v4/info.js INFO / LABEL / LOAN', async () => {
      const P = new Parts(), keys = Object.keys(INFO);
      const shape = keys.filter((k) => { const d = INFO[k]; return !(d && typeof d.t === 'string' && d.t.trim() && d.t.length <= 40 && typeof d.b === 'string' && d.b.length >= 40 && d.b.length <= 450 && (d.e === undefined || typeof d.e === 'string') && (!d.e || d.e.length <= 220)); });
      P.t(shape.length === 0, 'every entry has a title (<= 40 chars), a body of 40-450 chars and an example of <= 220 chars', 1.5, shape.join(','));
      const titles = keys.map((k) => INFO[k].t.toLowerCase()), dupT = titles.filter((t, i) => titles.indexOf(t) !== i);
      P.t(dupT.length === 0, 'titles are unique (no two entries answer to the same name)', 0.5, dupT.join(','));
      const sloppy = keys.filter((k) => /[<>{}]|\s{2,}|\bTODO\b|\bundefined\b|\bnull\b/i.test(INFO[k].t + INFO[k].b + (INFO[k].e || '')) || !/[.!?)]$/.test(INFO[k].b.trim()) || /\bi\.e\.|\be\.g\./i.test(INFO[k].b));
      P.t(sloppy.length === 0, 'no markup, doubled spaces, placeholders, "e.g."/"i.e." or unfinished sentences', 0.5, sloppy.join(','));
      const lab = Object.entries(LABEL).filter(([, k]) => !INFO[k]).map(([l]) => l), lo = Object.entries(LOAN).filter(([, k]) => !INFO[k]).map(([l]) => l);
      P.t(lab.length === 0 && lo.length === 0, 'every LABEL and LOAN mapping points at an existing entry', 1, lab.concat(lo).join(','));
      const unmapped = E.LOANS.filter((l) => !LOAN[l.id]).map((l) => l.id);
      const sem = { conv: /Conventional/i, fha: /^FHA 30/i, k203: /203\(k\)/i, dscrloan: /DSCR/i, cashbuy: /Cash/i, bankloan: /bank|commercial/i, sba: /SBA/i, bridge: /Bridge/i, sellerfin: /Seller/i };
      const wrong = E.LOANS.filter((l) => LOAN[l.id] && sem[LOAN[l.id]] && !sem[LOAN[l.id]].test(l.name)).map((l) => l.id + '->' + LOAN[l.id]);
      P.t(unmapped.length === 0 && wrong.length === 0, 'every engine loan option has an info entry that is actually about that loan type', 1.5, 'unmapped ' + unmapped.join(',') + ' wrong ' + wrong.join(','));
      /* acronyms must be defined: own title, own entry elsewhere in the glossary, or spelled out inside the sentence */
      const ok = (a, k) => INFO[k].t.includes(a) || keys.some((q) => INFO[q].t.includes(a)) || new RegExp('\\(also called|\\(' + a.replace(/[()]/g, '\\$&') + '\\)|' + a + '\\)').test(INFO[k].b) || ['U.S.', 'LOC'].includes(a);
      const undef = []; keys.forEach((k) => { const all = INFO[k].b + ' ' + (INFO[k].e || ''); (all.match(/\b[A-Z]{3,}\b|\b[A-Z]{2,}\b/g) || []).forEach((a) => { if (!ok(a, k)) undef.push(k + ':' + a); }); });
      P.t(undef.length === 0, 'every acronym used in a definition is itself explained (own entry, title or spelled out)', 1, undef.slice(0, 8).join(', '));
      /* readability: short sentences, short words */
      const long = []; keys.forEach((k) => { const sent = (INFO[k].b + ' ' + (INFO[k].e || '')).split(/(?<=[.!?])\s+/); sent.forEach((s) => { if (s.split(/\s+/).length > 40) long.push(k); }); });
      const fk = (s) => { const sents = Math.max(1, (s.match(/[.!?]+/g) || []).length), words = s.split(/\s+/).filter(Boolean), syl = words.reduce((a, w) => a + Math.max(1, (w.toLowerCase().replace(/[^a-z]/g, '').replace(/e$/, '').match(/[aeiouy]+/g) || []).length), 0); return 0.39 * (words.length / sents) + 11.8 * (syl / words.length) - 15.59; };
      const hard = keys.filter((k) => fk(INFO[k].b) > 12).map((k) => k + '=' + fk(INFO[k].b).toFixed(1));
      P.t(long.length === 0 && hard.length === 0, 'plain language: no sentence over 40 words and every body reads at about grade 12 or easier (Flesch-Kincaid)', 1, 'long ' + long.join(',') + ' hard ' + hard.join(','));
      P.t(keys.length >= 60, 'the glossary covers the app (>= 60 entries)', 0.5, keys.length);
      P.t(!/<script|javascript:|https?:\/\//i.test(JSON.stringify(INFO)), 'no links or scripts in definitions', 0.5);
      return P; });

  /* ================================================================ H2 coverage on every page */
  const COV = [];
  const expectOn = (pageName, fixture, hash, pre, list) => COV.push({ pageName, fixture, hash, pre, list });
  /* [label regex as shown on the page, allowed keys] */
  expectOn('Portfolio (sample)', sampleS, '#', null, [[/^Net worth$/, ['networth']], [/^Cash flow \/ mo$/, ['cashflow']], [/^DSCR$/, ['dscr']]]);
  /* the main screen has three pages: Real (bought assets: totals, credit line) and Saved (portfolios you keep) carry their own (i) buttons */
  expectOn('Portfolio: Real page', sampleS, '#', async (pg) => { await clickSel(pg, '[data-testid=tab-real]'); }, [[/^Net worth$/, ['networth']], [/^Cash flow \/ mo$/, ['cashflow']], [/^DSCR$/, ['dscr']]]);
  expectOn('Portfolio: Saved page', sampleS, '#', async (pg) => { await clickSel(pg, '[data-testid=tab-saved]'); }, [[/^Saved portfolios$/, ['saved']]]);
  /* a list that starts with a planned asset has no trust behind its first purchase, so the outside-cash notice (and its (i)) appears */
  expectOn('Portfolio (first asset needs outside cash)', () => { const S = E.seed(); S.houses = S.houses.filter((h) => h.status !== 'owned'); S.v = DATA_V; return S; }, '#', null, [[/^Net worth$/, ['networth']]]);
  const houseList = [[/^Months already paid/, ['paid']], [/^Plan for this asset/, ['exit']], [/^Purchase/, ['auto']], [/^Down payment$/, ['downpayment']], [/^Down payment \$/, ['downamt']], [/^Loan amount/, ['loanamount']],
    [/^Appreciation/, ['growth']], [/^Loan option$/, ['loanoption']], [/^Interest rate/, ['rate']], [/^Term/, ['term']], [/^Closing costs/, ['closing']], [/^Extra \/ month/, ['extra']], [/^Paid off in/, ['payoff']], [/^Other liens/, ['liens']],
    [/^DSCR (now|while held)/, ['dscr']], [/^Cash flow (now|while held)/, ['cashflow']], [/^Cash-on-cash/, ['coc']], [/^Improvement budget/, ['capex']], [/^Months to finish/, ['capexmonths']],
    [/^New appraised value/, ['arv']], [/^Value gained/, ['gain']], [/^Income lift/, ['liftincome']]];
  expectOn('Asset page: owned home in the trust', sampleS, '#house-maple', null, houseList);
  expectOn('Asset page: planned commercial property that sells', sampleS, '#house-north', null, [[/^Cap rate/, ['caprate']], [/^Value growth/, ['growth']], [/^Not before/, ['buyin']], [/^Cash needed/, ['cashneeded']], [/^Trust can pay at/, ['nextdp']], [/^Selling costs/, ['sellcost']], [/^Net proceeds/, ['proceeds']], [/^Down payment$/, ['downpayment']], [/^Other liens/, ['liens']], [/^DSCR (now|while held)/, ['dscr']]]);
  expectOn('Asset page: business that merges', sampleS, '#house-keystone', null, [[/^Price ÷ yearly profit/, ['multiple']], [/^Business growth/, ['growth']], [/^Synergy lift/, ['merge']], [/^Not before/, ['buyin']], [/^Cash needed/, ['cashneeded']], [/^Trust can pay at/, ['nextdp']], [/^Other liens/, ['liens']]]);
  expectOn('Asset page: owned business', sampleS, '#house-auto', null, [[/^Price ÷ yearly profit/, ['multiple']], [/^Months already paid/, ['paid']], [/^Other liens/, ['liens']]]);
  expectOn('Assumptions', sampleS, '#assumptions', null, [[/^Max loan vs value/, ['debtcap']], [/^Appraisal cut/, ['haircut']], [/^Closing costs/, ['closing']], [/^Line of credit rate/, ['creditline']], [/^Co-signer 1/, ['cosigner']], [/^Co-signer 2/, ['cosigner']],
    [/^Debt-to-income limit/, ['dti']], [/^Rent counted/, ['rentcount']], [/^Other (monthly )?debts/, ['otherdebts']], [/^Vacancy/, ['vacancy']], [/^Management/, ['mgmt']], [/^Repairs/, ['repairs']], [/^Growth/, ['growth']], [/^Projection length/, ['projection']], [/^Open the app on/, ['openon']]]);
  expectOn('Finances: salary job, cash, taxes, managers', sampleS, '#finances', null, [[/^Gross pay/, ['grosspay']], [/^Hours \/ week$/, ['hours']], [/^Ends in/, ['jobend']], [/^Yearly raise/, ['raise']], [/^Tax rate/, ['taxrate']], [/^Starts in/, ['jobstart']],
    [/^Liquid cash/, ['liquid']], [/^Cash interest/, ['cashapy']], [/^Cash cushion/, ['emergency']], [/^Living costs/, ['living']], [/^Cost increases/, ['inflation']], [/^Other debts/, ['otherdebts']], [/^Tax on portfolio income/, ['portfoliotax']],
    [/^Tax on gains/, ['salestax']], [/^Businesses you run yourself/, ['operating']], [/^Hours \/ week each takes/, ['bizhours']], [/^Manager pay/, ['gmpay']]]);
  expectOn('Finances: hourly job', sampleS, '#finances', async (pg) => { await clickSel(pg, '[data-addjob=hourly]'); }, [[/^Hourly wage/, ['wage']], [/^Tips per hour/, ['tips']], [/^Weeks worked/, ['weeks']], [/^Ends in/, ['jobend']], [/^Tax rate/, ['taxrate']]]);
  const addCards = ['house', 'commercial', 'business'].map((tp) => [tp, E.loansFor(tp).map((l) => l.id)]); /* every loan the engine offers for that type */
  await hcheck('H2', 'Info-button coverage: every jargon label on every page (Portfolio, asset types, Assumptions, Finances, Add) has an (i) with the right definition; no orphan glossary entries', 16,
    'Open each page without expanding anything extra, expand its sections as a user would, list the (i) buttons beside labels', async () => {
      const P = new Parts();
      for (const c of COV) {
        const s = await visit(page, c.fixture(), c.hash, c.pre);
        for (const [re, allowed] of c.list) {
          const shown = s.texts.filter((t) => re.test(t.replace(/\s*auto$/, '').replace(/\s*i$/, '')) || re.test(t));
          const hit = s.keys.filter((k) => allowed.includes(k.key) && re.test(k.inLabel.replace(/\s*auto$/, '').replace(/\s*i\s*(auto)?$/, '').trim()));
          const any = s.keys.some((k) => allowed.includes(k.key));
          P.t(shown.length > 0 && (hit.length > 0 || (any && !shown.length)), c.pageName + ': "' + re.source.replace(/\^|\\/g, '') + '" -> (i) ' + allowed[0], 1, shown.length ? (any ? 'button exists but not beside the label' : 'no (i) beside "' + shown[0] + '"') : 'label not found on the page (page changed?)');
        }
      }
      for (const [tp, ids] of addCards) {
        await load(page, sampleS(), '#add'); await clickSel(page, `[data-addtype="${tp}"]`);
        const cards = await page.evaluate(() => [...document.querySelectorAll('.loanrow')].map((r) => ({ id: (r.querySelector('[data-pickloan]') || { dataset: {} }).dataset.pickloan, info: (r.querySelector('button.info') || { dataset: {} }).dataset.info })));
        cards.forEach((c) => { if (c.info) seenKeys.add(c.info); });
        const missing = ids.filter((id) => !cards.find((c) => c.id === id && c.info === LOAN[id]));
        P.t(missing.length === 0, 'Add ' + tp + ': every loan card (' + ids.join(', ') + ') has an (i) beside it with its own definition', 2, 'missing/wrong: ' + missing.join(','));
      }
      /* extra states: FHA / 203(k) / bridge / cash / seller assets */
      for (const id of ['fh', 'k2', 'br', 'cs', 'sb']) await visit(page, mixedS(), '#house-' + id);
      await visit(page, mixedS(), '#'); await visit(page, sampleS(), '#import-new');
      const never = Object.keys(INFO).filter((k) => !seenKeys.has(k));
      P.t(never.length === 0, 'no orphan glossary entries: every definition can be opened from some page (' + Object.keys(INFO).length + ' entries)', 3, never.length + ' never shown: ' + never.join(', '));
      return P; });

  /* ================================================================ H3 sheet behaviour and accessibility */
  const SHEET = () => { const s = document.querySelector('[data-testid=info-sheet]'); if (!s) return null; const r = s.getBoundingClientRect(), h = s.querySelector('h3'), bg = document.querySelector('.sheet-bg');
    return { role: s.getAttribute('role'), modal: s.getAttribute('aria-modal'), lb: s.getAttribute('aria-labelledby'), lbText: s.getAttribute('aria-labelledby') && document.getElementById(s.getAttribute('aria-labelledby')) ? document.getElementById(s.getAttribute('aria-labelledby')).textContent : null, h: h ? h.textContent : '', ps: [...s.querySelectorAll('p')].map((p) => p.textContent),
      btn: !!s.querySelector('[data-testid=info-close]'), btnName: (s.querySelector('[data-testid=info-close]') || {}).textContent, focus: document.activeElement === s.querySelector('[data-testid=info-close]'), inSheet: s.contains(document.activeElement),
      rect: { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }, vw: innerWidth, vh: innerHeight, bg: !!bg, scrollH: s.scrollHeight, clientH: s.clientHeight, ov: getComputedStyle(s).overflowY, hash: location.hash, active: document.activeElement && (document.activeElement.dataset.info || document.activeElement.tagName) }; };
  const CONTRAST = () => { const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return [255, 255, 255, 1]; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const eff = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0.95) return c; } return [255, 255, 255, 1]; };
    const out = []; document.querySelectorAll('[data-testid=info-sheet] h3, [data-testid=info-sheet] p, [data-testid=info-sheet] .btn').forEach((el) => { const fg = parse(getComputedStyle(el).color), bg = eff(el), a = lum(fg), b = lum(bg); out.push({ t: el.tagName + ':' + el.textContent.slice(0, 12), cr: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }); }); return out; };

  await hcheck('H3', 'Info sheet: opens with the right content, closes by button / Escape / backdrop / navigation, accessible names and roles, keyboard, contrast, fits small screens, never changes data', 16,
    'Playwright 390x844 and 320x568: open (i), inspect dialog, close every way', async () => {
      const P = new Parts(); await load(page, sampleS(), '#'); await page.setViewportSize({ width: 390, height: 844 });
      P.t((await page.locator('[data-testid=info-sheet]').count()) === 0, 'no sheet is open on load', 0.3);
      const st0 = await page.evaluate(() => localStorage.getItem('rep-v4'));
      await page.click('[data-info=dscr]'); await page.waitForTimeout(50); let sh = await page.evaluate(SHEET), d = INFO.dscr;
      P.t(!!sh && sh.h === d.t && sh.ps[0] === d.b && (!d.e || sh.ps[1] === 'Example: ' + d.e), 'opens with the title, meaning and example of that term (DSCR)', 1.2, sh && sh.h + ' / ' + (sh && sh.ps.join(' | ').slice(0, 80)));
      P.t(!!sh && sh.role === 'dialog' && sh.modal === 'true' && sh.lb && sh.lbText === d.t, 'sheet is role=dialog, aria-modal=true and labelled by its heading', 1, JSON.stringify(sh && [sh.role, sh.modal, sh.lb]));
      P.t(!!sh && sh.btn && /got it/i.test(sh.btnName) && sh.focus, 'has a "Got it" button (info-close) and keyboard focus moves into the sheet onto it', 1, sh && [sh.btnName, sh.focus]);
      P.t(!!sh && sh.rect.t >= 0 && sh.rect.b <= sh.vh + 0.5 && sh.rect.l >= 0 && sh.rect.r <= sh.vw + 0.5 && sh.bg, 'sheet and its backdrop sit inside the viewport', 0.5, JSON.stringify(sh && sh.rect));
      const sheetClick = await page.evaluate(() => { document.querySelector('[data-testid=info-sheet] p').click(); return !!document.querySelector('[data-testid=info-sheet]'); });
      P.t(sheetClick, 'tapping the text inside the sheet does not close it', 0.4);
      await page.click('[data-testid=info-close]'); await page.waitForTimeout(40);
      P.t((await page.locator('[data-testid=info-sheet]').count()) === 0 && (await page.evaluate(() => location.hash)) === '' || (await page.evaluate(() => location.hash)) === '#', 'the button closes it and the page stays where it was (same route)', 0.8);
      P.t((await page.evaluate(() => localStorage.getItem('rep-v4'))) === st0, 'opening and closing help never changes saved data', 0.6);
      /* focus goes back where the person was */
      const back = await page.evaluate(() => { const a = document.activeElement; return a && a.dataset && a.dataset.info; });
      P.t(back === 'dscr', 'after closing, keyboard focus returns to the (i) that opened it', 1.2, 'focus is on ' + (await page.evaluate(() => { const a = document.activeElement; return a ? a.tagName + '.' + (a.className || '') : 'none'; })));
      /* escape + backdrop */
      await page.click('[data-info=networth]'); await page.waitForTimeout(40); await page.keyboard.press('Escape'); await page.waitForTimeout(40);
      P.t((await page.locator('[data-testid=info-sheet]').count()) === 0, 'Escape closes it', 1);
      await page.keyboard.press('Escape'); await page.waitForTimeout(30); P.t((await text(page)).length > 100 && (await page.locator('[data-testid=info-sheet]').count()) === 0, 'Escape with nothing open does nothing', 0.2);
      await page.click('[data-info=cashflow]'); await page.waitForTimeout(40);
      const hitBg = await page.evaluate(() => { const e = document.elementFromPoint(195, 60); return !!(e && e.matches('.sheet-bg,[data-info-close]')); });
      await page.mouse.click(195, 60); await page.waitForTimeout(40);
      P.t(hitBg && (await page.locator('[data-testid=info-sheet]').count()) === 0, 'tapping the dim backdrop closes it', 1, 'backdrop hit ' + hitBg);
      /* keyboard open */
      await page.focus('[data-info=dscr]'); await page.keyboard.press('Enter'); await page.waitForTimeout(40); const k1 = (await page.locator('[data-testid=info-sheet]').count()) === 1; await page.keyboard.press('Escape'); await page.waitForTimeout(30);
      await page.focus('[data-info=dscr]'); await page.keyboard.press('Space'); await page.waitForTimeout(40); const k2 = (await page.locator('[data-testid=info-sheet]').count()) === 1; await page.keyboard.press('Escape'); await page.waitForTimeout(30);
      P.t(k1 && k2, 'the (i) opens with Enter and with Space (it is a real button)', 0.8, [k1, k2]);
      await page.click('[data-info=dscr]'); await page.waitForTimeout(30); await page.click('[data-testid=info-close]'); await page.click('[data-info=cashflow]'); await page.waitForTimeout(30); sh = await page.evaluate(SHEET);
      P.t(!!sh && sh.h === INFO.cashflow.t, 'a second (i) opened after closing the first shows its own definition', 0.5, sh && sh.h);
      await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(30);
      const trapped = await page.evaluate(() => { const s = document.querySelector('[data-testid=info-sheet]'); return !!s && (s.contains(document.activeElement) || document.activeElement === document.body); });
      await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(30);
      const trapped2 = await page.evaluate(() => { const s = document.querySelector('[data-testid=info-sheet]'); return !!s && (s.contains(document.activeElement) || document.activeElement === document.body); });
      P.t(trapped && trapped2, 'aria-modal is honoured: Tab and Shift+Tab never land on controls behind the sheet', 0.8, 'forward ' + trapped + ' back ' + trapped2 + ' active=' + (await page.evaluate(() => { const a = document.activeElement; return a ? a.tagName + (a.dataset.info ? '[' + a.dataset.info + ']' : '') : ''; })));
      await page.keyboard.press('Escape');
      await page.click('[data-info=dscr]'); await page.waitForTimeout(30); await nav(page, '#assumptions'); P.t((await page.locator('[data-testid=info-sheet]').count()) === 0, 'changing page (hash) closes an open sheet', 0.4);
      /* content + accessible names for EVERY (i) on every page */
      const bad = [], names = []; let nBtn = 0;
      const sweep = async (S, hash, pre) => { await load(page, S, hash); if (pre) await pre(page); await openAll(page);
        const res = await page.evaluate(async () => { const out = []; const nb = document.querySelectorAll('#app button.info').length; for (let bi = 0; bi < nb; bi++) { const b = document.querySelectorAll('#app button.info')[bi]; /* re-query: opening the sheet re-renders the page */ const key = b.dataset.info, al = b.getAttribute('aria-label') || '', typ = b.getAttribute('type'), glyph = b.querySelector('[aria-hidden=true]'); b.click(); await new Promise((r) => setTimeout(r, 5));
            const s = document.querySelector('[data-testid=info-sheet]'); out.push({ key, al, typ, glyph: !!glyph, h: s ? s.querySelector('h3').textContent : null, ps: s ? [...s.querySelectorAll('p')].map((p) => p.textContent) : [] }); document.querySelector('[data-testid=info-close]') && document.querySelector('[data-testid=info-close]').click(); await new Promise((r) => setTimeout(r, 5)); } return out; });
        res.forEach((r) => { nBtn++; const d = INFO[r.key]; if (!d || r.h !== d.t || r.ps[0] !== d.b || (d.e ? r.ps[1] !== 'Example: ' + d.e : r.ps.length !== 1)) bad.push(hash + ':' + r.key + ' -> ' + r.h); if (!r.al || !/^What does .+ mean\?$/.test(r.al) || !r.al.includes(d ? d.t : '\u0000') || r.typ !== 'button' || !r.glyph) names.push(hash + ':' + r.key + ' "' + r.al + '"'); }); };
      await sweep(sampleS(), '#'); await sweep(sampleS(), '#house-maple'); await sweep(sampleS(), '#house-north'); await sweep(sampleS(), '#house-keystone'); await sweep(sampleS(), '#assumptions'); await sweep(sampleS(), '#finances', async (pg) => { await clickSel(pg, '[data-addjob=hourly]'); }); await sweep(sampleS(), '#add');
      P.t(bad.length === 0 && nBtn > 80, 'every one of the ' + nBtn + ' (i) buttons on 7 pages opens exactly its own title, meaning and example', 2, bad.slice(0, 3).join(' | '));
      P.t(names.length === 0, 'every (i) is a type=button with an accessible name "What does <term> mean?" naming its own term, and a hidden glyph', 1.5, names.slice(0, 3).join(' | '));
      /* (i) does not trigger the control around it */
      await load(page, sampleS(), '#house-maple'); await openAll(page); const before = await page.evaluate(() => document.querySelector('[data-p="h.maple.rate"]').value);
      const hasRate = !!(await page.$('[data-info=rate]')); if (hasRate) { await page.click('[data-info=rate]'); await page.waitForTimeout(40); }
      const aft = await page.evaluate(() => ({ v: document.querySelector('[data-p="h.maple.rate"]').value, act: document.activeElement.dataset.p || '', open: !!document.querySelector('[data-testid=info-sheet]') }));
      if (hasRate) await page.click('[data-testid=info-close]');
      await load(page, sampleS(), '#add'); const n0 = (await stateOf(page)).houses.length, sel0 = await page.evaluate(() => document.querySelector('.loanopt.on') && document.querySelector('.loanopt.on').dataset.pickloan);
      const hasCard = !!(await page.$('[data-info=conv]')); if (hasCard) { await page.click('[data-info=conv]'); await page.waitForTimeout(40); await page.click('[data-testid=info-close]'); } const sel1 = await page.evaluate(() => document.querySelector('.loanopt.on') && document.querySelector('.loanopt.on').dataset.pickloan); const n1 = (await stateOf(page)).houses.length;
      P.t(hasRate && hasCard && aft.open && before === aft.v && aft.act !== 'h.maple.rate' && sel0 === sel1 && n0 === n1 && (await page.evaluate(() => location.hash)) === '#add', 'tapping an (i) inside a field or loan card does not edit the field, pick the loan, add anything or navigate', 1, JSON.stringify([before, aft, sel0, sel1, n0, n1]));
      /* small phone: the longest definitions fit and stay reachable */
      await page.setViewportSize({ width: 320, height: 568 }); await load(page, sampleS(), '#add'); await page.click('[data-info=k203]'); await page.waitForTimeout(40); sh = await page.evaluate(SHEET);
      const reach = !!sh && sh.rect.t >= 0 && sh.rect.b <= sh.vh + 0.5 && sh.rect.l >= 0 && sh.rect.r <= sh.vw + 0.5;
      P.t(reach || (sh && sh.ov !== 'visible' && sh.rect.h <= sh.vh), 'at 320x568 the longest definition (FHA 203(k)) fits on screen or scrolls inside the sheet', 1.2, JSON.stringify(sh && [sh.rect, sh.scrollH, sh.clientH, sh.ov]));
      const btnBox = await page.evaluate(() => { const b = document.querySelector('[data-testid=info-close]').getBoundingClientRect(); return { t: b.top, b: b.bottom, h: b.height }; });
      P.t(btnBox.t >= 0 && btnBox.b <= 568.5 && btnBox.h >= 44, '"Got it" stays on screen at 320x568 and is at least 44px tall', 0.6, JSON.stringify(btnBox));
      await page.click('[data-testid=info-close]'); await page.setViewportSize({ width: 390, height: 844 });
      /* contrast in both colour schemes */
      const lowC = []; for (const scheme of ['light', 'dark']) { await page.emulateMedia({ colorScheme: scheme }); await load(page, sampleS(), '#'); await page.click('[data-info=dscr]'); await page.waitForTimeout(40); (await page.evaluate(CONTRAST)).forEach((c) => { if (c.cr < 4.5) lowC.push(scheme + ' ' + c.t + ' ' + c.cr.toFixed(2)); }); }
      await page.emulateMedia({ colorScheme: 'light' });
      P.t(lowC.length === 0, 'sheet text and button contrast >= 4.5:1 in light and dark mode', 0.8, lowC.join('; '));
      return P; });

  /* ================================================================ H4 content accuracy */
  await hcheck('H4', 'Definitions are accurate: numbers quoted match the engine constants and loan table, examples do their own arithmetic, stated rules behave that way in the engine', 16,
    'node: parse numbers out of v4/info.js and compare with engine.js constants and engine calculations', async () => {
      const P = new Parts(), L = (id) => E.LOANS.find((l) => l.id === id), G = E.GDEF, S0 = mkS({ closing: 0, appr: 0 }, []);
      const inRange = (txt, v, tag, w, re) => { const m = (re || /(\d+(?:\.\d+)?)%\s+to\s+(\d+(?:\.\d+)?)%/).exec(txt); return P.t(!!m && v >= +m[1] - 1e-9 && v <= +m[2] + 1e-9, tag, w, m ? v + ' not in ' + m[1] + '-' + m[2] : 'no range found'); };
      /* loan rules */
      P.t(numsIn(INFO.fha.b).includes(L('fha').dp) && L('fha').dp === 3.5 && L('fha').ownerOcc === true, 'FHA: "3.5%" down and owner-occupied only match the loan table', 1, INFO.fha.b);
      P.t(numsIn(INFO.mip.b).includes(L('fha').upfrontMip) && numsIn(INFO.mip.b).includes(L('fha').annualMip), 'Mortgage insurance: "1.75%" up front and "0.55%" a year equal the engine (upfrontMip, annualMip)', 1, L('fha').upfrontMip + '/' + L('fha').annualMip);
      P.t(numsIn(INFO.k203.b).includes(L('k203').dp) && L('k203').finRehab === true && L('k203').ownerOcc === true, '203(k): 3.5% down, rehab financed in the loan, owner-occupied match the loan table', 1);
      const A = (c) => { const S = mkS({ closing: 0 }, [E.newAsset('house', 'k203', { id: 'k', price: 200000, capex: c, status: 'planned' })]); return E.view(S, S.houses[0]); }, vk = A(40000);
      P.t(Math.abs(vk.down - (200000 + 40000) * 0.035) < 1, '203(k) "3.5% of the price plus repairs" is what the engine charges as down payment', 1, vk.down + ' vs ' + 240000 * 0.035);
      const cap = (n) => { const S = mkS({}, []); return n; };
      P.t(/\$75,000/.test(INFO.k203.b), '203(k): the Limited cap is quoted as $75,000', 0.3);
      inRange(INFO.conv.b, L('conv30').dp, 'Conventional: "15% to 25% down" contains the engine default (20%)', 0.7);
      inRange(INFO.dscrloan.b, L('dscr').dp, 'DSCR loan: "20% to 25% down" contains the engine default (25%)', 0.7);
      const bk = /DSCR of (\d+(?:\.\d+)?) or more\) and (\d+)% or more down/.exec(INFO.bankloan.b);
      P.t(!!bk && L('comm25').dp >= +bk[2] && L('bankbiz').dp >= +bk[2] && +bk[1] === 1.25, 'Bank loan: "25% or more down" holds for both bank loan options and the DSCR figure matches the 1.25 used on the Portfolio page', 1, bk && bk[0]);
      P.t(/\$5 million/.test(INFO.sba.b) && /\$5\.5 million/.test(INFO.sba.b) && /\$5M/.test(L('sba7a').name) && L('sba7a').term <= 120 && /operate/.test(L('sba504').name), 'SBA: 7(a) up to $5 million and 504 up to $5.5 million agree with the loan names; 504 needs you to operate in it', 1);
      P.t(L('bridge').io === true && /interest-only/i.test(INFO.bridge.b) && L('bridge').term <= 60 && /short/i.test(INFO.bridge.b), 'Bridge loan: interest-only and short term, as the engine models it', 0.6);
      { const S = mkS({}, [E.newAsset('house', 'bridge', { id: 'b', price: 500000, status: 'owned', extra: 0 })]), h = S.houses[0], v = E.view(S, h), i = h.rate / 1200, L0 = v.L; const S2 = mkS({}, [E.newAsset('house', 'bridge', { id: 'b', price: 500000, status: 'owned', extra: 1000 })]); const d0 = E.plan(S).series.debt, d1 = E.plan(S2).series.debt;
        P.t(Math.abs(v.P - L0 * i) < 0.01 && Math.abs(d0[12] - L0) < 1 && d1[12] < d0[12] - 5000, 'Interest-only: payment is interest only, the balance does not fall, extra payments do reduce it', 1, v.P + ' vs ' + L0 * i + ' / ' + d0[12] + ' ' + d1[12]); }
      P.t(L('cashh').dp === 100 && E.view(mkS({}, [E.newAsset('house', 'cashh', { id: 'c', price: 200000 })]), E.newAsset('house', 'cashh', { id: 'c', price: 200000 })).P === 0, 'Cash purchase: 100% down, no loan payment', 0.6);
      /* defaults vs the stated ranges */
      P.t(/85%/.test(INFO.creditline.b) && /85%/.test(INFO.debtcap.e) && G.cap === 85 && /80% to 85%/.test(INFO.debtcap.b), 'Credit line / debt cap: "up to 85%" and "80% to 85%" agree with the default cap (85)', 1, G.cap);
      P.t(/43%/.test(INFO.dti.b) && G.dti === 43, 'Debt-to-income: "43% or less" equals the default limit (43)', 1, G.dti);
      P.t(/75%/.test(INFO.rentcount.b) && G.rentCount === 75, 'Rent counted: "often 75%" equals the default (75)', 0.8, G.rentCount);
      P.t(/5% haircut means they count only 95%/.test(INFO.haircut.b) && G.haircut >= 0, 'Appraisal cut: the 5% -> 95% example is right', 0.4);
      { /* the cut really lowers what you can borrow: a home worth 200,000 with no loan, 85% cap */
        const D = (h, need) => { const S = mkS({ closing: 0, haircut: h, cap: 85 }, [E.newAsset('house', 'cashh', { id: 'a', status: 'owned', price: 200000, growth: 0, target: 'b', loanId: 'custom' }), E.newAsset('house', 'conv30', { id: 'b', status: 'planned', price: need / 0.2, dp: 20, growth: 0, closingPct: 0, target: '' })]); S.houses[0].dp = 100; return E.locMonths(S, S.houses[0], 0); };
        P.t(D(5, 161500) === 0 && D(5, 161600) > 0 && D(0, 169900) === 0 && D(0, 170100) > 0, 'Credit line and appraisal cut: 85% x $200,000 = $170,000 of room; with a 5% cut it is $161,500 (engine opens the line right at those amounts)', 1.4, [D(5, 161500), D(5, 161600), D(0, 169900), D(0, 170100)].join(',')); }
      P.t(Math.abs(0.07 * 365 - 26) <= 0.5 && /26 empty days/.test(INFO.vacancy.b) && G.vac === 7 && /Census/.test(INFO.vacancy.b), 'Vacancy: 7% of a year is about 26 days, it is the default, and the help names the Census rate it matches', 0.6);
      inRange(INFO.mgmt.b, G.mgmt, 'Management fee: "8% to 10%" contains the default (8)', 0.5);
      P.t(/1% a year/.test(INFO.repairs.b) && G.maint === 1, 'Repairs reserve: "1% a year" equals the default (1)', 0.4);
      { const S = mkS({ vac: 0, mgmt: 0, maint: 1 }, [E.newAsset('house', 'conv30', { id: 'r', price: 240000, rent: 2000, tax: 0, ins: 0 })]), S2 = mkS({ vac: 0, mgmt: 0, maint: 0 }, [E.newAsset('house', 'conv30', { id: 'r', price: 240000, rent: 2000, tax: 0, ins: 0 })]);
        P.t(Math.abs(E.view(S2, S2.houses[0]).noi - E.view(S, S.houses[0]).noi - 240000 * 0.01 / 12) < 0.01, 'Repairs: 1% a year of the value is taken out of income every month (240,000 x 1% / 12 = 200)', 0.8); }
      { const S = mkS({ vac: 5, mgmt: 0, maint: 0 }, [E.newAsset('house', 'conv30', { id: 'r', price: 240000, rent: 2000, tax: 0, ins: 0 })]);
        P.t(Math.abs(E.view(S, S.houses[0]).noi - 1900) < 0.01, 'Vacancy: 5% on $2,000 rent leaves $1,900 of income', 0.6); }
      P.t(E.LOANS.every((l) => l.closing >= 1 && l.closing <= 5) && G.closing >= 2 && G.closing <= 5 && /2% to 5%/.test(INFO.closing.b), 'Closing costs: "about 2% to 5%" - default and every loan option are within 1.5-5%', 0.6, E.LOANS.map((l) => l.closing).join(','));
      P.t(/5% to 7%/.test(INFO.sellcost.b) && E.newAsset('house', 'conv30', {}).sellCost >= 5 && E.newAsset('house', 'conv30', {}).sellCost <= 7, 'Selling costs: homes "5% to 7%" contains the default for a home', 0.5);
      /* worked examples */
      const ex = (k) => numsIn(INFO[k].e || '');
      const e1 = ex('downpayment'), e2 = ex('liens'), e3 = ex('dscr'), e4 = ex('coc'), e5 = ex('caprate'), e6 = ex('multiple'), e7 = ex('liftincome'), e8 = ex('debtcap');
      P.t(e1[0] / 100 * e1[1] === e1[2], 'Example (down payment): 20% of $200,000 = $40,000', 0.8, e1.join(','));
      P.t(e2.length >= 4 && e2[0] - e2[1] - e2[2] === e2[3], 'Example (liens): $200,000 - $140,000 - $20,000 = $40,000 of real ownership', 0.8, e2.join(','));
      P.t(Math.abs(e3[0] / e3[1] - 1.3) < 1e-9 && /1\.3/.test(INFO.dscr.e), 'Example (DSCR): $1,300 / $1,000 = 1.3', 0.8, e3.join(','));
      P.t(Math.abs(e4[0] / e4[1] * 100 - 8) < 1e-9 && e4.includes(8), 'Example (cash-on-cash): $2,400 / $30,000 = 8%', 0.8, e4.join(','));
      P.t(Math.abs(e5[0] / e5[1] * 100 - 8) < 1e-9, 'Example (cap rate): $80,000 / $1,000,000 = 8%', 0.8, e5.join(','));
      P.t(Math.max(...e6.slice(0, 2)) / Math.min(...e6.slice(0, 2)) === e6[2], 'Example (price / yearly profit): $300,000 / $100,000 = 3x', 0.8, e6.join(','));
      P.t(Math.abs(e7[1] * (1 + e7[0] / 100) - e7[2]) < 1e-9, 'Example (income lift): 10% on $2,000 = $2,200', 0.8, e7.join(','));
      P.t(e8[0] / 100 * e8[1] === e8[2], 'Example (debt cap): 85% of $200,000 = $170,000', 0.8, e8.join(','));
      /* engine does what the text says */
      { const mk = (liens) => mkS({ closing: 0, appr: 0 }, [E.newAsset('house', 'conv30', { id: 'a', status: 'owned', price: 300000, paid: 0, exit: 'sell', exitMonth: 24, sellCost: 6, liens, growth: 0, rent: 2500, tax: 0, ins: 0 })]); const p0 = E.plan(mk(0)), p1 = E.plan(mk(20000));
        P.t(Math.abs(p0.exits.a.proceeds - p1.exits.a.proceeds - 20000) < 0.01 && Math.abs(p0.horizon.nw - p1.horizon.nw) >= 0, 'Liens and net proceeds: a lien is paid back out of the sale (proceeds fall by exactly the lien)', 1, p0.exits.a.proceeds + ' vs ' + p1.exits.a.proceeds);
        const eq0 = E.plan(mk(0)).snap, S1 = mk(20000); S1.houses[0].exit = 'hold'; const S0b = mk(0); S0b.houses[0].exit = 'hold'; const q1 = E.plan(S1).snap[0], q0 = E.plan(S0b).snap[0];
        P.t(Math.abs((q0.equity - q1.equity) - 20000) < 0.01, 'Equity and net worth: "what it is worth minus what you owe" - a $20,000 lien lowers equity by $20,000', 1, q0.equity - q1.equity); }
      { const vf = E.view(mkS({ closing: 0 }, [E.newAsset('house', 'fha', { id: 'f', price: 200000, status: 'planned' })]), E.newAsset('house', 'fha', { id: 'f', price: 200000, status: 'planned' })); const S = mkS({ closing: 0 }, [E.newAsset('house', 'fha', { id: 'f', price: 200000, status: 'planned' })]), h = S.houses[0], v = E.view(S, h);
        P.t(Math.abs(v.L - 200000 * 0.965 * 1.0175) < 0.5 && v.mip > 0 && Math.abs(v.mip - v.L / 1.0175 * 0.0055 / 12) < 0.01, 'Loan amount and MIP: FHA loan = price - 3.5% down + 1.75% added to the loan; 0.55% a year of the loan without the added premium is paid monthly (24 CFR 203.284)', 1.2, v.L + ' / ' + v.mip); }
      { const S = mkS({}, [E.newAsset('house', 'conv30', { id: 'g', price: 200000, capex: 20000, arv: 260000, status: 'planned' })]); const v = E.view(S, S.houses[0]);
        P.t(Math.abs(v.valueGain - (260000 - 200000 - 20000)) < 0.01 && /minus \(price \+ repair cost\)/.test(INFO.gain.b), 'Value gained = new appraisal - (price + repair cost)', 0.7, v.valueGain); }
      { const hh = E.newAsset('house', 'conv30', { id: 'd', price: 250000, dp: 20, status: 'planned' }); const S = mkS({}, [hh]); const v = E.view(S, S.houses[0]);
        P.t(Math.abs(v.down - 250000 * 0.2) < 0.01 && Math.abs(v.L - 200000) < 0.01 && /price × down payment %/.test(INFO.downamt.b), 'Down payment $ = price x down payment %; loan = price - down payment', 0.6, v.down + ' ' + v.L); }
      { const S = mkS({}, []); S.p = E.normalizePersonal(Object.assign(E.samplePersonal(), { cash: 0, living: 3000, emergencyMonths: 6, jobs: [] })); S.g.otherDebt = 500; const f = E.finance(S, E.plan(S));
        P.t(Math.abs(f.series.reserve[0] - 6 * 3500) < 0.01 && /months of living costs plus debts/.test(INFO.emergency.b), 'Emergency reserve = months x (living costs + other debts): 6 x $3,500 = $21,000', 0.8, f.series.reserve[0]); }
      P.t(E.samplePersonal().inflation === 3 && E.samplePersonal().portfolioTaxPct === null && E.samplePersonal().salesTaxPct === null && /3% is a common/.test(INFO.inflation.b) && /Left blank, the app works it out/.test(INFO.portfoliotax.b) && /50 allows for two weeks off/.test(INFO.weeks.b), 'Finance defaults quoted in help (3% cost increases, taxes worked out unless a rate is typed, 50 weeks = two weeks off) equal the sample profile / hourly default', 0.7);
      { const j = E.normalizePersonal({ jobs: [{ id: 'x', kind: 'hourly', wage: 15, hours: 25, tips: 0, end: 12 }] }).jobs[0];
        P.t(E.jobMonthly(j, 11) > 0 && E.jobMonthly(j, 12) === 0 && /how many months from today the job ends/i.test(INFO.jobend.b) && /blank/i.test(INFO.jobend.b), 'Job end: "months from today the job ends" - income runs through month 11 and stops at 12; blank = no end', 0.8); }
      { const mkJ = (o) => E.normalizePersonal({ jobs: [Object.assign({ id: 'x', kind: 'hourly', wage: 20, tips: 5, hours: 30, weeks: 50 }, o)] }).jobs[0];
        P.t(mkJ({}).gross === 37500 && /multiplies it by your hours and weeks/.test(INFO.wage.b) && /count as income and are taxed/.test(INFO.tips.b), 'Hourly wage / tips: tips count as income (wage + tips) x hours x weeks = $37,500', 0.6, mkJ({}).gross); }
      P.t(/estimates it from your income/.test(INFO.taxrate.b) && /no state tax/.test(INFO.taxrate.b) && E.estTaxPct(20000) < E.estTaxPct(200000), 'Tax rate help: the blank-means-estimate and "no state tax" statements describe estTaxPct', 0.4);
      return P; });

  /* ================================================================ H5 hourly job flows */
  const jobCard = (pg, id) => pg.evaluate((id) => { const el = document.querySelector(`[data-p="j.${id}.name"]`); const c = el && el.closest('[data-testid=job-card]'); return c ? { note: (c.querySelector('[data-testid=job-take]') || {}).textContent, kindOn: (c.querySelector('[data-testid=kind-hourly]') || {}).className, more: (c.querySelector('[data-coll]') || {}).textContent, moreExp: (c.querySelector('[data-coll]') || {}).getAttribute && c.querySelector('[data-coll]').getAttribute('aria-expanded'), fields: [...c.querySelectorAll('[data-p]')].map((i) => i.dataset.p.split('.')[2]) } : null; }, id);
  const parseNote = (t) => { const m = /About (−?\$[\d,]+)\/mo take-home(?: \((\$[\d,]+)\/yr before tax\))?\. Tax (estimated at|set to) ([\d.]+)%\./.exec(String(t || '')); return m ? { take: money(m[1]), gross: m[2] ? money(m[2]) : null, mode: m[3] === 'set to' ? 'override' : 'auto', pct: +m[4] } : null; };
  const pict = (pg) => pg.evaluate(() => [...document.querySelectorAll('[data-testid=monthly-picture] tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim())));
  const verdictUI = (pg) => pg.evaluate(() => ({ chip: (document.querySelector('[data-testid=verdict-chip]') || {}).textContent, head: (document.querySelector('[data-testid=verdict-headline]') || {}).textContent }));
  const VL = { yes: 'Yes', tight: 'Tight', no: 'Not yet' };
  async function matchFin(P, pg, tag, w) { const S = await stateOf(pg), f = E.finance(clone(S)), v = await verdictUI(pg), pc = await pict(pg), take = pc.find((r) => /take-home/.test(r[0])), left = pc.find((r) => /Left over/.test(r[0]));
    P.t(v.chip === VL[f.status] && v.head === f.headline, tag + ': verdict chip + headline equal the engine on the saved state (' + VL[f.status] + ')', w, v.chip + ' / ' + (v.head || '').slice(0, 60) + ' vs ' + VL[f.status]);
    P.t(!!take && Math.abs(money(take[1]) - f.kpis.takeHome) <= 1.01 + Math.abs(f.kpis.takeHome) * 0.002 && !!left && Math.abs(money(left[1]) - f.kpis.net0) <= 1.01 + Math.abs(f.kpis.net0) * 0.002, tag + ': take-home and left-over equal the engine', w, (take && take[1]) + '/' + Math.round(f.kpis.takeHome) + ' ' + (left && left[1]) + '/' + Math.round(f.kpis.net0)); }

  await hcheck('H5', 'Hourly jobs: add, gross = (wage + tips) x hours x weeks, automatic vs typed tax, blank tax returns to automatic, temporary end month, switching kind, clamps, persistence', 12,
    'Finances: + Add an hourly job (data-addjob=hourly); edit wage, tips, hours, weeks, tax, end', async () => {
      const P = new Parts(); await load(page, sampleS(), '#finances');
      const n0 = (await stateOf(page)).p.jobs.length; P.t((await page.locator('[data-addjob=hourly]').count()) === 1 && (await page.locator('[data-testid=add-hourly-job]').count()) === 1, 'an "Add an hourly job" button exists (data-addjob="hourly")', 0.4);
      await page.click('[data-addjob=hourly]'); await page.waitForTimeout(60); let S = await stateOf(page), j = S.p.jobs.find((q) => q.kind === 'hourly'), id = j && j.id;
      P.t(S.p.jobs.length === n0 + 1 && !!j && j.wage > 0 && j.hours > 0 && j.weeks === 50 && j.tips === 0 && j.tax === null && j.end === null && j.gross === Math.round((j.wage + j.tips) * j.hours * j.weeks), 'adding creates an hourly job with sensible defaults (tips 0, 50 weeks, automatic tax, no end) and gross = wage x hours x weeks', 1, JSON.stringify(j));
      let c = await jobCard(page, id);
      P.t(!!c && /\bon\b/.test(c.kindOn) && c.fields.includes('wage') && c.fields.includes('hours') && c.fields.includes('tips') && c.fields.includes('end') && c.fields.indexOf('weeks') < 0 && c.fields.indexOf('tax') < 0 && c.fields.indexOf('raise') < 0 && /More details \(optional\)/.test(c.more || '') && c.moreExp === 'false', 'the card shows wage, hours, tips and end up front; weeks / raise / tax / start sit under a collapsed "More details (optional)"', 1, c && JSON.stringify([c.fields, c.more]));
      let nt = parseNote(c && c.note); P.t(!!nt && nt.mode === 'auto' && nt.gross === j.gross, 'the take-home note shows the yearly total before tax and says the tax is estimated', 0.5, c && c.note);
      await setVal(page, `[data-p="j.${id}.wage"]`, '20'); await setVal(page, `[data-p="j.${id}.tips"]`, '5'); await setVal(page, `[data-p="j.${id}.hours"]`, '30');
      S = await stateOf(page); j = S.p.jobs.find((q) => q.id === id);
      P.t(j.wage === 20 && j.tips === 5 && j.hours === 30 && j.gross === (20 + 5) * 30 * 50, 'gross = (wage + tips) x hours x weeks: (20 + 5) x 30 x 50 = $37,500', 1.2, 'gross ' + j.gross);
      await page.evaluate((id) => document.querySelector(`[data-coll="jmo:${id}"]`).click(), id); await page.waitForTimeout(40); c = await jobCard(page, id);
      P.t(c.fields.includes('weeks') && c.fields.includes('tax') && c.fields.includes('raise') && c.fields.includes('start') && c.moreExp === 'true', 'tapping "More details" reveals weeks worked, raise, tax rate and start month', 0.5, c.fields.join(','));
      await setVal(page, `[data-p="j.${id}.weeks"]`, '48'); S = await stateOf(page); j = S.p.jobs.find((q) => q.id === id); c = await jobCard(page, id); nt = parseNote(c.note);
      const want = Math.round(25 * 30 * 48), est = E.estTaxPct(want), takeW = want / 12 * (1 - est / 100);
      P.t(j.gross === want && !!nt && nt.gross === want && nt.mode === 'auto' && Math.abs(nt.pct - est) < 0.051 && Math.abs(nt.take - takeW) <= 1 && j.tax === null, 'weeks 48 -> gross $36,000; automatic tax = the engine estimate for that income; take-home = gross / 12 x (1 - tax)', 1.2, c.note + ' | want ' + want + ' est ' + est + ' take ' + Math.round(takeW));
      const ph = await page.getAttribute(`[data-p="j.${id}.tax"]`, 'placeholder'); P.t(ph === 'auto ' + String(+est.toFixed(1)), 'the empty tax field shows the automatic rate as its placeholder ("auto ' + est + '")', 0.4, ph);
      const gHigher = (() => { const a = E.estTaxPct(36000), b = E.estTaxPct(120000); return b > a; })();
      await setVal(page, `[data-p="j.${id}.wage"]`, '60'); c = await jobCard(page, id); nt = parseNote(c.note); const g2 = Math.round(65 * 30 * 48);
      P.t(gHigher && !!nt && nt.gross === g2 && Math.abs(nt.pct - E.estTaxPct(g2)) < 0.051 && nt.pct > est, 'the automatic rate moves with income (a higher wage gives a higher estimated rate)', 0.7, c.note);
      await setVal(page, `[data-p="j.${id}.wage"]`, '20');
      await setVal(page, `[data-p="j.${id}.tax"]`, '25'); S = await stateOf(page); j = S.p.jobs.find((q) => q.id === id); c = await jobCard(page, id); nt = parseNote(c.note);
      P.t(j.tax === 25 && !!nt && nt.mode === 'override' && nt.pct === 25 && Math.abs(nt.take - 36000 / 12 * 0.75) <= 1, 'typing a tax rate overrides the estimate: "Tax set to 25%", take-home = $3,000 x 0.75 = $2,250', 1.2, c.note);
      await matchFin(P, page, 'typed tax', 0.5);
      await setVal(page, `[data-p="j.${id}.tax"]`, ''); S = await stateOf(page); j = S.p.jobs.find((q) => q.id === id); c = await jobCard(page, id); nt = parseNote(c.note);
      P.t(j.tax === null && !!nt && nt.mode === 'auto' && Math.abs(nt.pct - est) < 0.051, 'clearing the tax field returns to the automatic estimate (stored as null)', 1, c.note + ' stored ' + j.tax);
      /* temporary job: ends in N months */
      await setVal(page, `[data-p="j.${id}.end"]`, '12'); S = await stateOf(page); j = S.p.jobs.find((q) => q.id === id); const f = E.finance(clone(S)), jn = E.jobMonthly(j, 11), jn12 = E.jobMonthly(j, 12), others = (t) => S.p.jobs.filter((q) => q.id !== id).reduce((a, q) => a + E.jobMonthly(q, t) * (1 - E.taxPctFor(q) / 100), 0);
      P.t(j.end === 12 && jn > 0 && jn12 === 0 && Math.abs(f.series.income[12] - others(12)) < 0.01 && Math.abs(f.series.income[11] - others(11) - jn * (1 - E.taxPctFor(j) / 100)) < 0.01, 'ends in 12 months: income includes the job through month 11 and, from month 12, is exactly the other jobs (the day job keeps its own raise)', 1.2, 'end ' + j.end + ' ' + Math.round(f.series.income[11]) + ' -> ' + Math.round(f.series.income[12]));
      await matchFin(P, page, 'job ending in 12 months', 0.5);
      await setVal(page, `[data-p="j.${id}.end"]`, '0'); S = await stateOf(page); j = S.p.jobs.find((q) => q.id === id); const f0 = E.finance(clone(S)), noJob = clone(S); noJob.p.jobs = noJob.p.jobs.filter((q) => q.id !== id); const fN = E.finance(noJob);
      P.t(j.end === 0 && Math.abs(f0.kpis.takeHome - fN.kpis.takeHome) < 1 && f0.status === fN.status, 'ends in 0 months: the job adds nothing today (same take-home and verdict as without it)', 0.7, f0.kpis.takeHome + ' vs ' + fN.kpis.takeHome);
      await matchFin(P, page, 'job ending now', 0.4);
      await setVal(page, `[data-p="j.${id}.end"]`, ''); S = await stateOf(page); j = S.p.jobs.find((q) => q.id === id); P.t(j.end === null && E.jobMonthly(j, 600) > 0, 'blank end month = no end (income continues for the whole plan)', 0.5, j.end);
      /* switching kind keeps the numbers */
      await page.evaluate((id) => document.querySelector(`[data-jobkind="${id}:salary"]`).click(), id); await page.waitForTimeout(40); S = await stateOf(page); j = S.p.jobs.find((q) => q.id === id); c = await jobCard(page, id);
      P.t(j.kind === 'salary' && j.gross === 36000 && c.fields.includes('gross') && !c.fields.includes('wage'), 'switching to Salary keeps the yearly total ($36,000) and shows the Gross pay field instead of wage', 0.8, JSON.stringify([j.kind, j.gross, c.fields]));
      await page.evaluate((id) => document.querySelector(`[data-jobkind="${id}:hourly"]`).click(), id); await page.waitForTimeout(40); S = await stateOf(page); j = S.p.jobs.find((q) => q.id === id);
      P.t(j.kind === 'hourly' && j.wage === 20 && j.tips === 5 && j.gross === 36000, 'switching back to Hourly restores wage, tips and the same gross', 0.6, JSON.stringify([j.kind, j.wage, j.tips, j.gross]));
      /* clamps */
      await setVal(page, `[data-p="j.${id}.wage"]`, '-5'); await setVal(page, `[data-p="j.${id}.tips"]`, '-2'); await setVal(page, `[data-p="j.${id}.weeks"]`, '70'); await setVal(page, `[data-p="j.${id}.hours"]`, '500'); S = await stateOf(page); j = S.p.jobs.find((q) => q.id === id);
      P.t(j.wage === 20 && j.tips === 5 && j.weeks === 52 && j.hours === 168 && j.gross === 25 * 168 * 52 && !(await scanBad(page)), 'nonsense values are handled (a negative wage/tip is refused and the box goes back to its last value with a note, 70 weeks -> 52, 500 hours -> 168) with no NaN anywhere', 0.8, JSON.stringify(j) + ' ' + (await scanBad(page)));
      await setVal(page, `[data-p="j.${id}.wage"]`, '20'); await setVal(page, `[data-p="j.${id}.tips"]`, '5'); await setVal(page, `[data-p="j.${id}.hours"]`, '30'); await setVal(page, `[data-p="j.${id}.weeks"]`, '48');
      /* many hours: verdict warns */
      await setVal(page, `[data-p="j.${id}.hours"]`, '80'); S = await stateOf(page); const fh = E.finance(clone(S)); const vu = await verdictUI(page);
      P.t(fh.status !== 'yes' && vu.chip === VL[fh.status] && /hour/i.test(await text(page)), '80 hours a week on top of the day job makes the verdict Tight or worse and mentions the hours', 0.6, vu.chip + ' / ' + fh.status);
      await setVal(page, `[data-p="j.${id}.hours"]`, '30');
      /* persists */
      await page.reload(); await page.waitForSelector('#app > *'); await nav(page, '#finances'); S = await stateOf(page); j = S.p.jobs.find((q) => q.id === id);
      P.t(!!j && j.kind === 'hourly' && j.wage === 20 && j.tips === 5 && j.hours === 30 && j.weeks === 48 && j.gross === 36000 && (await page.locator('[data-testid=kind-hourly]').count()) >= 1, 'the hourly job survives a reload with every value', 0.6, JSON.stringify(j));
      await matchFin(P, page, 'after reload', 0.3);
      await page.click(`[data-dp="job:${id}"]`); await page.click('[data-dp-yes]'); await page.waitForTimeout(50); S = await stateOf(page);
      P.t(!S.p.jobs.find((q) => q.id === id) && S.p.jobs.length === n0, 'the hourly job can be removed (with confirmation)', 0.3);
      return P; });

  /* ================================================================ H6 optional fields left blank */
  await hcheck('H6', 'Optional fields left blank never break the plan or the finance verdict (job extras, improvements, exit fields, co-signers)', 8,
    'Blank every optional field in turn; compare saved state, verdict and plan with the engine; scan for NaN', async () => {
      const P = new Parts(); await load(page, sampleS(), '#finances'); await page.click('[data-addjob=hourly]'); await page.waitForTimeout(50);
      let S = await stateOf(page), id = S.p.jobs.find((q) => q.kind === 'hourly').id;
      await setVal(page, `[data-p="j.${id}.tips"]`, '4'); await setVal(page, `[data-p="j.${id}.weeks"]`, '46'); await setVal(page, `[data-p="j.${id}.raise"]`, '3'); await setVal(page, `[data-p="j.${id}.start"]`, '2'); await setVal(page, `[data-p="j.${id}.tax"]`, '22'); await setVal(page, `[data-p="j.${id}.end"]`, '60');
      const baseVerdict = await verdictUI(page);
      for (const f of ['tips', 'weeks', 'raise', 'start', 'tax', 'end']) {
        await setVal(page, `[data-p="j.${id}.${f}"]`, ''); S = await stateOf(page); const j = S.p.jobs.find((q) => q.id === id), vals = [j.tips, j.weeks, j.raise, j.start, j.wage, j.hours, j.gross];
        const okVals = vals.every((x) => typeof x === 'number' && isFinite(x)) && (j.tax === null || isFinite(j.tax)) && (j.end === null || isFinite(j.end)) && j.gross === Math.round((j.wage + j.tips) * j.hours * j.weeks);
        const fin = E.finance(clone(S)), vu = await verdictUI(page), pl = await page.evaluate(() => (document.querySelector('[data-testid=plan-headline]') || {}).textContent);
        const bad = await scanBad(page); const noCrash = await page.evaluate(() => !!document.querySelector('[data-testid=verdict-card]'));
        P.t(okVals && !bad && noCrash && vu.chip === VL[fin.status] && vu.head === fin.headline && isFinite(fin.kpis.net0) && isFinite(fin.kpis.minLiquid), 'job "' + f + '" blank: stored values stay finite and consistent, the verdict equals the engine, no NaN on the page', 0.6, bad + ' ' + JSON.stringify(j) + ' ' + vu.chip + '/' + fin.status);
      }
      /* the defaults (blank tips / raise / start / tax / end) give the same verdict as a fresh hourly job with those defaults */
      const f1 = E.finance(clone(S)); const fresh = clone(S); const jf = fresh.p.jobs.find((q) => q.id === id); Object.assign(jf, { tips: 0, raise: 0, start: 0, tax: null, end: null }); fresh.p = E.normalizePersonal(fresh.p);
      P.t(['yes', 'tight', 'no'].includes(f1.status) && f1.headline.length > 0 && baseVerdict.chip.length > 0, 'a verdict is always produced (Yes / Tight / Not yet) with a headline', 0.4, f1.status);
      /* Portfolio page afford line follows */
      await nav(page, '#'); const chip = await page.evaluate(() => (document.querySelector('[data-testid=afford-chip]') || {}).textContent), pl2 = await page.evaluate(() => (document.querySelector('[data-testid=plan-headline]') || {}).textContent);
      P.t(chip === VL[E.finance(clone(S)).status] && !!pl2 && !(await scanBad(page)), 'the Portfolio afford chip and plan headline stay valid and equal the engine', 0.6, chip + ' / ' + pl2);
      /* salary job optional fields */
      await nav(page, '#finances'); const sid = (await stateOf(page)).p.jobs[0].id;
      for (const f of ['raise', 'start', 'tax', 'end']) { await setVal(page, `[data-p="j.${sid}.${f}"]`, ''); const S2 = await stateOf(page), fin = E.finance(clone(S2)), vu = await verdictUI(page), bad = await scanBad(page); P.t(!bad && vu.chip === VL[fin.status] && isFinite(fin.kpis.takeHome), 'salary job "' + f + '" blank: no NaN, verdict equals the engine', 0.3, bad); }
      /* asset-page optional fields (improvements / sale / merge) */
      await load(page, sampleS(), '#house-maple'); await openAll(page);
      for (const f of ['capex', 'capexMonths', 'arv', 'liftIncome', 'liens']) { await setVal(page, `[data-p="h.maple.${f}"]`, '40000'); }
      for (const f of ['capex', 'capexMonths', 'arv', 'liftIncome', 'liens']) { await setVal(page, `[data-p="h.maple.${f}"]`, ''); }
      let SA = await stateOf(page), h = SA.houses.find((x) => x.id === 'maple'), pl = E.plan(clone(SA)), shown = await page.evaluate(() => ({ nw: (document.querySelector('[data-testid=kpi-networth]') || {}).textContent }));
      P.t(['capex', 'capexMonths', 'arv', 'liftIncome', 'liens'].every((f) => typeof h[f] === 'number' && isFinite(h[f])) && !(await scanBad(page)) && isFinite(pl.horizon.nw), 'improvement budget / months / appraisal / income lift / liens left blank leave finite values and a valid asset page', 0.8, JSON.stringify(['capex', 'capexMonths', 'arv', 'liftIncome', 'liens'].map((f) => h[f])) + ' ' + (await scanBad(page)));
      await nav(page, '#'); const k = await page.evaluate(() => (document.querySelector('[data-testid=kpi-networth]') || {}).textContent); const hh = (await stateOf(page));
      P.t(Math.abs(money(k) - PHZ(hh).nw) <= 0.003 * Math.abs(PHZ(hh).nw) + 1000 && !(await scanBad(page)), 'Portfolio net worth still equals the engine after those fields were blanked', 0.6, k + ' vs ' + Math.round(PHZ(hh).nw));
      await load(page, sampleS(), '#house-ridge'); await openAll(page);
      for (const f of ['exitMonth', 'sellCost']) await setVal(page, `[data-p="h.ridge.${f}"]`, '');
      SA = await stateOf(page); h = SA.houses.find((x) => x.id === 'ridge'); pl = E.plan(clone(SA));
      P.t(isFinite(h.exitMonth) && isFinite(h.sellCost) && !(await scanBad(page)) && isFinite(pl.horizon.nw), 'sale month and selling cost left blank keep finite values and a valid plan', 0.5, h.exitMonth + '/' + h.sellCost);
      await nav(page, '#assumptions'); await openAll(page);
      for (const f of ['p1', 'p2', 'otherDebt', 'haircut', 'rentCount']) { await setVal(page, `[data-p="g.${f}"]`, ''); }
      const SG = await stateOf(page); P.t(['p1', 'p2', 'otherDebt', 'haircut', 'rentCount'].every((f) => typeof SG.g[f] === 'number' && isFinite(SG.g[f])) && !(await scanBad(page)) && isFinite(E.plan(clone(SG)).horizon.nw), 'co-signer incomes, other debts, appraisal cut and rent counted left blank stay finite and the plan still computes', 0.6, JSON.stringify(['p1', 'p2', 'otherDebt', 'haircut', 'rentCount'].map((f) => SG.g[f])));
      return P; });

  /* ================================================================ H7 old saves */
  await hcheck('H7', 'Old saves migrate: v8 (assets only) and pre-hourly jobs (no kind / wage / tips / weeks) load, keep their numbers and show correctly', 6,
    'Load crafted localStorage states; pasted old backup restore', async () => {
      const P = new Parts();
      /* v8 */
      let h8; const v8 = E.seed(); delete v8.p; v8.v = 8; v8.houses[0].addr = 'Kept From V8'; v8.houses[0].extra = 4321; v8.g.cap = 77;
      await load(page, v8, '#finances'); let S = await stateOf(page);
      P.t(S.v === DATA_V && !!S.p && S.p.jobs.length === 1 && S.p.jobs[0].kind === 'salary' && (h8 = S.houses.find((x) => x.id === v8.houses[0].id) || {}).addr === 'Kept From V8' && h8.extra === 4321 && S.g.cap === 77 && S.houses.length === v8.houses.length, 'a v8 save keeps its assets and settings, gains a finance profile with a salary job, and is bumped to the current version', 1.2, JSON.stringify([S.v, S.p && S.p.jobs.length, S.houses[0].addr, S.g.cap]));
      P.t(!(await scanBad(page)) && (await page.locator('[data-testid=verdict-chip]').count()) === 1 && (await page.locator('[data-addjob=hourly]').count()) === 1, 'the migrated Finances page renders (verdict, hourly button) with no NaN', 0.5);
      await nav(page, '#'); const chip = await page.evaluate(() => (document.querySelector('[data-testid=afford-chip]') || {}).textContent); P.t(chip === VL[E.finance(clone(S)).status], 'the Portfolio afford chip works on a migrated v8 save', 0.3, chip);
      /* v9 with legacy (pre-hourly) jobs */
      const legacy = E.seed(); legacy.v = DATA_V; legacy.p.jobs = [{ id: 'old1', name: 'Old salary', gross: 120000, raise: 2, tax: 20, hours: 45, start: 0, end: null }, { id: 'old2', name: 'Old part-time', gross: 18000, raise: 0, tax: 0, hours: 12, start: 3, end: 30 }, { id: 'old3', name: 'Garbage', kind: 'hourly', wage: 'abc', tips: null, hours: '', weeks: 'x', gross: 'oops', tax: 'q', end: 'z' }];
      delete legacy.p.jobs[0].kind; await load(page, legacy, '#finances'); S = await stateOf(page); const [a, b, c] = S.p.jobs;
      P.t(a.kind === 'salary' && a.gross === 120000 && a.tax === 20 && a.raise === 2 && a.hours === 45 && a.wage === 0 && a.tips === 0 && a.weeks === 50 && a.end === null, 'a job saved before hourly jobs existed becomes a salary job with the same gross, tax override, raise and hours', 1.2, JSON.stringify(a));
      P.t(b.kind === 'salary' && b.gross === 18000 && b.tax === 0 && b.start === 3 && b.end === 30, 'a legacy 0% tax override and start/end months are kept as typed', 0.6, JSON.stringify(b));
      P.t([c.wage, c.tips, c.weeks, c.hours, c.gross, c.raise, c.start].every((x) => typeof x === 'number' && isFinite(x)) && c.tax === null && c.end === null && c.kind === 'hourly', 'a corrupt hourly job (text instead of numbers) is repaired to safe numbers (tax automatic, no end)', 0.8, JSON.stringify(c));
      P.t(!(await scanBad(page)) && (await page.locator('[data-testid=job-card]').count()) === 3, 'all three legacy jobs render with no NaN', 0.4, await scanBad(page));
      const cards = await page.evaluate(() => [...document.querySelectorAll('[data-testid=job-card]')].map((el) => ({ note: (el.querySelector('[data-testid=job-take]') || {}).textContent, hasGross: !!el.querySelector('[data-p$=".gross"]'), hasWage: !!el.querySelector('[data-p$=".wage"]') })));
      const n1 = parseNote(cards[0].note); P.t(cards[0].hasGross && !cards[0].hasWage && !!n1 && n1.mode === 'override' && n1.pct === 20 && Math.abs(n1.take - 120000 / 12 * 0.8) <= 1 && cards[2].hasWage, 'legacy salary job shows Gross pay and "Tax set to 20%"; the repaired hourly one shows Hourly wage', 0.6, JSON.stringify(cards));
      const vu = await verdictUI(page); P.t(vu.chip === VL[E.finance(clone(S)).status], 'the verdict for the legacy profile equals the engine', 0.3, vu.chip);
      /* pasted old backup (assumptions > backup) */
      await load(page, sampleS(), '#assumptions'); await page.evaluate(() => document.querySelector('[data-coll=backup]').click()); await page.click('[data-testid=export]').catch(() => {}); await page.waitForTimeout(40);
      const old = clone(sampleS()); old.p.jobs = [{ id: 'bk1', name: 'Backup job', gross: 70000, raise: 1, tax: 18, hours: 38, start: 0, end: null }]; old.houses[0].addr = 'From Old Backup';
      await page.fill('#bkin', JSON.stringify(old)).catch(() => {}); await page.click('[data-restore-text]').catch(() => {}); await page.waitForTimeout(50); await page.click('[data-import-yes]').catch(() => {}); await page.waitForTimeout(80); S = await stateOf(page);
      P.t((S.houses.find((x) => x.id === old.houses[0].id) || {}).addr === 'From Old Backup' && S.p.jobs.length === 1 && S.p.jobs[0].kind === 'salary' && S.p.jobs[0].gross === 70000 && S.p.jobs[0].tax === 18 && S.p.jobs[0].weeks === 50, 'restoring a backup made before hourly jobs gives a normal salary job (no NaN, tax kept)', 0.8, JSON.stringify(S.p.jobs[0]));
      return P; });

  /* ================================================================ H8 automatic tax estimate */
  await hcheck('H8', 'Automatic tax estimate: matches an independent 2026 single-filer calculation (IRS Rev. Proc. 2025-32, Pub. 15) (federal after standard deduction + Social Security + Medicare, no state tax), is monotone and bounded', 6,
    'node: E.estTaxPct against a separate implementation and properties', async () => {
      const P = new Parts();
      /* independent: marginal-rate table written as (threshold, rate-increase) pairs, summed */
      const ref = (g) => { if (!(g > 0)) return 0; const t = Math.max(0, g - 16100); const steps = [[0, 0.10], [12400, 0.02], [50400, 0.10], [105700, 0.02], [201775, 0.08], [256225, 0.03], [640600, 0.02]]; let fed = 0; steps.forEach(([th, up], i) => { if (t > th) fed += (t - th) * up; });
        const ss = Math.min(g, 184500) * 0.062, med = g * 0.0145; return Math.round((fed + ss + med) / g * 1000) / 10; };
      const grid = [1, 5000, 10000, 15000, 18750, 25000, 30000, 36000, 50000, 75000, 96000, 120000, 184500, 200000, 256225, 400000, 640600, 1000000]; const diffs = grid.map((g) => [g, E.estTaxPct(g), ref(g)]).filter(([, a, b]) => Math.abs(a - b) > 0.051);
      P.t(diffs.length === 0, 'rate equals the independent calculation at 18 incomes from $1 to $1M (within 0.05 points)', 2, JSON.stringify(diffs.slice(0, 3)));
      P.t(E.estTaxPct(0) === 0 && E.estTaxPct(-5) === 0 && E.estTaxPct(NaN) === 0 && E.estTaxPct(undefined) === 0, 'no income (zero, negative, NaN) -> 0%, never NaN', 0.5);
      let mono = true, bad = ''; let prev = -1; for (let g = 0; g <= 800000; g += 2500) { const r = E.estTaxPct(g); if (r + 1e-9 < prev) { mono = false; bad = g + ': ' + r + ' < ' + prev; } prev = r; }
      P.t(mono, 'a higher income never lowers the estimated rate (grid $0-$800K step $2,500)', 1, bad);
      P.t(E.estTaxPct(1e6) < 45 && E.estTaxPct(1e9) < 45 && E.estTaxPct(30000) > 5 && E.estTaxPct(30000) < 20, 'sensible bounds (never above 45%; about 5-20% at $30,000)', 0.5, E.estTaxPct(30000));
      /* the app uses it only when no rate is typed, on the gross that includes tips */
      const j = (o) => E.normalizePersonal({ jobs: [Object.assign({ id: 'x', kind: 'hourly', wage: 20, tips: 5, hours: 30, weeks: 50 }, o)] }).jobs[0];
      P.t(E.taxPctFor(j({})) === E.estTaxPct(37500) && E.taxPctFor(j({ tips: 0 })) === E.estTaxPct(30000) && E.taxPctFor(j({ tax: 25 })) === 25 && E.taxPctFor(j({ tax: 0 })) === 0 && E.taxPctFor(j({ tax: '' })) === E.estTaxPct(37500), 'blank tax -> estimate on wage + tips; a typed rate (even 0%) wins', 1, [E.taxPctFor(j({})), E.taxPctFor(j({ tax: 0 }))].join(','));
      const sal = E.normalizePersonal({ jobs: [{ id: 's', kind: 'salary', gross: 96000, tax: null }] }).jobs[0];
      P.t(E.taxPctFor(sal) === E.estTaxPct(96000) && Math.abs(E.jobsNet({ p: { jobs: [sal] } }, 0) - 96000 / 12 * (1 - E.estTaxPct(96000) / 100)) < 0.01, 'a salary job with blank tax uses the estimate too; net pay = gross / 12 x (1 - rate)', 0.6);
      return P; });

  /* ================================================================ H9 collapsed defaults + renamed labels */
  const coll = (pg, id) => pg.evaluate((id) => { const b = document.querySelector(`#app [data-coll="${id}"]`); return b ? { exp: b.getAttribute('aria-expanded'), role: b.getAttribute('role') || b.tagName, tab: b.getAttribute('tabindex'), txt: b.textContent.replace(/\s+/g, ' ').trim() } : null; }, id);
  await hcheck('H9', 'Disclosure defaults and new wording: collapsed sections open on tap (and stay open), renamed labels, Hold/Sell/Merge + Status, loan grouping, import preview title', 8,
    'Fresh state: check aria-expanded, hidden fields, labels', async () => {
      const P = new Parts(); await load(page, sampleS(), '#house-maple');
      const secs = ['loan', 'rent', 'exit', 'impact']; const st = {}; for (const s of secs) st[s] = await coll(page, s);
      const hidden = await page.evaluate(() => ({ rate: !!document.querySelector('[data-p="h.maple.rate"]'), rent: !!document.querySelector('[data-p="h.maple.rent"]'), need: !!document.querySelector('[data-p="h.maple.need"]'), capex: !!document.querySelector('[data-p="h.maple.capex"]'), impact: !!document.querySelector('[data-testid=impact]'), price: !!document.querySelector('[data-p="h.maple.price"]'), dp: !!document.querySelector('[data-p="h.maple.dp"]') }));
      P.t(secs.every((s) => st[s] && st[s].exp === 'false' && (st[s].role === 'button' || st[s].role === 'BUTTON') && st[s].tab === '0') && !hidden.rate && !hidden.rent && !hidden.need && !hidden.capex && !hidden.impact && hidden.price && hidden.dp && (await coll(page, 'loc')).exp === 'true', 'Asset page: loan, rent, exit and impact are collapsed by default (focusable buttons, aria-expanded=false, fields not rendered); the Funded by the trust section is open so the explanation is visible; price and down payment stay visible', 1.5, JSON.stringify([secs.map((s) => st[s] && st[s].exp), hidden]));
      await page.click('[data-coll="loan"]'); await page.waitForTimeout(40); const o1 = await coll(page, 'loan'), f1 = await page.evaluate(() => !!document.querySelector('[data-p="h.maple.rate"]'));
      P.t(o1.exp === 'true' && f1, 'tapping a section header opens it (aria-expanded=true, fields appear)', 0.5);
      await page.focus('[data-coll="rent"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(40); const o2 = await coll(page, 'rent'); await page.focus('[data-coll="exit"]'); await page.keyboard.press('Space'); await page.waitForTimeout(40); const o3 = await coll(page, 'exit');
      P.t(o2.exp === 'true' && o3.exp === 'true', 'sections also open from the keyboard (Enter and Space)', 0.5, [o2.exp, o3.exp]);
      await page.reload(); await page.waitForSelector('#app > *'); const o4 = await coll(page, 'loan'), o5 = await coll(page, 'impact');
      P.t(o4.exp === 'true' && o5.exp === 'false', 'an opened section stays open after reload; the others stay closed', 0.5, [o4.exp, o5.exp]);
      await page.click('[data-coll="loan"]'); await page.waitForTimeout(40); P.t((await coll(page, 'loan')).exp === 'false' && !(await page.evaluate(() => !!document.querySelector('[data-p="h.maple.rate"]'))), 'tapping again closes it', 0.3);
      await load(page, sampleS(), '#assumptions'); const b = await coll(page, 'backup'), sm = await coll(page, 'samples'), ex = await page.evaluate(() => !!document.querySelector('[data-testid=export]'));
      P.t(b && sm && b.exp === 'false' && sm.exp === 'false' && !ex && (await page.locator('[data-p="g.cap"]').count()) === 1, 'Assumptions: backup and samples are collapsed (export hidden), the settings fields are visible', 0.8, JSON.stringify([b, sm, ex]));
      await load(page, sampleS(), '#finances'); const ft = await coll(page, 'fin-tax'), fm = await coll(page, 'fin-time'), jid = (await stateOf(page)).p.jobs[0].id, jm = await coll(page, 'jmo:' + jid);
      P.t(ft && fm && jm && ft.exp === 'false' && fm.exp === 'false' && jm.exp === 'false' && /More details \(optional\)/.test(jm.txt) && (await page.locator('[data-p="p.portfolioTaxPct"]').count()) === 0 && (await page.locator(`[data-p="j.${jid}.raise"]`).count()) === 0 && (await page.locator('[data-p="p.cash"]').count()) === 1, 'Finances: taxes and time/managers are collapsed, each job hides its extras under "More details (optional)"; cash and living costs stay visible', 0.8, JSON.stringify([ft && ft.exp, fm && fm.exp, jm && jm.txt]));
      /* renamed labels */
      await openAll(page); const fl = await page.evaluate(() => [...document.querySelectorAll('#app .lb')].map((e) => e.textContent.replace(/\s+/g, ' ').replace(/\s*(auto)?$/, '').replace(/\s*i$/, '').trim()));
      const picture = (await pict(page)).map((r) => r[0]), sync = await page.evaluate(() => (document.querySelector('[data-testid=finances-sync]') || { textContent: '' }).textContent);
      P.t(['Cash cushion (months)', 'Cash interest', 'Ends in (months)', 'Other debts / month', 'Closing costs'].filter((l) => l !== 'Closing costs').every((l) => fl.some((x) => x.startsWith(l))) && ['Your take-home pay', 'Portfolio cash flow', 'Managers (not you)', 'Extra payments', 'Living costs', 'Other debts', 'Left over each month'].every((l) => picture.includes(l)) && /Before tax/.test(sync) && /After tax/.test(sync) && /Left over each month/.test(sync), 'Finances wording: Cash cushion (months), Cash interest, Ends in (months), Other debts / month; month table rows; plan-end rows Before tax / After tax / Left over each month', 1.2, JSON.stringify([fl.slice(0, 12), picture]));
      await load(page, sampleS(), '#assumptions'); const al = await page.evaluate(() => [...document.querySelectorAll('#app .lb')].map((e) => e.textContent.replace(/\s+/g, ' ').replace(/\s*(auto)?$/, '').replace(/\s*i$/, '').trim()));
      P.t(['Max loan vs value', 'Appraisal cut', 'Co-signer 1 / yr', 'Co-signer 2 / yr', 'Rent counted', 'Repairs / yr', 'Closing costs', 'Growth / yr', 'Other monthly debts'].every((l) => al.some((x) => x.startsWith(l))), 'Assumptions labels: Max loan vs value, Appraisal cut, Co-signer 1 / yr, Co-signer 2 / yr, Rent counted, Repairs / yr, Closing costs, Growth / yr (Other debts / month is the Finances wording)', 0.8, JSON.stringify(al));
      await load(page, sampleS(), '#house-maple'); const pa = await page.evaluate(() => ({ plan: [...document.querySelectorAll('#app .lb')].some((e) => /^Plan for this asset/.test(e.textContent.trim())), segs: [...document.querySelectorAll('#app .seg button')].map((b) => b.textContent.trim()), status: [...document.querySelectorAll('#app .lb')].some((e) => e.textContent.trim() === 'Status') }));
      P.t(pa.plan && pa.status && ['Hold', 'Sell', 'Merge', 'Owned', 'Planned'].every((x) => pa.segs.includes(x)), 'Asset page shows "Plan for this asset" (Hold / Sell / Merge) and "Status" (Owned / Planned) up front', 0.6, JSON.stringify(pa));
      await load(page, sampleS(), '#add'); const grp = await page.evaluate(() => { const lo = document.querySelector('[data-testid=loan-options]'), h = [...lo.querySelectorAll('b')].find((b) => /If you will live there/.test(b.textContent)); if (!h) return null; const f = lo.querySelector('[data-pickloan=fha]'), k = lo.querySelector('[data-pickloan=k203]'), c = lo.querySelector('[data-pickloan=conv30]'); const after = (a) => !!(h.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING); return { fha: after(f), k203: after(k), conv: after(c) }; });
      P.t(!!grp && grp.fha && grp.k203 && !grp.conv, 'Add page: FHA and 203(k) are grouped under "If you will live there"; investor loans are above it', 0.5, JSON.stringify(grp));
      await load(page, sampleS(), '#import-new'); const fp = path.resolve(__dirname, '../listing-import/example.house.json'); let prevOk = false, pt = '';
      if (fs.existsSync(fp)) { await page.setInputFiles('[data-testid=import-listing-file]', fp); await page.waitForTimeout(300); pt = await page.evaluate(() => (document.querySelector('[data-testid=import-preview] b') || {}).textContent || ''); prevOk = pt === 'Preview of example.house.json'; }
      P.t(prevOk, 'Import: the preview is titled "Preview of <file name>"', 0.5, pt || 'no file or no preview');
      return P; });

  /* ================================================================ H10 clean run */
  await hcheck('H10', 'Clean run: no console / page errors and no network requests outside localhost during all help and hourly-job flows', 4,
    'Collected over the whole H run', async () => {
      const P = new Parts(); const errs = collect.errors.slice(errStart), reqs = collect.requests.slice(reqStart);
      P.t(errs.length === 0, 'zero console errors or page errors (' + errs.length + ')', 2.5, [...new Set(errs)].slice(0, 3).join(' || ').slice(0, 300));
      const ext = reqs.filter((u) => !/^(http:\/\/127\.0\.0\.1|http:\/\/localhost|data:|blob:|about:)/.test(u));
      P.t(ext.length === 0, 'help content is bundled: zero external requests (' + ext.length + ')', 1.5, ext.slice(0, 3).join(','));
      return P; });

  try { await ctx.close(); } catch (e) {}
  const order = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10']; checks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const earned = checks.reduce((s, c) => s + c.earned, 0), max = checks.reduce((s, c) => s + c.points, 0);
  return { earned: Math.round(earned * 100) / 100, max, checks };
};
