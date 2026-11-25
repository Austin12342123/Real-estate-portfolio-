{
/* Live prototype: theme switch, info popups, and the add-asset card deck. CARDS, THEMES, INFO come from the page. */
const root = document.documentElement, pick = document.getElementById('theme');
function setTheme(n) { const t = THEMES[n]; if (!t) return; const s = document.getElementById('vars');
  const heavy = !!t.fontStroke; s.textContent = `.app{--bg:${t.bg};--surface:${t.surface};--surface2:${t.surface2};--border:${t.border};--text:${t.text};--muted:${t.textMuted};--accent:${t.accent};--onAccent:${t.onAccent};--good:${t.good};--warn:${t.warn};--bad:${t.bad};--fd:${t.fontDisplay};--fb:${t.fontBody};--r:${t.radius};--wh:${t.fontWeightHeading || 700};--wn:${t.fontWeightNumbers || 700};--wb:${t.fontWeightBody || 400};--stroke:${heavy ? t.fontStroke : '0px'};color-scheme:${t.mode}}`;
  try { localStorage.setItem('af-theme', n); } catch (e) {} }
let start = 'oxford'; try { start = localStorage.getItem('af-theme') || (matchMedia('(prefers-color-scheme: dark)').matches && !root.dataset.theme ? 'technoir' : root.dataset.theme === 'dark' ? 'technoir' : 'oxford'); } catch (e) {}
pick.value = start; setTheme(start); pick.addEventListener('change', () => setTheme(pick.value));

/* info popups: every (i) explains its term */
const pop = document.getElementById('pop');
document.addEventListener('click', (e) => { const b = e.target.closest('[data-info]'); if (b) { e.preventDefault(); e.stopPropagation(); const k = b.dataset.info, it = INFO[k] || ['', ''];
  pop.querySelector('h4').textContent = it[0]; pop.querySelector('p').textContent = it[1]; pop.hidden = false; return; }
  if (!e.target.closest('#pop')) pop.hidden = true; });
pop.querySelector('button').addEventListener('click', () => { pop.hidden = true; });

/* main-page frame: each dropdown header opens and closes; Add starts the deck for that category; View opens that category's list */
const listEl = document.querySelector('#f-list .L7'), homesList = listEl ? listEl.innerHTML : '';
const CATN = { homes: 'Homes', commercial: 'Commercial', business: 'Businesses' };
function showList(cat) { if (!listEl) return; if (cat === 'homes') listEl.innerHTML = homesList;
  else listEl.innerHTML = `<div class="lh"><div class="lhr"><button class="bk" data-act="back" aria-label="Back to Portfolio">‹ Portfolio</button><button class="add" data-act="add" data-cat="${cat}">+ Add</button></div><h2 class="lt">${CATN[cat]}</h2><p class="ls">0 ${cat === 'business' ? 'businesses' : 'properties'}</p></div><div class="ac emp"><p style="margin:0">${cat === 'business' ? 'Each business you add shows its profit, cash flow, DSCR and when the trust can buy it.' : 'Each property you add shows its lease income, cash flow, cap rate, DSCR and when the trust can buy it.'} Tap + Add to start.</p></div>`;
  document.getElementById('f-list').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
document.getElementById('flow').addEventListener('click', (e) => {
  const tg = e.target.closest('[data-toggle]'); if (tg) { const open = tg.getAttribute('aria-expanded') !== 'true'; tg.setAttribute('aria-expanded', String(open)); document.getElementById(tg.getAttribute('aria-controls')).hidden = !open; return; }
  const nm = e.target.closest('[data-open]'); if (nm) { const pp = document.getElementById('pop'); pp.querySelector('h4').textContent = nm.dataset.open; pp.querySelector('p').textContent = "In the app this opens the home's own page, the one you use today, with every number and setting. This prototype has no asset page, so it stops here."; pp.hidden = false; e.stopPropagation(); return; }
  const mo = e.target.closest('[data-more]'); if (mo) { const open = mo.getAttribute('aria-expanded') !== 'true'; mo.setAttribute('aria-expanded', String(open)); document.getElementById(mo.getAttribute('aria-controls')).hidden = !open; return; }
  const so = e.target.closest('[data-sort]'); if (so) { const k = so.dataset.sort, box = so.closest('.L7').querySelector('.acs'); if (!box) return;
    so.parentNode.querySelectorAll('[data-sort]').forEach((b) => { b.classList.toggle('on', b === so); b.setAttribute('aria-pressed', String(b === so)); });
    [...box.children].sort((x, y) => k === 'order' ? x.dataset.order - y.dataset.order : y.dataset[k] - x.dataset[k]).forEach((n) => box.appendChild(n)); return; }
  const b = e.target.closest('[data-act]'); if (!b || b.closest('#deck')) return;
  if (b.dataset.act === 'view') showList(b.dataset.cat || 'homes');
  else if (b.dataset.act === 'back') document.getElementById('f-main').scrollIntoView({ behavior: 'smooth', block: 'center' });
  else if (b.dataset.act === 'add') { startFrom(b.dataset.cat || 'homes'); document.getElementById('f-deck').scrollIntoView({ behavior: 'smooth', block: 'center' }); } });

/* ---------- the deck ---------- */
/* loan choices set down payment %, rate %, term in months, closing % (typical, not quotes) */
const LOANS = { 'Conventional 30-year': [20, 7.5, 360, 3], 'Conventional 15-year': [20, 7.0, 180, 3], 'FHA (you live there)': [3.5, 6.9, 360, 4], 'FHA 203(k) rehab': [3.5, 7.15, 360, 5], 'DSCR investor loan': [25, 7.75, 360, 4], 'Cash': [100, 0, 360, 2],
  'Conventional 2 to 4 units': [20, 7.6, 360, 3], 'FHA, you live in one unit': [3.5, 6.9, 360, 4], 'Apartment loan (5+ units)': [25, 7.25, 360, 3], 'Bank commercial loan': [25, 7.5, 300, 3], 'SBA 504': [10, 7.0, 300, 4], 'SBA 7(a)': [10, 10.5, 120, 4], 'Bank term loan': [25, 9, 84, 3], 'Seller note': [20, 7, 120, 2] };
const DEF = { single: { price: 239000, rent: 2250, tax: 200, ins: 102 }, multi: { price: 480000, unitRent: 1150, tax: 420, ins: 210 }, commercial: { price: 650000, rent: 5600, tax: 650, ins: 300 }, business: { price: 900000, revenue: 1080000, margin: 20, tax: 0, ins: 0 } };
const A0 = { price: 239000, rent: 2250, unitRent: 1150, units: 4, revenue: 1080000, margin: 20, nnn: 85, capex: 0, tax: 200, ins: 102, hoa: 0, dp: 25, rate: 7.75, term: 360, closing: 4, mgmt: 8, maint: 1, value: 239000, growth: 4, bal: null, arv: null };
const A = { ...A0 }, ans = {}, touched = {};
const kind = () => ({ 'Multi-family': 'multi', 'Commercial property': 'commercial', 'Business': 'business' }[ans.type] || 'single');
const own = () => ans.status === 'I already own it';
const money = (x) => '$' + Math.round(Math.abs(x)).toLocaleString('en-US'), k = (x) => '$' + Math.round(x / 1000) + 'k', num = (s) => parseFloat(String(s).replace(/[^0-9.]/g, ''));
const DEFLOAN = { single: 'DSCR investor loan', multi: 'Conventional 2 to 4 units', commercial: 'Bank commercial loan', business: 'SBA 7(a)' };
function applyLoan(v) { const l = LOANS[v]; if (!l) return; A.dp = v === 'DSCR investor loan' && kind() === 'commercial' ? 30 : l[0]; A.rate = l[1]; A.term = l[2]; A.closing = l[3]; }
const defLoan = () => kind() !== 'multi' ? DEFLOAN[kind()] : ans.units === 'A pack of houses' ? 'DSCR investor loan' : A.units >= 5 ? 'Apartment loan (5+ units)' : DEFLOAN.multi;
function fixLoan() { const lc = CARDS.find((x) => x.id === 'loan'); if (ans.loan && !opts(lc).some(([t]) => t === ans.loan)) { delete ans.loan; if (ans._vis) delete ans._vis.loan; delete touched.rate; delete touched.closing; delete ans['t:dp:0']; delete ans['t:rate:0']; delete ans['t:closing:0']; } if (!ans.loan) applyLoan(defLoan()); }
function setDefaults() { const d = DEF[kind()]; for (const x in d) if (!touched[x]) A[x] = d[x]; scaleMulti(); fixLoan(); }
function scaleMulti() { if (kind() === 'multi') { const u = Math.max(2, A.units || 4); if (!touched.price) A.price = 120000 * u; if (!touched.tax) A.tax = 105 * u; if (!touched.ins) A.ins = Math.round(52.5 * u); } if (!touched.value) A.value = A.price; }
function calc() { const K = kind(), L = A.price * (1 - A.dp / 100), r = A.rate / 1200, pay = A.dp >= 100 ? 0 : r ? L * r / (1 - Math.pow(1 + r, -A.term)) : L / A.term;
  let noi; if (K === 'business') noi = A.revenue * A.margin / 100 / 12;
  else { const gross = K === 'multi' ? A.units * A.unitRent : A.rent, egi = gross * 0.95, ti = (A.tax + A.ins) * (K === 'commercial' ? 1 - A.nnn / 100 : 1);
    noi = egi - ti - (applies({ id: 'hoa' }) && ans.hoa === 'Yes' ? A.hoa : 0) - A.price * A.maint / 100 / 12 - egi * A.mgmt / 100; }
  const cf = noi - pay, dscr = pay ? noi / pay : 99, cash = A.price * (A.dp + A.closing) / 100 + A.capex;
  const v = cf >= 100 && dscr >= 1.1 ? 'ok' : cf >= 0 ? 'warn' : 'bad';
  const MO = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }, ws = ans.when === 'Not before a month I pick' ? (ans.whenm0 || 'Jun') + ' ' + (ans.whenm1 || '') : '', wm = /([a-z]{3})[a-z]*\.?\s*(\d{4})/i.exec(ws), wn = /(\d{1,2})\s*[\/\-.]\s*(\d{4})|(\d{4})\s*[\/\-.]\s*(\d{1,2})/.exec(ws);
  const mi = wm && MO[wm[1].toLowerCase()] !== undefined ? [+wm[2], MO[wm[1].toLowerCase()]] : wn ? (wn[1] ? [+wn[2], +wn[1] - 1] : [+wn[3], +wn[4] - 1]) : null, hold = mi ? (mi[0] - 2026) * 12 + mi[1] - 10 : 0;
  const base = TRUST.queue.month + Math.max(0, Math.ceil((cash - TRUST.queue.bal) / TRUST.monthly)), months = Math.max(hold, base);
  return { cf, cash, dscr, v, months, base, hold, pay, down: A.price * A.dp / 100, close: A.price * A.closing / 100, equity: (touched.arv ? A.arv : A.value) - (A.bal != null ? A.bal : L) }; }
const VTXT = { ok: ['✓ Good', '✓ Healthy'], warn: ['△ Tight', '△ Tight'], bad: ['✗ Loses', '✗ Losing'] };
function applies(c) { const a = (id) => ans[id], K = kind(), O = own();
  switch (c.id) {
    case 'type': return !ans._fixed; case 'units': return K === 'multi'; case 'unitsn': return K === 'multi' && (a('units') === '5 or more' || a('units') === 'A pack of houses');
    case 'home': return K === 'single'; case 'unitmix': return K === 'multi'; case 'rent': return K === 'single' || K === 'commercial'; case 'nnn': return K === 'commercial';
    case 'revenue': case 'margin': return K === 'business'; case 'hoa': return K === 'single' || (K === 'multi' && a('units') !== '5 or more'); case 'hoaamt': return (K === 'single' || (K === 'multi' && a('units') !== '5 or more')) && a('hoa') === 'Yes';
    case 'tax': case 'ins': case 'repairs': case 'manage': return K !== 'business';
    case 'value': return O; case 'when': return !O; case 'whenm': return !O && a('when') === 'Not before a month I pick'; case 'owned': return O;
    case 'sellyr': return a('exit') === 'Sell it later' || a('exit') === 'Refinance later';
    case 'rate': return false; case 'dp': return a('loan') !== 'Cash'; case 'closing': return !O; case 'rehab': return K !== 'business'; case 'rehabd': return K !== 'business' && !!a('rehab') && a('rehab') !== 'Move-in ready'; case 'bal': return O && a('loan') !== 'Cash'; default: return true; } }
const path = () => CARDS.filter(applies);
const deck = document.getElementById('deck'); let pos = 0, tmr = 0;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const seen = () => { const pi = path().findIndex((x) => x.id === 'price'); return !!(touched.price || ans.loan || (ans._vis || {}).price || (pi >= 0 && pos > pi)); };
function liveStrip() { const m = calc(), s = seen(), O = own();
  const third = O ? ['Value', k(A.value)] : ['Trust ready', m.months <= 0 ? 'now' : 'in ' + m.months + ' mo'];
  return `<div class="live" aria-live="polite"><div><span class="k">Cash flow</span><b class="v ${s ? (m.cf >= 0 ? 'good' : 'bad') : ''}">${s ? (m.cf < 0 ? '−' : '+') + money(m.cf) + '/mo' : '-'}</b></div><div><span class="k">Deal <button class="i" data-info="deal" aria-label="What does Deal mean?">i</button></span><b class="v">${s ? VTXT[m.v][O ? 1 : 0] : '-'}</b></div><div><span class="k">${third[0]}${O ? '' : ' <button class="i" data-info="trust" aria-label="What is Trust ready?">i</button>'}</span><b class="v">${s ? third[1] : '-'}</b></div></div>`; }
const refreshStrip = () => { const s = deck.querySelector('.live'); if (s) s.outerHTML = liveStrip(); };
const rehabSize = () => kind() === 'commercial' ? [50000, 150000] : kind() === 'multi' ? [A.units * 6000, A.units * 20000] : [10000, 40000];
const opts = (c) => { if (c.id === 'rehab' && kind() !== 'single') { const [l, b] = rehabSize(); return c.opts.map(([t, s]) => [t, t === 'Light refresh' ? (kind() === 'commercial' ? 'Paint, floors, lights · about ' : 'Paint, floors in each unit · about ') + k(l) : t === 'Big rehab' ? (kind() === 'commercial' ? 'Roof, HVAC, build-out · about ' : 'Kitchens, roof, systems · about ') + k(b) : s]); } if (c.id === 'type' && ans._homes) return c.opts.slice(0, 2); if (c.id === 'loan' && c.optsBy && c.optsBy[kind()]) { const L = c.optsBy[kind()]; if (kind() !== 'multi') return L; const big = A.units >= 5, pack = ans.units === 'A pack of houses';
    return L.filter(([t]) => pack ? !t.startsWith('FHA') && !t.startsWith('Apartment') && !t.startsWith('Conventional 2') : big ? !t.startsWith('Conventional 2') && !t.startsWith('FHA') : !t.startsWith('Apartment')); } return c.opts; };
const HELP_OWNED = { price: 'What you paid for it.', rate: "Your loan's rate and length, from your mortgage statement. Filled in with a typical rate for that loan until you change it.", dp: 'What you put down when you bought it.', loan: '' };
const helpOf = (c) => (c.id === 'value' && (kind() === 'commercial' || kind() === 'business') ? "A broker's opinion or a recent appraisal is fine. It sets your equity and net worth." : own() && HELP_OWNED[c.id] !== undefined ? HELP_OWNED[c.id] : c.help);
const REVT = { single: 'Your home', multi: 'Your multi-family home', commercial: 'Your commercial property', business: 'Your business' };
function cardQ(c) { if (c.id === 'price' && own()) return 'What did you pay for it?'; if (c.id === 'loan' && own()) return 'What loan is on it?'; if (c.id === 'rent' && kind() === 'commercial') return "What's the lease income?"; if (c.id === 'type' && ans._homes) return 'What kind of home?'; if (c.id === 'review') return (ans.addr || REVT[kind()]) + ' is ready'; return c.q; }
const TERMS = { single: [360, 180], multi: [360, 180], commercial: [300, 240, 120], business: [120, 84, 60] }, DPS = { single: [3.5, 5, 10, 20, 25], multi: [3.5, 15, 20, 25], commercial: [10, 20, 25, 30], business: [10, 20, 25] };
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], inMo = (n) => MN[(10 + n) % 12] + ' ' + (2026 + Math.floor((10 + n) / 12));
const years = () => { const y0 = 2026 + Math.floor((10 + calc().base) / 12); return [0, 1, 2, 3, 4].map((i) => String(y0 + i)); };
function chipOpts(c, o, d) { const K = kind();
  if (c.id === 'whenm' && o[0] === 'Jan') { if (!ans.whenm0) ans.whenm0 = MN[(10 + calc().base) % 12]; return [o, ans.whenm0]; }
  if (c.id === 'whenm' && o[0] === '2027') { const ys = years(); if (!ans.whenm1 || !ys.includes(ans.whenm1)) ans.whenm1 = ys[0]; return [ys, ans.whenm1]; }
  if (c.id === 'rate') { const t = [...new Set([...TERMS[K], A.term])]; return [t.map((m) => m / 12 + ' years'), A.term / 12 + ' years']; }
  if (c.id === 'dp') { const p = DPS[K]; return [p.map((x) => x + '%'), A.dp + '%']; }
  return [o, d]; }
