/* Prototype grader. Scores each design out of 100 on six parts Austin named plus what the research found:
   informative, small, friendly, intuitive, pretty, research fit. It reads each design's real CSS and HTML
   (font sizes, colours, tap sizes, labels, controls) and its measured layout notes (meta). It is a program,
   not a person: "pretty" is measured by checks a designer would make (theme colours only, few type sizes,
   no text under 12px, theme corners), not by taste. */
const themes = require('./themes.json'), BASE = require('./base.js'), { CARDS } = require('./data.js');
/* Round 3 (stricter, after an independent review): the shared component CSS counts toward each design, theme contrast counts,
   every layout claim in meta is checked against the rendered HTML, grid labels are checked for fit at 390px, tap width counts,
   and the question path is checked for order and for every "next" promise. */
const PHONE_H = 844;

/* ---- helpers ---- */
const lum = (hex) => { const c = hex.replace('#', '').match(/../g).map((h) => { const v = parseInt(h, 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function minThemeContrast() { let lo = 99, at = ''; for (const [n, t] of Object.entries(themes)) for (const fg of ['text', 'textMuted', 'accent', 'good', 'warn', 'bad']) for (const bg of ['bg', 'surface', 'surface2']) { const c = contrast(t[fg], t[bg]); if (c < lo) { lo = c; at = n + ' ' + fg + ' on ' + bg; } } return { lo, at }; }
function fontSizes(css) { const s = new Set(); for (const m of css.matchAll(/font-size:\s*(\d+)px/g)) s.add(+m[1]); for (const m of css.matchAll(/font:[^;}]*?(\d+)px/g)) s.add(+m[1]); return [...s].sort((a, b) => a - b); }
const hardColours = (css) => (css.replace(/var\([^)]*\)/g, '').match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) || []).length;
function tapSizes(css, html) { /* every <button class="x ..."> gets the min-height/height of its .x rule */
  const out = []; for (const m of html.matchAll(/<button class="([^"]+)"/g)) { const cls = m[1].split(/\s+/); let h = 0;
    for (const c of cls) { if (c === 'i') { h = 44; break; } const re = new RegExp('\\.' + c.replace(/[-]/g, '\\-') + '(?![\\w-])[^{]*\\{([^}]*)\\}', 'g'); for (const r of css.matchAll(re)) { const mh = r[1].match(/(?:min-)?height:\s*(\d+)px/); if (mh) h = Math.max(h, +mh[1]); } }
    out.push({ cls: m[1], h: h || 36 }); } return out; }
const has = (html, re) => re.test(html);
function styleChecks(d, dec, max) { /* the shared "pretty" part, out of max */
  let s = max; const css = cssFor(d), fs = fontSizes(css), hc = hardColours(d.css), min = fs[0] || 16;
  if (TC.lo < 4.5) { s -= 3; dec.push('pretty: theme contrast ' + TC.lo.toFixed(2) + ' (' + TC.at + '), under 4.5'); }
  if (hc) { s -= 4; dec.push('pretty: ' + hc + ' colour(s) not from the theme'); }
  if (fs.length > 5) { s -= Math.min(5, fs.length - 5) * 1.5; dec.push('pretty: ' + fs.length + ' type sizes (' + fs.join(', ') + '); 5 or fewer reads calmer'); }
  if (min < 12) { s -= 5; dec.push('pretty: text at ' + min + 'px, under the 12px floor from the phone test'); }
  if (!/var\(--r\)/.test(css)) { s -= 2; dec.push('pretty: corners do not follow the theme'); }
  if (/opacity:\s*\.?\d/.test(d.css)) { s -= 1; dec.push('pretty: faded layer lowers contrast'); }
  return Math.max(0, s); }

