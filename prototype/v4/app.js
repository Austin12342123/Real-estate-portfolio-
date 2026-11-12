/* Portfolio app v3 — UI layer. All math lives in engine.js. Data never leaves the device (localStorage; IndexedDB in the final build). */
(function () {
  const E = window.Engine, KEY = 'rep-v4', UIKEY = 'rep-v4-ui', SKEY = 'rep-v4-saved';
  let S, UI = { tab: 'timeline', open: false, coll: { drivers: true }, hideLegend: false, addType: 'house', addLoan: '', view: 'plan', openOn: 'planned', addOwned: false };
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  const DATA_V = 18; /* bump when the sample portfolio changes so old saved samples are replaced */
  if (S && Array.isArray(S.houses) && S.g && S.v === 8) { S.p = S.p || E.samplePersonal(); S.v = DATA_V; } /* v8 saves keep their assets and gain a finance profile */
  let switched = null;
  if (S && Array.isArray(S.houses) && S.g && S.v >= 9 && S.v <= 17) { switched = JSON.stringify(S); S = E.seedPlan(); S.v = DATA_V; } /* v9-v17 saves switch silently to the current $131M plan with its default finance profile (the old plan keeps its own profile when it is filed in Saved, below). The plan needs about $2,000/mo of job money left after living costs; an older, tighter profile would only reach about a third of it. */
  if (!S || !Array.isArray(S.houses) || !S.g || S.v !== DATA_V) S = E.seedPlan();
  E.normalize(S); if (!S.p) S.p = E.samplePersonal(); S.p = E.normalizePersonal(S.p); S.v = DATA_V;
  /* the next planned asset below h in the list (the trust buys in list order), and the month it is bought if h's extra payment were x instead */
  const nextPlanned = (h) => { const i = S.houses.indexOf(h); for (let k = i + 1; k < S.houses.length; k++) if (S.houses[k].status === 'planned') return S.houses[k]; return null; };
  const planWith = (h, x) => { const c = JSON.parse(JSON.stringify(S)), q = c.houses.find((y) => y.id === h.id); q.extra = x; q.driver = 'extra'; return E.plan(c); };
  const monthWith = (h, x, id) => planWith(h, x).purchase[id];
  /* how long this asset's loan lasts in the plan (months from today when owned, months after it is bought when planned); it includes the automatic extra from its own profit and from your job */
  const lifeOf = (pl2, h) => { const e = pl2.loanEnd[h.id], b = h.status === 'owned' ? 0 : pl2.purchase[h.id]; return isFinite(e) && isFinite(b) ? Math.max(0, e - b) : Infinity; };
  const buyKey = (h, pl) => (h.status === 'owned' ? -(+h.paid || 0) : isFinite(pl.purchase[h.id]) ? pl.purchase[h.id] : 1e9); const buyOrder = (pl) => { const no = {}; S.houses.map((h, i) => [h, i]).sort((a, b) => buyKey(a[0], pl) - buyKey(b[0], pl) || a[1] - b[1]).forEach(([h], k) => { no[h.id] = k + 1; }); return no; };
  const fixOrder = (s) => { s.seq = +s.seq || 0; s.houses.forEach((h) => { if (!h.created) h.created = Date.now(); }); if (s.orderV !== 2) E.orderByBuy(s); return s; }; /* list order = buy order, sorted once; after that the saved order is the truth */
  fixOrder(S);
  try { UI = Object.assign(UI, JSON.parse(localStorage.getItem(UIKEY)) || {}); } catch (e) {}
  const PAGES = ['planned', 'real', 'saved'];
  if (PAGES.indexOf(UI.openOn) < 0) UI.openOn = 'planned';
  let page = UI.openOn; /* the page shown on the main screen; kept while you move around the app, and reset to the "Open the app on" choice when the app starts */
  /* saved portfolios: full snapshots (assets, assumptions, finances) kept on this device under their own key and included in Export / Restore */
  const MAXSAVED = 40, cleanSaved = (a) => (Array.isArray(a) ? a.filter((x) => x && x.id && x.state && Array.isArray(x.state.houses) && x.state.g).slice(0, MAXSAVED).map((x) => ({ id: String(x.id), name: String(x.name || 'Saved portfolio').slice(0, 60), ts: +x.ts || Date.now(), state: x.state })) : []);
  let SAVED = []; try { SAVED = cleanSaved(JSON.parse(localStorage.getItem(SKEY))); } catch (e) { SAVED = []; }
  let saveName = '', renameName = '', savedMsg = '';
  let storageOK = true, impName = '', imp = null, ask = null, notice = '', pendingImport = null, exportOpen = false, undo = null, selId = null;
  /* no popup: an older save moves to the current plan silently; the previous portfolio is kept in Saved so nothing is lost (it is filed once SAVED is loaded, below) */
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(UIKEY, JSON.stringify(UI)); storageOK = true; } catch (e) { storageOK = false; } };
  const saveSaved = () => { try { localStorage.setItem(SKEY, JSON.stringify(SAVED)); return true; } catch (e) { return false; } };
  const backupJson = () => JSON.stringify(Object.assign({}, S, { saved: SAVED, openOn: UI.openOn })); /* the backup is the working portfolio plus the saved list and the start-page choice */
  const stamp = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const H = (id) => E.H(S, id);
  /* viewer-safe routes: #house-<id>, #assumptions, #import-<id|new> */
  const hashOf = (p) => (!p ? '#' : p === 'settings' ? '#assumptions' : p.startsWith('h/') ? '#house-' + p.slice(2) : p.startsWith('import/') ? '#import-' + p.slice(7) : p === 'add' ? '#add' : p === 'finances' ? '#finances' : '#');
  const routeOf = () => { const h = location.hash.slice(1); return h === 'assumptions' ? 'settings' : h.startsWith('house-') ? 'h/' + h.slice(6) : h.startsWith('import-') ? 'import/' + h.slice(7) : h === 'add' ? 'add' : h === 'finances' ? 'finances' : ''; };
  const goto = (p) => { location.hash = hashOf(p); };

  /* ---------- formatting ---------- */
  const num = (n) => (isFinite(n) ? n : 0);
  const $f = (n) => { const a = Math.abs(num(n)), sg = n < -0.5 ? '−' : ''; return a >= 1e9 ? sg + '$' + (a / 1e9).toFixed(2) + 'B' : a >= 1e7 ? sg + '$' + (a / 1e6).toFixed(1) + 'M' : sg + '$' + Math.round(a).toLocaleString('en-US'); };
  const $s = (n) => (n < -0.5 ? '−' : '+') + $f(Math.abs(n));
  const $k = (n) => { const a = Math.abs(num(n)), sg = n < 0 ? '−' : ''; return a >= 1e6 ? sg + '$' + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M' : a >= 1e3 ? sg + '$' + Math.round(a / 1e3) + 'K' : sg + '$' + Math.round(a); };
  const $c = (n) => { const a = Math.abs(num(n)); return a >= 1e9 ? $f(n) : a >= 1e7 ? (n < 0 ? '−' : '') + '$' + (a / 1e6).toFixed(1) + 'M' : a >= 1e6 ? (n < 0 ? '−' : '') + '$' + (a / 1e6).toFixed(2) + 'M' : $f(n); };
  const $cs = (n) => (n < -0.5 ? '−' : '+') + $c(Math.abs(n));
  const VL = { yes: 'Yes', tight: 'Tight', no: 'Not yet' };
  /* THE SAFE RANGES, in one place. A check is plain (neutral) while its number is inside the safe range, amber past the caution line, red past the limit.
     Debt-to-income: caution above 85% of the lender limit (36% of a 43% limit), over above the limit. Cash cushion: caution when your cash dips below the emergency cushion, over when it runs out.
     Cash beyond the trust: caution when it is more than all of your savings, over when your cash would run short. Pace: caution when the last purchase lands in the last 10% of the plan or after it ends, over when an asset is never funded. Lasts: caution under 3 months, over under 1 month. A check that is over its limit is red everywhere (row, header, the Can I afford this chip); amber only means caution. */
  const SAFE = { dtiCaution: 0.85, savingsCaution: 1, paceCaution: 0.9, lastsCaution: 3, lastsOver: 1 }; /* lasts: months your cash covers the shortfall if the biggest earners stop paying; amber under 3 months, red under 1 */
  const LV = { ok: 0, warn: 1, bad: 2 };
  const TL = { house: 'Home', commercial: 'Commercial', business: 'Business' }, TPL = { house: 'Single-family homes', commercial: 'Commercial properties', business: 'Businesses' };
  const grp = (n) => Math.round(num(n)).toLocaleString('en-US');
  const mo = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m < 24 ? m + ' mo' : Math.floor(m / 12) + 'y ' + (m % 12) + 'm');
  const mm = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m + ' mo'); /* credit-line timing: plain months */
  /* ONE clock for every purchase and funding time: months from today. mond(): the month number itself; ym(): a length of time (a loan's remaining life). A gap between two assets is never shown. */
  const mon = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : 'month ' + m);
  const monY = (m) => mond(m);
  const ym = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m < 12 ? m + ' mo' : Math.floor(m / 12) + ' yr' + (m % 12 ? ' ' + (m % 12) + ' mo' : ''));
  const mmy = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m < 24 ? m + ' mo' : m + ' mo (' + Math.floor(m / 12) + 'y ' + (m % 12) + 'm)');
  const r = (n, d = 0) => (isFinite(n) ? String(+n.toFixed(d)) : '—');
  /* ---------- ONE clock: month 0 is today; month N is today + N months (the day of the month is kept, or the last day of a shorter month). window.REP_TODAY = 'YYYY-MM-DD' (or ?today=YYYY-MM-DD) fixes today, so tests are stable. ---------- */
  const TODAY0 = (() => { let q = window.REP_TODAY; if (!q) { try { q = new URLSearchParams(location.search).get('today'); } catch (e) {} } const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(); })();
  const dateAt = (m) => { const t = new Date(TODAY0.getFullYear(), TODAY0.getMonth() + Math.round(+m || 0), 1), last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); t.setDate(Math.min(TODAY0.getDate(), last)); return t; };
  /* one unambiguous format everywhere: 'Nov 12, 2026' (long) and 'Nov 2026' (month only); never 11/12/26, which reads as 11 December outside the U.S. */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dt = (m) => { const t = dateAt(m); return MON[t.getMonth()] + ' ' + t.getDate() + ', ' + t.getFullYear(); };
  const dtm = (m) => { const t = dateAt(m); return MON[t.getMonth()] + ' ' + t.getFullYear(); };
  /* month N is always written 'month N (Mon YYYY)'; month 0 is always 'today' */
  const mond = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'today' : 'month ' + m + ' (' + dtm(m) + ')');
  const at = (m) => (m <= 0 ? 'today' : 'at ' + mond(m)), inm = (m) => (m <= 0 ? 'today' : 'in ' + mond(m));
  window.RepDate = { dt, dtm, mond, today: () => dt(0) };
  /* ---------- simple math in a number box: digits . + - * / x X × ÷ ( ) , $ and a trailing %. A hand-written parser, never eval. Returns { kind:'plain' } for an ordinary number, { kind:'expr', ok, v } for math. ---------- */
  function calcEval(raw) {
    const s0 = String(raw == null ? '' : raw);
    if (/^\s*\$?\s*[-+]?\s*[\d,]*\.?\d*\s*%?\s*$/.test(s0)) return { kind: 'plain' };
    if (s0.length > 80) return { kind: 'expr', ok: false };
    let s = s0.replace(/[\s,$]/g, '').replace(/%$/, '').replace(/[xX×]/g, '*').replace(/÷/g, '/'), i = 0, bad = false;
    if (!/^[\d.+\-*/()]+$/.test(s)) return { kind: 'expr', ok: false };
    const peek = () => s[i];
    function num() { const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i)); if (!m) { bad = true; return 0; } i += m[0].length; return parseFloat(m[0]); }
    function prim() { if (peek() === '(') { i++; const v = add(); if (peek() === ')') i++; else bad = true; return v; } return num(); }
    function un() { if (peek() === '-') { i++; return -un(); } if (peek() === '+') { i++; return un(); } return prim(); }
    function mul() { let v = un(); while (!bad && (peek() === '*' || peek() === '/')) { const o = s[i++], w = un(); if (o === '*') v *= w; else if (w === 0) bad = true; else v /= w; } return v; }
    function add() { let v = mul(); while (!bad && (peek() === '+' || peek() === '-')) { const o = s[i++], w = mul(); v = o === '+' ? v + w : v - w; } return v; }
    const v = add();
    if (bad || i !== s.length || !isFinite(v)) return { kind: 'expr', ok: false };
    return { kind: 'expr', ok: true, v: Math.round(v * 1e6) / 1e6 };
  }
  let calcHint = null, hintTimer = null, editGood = null; /* calcHint = { p, text, bad }: the small '= 1,950' / 'Check the math' / 'Kept $3,600' callout above the field being typed in; it floats over the page (position:absolute), so a field never moves while you type. editGood = the last valid text of the box being edited. */
  const hintHtml = (c) => `<small class="chint${c.bad ? ' bad' : ''}" role="status" aria-live="polite" data-testid="calc-hint">${esc(c.text)}</small>`;
  const placeHint = () => { document.querySelectorAll('#app .chint').forEach((n) => n.remove()); if (!calcHint) return; const el = document.querySelector(`#app input[data-p="${calcHint.p}"]`), iw = el && el.closest('.iw'); if (iw) iw.insertAdjacentHTML('beforeend', hintHtml(calcHint)); };
  const showNote = (p, text) => { clearTimeout(hintTimer); calcHint = { p, text }; placeHint(); hintTimer = setTimeout(() => { calcHint = null; document.querySelectorAll('#app .chint').forEach((n) => n.remove()); }, 2800); };
  window.RepCalc = calcEval;
  const GL = (window.Info && window.Info) || { INFO: {}, LABEL: {}, LOAN: {} }, INFO = GL.INFO;
  const infoBtn = (k) => (INFO[k] ? `<button type="button" class="info" data-info="${k}" aria-label="What does ${(INFO[k].t || '').replace(/"/g, '')} mean?"><span aria-hidden="true">i</span></button>` : '');
  let infoKey = null, infoFrom = null; /* infoFrom = which (i) opened the sheet, so focus can go back to it */
  const sheetHtml = () => { const d = INFO[infoKey]; return d ? `<div class="sheet-bg" data-info-close></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="infot" data-testid="info-sheet"><div class="grab"></div><h3 id="infot">${esc(d.t)}</h3><p>${esc(d.b)}</p>${d.e ? `<p class="eg"><b>Example:</b> ${esc(d.e)}</p>` : ''}<button class="btn" data-info-close data-testid="info-close">Got it</button></div>` : ''; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- reusable bits ---------- */
  const lblOf = (label, info) => { const ib = infoBtn(info), m = /^([\s\S]*\S)\s+(\S+)$/.exec(label); return m ? m[1] + ' <span class="nw">' + m[2] + ib + '</span>' : '<span class="nw">' + label + ib + '</span>'; }; /* the last word and its (i) never split across lines */
  const field = (label, p, val, o = {}) => `<label class="f ${o.calc ? 'calc' : ''}"><span class="lb">${lblOf(label, o.info || GL.LABEL[label])}${o.calc ? ' <i class="auto" title="calculated from your other numbers — tap to override">auto</i>' : ''}${o.date ? `<small class="dh" data-testid="date-hint" data-dh="${p}" data-m="${isFinite(+val) && String(val) !== '' ? Math.round(+val) : ''}">${isFinite(+val) && String(val) !== '' ? (+val <= 0 ? 'today (' + dt(0) + ')' : 'on ' + dt(+val)) : 'no date yet'}</small>` : ''}</span><span class="iw">${o.pre ? `<em>${o.pre}</em>` : ''}<input inputmode="${o.ro ? 'decimal' : 'text'}" ${o.ro ? '' : `data-num="1" data-pre="${esc(o.pre || '')}" data-suf="${esc(o.suf || '')}" enterkeyhint="done" autocapitalize="off" autocorrect="off" spellcheck="false"`} data-p="${p}" data-k="${p}" aria-label="${esc(label)}" ${o.ro ? 'readonly tabindex="-1"' : ''} ${o.ph ? 'placeholder="' + esc(o.ph) + '"' : ''} value="${val}">${o.suf ? `<em>${o.suf}</em>` : ''}</span></label>`;
  const kpi = (id, label, val, sub, cls, sm) => `<div class="kpi ${sm ? 'sm' : ''}"><small>${label}${infoBtn(GL.LABEL[label])}</small><b class="${cls || ''}" data-testid="${id}" data-k="${id}">${val}</b>${sub ? `<span class="sub">${sub}</span>` : ''}</div>`;

  const CDEF = {};
  const colSec = (id, title, sum, inner, defCollapsed) => { CDEF[id] = !!defCollapsed; const open = !(UI.coll[id] === undefined ? !!defCollapsed : UI.coll[id]); return `<div class="sec cs" data-coll="${id}" role="button" tabindex="0" aria-expanded="${open}"><span>${title}</span><span class="cx">${open ? 'Hide ▾' : esc(sum) + ' ▸'}</span></div>${open ? inner : ''}`; };
  const confirmBox = (msg, yesAttr, yesLabel) => `<div class="confirm" role="alertdialog"><p>${msg}</p><button class="btn danger" ${yesAttr}>${yesLabel}</button><button class="btn plain" data-ask-cancel>Cancel</button></div>`;

  /* ---------- plan visuals ---------- */
  function timeline(pl) {
    const steps = pl.rows.filter((x) => H(x.id));
    if (!steps.length) return '<p class="note">No planned assets yet. Add one and the trust works out when it can pay for it.</p>';
    const fin = steps.filter((x) => x.ok).map((x) => x.end), max = Math.max(12, ...fin) * 1.06, pc = (m) => (m / max) * 100;
    const ys = max <= 60 ? 1 : max <= 120 ? 2 : 5, tk = [];
    for (let y = 0; y * 12 <= max; y += ys) tk.push(y);
    const grid = tk.map((y) => `<i class="tk" style="left:${pc(y * 12)}%"><span>${y ? y + 'y' : 'Now'}</span></i>`).join('');
    const rows = steps.map((x) => { const h = H(x.id), tr = pl.trust[x.id];
      return `<div class="tr" data-go="h/${h.id}"><div class="tl">${esc(h.addr)}</div><div class="trk">${grid}${x.ok ? `<span class="seg2 pl" style="left:0%;width:${Math.max(1.5, pc(x.end))}%"></span><span class="dot" style="left:${pc(x.end)}%"></span>` : '<span class="nr">not reachable</span>'}</div>
      <div class="tm">${x.ok ? `${tr && tr.pooled ? 'the trust can pay at' : 'paid from your savings + job money at'} <b>${mond(x.end)}</b>${tr && tr.pooled ? ` · pool of ${tr.n} assets` : ''}${tr && tr.held ? ` · held until your date, ${mond(tr.buyIn)}` : ''}` : 'the trust cannot pay for it within 50 years'}</div></div>`; }).join('');
    return `<div class="tlw" data-testid="timeline">${rows}</div><p class="note">Every bar and dot counts months from today: ● = the month the trust (everything above it in the list) can pay for it. Assets are never funded before the ones above them. Tap a row to edit.</p>`;
  }
  function nwChart(pl) {
    const T = Math.max(12, Math.min(pl.T, pl.planM)), s = pl.series.nw.slice(0, T + 1);
    /* the Planned page covers the planned assets only: take the bought assets' equity out of the curve */
    if (S.houses.some((h) => h.status === 'owned')) for (let t = 0; t <= T; t++) s[t] -= pl.assetsAt(t).filter((x) => S.houses.some((q) => q.id === x.id && q.status === 'owned')).reduce((a, x) => a + x.equity, 0);
    const W = 340, Hh = 170, pad = 10, min = Math.min(0, ...s), max = Math.max(1, ...s);
    const x = (t) => pad + (t / T) * (W - 2 * pad), y = (v) => Hh - 24 - ((v - min) / (max - min || 1)) * (Hh - 44);
    const step = Math.max(1, Math.ceil(T / 160)); let d = '';
    for (let t = 0; t <= T; t += step) d += (d ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(s[t]).toFixed(1);
    d += 'L' + x(T).toFixed(1) + ' ' + y(s[T]).toFixed(1);
    const ys = T <= 60 ? 1 : T <= 120 ? 2 : T <= 240 ? 5 : 10; let ticks = '';
    for (let yr = 0; yr * 12 <= T; yr += ys) ticks += `<text x="${x(yr * 12)}" y="${Hh - 8}" text-anchor="${yr === 0 ? 'start' : 'middle'}">${yr ? yr + 'y' : 'Now'}</text>`;
    const buyList = S.houses.filter((h) => isFinite(pl.purchase[h.id]) && pl.purchase[h.id] > 0 && pl.purchase[h.id] <= T);
    const buys = buyList.map((h) => `<circle cx="${x(pl.purchase[h.id])}" cy="${y(s[pl.purchase[h.id]])}" r="4.5" class="buy"><title>${esc(h.addr)} funded ${at(pl.purchase[h.id])}</title></circle>`).join('');
    const ev = buyList.map((h) => pl.purchase[h.id] + ':' + h.addr.replace(/[|:]/g, ' ')).join('|');
    return `<div class="chartwrap"><svg class="nw" data-testid="networth-chart" viewBox="0 0 ${W} ${Hh}" data-w="${W}" data-h="${Hh}" data-pad="${pad}" data-t="${T}" data-min="${min}" data-max="${max}" data-nw="${s.map((v) => Math.round(v)).join(',')}" data-ev="${esc(ev)}" role="img" aria-label="Net worth over time, ${$f(s[0])} now to ${$f(s[T])} in ${mo(T)}. Hover or drag to read values.">
      <line class="ax" x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}"/><path class="ar" d="${d}L${x(T)} ${y(0)}L${x(0)} ${y(0)}Z"/><path class="ln" d="${d}"/>${buys}${ticks}
      <text x="${pad}" y="12">${$f(max)}</text>${min < 0 ? `<text x="${pad}" y="${y(min) - 4}">${$f(min)}</text>` : ''}
      <line class="xh" id="nwx" y1="14" y2="${Hh - 24}" x1="0" x2="0" visibility="hidden"/><circle class="hv" id="nwd" r="5.5" cx="0" cy="0" visibility="hidden"/><rect class="hit" x="0" y="0" width="${W}" height="${Hh}"/></svg>
      <div class="tip" id="nwtip" hidden></div></div><p class="note">Net worth = value − loans − other liens − lines of credit drawn. Hover or drag across the line to read it. ● = the trust can pay for an asset.</p>`;
  }
  function nwHover(e) {
    const svg = e.target.closest && e.target.closest('svg.nw'); if (!svg) return;
    const d = svg.dataset, r0 = svg.getBoundingClientRect(), W = +d.w, Hh = +d.h, pad = +d.pad, T = +d.t, min = +d.min, max = +d.max, sc = r0.width / W;
    const t = Math.max(0, Math.min(T, Math.round(((e.clientX - r0.left) / sc - pad) / (W - 2 * pad) * T)));
    const v = +d.nw.split(',')[t], cx = pad + (t / T) * (W - 2 * pad), cy = Hh - 24 - ((v - min) / (max - min || 1)) * (Hh - 44);
    const ln = svg.querySelector('#nwx'), dot = svg.querySelector('#nwd'), tip = document.getElementById('nwtip');
    ln.setAttribute('x1', cx); ln.setAttribute('x2', cx); dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); ln.setAttribute('visibility', 'visible'); dot.setAttribute('visibility', 'visible');
    const hit = (d.ev || '').split('|').map((q) => q.split(':')).filter((q) => q[0] && +q[0] === t).map((q) => q[1]);
    tip.innerHTML = `<b>${$f(v)}</b><span>${t === 0 ? 'today' : 'in ' + mm(t) + (t >= 24 ? ' (' + mo(t) + ')' : '')}${hit.length ? ' · funded: ' + esc(hit.join(', ')) : ''}</span>`;
    tip.hidden = false;
    const w = tip.offsetWidth, left = Math.min(Math.max(cx * sc - w / 2, 0), r0.width - w);
    tip.style.left = left + 'px'; tip.style.top = Math.max(cy * sc - tip.offsetHeight - 12, 0) + 'px';
  }
  function nwLeave(e) {
    const svg = e.target && e.target.closest && e.target.closest('svg.nw'); if (!svg) return;
    ['#nwx', '#nwd'].forEach((q) => svg.querySelector(q).setAttribute('visibility', 'hidden')); const tip = document.getElementById('nwtip'); if (tip) tip.hidden = true;
  }

  /* Can the plan buy this planned asset? One test, one clock (months from today): the pool of everything above it (what you own plus the planned assets above it) pays when its borrowing room + the cash it holds >= the cash the asset needs. */
  function verdictFor(pl, h) {
    const tr = pl.trust[h.id], a = E.afford(S, h, pl);
    if (!tr.ok) return { cls: 'bad', word: 'Not possible', why: '' };
    if (a.cls === 'bad') return { cls: 'bad', word: 'Not possible', why: a.dti >= 999 ? 'no qualifying income is set' : 'lenders would decline: debt-to-income ' + r(a.dti) + '% vs ' + S.g.dti + '% limit' };
    if (a.cls === 'warn') return { cls: 'warn', word: 'Possible, tight', why: 'debt-to-income ' + r(a.dti) + '% is near the ' + S.g.dti + '% limit' };
    return { cls: 'ok', word: 'Possible', why: '' };
  }
  /* the one-line math under a planned row: what it needs, what the pool has, and the month (full numbers are in the row's panel and on the asset page) */
  function shortFor(pl, h) {
    const tr = pl.trust[h.id], need = tr.need || E.needFor(S, h);
    if (!tr.ok) return `needs ${$f(need)} · the pool never gets there${tr.best ? ' (closest ' + $f(tr.best.avail) + ')' : ''}`;
    if (!tr.pooled) return S.p ? `needs ${$f(need)} · your savings above the cushion + job money reach ${$f(tr.have)} by ${mond(tr.month)}` : `needs ${$f(need)} · paid from your own cash`;
    return `needs ${$f(need)} · pool of ${tr.n} has ${$f(tr.have)} (room ${$f(tr.room)} + cash ${$f(tr.heldCash)}) · by ${mond(tr.ready)}${tr.held ? ', held to ' + mond(tr.buyIn) : ''}`;
  }
  function mathFor(pl, h) {
    const tr = pl.trust[h.id], need = tr.need || E.needFor(S, h);
    if (!tr.ok) return `needs ${$f(need)} cash · the pool of everything above it never gets there${tr.best ? ' (closest: ' + $f(tr.best.avail) + ' ' + inm(tr.best.month) + ')' : ''}`;
    if (!tr.pooled) return S.p ? `needs ${$f(need)} cash · savings above the cushion ${$f(tr.savings)} + job money saved up ${$f(Math.max(0, tr.have - tr.savings))} = ${$f(tr.have)} · ready ${inm(tr.month)} (the ${$f(tr.rsv)} cushion at that month grows with inflation)` : `needs ${$f(need)} cash · nothing above it to borrow against, so it is paid from your own cash`;
    return `needs ${$f(need)} cash · pool of ${tr.n}: borrowing room ${$f(tr.room)} + cash ${$f(tr.heldCash)} = ${$f(tr.have)} · +${$f(tr.cf)}/mo reinvested · funded by the trust ${at(tr.ready)}${tr.held ? ', held until your date (' + mond(tr.buyIn) + ')' : ''}`;
  }

  /* ---------- main page ---------- */
  function main() {
    const pl = E.plan(S), t0 = pl.today, tf = pl.final, th = pl.horizon, g = S.g, yrs = g.planYears, owned = S.houses.filter((h) => h.status === 'owned');
    /* The Planned page totals cover the planned assets only: take the bought (Real) assets out of the plan totals, so each page's finances are its own */
    const ownSn = pl.snap.filter((x) => x.type !== 'cash' && S.houses.some((q) => q.id === x.id && q.status === 'owned')), osum = (k) => ownSn.reduce((a, x) => a + (x[k] || 0), 0);
    const sn = ownSn.length ? (() => { const o = Object.assign({}, th); o.nw = th.nw - osum('equity'); o.monthly = th.monthly - osum('payment'); o.cf = th.cf - osum('cf'); o.cfx = th.cfx - osum('cf'); o.noi = th.noi - osum('income'); o.value = th.value - osum('value'); o.debt = th.debt - osum('debt'); o.count = Math.max(0, (th.count || 0) - ownSn.length); o.extra = Math.max(0, th.extra - osum('extra')); const dsv = o.noi - o.cf; o.ds = dsv; o.dscr = dsv > 0.5 ? o.noi / dsv : 0; o.cltv = o.value > 0 ? (o.debt / o.value) * 100 : 0; return o; })() : th, snapBy = {}; pl.snap.forEach((x) => (snapBy[x.id] = x));
    const tot = S.houses.reduce((s, h) => s + E.view(S, h).X, 0), totNow = Math.max(0, pl.extraNow - pl.assetsAt(0).filter((x) => S.houses.some((q) => q.id === x.id && q.status === 'owned')).reduce((s, x) => s + (x.extra || 0), 0)) /* the bought assets' extra belongs to the Real page */, totLater = pl.extraLater;
    const n = S.houses.length, sched = n - pl.unfunded.length;
    const paySub = (h2, v2) => { const parts = []; if (v2.P > 0) parts.push((h2.io ? 'interest ' : 'P&amp;I ') + $f(v2.P)); if (v2.X > 0.5) parts.push('extra ' + $f(v2.X)); if (v2.escrow > 0) parts.push('costs ' + $f(v2.escrow)); if (v2.mip > 0) parts.push('insurance ' + $f(v2.mip)); return parts.length > 1 ? parts.join(' + ') : ''; };
    /* the expanded panel under a selected row: the extra payment and what it does, plus move / duplicate / details / remove */
    const panelOf = (h, soldBy, vis, ci) => {
      const v = pl.V[h.id], X = v.X, P = 'h.' + h.id + '.';
      let eff = '';
      if (!soldBy) {
        const p0 = X > 0.5 ? planWith(h, 0) : pl, pay0 = lifeOf(p0, h), payX = lifeOf(pl, h), hasLoan = v.L > 0;
        const term = !hasLoan ? 'No loan on this asset' : !isFinite(payX) ? (h.io ? 'Interest-only: not paid off' : 'Not paid off in this plan') : 'Paid off in ' + ym(payX) + (h.status === 'owned' ? '' : ' after it is bought');
        const termSub = !hasLoan ? '' : X > 0.5 ? (!isFinite(pay0) ? (isFinite(payX) ? 'it never pays off without the extra' : '') : pay0 - payX > 0 ? ym(pay0 - payX) + ' sooner than with no extra' : 'same as with no extra') : 'extra payments pay it off sooner';
        let nxt, nxtSub = '', nxtAttr = '';
        const nx = nextPlanned(h);
        if (!nx) { nxt = 'Nothing left to buy'; nxtSub = 'No planned asset below this one in the list, so no purchase is waiting on its cash flow.'; }
        else {
          const open = pl.purchase[nx.id], m0 = p0.purchase[nx.id], soon = isFinite(open) && isFinite(m0) ? m0 - open : 0, tr = pl.trust[nx.id];
          nxt = !isFinite(open) ? 'not reachable' : open <= 0 ? 'now' : monY(open);
          nxtSub = (X > 0.5 ? (soon > 0 ? ym(soon) + ' sooner than with no extra' : 'no faster than with no extra') : 'extra payments make it sooner') + ' · ' + (tr && tr.pooled ? 'the trust reinvests ' + $f(tr.cf) + '/mo of cash flow toward it' : 'bought with cash on hand');
          nxtAttr = ` data-open="${isFinite(open) ? open : ''}" data-sooner="${soon}"`;
        }
        eff = `<div class="eff" data-testid="extra-effects">
          <div class="el"><span class="elk">Loan</span><b data-testid="eff-term" data-k="eff-term-${h.id}" data-months="${isFinite(payX) ? payX : ''}" data-base="${isFinite(pay0) ? pay0 : ''}">${term}</b><small>${termSub}</small></div>
          <div class="el"><span class="elk">Payment now</span><b data-testid="eff-payment" data-k="eff-pay-${h.id}">${$f(v.payment)}</b><small>${paySub(h, v) || 'no loan payment'}</small></div>
          <div class="el"><span class="elk">Next the trust funds${nx ? ' · ' + esc(nx.addr) : ''}${infoBtn('nextdp')}</span><b data-testid="eff-next" data-k="eff-next-${h.id}"${nxtAttr}>${nxt}</b><small>${nxtSub}</small></div></div>`;
      }
      const mv = !soldBy && h.status !== 'owned' && vis.length > 1; /* only planned assets have an order that matters; owned ones sit oldest first */
      return `<div class="panel" data-testid="asset-panel" data-for="${h.id}">
        ${soldBy ? '<p class="note" style="margin:0 0 6px">Sold in this plan, so there is no extra payment to set.</p>' : `<label class="f ex"><span class="lb">Extra payment / month${infoBtn('extra')}</span><span class="iw"><em>$</em><input inputmode="text" data-num="1" data-pre="$" data-suf="" enterkeyhint="done" autocapitalize="off" autocorrect="off" spellcheck="false" data-testid="extra-input" data-p="${P}extra" data-k="x-${h.id}" aria-label="Extra monthly payment for ${esc(h.addr)}" value="${grp(X)}"></span></label>`}
        ${eff}
        <div class="pact">${mv ? `<button class="pbtn" data-move="${h.id}:-1" data-testid="move-up" ${ci === 0 ? 'disabled' : ''}>↑ Move up</button><button class="pbtn" data-move="${h.id}:1" data-testid="move-down" ${ci === vis.length - 1 ? 'disabled' : ''}>↓ Move down</button>` : ''}<button class="pbtn" data-dup="${h.id}" data-testid="row-duplicate">Duplicate</button><button class="pbtn" data-go="h/${h.id}" data-testid="open-details">Open details ›</button></div>
        ${ask === 'del:' + h.id ? confirmBox('Remove ' + esc(h.addr) + '? The trust re-works the funding of every asset after it.', 'data-del-yes="' + h.id + '"', 'Yes, remove') : `<button class="rm" data-del="${h.id}" data-testid="row-remove" aria-label="Remove ${esc(h.addr)}">Remove</button>`}</div>`;
    };
    const isSold = (h) => !!(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM);
    const bno = buyOrder(pl);
    const verdictOf = (h) => verdictFor(pl, h), mathOf = (h) => mathFor(pl, h), shortMath = (h) => shortFor(pl, h);
    /* Planned rows show only whether the plan works and the math. Bought rows show the loan: what is still due, the credit line it opens, and when it is paid off. Neither says how long ago anything was bought, and no row compares itself with the asset before it. */
    const factsOf = (h, soldBy) => {
      if (soldBy) return null;
      const v = pl.V[h.id];
      if (h.status === 'owned') { const due = v.B0, end = pl.loanEnd[h.id];
        return `<span class="fx" data-testid="loan-due" data-v="${Math.round(due)}">Loan due <b>${$f(due)}</b></span> · <span class="fx" data-testid="line-avail" data-v="${Math.round(v.head0)}">Credit line <b>${$f(v.head0)}</b></span> · <span class="fx" data-testid="payoff-in">${due <= 0.5 ? 'No loan to pay off' : 'Paid off in <b>' + ym(end) + '</b>'}</span>`; }
      const vd = verdictOf(h);
      return `<span class="vchip sm ${vd.cls}" data-testid="plan-verdict">${vd.word}</span> <span data-testid="plan-math">${shortMath(h)}</span>${vd.why ? ' · <span class="' + vd.cls + 'txt">' + esc(vd.why) + '</span>' : ''}`;
    };
    const endYr = Math.round(pl.planM / 12); /* the row shows cash flow at the end of the plan, and the asset's own cash flow on today's terms */
    const rowOf = (h, vis, ci) => {
      const v = pl.V[h.id], type = h.type || 'house', sel = selId === h.id;
      const exitTxt = h.exit === 'sell' && isFinite(pl.sellAt[h.id]) ? `sells in ${mm(pl.sellAt[h.id])}` : h.exit === 'merge' && isFinite(pl.mergeAt[h.id]) ? `merges${H(h.mergeInto) ? ' into ' + esc(H(h.mergeInto).addr) : ''} in ${mm(pl.mergeAt[h.id])}` : '';
      const sp = snapBy[h.id], soldBy = isSold(h), pm = (t) => t.replace(/\.0M$/, 'M');
      const loses = type === 'house' && v.cf < 0 ? '<span class="hi">loses money at today\'s terms</span>' : '';
      const hi = v.X > 2000 && v.X > 3 * v.P ? '<span class="hi">unusually high extra</span>' : '';
      return `<div class="rw" data-rw="${h.id}"><div class="row${soldBy ? ' sold' : ''}${sel ? ' sel' : ''}" data-row="${h.id}" data-testid="ledger-row"${soldBy || h.status === 'owned' ? ' data-nodrag' : ''}><div class="r1"><span class="nm"><button type="button" class="addrbtn" aria-expanded="${sel}" data-testid="row-toggle"><span class="addr" data-go="h/${h.id}" data-testid="row-edit" title="Edit ${esc(h.addr)}"><b class="bn" data-testid="buy-no" aria-label="Buy number ${bno[h.id]}">${bno[h.id]}</b>${esc(h.addr)} <i class="ed" aria-hidden="true">edit ›</i></span><span class="pay" data-testid="row-payment" data-k="pay-${h.id}" data-equity="${sp ? Math.round(sp.equity) : ''}"${soldBy ? '' : ' title="Payment = loan payment + extra + taxes and insurance + interest on the trust\'s line of credit. With no loan of its own it is shown as a carry cost."'}>${soldBy ? '' : sp ? 'price ' + pm($c(h.price)) + ' · ' + (sp.payment > 0.5 ? (v.L > 0.5 ? $f(sp.payment) + '/mo' : 'carry cost ' + $f(sp.payment) + '/mo') : v.payment > 0.5 ? 'paid off by then' : 'no loan') + ' · equity ' + $k(sp.equity) : 'not in the totals yet'} ${hi}${loses}</span>${(() => { const parts = []; if (soldBy) parts.push('sold for ' + $c(pl.exits[h.id].price) + ' ' + inm(pl.sellAt[h.id])); else if (exitTxt) parts.push(exitTxt); return parts.length ? `<span class="exitline">${parts.join(' · ')}</span>` : ''; })()}</button></span>
        <span class="cfl ${soldBy ? (pl.exits[h.id].profit < 0 ? 'bad' : 'ok') : (sp ? sp.cf : 0) < 0 ? 'bad' : 'ok'}" data-testid="row-cashflow" title="${soldBy ? 'Cash profit from the sale, after selling costs, the loan, tax and the cash you put in.' : 'Cash flow = income minus expenses and loan payments, before extra payments. Big number: at year ' + endYr + ' (rent has grown ' + r(v.growth, 1) + '% a year' + (v.L > 0.5 ? ', the loan may be paid off' : '') + (h.liftIncome > 0 ? ', the renovation lifts rent' : '') + '). Small: today, on the asset\'s own terms.'}"><b data-k="cf-${h.id}" ${soldBy ? 'data-profit="' + Math.round(pl.exits[h.id].profit) + '"' : ''}>${soldBy ? $cs(pl.exits[h.id].profit) : !sp ? '—' : $s(sp.cf) + '/mo'}</b><small>${soldBy ? 'cash profit' : !sp ? 'not counted' : `year ${endYr} · now ${$s(pl.V[h.id].cf)}`}</small></span></div>
        ${h.capex ? `<div class="rtag"><span class="renotag" data-testid="reno-tag" title="Improvement budget paid at purchase; the new appraisal and rent lift start once it is finished">Renovation ${$k(h.capex)}, done ${h.capexMonths} mo after ${h.status === 'owned' ? 'start' : 'purchase'}</span></div>` : ''}<div class="r2"><div class="fcol">${(() => { const w = factsOf(h, soldBy); return w ? `<span class="locline" data-testid="dp-line">${w}</span>` : ''; })()}</div>${soldBy ? '' : `<button type="button" class="xtog" data-panel="${h.id}" aria-expanded="${sel}" data-testid="row-extra-toggle" aria-label="Extra payment">Extra ${sel ? '▴' : '▾'}</button>`}</div></div>${sel ? panelOf(h, soldBy, vis, ci) : ''}</div>`; };
    const NOUN = { house: ['home', 'homes'], commercial: ['commercial property', 'commercial properties'], business: ['business', 'businesses'] }, ADD = { house: 'home', commercial: 'commercial property', business: 'business' };
    const empty = !S.houses.length;
    const fin = S.p ? E.finance(S, pl) : null;
    /* the strip under a category name: number of assets, cash flow before and after the loans, total worth, DSCR, and how long cash lasts if ~45% of the assets stop earning (the biggest earners, rent gone, costs and loans still due) */
    const cfk = (n) => (n < 0 ? '−' : '+') + $k(Math.abs(n));
    const lastTxt = (m) => (m <= 0 ? '0 mo' : m >= 600 ? '50+ yr' : m >= 24 ? r(m / 12, 1) + ' yr' : Math.round(m) + ' mo'), lastsAll = []; /* the Checks "if big earners stop" row reads the worst category */
    const statStrip = (tp, list, key) => {
      const sn2 = pl.snap.filter((x) => x.type === tp && list.some((h) => h.id === x.id)), n2 = list.length;
      if (!tp) { const pr = list.reduce((a2, h2) => a2 + ((pl.exits[h2.id] || {}).profit || 0), 0); return `<span class="cnt" data-testid="cat-count-${key}">${n2}</span><span class="sc"><b class="${pr < 0 ? 'bad' : ''}" data-testid="cat-profit-${key}">${$cs(pr)}</b><small>cash profit</small></span>`; }
      if (!sn2.length) return `<span class="cnt" data-testid="cat-count-${key}">${n2}</span>`;
      const cash = fin ? Math.max(0, fin.series.total[Math.min(fin.T, pl.planM)] || 0) : S.p ? +S.p.cash || 0 : 0; /* your cash plus the cash the trust holds, at plan end */
      const st = E.stress(S, pl, sn2, cash), income = st.income, cf = st.cf, worth = st.worth, dscr = st.dscr, useAll = st.useAll, stress = st.burn;
      const last = stress >= -0.5 ? 'no bills' : lastTxt(cash <= 0 ? 0 : st.months);
      if (!/^owned-/.test(key)) lastsAll.push({ name: NOUN[tp][1], months: stress >= -0.5 ? Infinity : st.months });
      const lastLv = stress >= -0.5 ? '' : st.months < SAFE.lastsOver ? 'bad' : st.months < SAFE.lastsCaution ? 'warn' : '';
      const lastLab = useAll ? 'lasts, all fail' : 'lasts';
      const cell = (lab, val, tid, cls) => `<span class="sc"><b class="${cls || ''}" data-testid="${tid}-${key}">${val}</b><small>${lab}</small></span>`;
      return `<span class="cnt" data-testid="cat-count-${key}">${n2}</span>${cell('before loan', cfk(income), 'cat-before', '')}${cell('after loan', cfk(cf), 'cat-after', cf < 0 ? 'bad' : '')}${cell('worth', $k(worth), 'cat-worth', '')}${cell('DSCR', dscr === null ? '—' : r(dscr, 2), 'cat-dscr', dscr !== null && dscr < 1 ? 'bad' : '')}${cell(lastLab, last, 'cat-lasts', lastLv)}`;
    };
    const secOf = (id, title, list, tp, pre) => {
      CDEF[id] = id === 'cat-house' || id === 'cat-owned-house' || empty ? false : true; const open = !(UI.coll[id] === undefined ? CDEF[id] : UI.coll[id]), tid = (pre || '') + (tp || 'sold'), lt = E.latestOf(list);
      const nn = tp ? NOUN[tp] : ['sold', 'sold'], sub = list.length ? statStrip(tp, list, tid) : 'None yet';
      return `<section class="card cat${open ? ' open' : ''}${tp ? '' : ' soldcat'}" data-testid="cat-${tid}"><div class="cathw"><div class="cath" data-coll="${id}" role="button" tabindex="0" aria-expanded="${open}" data-testid="cat-header-${tid}"><span class="catt"><b>${title}</b></span><span class="chev" aria-hidden="true">›</span></div><div class="cats" data-testid="cat-sub-${tid}" aria-label="Latest added, for information only">${sub}</div></div>
        ${open ? `<div class="catbody" data-catbody="${tid}">${list.length ? list.map((h, i) => rowOf(h, list, i)).join('') : `<p class="none" data-testid="cat-empty-${tid}">None yet</p>`}${tp && !pre ? `<button class="addrow" data-add="${tp}" data-testid="add-${tp}">+ Add ${ADD[tp]}</button>` : ''}${list.length && tp ? '<p class="note" data-testid="cat-stat-note">Top numbers are per month at plan end. Lasts = how long your cash and the cash the trust holds (as projected at plan end) cover the shortfall if about 45% of these assets (the biggest earners) stop paying rent while loans, taxes and insurance keep coming. If the rest still cover everything, it assumes every asset fails (“lasts, all fail”). Amber under 3 months, red under 1.</p>' : ''}${!tp && list.length ? '<p class="note" data-testid="sold-note">Numbers follow purchase order. Sold assets keep theirs, so a number can be missing from the other lists. Cash profit is after selling costs, the loan, tax and the cash you put in.</p>' : ''}${list.length > 1 && tp && !pre ? '<p class="note hold">Hold and drag ⋮⋮ to reorder. An asset is never bought before the ones above it, and they fund it.</p>' : ''}</div>` : ''}</section>`; };
    const CATS = [['house', 'Homes'], ['commercial', 'Commercial'], ['business', 'Businesses']];
    const soldAll = S.houses.filter(isSold), soldOwned = soldAll.filter((h) => h.status === 'owned'), soldPlanned = soldAll.filter((h) => h.status !== 'owned');
    const typeList = (tp, own) => S.houses.filter((h) => (h.type || 'house') === tp && (h.status === 'owned') === own && !isSold(h));
    const ownedAll = S.houses.filter((h) => h.status === 'owned' && !isSold(h)), plannedAll = S.houses.filter((h) => h.status !== 'owned');
    const ownedSecs = CATS.filter(([tp]) => typeList(tp, true).length).map(([tp, title]) => secOf('cat-owned-' + tp, title, typeList(tp, true), tp, 'owned-')).join('');
    const plannedSecs = CATS.map(([tp, title]) => secOf('cat-' + tp, title, typeList(tp, false), tp, '')).join('');
    const soldSecP = soldPlanned.length ? secOf('cat-sold', 'Sold', soldPlanned, null) : '', soldSecO = soldOwned.length ? secOf('cat-owned-sold', 'Sold', soldOwned, null, 'owned-') : '';
    const sections = plannedSecs + soldSecP;
    const dueTot = ownedAll.reduce((a2, h) => a2 + pl.V[h.id].B0, 0), lineTot = ownedAll.reduce((a2, h) => a2 + pl.V[h.id].head0, 0);
    const lastPayoff = Math.max(0, ...ownedAll.filter((h) => pl.V[h.id].B0 > 0.5).map((h) => pl.loanEnd[h.id]));
    const head = `<h1>Portfolio <span class="hb"><button class="txtbtn" data-go="finances" data-testid="finances-link">Finances</button><button class="ic" data-go="settings" aria-label="Settings" data-testid="settings-link">⚙</button></span></h1>
    ${undo ? `<div class="warnbox okbox" data-testid="undo-banner">${undo.text ? esc(undo.text) : 'Removed ' + esc(undo.label) + '.'} <button class="chip link" data-undo>Undo</button></div>` : ''}
    ${storageOK ? '' : '<div class="warnbox">⚠ Storage is unavailable, so changes will not be saved. Export a backup from Assumptions.</div>'}
    <div class="seg pagetabs" role="tablist" aria-label="Portfolio pages" data-testid="page-tabs">${[['planned', 'Planned'], ['real', 'Real'], ['saved', 'Saved']].map(([k, l]) => `<button type="button" role="tab" id="tab-${k}" data-page="${k}" class="${page === k ? 'on' : ''}" aria-selected="${page === k}" data-testid="tab-${k}">${l}</button>`).join('')}</div>`;
    const tail = `<button class="linkbtn" data-go="import/new" data-testid="import-link">Import from a listing</button>`;
    if (page === 'saved') return head + savedPage(pl);
    /* ---------- Real: only what you have bought. Its totals are the sums of the rows shown (plan-end numbers, like every row) ---------- */
    if (page === 'real') {
      if (!ownedAll.length && !soldOwned.length) return head + `<section class="card realempty" data-testid="real-empty"><b data-testid="bought-empty">Nothing bought yet</b><p class="note">This page shows what you have really bought: the loan still due, the line of credit it opens and when each loan is paid off. Add something you already own to see it here. Your plan on the Planned page does not need anything bought.</p><button class="btn" data-add-owned data-testid="add-owned" aria-label="Add something you already own">+ Add owned</button></section>`;
      const rSn = pl.snap.filter((x) => ownedAll.some((h) => h.id === x.id)), rs = rSn.reduce((a, x) => ({ nw: a.nw + x.equity, pay: a.pay + x.payment, cf: a.cf + x.cf }), { nw: 0, pay: 0, cf: 0 });
      const rst = rSn.length ? E.stress(S, pl, rSn, 0) : null, xOwn = pl.assetsAt(0).filter((x) => S.houses.some((h) => h.id === x.id && h.status === 'owned')).reduce((a, x) => a + (x.extra || 0), 0); /* the engine's extra now for the bought assets, so Planned + Real = the whole plan */
      const badOwn = ownedAll.filter((h) => (h.type || 'house') === 'house' && pl.V[h.id].cf < 0);
      const payTxt = !ownedAll.some((h) => pl.V[h.id].B0 > 0.5) ? 'no loans to pay off' : isFinite(lastPayoff) ? 'every loan paid off in <b>' + ym(lastPayoff) + '</b>' : 'not every loan is paid off within the plan';
      return head + `<section class="card" data-testid="summary"><div class="kg">
        ${kpi('kpi-networth', 'Net worth', $f(rs.nw), `${ownedAll.length} bought · at year ${endYr}`)}
        ${kpi('kpi-monthly', 'Total monthly payments', $f(rs.pay), 'sum of the rows below')}
        ${kpi('kpi-cashflow', 'Cash flow / mo', $s(rs.cf), 'before tax · at plan end', rs.cf < 0 ? 'bad' : '', 1)}
        ${kpi('kpi-dscr', 'DSCR', rst && rst.dscr !== null && isFinite(rst.dscr) ? r(rst.dscr, 2) : '—', rst && rst.dscr !== null && isFinite(rst.dscr) ? '1.25+ is healthy' : 'no loan left', rst && rst.dscr !== null && rst.dscr < 1 ? 'bad' : '', 1)}</div>
        <p class="plan-line" data-testid="real-loans">Loans due today <b data-testid="real-due">${$f(dueTot)}</b> · credit line <b data-testid="real-line">${$f(lineTot)}</b>${infoBtn('creditline')} · ${payTxt}.</p></section>
      <section class="card" id="ledger" style="margin-top:10px" data-testid="ledger"><div class="row totrow" data-testid="ledger-total"><div class="r1"><span class="nm"><span class="addr">Bought total</span><div class="pay">${$f(rs.pay)}/mo payments<br><span data-testid="total-extra" data-k="tot">${$f(xOwn)}/mo extra now</span></div></span><span class="cfl ${rs.cf < 0 ? 'bad' : 'ok'}"><b data-testid="total-cf">${$s(rs.cf)}/mo</b><small>cash flow</small></span></div></div></section>
      ${badOwn.length ? `<div class="warnbox" data-testid="home-warning">⚠ Homes must cash flow positive. Losing money each month at today's terms: ${badOwn.map((h) => esc(h.addr)).join(', ')}.</div>` : ''}
      <div class="sech" data-testid="sec-bought"><b>Bought</b><span class="sechs" data-testid="bought-sum">${ownedAll.length} asset${ownedAll.length === 1 ? '' : 's'} · loans due <b>${$f(dueTot)}</b> · credit line <b>${$f(lineTot)}</b></span></div>${ownedSecs}${ownedAll.length ? '<button class="addrow" data-add-owned data-testid="add-owned">+ Add something you already own</button>' : ''}${soldSecO}`;
    }
    /* ---------- Planned (the default page): the plan and its math ---------- */
    if (empty) return head + `<p class="note" style="margin:0 4px 8px" data-testid="empty-note">Nothing added yet. Add a home, a commercial property or a business to see your plan.</p>${sections}<button class="linkbtn" data-go="import/new" data-testid="import-link">Import a home from a listing</button>`;
    const c3 = (label, a, b, c, f, cls) => `<tr><td>${label}</td><td data-k="c-${label}-a">${f(a)}</td><td data-k="c-${label}-b">${f(b)}</td><td class="${cls || ''}" data-k="c-${label}-c"><b>${f(c)}</b></td></tr>`;
    const restSn = pl.snap.filter((x) => !ownSn.includes(x)), bt = (tp) => restSn.filter((x) => x.type === tp).reduce((a, x) => ({ n: a.n + 1, value: a.value + x.value, equity: a.equity + x.equity, cf: a.cf + x.cf }), { n: 0, value: 0, equity: 0, cf: 0 });
    const bRow = (label, o, cls) => `<tr class="${cls || ''}"><td>${label}</td><td>${$c(o.value)}</td><td>${$c(o.equity)}</td><td class="${o.cf < 0 ? 'bad' : ''}">${$cs(o.cf)}</td></tr>`;
    const breakdown = `<table class="cmp" data-testid="breakdown"><thead><tr><th></th><th>Value</th><th>Equity${infoBtn('equity')}</th><th>Cash flow/mo</th></tr></thead><tbody>
      ${['house', 'commercial', 'business'].map((tp) => { const o = bt(tp); return o.n ? bRow(TPL[tp] + ' (' + o.n + ')', o) : ''; }).join('')}
      ${sn.cash > 0.5 ? bRow('Trust cash', { value: sn.cash, equity: sn.cash, cf: 0 }) : ''}
      ${bRow('Portfolio', { value: restSn.reduce((a, x) => a + x.value, 0), equity: sn.nw, cf: sn.cf }, 'tot')}</tbody></table>`;
    /* Checks: one plain row per number; a row is highlighted only when its number passes a safe amount (see SAFE). One root cause is one row: debt-to-income covers the lenders too. */
    const kp = fin ? fin.kpis : null, hasCap = !!(S.p && S.p.capital.some((c) => c.amount > 0));
    const dtiOver = pl.worst.dti > g.dti, affS = fin ? (dtiOver && fin.status === 'tight' ? 'no' : fin.status) : null; /* lenders who would decline mean "not yet" everywhere: chip, Checks and rows agree */
    const chkRows = [];
    if (pl.outsideTotal > 0) { const cash0 = S.p ? +S.p.cash || 0 : 0, lvl = kp && kp.shortAmount > 0.5 ? 'bad' : kp && (pl.outsideTotal > SAFE.savingsCaution * cash0 || kp.reserveGap > 0.5) ? 'warn' : 'ok';
      chkRows.push({ id: 'outside-cash', lvl, label: hasCap ? 'Cash beyond the trust' : 'Paid from your own pocket', val: $f(pl.outsideTotal), info: 'outsidecash', sub: hasCap ? 'Needs this much cash beyond what the trust funds (partners, investors, savings).' : 'Your own cash for the down payments the trust cannot fund (the first purchase and anything beyond it)' + (S.p ? (pl.outsideTotal <= cash0 ? '. Your ' + $f(cash0) + ' of savings covers it.' : '. That is more than your ' + $f(cash0) + ' of savings.') : '.') }); }
    chkRows.push({ id: 'check-dti', lvl: dtiOver ? 'bad' : pl.worst.dti > SAFE.dtiCaution * g.dti ? 'warn' : 'ok', label: 'Debt-to-income peak', val: r(pl.worst.dti) + '%', info: 'dti', sub: dtiOver ? `Peaks at ${r(pl.worst.dti)}% of qualifying income ${inm(pl.worst.month)}, over the ${g.dti}% limit: a lender may decline a loan then.` : `Highest debt payments are ${r(pl.worst.dti)}% of qualifying income, ${inm(pl.worst.month)}; lenders should approve every loan (limit ${g.dti}%).` });
    if (kp) { const rsvLow = fin.series.reserve[Math.min(fin.T, kp.minLiquidMonth)] || kp.reserveTarget0; chkRows.push({ id: 'check-cushion', lvl: kp.minLiquid < 0 ? 'bad' : kp.reserveGap > 0.5 ? 'warn' : 'ok', label: 'Cash cushion', val: 'lowest ' + $f(kp.minLiquid), info: 'cushion', sub: `Lowest cash is ${$f(kp.minLiquid)} ${kp.minLiquidMonth <= 0 ? 'today (' + dt(0) + ')' : inm(kp.minLiquidMonth)}; your cushion at that point is ${$f(rsvLow)} (the cushion grows with inflation).` }); }
    if (lastsAll.length) { const w = lastsAll.slice().sort((a, b) => a.months - b.months)[0], lv = w.months < SAFE.lastsOver ? 'bad' : w.months < SAFE.lastsCaution ? 'warn' : 'ok'; chkRows.push({ id: 'check-lasts', lvl: lv, label: 'If big earners stop', val: isFinite(w.months) ? lastTxt(w.months) : 'covered', info: 'lasts', sub: isFinite(w.months) ? `If about 45% of your biggest ${w.name} stopped paying, your cash would cover the shortfall for ${lastTxt(w.months)}.` : 'Even if your biggest earners stopped paying, nothing would run short.' }); }
    if (pl.unfunded.length || pl.lastBuy > SAFE.paceCaution * pl.planM) chkRows.push({ id: 'check-pace', lvl: pl.unfunded.length ? 'bad' : 'warn', label: 'Plan timing', val: pl.unfunded.length ? pl.unfunded.length + ' never funded' : mond(pl.lastBuy), info: 'planpace', sub: pl.unfunded.length ? pl.unfunded.length + ' planned asset' + (pl.unfunded.length > 1 ? 's are' : ' is') + ' never funded under the current numbers.' : `The last purchase is ${pl.lastBuy > pl.planM ? 'after the plan ends' : 'late in the plan'} (${Math.round(pl.planM / 12)} years, ${pl.planM} months).` });
    const chkWorst = Math.max(0, ...chkRows.map((x) => LV[x.lvl])), chkAll = chkWorst === 0, chkCollapsed = UI.coll.checks === undefined ? chkAll : UI.coll.checks, chkOpen = !chkCollapsed;
    CDEF.checks = chkAll; /* all safe: the rows stay folded behind Details; something to look at: they start open. The Details button is there in both states and never moves. */
    const nFlag = chkRows.filter((x) => x.lvl !== 'ok').length;
    const chkList = chkRows.map((x) => `<div class="chk lv-${x.lvl}" data-testid="${x.id}" data-lvl="${x.lvl}"><div class="ct"><b>${x.label}</b>${infoBtn(x.info)}<span class="cv lv-${x.lvl}">${x.val}</span></div><small>${x.sub}</small></div>`).join('');
    const checks = `<div class="checks ${chkAll ? 'safe' : chkWorst === 2 ? 'over' : 'caution'}" data-testid="checks"><div class="chkh"><b>Checks${infoBtn('checks')}</b><button type="button" class="chip link chkbtn" data-coll="checks" aria-expanded="${chkOpen}" data-testid="checks-details">Details ${chkOpen ? '▾' : '▸'}</button></div>${chkAll ? '<p class="chkok" data-testid="checks-ok">✓ All checks are in the safe range</p>' : `<p class="chkflag ${chkWorst === 2 ? 'bad' : 'warn'}" data-testid="checks-flag">${nFlag} to look at</p>`}${chkOpen ? `<div class="chklist" data-testid="checks-list">${chkList}</div>${fin ? '<button type="button" class="linkbtn leftbtn" data-go="finances" data-testid="checks-finances">Open Finances ›</button>' : ''}` : ''}</div>`;
    const badHomes = S.houses.filter((h) => (h.type || 'house') === 'house' && pl.V[h.id].cf < 0);
    const homeWarn = badHomes.length ? `<div class="warnbox" data-testid="home-warning">⚠ Homes must cash flow positive. Losing money each month at today's terms: ${badHomes.map((h) => esc(h.addr)).join(', ')}.</div>` : '';
    const tab = UI.tab, nb = S.houses.filter((h) => h.status === 'planned' && isFinite(pl.purchase[h.id])).sort((a, b) => pl.purchase[a.id] - pl.purchase[b.id])[0];
    const nPl = S.houses.filter((h) => h.status !== 'owned').length, lastReady = Math.max(0, ...S.houses.filter((h) => h.status !== 'owned').map((h) => pl.purchase[h.id]).filter(isFinite));
    const headline = nPl ? (pl.unfunded.length ? `${n - nPl ? n - nPl + ' bought. ' : 'Nothing bought yet. '}${nPl - pl.unfunded.length} of ${nPl} planned are possible; ${pl.unfunded.length} cannot. ` : `${n - nPl ? n - nPl + ' bought. ' : 'Nothing bought yet. '}All ${nPl} planned are possible; the last is funded at <b>${mond(lastReady)}</b>. `) : `All ${n} assets are bought. `;
    const drv = pl.assetsAt(pl.planM).filter((x) => !ownSn.some((o) => o.id === x.id)).sort((a, b) => b.equity - a.equity), drvOpen = !UI.coll.drivers;
    const drivers = `<button class="linkbtn leftbtn" data-coll="drivers" aria-expanded="${drvOpen}">What drives net worth ${drvOpen ? '▾' : '▸'}</button>${drvOpen ? `<div data-testid="drivers">${drv.slice(0, 6).map((d) => `<div class="drv"><span>${esc(d.addr)}</span><span><b>${$f(d.equity)}</b> <small>${sn.nw > 0 ? r((d.equity / sn.nw) * 100) : 0}%</small></span></div>`).join('')}<p class="note">Equity = value − loans − credit lines drawn. A sample like this leans on a few fast-growing businesses; check the growth rate on each.</p></div>` : ''}`;
    const bar = `<div class="bar"><i class="${sn.cltv > g.cap ? 'over' : ''}" style="width:${Math.min(100, (sn.cltv / g.cap) * 100)}%"></i></div><div class="cap"><span data-k="cltv">Debt ${r(sn.cltv)}% of value</span><span>cap ${g.cap}%</span></div>`;
    const plSn = pl.snap.filter((x) => x.type !== 'cash'), isOwnSn = (x) => S.houses.some((h) => h.id === x.id && h.status === 'owned'), bCf = plSn.filter(isOwnSn).reduce((a, x) => a + x.cf, 0), bN = plSn.filter(isOwnSn).length;
    return head + `
    <section class="card" data-testid="summary"><p class="plantarget" data-testid="plan-target"><b>Year ${endYr} outlook</b> · ${dtm(pl.planM)}</p><div class="kg">
      ${kpi('kpi-networth', 'Net worth', $f(sn.nw), `${nPl} assets · by year ${yrs}`)}
      ${kpi('kpi-monthly', 'Total monthly payments', $f(sn.monthly), sn.extra > 0.5 ? `incl. ${$f(sn.extra)} extra` : 'sum of the rows below')}
      ${kpi('kpi-cashflow', 'Cash flow / mo', $s(sn.cf), sn.extra > 0.5 ? `${$s(sn.cfx)} after extra` : 'before tax · at plan end', sn.cf < 0 ? 'bad' : '', 1)}
      ${kpi('kpi-dscr', 'DSCR', sn.ds > 0.5 ? r(sn.dscr, 2) : '—', sn.ds <= 0.5 ? 'no loan left' : sn.dscr >= 1.25 ? '1.25+ is healthy' : sn.dscr >= 1 ? 'thin (1.25+ is healthy)' : 'below 1.0', sn.ds > 0.5 && sn.dscr < 1 ? 'bad' : '', 1)}</div>
      ${(() => { const pp = S.p || {}, inf = +pp.inflation || 0, real = sn.nw / Math.pow(1 + inf / 100, yrs), open = !!UI.coll.tgt; return `<div class="tgt" data-testid="target-years"><button type="button" class="linkbtn leftbtn tgtb" data-coll="tgt" aria-expanded="${open}" data-testid="target-toggle">By year ${yrs}: ${$f(real)} in today's dollars ${open ? '▾' : '▸'}</button>${open ? `<div class="tgtf">${field('Years to reach this net worth', 'g.planYears', g.planYears, { info: 'projection' })}${S.p ? field('Inflation / year', 'p.inflation', r(pp.inflation, 2), { suf: '%', info: 'inflation' }) : ''}</div><p class="note" data-testid="real-nw">${$f(sn.nw)} in ${yrs} years at ${r(inf, 1)}% inflation buys what ${$f(real)} buys today. Change the years to move the target date.</p>` : ''}</div>`; })()}
            <p class="plan-line" data-testid="plan-headline">${headline}</p>
      ${fin ? `<div class="vrow big ${affS}" data-go="finances" data-testid="afford-line" role="link"><span class="vq"><b>Can I afford this?</b><span class="note">${esc(affS !== fin.status ? 'Lenders may decline a loan around ' + mond(pl.worst.month) + '.' : fin.headline.replace(/^(Yes|Tight|Not yet)\.\s*/, ''))}</span></span><span class="vgo"><span class="vchip ${affS}" data-testid="afford-chip" data-lvl="${affS === 'yes' ? 'ok' : affS === 'tight' ? 'warn' : 'bad'}">${VL[affS]}</span> ›</span></div>` : ''}</section>
    <section class="card" id="ledger" style="margin-top:10px" data-testid="ledger"><div class="row totrow" data-testid="ledger-total"><div class="r1"><span class="nm"><span class="addr">Portfolio total</span><div class="pay">${$f(sn.monthly)}/mo payments<br><span data-testid="total-extra" data-k="tot">${$f(totNow)}/mo extra now${totLater > 0.5 ? ' · +' + $f(totLater) + ' later' : ''}</span></div></span><span class="cfl ${sn.cf < 0 ? 'bad' : 'ok'}"><b data-testid="total-cf">${$s(sn.cf)}/mo</b><small>cash flow</small></span></div></div></section>
    ${plannedSecs}${soldSecP}
    ${tail}
    <section class="card" data-testid="plan-card"><b>Portfolio breakdown</b> <span class="note">${nPl} assets · last purchase ${mond(pl.lastBuy)}${infoBtn('planpace')}</span>
      ${bar}${breakdown}
      ${checks}${homeWarn}${sn.cash > 0.5 ? `<p class="note" data-testid="cash-note">Trust cash = cash the trust holds: what is kept after selling costs and the loan payoff, and pooled cash flow not yet spent${infoBtn('cashfromselling')}. It counts in net worth.</p>` : ''}${drivers}
      <div class="seg" role="tablist"><button data-tab="timeline" class="${tab === 'timeline' && UI.open ? 'on' : ''}" data-testid="timeline-toggle">Timeline</button><button data-tab="nw" class="${tab === 'nw' && UI.open ? 'on' : ''}" data-testid="networth-toggle">Net worth</button><button data-tab="hide" class="${!UI.open ? 'on' : ''}">Hide</button></div>
      ${UI.open ? (tab === 'nw' ? nwChart(pl) : timeline(pl)) : ''}</section>`;
  }

  /* ---------- Saved page: portfolios kept on this device ---------- */
  const savedMemo = new Map();
  const statsOf = (rec) => { const k = rec.id + ':' + rec.ts; let m = savedMemo.get(k);
    if (!m) { try { const st = E.normalize(JSON.parse(JSON.stringify(rec.state))); if (!st.p) st.p = E.samplePersonal(); st.p = E.normalizePersonal(st.p); const p = E.plan(st); m = { n: st.houses.length, nw: p.horizon.nw, cf: p.horizon.cf, yrs: Math.round(p.planM / 12) }; savedMemo.set(k, m); } catch (e) { m = null; } }
    return m; };
  function savedPage(pl) {
    const th = pl.horizon, yrs = Math.round(pl.planM / 12), nm = (id) => { const x = SAVED.find((q) => q.id === id); return x ? x.name : ''; };
    const form = ask === 'save' ? `<div class="confirm" data-testid="save-form" role="group" aria-label="Save current portfolio"><label class="f"><span class="lb">Name</span><span class="iw"><input type="text" data-saved-name data-testid="save-name" maxlength="60" aria-label="Name for this saved portfolio" value="${esc(saveName)}"></span></label><button class="btn" data-save-yes data-testid="save-confirm">Save</button><button class="btn plain" data-ask-cancel>Cancel</button></div>` : `<button class="btn" data-save-open data-testid="save-current">Save current portfolio</button>`;
    const cards = SAVED.map((rec) => { const m = statsOf(rec), id = rec.id, d = new Date(rec.ts);
      return `<section class="card scard" data-testid="saved-card" data-sid="${id}">
        ${ask === 'ren:' + id ? `<label class="f"><span class="lb">Name</span><span class="iw"><input type="text" data-renamed-name data-testid="rename-input" maxlength="60" aria-label="New name" value="${esc(renameName)}"></span></label><button class="btn" data-ren-yes="${id}" data-testid="rename-confirm">Save name</button><button class="btn plain" data-ask-cancel>Cancel</button>` : `<b class="sname" data-testid="saved-name">${esc(rec.name)}</b>`}
        <div class="smeta" data-testid="saved-date">Saved ${isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        ${m ? `<div class="sstat"><span data-testid="saved-assets"><b>${m.n}</b> asset${m.n === 1 ? '' : 's'}</span><span data-testid="saved-nw">Net worth <b>${$f(m.nw)}</b></span><span data-testid="saved-cf">Cash flow <b>${$s(m.cf)}/mo</b></span></div><div class="smeta" data-testid="saved-scope">whole portfolio (planned and bought) · numbers at year ${m.yrs}</div>` : '<p class="note">This saved portfolio could not be read.</p>'}
        ${ask === 'load:' + id ? confirmBox('Replace your working portfolio with “' + esc(rec.name) + '”? Tap Undo afterwards to get your current one back.', 'data-load-yes="' + id + '" data-testid="load-confirm"', 'Yes, open it') : ask === 'sdel:' + id ? confirmBox('Delete “' + esc(rec.name) + '”? This cannot be undone.', 'data-sdel-yes="' + id + '" data-testid="delete-confirm"', 'Yes, delete') : `<div class="sact"><button class="btn" data-load="${id}" data-testid="saved-open">Open</button><button class="pbtn" data-rename="${id}" data-testid="saved-rename">Rename</button><button class="pbtn" data-sdup="${id}" data-testid="saved-duplicate">Duplicate</button><button class="pbtn" data-sdel="${id}" data-testid="saved-delete">Delete</button></div>`}</section>`; }).join('');
    return `<div class="sec">Saved portfolios${infoBtn('saved')}</div><section class="card" data-testid="save-card"><p class="note" style="margin:4px 0 8px" data-testid="save-now">Working portfolio now (whole portfolio, planned and bought): ${S.houses.length} asset${S.houses.length === 1 ? '' : 's'} · net worth ${$f(th.nw)} · cash flow ${$s(th.cf)}/mo in year ${yrs}. The Planned and Real pages each show their own part of this.</p>${savedMsg ? `<div class="warnbox okbox" data-testid="saved-msg">${esc(savedMsg)}</div>` : ''}${form}</section>
      ${SAVED.length ? cards : '<p class="note" style="margin:8px 4px" data-testid="saved-empty">Nothing saved yet. Tap Save current portfolio to keep a copy of your assets and numbers here, then open it again any time.</p>'}
      ${SAVED.length ? '<p class="note" style="margin:0 4px">Saved portfolios stay on this device and are included in the backup under Assumptions. Opening one replaces your working portfolio; Undo brings it back.</p>' : ''}`;
  }

  /* ---------- house page ---------- */
  function house(h) {
    const pl = E.plan(S), v = pl.V[h.id], g = S.g, a = E.afford(S, h, pl), t = null, P = `h.${h.id}.`, type = h.type || 'house';
    const wo = E.plan(E.without(S, h.id)), p0 = pl.purchase[h.id];
    const nx = nextPlanned(h), nxOpen = nx ? pl.purchase[nx.id] : Infinity, nxSooner = nx && isFinite(nxOpen) ? nxOpen - monthWith(h, v.X + 100, nx.id) : 0, tr = pl.trust[h.id], debt = v.debtNow;
    const LB = { house: { rent: 'Monthly rent', sec: 'Rent & expenses', growth: 'Appreciation / yr', price: 'Price' }, commercial: { rent: 'Monthly rent (all tenants)', sec: 'Rent & operating costs', growth: 'Value growth / yr', price: 'Purchase price' }, business: { rent: 'Monthly owner profit', sec: 'Profit', growth: 'Business growth / yr', price: 'Purchase price' } }[type];
    const invested = v.invested, coc = invested > 0 ? ((v.cf * 12) / invested) * 100 : NaN, dscrH = v.P > 0 ? v.noi / v.P : NaN;
    const lo = E.LOANS.find((l) => l.id === h.loanId);
    const loanSel = `<div class="f stack"><span class="lb">Loan option${infoBtn('loanoption')}</span><select class="loansel" data-loan="${h.id}" aria-label="Loan option">${E.loansFor(type).map((l) => `<option value="${l.id}" ${h.loanId === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}<option value="custom" ${lo ? '' : 'selected'}>Custom terms</option></select></div>`;
    const ex = pl.exits[h.id];
    const exitSec = colSec('exit', 'Value-add & exit', h.exit === 'sell' && isFinite(pl.sellAt[h.id]) ? 'sell in ' + mm(pl.sellAt[h.id]) : h.exit === 'merge' && isFinite(pl.mergeAt[h.id]) ? 'merge in ' + mm(pl.mergeAt[h.id]) : h.capex ? 'improve ' + $c(h.capex) : 'none planned', `<section class="card" data-testid="exit-section">
      ${field('Improvement budget', P + 'capex', grp(h.capex), { pre: '$' })}${h.finCapex ? '<p class="note" data-testid="rehab-financed">Financed in your loan, so nothing extra is due at closing.</p>' : ''}${field('Months to finish', P + 'capexMonths', h.capexMonths)}${field('New appraised value', P + 'arv', grp(h.arv), { pre: '$' })}${field('Value gained (vs price + rehab)', P + 'gain', h.arv > 0 ? grp(v.valueGain) : '', { pre: '$', calc: 1 })}<p class="note">Type the new appraisal, or type how much value you expect to gain and the appraisal fills in. No appraisal means the value does not change.</p>${h.arv > 0 && h.arv < h.price + (h.capex || 0) ? '<p class="note" data-testid="arv-low">⚠ That appraisal is below price + rehab, so the work loses money.</p>' : ''}${field('Income lift', P + 'liftIncome', r(h.liftIncome, 1), { suf: '%' })}
      
      ${h.exit === 'sell' ? `${field('Sell in (months)', P + 'exitMonth', h.exitMonth, { date: 1 })}${field('Selling costs', P + 'sellCost', r(h.sellCost, 1), { suf: '%' })}${ex ? field('Net proceeds before tax', P + 'proceeds', grp(ex.proceeds), { pre: '$', calc: 1, ro: 1, info: 'proceeds' }) : ''}${ex ? (() => { const sx = E.saleTax(S, pl, h); return `<p class="note" data-testid="sale-tax">Net proceeds before tax ${$f(ex.proceeds)}; estimated tax ${$f(sx.tax)} (${r(sx.rate, 1)}% of the ${$f(Math.max(0, sx.gain))} gain; ${$f(sx.dep)} of depreciation taken is taxed back${sx.short ? ', and held under a year so all of it is ordinary income' : ''}); cash profit after tax ${$s(ex.profit)}. The tax is paid from your cash after the proceeds above. Rates are in Finances under Taxes.</p>`; })() : ''}<p class="note">Proceeds go to cash and count in net worth. Later purchases use that cash before outside money.</p>` : ''}
      ${h.exit === 'merge' ? `${field('Merge in (months)', P + 'exitMonth', h.exitMonth, { date: 1 })}<div class="f"><span class="lb">Merge into</span><select class="loansel" data-merge="${h.id}" aria-label="Merge into"><option value="">Choose…</option>${S.houses.filter((x) => x.id !== h.id).map((x) => `<option value="${x.id}" ${h.mergeInto === x.id ? 'selected' : ''}>${esc(x.addr)}</option>`).join('')}</select></div>${field('Synergy lift', P + 'exitLift', r(h.exitLift, 1), { suf: '%' })}<p class="note">When merged, value and income rise by the synergy lift. It stays in your totals.</p>` : ''}
      <p class="note">Improvements are paid from sale cash first, then outside money.</p></section>`, !(h.capex > 0 || h.arv > 0 || h.exit !== 'hold'));
    const homeLoses = type === 'house' && v.cf < 0 ? `<div class="warnbox" data-testid="home-loses">⚠ A home must cash flow positive. This one loses ${$f(-v.cf)} a month. Raise the rent, lower the price, or pick a loan with a smaller payment.</div>` : '';
    const L = [['Net worth', wo.horizon.nw, pl.horizon.nw, $f], ['Cash flow / mo', wo.horizon.cf, pl.horizon.cf, $s], ['Payments / mo', wo.horizon.monthly, pl.horizon.monthly, $f], ['Outside cash', wo.outsideTotal, pl.outsideTotal, $f]];
    const impactLines = L.filter((x) => Math.abs(x[1] - x[2]) > 0.5).map((x) => `<div class="f"><span class="lb">${x[0]}</span><span>${x[3](x[1])} → <b>${x[3](x[2])}</b></span></div>`);
    const timing = h.status === 'planned'
      ? `${field('Not before (months)', P + 'buyIn', h.buyIn, { date: 1 })}<p class="note" data-testid="buyin-note">${isFinite(p0) ? (tr && tr.pooled ? 'The trust can pay for this ' + at(tr.ready) : 'Nothing comes before it, so it is paid from your savings above your cushion plus your job money, ready ' + at(p0)) + (tr && tr.held ? ', but you asked for no sooner than ' + mond(tr.buyIn) + ', so it waits for that month' : '') + '. Leave 0 to buy as soon as the money is there.' : 'The trust cannot pay for it within 50 years.'}</p>`
      : field('Months already paid', P + 'paid', h.paid);
    const age0 = h.status === 'owned' ? Math.max(0, h.paid || 0) : 0, depM = (E.depCum(S, h, age0 + 13) - E.depCum(S, h, age0 + 1)) / 12, pp = S.p || E.samplePersonal();
    const depNote = type === 'business' ? `Tax write-off about ${$f(depM)}/mo: ${r(pp.bizIntPct, 0)}% of the price is goodwill amortized over 15 years, the rest equipment over 7 years. Edit the split in Finances under Taxes.` : `Tax depreciation about ${$f(depM)}/mo: ${type === 'house' ? '27.5' : '39'}-year straight line on ${r(100 - pp.landPct, 0)}% of price, closing costs and improvements (land is not depreciated). Edit the land share in Finances under Taxes.`;
    const income = type === 'business'
      ? `${field(LB.rent, P + 'rent', grp(h.rent), { pre: '$' })}<p class="note">What the business pays you each month before this loan. Price ÷ yearly profit is ${r(v.multiple, 1)}×. Tip: you can type math here, like 4000*3.${infoBtn('calc')}</p>`
      : `${field(LB.rent, P + 'rent', grp(h.rent), { pre: '$' })}${field('Property tax / mo', P + 'tax', grp(h.tax), { pre: '$' })}${field('Insurance / mo', P + 'ins', grp(h.ins), { pre: '$' })}${field(type === 'commercial' ? 'CAM & operating / mo' : 'HOA / mo', P + 'hoa', grp(h.hoa), { pre: '$' })}${type === 'commercial' ? field('Tenants pay costs (NNN)', P + 'nnn', r(h.nnn, 0), { suf: '%' }) + `<p class="note" data-testid="nnn-note">Tenants repay ${r(h.nnn, 0)}% of tax, insurance and CAM (${$f(v.reimb)}/mo) on top of rent. Homes use 0%.</p>` : ''}
      <button class="chip link" data-go="settings">Vacancy ${g.vac}%</button><button class="chip link" data-go="settings">Mgmt ${g.mgmt}%</button><button class="chip link" data-go="settings">Repairs ${g.maint}%/yr</button>
      <p class="note">Net operating income ${$f(v.noi)}/mo: rent${v.reimb > 0 ? ' plus tenant repayments' : ''} minus operating costs, before the loan.${infoBtn('noi')}</p>
      <p class="note" data-testid="dep-note">${depNote}</p>`;
    const loanLines = `<div class="loanlines" data-testid="loan-lines"><div class="f"><span class="lb">${type === 'business' ? 'Owner profit' : 'Income after operating costs'}</span><b data-testid="rent-noi" data-k="rent-noi">${$s(v.noi)}</b></div>
      <div class="f"><span class="lb">Loan payment${v.mip > 0 ? ' (P&amp;I + mortgage insurance)' : h.io ? ' (interest only)' : ' (P&amp;I)'}</span><b data-testid="rent-loan" data-k="rent-loan">${v.P + v.mip > 0.5 ? '−' + $f(v.P + v.mip) : 'no loan'}</b></div>
      ${v.X > 0.5 ? `<div class="f"><span class="lb">Extra payment</span><b data-testid="rent-extra" data-k="rent-extra">−${$f(v.X)}</b></div>` : ''}
      <div class="f totl"><span class="lb">Cash flow after the loan</span><b data-testid="rent-cf" data-k="rent-cf" class="${v.cf < 0 ? 'bad' : ''}">${$s(v.cf)}</b></div>
      ${v.X > 0.5 ? `<div class="f"><span class="lb">After the extra payment too</span><b data-testid="rent-cf-x" data-k="rent-cf-x">${$s(v.cf - v.X)}</b></div>` : ''}
      <p class="note">Rent and costs alone are not what you keep: the loan payment comes out of them. These match Payment now and Cash flow now at the top of this page.</p></div>`;
    /* money that goes into this loan on its own: the asset's own profit, and your job money left after living costs. One clock: months from today. */
    const life = lifeOf(pl, h), held0 = h.status === 'owned' ? 0 : p0, nowAt = isFinite(held0) ? held0 : null;
    const splitLines = (() => {
      if (nowAt === null || v.L <= 0 || !(pl.balAt(h.id, nowAt) > 0.005)) return v.L <= 0 ? '<p class="note" data-testid="h-auto">No loan, so no profit or job money goes to a loan here.</p>' : '';
      if (g.autoPay === false) return '<p class="note" data-testid="h-auto">Automatic extra payments are switched off in Assumptions.</p>';
      const a1 = pl.autoAt(h.id, nowAt), af = pl.autoFrom(h.id), j1 = pl.jobAt(h.id, nowAt), jf = pl.jobFrom(h.id);
      const autoTxt = a1 > 0.5 ? '<b>' + $f(a1) + '/mo</b> now' : af >= 0 ? 'starts ' + at(af) + ', about <b>' + $f(pl.autoAt(h.id, af)) + '/mo</b>, once the trust\'s line of credit is paid and nothing is left to buy' : 'none in this plan: its cash flow goes to the trust first (line of credit, then the next purchase)';
      const jobTxt = j1 > 0.5 ? '<b>+' + $f(j1) + '/mo</b> now (your pay left after living costs, split equally across the loans)' : jf >= 0 ? 'starts ' + at(jf) + ', about <b>+' + $f(pl.jobAt(h.id, jf)) + '/mo</b>, once nothing is left to buy' : S.p && S.p.jobs.length ? 'nothing yet: your job money goes to the trust for the next purchase first' : 'no job income is set';
      return `<p class="note" data-testid="h-auto" data-v="${Math.round(a1)}">Automatic extra from its own profit: ${autoTxt}.</p><p class="note" data-testid="h-job" data-v="${Math.round(j1)}">From your job: ${jobTxt}.</p>`;
    })();
    const statusCard = h.status === 'owned'
      ? `<section class="card" data-testid="payoff-card"><div class="f"><span class="lb">Loan still due</span><b data-testid="h-loan-due" data-k="h-loan-due">${$f(v.B0)}</b></div>
        <div class="f"><span class="lb">Line of credit you can take against it</span><b data-testid="h-line" data-k="h-line">${$f(v.head0)}</b></div>
        <div class="f"><span class="lb">Paid off in</span><b data-testid="h-payoff" data-k="h-payoff" data-months="${isFinite(life) ? life : ''}">${v.B0 <= 0.5 ? 'no loan' : isFinite(life) ? ym(life) : 'not within the plan'}</b></div>
        <p class="note">Line of credit = ${v.cap}% of its value today (${$f(v.valueNow)})${S.g.haircut ? ' less the ' + S.g.haircut + '% appraisal cut' : ''}, minus the loan and other liens.${v.B0 > 0.5 ? ' The payoff time counts your extra payment and the automatic extra payments below.' : ''}</p>${splitLines}</section>`
      : (() => { const vd = verdictFor(pl, h); return `<section class="card" data-testid="plan-card-asset"><div class="f"><span class="lb">Can the plan buy it?</span><span class="vchip ${vd.cls}" data-testid="plan-verdict">${vd.word}</span></div><p class="note" data-testid="plan-math">${mathFor(pl, h)}${vd.why ? ' · ' + esc(vd.why) : ''}</p>${splitLines}</section>`; })();
    const exS = pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM ? pl.exits[h.id] : null;
    const saleCard = exS ? (() => { const R0 = Math.round, sP = R0(exS.price), sC = R0(exS.price - exS.net), sL = R0(exS.net - exS.proceeds), sT = R0(exS.tax), sF = R0(exS.profit), sN = sP - sC - sL, sI = sN - sT - sF; /* every line is rounded to whole dollars and the cash put in is the remainder, so the card adds up exactly to the cash profit shown everywhere else */
      return `<div class="sec" data-testid="sale-heading">Sale</div><section class="card" data-testid="sale-profit" data-profit="${sF}"><div class="f"><span class="lb">Sold for<small class="dh">${mond(pl.sellAt[h.id])}</small></span><b>${$f(sP)}</b></div>
      <div class="f"><span class="lb">Selling costs (${r(h.sellCost, 1)}%)</span><b>−${$f(sC)}</b></div><div class="f"><span class="lb">Loan and liens paid off</span><b>−${$f(sL)}</b></div><div class="f"><span class="lb">Net proceeds before tax</span><b>${$f(sN)}</b></div><div class="f"><span class="lb">Tax on the sale</span><b>−${$f(sT)}</b></div><div class="f"><span class="lb">Cash you put in${infoBtn('cashin')}</span><b>−${$f(sI)}</b></div>
      <div class="f totl"><span class="lb">Cash profit after tax${infoBtn('cashprofit')}</span><b class="sold-profit${exS.profit < 0 ? ' neg' : ''}" data-testid="sale-cash-profit">${$s(sF)}</b></div><p class="note">Cash profit = net proceeds before tax (price − selling costs − the loan and liens paid off), minus the tax on the sale, minus the cash you put in (down payment, closing costs and improvements paid in cash).</p></section>`; })() : '';
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2><input class="t" data-p="${P}addr" type="text" value="${esc(h.addr)}" aria-label="Name or address" title="${esc(h.addr)}"></h2><span class="tag" style="margin:0" data-testid="asset-buy-no">#${buyOrder(pl)[h.id]} · ${TL[type]}</span></div>
    ${homeLoses}
    ${h.fresh && type === 'house' ? `<section class="card"><b>Have a Zillow listing?</b><p class="note">Fill in price, rent, taxes and insurance from a file.</p><button class="btn plain" data-go="import/${h.id}" data-testid="import-listing">Import from listing file</button></section>` : ''}
    <section class="card"><div class="kg">${kpi('h-payment', exS ? 'Payment while held' : 'Payment now', $f(v.payment), (() => { const parts = []; if (v.P > 0) parts.push((h.io ? 'interest ' : 'P&amp;I ') + $f(v.P)); if (v.X > 0.5) parts.push('extra ' + $f(v.X)); if (v.escrow > 0) parts.push('costs ' + $f(v.escrow)); if (v.mip > 0) parts.push('insurance ' + $f(v.mip)); return parts.length > 1 ? parts.join(' + ') : ''; })())}${kpi('h-cf', exS ? 'Cash flow while held' : 'Cash flow now', $s(v.cf), v.X > 0.5 ? `${$s(v.cf - v.X)} after extra` : '', v.cf < 0 ? 'bad' : '')}
      ${kpi('h-dscr', exS ? 'DSCR while held' : 'DSCR now', r(dscrH, 2), isFinite(dscrH) ? (dscrH >= 1.2 ? 'income covers the loan' : dscrH >= 1 ? 'thin cushion' : 'below 1.0') : 'no loan payment', isFinite(dscrH) && dscrH < 1 ? 'bad' : '', 1)}${kpi('h-coc', exS ? 'Cash-on-cash while held' : 'Cash-on-cash now', isFinite(coc) ? r(coc, 1) + '%' : '—', 'yearly cash flow ÷ cash invested', coc < 0 ? 'bad' : '', 1)}</div>
      ${h.capex > 0 ? `<p class="note" data-testid="reno-note">Renovation ${$f(h.capex)}${h.finCapex ? ' (financed in the loan)' : ', paid in cash'}, done ${h.capexMonths} month${h.capexMonths === 1 ? '' : 's'} after it is bought${h.arv > 0 ? ': new appraisal ' + $f(h.arv) : ''}${h.liftIncome ? ', rent +' + r(h.liftIncome, 1) + '%' : ''}.</p>` : ''}
      <p class="note share" data-testid="asset-share">${(() => { const sp = pl.snap.find((x) => x.id === h.id), ex = pl.exits[h.id], yr = Math.round(pl.planM / 12); if (ex && pl.sellAt[h.id] <= pl.planM) return 'In your portfolio total: sold in ' + mond(pl.sellAt[h.id]) + ' for ' + $c(ex.price) + '. Cash profit ' + $cs(ex.profit) + ' after tax (' + $c(ex.proceeds) + ' net proceeds before tax, minus ' + $c(ex.tax) + ' tax, minus the ' + $c(ex.cashIn) + ' you put in).'; if (!sp) return 'In your portfolio total: not bought in this plan yet.';
        const why = [], life2 = lifeOf(pl, h); if (v.growth > 0) why.push('rent grows ' + r(v.growth, 1) + '% a year'); if (v.L > 0.5 && isFinite(life2) && (h.status === 'owned' ? 0 : p0) + life2 <= pl.planM) why.push('the loan is paid off ' + (h.status === 'owned' ? 'in ' + ym(life2) : ym(life2) + ' after it is bought')); if (h.capex > 0 && h.liftIncome > 0) why.push('the renovation lifts rent ' + r(h.liftIncome, 1) + '%');
        return 'Price ' + $c(h.price).replace(/\.0M$/, 'M') + '. Portfolio row (at year ' + yr + '): ' + (sp.payment > 0.5 ? $f(sp.payment) + '/mo' : 'no loan') + ' · ' + $s(sp.cf) + '/mo cash flow · ' + $c(sp.equity) + ' equity.' + (sp.payment > 0.5 && v.L <= 0.5 ? ' With no loan of its own, the payment is a carry cost: taxes, insurance and line-of-credit interest.' : '') + (Math.abs(sp.cf - v.cf) > Math.max(50, 0.2 * Math.abs(v.cf)) && why.length ? ' Cash flow at year ' + yr + ' (' + $s(sp.cf) + '/mo) is not the same as now (' + $s(v.cf) + '/mo): ' + why.join(', ') + '.' : ''); })()}</p>
      <div class="f" style="border-top:0;min-height:36px"><span class="lb">Plan for this asset${infoBtn('exit')}</span></div><div class="seg" style="margin-top:0" role="tablist"><button data-exit="hold" class="${h.exit === 'hold' ? 'on' : ''}">Hold</button><button data-exit="sell" class="${h.exit === 'sell' ? 'on' : ''}" data-testid="exit-sell">Sell</button><button data-exit="merge" class="${h.exit === 'merge' ? 'on' : ''}">Merge</button></div>
      ${exS ? `<div class="f" style="border-top:0;min-height:30px" data-testid="sold-status"><span class="lb">Status</span><b>Sold in ${mond(pl.sellAt[h.id])}</b></div><div class="f" style="border-top:0;min-height:30px"><span class="lb">Before the sale it was</span></div>` : `<div class="f" style="border-top:0;min-height:30px"><span class="lb">Status</span></div>`}<div class="seg" style="margin-top:0"><button class="${h.status === 'owned' ? 'on' : ''}" data-status="owned">Owned</button><button class="${h.status === 'planned' ? 'on' : ''}" data-status="planned">Planned</button></div>${timing}</section>
    ${h.listingUrl ? `<p class="note" style="margin:10px 4px 0">Imported from a listing${h.info && h.info.beds ? ' · ' + h.info.beds + ' bd / ' + h.info.baths + ' ba · ' + (h.info.sqft || '?') + ' sqft' : ''}.</p>` : ''}
    ${statusCard}
    ${saleCard}
    <div class="sec"><span>Purchase · <i class="auto">auto</i> = calculated${infoBtn('auto')}</span></div><section class="card">${field(LB.price, P + 'price', grp(h.price), { pre: '$' })}${field('Down payment', P + 'dp', r(h.dp, 2), { suf: '%' })}${field('Down payment $', P + 'down', grp(v.down), { pre: '$', calc: 1 })}${field('Loan amount', P + 'loan', grp(v.L), { pre: '$', calc: 1, ro: 1 })}${field(LB.growth, P + 'growth', r(v.growth, 2), { suf: '%' })}
      ${type === 'commercial' ? field('Cap rate', P + 'caprate', r(v.capRate, 1), { suf: '%', calc: 1, ro: 1 }) : ''}${type === 'business' ? field('Price ÷ yearly profit', P + 'mult', r(v.multiple, 1), { suf: '×', calc: 1, ro: 1 }) : ''}</section>
    ${colSec('loan', 'Loan option', (lo ? lo.name.replace(/\s*\(.*\)/, '') : 'Custom') + ' · ' + r(h.rate, 2) + '% · ' + r(h.term / 12, 0) + ' yr' + (lo ? '' : ' · tap to pick a loan'), `<section class="card">${loanSel}${lo || h.io ? `<p class="note">${lo ? esc(lo.note) + ' ' : ''}${h.io ? 'Interest-only: extra payments reduce the balance. At maturity the balance is refinanced (see below).' : ''}</p>` : '<p class="note">Custom terms. Pick a loan option to auto-fill them.</p>'}${h.ownerOcc ? '<span class="chip warnchip" data-testid="owner-occ">You must live here (owner-occupied)</span>' + infoBtn('ownerocc') : ''}${h.loanId === 'k203' && h.capex > 75000 ? '<p class="note" data-testid="k203-cap">⚠ Over the $75,000 Limited 203(k) cap. This rehab needs a Standard 203(k) with a HUD consultant.</p>' : ''}
      ${field('Interest rate', P + 'rate', r(h.rate, 3), { suf: '%' })}${field('Term (years)', P + 'termY', r(h.term / 12, 2))}${field('Closing costs', P + 'closingPct', r(h.closingPct == null ? g.closing : h.closingPct, 2), { suf: '%' })}${field('Extra / month', P + 'extra', grp(v.X), { pre: '$' })}${field('Paid off in (months)', P + 'payoff', isFinite(v.payoff) ? v.payoff : '', { calc: 1 })}${field('Other liens', P + 'liens', grp(h.liens), { pre: '$' })}
      ${field('Loan comes due in (months)', P + 'mat', E.matOf(h) || '', { ph: 'never', info: 'refi' })}${E.matOf(h) > 0 ? field('Refinance rate', P + 'refiRate', h.refiRate == null ? '' : r(h.refiRate, 2), { suf: '%', ph: 'auto ' + r(g.refiRate, 2), info: 'refi' }) + field('Refinance term (years)', P + 'refiTermY', h.refiTerm == null ? '' : r(h.refiTerm / 12, 1), { ph: 'auto ' + r(g.refiTerm / 12, 1), info: 'refi' }) : ''}
      ${v.refi ? `<p class="note" data-testid="refi-note">Comes due in ${v.refi.month} months with ${$f(v.refi.balance)} left. That balance is refinanced at ${r(v.refi.rate, 2)}% over ${r(v.refi.termMonths / 12, 1)} years, so the payment becomes ${$f(v.refi.payment)}/mo (DSCR then ${r(v.noi / Math.max(1, v.refi.payment + v.mip), 2)}). Cash flow now is shown before this change.</p>` : ''}
      <p class="note">${isFinite(v.payoff) ? `Paid off in ${mo(v.payoff)} with your scheduled payment and extra` : h.io ? 'Not paid off until you refinance or sell' : 'Payment does not cover interest'}${v.L > 0 && isFinite(life) && Math.abs(life - v.payoff) > 0.5 ? `; ${ym(life)} with the automatic extra from its own profit and your job` : ''}. ${v.mip > 0 ? 'Includes ' + $f(v.mip) + '/mo mortgage insurance' + infoBtn('mip') + '. ' : ''}${h.io ? 'Interest-only' + infoBtn('interestonly') + '. ' : ''}Debt now: ${$f(debt)} (${r((debt / (v.valueNow || h.price)) * 100)}% of today's value).${tr && tr.pooled && tr.draw > 0.5 && h.status !== 'owned' ? ' Its down payment includes ' + $f(tr.draw) + ' drawn on the trust\'s line of credit; that counts in the portfolio debt, not in this loan.' : ''}</p></section>`, true)}
    ${colSec('rent', LB.sec, (type === 'business' ? 'profit ' + $f(h.rent) : 'rent ' + $f(h.rent)) + ' · loan ' + (v.P + v.mip > 0.5 ? '−' + $f(v.P + v.mip) : 'none'), `<section class="card">${income}${loanLines}</section>`, true)}
    ${colSec('loc', 'Funded by the trust', h.status === 'owned' ? 'in the trust today' : isFinite(p0) ? verdictFor(pl, h).word + ' · ' + (tr && tr.pooled ? 'by ' + mond(tr.ready) : 'savings + job money ' + mond(p0)) : 'not possible', `<section class="card" data-testid="trust-section">${h.status === 'owned'
      ? `<p class="note" data-testid="trust-owned">Owned today, so it is already in the trust. Its borrowing room (${$f(v.head0)} now: ${v.cap}% of its ${$f(v.valueNow)} value less its loan and liens) and its cash flow (${$s(v.cf)}/mo) count toward paying for every planned asset below it in the list. Its cash flow first pays the trust's line of credit, then builds cash for the next purchase; once nothing is left to buy it goes to its own loan.</p>${nx ? `<p class="note" data-testid="trust-next">Next asset the trust funds: ${esc(nx.addr)}, ${isFinite(nxOpen) ? (nxOpen <= 0 ? 'now' : at(nxOpen)) : 'not reachable'}.</p>` : ''}${nxSooner > 0 ? `<span class="chip">+$100/mo extra → ${nxSooner} mo sooner</span>` : ''}`
      : `${field('Cash needed', P + 'need', grp(E.needFor(S, h)), { pre: '$', calc: 1, ro: 1 })}<div class="f"><span class="lb">Trust can pay at${infoBtn('nextdp')}</span><b data-testid="trust-months">${isFinite(p0) ? mond(tr && isFinite(tr.ready) ? tr.ready : p0) : 'never'}</b></div>${tr && tr.held ? `<div class="f"><span class="lb">Held until your date</span><b data-testid="trust-held">${mond(tr.buyIn)}</b></div>` : ''}
      ${tr && tr.pooled ? `<p class="note" data-testid="trust-pool">Paid for by the trust, the pool of the ${tr.n} asset${tr.n === 1 ? '' : 's'} before it (everything you own today and the planned assets above it). At ${mond(tr.ready)} the pool has ${$f(tr.room)} of borrowing room plus ${$f(tr.heldCash)} of cash = ${$f(tr.have)}, which covers the ${$f(tr.need)} it needs. It also reinvests ${$f(tr.cf)}/mo of cash flow (after loan payments${S.p ? ', managers and taxes' : ''}), first toward the line of credit, then held for the next purchase.${S.p ? ' Your job money left after living costs joins it the same way.' : ''}</p>
      <p class="note" data-testid="loc-split">Where the down payment comes from: ${$f(tr.cash)} of cash the trust already holds (reinvested cash flow and sale proceeds) and ${$f(tr.draw)} drawn on the trust's line of credit at ${r(g.hrate, 2)}%. Borrowing room counts as funding: the trust does not need to have saved the whole amount.</p>` : isFinite(p0) ? `<p class="note" data-testid="trust-pool">Nothing is above it in the list, so there is no pool to borrow against. Your cushion keeps ${S.p && tr ? $f(tr.rsv) : "some"} of your savings (it grows with inflation); everything above that, plus the job money saved up since, pays for it.</p>` : `<p class="note" data-testid="trust-pool">⚠ The pool of the assets before it cannot pay for this within 50 years${tr && tr.best ? ' (the closest it gets is ' + $f(tr.best.avail) + ' of the ' + $f(tr.need) + ' needed, ' + at(tr.best.month) + ')' : ''}, so it is not bought in this plan. Move it lower in the list, lower its down payment, or let the earlier assets grow.</p>`}
      <p class="note" data-testid="loc-cap">Borrowing cap used: ${g.cap}% of value for real estate, ${g.capBiz}% for businesses, less the appraisal cut, each loan balance and other liens.</p>
      ${a.cls === 'warn' || a.cls === 'bad' ? `<span class="chip warnchip" title="${esc(a.why || '')}">Debt-to-income ${a.cls === 'bad' ? 'over' : 'near'} your limit when ${esc(h.addr)} closes</span>` : ''}${nxSooner > 0 ? `<span class="chip">+$100/mo extra → ${esc(nx.addr)} ${nxSooner} mo sooner</span>` : ''}`}</section>`, false)}
    ${exitSec}
    ${colSec('impact', 'Impact on your plan', impactLines.length ? impactLines.length + ' changes to this plan' : 'no change', `<section class="card" data-testid="impact">${impactLines.length ? impactLines.join('') : '<p class="note" style="margin:0">Adding or removing this does not change the numbers below.</p>'}<p class="note">Portfolio totals without this asset → with it.</p></section>`, true)}
    ${ask === 'del:' + h.id ? confirmBox('Remove ' + esc(h.addr) + '? The trust re-works the funding of every asset after it.', 'data-del-yes="' + h.id + '"', 'Yes, remove') : `<button class="btn plain" data-dup="${h.id}" data-testid="h-duplicate">Duplicate this ${TL[type].toLowerCase()}</button><button class="btn ghost" data-del="${h.id}" data-testid="h-delete">Remove</button>`}`;
  }

  /* ---------- finances page: your jobs, cash and expenses, and whether the plan is affordable ---------- */
  function finChart(f) {
    const T = f.T, tot = f.series.total.slice(0, T + 1), rsv = f.series.reserve.slice(0, T + 1);
    const W = 340, Hh = 170, pad = 10, min = Math.min(0, ...tot, ...rsv), max = Math.max(1, ...tot, ...rsv);
    const x = (t) => pad + (t / T) * (W - 2 * pad), y = (v) => Hh - 24 - ((v - min) / (max - min || 1)) * (Hh - 44);
    const path = (arr) => { let d = ''; const st = Math.max(1, Math.ceil(T / 160)); for (let t = 0; t <= T; t += st) d += (d ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(arr[t]).toFixed(1); return d + 'L' + x(T).toFixed(1) + ' ' + y(arr[T]).toFixed(1); };
    const ys = T <= 60 ? 1 : T <= 120 ? 2 : 5; let ticks = ''; for (let yr = 0; yr * 12 <= T; yr += ys) ticks += `<text x="${x(yr * 12)}" y="${Hh - 8}" text-anchor="${yr === 0 ? 'start' : 'middle'}">${yr ? yr + 'y' : 'Now'}</text>`;
    const mm0 = f.kpis.minLiquidMonth <= T ? `<circle class="lowpt" cx="${x(f.kpis.minLiquidMonth)}" cy="${y(tot[f.kpis.minLiquidMonth])}" r="5"><title>Lowest cash: month ${f.kpis.minLiquidMonth}</title></circle>` : '';
    return `<div class="chartwrap"><svg class="nw" data-testid="cash-chart" viewBox="0 0 ${W} ${Hh}" data-w="${W}" data-h="${Hh}" data-pad="${pad}" data-t="${T}" data-min="${min}" data-max="${max}" data-nw="${tot.map((v) => Math.round(v)).join(',')}" data-ev="" role="img" aria-label="Your cash over time. Lowest point ${$f(f.kpis.minLiquid)} in month ${f.kpis.minLiquidMonth}. Hover or drag to read values.">
      <line class="ax" x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}"/><path class="rs" d="${path(rsv)}"/><path class="ln" d="${path(tot)}"/>${mm0}${ticks}
      <text x="${pad}" y="12">${$f(max)}</text>${min < 0 ? `<text x="${pad}" y="${y(min) - 4}">${$f(min)}</text>` : ''}
      <line class="xh" id="nwx" y1="14" y2="${Hh - 24}" x1="0" x2="0" visibility="hidden"/><circle class="hv" id="nwd" r="5.5" cx="0" cy="0" visibility="hidden"/><rect class="hit" x="0" y="0" width="${W}" height="${Hh}"/></svg>
      <div class="tip" id="nwtip" hidden></div></div><p class="note">Solid line = your cash (savings plus cash from sales). Dashed line = the emergency reserve you want to keep. Hover or drag to read it.</p>`;
  }
  function finances() {
    if (!S.p) S.p = E.samplePersonal();
    const pl = E.plan(S), f = E.finance(S, pl), p = S.p, g = S.g, k = f.kpis, R = f.series, vS = pl.worst.dti > g.dti && f.status === 'tight' ? 'no' : f.status; /* lenders who would decline = red, the same as the Checks on the Planned page */
    const icon = { ok: '✓', warn: '△', bad: '✗' };
    const listRow = (kind, it, label) => `<div class="lr" data-testid="${kind}-row"><input class="t2" data-p="${kind === 'pl' ? 'o' : 'c'}.${it.id}.name" type="text" value="${esc(it.name)}" aria-label="${label} name">
      ${field('Amount', (kind === 'pl' ? 'o' : 'c') + '.' + it.id + '.amount', grp(it.amount), { pre: '$' })}${field('Happens in (months)', (kind === 'pl' ? 'o' : 'c') + '.' + it.id + '.month', it.month, { date: 1 })}
      ${ask === 'dp:' + kind + ':' + it.id ? confirmBox('Remove ' + esc(it.name || label) + '?', 'data-dp-yes="' + kind + ':' + it.id + '"', 'Yes, remove') : `<button class="rm" data-dp="${kind}:${it.id}" aria-label="Remove ${esc(it.name || label)}">Remove</button>`}</div>`;
    const jobs = p.jobs.map((j) => { const tp = E.taxPctFor(j), take = E.jobMonthly(j, 0) * (1 - tp / 100), more = UI.coll['jmo:' + j.id] === true, hourly = j.kind === 'hourly';
      return `<section class="card" data-testid="job-card"><input class="t2" data-p="j.${j.id}.name" type="text" value="${esc(j.name)}" aria-label="Job name">
      <div class="seg" role="tablist" aria-label="How you are paid"><button data-jobkind="${j.id}:salary" class="${!hourly ? 'on' : ''}">Salary</button><button data-jobkind="${j.id}:hourly" class="${hourly ? 'on' : ''}" data-testid="kind-hourly">Hourly</button></div>
      ${hourly ? `${field('Hourly wage', `j.${j.id}.wage`, r(j.wage, 2), { pre: '$' })}${field('Hours / week', `j.${j.id}.hours`, r(j.hours, 0))}${field('Tips per hour (optional)', `j.${j.id}.tips`, r(j.tips, 2), { pre: '$' })}` : `${field('Gross pay / year', `j.${j.id}.gross`, grp(j.gross), { pre: '$' })}${field('Hours / week', `j.${j.id}.hours`, r(j.hours, 0))}`}
      ${field('Ends in (months)', `j.${j.id}.end`, j.end === null ? '' : j.end, { ph: 'never', date: 1 })}
      <p class="note" data-testid="job-take">About ${$f(take)}/mo take-home${hourly ? ' (' + $f(j.gross) + '/yr before tax)' : ''}. Tax ${j.tax === null ? 'estimated at ' + r(tp, 1) + '%' : 'set to ' + r(j.tax, 1) + '%'}.</p>
      <button class="chip link morebtn" data-coll="jmo:${j.id}" aria-expanded="${more}">${more ? 'Fewer details ▾' : 'More details (optional) ▸'}</button>
      ${more ? `${hourly ? field('Weeks worked / year', `j.${j.id}.weeks`, r(j.weeks, 0)) : ''}${field('Yearly raise', `j.${j.id}.raise`, r(j.raise, 1), { suf: '%' })}${field('Tax rate (blank = estimate)', `j.${j.id}.tax`, j.tax === null ? '' : r(j.tax, 1), { suf: '%', ph: 'auto ' + r(tp, 1) })}${field('Starts in (months)', `j.${j.id}.start`, j.start, { date: 1 })}` : ''}
      ${ask === 'dp:job:' + j.id ? confirmBox('Remove ' + esc(j.name) + '?', 'data-dp-yes="job:' + j.id + '"', 'Yes, remove') : `<button class="rm" data-dp="job:${j.id}" aria-label="Remove ${esc(j.name)}">Remove job</button>`}</section>`; }).join('');
    const row = (label, v, cls, bold) => `<tr class="${bold ? 'tot' : ''}"><td>${label}</td><td class="${cls || ''}">${bold ? '<b>' + $s(v) + '</b>' : $s(v)}</td></tr>`;
    const picture = `<table class="cmp" data-testid="monthly-picture"><tbody>
      ${row('Your take-home pay', k.takeHome)}${row('Portfolio cash flow', k.portfolioAfterTax, k.portfolioAfterTax < 0 ? 'bad' : '')}${row('Managers (not you)', -k.managerCost0)}${row('Extra payments', -k.extra)}${row('Living costs', -k.living)}${row('Other debts', -k.debts)}${row('Left over each month', k.net0, k.net0 < 0 ? 'bad' : '', true)}</tbody></table>`;
    /* where your job money goes: pay minus living costs, other debts and your extra payments is the job surplus; it is split across the assets (the trust while something is waiting, then the loans equally) and never takes your cash below the cushion */
    const jobNote = (() => {
      if (!p.jobs.length || !(R.income[0] > 0)) return '<p class="note" data-testid="job-split">You have no job income right now, so no job money is split between your assets.</p>';
      const js = k.jobSurplus0, waiting = S.houses.some((h) => h.status !== 'owned' && isFinite(pl.purchase[h.id])), nLoans = S.houses.filter((h) => h.status === 'owned' && pl.balAt(h.id, 0) > 0.005).length, nPool = pl.poolAt(0).n;
      if (g.autoPay === false) return `<p class="note" data-testid="job-split" data-v="${Math.round(js)}">Of your job income, ${$f(js)}/mo is left after living costs. Automatic payments are switched off in Assumptions, so it stays in your cash.</p>`;
      const tail = ' Your cash never drops below the cushion because of it.', cush = k.reserveTarget0, cash0 = +p.cash || 0;
      const body = js <= 0.5 ? 'Nothing is left after living costs, other debts and your extra payments, so nothing is split.'
        : cash0 < cush - 0.5 ? `Your cash (${$f(cash0)}) is below your ${p.emergencyMonths}-month cushion (${$f(cush)}), so the job money first rebuilds the cushion` + (k.jobSplit0 > 0.5 ? ` and only ${$f(k.jobSplit0)}/mo is split now.` : ', so nothing is split yet.')
        : k.jobSplit0 < js - 0.5 ? 'It stays in your cash for now: it builds up toward the first purchase, which is paid from your savings above the cushion plus this money. It is split across the trust and the loans once nothing is waiting on it.' + tail
        : waiting ? `It is split across ${nPool} asset${nPool === 1 ? '' : 's'} (the trust's pool): first it pays down the trust's line of credit, then it builds cash for the next planned purchase. After the last purchase it is split equally across the loans of ${nLoans || 'your'} asset${nLoans === 1 ? '' : 's'}.` + tail
        : `It is split equally across ${nLoans} asset${nLoans === 1 ? '' : 's'} with a loan, as extra payments.` + tail;
      return `<p class="note" data-testid="job-split" data-v="${Math.round(js)}">Of your job income, <b>${$f(js)}/mo</b> is left after living costs. ${body}</p>`;
    })();
    const taxEff = R.taxable[0] > 0 ? (R.portTax[0] / R.taxable[0]) * 100 : 0;
    const calls = f.calls.slice(0, 3).map((c) => `<div class="drv"><span>Month ${c.month}${c.assets.length ? ' · ' + esc(c.assets.join(', ')) : ''}</span><span><b>${$f(c.amount)}</b></span></div>`).join('');
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2>Finances</h2></div>
    <section class="card vcard ${vS}" data-testid="verdict-card"><div class="vrow" style="cursor:default"><span class="vchip ${vS}" data-testid="verdict-chip">${VL[vS]}</span><b data-testid="verdict-headline">${esc(vS !== f.status ? 'Not yet. Lenders may decline a loan around ' + mond(pl.worst.month) + '.' : f.headline)}</b></div>
      ${f.reasons.filter((x) => x.sev !== 'ok').map((x0) => { const x = vS !== f.status && /^Lenders may decline/.test(x0.text) ? Object.assign({}, x0, { sev: 'bad' }) : x0; return `<div class="rsn ${x.sev}"><span aria-hidden="true">${icon[x.sev]}</span><span>${esc(x.text)}</span></div>`; }).join('')}
      ${f.reasons.some((x) => x.sev === 'ok') ? `<div class="rsn ok" data-testid="reasons-ok"><span aria-hidden="true">✓</span><span>Looks fine: ${esc(f.reasons.filter((x) => x.sev === 'ok').map((x) => x.short || x.text).join(' · '))}</span></div>` : ''}
      ${f.fixes.length ? `<div class="fixes" data-testid="fixes"><b>What would fix it</b><ul>${f.fixes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</section>
    <div class="sec">Your income</div>${jobs}<button class="addrow cardbtn" data-addjob="salary" data-testid="add-job">+ Add a salaried job</button><button class="addrow cardbtn" data-addjob="hourly" data-testid="add-hourly-job">+ Add an hourly job (wage and tips)</button>
    <div class="sec">Your cash and expenses</div><section class="card">${field('Liquid cash you have', 'p.cash', grp(p.cash), { pre: '$' })}${field('Cash interest', 'p.cashApy', r(p.cashApy, 2), { suf: '%' })}${field('Cash cushion (months)', 'p.emergencyMonths', r(p.emergencyMonths, 1))}${field('Living costs / month', 'p.living', grp(p.living), { pre: '$' })}${field('Your own rent or mortgage / month', 'p.housing', grp(p.housing), { pre: '$' })}<p class="note">Already part of living costs. Lenders count it as a debt when they work out your debt-to-income.</p>${field('Cost increases / year', 'p.inflation', r(p.inflation, 1), { suf: '%' })}${field('Other debts / month', 'g.otherDebt', grp(g.otherDebt), { pre: '$' })}</section>
    <div class="sec">Your month: now and at plan end</div><section class="card">${picture}${jobNote}<p class="note">Cash flow the trust reinvests, and the job money above, move out of your cash into the trust or its loans each month; that is already taken out under Cash over time.</p>
    ${(() => { const later = pl.extraLater, pe = k.planEnd; return `${later > 0.5 ? `<p class="note">Plus ${$f(later)}/mo of extra payments on assets you have not bought yet.</p>` : ''}
    <div data-testid="finances-sync" style="border-top:2px solid var(--line);margin-top:8px;padding-top:6px"><b>At plan end</b> <span class="note">(same as the Portfolio page)</span><div class="f"><span class="lb">Before tax</span><b data-testid="sync-cf">${$s(pe.cfBefore)}</b></div><div class="f"><span class="lb">After tax</span><b>${$s(pe.cfAfter)}</b></div><div class="f"><span class="lb">Left over each month</span><b>${$s(pe.net)}</b></div>
    </div>`; })()}</section>
    <div class="sec">Cash over time</div><section class="card" data-testid="cash-card">${finChart(f)}
      <div class="f"><span class="lb">Lowest cash</span><b data-testid="lowest-cash">${$f(k.minLiquid)} · ${mond(k.minLiquidMonth)}</b></div>
      <div class="f stack"><span class="lb">Months you could last without a paycheck</span><b>${isFinite(k.minRunway) ? r(k.minRunway, 1) : 'No limit — portfolio income covers it'}</b></div>
      <p class="note" data-testid="funding-line">Paid from your own pocket: the down payments the trust cannot fund (sale proceeds, pooled cash flow and its line of credit do not cover them) total ${$f(pl.outsideTotal)} over the plan. ${k.capitalTotal > 0 ? `Partners and investors you listed cover ${$f(Math.min(k.totalOutside, k.capitalTotal))}; the rest` : 'All of it'} comes out of your savings and monthly income.</p>
      ${calls ? `<p class="note" style="margin-top:8px">Biggest cash calls</p>${calls}` : ''}</section>
    ${colSec('fin-tax', 'Taxes', (p.portfolioTaxPct === null ? 'worked out' : p.portfolioTaxPct + '%') + ' / ' + (p.salesTaxPct === null ? 'worked out' : p.salesTaxPct + '%'), `<section class="card" data-testid="tax-card">${field('Tax on portfolio income (blank = worked out)', 'p.portfolioTaxPct', p.portfolioTaxPct === null ? '' : r(p.portfolioTaxPct, 1), { suf: '%', ph: 'auto ' + r(taxEff, 1), info: 'portfoliotax' })}${field('Tax on gains when you sell (blank = worked out)', 'p.salesTaxPct', p.salesTaxPct === null ? '' : r(p.salesTaxPct, 1), { suf: '%', ph: 'auto', info: 'salestax' })}${field('State income tax', 'p.statePct', r(p.statePct, 1), { suf: '%' })}${field('Land share of a property purchase', 'p.landPct', r(p.landPct, 0), { suf: '%' })}${field('Goodwill share of a business price', 'p.bizIntPct', r(p.bizIntPct, 0), { suf: '%' })}
      <div class="f"><span class="lb">Depreciation now (per month)</span><b data-testid="tax-dep">${$f(R.dep[0])}</b></div><div class="f"><span class="lb">Taxable portfolio profit now (per month)</span><b data-testid="tax-taxable">${$s(R.taxable[0])}</b></div><div class="f"><span class="lb">Income tax on it now (per month)</span><b data-testid="tax-now">${$f(R.portTax[0])}</b></div>
      <div class="f"><span class="lb">Income tax at plan end (per month)</span><b data-testid="tax-end">${$f(k.planEnd.tax)}</b> </div>
      ${Object.keys(f.saleInfo).length ? `<p class="note" data-testid="sale-taxes">Sales in this plan: ${Object.keys(f.saleInfo).map((id) => esc(H(id).addr) + ' ' + $c(f.saleInfo[id].tax) + ' tax (' + r(f.saleInfo[id].rate, 0) + '% of gain)').join('; ')}.</p>` : ''}
      <p class="note">Worked out: profit = net operating income - loan interest - depreciation. Homes are written off over 27.5 years and commercial buildings over 39 (land excluded); a business price is split into goodwill (15 years) and equipment (7 years). Tax is the extra federal tax your wages plus this profit owe (2026 single brackets), plus 3.8% on rental profit above $200,000 of income. A loss pays no tax. Sales: long-term gains 0/15/20%, depreciation on buildings taxed up to 25%, business depreciation as ordinary income, 3.8% on property gains above $200,000. Short holds are ordinary income. Type a rate to use your own flat rate instead.</p></section>`, true)}
    ${colSec('fin-time', 'Time and managers', p.operating + ' run by you', `<section class="card">${field('Businesses you run yourself', 'p.operating', p.operating)}${field('Hours / week each takes', 'p.bizHours', r(p.bizHours, 0))}${field('Manager pay per other business / mo', 'p.gmMonthly', grp(p.gmMonthly), { pre: '$' })}<p class="note">A business profit figure assumes the owner does the work. Businesses beyond the ones you run need a paid manager.</p></section>`, true)}
    <div class="sec">Planned one-time expenses${infoBtn('planned')}</div><section class="card">${p.planned.length ? p.planned.map((it) => listRow('pl', it, 'Expense')).join('') : '<p class="note" style="margin:0">Things like a wedding, a car or tuition. They come out of your cash.</p>'}<button class="addrow" data-addplanned data-testid="add-planned">+ Add an expense</button></section>
    <div class="sec">Outside capital you have lined up${infoBtn('capital')}</div><section class="card">${p.capital.length ? p.capital.map((it) => listRow('cap', it, 'Capital')).join('') : '<p class="note" style="margin:0">Partners, investors or family who will put money in. It is added to your cash that month.</p>'}<button class="addrow" data-addcap data-testid="add-capital">+ Add capital</button></section>`;
  }

  /* ---------- add page: pick a type, then a loan option that auto-fills the terms ---------- */
  function addPage() {
    const tp = E.TYPES[UI.addType] ? UI.addType : 'house', list = E.loansFor(tp), sel = list.find((l) => l.id === UI.addLoan) ? UI.addLoan : list[0].id;
    const blurb = { house: 'A single-family rental or primary home.', commercial: 'Retail, office, storage or industrial. Valued on rent and cap rate.', business: 'An operating business you buy. Valued on owner profit and growth.' }[tp];
    return `<div class="top"><button class="ic" data-go="" aria-label="Cancel and go back">‹</button><h2>${UI.addOwned ? 'Add something you own' : 'Add to portfolio'}</h2></div>${UI.addOwned ? '<p class="note" style="margin:0 4px 8px" data-testid="add-owned-note">It goes on the Real page. Next you set the price, loan and how many months you have already paid.</p>' : ''}
    <section class="card"><div class="seg" role="tablist">${['house', 'commercial', 'business'].map((x) => `<button data-addtype="${x}" class="${x === tp ? 'on' : ''}">${TL[x]}</button>`).join('')}</div><p class="note">${blurb} You will set the price and income on the next screen.</p>${tp === 'house' ? '<button class="linkbtn" data-go="import/new">Have a Zillow listing? Import it</button>' : ''}</section>
    <div class="sec">Pick a loan option</div><section class="card" data-testid="loan-options">${(() => { const one = (l) => `<div class="loanrow"><button class="loanopt ${l.id === sel ? 'on' : ''}" data-pickloan="${l.id}" aria-pressed="${l.id === sel}"><b>${esc(l.name.replace(/\s*\(you live there\)/i, ''))}</b><span>${l.dp >= 100 ? 'No loan · pay the full price' : l.dp + '% down · ' + l.rate + '% · ' + (l.io ? 'interest-only, ' : '') + r(l.term / 12, 1) + ' yr'}</span>${l.dp >= 100 ? '' : `<small>${esc(l.note.split(/(?<=\.)\s/)[0])}</small>`}</button>${infoBtn(GL.LOAN[l.id])}</div>`; const inv = list.filter((l) => !l.ownerOcc), live = list.filter((l) => l.ownerOcc); return inv.map(one).join('') + (live.length ? `<p class="note" style="margin:10px 4px 2px"><b>If you will live there</b><br>FHA and 203(k) loans need you to move in.</p>` + live.map(one).join('') : ''); })()}</section>
    <button class="btn" style="width:100%" data-confirm-add="${tp}|${sel}" data-testid="confirm-add">Add ${TL[tp].toLowerCase()}</button>`;
  }

  /* ---------- sample portfolios: loading one never loses the current plan ---------- */
  const SCN = [
    { k: 'reset', test: 'load-realistic', title: 'Realistic sample', name: 'realistic sample', sub: 'A few assets already bought; market-checked prices and loans', seed: () => E.seed(), what: 'It keeps a few assets already bought, to show the Real page.' },
    { k: 'stretch', test: 'load-stretch', title: '$540M stretch scenario', name: '$540M stretch scenario', sub: 'Buys 607 Siena Way, Bel Air ($135M) in month 170', seed: () => E.seedStretch(), what: 'It buys 607 Siena Way, Bel Air, for $135M in month 170 and needs 21-25% yearly business growth.' },
    { k: 'big', test: 'load-big', title: '$120M scenario', name: '$120M scenario', sub: 'The trust buys a $35M waterfront estate in month 200', seed: () => E.seedBig(), what: 'The trust buys a $35M waterfront estate in month 200.' },
    { k: 'stradella', test: 'load-stradella', title: '$38.7M house scenario', name: '$38.7M house scenario', sub: 'Buys 900 Stradella Rd for cash in month 200', seed: () => E.seedStradella(), what: 'It buys 900 Stradella Rd for cash in month 200.' }
  ];
  const scnConfirm = (sc) => { let ny = null; try { ny = sc.seed().g.planYears; } catch (e) {} const cy = S.g.planYears;
    return 'Load the ' + esc(sc.name) + '? ' + (S.houses.length ? 'Your current plan (' + S.houses.length + ' asset' + (S.houses.length === 1 ? '' : 's') + ') is kept in Saved first, and Undo brings it back. ' : '') + (ny && ny !== cy ? 'The projection length changes from ' + cy + ' to ' + ny + ' years. ' : '') + esc(sc.what); };
  function loadScenario(sc) {
    ask = null; const snap = JSON.stringify(S); let sid = null;
    if (S.houses.length && SAVED.length < MAXSAVED) { const rec = { id: newSid(), name: ('Portfolio ' + (SAVED.length + 1) + ' (before ' + sc.name + ')').slice(0, 60), ts: Date.now(), state: JSON.parse(snap) }; SAVED.unshift(rec); if (saveSaved()) sid = rec.id; else SAVED.shift(); }
    undo = { text: 'Loaded the ' + sc.name + '. ' + (sid ? 'Your previous plan is kept in Saved.' : 'Your previous plan could not be filed in Saved, but Undo brings it back.'), label: 'previous plan', snap, sid };
    S = sc.seed(); S.v = DATA_V; fixOrder(S); selId = null; page = 'planned'; prev = {}; savedMsg = ''; save(); goto(''); render(); window.scrollTo(0, 0);
  }
  /* ---------- settings ---------- */
  function settings() {
    const g = S.g, F = (l, k, o) => field(l, 'g.' + k, o && o.pre === '$' ? grp(g[k]) : g[k], o);
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2>Assumptions</h2></div>
    <p class="note" style="margin:0 4px 6px">Defaults work for most people. Change them when you know your lender. You can type simple math in any number box, like 650*3.${infoBtn('calc')}</p>
    <div class="sec">Open the app on${infoBtn('openon')}</div><section class="card" data-testid="openon-card"><div class="seg" style="margin-top:0" role="radiogroup" aria-label="Open the app on">${[['planned', 'Planned'], ['real', 'Real'], ['saved', 'Saved']].map(([k, l]) => `<button type="button" role="radio" data-openon="${k}" class="${UI.openOn === k ? 'on' : ''}" aria-checked="${UI.openOn === k}" data-testid="openon-${k}">${l}</button>`).join('')}</div><p class="note">The page you see first when you open the app. Planned is the default. You can switch pages with the buttons at the top of the main screen.</p></section>
    <details class="card" data-testid="model-notes" style="margin:0 0 8px;padding:10px 12px"><summary style="cursor:pointer;font-weight:600">How the numbers are built</summary><ul class="note" style="margin:8px 0 0 16px;padding:0">
      <li>The main screen has three pages. Planned is the plan and its math (net worth and cash flow at the end of the plan, every planned asset). Real is only what you have already bought: its totals are the sum of its rows. Saved holds copies of whole portfolios (assets, assumptions and finances) that you can open later; they are kept on this device and are part of the backup. Choose which page opens first at the top of this screen.</li>
      <li>Any number box accepts simple math: type 650*3 or (2000-300)/2 and the box shows the answer when you leave it. Every month number is counted from today (month 0), and the date it falls on is shown beside it.</li>
      <li>All dollars are nominal (future) dollars, not adjusted for inflation. Living costs and manager pay rise by the cost-increase rate; loan payments stay fixed.</li>
      <li>Rent, profit and costs of each asset grow at that asset's growth rate, the same rate as its value. Property taxes are assumed to rise with value (some states cap this).</li>
      <li>Every asset sits in one trust and the trust borrows against all of it. Walking down the list, each planned asset is bought the first month the pool of everything before it (what you own today plus the planned assets above it) can pay its down payment, closing costs and improvements: the pool's borrowing room plus the cash it holds. Each asset adds room up to the max loan vs value (85% is the regulators' ceiling for real estate) less the appraisal cut, its own loan balance and other liens; a business is not backed by real estate, so it uses a separate, lower cap (50% by default, a conservative choice you can change). What the trust has already drawn on its line is subtracted. The pool's whole cash flow (income minus costs, loan payments and line interest, after the managers and taxes) goes first to paying the line down, which raises the room, then is held for the next purchase. Each asset's cash flow grows with its income, and extra payments still shorten loans and raise room. Move an asset up or down the list and the funding order changes with it. Savings are not counted; sale proceeds are held as cash. Planned assets are always funded in list order, so none is bought before one above it. Every time on screen is one clock: months from today.</li>
      <li>Where the money goes, in order: (1) the trust's pooled cash flow pays the line of credit down; (2) while a planned asset is waiting, the rest is held as cash for it; (3) once nothing is left to buy, each asset's profit pays down its own loan as an automatic extra payment (in proportion to the profit it earned), so its payoff comes sooner. Your job's take-home pay minus living costs, other debts and your extra payments is split the same way (equally across the loans at the end), and it never takes your cash below the emergency cushion. Both can be switched off under Paying loans down.</li>
      <li>Debt-to-income counts 75% of rent (minus the property's payment) plus your other debts and your own rent or mortgage (set in Finances). Banks also look at each asset's DSCR (income over loan payment): about 1.25 for bank loans, 1.15 for SBA.</li>
      <li>Taxes are worked out: profit = net operating income - loan interest - depreciation (27.5 / 39 years for buildings, 15 years for business goodwill, 7 for equipment), taxed at the extra rate your wages plus the profit owe, plus 3.8% where it applies. Sales pay capital-gains rates, up to 25% on depreciation taken, and 3.8% where it applies. State tax is 0 until you enter it. You can type your own flat rates. Closing costs are a percent of price. FHA insurance is charged on the falling loan balance.</li>
      <li>Interest-only and short loans come due: the balance left is refinanced at the refinance rate and term below, so payments and DSCR change after that month. Commercial tenants repay part of tax, insurance and CAM (NNN %), set on each commercial asset.</li>
      <li>Vacancy defaults to 7%, about the Census Bureau's rental vacancy rate. Business growth defaults to 4% a year, about the Federal Reserve's long-run nominal growth of the economy. Growth rates, management and repair costs are assumptions, not forecasts.</li></ul></details>
    <div class="sec">Borrowing</div><section class="card">${F('Max loan vs value', 'cap', { suf: '%' })}${F('Max loan vs value (business)', 'capBiz', { suf: '%' })}${F('Appraisal cut', 'haircut', { suf: '%' })}${F('Closing costs', 'closing', { suf: '%' })}${F('Line of credit rate', 'hrate', { suf: '%' })}${F('Refinance rate', 'refiRate', { suf: '%' })}${field('Refinance term (years)', 'g.refiTermY', r(g.refiTerm / 12, 1), { info: 'refi' })}<p class="note">Appraisal cut: what lenders subtract from a home's value. Rent counted: the share of rent lenders accept as income.</p></section>
    <div class="sec">Paying loans down${infoBtn('autopay')}</div><section class="card" data-testid="autopay-card"><div class="f" style="border-top:0;min-height:36px"><span class="lb">Send profit and job money to loans</span></div><div class="seg" style="margin-top:0" role="tablist" aria-label="Send profit and job money to loans"><button data-autopay="on" class="${g.autoPay !== false ? 'on' : ''}" data-testid="autopay-on">On</button><button data-autopay="off" class="${g.autoPay === false ? 'on' : ''}" data-testid="autopay-off">Off</button></div><p class="note">On: while a planned asset is waiting, the pooled cash flow (and your job money left after living costs and your cash cushion) pays the trust's line of credit and builds cash for it. Once nothing is left to buy, each asset's profit pays down its own loan, and your job money is split equally across the loans. Off: the old behavior, where only your typed extra payments reduce a loan.</p></section>
    <div class="sec">Who helps you qualify${infoBtn('qualifying')}</div><section class="card">${F('Co-signer 1 / yr', 'p1', { pre: '$' })}${F('Co-signer 2 / yr', 'p2', { pre: '$' })}<p class="note">Leave 0 if none. Co-signers help you qualify for loans. Their income counts toward the lender's limit.</p>${F('Debt-to-income limit', 'dti', { suf: '%' })}${F('Rent counted', 'rentCount', { suf: '%' })}${F('Other monthly debts', 'otherDebt', { pre: '$' })}</section>
    <div class="sec">Operating costs</div><section class="card">${F('Vacancy', 'vac', { suf: '%' })}${F('Management (of rent)', 'mgmt', { suf: '%' })}${F('Repairs / yr', 'maint', { suf: '%' })}${F('Growth / yr', 'appr', { suf: '%' })}${F('Projection length (years)', 'planYears', {})}</section>
    ${colSec('backup', 'Backup and restore', 'copy or restore', `<section class="card">
      ${notice ? `<div class="warnbox">${esc(notice)}</div>` : ''}
      <button class="btn" data-export data-testid="export">${exportOpen ? 'Hide backup' : 'Show backup to copy'}</button>
      ${exportOpen ? `<textarea readonly rows="5" id="bkout" aria-label="Backup data" data-testid="backup-text">${esc(backupJson())}</textarea><button class="btn plain" data-copybackup>Copy backup</button><p class="note" id="cbm">Save this text somewhere safe, such as a note or file. Paste it below to restore.</p>` : ''}
      <label class="btn plain filebtn">Restore from backup file<input type="file" accept="application/json,.json,text/plain" hidden id="imp" aria-label="Choose backup file" data-testid="import-file"></label>
      <textarea rows="2" id="bkin" aria-label="Or paste backup text" placeholder="…or paste backup text here"></textarea><button class="btn plain" data-restore-text>Restore from pasted text</button>
      ${pendingImport ? confirmBox('Replace all current data with this backup?', 'data-import-yes', 'Yes, replace') : ''}
      <p class="note">${(() => { try { const t = localStorage.getItem('rep-v4-backup'); return t ? 'Backup last shown: ' + new Date(+t).toLocaleDateString() : 'No backup yet. Copy one regularly.'; } catch (e) { return ''; } })()}</p></section>`, true)}
    ${colSec('samples', 'Sample portfolios', 'your plan is kept in Saved first', `<section class="card" data-testid="samples-card">${SCN.map((sc) => ask === sc.k ? confirmBox(scnConfirm(sc), 'data-' + sc.k + '-yes', 'Yes, load it') : `<button type="button" class="scn" data-${sc.k} data-testid="${sc.test}"><b>${sc.title}</b><span>${sc.sub}</span></button>`).join('')}
      <p class="note">Loading one files your current plan in Saved first (as “Portfolio N (before …)”) and shows an Undo, so nothing is lost. The samples keep a few assets already bought, to show the Real page; your default plan starts with nothing bought. Every scenario is funded by the trust: an asset is bought when the pooled cash flow and borrowing room of the assets before it can pay for it. None of them needs outside money for the purchases.</p></section>`, true)}`;
  }

  /* ---------- import from listing ---------- */
  const PROMPT = `Here is a Zillow listing: <PASTE THE LINK HERE, or paste the listing text / attach screenshots>

Create a file named house.json for my real estate portfolio app. Use only facts you can actually read from the listing. Do not guess. If a value is not shown, set it to null and mark its source "missing". If you can only estimate a value (for example insurance), mark its source "estimate" and say how in "note".

Reply with JSON only, in exactly this format:

{
  "schema": "house-listing/1",
  "listingUrl": "<url or null>",
  "capturedOn": "YYYY-MM-DD",
  "address": "street, city, state zip",
  "price":       { "value": 0, "source": "listing" },
  "rentMonthly": { "value": 0, "source": "listing|estimate|missing", "note": "" },
  "taxAnnual":   { "value": 0, "source": "listing|estimate|missing" },
  "insuranceAnnual": { "value": 0, "source": "listing|estimate|missing" },
  "hoaMonthly":  { "value": 0, "source": "listing|missing" },
  "info": { "beds": 0, "baths": 0, "sqft": 0, "yearBuilt": 0, "propertyType": "" }
}

Money is US dollars as plain numbers. taxAnnual and insuranceAnnual are per YEAR; rentMonthly and hoaMonthly are per MONTH. Do not include interest rate or down payment.`;
  function importPage(id) {
    const target = id === 'new' ? null : H(id), res = imp && imp.res;
    const badge = (x) => `<span class="src ${x}">${x}</span>`;
    const preview = !res ? '' : res.ok ? `<section class="card" data-testid="import-preview"><b>Preview of ${esc((imp && imp.name) || 'your file')}</b><br><span class="note">listing = from the page · estimate = a guess</span><table class="cmp">${res.rows.map((x) => `<tr><td>${x[0]}</td><td>${esc(x[1])}</td><td>${badge(x[2])}</td></tr>`).join('')}</table>
      ${res.rows.some((x) => x[2] === 'missing') ? '<p class="note">Anything missing keeps a default; edit it afterward.</p>' : ''}
      <button class="btn" style="width:100%;margin-top:8px" data-apply-listing="${id}" data-testid="import-apply">${target ? 'Fill this house' : 'Add it, then review'}</button></section>` : `<div class="warnbox" data-testid="import-error">⚠ ${esc(res.error)}</div>`;
    return `<div class="top"><button class="ic" data-go="${target ? 'h/' + id : ''}" aria-label="Back">‹</button><h2>Import from listing</h2></div>
    <section class="card"><p class="note" style="margin:0 0 6px">Takes about a minute. Claude reads the listing for you.</p><ol class="steps"><li>Copy the prompt.</li><li>Paste it into a Claude chat with your Zillow link. If Claude cannot open the page, paste the listing text or screenshots instead.</li><li>Save Claude's reply as a <code>.json</code> file and choose it below.</li></ol>
      <button class="btn plain" data-copyprompt data-testid="copy-prompt">Copy Claude prompt</button><p class="note" id="cpm"></p>
      <details><summary class="note" style="font-size:14px;padding:8px 0">Show the prompt</summary><pre class="pre">${esc(PROMPT)}</pre></details>
      <label class="btn ${res && res.ok ? 'plain ' : ''}filebtn" style="margin-top:8px">${res && res.ok ? 'Choose a different file' : 'Choose listing file'}<input type="file" accept=".json,application/json,text/plain" hidden data-listing-file data-testid="import-listing-file" aria-label="Choose listing file"></label>
      <button class="linkbtn" data-togglepaste>${UI.paste ? 'Hide pasted text' : 'Or paste the file contents'}</button>
      ${UI.paste ? `<textarea data-listing-text id="lt" rows="4" aria-label="Paste the listing file contents" placeholder="Paste the JSON Claude gave you"></textarea><button class="btn plain" data-read-listing>Read pasted text</button>` : ''}</section>${preview}`;
  }
  function readListing(text) {
    let o = null; try { o = JSON.parse(text); } catch (e) { o = null; }
    imp = { name: impName, res: o === null ? { ok: false, error: 'That text is not valid JSON.' } : E.fromListing(o) }; render();
  }
  function applyListing(id) {
    if (!imp || !imp.res || !imp.res.ok) return;
    const x = imp.res, extra = { listingUrl: x.url || '', info: x.info || {}, fresh: false };
    let h = id === 'new' ? null : H(id);
    if (h) Object.assign(h, x.patch, extra); else { h = E.newHouse(Object.assign({}, x.patch, extra)); E.register(S, h); S.houses.push(h); }
    imp = null; save(); goto('h/' + h.id);
  }

  function stageBackup(text) {
    try { const d = JSON.parse(text); if (!d || !Array.isArray(d.houses) || !d.g) throw 0; pendingImport = d; notice = ''; }
    catch (x) { pendingImport = null; notice = 'That is not a valid backup. Nothing was changed.'; }
    render();
  }
  /* ---------- router + render ---------- */
  let prev = {};
  let inRender = false; /* a box removed by a re-render fires focusout: that is not the user leaving it */
  function render() { inRender = true; try { render0(); } finally { inRender = false; } }
  function render0() {
    const route = routeOf(), a = document.activeElement, id = a && a.dataset && (a.dataset.p || a.dataset.sel), typed = a && a.value, pos = a && a.selectionStart;
    const app = document.getElementById('app'); if (selId && !H(selId)) selId = null;
    app.innerHTML = '';
    app.innerHTML = route === 'finances' ? finances() : route === 'add' ? addPage() : route.startsWith('import/') ? importPage(route.slice(7)) : route === 'settings' ? settings() : route.startsWith('h/') && H(route.slice(2)) ? house(H(route.slice(2))) : main();
    app.insertAdjacentHTML('beforeend', sheetHtml());
    if (route.startsWith('h/') && !UI.seenLegend) { UI.seenLegend = true; save(); }
    /* aria-modal: while the sheet is open nothing behind it can be reached with the keyboard or a screen reader */
    [...app.children].forEach((el) => { if (infoKey && !el.matches('.sheet-bg,.sheet')) el.setAttribute('inert', ''); });
    if (infoKey) { const cb = app.querySelector('[data-info-close].btn'); if (cb) cb.focus(); }
    else if (infoFrom) { const back = app.querySelectorAll(`[data-info="${infoFrom.key}"]`)[infoFrom.idx]; infoFrom = null; if (back) back.focus(); }
    if (id) { const el = app.querySelector(`[data-p="${id}"],[data-sel="${id}"]`); if (el) { el.focus(); if (a.dataset.p && !el.readOnly && document.hasFocus()) { el.value = typed; try { el.setSelectionRange(pos, pos); } catch (e) {} } } }
    placeHint();
    const cur = {};
    app.querySelectorAll('[data-k]').forEach((el) => { const k = el.dataset.k, v = el.tagName === 'INPUT' ? el.value : el.textContent; cur[k] = v;
      if (k in prev && prev[k] !== v && el !== document.activeElement) (el.closest('label,.kpi,tr') || el).classList.add('flash'); });
    prev = cur;
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && infoKey) { infoKey = null; render(); } });
  window.addEventListener('hashchange', () => { navSeen++; infoKey = null; infoFrom = null; prev = {}; ask = null; pendingImport = null; exportOpen = false; notice = ''; window.scrollTo(0, 0); render(); });

  /* ---------- editing: every field is an input; derived fields back-solve ---------- */
  function setField(p, s) {
    undo = null;
    const [t, x, k] = p.split('.');
    if (k === 'addr') { H(x).addr = s; return true; }
    const list = { j: 'jobs', o: 'planned', c: 'capital' }[t];
    if (list && k === 'name') { const it = S.p[list].find((q) => q.id === x); if (it) it.name = s; return true; }
    if (t === 'j' && (k === 'end' || k === 'tax') && String(s).trim() === '') { const jb = S.p.jobs.find((q) => q.id === x); if (jb) jb[k] = null; S.p = E.normalizePersonal(S.p); return true; }
    if (t === 'p' && (x === 'portfolioTaxPct' || x === 'salesTaxPct') && String(s).trim() === '') { S.p[x] = null; S.p = E.normalizePersonal(S.p); return true; }
    if (t === 'h' && (k === 'refiRate' || k === 'refiTermY') && String(s).trim() === '') { H(x)[k === 'refiRate' ? 'refiRate' : 'refiTerm'] = null; return true; }
    const n = parseFloat(String(s).replace(/,/g, '').replace(/[^0-9.\-eE+]/g, '')); if (isNaN(n)) return false;
    if (t === 'g') { if (x === 'refiTermY') S.g.refiTerm = Math.max(12, Math.round(n * 12)); else S.g[x] = n; return true; }
    if (t === 'p') { S.p[x] = n; S.p = E.normalizePersonal(S.p); return true; }
    if (list) { const it = S.p[list].find((q) => q.id === x); if (!it) return false; it[k] = n; S.p = E.normalizePersonal(S.p); return true; }
    const h = H(x), v = E.view(S, h); h.fresh = false;
    if (k === 'extra') { h.extra = Math.max(0, n); h.driver = 'extra'; }
    else if (k === 'wait') { h.wait = Math.max(0, Math.round(n)); h.driver = 'months'; }
    else if (k === 'down') { h.dp = Math.min(100, Math.max(0, (n / h.price) * 100)); }
    else if (k === 'dp') { h.dp = Math.min(100, Math.max(0, n)); }
    else if (k === 'termY') { h.term = Math.max(12, Math.round(n * 12)); }
    else if (k === 'refiTermY') { h.refiTerm = Math.max(12, Math.round(n * 12)); }
    else if (k === 'mat') { h.mat = Math.max(0, Math.round(n)); }
    else if (k === 'nnn') { h.nnn = Math.min(100, Math.max(0, n)); }
    else if (k === 'payoff') { const B0 = E.balToday(h), m = Math.max(1, Math.round(n)); /* smallest extra that pays the loan off in m months, found against the engine's own payoff (so balloon / refinance loans work too) */
      let lo = 0, hi = Math.max(1, B0); if (E.payoffN(h, 0, S) <= m) hi = 0; else { for (let q = 0; q < 60; q++) { const mid = (lo + hi) / 2; if (E.payoffN(h, mid, S) <= m) hi = mid; else lo = mid; } hi = Math.ceil(hi * 100) / 100; }
      h.extra = hi; h.driver = 'extra'; }
    else if (k === 'price') { h.price = Math.max(0, n); }
    else if (k === 'arv') { h.arv = Math.max(0, n); h.gain = null; h.arvAuto = false; }
    else if (k === 'gain') { h.gain = n; h.arvAuto = false; h.arv = Math.max(0, Math.round(h.price + (h.capex || 0) + n)); }
    else if (k === 'rate') { h.rate = Math.min(30, Math.max(0, n)); }
    else if (k === 'loan' || k === 'need' || k === 'caprate' || k === 'mult' || k === 'proceeds') return false;
    else if (k === 'growth') h.growth = Math.min(100, Math.max(-50, n));
    else if (k === 'closingPct') h.closingPct = Math.min(20, Math.max(0, n));
    else h[k] = Math.max(0, n);
    if ((k === 'price' || k === 'capex') && h.arvAuto) h.arv = Math.round(((h.price + (h.capex || 0)) * 1.15) / 1000) * 1000; /* an auto-filled appraisal keeps its 15% margin */
    else if ((k === 'price' || k === 'capex') && h.gain !== null && isFinite(h.gain)) h.arv = Math.max(0, Math.round(h.price + (h.capex || 0) + h.gain)); /* a typed gain keeps the appraisal in step */
    if (['dp', 'down', 'rate', 'termY'].indexOf(k) >= 0) h.loanId = 'custom';
    return true;
  }
  const newSid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  if (switched) { try { const old = JSON.parse(switched); if (old && Array.isArray(old.houses) && old.houses.length && SAVED.length < MAXSAVED) { SAVED.unshift({ id: newSid(), name: 'Portfolio ' + (SAVED.length + 1) + ' (before the update)', ts: Date.now(), state: old }); saveSaved(); } } catch (e) {} switched = null; save(); }
  function showPage(k) { if (PAGES.indexOf(k) < 0 || k === page) return; page = k; selId = null; ask = null; savedMsg = ''; prev = {}; render(); }
  function doSave(name) {
    const nm = String(name || '').trim().slice(0, 60) || 'Portfolio ' + (SAVED.length + 1);
    if (SAVED.length >= MAXSAVED) { savedMsg = 'You can keep up to ' + MAXSAVED + ' saved portfolios. Delete one first.'; return false; }
    SAVED.unshift({ id: newSid(), name: nm, ts: Date.now(), state: JSON.parse(JSON.stringify(S)) });
    if (!saveSaved()) { SAVED.shift(); savedMsg = 'Could not save: this device has no storage space left (or storage is switched off). Use Show backup in Assumptions to keep a copy.'; return false; }
    savedMsg = 'Saved “' + nm + '”.'; return true;
  }
  /* opening a saved portfolio replaces the working one; the old one comes back with Undo */
  function loadSaved(id) {
    const x = SAVED.find((q) => q.id === id); ask = null; if (!x) { render(); return; }
    undo = { text: 'Opened “' + x.name + '”. Your previous portfolio is kept: tap Undo to bring it back.', label: 'previous portfolio', snap: JSON.stringify(S) };
    S = E.normalize(JSON.parse(JSON.stringify(x.state))); if (!S.p) S.p = E.samplePersonal(); S.p = E.normalizePersonal(S.p); S.v = DATA_V; S.seq = +S.seq || 0; selId = null; page = 'planned'; prev = {}; savedMsg = ''; save(); render();
  }
  const app = document.getElementById('app');
  app.addEventListener('input', (e) => { const d = e.target.dataset; if (d.savedName !== undefined) { saveName = e.target.value; return; } if (d.renamedName !== undefined) { renameName = e.target.value; return; } const p = d.p; if (!p) return;
    if (d.num !== undefined) { /* a number box: a plain number updates live; math (650*3) updates live once it is complete. Half-typed or invalid math (650*, 5/0) changes nothing at all: no state, no totals, no rows. The text you typed stays until you leave the box. */
      const c = calcEval(e.target.value); clearTimeout(hintTimer);
      if (c.kind === 'plain') { calcHint = null; if (setField(p, e.target.value)) { save(); render(); } return; }
      if (c.ok) { calcHint = { p, text: '= ' + c.v.toLocaleString('en-US', { maximumFractionDigits: 4 }) }; if (setField(p, String(c.v))) save(); render(); return; }
      calcHint = { p, text: 'Check the math', bad: true }; placeHint(); return; }
    if (setField(p, e.target.value)) { save(); render(); } });
  /* section headers are role=button divs, so Enter and Space must open them like a real button */
  app.addEventListener('keydown', (e) => { const cs = e.target.closest && e.target.closest('[data-coll][role=button]'); if (cs && cs === e.target && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); cs.click(); } });
  app.addEventListener('keydown', (e) => { const tb = e.target.closest && e.target.closest('[data-page]'); if (tb && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { const i = PAGES.indexOf(page) + (e.key === 'ArrowRight' ? 1 : -1); if (i >= 0 && i < PAGES.length) { showPage(PAGES[i]); const n = app.querySelector('[data-page="' + PAGES[i] + '"]'); if (n) n.focus(); } } });
  app.addEventListener('pointermove', nwHover); app.addEventListener('pointerdown', nwHover);
  app.addEventListener('pointerleave', nwLeave, true); app.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') return; });
  /* leaving a number box that holds math: the box shows the answer. A half-typed or invalid expression goes back to the last valid value and says so for a moment ("Kept $3,600"). */
  app.addEventListener('focusin', (e) => { const el = e.target; if (el.dataset && el.dataset.num !== undefined && el.tagName === 'INPUT') editGood = { p: el.dataset.p, text: el.value }; });
  app.addEventListener('focusout', (e) => { const el = e.target; if (!(el.dataset && el.dataset.num !== undefined && el.tagName === 'INPUT') || inRender) return; const c = calcEval(el.value); if (c.kind !== 'expr') { if (calcHint) { calcHint = null; if (e.relatedTarget && e.relatedTarget.dataset && e.relatedTarget.dataset.p) setTimeout(render, 0); } return; }
    const nxt = e.relatedTarget;
    if (!c.ok) { const kept = editGood && editGood.p === el.dataset.p ? editGood.text : el.value; el.value = kept; showNote(el.dataset.p, 'Kept ' + (el.dataset.pre || '') + kept + (el.dataset.suf || '')); return; }
    calcHint = null;
    if (nxt && nxt.dataset && nxt.dataset.p) { setTimeout(render, 0); return; }
    if (nxt) { el.value = String(c.v); return; }
    render(); });
  app.addEventListener('focusout', (e) => { if (e.target.dataset && e.target.dataset.p && e.target.tagName === 'INPUT' && !e.relatedTarget) setTimeout(() => { const a = document.activeElement; if (!(a && a.dataset && (a.dataset.p || a.dataset.sel))) render(); }, 0); });
  app.addEventListener('change', (e) => {
    const ln = e.target.dataset.loan; if (ln) { const h = H(ln); if (e.target.value === 'custom') h.loanId = 'custom'; else E.applyLoan(h, e.target.value); save(); render(); return; }
    const mg = e.target.dataset.merge; if (mg) { H(mg).mergeInto = e.target.value; save(); render(); return; }
    if (e.target.dataset.listingFile !== undefined && e.target.files[0]) { impName = e.target.files[0].name; const rd = new FileReader(); rd.onload = () => readListing(String(rd.result)); rd.readAsText(e.target.files[0]); return; }
    if (e.target.id === 'imp' && e.target.files[0]) { const rd = new FileReader(); rd.onload = () => stageBackup(String(rd.result)); rd.readAsText(e.target.files[0]); } });
  app.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('input,select,textarea,label.filebtn')) return;
    if (t.dataset.copyprompt !== undefined) { const m = document.getElementById('cpm'); try { navigator.clipboard.writeText(PROMPT).then(() => { m.textContent = '✓ Copied. Paste it into a Claude chat.'; }, () => { m.textContent = 'Could not copy — open “Show the prompt” and copy it by hand.'; }); } catch (x) { m.textContent = 'Could not copy — open “Show the prompt” and copy it by hand.'; } return; }
    if (t.dataset.readListing !== undefined) { const ta = document.querySelector('[data-listing-text]'); readListing(ta ? ta.value : ''); return; }
    if (t.dataset.applyListing) { applyListing(t.dataset.applyListing); return; }
    const ap = t.closest('[data-autopay]'); if (ap) { S.g.autoPay = ap.dataset.autopay === 'on'; undo = null; save(); render(); return; }
    const pg = t.closest('[data-page]'); if (pg) { showPage(pg.dataset.page); return; }
    const oo = t.closest('[data-openon]'); if (oo) { UI.openOn = PAGES.indexOf(oo.dataset.openon) >= 0 ? oo.dataset.openon : 'planned'; save(); render(); return; }
    if (t.dataset.saveOpen !== undefined) { saveName = 'Portfolio ' + (SAVED.length + 1); savedMsg = ''; ask = 'save'; render(); const i = app.querySelector('[data-saved-name]'); if (i) { i.focus(); try { i.select(); } catch (x) {} } return; }
    if (t.dataset.saveYes !== undefined) { if (doSave(saveName)) ask = null; render(); return; }
    if (t.dataset.rename) { const x = SAVED.find((q) => q.id === t.dataset.rename); if (x) { renameName = x.name; savedMsg = ''; ask = 'ren:' + x.id; render(); const i = app.querySelector('[data-renamed-name]'); if (i) { i.focus(); try { i.select(); } catch (e2) {} } } return; }
    if (t.dataset.renYes) { const x = SAVED.find((q) => q.id === t.dataset.renYes), old = x && x.name; if (x) { x.name = String(renameName).trim().slice(0, 60) || old; if (saveSaved()) savedMsg = 'Renamed to “' + x.name + '”.'; else { x.name = old; savedMsg = 'Could not rename: this device has no storage space left.'; } } ask = null; render(); return; }
    if (t.dataset.sdup) { const x = SAVED.find((q) => q.id === t.dataset.sdup); if (x) { if (SAVED.length >= MAXSAVED) savedMsg = 'You can keep up to ' + MAXSAVED + ' saved portfolios. Delete one first.'; else { SAVED.splice(SAVED.indexOf(x) + 1, 0, { id: newSid(), name: (x.name + ' (copy)').slice(0, 60), ts: Date.now(), state: JSON.parse(JSON.stringify(x.state)) }); if (saveSaved()) savedMsg = 'Duplicated “' + x.name + '”.'; else { SAVED.splice(SAVED.indexOf(x) + 1, 1); savedMsg = 'Could not duplicate: this device has no storage space left.'; } } } ask = null; render(); return; }
    if (t.dataset.sdel) { ask = 'sdel:' + t.dataset.sdel; savedMsg = ''; render(); return; }
    if (t.dataset.sdelYes) { const i = SAVED.findIndex((q) => q.id === t.dataset.sdelYes); if (i >= 0) { const gone = SAVED.splice(i, 1)[0]; if (saveSaved()) savedMsg = 'Deleted “' + gone.name + '”.'; else { SAVED.splice(i, 0, gone); savedMsg = 'Could not delete: storage is unavailable.'; } } ask = null; render(); return; }
    if (t.dataset.load) { ask = 'load:' + t.dataset.load; savedMsg = ''; render(); return; }
    if (t.dataset.loadYes) { loadSaved(t.dataset.loadYes); return; }
    if (t.dataset.addOwned !== undefined) { UI.addOwned = true; UI.addType = 'house'; UI.addLoan = ''; goto('add'); return; }
    const vw = t.closest('[data-view]'); if (vw) { UI.view = vw.dataset.view; prev = {}; save(); render(); return; }
    const ex = t.closest('[data-exit]'); if (ex) { const hh = H(routeOf().slice(2)); if (hh) { hh.exit = ex.dataset.exit; save(); render(); } return; }
    if (t.dataset.tab) { if (t.dataset.tab === 'hide') UI.open = false; else { UI.open = true; UI.tab = t.dataset.tab; } save(); render(); return; }
    const ib = t.closest('[data-info]'); if (ib) { infoKey = ib.dataset.info; infoFrom = { key: infoKey, idx: [...app.querySelectorAll(`[data-info="${infoKey}"]`)].indexOf(ib) }; render(); return; }
    if (t.closest('[data-info-close]')) { infoKey = null; render(); return; }
    if (t.dataset.addjob !== undefined) { const hourly = t.dataset.addjob === 'hourly'; S.p.jobs.push(hourly ? { id: 'job' + Date.now().toString(36), name: 'Hourly job', kind: 'hourly', wage: 15, tips: 0, weeks: 50, hours: 25, raise: 0, tax: null, start: 0, end: null } : { id: 'job' + Date.now().toString(36), name: 'New job', kind: 'salary', gross: 60000, raise: 0, tax: null, hours: 40, start: 0, end: null }); S.p = E.normalizePersonal(S.p); save(); render(); return; }
    const jk = t.closest('[data-jobkind]'); if (jk) { const [jid, kind] = jk.dataset.jobkind.split(':'), jb = S.p.jobs.find((q) => q.id === jid); if (jb) { jb.kind = kind; if (kind === 'hourly' && !(jb.wage > 0)) { jb.wage = 15; jb.hours = Math.min(jb.hours || 25, 40); } S.p = E.normalizePersonal(S.p); save(); render(); } return; }
    if (t.dataset.addplanned !== undefined) { S.p.planned.push({ id: 'pl' + Date.now().toString(36), name: 'New expense', amount: 10000, month: 12 }); save(); render(); return; }
    if (t.dataset.addcap !== undefined) { S.p.capital.push({ id: 'cap' + Date.now().toString(36), name: 'Partner or investor', amount: 100000, month: 12 }); save(); render(); return; }
    if (t.dataset.dp) { ask = 'dp:' + t.dataset.dp; render(); return; }
    if (t.dataset.dpYes) { const [kind, id] = t.dataset.dpYes.split(':'), key = { job: 'jobs', pl: 'planned', cap: 'capital' }[kind]; if (key) S.p[key] = S.p[key].filter((q) => q.id !== id); ask = null; save(); render(); return; }
    if (t.dataset.add !== undefined) { if (E.TYPES[t.dataset.add]) { UI.addType = t.dataset.add; UI.addLoan = ''; } UI.addOwned = false; goto('add'); return; }
    const at = t.closest('[data-addtype]'); if (at) { UI.addType = at.dataset.addtype; UI.addLoan = ''; render(); return; }
    const pk = t.closest('[data-pickloan]'); if (pk) { UI.addLoan = pk.dataset.pickloan; render(); return; }
    if (t.dataset.confirmAdd) { const [tp, lid] = t.dataset.confirmAdd.split('|'); const own = !!UI.addOwned, h = E.newAsset(tp, lid, own ? { fresh: true, status: 'owned', paid: 12 } : { fresh: true }); UI.addOwned = false; E.register(S, h); S.houses.push(h); UI.coll[(own ? 'cat-owned-' : 'cat-') + tp] = false; selId = null; page = own ? 'real' : 'planned'; save(); goto('h/' + h.id); return; }
    if (t.dataset.del) { ask = 'del:' + t.dataset.del; render(); return; }
    if (t.dataset.delYes) { const gone = H(t.dataset.delYes); undo = gone ? { label: gone.addr, snap: JSON.stringify(S) } : null; S = E.without(S, t.dataset.delYes); E.relink(S); if (selId === t.dataset.delYes) selId = null; ask = null; save(); goto(''); render(); return; }
    if (t.dataset.undo !== undefined) { if (undo) { S = E.normalize(JSON.parse(undo.snap)); S.v = DATA_V; if (undo.sid) { SAVED = SAVED.filter((q) => q.id !== undo.sid); saveSaved(); } undo = null; page = 'planned'; selId = null; save(); render(); } return; }
    if (t.dataset.askCancel !== undefined) { ask = null; pendingImport = null; render(); return; }
    if (t.dataset.hidelegend !== undefined) { UI.hideLegend = true; save(); render(); return; }
    if (t.dataset.togglepaste !== undefined) { UI.paste = !UI.paste; render(); return; }
    const cs = t.closest('[data-coll]'); if (cs) { const id = cs.dataset.coll, cur = UI.coll[id] === undefined ? !!CDEF[id] : UI.coll[id], had = document.activeElement === cs; UI.coll[id] = !cur; save(); render(); if (had) { const n = app.querySelector(`[data-coll="${id}"]`); if (n) n.focus(); } return; }
    if (t.dataset.status) { const h = H(routeOf().slice(2)); h.status = t.dataset.status; save(); render(); return; }
    if (t.dataset.export !== undefined) { exportOpen = !exportOpen; if (exportOpen) { try { localStorage.setItem('rep-v4-backup', String(Date.now())); } catch (x) {} } render(); return; }
    if (t.dataset.copybackup !== undefined) { const m = document.getElementById('cbm'), ta = document.getElementById('bkout'); const fail = () => { ta.focus(); ta.select(); m.textContent = 'Select the text above and copy it by hand.'; };
      try { navigator.clipboard.writeText(ta.value).then(() => { m.textContent = 'Copied.'; }, fail); } catch (x) { fail(); } return; }
    if (t.dataset.restoreText !== undefined) { const ta = document.getElementById('bkin'); stageBackup(ta ? ta.value : ''); return; }
    if (t.dataset.importYes !== undefined) { const bk = { saved: pendingImport.saved, openOn: pendingImport.openOn }; S = E.normalize(pendingImport); delete S.saved; delete S.openOn; if (!S.p) S.p = E.samplePersonal(); S.v = DATA_V; fixOrder(S); if (Array.isArray(bk.saved)) { SAVED = cleanSaved(bk.saved); saveSaved(); } if (PAGES.indexOf(bk.openOn) >= 0) UI.openOn = bk.openOn; page = UI.openOn; pendingImport = null; notice = ''; save(); goto(''); render(); return; }
    { const bt = t.closest('button') || t, sc = SCN.find((x) => bt.dataset[x.k] !== undefined || bt.dataset[x.k + 'Yes'] !== undefined); if (sc) { if (bt.dataset[sc.k + 'Yes'] !== undefined) loadScenario(sc); else { ask = sc.k; render(); } return; } }
    const mvb = t.closest('[data-move]'); if (mvb) { const [id, d] = mvb.dataset.move.split(':'); moveBy(id, +d); return; }
    const dpb = t.closest('[data-dup]'); if (dpb) { const c = E.duplicate(S, dpb.dataset.dup); if (c) { ask = null; UI.coll['cat-' + (c.type || 'house')] = false; save(); if (routeOf().startsWith('h/')) { selId = null; goto('h/' + c.id); } else { selId = c.id; page = 'planned'; /* the copy is always planned */ render(); } } return; }
    const rwEl = t.closest('[data-row]'); if (rwEl && !t.closest('[data-go]') && !t.closest('.panel')) { if (Date.now() - lastDragEnd < 350) return; if (t.closest('[data-panel]')) { selId = selId === rwEl.dataset.row ? null : rwEl.dataset.row; ask = null; render(); return; } if (!t.closest('select,input,textarea,a,[data-info],button:not(.addrbtn)')) { goto('h/' + rwEl.dataset.row); return; } }
    const go = t.closest('[data-go]'); if (go) goto(go.dataset.go);
  });
  /* ---------- reorder: Move up/down buttons and press-and-hold drag. List order = buy order; the trust funds each asset from everything before it, so nothing needs relinking. ---------- */
  let lastDragEnd = 0, drag = null, press = null, navSeen = 0;
  const visibleIds = (h0) => { const pl = E.plan(S); return S.houses.filter((x) => (x.type || 'house') === (h0.type || 'house') && (x.status === 'owned') === (h0.status === 'owned') && !(pl.exits[x.id] && pl.sellAt[x.id] <= pl.planM)).map((x) => x.id); }; /* the rows of one list: same kind of asset, bought or planned */
  function moveBy(id, d) {
    const h = H(id); if (!h) return; const vis = visibleIds(h), i = vis.indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= vis.length) return;
    [vis[i], vis[j]] = [vis[j], vis[i]]; E.reorder(S, vis); save(); render();
    const nb = app.querySelector(`[data-move="${id}:${d}"]`) || app.querySelector(`[data-move="${id}:${-d}"]`); if (nb && !nb.disabled) nb.focus();
  }
  const LONG = 450;
  function startDrag() {
    if (!press) return; const row = press.el, wrap = row.closest('.rw'), body = wrap && wrap.parentElement; if (!body) { press = null; return; }
    app.classList.add('dragmode'); /* open panels fold away so every row is the same size while it moves */
    const items = [...body.children].filter((c) => c.classList && c.classList.contains('rw')), sy = window.scrollY;
    const rects = items.map((el) => ({ el, top: el.getBoundingClientRect().top + sy, h: el.offsetHeight })), idx = items.indexOf(wrap);
    drag = { id: press.id, items, rects, idx, to: idx, h: rects[idx].h, off: press.y + sy - rects[idx].top, y: press.y, wrap };
    wrap.classList.add('lift'); try { row.setPointerCapture(press.pid); } catch (e) {}
    selId = null; ask = null; press = null; dragLoop();
  }
  function dragUpdate() {
    const d = drag; if (!d) return; const sy = window.scrollY, first = d.rects[0].top, last = d.rects[d.rects.length - 1].top + d.rects[d.rects.length - 1].h - d.h;
    const top = Math.min(last, Math.max(first, d.y + sy - d.off)); d.wrap.style.transform = `translateY(${top - d.rects[d.idx].top}px)`;
    const c = d.y + sy; let to = 0; /* where the finger is, not the dragged row's centre: rows differ in height, so a taller row could never pass a shorter one above it */ d.rects.forEach((r, j) => { if (j !== d.idx && r.top + r.h / 2 < c) to++; }); d.to = to;
    d.rects.forEach((r, j) => { if (j === d.idx) return; const sh = d.idx < to && j > d.idx && j <= to ? -d.h : d.idx > to && j >= to && j < d.idx ? d.h : 0; r.el.style.transform = sh ? `translateY(${sh}px)` : ''; });
  }
  function dragLoop() {
    if (!drag) return; const z = 90, y = drag.y, H0 = window.innerHeight; let v = 0;
    if (y < z) v = -Math.min(18, (z - y) / 4); else if (y > H0 - z) v = Math.min(18, (y - (H0 - z)) / 4);
    if (v) window.scrollBy(0, v); dragUpdate(); drag.raf = requestAnimationFrame(dragLoop);
  }
  function endDrag(commit) {
    const d = drag; drag = null; press = null; if (!d) return; cancelAnimationFrame(d.raf);
    d.items.forEach((el) => { el.style.transform = ''; el.classList.remove('lift'); }); app.classList.remove('dragmode'); lastDragEnd = Date.now();
    if (commit && d.to !== d.idx) { const ids = d.items.map((el) => el.dataset.rw); ids.splice(d.to, 0, ids.splice(d.idx, 1)[0]); E.reorder(S, ids); save(); }
    render();
  }
  app.addEventListener('pointerdown', (e) => {
    if (drag) return; if (e.pointerType === 'mouse' && e.button !== 0) return;
    const row = e.target.closest && e.target.closest('.row[data-row]'); if (!row || row.hasAttribute('data-nodrag') || e.target.closest('select,input,textarea,a,[data-info]')) return;
    clearTimeout(press && press.timer); press = { id: row.dataset.row, el: row, x: e.clientX, y: e.clientY, pid: e.pointerId }; press.timer = setTimeout(startDrag, LONG);
  });
  document.addEventListener('pointermove', (e) => {
    if (drag) { drag.y = e.clientY; dragUpdate(); return; }
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) { clearTimeout(press.timer); press = null; }
  });
  const pend = (commit) => (e) => { if (drag) { if (e.type === 'pointerup') { drag.y = e.clientY; dragUpdate(); } endDrag(commit); } else if (press) { clearTimeout(press.timer); press = null; } };
  document.addEventListener('pointerup', pend(true)); document.addEventListener('pointercancel', pend(false));
  document.addEventListener('touchmove', (e) => { if (drag && e.cancelable) e.preventDefault(); }, { passive: false }); /* iOS: stop the page scrolling under the dragged row */
  app.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest('.row[data-row]')) e.preventDefault(); });

  /* ---------- touch gestures: swipe right from the left edge = back; swipe down = close the keyboard ---------- */
  function swipeBack() {
    if (infoKey) { infoKey = null; render(); return; }
    if (!routeOf()) return; if (navSeen > 0 && history.length > 1) history.back(); else goto('');
  }
  let sw = null, kb = null, pgSw = null; const FIELD = 'input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=file]),textarea,select';
  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; sw = null; kb = null; if (!t || e.touches.length !== 1) return;
    if (t.clientX <= 24 && !drag && !(e.target.closest && e.target.closest('input,select,textarea,[type=range],.sheet'))) sw = { x: t.clientX, y: t.clientY };
    if (!(e.target.closest && e.target.closest(FIELD))) kb = { y: t.clientY };
    pgSw = !routeOf() && t.clientX > 24 && !drag && !infoKey && !(e.target.closest && e.target.closest('input,select,textarea,[type=range],.sheet,svg.nw,.row,.panel')) ? { x: t.clientX, y: t.clientY } : null;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0]; if (!t) return;
    if (sw && (Math.abs(t.clientY - sw.y) > 45 || drag)) sw = null;
    if (pgSw && (Math.abs(t.clientY - pgSw.y) > 45 || drag)) pgSw = null;
    const a = document.activeElement; if (kb && a && a.matches && a.matches(FIELD) && t.clientY - kb.y > 28 && !drag) { kb = null; a.blur(); }
  }, { passive: true });
  document.addEventListener('touchend', (e) => { const t = e.changedTouches[0]; if (sw && t && t.clientX - sw.x > 70 && Math.abs(t.clientY - sw.y) < 45 && !drag) swipeBack();
    else if (pgSw && t && !routeOf() && Math.abs(t.clientX - pgSw.x) > 70 && Math.abs(t.clientY - pgSw.y) < 45 && !drag) { const i = PAGES.indexOf(page) + (t.clientX < pgSw.x ? 1 : -1); if (i >= 0 && i < PAGES.length) showPage(PAGES[i]); }
    sw = null; kb = null; pgSw = null; }, { passive: true });
  document.addEventListener('touchcancel', () => { sw = null; kb = null; pgSw = null; }, { passive: true });
  app.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !/^(checkbox|radio|file|range)$/.test(e.target.type)) e.target.blur(); });

  render();
  /* local-first plumbing: ask the browser to keep our data, and cache the app for offline use */
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  /*SW*/if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});/*ENDSW*/
  window.__app = { get state() { return S; } };
})();