function body(c) {
  const infoB = c.info ? ` <button class="i" data-info="${c.id === 'loan' ? 'loans' : 'repairs'}" aria-label="What do these mean?">i</button>` : '';
  if (c.kind === 'mc') { const gv = (g) => k((touched.arv ? A.arv : A.value) * Math.pow(1 + g / 100, 10));
    if (c.withRate && ans.loan && ans.loan !== 'Cash' && !ans._loanOpen) { const o = opts(c).find(([t]) => t === ans.loan) || [ans.loan, ''];
      return `<h3 class="q">${esc(cardQ(c))}${infoB}</h3><div class="o on">${esc(o[0])}${o[1] ? `<span>${esc(o[1])}</span>` : ''}</div><button class="chg" data-reopen>Change loan</button><div class="rtw">${partsOf(CARDS.find((x) => x.id === 'rate'))}</div>`; }
    return `<h3 class="q">${esc(cardQ(c))}${infoB}</h3>${opts(c).map(([t, s]) => `<button class="o${ans[c.id] === t ? ' on' : ''}" data-pick="${esc(t)}">${esc(t)}${s || c.id === 'growth' ? `<span>${esc(s || '')}${c.id === 'growth' ? (s ? ' · ' : '') + 'worth about ' + gv(parseFloat(t)) + ' in 10 years' : ''}</span>` : ''}</button>`).join('')}`; }
  if (c.kind === 'review') return reviewBody();
  return `<h3 class="q">${esc(cardQ(c))}</h3>${partsOf(c)}`; }