const BASE_RULES = [...BASE.replace(/@(keyframes|media)[^{]*\{([^{}]*\{[^{}]*\})*[^{}]*\}/g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
const classesOf = (html) => new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
function cssFor(d) { /* the design's own CSS plus every shared rule whose classes it really uses */
  const cl = classesOf(d.html() + (d.inputHtml ? d.inputHtml() : '')); const own = new RegExp('^\\.' + d.id + '(?![\\w-])');
  const used = BASE_RULES.filter((r) => r.sel.split(',').some((s) => { s = s.trim(); if (own.test(s)) return true; const c = [...s.matchAll(/\.([\w-]+)/g)].map((x) => x[1]); return c.length && c.every((x) => cl.has(x)); }));
  return d.css + used.map((r) => r.sel + '{' + r.body + '}').join(''); }
function themeContrast() { let lo = 99, at = ''; for (const [n, t] of Object.entries(themes)) { const pairs = [];
  for (const fg of ['text', 'textMuted', 'accent', 'good', 'warn', 'bad']) for (const bg of ['bg', 'surface', 'surface2']) pairs.push([fg, bg, t[fg], t[bg]]);
  pairs.push(['onAccent', 'accent', t.onAccent, t.accent], ['bg', 'text (selected chip)', t.bg, t.text]);
  for (const [a, b, x, y] of pairs) { const c = contrast(x, y); if (c < lo) { lo = c; at = n + ' ' + a + ' on ' + b; } } } return { lo, at }; }
const TC = themeContrast();
function tapWidths(css, html) { const bad = []; for (const m of html.matchAll(/<button class="([^"]+)"/g)) for (const c of m[1].split(/\s+/)) { if (c === 'i') continue;
  const re = new RegExp('\\.' + c.replace(/[-]/g, '\\-') + '(?![\\w-])[^{]*\\{([^}]*)\\}', 'g'); for (const r of css.matchAll(re)) { const w = r[1].match(/(?:^|;)\s*(?:min-)?width:\s*(\d+)px/); if (w && +w[1] < 44) bad.push(c + ' ' + w[1] + 'px'); } } return [...new Set(bad)]; }
/* meta claims are only believed when the HTML shows them */
const CLAIM = {
  main: { summary: (h) => /cash flow/i.test(h) && /Next buy/.test(h) },
  list: { cf: (h) => /cash flow|\/mo/i.test(h), cap: (h) => /Cap rate/.test(h), dscr: (h) => /DSCR/.test(h), price: (h) => /Price|Purchase price/.test(h), value: (h) => /value/i.test(h), down: (h) => /Down payment|down/i.test(h), when: (h) => /can afford it in|\d+ mo/.test(h),
    coc: (h) => /Cash-on-cash/.test(h), equity: (h) => /Equity/.test(h), verdict: (h) => /class="vd/.test(h), pay: (h) => /Payment/.test(h), cash: (h) => /to close/.test(h), loan: (h) => /Conventional|DSCR investor|FHA/.test(h), rent: (h) => /Rent/.test(h) },
  card: { section: (h) => /class="top"><span>[A-Z]/.test(h), back: (h) => /Back/.test(h), skip: (h) => />Skip<|Skip while a card is empty/.test(h), live: (h) => /class="live"|Cash flow/.test(h), swipeHint: (h) => /[Ss]wipe/.test(h), auto: (h) => /data-auto="advance"/.test(h) } };
function verifyMeta(page, d, dec) { const h = d.html() + (d.inputHtml ? d.inputHtml() : '') + ' ' + (d.idea || ''), m = { ...d.meta }, C = CLAIM[page];
  if (page === 'list') m.fields = (m.fields || []).filter((f) => { const ok = !C[f] || C[f](h); if (!ok) dec.push('checked: claims ' + f + ' but the page does not show it'); return ok; });
  else for (const [k, fn] of Object.entries(C)) if (m[k] && !fn(h)) { m[k] = false; dec.push('checked: claims ' + k + ' but the page does not show it'); }
  if (page === 'card' && m.progress === 'bar+count' && !(/role="progressbar"/.test(h) && /\d+ of \d+/.test(h))) { m.progress = 'none'; dec.push('checked: claims a progress bar with a count but the page does not show one'); }
  return m; }
/* will each grid label fit its cell on a 390px phone? (about 0.56em a character, plus an (i) button) */
function gridFit(css, html) { const g = css.match(/\.g\{[^}]*grid-template-columns:repeat\((\d+)/); if (!g) return [];
  const cols = +g[1], gap = +((css.match(/\.g\{[^}]*gap:(\d+)px/) || [0, 8])[1]), kf = +((css.match(/\.k\{[^}]*font-size:(\d+)px/) || [0, 12])[1]);
  const cell = (390 - 32 - 2 - 32 - gap * (cols - 1)) / cols; const over = new Set();
  for (const m of html.matchAll(/<span class="k">([^<]+)(<button class="i")?/g)) { const w = m[1].length * kf * 0.56 + (m[2] ? 22 : 0); if (w > cell) over.add(m[1].trim()); } return [...over]; }
/* the question path: price before loan before rate, and every "next" promise is kept by the card right after it */
function pathChecks(dec) { let pen = 0; const ix = (id) => CARDS.findIndex((c) => c.id === id);
  if (!(ix('price') < ix('loan') && ix('loan') < ix('rate'))) { pen += 4; dec.push('path: price, loan type and interest rate are not in that order'); }
  for (const c of CARDS) for (const o of c.opts || []) if (/next\b/i.test(o[1] || '')) { const f = CARDS.slice(ix(c.id) + 1).find((x) => x.follows === c.id); if (!f) { pen += 3; dec.push('path: "' + o[0] + '" on "' + c.q + '" promises a next card that does not exist'); } }
  return pen; }

/* ---- page graders: each returns { parts, dec } ---- */
function gradeMain(d0) {
  const dec = [], d = { ...d0, meta: verifyMeta('main', d0, dec) }, h = d.html(), P = {}, css = cssFor(d0);
  let inf = 0; if (has(h, />\+? ?Add an asset</) && has(h, />View assets</)) inf += 10; else dec.push('informative: button labels differ from "Add an asset" / "View assets"');
  if (has(h, /owned, \d+ planned/)) inf += 5; if (d.meta.summary) inf += 10; else dec.push('informative: no category totals (cash flow, value, next buy) before you tap');
  P.informative = inf / 25 * 100;
  P.small = (d.meta.h <= 160 ? 15 : d.meta.h <= 200 ? 12 : d.meta.h <= 240 ? 10 : 6) / 15 * 100; if (d.meta.h > 160) dec.push('small: about ' + d.meta.h + 'px tall');
  let fr = 10; if (has(h, /[+＋]/)) fr += 5; else dec.push('friendly: Add has no + sign'); P.friendly = fr / 15 * 100;
  const taps = tapSizes(css, h), tw = tapWidths(css, h); let it = 0; if (tw.length) { it -= 3; dec.push('intuitive: narrow tap targets: ' + tw.join(', ')); } const small = taps.filter((t) => t.h < 44); if (!small.length) it += 10; else dec.push('intuitive: buttons ' + small.map((t) => t.h + 'px').join(', ') + ' tall, under 44px');
  if (/background:var\(--accent\)/.test(css)) it += 5; else dec.push('intuitive: Add and View look the same weight; no clear main action');
  if (/grid-template-columns:1fr 1fr|width:100%|flex:1/.test(css)) it += 5; else dec.push('intuitive: small targets far from the thumb'); P.intuitive = Math.max(0, it) / 20 * 100;
  P.pretty = styleChecks(d, dec, 15) / 15 * 100;
  let rf = 4; if (d.meta.summary) rf += 6; else dec.push('research: portfolio apps (RentRedi, Baselane) lead with a roll-up of the category'); P.research = rf / 10 * 100;
  return { P, dec, W: { informative: 25, small: 15, friendly: 15, intuitive: 20, pretty: 15, research: 10 } }; }

const NEED = { cf: 'cash flow', cap: 'cap rate', dscr: 'DSCR', price: 'purchase price', value: 'estimated value', down: 'down payment needed', when: 'months until the trust can afford it' };
const EXTRA = { coc: 'cash-on-cash', equity: 'equity', verdict: '"Can I buy this?" verdict', pay: 'monthly payment', cash: 'cash to close', loan: 'loan type and rate', rent: 'rent' };
function gradeList(d0) {
  const dec = [], d = { ...d0, meta: verifyMeta('list', d0, dec) }, h = d.html(), P = {}, f = d.meta.fields, css = cssFor(d0);
  let inf = 0; for (const k of Object.keys(NEED)) { if (f.includes(k)) inf += 3; else dec.push('informative: missing ' + NEED[k]); }
  const ex = Object.keys(EXTRA).filter((k) => f.includes(k)); inf += Math.min(9, ex.length * 1.5); if (ex.length < 6) dec.push('informative: extras shown: ' + (ex.map((k) => EXTRA[k]).join(', ') || 'none'));
  P.informative = inf / 30 * 100;
  const avail = PHONE_H - 190, vis = d.meta.oneAtATime ? 1 : Math.floor(avail / (d.meta.cardH + 12));
  let sm = vis >= 3 ? 15 : vis === 2 ? 12 : 6; if (vis < 3) dec.push('small: ' + vis + ' asset(s) in the first screen'); if (d.meta.sideScroll) { sm -= 5; dec.push('small: the table scrolls sideways on a phone'); } P.small = sm / 15 * 100;
  let fr = 0; if (has(h, /class="vd/)) fr += 3; else dec.push('friendly: no verdict in words and icon');
  const jargon = ['cap', 'dscr'].concat(f.includes('coc') ? ['coc'] : []), explained = jargon.filter((k) => has(h, new RegExp('data-info="' + k + '"'))); fr += 4 * explained.length / jargon.length; if (explained.length < jargon.length) dec.push('friendly: no (i) explaining ' + jargon.filter((k) => !explained.includes(k)).join(', '));
  if (!has(h, />(Cap|Afford|Down) /) || has(h, /Cap rate/)) fr += 3; else dec.push('friendly: numbers labelled with short forms (Cap, Down)'); P.friendly = fr / 10 * 100;
  let it = 0; if (has(h, /class="so"/)) it += 4; else dec.push('intuitive: no sort'); if (has(h, /class="bk"/)) it += 4; if (has(h, /data-act="add"/)) it += 4; else dec.push('intuitive: no Add button on the list');
  if (has(h, /role="button"|<article/)) it += 4; else dec.push('intuitive: a row does not open its home'); if (!d.meta.oneAtATime && !d.meta.sideScroll) it += 4; else dec.push('intuitive: you have to swipe sideways to see every home or number');
  if (/<article[^>]*role="button"[^>]*>[\s\S]*?<button/.test(h)) { it -= 3; dec.push('intuitive: a whole card is a button with buttons inside it (screen readers and taps get confused)'); }
  const ltw = tapWidths(css, h); if (ltw.length) { it -= 2; dec.push('intuitive: narrow tap targets: ' + ltw.join(', ')); }
  if (/class="so"/.test(h) && !/aria-pressed/.test(h)) { it -= 1; dec.push('intuitive: sort chips do not say which one is on'); } P.intuitive = Math.max(0, it) / 20 * 100;
  const over = gridFit(css, h); if (over.length) { P.small = Math.max(0, P.small - 20); dec.push('small: labels too long for their cell at 390px: ' + over.join(', ')); }
  P.pretty = styleChecks(d, dec, 15) / 15 * 100;
  let rf = 0; if (/font:var\(--wn\) (2[2-9]|3\d)px/.test(css)) rf += 5; else dec.push('research: no single big headline number per home'); if (has(h, /data-info/)) rf += 5; else dec.push('research: formulas are not one tap away (DealCheck, Baselane put them behind an info icon)'); P.research = rf / 10 * 100;
  return { P, dec, W: { informative: 30, small: 15, friendly: 10, intuitive: 20, pretty: 15, research: 10 } }; }

function gradeCard(d0, path) {
  const dec = [], d = { ...d0, meta: verifyMeta('card', d0, dec) }, h = d.html(), m = d.meta, P = {}, css = cssFor(d0);
  let inf = 5; if (has(h, /<span>[^<]+<\/span><\/button>|<b>[^<]+<\/b><span>/)) inf += 0; if (/<span>[^<]{4,}<\/span>/.test(h)) inf += 3; else dec.push('informative: options have no one-line explanation');
  if (m.section) inf += 3; else dec.push('informative: no section name (where am I in the flow?)'); if (m.live) inf += 4; else dec.push('informative: you do not see what an answer does to cash flow or the verdict until the end');
  P.informative = inf / 15 * 100;
  P.small = (m.h <= 760 ? 15 : 9) / 15 * 100;
  let fr = 5; if (m.skip) fr += 5; else dec.push('friendly: no Skip (use a typical value)'); if (m.swipeHint || has(h, /class="hint"/)) fr += 5; else dec.push('friendly: no hint that you can swipe or that a pick moves on'); P.friendly = fr / 15 * 100;
  let it = 0; it += m.progress === 'bar+count' ? 6 : m.progress === 'count' || m.progress === 'number' ? 3 : m.progress === 'dots' ? 2 : 0; if (m.progress !== 'bar+count') dec.push('intuitive: progress is ' + m.progress + ', not a bar with "7 of 24"');
  if (m.back) it += 5; else dec.push('intuitive: no Back button for people who do not swipe'); if (m.swipe) it += 5; else dec.push('intuitive: no swipe between cards (asked for)'); if (m.auto && has(h, /data-auto="advance"/)) it += 4;
  const taps = tapSizes(css, h), small = taps.filter((t) => t.h < 44); if (!small.length) it += 5; else dec.push('intuitive: answer buttons ' + [...new Set(small.map((t) => t.h))].join(', ') + 'px tall');
  const ctw = tapWidths(css, h); if (ctw.length) { it -= 2; dec.push('intuitive: narrow tap targets: ' + ctw.join(', ')); }
  it -= pathChecks(dec); P.intuitive = Math.max(0, it) / 25 * 100;
  P.pretty = styleChecks(d, dec, 15) / 15 * 100;
  let rf = 0; if (m.auto) rf += 3; if (m.progress === 'bar+count') rf += 3; if (m.back) rf += 3; if (path.review) rf += 3; if (m.section && path.sections <= 8) rf += 3; else dec.push('research: long flows need sections so no stretch feels like 20 questions in a row');
  P.research = rf / 15 * 100;
  /* typing: the purchase-price card */
  const ih = d.inputHtml ? d.inputHtml() : ''; let ty = 0;
  if (/inputmode="decimal"/.test(ih)) ty += 4; else if (/inputmode="numeric"/.test(ih)) { ty += 2; dec.push('typing: number pad has no decimal point (rates and cents need one)'); } else dec.push('typing: opens the full keyboard for a number');
  if (/<label[^>]*for=/.test(ih)) ty += 2; else dec.push('typing: the box has no visible label');
  if (/class="help"|placeholder|value=/.test(ih) && /class="help"/.test(ih)) ty += 3; else dec.push('typing: no help line saying where to find the number');
  const itaps = tapSizes(css, ih), ismall = itaps.filter((t) => t.h < 44); if (itaps.length && !ismall.length) ty += 3; else dec.push('typing: Next/Send button ' + (ismall.map((t) => t.h + 'px').join(', ') || 'missing'));
  if (/class="(nx|cont|ok)"/.test(ih) || /class="bb">Next/.test(ih)) ty += 3; else dec.push('typing: no clear Next button after typing');
  P.typing = ty / 15 * 100;
  return { P, dec, W: { informative: 12, small: 10, friendly: 13, intuitive: 22, pretty: 13, research: 15, typing: 15 } }; }

function score(g) { let t = 0; for (const [k, w] of Object.entries(g.W)) t += g.P[k] / 100 * w; return Math.round(t * 10) / 10; }
function gradeAll(sets, path) {
  const out = {}; for (const [page, list] of Object.entries(sets)) out[page] = list.map((d) => { const g = page === 'main' ? gradeMain(d) : page === 'list' ? gradeList(d) : gradeCard(d, path);
    return { id: d.id, name: d.name, score: score(g), parts: Object.fromEntries(Object.entries(g.P).map(([k, v]) => [k, Math.round(v)])), weights: g.W, deductions: g.dec }; }).sort((a, b) => b.score - a.score);
  return { contrast: TC, round: 3, pages: out }; }
module.exports = { gradeAll, fontSizes, tapSizes };
