/* Category K: Design consistency and flow for the multi-family screens (the Add flow and the multi-family asset page).
   The user asked that every new change follows the same trend as the rest of the app, so this grader checks the NEW UI against the EXISTING UI programmatically:
   colour tokens only, contrast in light and dark, the same components and classes, tap targets, no sideways scroll, no overlapping text, the same spacing and font sizes,
   short on-screen text, a short first-time flow, and it saves dpr-2 screenshots of the new screens (grader/screens/mf-*.png) to look at.
   100 points on their own scale. Plugged in from grade.js: require('./design-grade.js').run(X) -> { earned, max, checks }.  Standalone: DESIGN_ONLY=1 node grade.js  (K_ONLY=K1,K3 for single checks). Never modifies the app. */
const fs = require('fs'), path = require('path');
const V4 = path.resolve(__dirname, '../v4'), SHOTS = path.join(__dirname, 'screens');

exports.run = async function run(X) {
  const { E, Parts, DATA_V, KEY, mkCtx, mkPage, base } = X, checks = [], UIKEY = 'rep-v4-ui';
  async function kcheck(id, name, points, repro, fn) {
    if (process.env.K_ONLY && process.env.K_ONLY.split(',').indexOf(id) < 0) return;
    let r; const t0 = Date.now();
    try { r = await fn(); } catch (e) { r = { ratio: 0, detail: 'CRASH in check: ' + (e && e.stack || e).toString().slice(0, 900) }; }
    if (r instanceof Parts) r = { ratio: r.ratio, detail: r.detail };
    const ratio = Math.max(0, Math.min(1, r.ratio));
    const rec = { id, category: 'K', name, points, earned: Math.round(points * ratio * 100) / 100, ratio, detail: r.detail || '', repro, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
    checks.push(rec); console.log(`  [${rec.earned.toFixed(2)}/${points}] ${id} ${name}  (${rec.seconds}s)${ratio < 1 ? '  <-- ' + String(rec.detail).slice(0, 400) : ''}`);
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ctx = await mkCtx({ autoExpand: false }); const page = await mkPage(ctx, 'design'); let seq = 0;
  async function load(S, hash, ui) {
    await page.goto(base() + '/index.html?k=' + seq++);
    await page.evaluate(([k, s, uk, u]) => { try { localStorage.clear(); if (s) localStorage.setItem(k, JSON.stringify(s)); if (u) localStorage.setItem(uk, JSON.stringify(u)); } catch (e) {} }, [KEY, S || null, UIKEY, ui || null]);
    await page.goto(base() + '/index.html?k=' + seq++ + (hash || '')); await page.waitForSelector('#app > *');
  }
  const openAllColl = async () => { for (let i = 0; i < 30; i++) { const b = await page.$('#app [data-coll][aria-expanded=false]'); if (!b) break; await b.click(); await page.waitForTimeout(30); } };
  const withV = (S) => Object.assign(clone(S), { v: DATA_V });
  const mfState = () => { const S = withV(E.seedPlan()); S.houses.push(E.newAsset('house', 'mfSbl', Object.assign({ id: 'mfx', addr: 'Fifty Unit Building', status: 'planned', fresh: false, kind: 'multi', units: 50 }, E.mfDefaults(50, false))), E.newAsset('house', 'mfBlanket', Object.assign({ id: 'mfy', addr: 'Pack Of Five', status: 'planned', fresh: false, kind: 'multi', units: 5, pack: true }, E.mfDefaults(5, true)))); return S; };
  /* the new screens: [name, how to reach it] */
  const SCREENS = [
    ['add-multi', async () => { await load(withV(E.seedPlan()), '#add'); await page.click('[data-kind=multi]'); }],
    ['add-pack', async () => { await load(withV(E.seedPlan()), '#add'); await page.click('[data-kind=multi]'); await page.click('[data-preset="5p"]'); }],
    ['add-50', async () => { await load(withV(E.seedPlan()), '#add'); await page.click('[data-kind=multi]'); await page.click('[data-preset="50"]'); }],
    ['asset-50', async () => { await load(mfState(), '#house-mfx'); await openAllColl(); }],
    ['asset-pack', async () => { await load(mfState(), '#house-mfy'); await openAllColl(); }]];
  const goto = async (name) => SCREENS.find((s) => s[0] === name)[1]();
  /* in-page measurements */
  const MEASURE = () => {
    const sets = { cls: new Set(), fs: new Set(), sp: new Set(), rad: new Set() };
    document.querySelectorAll('#app *').forEach((el) => { if (el.closest('svg')) return; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return; el.classList.forEach((c) => sets.cls.add(c));
      const cs = getComputedStyle(el); if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || (el.tagName === 'INPUT')) sets.fs.add(cs.fontSize);
      ['margin', 'padding'].forEach((k) => ['Top', 'Right', 'Bottom', 'Left'].forEach((d) => { const v = parseFloat(cs[k + d]); if (v > 0 && el.id !== 'app') sets.sp.add(Math.round(v * 10) / 10); }));
      const br = parseFloat(cs.borderTopLeftRadius); if (br > 0 && br < 100) sets.rad.add(br); });
    return { cls: [...sets.cls], fs: [...sets.fs], sp: [...sets.sp], rad: [...sets.rad] };
  };
  const baseline = async () => {
    const out = { cls: new Set(), fs: new Set(), sp: new Set(), rad: new Set() }, add = (m) => Object.keys(out).forEach((k) => m[k].forEach((v) => out[k].add(v)));
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [hash, S] of [['#', withV(E.seedPlan())], ['#house-maple', withV(E.seedPlan())], ['#house-north', withV(E.seedPlan())], ['#house-keystone', withV(E.seedPlan())], ['#add', withV(E.seedPlan())], ['#assumptions', withV(E.seedPlan())], ['#finances', withV(E.seedPlan())], ['#import-new', withV(E.seedPlan())]]) { await load(S, hash); await openAllColl(); add(await page.evaluate(MEASURE)); }
    await load(withV(E.seedPlan()), '#add'); await page.click('[data-addtype=commercial]'); add(await page.evaluate(MEASURE));
    return out;
  };
  const newCss = () => { const css = fs.readFileSync(path.join(V4, 'style.css'), 'utf8'), i = css.indexOf('/* multi-family:'); return i < 0 ? '' : css.slice(i); };
  const cssTokens = () => { const css = fs.readFileSync(path.join(V4, 'style.css'), 'utf8'); return new Set((/:root\{([^}]*)\}/.exec(css)[1].match(/--[a-z]+/g) || [])); };
  let BASE = null; const getBase = async () => BASE || (BASE = await baseline());

  /* ---------- K1 colour tokens ---------- */
  await kcheck('K1', 'Colours come only from the existing CSS variables: no hard-coded colour in the new CSS rules or in the new screens\' inline styles, and every var() used is a defined token', 12, 'scan style.css after the multi-family marker and the app.js Add / asset templates', async () => {
    const P = new Parts(), css = newCss(), tokens = cssTokens(), used = (css.match(/var\((--[a-z]+)/g) || []).map((x) => x.slice(4));
    P.t(css.length > 100, 'the new CSS block exists (marker comment "multi-family:")', 1);
    P.t(!/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|\b(red|blue|green|gray|grey|black|white|orange|yellow)\b\s*[;}]/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'no hex / rgb() / hsl() / named colour in the new CSS rules', 4);
    P.t(used.length >= 2 && used.every((t) => tokens.has(t)), 'every var() in the new rules is a token of :root (' + [...new Set(used)].join(' ') + ')', 3, used.filter((t) => !tokens.has(t)).join(','));
    const app = fs.readFileSync(path.join(V4, 'app.js'), 'utf8'), a = app.indexOf('const mfName'), b = app.indexOf('/* ---------- sample portfolios'), seg = app.slice(a, b);
    P.t(!/style="[^"]*(#[0-9a-f]{3,8}|rgb|color:)/i.test(seg) && !/style="[^"]*(#[0-9a-f]{3,8}|rgb|color:)/i.test((app.match(/const unitsSec[\s\S]*?const income =/) || [''])[0]), 'the new Add and asset-page templates set no colour inline', 2);
    const dark = css.includes('data-theme') || css.includes('prefers-color-scheme'); P.t(!dark, 'the new rules need no dark-mode override of their own (tokens already switch)', 2);
    return P; });

  /* ---------- K2 contrast ---------- */
  await kcheck('K2', 'Every piece of text on the new screens has contrast >= 4.5:1 in light and dark mode (greyed options, chips, hints, tables, the guide)', 14, 'emulate prefers-color-scheme on every new screen and measure text vs its real background', async () => {
    const P = new Parts(); const bad = [];
    for (const scheme of ['light', 'dark']) { await page.emulateMedia({ colorScheme: scheme }); let tot = 0;
      for (const [name] of SCREENS) { await goto(name);
        const r = await page.evaluate(() => {
          const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
          const px = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
          const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3]));
          const bgOf = (el) => { const L = []; for (let e = el; e; e = e.parentElement) { const c = px(getComputedStyle(e).backgroundColor); if (c[3] > 0) { L.push(c); if (c[3] >= 0.999) break; } } let bg = [255, 255, 255]; if (L.length && L[L.length - 1][3] >= 0.999) bg = L.pop().slice(0, 3); else bg = getComputedStyle(document.documentElement).colorScheme === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches ? [0, 0, 0] : [255, 255, 255]; while (L.length) bg = over(L.pop(), bg); return bg; };
          const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
          const out = [], seen = new Set();
          document.querySelectorAll('#app *').forEach((el) => { const has = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()), inp = el.tagName === 'INPUT' && el.value; if (!has && !inp) return; const b = el.getBoundingClientRect(); if (b.width < 1 || b.height < 1) return; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
            const fg = px(cs.color), bg = bgOf(el), f = fg[3] < 1 ? over(fg, bg) : fg.slice(0, 3), L1 = lum(f), L2 = lum(bg), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05), key = el.tagName + el.className + (el.textContent || el.value).trim().slice(0, 14); if (seen.has(key)) return; seen.add(key); out.push({ k: key, cr }); });
          return out; });
        tot += r.length; r.filter((x) => x.cr < 4.5).forEach((x) => bad.push(scheme + '/' + name + ': ' + x.k + ' ' + x.cr.toFixed(2))); }
      P.t(!bad.some((x) => x.startsWith(scheme)), scheme + ' mode: ' + tot + ' text styles on ' + SCREENS.length + ' screens all >= 4.5:1', 7, bad.filter((x) => x.startsWith(scheme)).slice(0, 5).join('; ')); }
    await page.emulateMedia({ colorScheme: 'light' }); return P; });

  /* ---------- K3 same components ---------- */
  await kcheck('K3', 'The new UI is built from the existing components: field rows (label + (i) + box), .card sections with the same collapsible header, segmented controls like Home / Commercial / Business, chips, loan cards with an (i), the cmp table, the warning box; at most a handful of new classes, all defined with tokens', 16, 'compare class names on the new screens with the classes of the existing screens', async () => {
    const P = new Parts(), B = await getBase(); await page.setViewportSize({ width: 390, height: 844 });
    await goto('add-multi'); const a = await page.evaluate(() => ({
      seg: [...document.querySelectorAll('.seg')].map((s) => ({ n: s.querySelectorAll('button').length, parent: s.parentElement.className, rows: [...s.querySelectorAll('button')].every((b) => b.getBoundingClientRect().height >= 43.5) })),
      field: (() => { const l = document.querySelector('label.f:has([data-p="a.add.units"])'); return l ? { lb: !!l.querySelector('.lb'), info: !!l.querySelector('.lb button.info'), iw: !!l.querySelector('.iw input[data-num]') } : null; })(),
      chips: [...document.querySelectorAll('[data-testid=unit-presets] > *')].every((c) => c.tagName === 'BUTTON' && c.classList.contains('chip')),
      cards: [...document.querySelectorAll('.loanrow')].every((r) => r.querySelector('button.loanopt') && r.querySelector('button.info')), card: !!document.querySelector('[data-testid=loan-options].card'), sec: !!document.querySelector('.sec') }));
    P.t(a.seg.length === 3 && a.seg.every((s) => s.rows) && a.seg[0].n === 3 && a.seg[1].n === 2 && a.seg[2].n === 2, 'segmented controls: Home / Commercial / Business (3), Single / Multi (2), Building / Pack (2), all 44px+ tall', 2, JSON.stringify(a.seg));
    P.t(a.field && a.field.lb && a.field.info && a.field.iw, 'the unit count is a normal field row: label, (i), boxed number input', 2, JSON.stringify(a.field));
    P.t(a.chips && a.cards && a.card && a.sec, 'presets are .chip buttons; every loan option is .loanrow > .loanopt + (i); loans sit in a .card under a .sec heading', 2);
    await goto('asset-50'); const h = await page.evaluate(() => ({ cs: [...document.querySelectorAll('.sec.cs[data-coll]')].map((e) => e.dataset.coll + ':' + e.getAttribute('role') + ':' + e.getAttribute('tabindex')), cmp: !!document.querySelector('table.cmp[data-testid=mf-costs]'), card: !!document.querySelector('[data-testid=units-section].card') && !!document.querySelector('[data-testid=mf-guide].card'), steps: !!document.querySelector('[data-testid=mf-guide] ul.steps'), fields: [...document.querySelectorAll('[data-testid=units-section] label.f, [data-p$=".mfRes"], [data-p$=".mfOther"]')].length >= 5 }));
    P.t(h.cs.some((x) => /^units:button:0/.test(x)) && h.cs.some((x) => /^guide:button:0/.test(x)) && h.card && h.cmp && h.steps && h.fields, 'asset page: Units and Guide are .sec.cs collapsible headers (role=button, tabindex 0) with .card bodies; costs use table.cmp; the checklist uses .steps', 3, JSON.stringify(h));
    const info = await page.evaluate(() => [...document.querySelectorAll('[data-testid=units-section] label.f, [data-p$=".mfRes"], [data-p$=".mfOther"]')].length); void info;
    await page.evaluate(() => { const b = document.querySelector('[data-testid=h-delete]'); if (b) b.scrollIntoView(); }); await page.click('[data-testid=h-delete]'); const cf = await page.evaluate(() => { const c = document.querySelector('.confirm[role=alertdialog]'); return c ? { yes: !!c.querySelector('.btn.danger'), no: !!c.querySelector('.btn.plain') } : null; });
    P.t(cf && cf.yes && cf.no, 'removing a multi-family asset uses the same confirm box (Yes, remove / Cancel)', 1.5, JSON.stringify(cf));
    const seen = new Set(), newCls = []; for (const [name] of SCREENS) { await goto(name); (await page.evaluate(MEASURE)).cls.forEach((c) => { if (!B.cls.has(c) && !seen.has(c)) { seen.add(c); newCls.push(c); } }); }
    const css = newCss(), defined = new Set((css.match(/\.[a-zA-Z][\w-]*/g) || []).map((x) => x.slice(1)));
    const oldCss = fs.readFileSync(path.join(V4, 'style.css'), 'utf8').split('/* multi-family:')[0]; const trulyNew = newCls.filter((c) => !new RegExp('\\.' + c + '(?![\\w-])').test(oldCss)); void trulyNew;
    P.t(trulyNew.length <= 8 && trulyNew.every((c) => defined.has(c)), trulyNew.length + ' classes are new to the stylesheet (' + trulyNew.join(' ') + '), all defined in the small new CSS block', 4, trulyNew.filter((c) => !defined.has(c)).join(','));
    P.t((css.match(/\{[^}]*\}/g) || []).length <= 12 && css.length < 1200, 'the new CSS is small: ' + (css.match(/\{[^}]*\}/g) || []).length + ' rules, ' + css.length + ' characters', 1.5);
    return P; });

  /* ---------- K4 tap targets and sideways scroll ---------- */
  await kcheck('K4', 'Tap targets are >= 44px and nothing scrolls sideways at 320, 390 and 430 on every new screen; nothing is wider than its card', 12, 'measure buttons, inputs and selects and the page width on each new screen at three widths', async () => {
    const P = new Parts();
    for (const w of [320, 390, 430]) { await page.setViewportSize({ width: w, height: 844 }); const prob = [], ov = [];
      for (const [name] of SCREENS) { await goto(name);
        const m = await page.evaluate(() => { const small = [...document.querySelectorAll('#app input:not([readonly]), #app button, #app select')].filter((e) => { const r = e.getBoundingClientRect(); return e.offsetParent && r.width > 0 && r.height < 43.5 && !e.disabled; }).map((e) => (e.dataset.testid || e.dataset.p || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height));
          const de = document.documentElement, wide = [...document.querySelectorAll('#app *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('svg')).map((e) => e.className || e.tagName).slice(0, 3); return { small, ov: de.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1, wide }; });
        m.small.forEach((x) => prob.push(name + ' ' + x)); if (m.ov || m.wide.length) ov.push(name + ' ' + JSON.stringify(m.wide)); }
      P.t(!prob.length, w + 'px: every button, box and select is 44px or taller on all ' + SCREENS.length + ' screens', 2, prob.slice(0, 5).join('; ')); P.t(!ov.length, w + 'px: no sideways scroll, nothing past the edge', 2, ov.join('; ')); }
    await page.setViewportSize({ width: 390, height: 844 }); return P; });

  /* ---------- K5 overlap ---------- */
  await kcheck('K5', 'No text overlaps: the bounding boxes of every line of text on the new screens (and the greyed reasons, chips, table cells, (i) buttons) never collide, at 320 and 390', 12, 'collect Range client rects of every text node and test them pairwise', async () => {
    const P = new Parts();
    for (const w of [320, 390]) { await page.setViewportSize({ width: w, height: 844 }); const hits = [];
      for (const [name] of SCREENS) { await goto(name);
        const r = await page.evaluate(() => { const rects = []; const wk = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT); let n; while ((n = wk.nextNode())) { if (!n.textContent.trim() || !n.parentElement || n.parentElement.closest('svg,.chint')) continue; const cs = getComputedStyle(n.parentElement); if (cs.visibility === 'hidden' || cs.display === 'none') continue; let clip = null; for (let e = n.parentElement; e && e.id !== 'app'; e = e.parentElement) { if (getComputedStyle(e).overflowY !== 'visible') { clip = e.getBoundingClientRect(); break; } } const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) if (q.width > 1 && q.height > 4 && (!clip || q.bottom <= clip.bottom + 1)) rects.push({ l: q.left, t: q.top, r: q.right, b: q.bottom, s: n.textContent.trim().slice(0, 18), p: n.parentElement }); }
          const bad = []; for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i], b = rects[j]; if (a.p === b.p) continue; const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ox > 2 && oy > 3) bad.push(a.s + ' x ' + b.s); } return { n: rects.length, bad: bad.slice(0, 4) }; });
        if (r.bad.length) hits.push(name + ': ' + r.bad.join(' | ')); }
      P.t(!hits.length, w + 'px: no two lines of text overlap on any new screen', 6, hits.join('; ')); }
    await page.setViewportSize({ width: 390, height: 844 }); return P; });

  /* ---------- K6 spacing, type and shape ---------- */
  await kcheck('K6', 'Spacing, font sizes and corner radii on the new screens come from the sets the existing screens already use (no new size, margin, padding or radius)', 12, 'collect computed font-size / margin / padding / radius on the existing screens, then on the new screens, and compare the sets', async () => {
    const P = new Parts(), B = await getBase(); await page.setViewportSize({ width: 390, height: 844 }); const nf = new Set(), ns = new Set(), nr = new Set();
    for (const [name] of SCREENS) { await goto(name); const m = await page.evaluate(MEASURE); m.fs.forEach((x) => nf.add(x)); m.sp.forEach((x) => ns.add(x)); m.rad.forEach((x) => nr.add(x)); }
    const fOver = [...nf].filter((x) => !B.fs.has(x)), sOver = [...ns].filter((x) => !B.sp.has(x)), rOver = [...nr].filter((x) => !B.rad.has(x));
    P.t(!fOver.length, 'font sizes (' + [...nf].sort().join(' ') + ') are all already used elsewhere', 5, 'new: ' + fOver.join(','));
    P.t(!sOver.length, 'margins and paddings (' + [...ns].sort((a, b) => a - b).join(' ') + ') are all on the existing scale', 4, 'new: ' + sOver.join(','));
    P.t(!rOver.length, 'corner radii (' + [...nr].sort((a, b) => a - b).join(' ') + ') are all already used', 3, 'new: ' + rOver.join(',')); return P; });

  /* ---------- K7 same look for the same state ---------- */
  await kcheck('K7', 'The same state looks the same: the new Single / Multi and Building / Pack controls match the Home / Commercial / Business tabs; a selected multi-family loan card matches a selected single-family card; greyed cards are visibly different but readable', 8, 'compare computed styles of existing and new controls', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 }); await load(withV(E.seedPlan()), '#add'); await page.click('[data-kind=multi]');
    const st = await page.evaluate(() => { const g = (el) => { const c = getComputedStyle(el); return [c.backgroundColor, c.color, c.fontWeight, c.fontSize, c.borderRadius, c.minHeight, c.height].join('|'); };
      const tabs = document.querySelector('[data-addtype].on'), k = document.querySelector('[data-kind].on'), p = document.querySelector('[data-addpack].on'), tabOff = document.querySelector('[data-addtype]:not(.on)'), kOff = document.querySelector('[data-kind]:not(.on)');
      const ls = (el) => { const c = getComputedStyle(el); return [c.borderTopColor, c.borderTopStyle, c.boxShadow, c.borderRadius, c.paddingTop, c.paddingLeft, c.backgroundColor].join('|'); };
      return { tab: g(tabs), kind: g(k), pack: g(p), tabOff: g(tabOff), kindOff: g(kOff), on: ls(document.querySelector('.loanopt.on')), off: ls(document.querySelector('.loanopt.off')), plain: ls(document.querySelector('.loanopt:not(.on):not(.off)')), offColor: getComputedStyle(document.querySelector('.loanopt.off b')).color, mut: getComputedStyle(document.documentElement).getPropertyValue('--mut').trim(), kindBox: document.querySelector('[data-testid=home-type]').getBoundingClientRect().width, tabBox: document.querySelector('[data-addtype]').parentElement.getBoundingClientRect().width }; });
    P.t(st.tab.split('|').slice(0, 5).join() === st.kind.split('|').slice(0, 5).join() && st.kind === st.pack && st.tabOff === st.kindOff, 'selected and unselected segments have the same background, colour, weight, size and radius as the Home / Commercial / Business tabs', 3, JSON.stringify([st.tab, st.kind]));
    await load(withV(E.seedPlan()), '#add'); const single = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.loanopt.on')); return [c.borderTopColor, c.borderTopStyle, c.boxShadow, c.borderRadius, c.paddingTop, c.paddingLeft, c.backgroundColor].join('|'); });
    P.t(single === st.on, 'a selected multi-family loan card has the same border, ring, radius and padding as a selected single-family card', 2, single + ' vs ' + st.on);
    P.t(st.off.split('|')[1] === 'dashed' && st.off !== st.plain && st.plain.split('|')[1] === 'solid', 'a greyed card is dashed against solid, so it reads as unavailable without hiding', 1.5, st.off);
    P.t(Math.abs(st.kindBox - st.tabBox) < 3, 'the new segmented controls are as wide as the existing one (' + Math.round(st.kindBox) + ' vs ' + Math.round(st.tabBox) + 'px)', 1.5); return P; });

  /* ---------- K8 on-screen text is short ---------- */
  await kcheck('K8', 'No walls of text on the new screens: every note is short (<= 170 characters), the guide shows scannable rows and a short checklist, and the long explanations live in (i) buttons', 8, 'measure every .note and the guide on the new screens', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 }); const long = []; let total = 0;
    for (const [name] of SCREENS) { await goto(name); const r = await page.evaluate(() => ({ notes: [...document.querySelectorAll('#app [data-testid=units-section] .note, #app [data-testid=mf-guide] .note, #app [data-testid=mf-oer], #app [data-testid=mf-dscr], #app [data-testid=loan-info-only], #app [data-testid=loan-nofit], #app .lgrp')].filter((n) => n.offsetParent).map((n) => n.textContent.trim()), guide: (document.querySelector('[data-testid=mf-guide]') || { innerText: '' }).innerText.length, small: [...document.querySelectorAll('#app small.why, #app .loanopt small')].map((n) => n.textContent.length) })); total += r.notes.length; r.notes.filter((t) => t.length > 170).forEach((t) => long.push(name + ': ' + t.length + ' ' + t.slice(0, 40))); if (r.guide > 750) long.push(name + ' guide ' + r.guide + ' chars'); if (r.small.some((x) => x > 130)) long.push(name + ' loan line too long'); }
    P.t(!long.length, total + ' notes on the new screens, none over 170 characters; the guide stays under 750 characters; loan lines under 130', 5, long.join('; '));
    const e = require('../v4/info.js').INFO; P.t(['mfchecklist', 'mflenders', 'mfcosts', 'mfstaff', 'mfsec8', 'mfcreative'].every((k) => e[k] && e[k].b.length >= 200), 'the long text (checklist, lenders, costs, staffing, Section 8, creative financing) is in the glossary, not on the page', 3); return P; });

  /* ---------- K9 flow ---------- */
  await kcheck('K9', 'First-time flow: from the Add screen a multi-family asset is 3 taps away (Multi-family, a preset, Add); from the portfolio 3 taps with the default duplex; Back returns without adding anything; presets are one tap; the unit box has the numeric keyboard settings of the other boxes; the result opens on the asset page', 10, 'tap through the flow and count', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 }); await load(withV(E.seedPlan()), ''); const n0 = (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).houses.length, KEY)); let taps = 0;
    await page.click('[data-testid=add-house]'); taps++; await page.click('[data-kind=multi]'); taps++; await page.click('[data-testid=confirm-add]'); taps++; await page.waitForSelector('[data-testid=asset-buy-no]');
    const st1 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY), a1 = st1.houses.slice(-1)[0];
    P.t(taps === 3 && st1.houses.length === n0 + 1 && a1.kind === 'multi' && a1.units === 2 && /^#house-/.test(await page.evaluate(() => location.hash)), 'portfolio -> Add home -> Multi-family -> Add = ' + taps + ' taps to the asset page of a duplex', 3);
    await goto('add-multi'); let t2 = 0; await page.click('[data-preset="50"]'); t2++; await page.click('[data-testid=confirm-add]'); t2++; await page.waitForSelector('[data-testid=asset-buy-no]'); const a2 = (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)).houses.slice(-1)[0];
    P.t(t2 + 1 <= 3 && a2.units === 50 && a2.kind === 'multi', 'on the Add screen: Multi-family + preset + Add = 3 taps to a 50-unit building (' + a2.units + ' units)', 3);
    await load(withV(E.seedPlan()), '#add'); await page.click('[data-kind=multi]'); await page.click('[data-preset="20"]'); await page.click('[aria-label="Cancel and go back"]'); await page.waitForTimeout(80); const st3 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).houses.length, KEY);
    P.t(st3 === 36 && !/add/.test(await page.evaluate(() => location.hash)) && (await page.locator('[data-testid=summary]').count()) === 1, 'Back (‹) leaves the Add screen without adding anything', 1.5);
    await page.goBack().catch(() => {}); await load(withV(E.seedPlan()), ''); await page.click('[data-testid=add-house]'); P.t((await page.textContent('[data-testid=kind-single]')) === 'Single family' && (await page.locator('[data-testid=kind-single].on').count()) === 1, 'a new Add screen always starts on Single family, so today\'s flow (Add home + Add = 2 taps) is unchanged', 1.5);
    await page.click('[data-testid=kind-multi]'); await page.click('[data-testid=add-house]').catch(() => {}); P.t((await page.locator('[data-testid=confirm-add]').count()) === 1, 'the Add button is on the screen with the choices', 0.5);
    const kb = await page.evaluate(() => { const g = (i) => [i.inputMode, i.getAttribute('enterkeyhint'), i.getAttribute('autocapitalize'), i.getAttribute('spellcheck'), i.dataset.num].join(); return g(document.querySelector('[data-p="a.add.units"]')); }); await load(withV(E.seedPlan()), '#house-maple'); await openAllColl(); const kb2 = await page.evaluate(() => { const i = document.querySelector('[data-p="h.maple.rent"]'); return [i.inputMode, i.getAttribute('enterkeyhint'), i.getAttribute('autocapitalize'), i.getAttribute('spellcheck'), i.dataset.num].join(); });
    P.t(kb === kb2 && /done/.test(kb), 'the unit box has the same keyboard settings as the rent box (' + kb + ')', 1); return P; });

  /* ---------- K10 screenshots ---------- */
  await kcheck('K10', 'Screenshots (dpr 2) of the new screens at 390 and 320 in light and dark are saved to grader/screens/mf-*.png, full height, with no sideways overflow', 6, 'full-page screenshots of every new screen', async () => {
    const P = new Parts(); fs.mkdirSync(SHOTS, { recursive: true }); let n = 0, bad = [];
    for (const scheme of ['light', 'dark']) { await page.emulateMedia({ colorScheme: scheme });
      for (const w of [390, 320]) { await page.setViewportSize({ width: w, height: 844 });
        for (const [name] of SCREENS) { await goto(name); await page.waitForTimeout(60); const f = path.join(SHOTS, `mf-${name}-${w}-${scheme}.png`); await page.screenshot({ path: f, fullPage: true }); n++; const sz = fs.statSync(f).size, dim = { w: fs.readFileSync(f).readUInt32BE(16), h: fs.readFileSync(f).readUInt32BE(20) };
          if (sz < 8000 || dim.w !== w * 2) bad.push(path.basename(f) + ' ' + sz + 'B ' + dim.w + 'x' + dim.h); } } }
    await page.emulateMedia({ colorScheme: 'light' }); await page.setViewportSize({ width: 390, height: 844 });
    P.t(n === 20 && !bad.length, n + ' screenshots saved (5 screens x 2 widths x 2 modes), all dpr 2 at the viewport width: ' + (bad.join('; ') || 'ok'), 6); return P; });

  await ctx.close();
  const earned = checks.reduce((a, c) => a + c.earned, 0), max = checks.reduce((a, c) => a + c.points, 0);
  return { earned: Math.round(earned / max * 10000) / 100, max: 100, checks: checks.map((c) => Object.assign({}, c, { points: Math.round(c.points / max * 10000) / 100, earned: Math.round(c.earned / max * 10000) / 100 })) };
};