function partsOf(c) {
  const chips = (c.chips || []).map(([l, o0, d0], ci) => { const [o, d] = chipOpts(c, o0, d0); return 0 ||  `<span class="tl">${esc(l)}</span><div class="chips${c.id === 'whenm' && ci === 0 ? ' m6' : ''}">${o.map((x) => `<button class="chip${((c.id === 'rate' || c.id === 'dp') ? d : (ans[c.id + ci] || d)) === x ? ' on' : ''}" data-chip="${ci}" data-card="${c.id}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`; }).join('');
  const PRE = { price: [A.price], rate: [A.rate], closing: [A.closing], rent: [A.rent], tax: [A.tax], ins: [A.ins], hoaamt: [A.hoa || ''], unitmix: [A.unitRent], revenue: [A.revenue], margin: [A.margin], nnn: [A.nnn], value: [A.value], unitsn: [A.units], rehabd: [A.capex || '', '', A.arv || ''], dp: [A.dp], bal: [A.bal != null ? A.bal : Math.round(A.price * (1 - A.dp / 100))] };
  if ((c.id === 'tax' || c.id === 'ins') && (ans[c.id + '0'] || 'Per month') === 'Per year') PRE[c.id] = [Math.round(A[c.id] * 12)];
  const ins = (c.inputs || []).map((f, i) => { if (f.homeOnly && kind() !== 'single') return ''; const id = 'in-' + c.id + i, typed = ans['t:' + c.id + ':' + i];
    const pv = typed !== undefined ? typed : touched[c.id] && PRE[c.id] && PRE[c.id][i] !== undefined ? String(PRE[c.id][i]) : f.filled ? f.ph : '';
    const ph = c.id === 'sellyr' ? String(buyYr() + 5) : PRE[c.id] && PRE[c.id][i] !== undefined && PRE[c.id][i] !== '' && f.t === 'num' ? Math.round(PRE[c.id][i] * 100) / 100 : f.ph;
    const label = c.id === 'rent' && i === 0 && kind() === 'commercial' ? 'Monthly lease income' : c.id === 'unitmix' && ans.units === 'A pack of houses' ? 'Average rent per house' : f.l;
    return `<label class="tl" for="${id}">${esc(label)}</label><div class="tin${f.big ? '' : ' sm'}">${f.pre ? `<span>${f.pre}</span>` : ''}<input id="${id}" ${f.t === 'num' ? 'inputmode="decimal"' : 'type="text"'} placeholder="${esc(typeof ph === 'number' ? ph.toLocaleString('en-US') : ph)}" ${pv !== '' ? `value="${esc(pv)}"` : ''} data-f="${c.id}:${i}">${f.post ? `<span class="post">${esc(f.post)}</span>` : ''}</div>`; }).join('');
  const liveL = c.id === 'rate' ? `<p class="lv">${A.rate}% over ${A.term / 12} years is ${money(calc().pay)}/mo.</p>` : c.id === 'whenm' ? (() => { const m = calc(); return m.hold >= m.base ? `<p class="lv">Held until ${esc((ans.whenm0 || 'Jun') + ' ' + ans.whenm1)}, ${m.hold} mo from now.</p>` : `<p class="lv">The trust can't afford it until ${inMo(m.base)} anyway, so this month changes nothing.</p>`; })() : c.id === 'rehabd' && A.capex ? `<p class="lv">Cash to close goes up by ${money(A.capex)}.</p>` : c.id === 'dp' ? `<p class="lv">That is ${money(calc().down)} down on ${money(A.price)}.</p>` : c.id === 'closing' ? `<p class="lv">About ${money(calc().close)}. Cash to close: ${money(calc().cash)}.</p>` : c.id === 'unitmix' ? `<p class="lv">${A.units} ${ans.units === 'A pack of houses' ? 'houses' : 'units'} × ${money(A.unitRent)} = ${money(A.units * A.unitRent)}/mo.</p>` : c.id === 'sellyr' ? `<p class="lv">${sellMsg()}</p>` : '';
  return `${c.merged ? `<p class="rth">Rate and length</p>` : ''}${chips}${ins}${liveL}${helpOf(c) ? `<p class="help">${esc(helpOf(c))}</p>` : ''}`; }
function buyYr() { return 2026 + Math.floor((10 + (own() ? 0 : calc().months)) / 12); }
function sellMsg() { const t0 = (ans['t:sellyr:0'] || '').trim(), y = /^\d{4}$/.test(t0) ? +t0 : 0, b = buyYr(); return y && y < b ? `That's before ${own() ? 'today' : 'the trust can buy it in ' + b}. Pick ${b} or later.` : own() ? 'Any year from now on.' : `The trust can buy it in ${b}, so pick ${b} or later.`; }
function reviewBody() { const m = calc(), K = kind(), O = own(), P = path(), inP = (id) => P.some((x) => x.id === id);
  const row = (l, v, id) => `<div class="rv"><span>${l}</span><b>${v}</b>${inP(id) ? `<button class="ed" data-jump="${id}">Edit</button>` : '<span></span>'}</div>`;
  const cash = ans.loan === 'Cash', loanName = ans.loan || defLoan();
  const inc = K === 'business' ? row('Revenue and margin', money(A.revenue) + '/yr at ' + A.margin + '%', 'revenue') : K === 'multi' ? row('Rent', A.units + (ans.units === 'A pack of houses' ? ' houses × ' : ' units × ') + money(A.unitRent), 'unitmix') : row(K === 'commercial' ? 'Lease income' : 'Rent', money(A.rent) + '/mo', 'rent');
  return `<h3 class="q">${esc(cardQ({ id: 'review' }))}</h3><p class="help" style="margin-top:0">Check it once, then add it. You can change anything later.</p>
  ${row('Kind', esc(K === 'multi' ? (ans.units === 'A pack of houses' ? 'A pack of ' + A.units + ' houses' : 'Multi-family, ' + A.units + ' units') : ans.type || (K === 'commercial' ? 'Commercial property' : K === 'business' ? 'Business' : 'Single-family home')), 'type')}${row('Own it?', O ? 'Yes, I own it' : 'Planning to buy', 'status')}${row('Address', esc(ans.addr || 'Not set yet'), 'addr')}${inP('home') ? row('Home', esc((ans.home0 || '4') + ' beds, ' + (ans.home1 || '2') + ' baths' + (ans['t:home:0'] ? ', ' + ans['t:home:0'] + ' sq ft' : '')), 'home') : ''}${row('Price', money(A.price), 'price')}${row('Loan', esc(loanName) + (cash ? '' : ', ' + A.rate + '%, ' + A.term / 12 + ' years'), 'loan')}${cash ? '' : row('Down payment', money(m.down) + ' (' + A.dp + '%)', 'dp')}${inc}
  ${K === 'business' ? '' : row('Property tax', money(A.tax) + '/mo' + (K === 'commercial' ? ', tenants repay ' + A.nnn + '%' : ''), 'tax') + row('Insurance', money(A.ins) + '/mo', 'ins') + row('Manager', A.mgmt ? A.mgmt + '% of rent' : 'You (no fee)', 'manage')}
  ${O ? '' : row('Closing costs', money(m.close) + ' (' + A.closing + '%)', 'closing')}${inP('hoa') ? (ans.hoa === 'Yes' ? row('HOA', money(A.hoa) + '/mo', 'hoaamt') : row('HOA', 'None', 'hoa')) : ''}${inP('rehab') ? (A.capex > 0 ? row('Fix-up', money(A.capex) + ' rehab budget', 'rehab') : row('Fix-up', ans.rehab === "I'll type a budget" ? 'Budget not set yet' : 'Move-in ready', ans.rehab === "I'll type a budget" && inP('rehabd') ? 'rehabd' : 'rehab')) : ''}${touched.arv ? row('Value after the work', money(A.arv), 'rehabd') : ''}${O ? row('Worth today', money(A.value), 'value') + row('Bought', esc(ans['t:owned:0'] || 'Not set yet'), 'owned') + (cash ? '' : row('Loan left', money(A.bal != null ? A.bal : A.price * (1 - A.dp / 100)), 'bal')) : row('Plan', ans.when === 'Not before a month I pick' ? 'Not before ' + esc((ans.whenm0 || 'Jun') + ' ' + (ans.whenm1 || '2027')) : esc(ans.when || 'As soon as the trust can afford it'), 'when')}${inP('repairs') ? row('Systems', esc((ans.repairs || 'Typical').replace(/ \(.*\)/, '')) + ', repairs ' + A.maint + '%/yr', 'repairs') : ''}${row('Growth', A.growth + '% a year', 'growth')}${inP('exit') ? row('Long-term', ans.exit && ans.exit !== 'Keep it' ? esc(ans.exit.replace(' later', '')) + ' in ' + esc(ans['t:sellyr:0'] || 'a year not set yet') + (/^\d{4}$/.test((ans['t:sellyr:0'] || '').trim()) && +ans['t:sellyr:0'] < buyYr() ? (O ? ' (before today)' : ' (before the buy)') : '') : 'Keep it', 'exit') : ''}
  <div class="rvs"><div><span class="k">Cash flow</span><b class="${m.cf < 0 ? 'bad' : 'good'}">${(m.cf < 0 ? '−' : '+') + money(m.cf)}/mo</b></div><div><span class="k">${O ? 'Equity <button class="i" data-info="equity" aria-label="What is equity?">i</button>' : 'Cash to close <button class="i" data-info="cash" aria-label="What is cash to close?">i</button>'}</span><b>${k(O ? m.equity : m.cash)}</b></div><div><span class="k">${O ? 'Deal <button class="i" data-info="deal" aria-label="What does Deal mean?">i</button>' : 'Trust ready <button class="i" data-info="trust" aria-label="What is Trust ready?">i</button>'}</span><b>${O ? VTXT[m.v][1] : m.months <= 0 ? 'now' : 'in ' + m.months + ' mo'}</b></div></div>
  <p class="help" style="margin:0 0 12px">${O ? '' : 'Deal: ' + VTXT[m.v][0].slice(2).toLowerCase() + ' (cash flow ' + (m.cf < 0 ? '−' : '+') + money(m.cf) + ', DSCR ' + (m.dscr > 50 ? 'no loan' : m.dscr.toFixed(2)) + ' <button class="i" data-info="dscr" aria-label="What is DSCR?">i</button>). The trust is funded in buy order, so this one is bought after the homes already planned.'}</p><button class="save">${O ? 'Add to what I own' : 'Add to my plan'}</button>`; }
function render(dir) { const old = dir ? deck.querySelector('#cardEl') : null, oldT = old ? old.style.transform : ''; const P = path(); pos = Math.max(0, Math.min(pos, P.length - 1)); const c = P[pos], last = c.kind === 'review', _v = (ans._vis = ans._vis || {}), _vv = (_v[c.id] = 1), rateOpen = c.withRate && ans.loan && ans.loan !== 'Cash' && !ans._loanOpen, mc = c.kind === 'mc' && !rateOpen, backR = !last && ans._fromReview && P[target()] && P[target()].kind === 'review';
  deck.innerHTML = `${liveStrip()}<div class="top"><span>${esc(c.sec)}</span><span>${pos + 1} of ${P.length}</span></div><div class="pb" role="progressbar" aria-valuenow="${pos + 1}" aria-valuemin="1" aria-valuemax="${P.length}"><i style="width:${Math.round((pos + 1) / P.length * 100)}%"></i></div>
  <div class="stack"><div class="cd ${dir ? 'in-' + dir : ''}" id="cardEl">${body(c)}</div></div>
  <div class="ft"><button class="bb" data-nav="-1" ${pos ? '' : 'disabled'} aria-label="Previous question">‹ Back</button>${backR || last ? '' : mc && !ans[c.id] ? '<span class="hint">' + (c.withRate ? 'Pick one, then check the rate' : 'Pick one') + '</span>' : rateOpen ? '<span class="hint">Swipe ← or tap Next</span>' : ''}${last ? '' : backR ? '<button class="nx" data-nav="1" data-back="1">Back to review ›</button>' : rateOpen ? '<button class="nx" data-nav="1">Next ›</button>' : '<button class="bb" data-nav="1" data-skip="1">Skip</button>'}</div>`;
  if (last) delete ans._fromReview; else if (!rateOpen) updFoot(c);
  if (old) { const g = document.createElement('div'); g.className = 'cd ghost'; g.setAttribute('aria-hidden', 'true'); g.innerHTML = old.innerHTML.replace(/ (id|for|data-[a-z-]+)="[^"]*"/g, ''); g.style.transform = oldT || 'none';
    deck.querySelector('.stack').appendChild(g); const out = dir === 'right' ? -1 : 1; requestAnimationFrame(() => requestAnimationFrame(() => { g.style.transform = `translateX(${out * 120}%) rotate(${out * 8}deg)`; g.style.opacity = '0'; })); setTimeout(() => g.remove(), 300); } }
function go(to, dir) { clearTimeout(tmr); tmr = 0; delete ans._loanOpen; pos = to; render(dir); }
function hasVal(c) { if (c.kind === 'mc') return !!ans[c.id]; if (c.chips && c.chips.length) return true; return [...deck.querySelectorAll('#cardEl input')].some((x) => x.value.trim() !== ''); }
function updFoot(c) { const b = deck.querySelector('.ft [data-nav="1"]'); if (!b || b.dataset.back) return; const v = hasVal(c || path()[pos]); b.className = v ? 'nx' : 'bb'; b.textContent = v ? 'Next ›' : 'Skip'; if (v) delete b.dataset.skip; else b.dataset.skip = '1'; }
function target() { const P = path(); if (ans._fromReview) { const n = P[pos + 1]; if (!(n && n.follows === P[pos].id)) { const u = P.findIndex((x, i) => i > pos && x.kind !== 'review' && !(ans._vis || {})[x.id]); const r = u >= 0 ? u : P.findIndex((x) => x.kind === 'review'); if (r >= 0) return r; } } return pos < P.length - 1 ? pos + 1 : pos; }
function next() { const t = target(); if (t !== pos) go(t, 'right'); }
function prev() { if (pos > 0) go(pos - 1, 'left'); }
function reset() { for (const x in ans) delete ans[x]; for (const x in touched) delete touched[x]; Object.assign(A, A0); }
function startFrom(cat) { reset(); if (cat === 'commercial') { ans.type = 'Commercial property'; ans._fixed = 1; } else if (cat === 'business') { ans.type = 'Business'; ans._fixed = 1; } else ans._homes = 1; setDefaults(); go(0, 0); }
const UNITS = { '2 (duplex)': 2, '3 (triplex)': 3, '4 (fourplex)': 4 };
let swiped = false;
deck.addEventListener('click', (e) => { if (swiped) { swiped = false; return; } const t = e.target;
  if (t.closest('[data-info]')) return;
  const p = t.closest('[data-pick]'); if (p) { const c = path()[pos], v = p.dataset.pick, prevPick = ans[c.id]; ans[c.id] = v; deck.querySelectorAll('.o').forEach((o) => o.classList.toggle('on', o === p));
    if (c.id === 'type') setDefaults();
    if (c.id === 'units') { const tu = num(ans['t:unitsn:0'] || ''); A.units = UNITS[v] || (isFinite(tu) && tu > 0 ? tu : 6); scaleMulti(); fixLoan(); if (ans['t:rehabd:0'] === undefined && (ans.rehab === 'Light refresh' || ans.rehab === 'Big rehab')) A.capex = rehabSize()[ans.rehab === 'Big rehab' ? 1 : 0]; }
    if (c.id === 'loan' && LOANS[v] && v !== prevPick) { applyLoan(v); touched.rate = touched.closing = 1; delete ans['t:dp:0']; delete ans['t:rate:0']; delete ans['t:closing:0']; }
    if (c.id === 'loan') { delete ans._loanOpen; if (v !== 'Cash') { refreshStrip(); render(); const ri = deck.querySelector('[data-f="rate:0"]'); if (ri && !matchMedia('(pointer:coarse)').matches) ri.focus(); return; } }
    if (c.id === 'manage') A.mgmt = { 'I will': 0, 'A property manager': 8, 'A full-service manager': 10 }[v] ?? 8;
    if (c.id === 'hoa') { if (v === 'No HOA') { A.hoa = 0; delete ans['t:hoaamt:0']; delete touched.hoaamt; } }
    if (c.id === 'rehab') { const rz = rehabSize(), cx = { 'Move-in ready': 0, 'Light refresh': rz[0], 'Big rehab': rz[1] }[v]; if (cx !== undefined) { A.capex = cx; delete ans['t:rehabd:0']; } else if (ans['t:rehabd:0'] === undefined) A.capex = 0; if (v === 'Move-in ready') { A.arv = null; delete touched.arv; delete ans['t:rehabd:2']; } }
    if (c.id === 'growth') A.growth = parseFloat(v) || 4;
    if (c.id === 'repairs') A.maint = v.startsWith('Newer') ? 0.5 : v.startsWith('Older') ? 1.5 : 1;
    refreshStrip(); clearTimeout(tmr); const at = pos; tmr = setTimeout(() => { tmr = 0; if (pos === at) next(); }, 260); return; }
  const ch = t.closest('[data-chip]'); if (ch) { const c = { id: ch.dataset.card || path()[pos].id }; ans[c.id + ch.dataset.chip] = ch.dataset.v; ch.parentNode.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === ch));
    if (c.id === 'dp') { A.dp = parseFloat(ch.dataset.v); delete ans['t:dp:0']; render(); return; } if (c.id === 'rate') { A.term = parseFloat(ch.dataset.v) * 12; const sw = ans.loan === 'Conventional 30-year' && A.term === 180 ? 'Conventional 15-year' : ans.loan === 'Conventional 15-year' && A.term === 360 ? 'Conventional 30-year' : ''; if (sw) { ans.loan = sw; if (ans['t:rate:0'] === undefined) A.rate = LOANS[sw][1]; } render(); return; }
    if (c.id === 'tax' || c.id === 'ins') { if (ans['t:' + c.id + ':0'] !== undefined) { const v = num(ans['t:' + c.id + ':0']); if (isFinite(v)) A[c.id] = ch.dataset.v === 'Per year' ? v / 12 : v; } render(); return; }
    if (c.id === 'whenm') { render(); return; }
    refreshStrip(); return; }
  if (t.closest('[data-reopen]')) { ans._loanOpen = 1; render(); return; }
  const j = t.closest('[data-jump]'); if (j) { const i = path().findIndex((x) => x.id === j.dataset.jump); if (i >= 0) { ans._fromReview = 1; go(i, 'left'); } return; }
  if (t.closest('#again')) { startFrom(ans._fixed ? (kind() === 'business' ? 'business' : 'commercial') : 'homes'); return; }
  if (t.closest('.save')) { const O = own(); deck.querySelector('#cardEl').innerHTML = `<h3 class="q">${O ? 'Added to what you own' : 'Added to your plan'}</h3><p class="help">In the real app this saves it ${O ? 'with what you own' : 'as the last planned asset'}. Here it is a prototype, so nothing is saved.</p><button class="save" id="again">Start again</button>`; return; }
  const n = t.closest('[data-nav]'); if (n) { n.dataset.nav === '1' ? next() : prev(); } });
deck.addEventListener('input', (e) => { const f = e.target.dataset.f; if (!f) return; const [id, i] = f.split(':'), v = num(e.target.value);
  ans['t:' + id + ':' + i] = e.target.value; updFoot(); if (id === 'addr' && i === '0') ans.addr = e.target.value; if (!isFinite(v)) return;
  const yr = (ans[id + '0'] || 'Per month') === 'Per year' ? 12 : 1, T = (x) => { touched[x] = 1; };
  const set = { price: () => { A.price = v; T('price'); if (!touched.value) A.value = v; }, value: () => { A.value = v; T('value'); }, rate: () => (A.rate = v), closing: () => (A.closing = v), rent: () => { if (i === '0') { A.rent = v; T('rent'); } },
    tax: () => { A.tax = v / yr; T('tax'); }, ins: () => { A.ins = v / yr; T('ins'); }, hoaamt: () => { A.hoa = v; T('hoaamt'); }, unitsn: () => { A.units = v; T('units'); scaleMulti(); fixLoan(); }, unitmix: () => { A.unitRent = v; T('unitRent'); },
    nnn: () => { A.nnn = v; T('nnn'); }, revenue: () => { A.revenue = v; T('revenue'); }, margin: () => { A.margin = v; T('margin'); }, rehabd: () => { if (i === '0') A.capex = v; if (i === '2') { A.arv = v; T('arv'); } }, dp: () => { A.dp = Math.min(100, v); deck.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', parseFloat(x.dataset.v) === A.dp)); }, bal: () => { A.bal = v; }, whenm: () => {}, sellyr: () => {} }[id];
  if (set) { set(); refreshStrip(); const lv = deck.querySelector('.lv'); if (lv) { const m = calc(); lv.textContent = id === 'unitmix' ? `${A.units} ${ans.units === 'A pack of houses' ? 'houses' : 'units'} × ${money(A.unitRent)} = ${money(A.units * A.unitRent)}/mo.` : id === 'dp' ? `That is ${money(m.down)} down on ${money(A.price)}.` : id === 'rate' ? `${A.rate}% over ${A.term / 12} years is ${money(m.pay)}/mo.` : id === 'closing' ? `About ${money(m.close)}. Cash to close: ${money(m.cash)}.` : id === 'rehabd' ? `Cash to close goes up by ${money(A.capex)}.` : id === 'sellyr' ? sellMsg() : lv.textContent; } } });
deck.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest('input')) { e.preventDefault(); next(); } });
/* swipe: left = next, right = previous (Austin's rule). The pointer is only captured once the drag is clearly sideways, so taps still reach the buttons. */
let sx = null, sy = null, cap = false;
const resetCard = () => { const el = deck.querySelector('#cardEl'); if (el) { el.style.transition = ''; el.style.transform = ''; } };
deck.addEventListener('pointerdown', (e) => { swiped = false; cap = false; if (e.target.closest('input')) return; sx = e.clientX; sy = e.clientY; });
deck.addEventListener('pointermove', (e) => { if (sx === null) return; const el = deck.querySelector('#cardEl'), dx = e.clientX - sx, dy = e.clientY - sy;
  if (!cap && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { cap = true; try { deck.setPointerCapture(e.pointerId); } catch (er) {} if (el) el.style.transition = 'none'; }
  if (cap && el) el.style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`; });
const end = (e) => { if (sx === null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (!cap || Math.abs(dy) > Math.abs(dx) || Math.abs(dx) <= 70) { resetCard(); if (cap) { swiped = true; cap = false; } return; } swiped = true; cap = false; const at = pos; if (dx < -70) next(); else prev(); if (pos === at) resetCard(); };
deck.addEventListener('pointerup', end); deck.addEventListener('pointercancel', () => { sx = null; cap = false; resetCard(); });
const frameEl = deck.closest('.ph'); frameEl.tabIndex = 0; frameEl.setAttribute('aria-label', 'Add an asset, use the arrow keys to move between cards');
document.addEventListener('keydown', (e) => { if (e.target.closest && e.target.closest('input')) return; if (!frameEl.matches(':hover') && !frameEl.contains(document.activeElement)) return; if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); });
startFrom('homes');
/* every card, laid out flat (all branches shown, numbered in path order for a planned single-family home) */
const all = document.getElementById('allcards');
if (all) { const VIS = CARDS.filter((x) => !x.merged), N = VIS.length, keep = { ...ans }; reset(); ans.loan = 'DSCR investor loan'; applyLoan(ans.loan); all.innerHTML = VIS.map((c, i) => `<figure class="mini"><div class="ph app C7 still" aria-hidden="true"><div class="top"><span>${esc(c.sec)}</span><span>${i + 1} of ${N}</span></div><div class="pb"><i style="width:${Math.round((i + 1) / N * 100)}%"></i></div><div class="cd">${body(c)}</div><div class="ft"><button class="bb" tabindex="-1">‹ Back</button>${c.kind === 'mc' ? '<span class="hint">Swipe or pick one</span>' : c.kind === 'review' ? '' : '<button class="nx" tabindex="-1">Next ›</button>'}</div></div><figcaption><b>${i + 1}. ${esc(c.q)}</b><span>${c.withRate ? 'Pick a loan, then its rate and length open on the same card' : c.kind === 'mc' ? 'Multiple choice, moves on when picked' : c.kind === 'review' ? 'Review and save' : c.kind === 'multi' ? 'Chips and a type box' : 'Type box'} · fills ${esc(c.field)}${c.when ? ' · ' + esc(c.when) : ''}</span></figcaption></figure>`).join(''); reset(); Object.assign(ans, keep); setDefaults(); }
}
