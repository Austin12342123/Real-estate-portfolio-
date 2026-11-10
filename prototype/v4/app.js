/* Portfolio app v3 — UI layer. All math lives in engine.js. Data never leaves the device (localStorage; IndexedDB in the final build). */
(function () {
  const E = window.Engine, KEY = 'rep-v4', UIKEY = 'rep-v4-ui';
  let S, UI = { tab: 'timeline', open: false, coll: { drivers: true }, hideLegend: false, addType: 'house', addLoan: '', view: 'plan' };
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  const DATA_V = 9; /* bump when the sample portfolio changes so old saved samples are replaced */
  if (S && Array.isArray(S.houses) && S.g && S.v === 8) { S.p = S.p || E.samplePersonal(); S.v = DATA_V; } /* v8 saves keep their assets and gain a finance profile */
  if (!S || !Array.isArray(S.houses) || !S.g || S.v !== DATA_V) S = E.seed();
  E.normalize(S); if (!S.p) S.p = E.samplePersonal(); S.p = E.normalizePersonal(S.p); S.v = DATA_V;
  const fixOrder = (s) => { s.seq = +s.seq || 0; s.houses.forEach((h) => { if (!h.created) h.created = Date.now(); }); if (s.orderV !== 1) E.orderByBuy(s); return s; }; /* list order = buy order, sorted once; after that the saved order is the truth */
  fixOrder(S);
  try { UI = Object.assign(UI, JSON.parse(localStorage.getItem(UIKEY)) || {}); } catch (e) {}
  let storageOK = true, impName = '', imp = null, ask = null, notice = '', pendingImport = null, exportOpen = false, undo = null, selId = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(UIKEY, JSON.stringify(UI)); storageOK = true; } catch (e) { storageOK = false; } };
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
  const TS = { house: 'Home', commercial: 'Comm.', business: 'Biz' }, TL = { house: 'Home', commercial: 'Commercial', business: 'Business' }, TPL = { house: 'Single-family homes', commercial: 'Commercial properties', business: 'Businesses' };
  const grp = (n) => Math.round(num(n)).toLocaleString('en-US');
  const mo = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m < 24 ? m + ' mo' : Math.floor(m / 12) + 'y ' + (m % 12) + 'm');
  const mm = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m + ' mo'); /* credit-line timing: plain months */
  const mmy = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m < 24 ? m + ' mo' : m + ' mo (' + Math.floor(m / 12) + 'y ' + (m % 12) + 'm)');
  const r = (n, d = 0) => (isFinite(n) ? String(+n.toFixed(d)) : '—');
  const GL = (window.Info && window.Info) || { INFO: {}, LABEL: {}, LOAN: {} }, INFO = GL.INFO;
  const infoBtn = (k) => (INFO[k] ? `<button type="button" class="info" data-info="${k}" aria-label="What does ${(INFO[k].t || '').replace(/"/g, '')} mean?"><span aria-hidden="true">i</span></button>` : '');
  let infoKey = null, infoFrom = null; /* infoFrom = which (i) opened the sheet, so focus can go back to it */
  const sheetHtml = () => { const d = INFO[infoKey]; return d ? `<div class="sheet-bg" data-info-close></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="infot" data-testid="info-sheet"><div class="grab"></div><h3 id="infot">${esc(d.t)}</h3><p>${esc(d.b)}</p>${d.e ? `<p class="eg"><b>Example:</b> ${esc(d.e)}</p>` : ''}<button class="btn" data-info-close data-testid="info-close">Got it</button></div>` : ''; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- reusable bits ---------- */
  const field = (label, p, val, o = {}) => `<label class="f ${o.calc ? 'calc' : ''}"><span class="lb">${label}${infoBtn(o.info || GL.LABEL[label])}${o.calc ? ' <i class="auto" title="calculated from your other numbers — tap to override">auto</i>' : ''}</span><span class="iw">${o.pre ? `<em>${o.pre}</em>` : ''}<input inputmode="decimal" data-p="${p}" data-k="${p}" aria-label="${esc(label)}" ${o.ro ? 'readonly tabindex="-1"' : ''} ${o.ph ? 'placeholder="' + esc(o.ph) + '"' : ''} value="${val}">${o.suf ? `<em>${o.suf}</em>` : ''}</span></label>`;
  const targetSel = (h) => `<select data-sel="${h.id}" class="${h.target ? '' : 'notarget'}" aria-label="Line of credit on ${esc(h.addr)} funds">${'<option value="">Choose…</option>' + S.houses.filter((x) => x.id !== h.id).map((x) => `<option value="${x.id}" ${h.target === x.id ? 'selected' : ''}>${esc(x.addr)}</option>`).join('')}</select>`;
  const kpi = (id, label, val, sub, cls, sm) => `<div class="kpi ${sm ? 'sm' : ''}"><small>${label}${infoBtn(GL.LABEL[label])}</small><b class="${cls || ''}" data-testid="${id}" data-k="${id}">${val}</b>${sub ? `<span class="sub">${sub}</span>` : ''}</div>`;

  const CDEF = {};
  const colSec = (id, title, sum, inner, defCollapsed) => { CDEF[id] = !!defCollapsed; const open = !(UI.coll[id] === undefined ? !!defCollapsed : UI.coll[id]); return `<div class="sec cs" data-coll="${id}" role="button" tabindex="0" aria-expanded="${open}"><span>${title}</span><span class="cx">${open ? 'Hide ▾' : esc(sum) + ' ▸'}</span></div>${open ? inner : ''}`; };
  const confirmBox = (msg, yesAttr, yesLabel) => `<div class="confirm" role="alertdialog"><p>${msg}</p><button class="btn danger" ${yesAttr}>${yesLabel}</button><button class="btn plain" data-ask-cancel>Cancel</button></div>`;

  /* ---------- plan visuals ---------- */
  function timeline(pl) {
    const steps = [...pl.rows].sort((a, b) => (isFinite(a.start) ? a.start : 1e9) - (isFinite(b.start) ? b.start : 1e9));
    if (!steps.length) return '<p class="note">Choose a funding target on a house to see the chain.</p>';
    const fin = steps.filter((x) => x.ok).map((x) => x.end), max = Math.max(12, ...fin) * 1.06, pc = (m) => (m / max) * 100;
    const ys = max <= 60 ? 1 : max <= 120 ? 2 : 5, tk = [];
    for (let y = 0; y * 12 <= max; y += ys) tk.push(y);
    const grid = tk.map((y) => `<i class="tk" style="left:${pc(y * 12)}%"><span>${y ? y + 'y' : 'Now'}</span></i>`).join('');
    const rows = steps.map((x) => { const h = H(x.id), t = H(x.target), startOk = isFinite(x.start);
      return `<div class="tr" data-go="h/${h.id}"><div class="tl">${esc(h.addr)} <b>→ ${esc(t.addr)}</b></div><div class="trk">${grid}${x.ok ? `<span class="seg2 ${h.status === 'planned' ? 'pl' : ''}" style="left:${pc(x.start)}%;width:${Math.max(1.5, pc(x.end - x.start))}%"></span><span class="dot" style="left:${pc(x.end)}%"></span>` : '<span class="nr">not reachable</span>'}</div>
      <div class="tm">${x.ok ? `${x.start ? `starts ${mm(x.start)} · ` : ''}LOC ready <b>${mm(x.end)}</b>${x.funds ? '' : ' (not used — target bought sooner)'}` : startOk ? 'the debt cap leaves no room' : 'waiting on an earlier house'}</div></div>`; }).join('');
    return `<div class="tlw" data-testid="timeline">${rows}</div><p class="note">Bar = paying down until the line of credit opens · ● = buy the next house. Tap a row to edit.</p>`;
  }
  function nwChart(pl) {
    const T = Math.max(12, Math.min(pl.T, pl.planM)), s = pl.series.nw.slice(0, T + 1);
    const W = 340, Hh = 170, pad = 10, min = Math.min(0, ...s), max = Math.max(1, ...s);
    const x = (t) => pad + (t / T) * (W - 2 * pad), y = (v) => Hh - 24 - ((v - min) / (max - min || 1)) * (Hh - 44);
    const step = Math.max(1, Math.ceil(T / 160)); let d = '';
    for (let t = 0; t <= T; t += step) d += (d ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(s[t]).toFixed(1);
    d += 'L' + x(T).toFixed(1) + ' ' + y(s[T]).toFixed(1);
    const ys = T <= 60 ? 1 : T <= 120 ? 2 : T <= 240 ? 5 : 10; let ticks = '';
    for (let yr = 0; yr * 12 <= T; yr += ys) ticks += `<text x="${x(yr * 12)}" y="${Hh - 8}" text-anchor="${yr === 0 ? 'start' : 'middle'}">${yr ? yr + 'y' : 'Now'}</text>`;
    const buyList = S.houses.filter((h) => isFinite(pl.purchase[h.id]) && pl.purchase[h.id] > 0 && pl.purchase[h.id] <= T);
    const buys = buyList.map((h) => `<circle cx="${x(pl.purchase[h.id])}" cy="${y(s[pl.purchase[h.id]])}" r="4.5" class="buy"><title>${esc(h.addr)} bought in ${mm(pl.purchase[h.id])}</title></circle>`).join('');
    const ev = buyList.map((h) => pl.purchase[h.id] + ':' + h.addr.replace(/[|:]/g, ' ')).join('|');
    return `<div class="chartwrap"><svg class="nw" data-testid="networth-chart" viewBox="0 0 ${W} ${Hh}" data-w="${W}" data-h="${Hh}" data-pad="${pad}" data-t="${T}" data-min="${min}" data-max="${max}" data-nw="${s.map((v) => Math.round(v)).join(',')}" data-ev="${esc(ev)}" role="img" aria-label="Net worth over time, ${$f(s[0])} now to ${$f(s[T])} in ${mo(T)}. Hover or drag to read values.">
      <line class="ax" x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}"/><path class="ar" d="${d}L${x(T)} ${y(0)}L${x(0)} ${y(0)}Z"/><path class="ln" d="${d}"/>${buys}${ticks}
      <text x="${pad}" y="12">${$f(max)}</text>${min < 0 ? `<text x="${pad}" y="${y(min) - 4}">${$f(min)}</text>` : ''}
      <line class="xh" id="nwx" y1="14" y2="${Hh - 24}" x1="0" x2="0" visibility="hidden"/><circle class="hv" id="nwd" r="5.5" cx="0" cy="0" visibility="hidden"/><rect class="hit" x="0" y="0" width="${W}" height="${Hh}"/></svg>
      <div class="tip" id="nwtip" hidden></div></div><p class="note">Net worth = value − loans − other liens − lines of credit drawn. Hover or drag across the line to read it. ● = a house is bought.</p>`;
  }
  function nwHover(e) {
    const svg = e.target.closest && e.target.closest('svg.nw'); if (!svg) return;
    const d = svg.dataset, r0 = svg.getBoundingClientRect(), W = +d.w, Hh = +d.h, pad = +d.pad, T = +d.t, min = +d.min, max = +d.max, sc = r0.width / W;
    const t = Math.max(0, Math.min(T, Math.round(((e.clientX - r0.left) / sc - pad) / (W - 2 * pad) * T)));
    const v = +d.nw.split(',')[t], cx = pad + (t / T) * (W - 2 * pad), cy = Hh - 24 - ((v - min) / (max - min || 1)) * (Hh - 44);
    const ln = svg.querySelector('#nwx'), dot = svg.querySelector('#nwd'), tip = document.getElementById('nwtip');
    ln.setAttribute('x1', cx); ln.setAttribute('x2', cx); dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); ln.setAttribute('visibility', 'visible'); dot.setAttribute('visibility', 'visible');
    const hit = (d.ev || '').split('|').map((q) => q.split(':')).filter((q) => q[0] && +q[0] === t).map((q) => q[1]);
    tip.innerHTML = `<b>${$f(v)}</b><span>${t === 0 ? 'today' : 'in ' + mm(t) + (t >= 24 ? ' (' + mo(t) + ')' : '')}${hit.length ? ' · bought ' + esc(hit.join(', ')) : ''}</span>`;
    tip.hidden = false;
    const w = tip.offsetWidth, left = Math.min(Math.max(cx * sc - w / 2, 0), r0.width - w);
    tip.style.left = left + 'px'; tip.style.top = Math.max(cy * sc - tip.offsetHeight - 12, 0) + 'px';
  }
  function nwLeave(e) {
    const svg = e.target && e.target.closest && e.target.closest('svg.nw'); if (!svg) return;
    ['#nwx', '#nwd'].forEach((q) => svg.querySelector(q).setAttribute('visibility', 'hidden')); const tip = document.getElementById('nwtip'); if (tip) tip.hidden = true;
  }

  /* ---------- main page ---------- */
  function main() {
    const pl = E.plan(S), t0 = pl.today, tf = pl.final, th = pl.horizon, g = S.g, yrs = g.planYears, owned = S.houses.filter((h) => h.status === 'owned');
    const sn = th, snapBy = {}; pl.snap.forEach((x) => (snapBy[x.id] = x));
    const tot = S.houses.reduce((s, h) => s + E.view(S, h).X, 0), totNow = pl.extraNow, totLater = pl.extraLater;
    const n = S.houses.length, sched = n - pl.unfunded.length;
    const paySub = (h2, v2) => { const parts = []; if (v2.P > 0) parts.push((h2.io ? 'interest ' : 'P&amp;I ') + $f(v2.P)); if (v2.X > 0.5) parts.push('extra ' + $f(v2.X)); if (v2.escrow > 0) parts.push('costs ' + $f(v2.escrow)); if (v2.mip > 0) parts.push('insurance ' + $f(v2.mip)); return parts.length > 1 ? parts.join(' + ') : ''; };
    /* the expanded panel under a selected row: the extra payment and what it does, plus move / duplicate / details / remove */
    const panelOf = (h, soldBy, vis, ci) => {
      const v = pl.V[h.id], t = H(h.target), X = v.X, P = 'h.' + h.id + '.';
      let eff = '';
      if (!soldBy) {
        const pay0 = E.payoffN(h, 0), payX = v.payoff, hasLoan = v.L > 0;
        const term = !hasLoan ? 'No loan on this asset' : !isFinite(payX) ? (h.io ? 'Interest-only: not paid off' : 'Payment does not cover interest') : 'Paid off in ' + mmy(payX);
        const termSub = !hasLoan ? '' : X > 0.5 ? (!isFinite(pay0) ? (isFinite(payX) ? 'it never pays off without the extra' : '') : pay0 - payX > 0 ? mmy(pay0 - payX) + ' sooner than with no extra' : 'same as with no extra') : 'extra payments pay it off sooner';
        let nxt, nxtSub = '', nxtAttr = '';
        if (!t) { nxt = 'Pick what this funds'; nxtSub = 'Choose an asset in Funds above to see when its down payment can be afforded.'; }
        else {
          const open = pl.purchase[h.id] + v.locM, l0 = E.locMonths(S, h, 0), lnc = E.locMonths(S, h, X, { noCash: true }), soon = isFinite(l0) && isFinite(v.locM) ? l0 - v.locM : 0, cfm = isFinite(lnc) && isFinite(v.locM) ? lnc - v.locM : 0;
          nxt = !isFinite(open) ? 'not reachable' : open <= 0 ? 'now' : 'in ' + mmy(open);
          nxtSub = (X > 0.5 ? (soon > 0 ? mmy(soon) + ' sooner than with no extra' : 'no faster than with no extra') : 'extra payments make it sooner') + ' · ' + (v.cfSaved > 0.5 ? 'your ' + $f(v.cfSaved) + '/mo cash flow is saved toward it' + (cfm > 0 ? ' (' + mmy(cfm) + ' sooner)' : '') : 'cash flow is ' + $s(v.cf) + '/mo, so nothing is saved toward it') + (pl.funds[h.id] ? '' : ' · ' + esc(t.addr) + ' is bought sooner another way');
          nxtAttr = ` data-open="${isFinite(open) ? open : ''}" data-sooner="${soon}" data-cf-sooner="${cfm}"`;
        }
        eff = `<div class="eff" data-testid="extra-effects">
          <div class="el"><span class="elk">Loan</span><b data-testid="eff-term" data-k="eff-term-${h.id}" data-months="${isFinite(payX) ? payX : ''}" data-base="${isFinite(pay0) ? pay0 : ''}">${term}</b><small>${termSub}</small></div>
          <div class="el"><span class="elk">Payment now</span><b data-testid="eff-payment" data-k="eff-pay-${h.id}">${$f(v.payment)}</b><small>${paySub(h, v) || 'no loan payment'}</small></div>
          <div class="el"><span class="elk">Next down payment${t ? ' · ' + esc(t.addr) : ''}${infoBtn('nextdp')}</span><b data-testid="eff-next" data-k="eff-next-${h.id}"${nxtAttr}>${nxt}</b><small>${nxtSub}</small></div></div>`;
      }
      const mv = !soldBy && vis.length > 1;
      return `<div class="panel" data-testid="asset-panel" data-for="${h.id}">
        ${soldBy ? '<p class="note" style="margin:0 0 6px">Sold in this plan, so there is no extra payment to set.</p>' : `<label class="f ex ${h.driver === 'months' && t ? 'calc' : ''}"><span class="lb">Extra payment / month${infoBtn('extra')}</span><span class="iw"><em>$</em><input inputmode="decimal" data-testid="extra-input" data-p="${P}extra" data-k="x-${h.id}" aria-label="Extra monthly payment for ${esc(h.addr)}" value="${grp(X)}"></span></label>`}
        ${eff}
        <div class="pact">${mv ? `<button class="pbtn" data-move="${h.id}:-1" data-testid="move-up" ${ci === 0 ? 'disabled' : ''}>↑ Move up</button><button class="pbtn" data-move="${h.id}:1" data-testid="move-down" ${ci === vis.length - 1 ? 'disabled' : ''}>↓ Move down</button>` : ''}<button class="pbtn" data-dup="${h.id}" data-testid="row-duplicate">Duplicate</button><button class="pbtn" data-go="h/${h.id}" data-testid="open-details">Open details ›</button></div>
        ${ask === 'del:' + h.id ? confirmBox('Remove ' + esc(h.addr) + '? Anything it funds loses its credit-line source.', 'data-del-yes="' + h.id + '"', 'Yes, remove') : `<button class="rm" data-del="${h.id}" data-testid="row-remove" aria-label="Remove ${esc(h.addr)}">Remove</button>`}</div>`;
    };
    const isSold = (h) => !!(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM);
    const rowOf = (h, vis, ci) => {
      const v = pl.V[h.id], t = H(h.target), p = pl.purchase[h.id], type = h.type || 'house', sel = selId === h.id;
      const tag = TS[type] + (h.status === 'owned' ? '' : ' · ' + (isFinite(p) ? 'buy ' + mm(p) : 'unfunded'));
      const exitTxt = h.exit === 'sell' && isFinite(pl.sellAt[h.id]) ? `sells in ${mm(pl.sellAt[h.id])}` : h.exit === 'merge' && isFinite(pl.mergeAt[h.id]) ? `merges${H(h.mergeInto) ? ' into ' + esc(H(h.mergeInto).addr) : ''} in ${mm(pl.mergeAt[h.id])}` : '';
      const sp = snapBy[h.id], soldBy = isSold(h);
      const loses = type === 'house' && v.cf < 0 ? '<span class="hi">loses money at today\'s terms</span>' : '';
      const loc = !t ? '' : !isFinite(p + v.locM) ? 'not reachable' : p + v.locM <= 0 ? 'opens now' : 'opens in ' + mm(p + v.locM);
      const hi = v.X > 2000 && v.X > 3 * v.P ? '<span class="hi">unusually high extra</span>' : '';
      return `<div class="rw" data-rw="${h.id}"><div class="row${soldBy ? ' sold' : ''}${sel ? ' sel' : ''}" data-row="${h.id}" data-testid="ledger-row"${soldBy ? ' data-nodrag' : ''}><div class="r1"><span class="nm"><button type="button" class="addrbtn" aria-expanded="${sel}" data-testid="row-toggle"><span class="addr" data-go="h/${h.id}" data-testid="row-edit" title="Edit ${esc(h.addr)}">${esc(h.addr)} <i class="ed" aria-hidden="true">edit ›</i></span><span class="pay" data-testid="row-payment" data-k="pay-${h.id}" data-equity="${sp ? Math.round(sp.equity) : ''}"><span class="tag">${tag}</span> ${soldBy ? 'sold' : sp ? (sp.payment > 0.5 ? $f(sp.payment) + '/mo' : v.payment > 0.5 ? 'paid off by then' : 'no loan') + ' · equity ' + $k(sp.equity) : 'not in the totals yet'} ${hi}${loses}</span>${(() => { const parts = []; if (h.capex) parts.push('improve ' + $c(h.capex)); if (soldBy) parts.push('sold for ' + $c(pl.exits[h.id].proceeds) + ' in ' + mm(pl.sellAt[h.id])); else if (exitTxt) parts.push(exitTxt); return parts.length ? `<span class="exitline">${parts.join(' · ')}</span>` : ''; })()}</button></span>
        <span class="cfl ${(sp ? sp.cf : 0) < 0 ? 'bad' : 'ok'}" data-testid="row-cashflow" title="This asset's share of the portfolio cash flow: income minus expenses and loan payments, before extra payments"><b data-k="cf-${h.id}">${soldBy ? '+' + $c(pl.exits[h.id].proceeds) : !sp ? '—' : $s(sp.cf) + '/mo'}</b><small>${soldBy ? 'cash from sale' : !sp ? 'not counted' : 'cash flow'}</small></span></div>
        <div class="r2">${soldBy ? `<div class="fcol"><span class="locline" data-testid="loc-line"></span></div>` : `<div class="fcol">${(() => { if (h.status !== 'planned') return ''; const srcs = S.houses.filter((x) => x.target === h.id && pl.funds[x.id]); if (srcs.length) return `<span class="locline" data-testid="dp-line">Down payment in ${mm(p)} · from ${esc(srcs[0].addr)}</span>`; if (isFinite(p)) return `<span class="locline" data-testid="dp-line">Bought in ${mm(p)} (set by you${S.houses.some((x) => x.target === h.id) ? '; its funder pays another way' : ''})</span>`; return `<span class="locline" data-testid="dp-line">Not funded yet</span>`; })()}<span class="locline" data-testid="loc-line">${loc ? 'its credit line ' + loc : ''}</span></div>`}${soldBy ? '' : `<button type="button" class="xtog" data-panel="${h.id}" aria-expanded="${sel}" data-testid="row-extra-toggle" aria-label="Extra payment">Extra ${sel ? '▴' : '▾'}</button>`}</div></div>${sel ? panelOf(h, soldBy, vis, ci) : ''}</div>`; };
    const NOUN = { house: ['home', 'homes'], commercial: ['commercial property', 'commercial properties'], business: ['business', 'businesses'] }, ADD = { house: 'home', commercial: 'commercial property', business: 'business' };
    const empty = !S.houses.length;
    const fin = S.p ? E.finance(S, pl) : null;
    /* the strip under a category name: number of assets, cash flow before and after the loans, total worth, DSCR, and how long cash lasts if ~45% of the assets stop earning (the biggest earners, rent gone, costs and loans still due) */
    const cfk = (n) => (n < 0 ? '−' : '+') + $k(Math.abs(n));
    const statStrip = (tp, list) => {
      const sn2 = pl.snap.filter((x) => x.type === tp && list.some((h) => h.id === x.id)), n2 = list.length;
      if (!tp || !sn2.length) return `<span class="cnt" data-testid="cat-count-${tp || 'sold'}">${n2}</span>`;
      const income = sn2.reduce((a, x) => a + x.income, 0), cf = sn2.reduce((a, x) => a + x.cf, 0), worth = sn2.reduce((a, x) => a + x.value, 0), ds = income - cf;
      const dscr = ds > 0.5 ? income / ds : null;
      const costOf = (x) => { const h = H(x.id); return h ? (+h.tax || 0) + (+h.ins || 0) + (+h.hoa || 0) : 0; };
      const k = Math.max(1, Math.round(sn2.length * 0.45)), lostOf = (x) => x.income + costOf(x), byLoss = sn2.slice().sort((a, b) => lostOf(b) - lostOf(a));
      const partial = cf - byLoss.slice(0, k).reduce((a, x) => a + lostOf(x), 0), allFail = -(ds + sn2.reduce((a, x) => a + costOf(x), 0));
      const useAll = partial >= 0, stress = useAll ? allFail : partial, cash = fin ? Math.max(0, fin.series.liquid[Math.min(fin.T, pl.planM)] || 0) : S.p ? +S.p.cash || 0 : 0;
      const last = stress >= -0.5 ? 'no bills' : cash <= 0 ? '0 mo' : cash / -stress >= 600 ? '50+ yr' : cash / -stress >= 24 ? r(cash / -stress / 12, 1) + ' yr' : Math.round(cash / -stress) + ' mo';
      const lastLab = useAll ? 'lasts, all fail' : 'lasts';
      const cell = (lab, val, tid, cls) => `<span class="sc"><b class="${cls || ''}" data-testid="${tid}-${tp}">${val}</b><small>${lab}</small></span>`;
      return `<span class="cnt" data-testid="cat-count-${tp}">${n2}</span>${cell('before loan', cfk(income), 'cat-before', '')}${cell('after loan', cfk(cf), 'cat-after', cf < 0 ? 'bad' : '')}${cell('worth', $k(worth), 'cat-worth', '')}${cell('DSCR', dscr === null ? '—' : r(dscr, 2), 'cat-dscr', dscr !== null && dscr < 1 ? 'bad' : '')}${cell(lastLab, last, 'cat-lasts', stress < -0.5 && cash / -stress < 6 ? 'bad' : '')}`;
    };
    const secOf = (id, title, list, tp) => {
      CDEF[id] = id === 'cat-house' || empty ? false : true; const open = !(UI.coll[id] === undefined ? CDEF[id] : UI.coll[id]), tid = tp || 'sold', lt = E.latestOf(list);
      const nn = tp ? NOUN[tp] : ['sold', 'sold'], sub = list.length ? statStrip(tp, list) : 'None yet';
      return `<section class="card cat${open ? ' open' : ''}${tp ? '' : ' soldcat'}" data-testid="cat-${tid}"><div class="cathw"><div class="cath" data-coll="${id}" role="button" tabindex="0" aria-expanded="${open}" data-testid="cat-header-${tid}"><span class="catt"><b>${title}</b></span><span class="chev" aria-hidden="true">›</span></div><div class="cats" data-testid="cat-sub-${tid}" aria-label="Latest added, for information only">${sub}</div></div>
        ${open ? `<div class="catbody" data-catbody="${tid}">${list.length ? list.map((h, i) => rowOf(h, list, i)).join('') : `<p class="none" data-testid="cat-empty-${tid}">None yet</p>`}${tp ? `<button class="addrow" data-add="${tp}" data-testid="add-${tp}">+ Add ${ADD[tp]}</button>` : ''}${list.length && tp ? '<p class="note" data-testid="cat-stat-note">Top numbers are per month at plan end. Lasts = how long your cash (as projected at plan end) covers the shortfall if about 45% of these assets (the biggest earners) stop paying rent while loans, taxes and insurance keep coming. If the rest still cover everything, it assumes every asset fails (“lasts, all fail”).</p>' : ''}${list.length > 1 && tp ? '<p class="note hold">Hold and drag ⋮⋮ to reorder. The asset above funds the one below.</p>' : ''}</div>` : ''}</section>`; };
    const soldList = S.houses.filter(isSold);
    const sections = [['house', 'Homes'], ['commercial', 'Commercial'], ['business', 'Businesses']].map(([tp, title]) => secOf('cat-' + tp, title, S.houses.filter((h) => (h.type || 'house') === tp && !isSold(h)), tp)).join('') + (soldList.length ? secOf('cat-sold', 'Sold', soldList, null) : '');
    if (empty) return `<h1>Portfolio <span class="hb"><button class="txtbtn" data-go="finances" data-testid="finances-link">Finances</button><button class="ic" data-go="settings" aria-label="Settings" data-testid="settings-link">⚙</button></span></h1>${undo ? `<div class="warnbox okbox" data-testid="undo-banner">Removed ${esc(undo.label)}. <button class="chip link" data-undo>Undo</button></div>` : ''}<p class="note" style="margin:0 4px 8px" data-testid="empty-note">Nothing added yet. Add a home, a commercial property or a business to see your plan.</p>${sections}<button class="linkbtn" data-go="import/new" data-testid="import-link">Import a home from a listing</button>`;
    const c3 = (label, a, b, c, f, cls) => `<tr><td>${label}</td><td data-k="c-${label}-a">${f(a)}</td><td data-k="c-${label}-b">${f(b)}</td><td class="${cls || ''}" data-k="c-${label}-c"><b>${f(c)}</b></td></tr>`;
    const bt = (tp) => pl.snap.filter((x) => x.type === tp).reduce((a, x) => ({ n: a.n + 1, value: a.value + x.value, equity: a.equity + x.equity, cf: a.cf + x.cf }), { n: 0, value: 0, equity: 0, cf: 0 });
    const bRow = (label, o, cls) => `<tr class="${cls || ''}"><td>${label}</td><td>${$c(o.value)}</td><td>${$c(o.equity)}</td><td class="${o.cf < 0 ? 'bad' : ''}">${$cs(o.cf)}</td></tr>`;
    const soldN = S.houses.filter((h) => pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM).length;
    const breakdown = `<table class="cmp" data-testid="breakdown"><thead><tr><th></th><th>Value</th><th>Equity</th><th>Cash flow/mo</th></tr></thead><tbody>
      ${['house', 'commercial', 'business'].map((tp) => { const o = bt(tp); return o.n ? bRow(TPL[tp] + ' (' + o.n + ')', o) : ''; }).join('')}
      ${sn.cash > 0.5 ? bRow('Sold' + (soldN ? ' (' + soldN + ')' : ''), { value: sn.cash, equity: sn.cash, cf: 0 }) : ''}
      ${bRow('Portfolio', { value: pl.snap.reduce((a, x) => a + x.value, 0), equity: sn.nw, cf: sn.cf }, 'tot')}</tbody></table>`;
    const warn = pl.unfunded.length ? `<div class="warnbox">⚠ ${pl.unfunded.length} planned asset${pl.unfunded.length > 1 ? 's are' : ' is'} never funded under the current numbers.</div>` : '';
    const health = pl.worst.dti > g.dti ? `<div class="warnbox">⚠ Debt-to-income peaks at ${r(pl.worst.dti)}% in ${mo(pl.worst.month)} (limit ${g.dti}%).</div>` : '';
    const outside = pl.outsideTotal > 0 ? `<div class="warnbox" data-testid="outside-cash">Needs <b>${$f(pl.outsideTotal)}</b> of outside cash (partners, investors, savings).<br><button class="chip link" data-go="finances" style="float:right">Details ›</button></div>` : '';
    const badHomes = S.houses.filter((h) => (h.type || 'house') === 'house' && pl.V[h.id].cf < 0);
    const homeWarn = badHomes.length ? `<div class="warnbox" data-testid="home-warning">⚠ Homes must cash flow positive. Losing money each month at today's terms: ${badHomes.map((h) => esc(h.addr)).join(', ')}.</div>` : '';
    const tab = UI.tab, nb = S.houses.filter((h) => h.status === 'planned' && isFinite(pl.purchase[h.id])).sort((a, b) => pl.purchase[a.id] - pl.purchase[b.id])[0];
    const headline = (nb ? `Next: buy <b>${esc(nb.addr)}</b> in <b>${mm(pl.purchase[nb.id])}</b>. ` : '') + (pl.unfunded.length ? `${pl.unfunded.length} not funded yet. ` : `All ${n} assets by <b>${mo(pl.lastBuy)}</b>. `) + `${pl.snap.length > 1 ? '' : ''}`;
    const drv = pl.assetsAt(pl.planM).sort((a, b) => b.equity - a.equity), drvOpen = !UI.coll.drivers;
    const drivers = `<button class="linkbtn leftbtn" data-coll="drivers" aria-expanded="${drvOpen}">What drives net worth ${drvOpen ? '▾' : '▸'}</button>${drvOpen ? `<div data-testid="drivers">${drv.slice(0, 6).map((d) => `<div class="drv"><span>${esc(d.addr)}</span><span><b>${$f(d.equity)}</b> <small>${th.nw > 0 ? r((d.equity / th.nw) * 100) : 0}%</small></span></div>`).join('')}<p class="note">Equity = value − loans − credit lines drawn. A sample like this leans on a few fast-growing businesses; check the growth rate on each.</p></div>` : ''}`;
    return `<h1>Portfolio <span class="hb"><button class="txtbtn" data-go="finances" data-testid="finances-link">Finances</button><button class="ic" data-go="settings" aria-label="Settings" data-testid="settings-link">⚙</button></span></h1>
    ${undo ? `<div class="warnbox okbox" data-testid="undo-banner">Removed ${esc(undo.label)}. <button class="chip link" data-undo>Undo</button></div>` : ''}
    ${storageOK ? '' : '<div class="warnbox">⚠ Storage is unavailable, so changes will not be saved. Export a backup from Assumptions.</div>'}
    <section class="card" data-testid="summary"><div class="kg">
      ${kpi('kpi-networth', 'Net worth', $f(sn.nw), `${n} assets · ${yrs}-yr plan`)}
      ${kpi('kpi-monthly', 'Total monthly payments', $f(sn.monthly), sn.extra > 0.5 ? `incl. ${$f(sn.extra)} extra` : 'sum of the rows below')}
      ${kpi('kpi-cashflow', 'Cash flow / mo', $s(sn.cf), sn.extra > 0.5 ? `${$s(sn.cfx)} after extra` : 'before tax · at plan end', sn.cf < 0 ? 'bad' : '', 1)}
      ${kpi('kpi-dscr', 'DSCR', r(sn.dscr, 2), sn.dscr >= 1.25 ? 'income ÷ loan payments (1.25+ is healthy)' : sn.dscr >= 1 ? 'thin (1.25+ is healthy)' : 'below 1.0', sn.dscr && sn.dscr < 1 ? 'bad' : '', 1)}</div>
      <div class="bar"><i class="${sn.cltv > g.cap ? 'over' : ''}" style="width:${Math.min(100, (sn.cltv / g.cap) * 100)}%"></i></div>
      <div class="cap"><span data-k="cltv">Debt ${r(sn.cltv)}% of value</span><span>cap ${g.cap}%</span></div>
            <p class="plan-line" data-testid="plan-headline">${headline}</p>
      ${fin ? `<div class="vrow big ${fin.status}" data-go="finances" data-testid="afford-line" role="link"><span class="vq"><b>Can I afford this?</b><span class="note">${esc(fin.headline.replace(/^(Yes|Tight|Not yet)\.\s*/, ''))}</span></span><span class="vgo"><span class="vchip ${fin.status}" data-testid="afford-chip">${VL[fin.status]}</span> ›</span></div>` : ''}</section>
    <div class="sec"><span>Your assets</span></div><section class="card" id="ledger" data-testid="ledger"><div class="row totrow" data-testid="ledger-total"><div class="r1"><span class="nm"><span class="addr">Portfolio total</span><div class="pay">${$f(sn.monthly)}/mo payments<br><span data-testid="total-extra" data-k="tot">${$f(totNow)}/mo extra now${totLater > 0.5 ? ' · +' + $f(totLater) + ' later' : ''}</span></div></span><span class="cfl ${sn.cf < 0 ? 'bad' : 'ok'}"><b data-testid="total-cf">${$s(sn.cf)}/mo</b><small>cash flow</small></span></div></div></section>
    ${sections}
    <button class="linkbtn" data-go="import/new" data-testid="import-link">Import from a listing</button>
    <section class="card" data-testid="plan-card"><b>Portfolio breakdown</b> <span class="note">${n} assets · last purchase ${mo(pl.lastBuy)}</span>
      ${breakdown}
      ${homeWarn}${outside}${warn}${health}${sn.cash > 0.5 ? `<p class="note" data-testid="cash-note">Sold = cash kept after selling costs and the loan payoff. It counts in net worth.</p>` : ''}${drivers}
      <div class="seg" role="tablist"><button data-tab="timeline" class="${tab === 'timeline' && UI.open ? 'on' : ''}" data-testid="timeline-toggle">Timeline</button><button data-tab="nw" class="${tab === 'nw' && UI.open ? 'on' : ''}" data-testid="networth-toggle">Net worth</button><button data-tab="hide" class="${!UI.open ? 'on' : ''}">Hide</button></div>
      ${UI.open ? (tab === 'nw' ? nwChart(pl) : timeline(pl)) : ''}</section>`;
  }

  /* ---------- house page ---------- */
  function house(h) {
    const pl = E.plan(S), v = pl.V[h.id], g = S.g, a = E.afford(S, h, pl), t = H(h.target), P = `h.${h.id}.`, type = h.type || 'house';
    const wo = E.plan(E.without(S, h.id)), p0 = pl.purchase[h.id];
    const sooner = t && isFinite(v.locM) ? v.locM - E.locMonths(S, h, v.X + 100) : 0;
    const src = S.houses.filter((x) => x.target === h.id), heloc = pl.funds[h.id] ? v.D : 0, debt = v.debtNow;
    const LB = { house: { rent: 'Monthly rent', sec: 'Rent & expenses', growth: 'Appreciation / yr', price: 'Price' }, commercial: { rent: 'Monthly rent (all tenants)', sec: 'Rent & operating costs', growth: 'Value growth / yr', price: 'Purchase price' }, business: { rent: 'Monthly owner profit', sec: 'Profit', growth: 'Business growth / yr', price: 'Purchase price' } }[type];
    const invested = v.invested, coc = invested > 0 ? ((v.cf * 12) / invested) * 100 : NaN, dscrH = v.P > 0 ? v.noi / v.P : NaN;
    const lo = E.LOANS.find((l) => l.id === h.loanId);
    const loanSel = `<div class="f stack"><span class="lb">Loan option${infoBtn('loanoption')}</span><select class="loansel" data-loan="${h.id}" aria-label="Loan option">${E.loansFor(type).map((l) => `<option value="${l.id}" ${h.loanId === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}<option value="custom" ${lo ? '' : 'selected'}>Custom terms</option></select></div>`;
    const ex = pl.exits[h.id];
    const exitSec = colSec('exit', 'Value-add & exit', h.exit === 'sell' && isFinite(pl.sellAt[h.id]) ? 'sell in ' + mm(pl.sellAt[h.id]) : h.exit === 'merge' && isFinite(pl.mergeAt[h.id]) ? 'merge in ' + mm(pl.mergeAt[h.id]) : h.capex ? 'improve ' + $c(h.capex) : 'none planned', `<section class="card" data-testid="exit-section">
      ${field('Improvement budget', P + 'capex', grp(h.capex), { pre: '$' })}${h.finCapex ? '<p class="note" data-testid="rehab-financed">Financed in your loan, so nothing extra is due at closing.</p>' : ''}${field('Months to finish', P + 'capexMonths', h.capexMonths)}${field('New appraised value', P + 'arv', grp(h.arv), { pre: '$' })}${field('Value gained (vs price + rehab)', P + 'gain', h.arv > 0 ? grp(v.valueGain) : '', { pre: '$', calc: 1 })}<p class="note">Type the new appraisal, or type how much value you expect to gain and the appraisal fills in. No appraisal means the value does not change.</p>${h.arv > 0 && h.arv < h.price + (h.capex || 0) ? '<p class="note" data-testid="arv-low">⚠ That appraisal is below price + rehab, so the work loses money.</p>' : ''}${field('Income lift', P + 'liftIncome', r(h.liftIncome, 1), { suf: '%' })}
      
      ${h.exit === 'sell' ? `${field('Sell in (months)', P + 'exitMonth', h.exitMonth)}${field('Selling costs', P + 'sellCost', r(h.sellCost, 1), { suf: '%' })}${ex ? field('Net proceeds', P + 'proceeds', grp(ex.proceeds), { pre: '$', calc: 1, ro: 1 }) : ''}<p class="note">Proceeds go to cash and count in net worth. Later purchases use that cash before outside money.</p>` : ''}
      ${h.exit === 'merge' ? `${field('Merge in (months)', P + 'exitMonth', h.exitMonth)}<div class="f"><span class="lb">Merge into</span><select class="loansel" data-merge="${h.id}" aria-label="Merge into"><option value="">Choose…</option>${S.houses.filter((x) => x.id !== h.id).map((x) => `<option value="${x.id}" ${h.mergeInto === x.id ? 'selected' : ''}>${esc(x.addr)}</option>`).join('')}</select></div>${field('Synergy lift', P + 'exitLift', r(h.exitLift, 1), { suf: '%' })}<p class="note">When merged, value and income rise by the synergy lift. It stays in your totals.</p>` : ''}
      <p class="note">Improvements are paid from sale cash first, then outside money.</p></section>`, !(h.capex > 0 || h.arv > 0 || h.exit !== 'hold'));
    const homeLoses = type === 'house' && v.cf < 0 ? `<div class="warnbox" data-testid="home-loses">⚠ A home must cash flow positive. This one loses ${$f(-v.cf)} a month. Raise the rent, lower the price, or pick a loan with a smaller payment.</div>` : '';
    const L = [['Net worth', wo.horizon.nw, pl.horizon.nw, $f], ['Cash flow / mo', wo.horizon.cf, pl.horizon.cf, $s], ['Payments / mo', wo.horizon.monthly, pl.horizon.monthly, $f], ['Outside cash', wo.outsideTotal, pl.outsideTotal, $f]];
    const impactLines = L.filter((x) => Math.abs(x[1] - x[2]) > 0.5).map((x) => `<div class="f"><span class="lb">${x[0]}</span><span>${x[3](x[1])} → <b>${x[3](x[2])}</b></span></div>`);
    const timing = h.status === 'planned'
      ? (src.length ? `<p class="note">Bought when ${src.map((x) => esc(x.addr)).join(' or ')}'s line of credit opens — ${isFinite(p0) ? mo(p0) + ' from now' : 'not reachable'}.</p>` : field('Buy in (months)', P + 'buyIn', h.buyIn))
      : field('Months already paid', P + 'paid', h.paid);
    const income = type === 'business'
      ? `${field(LB.rent, P + 'rent', grp(h.rent), { pre: '$' })}<p class="note">What the business pays you each month before this loan. Price ÷ yearly profit is ${r(v.multiple, 1)}×.</p>`
      : `${field(LB.rent, P + 'rent', grp(h.rent), { pre: '$' })}${field(type === 'commercial' ? 'Property tax / mo (your share)' : 'Property tax / mo', P + 'tax', grp(h.tax), { pre: '$' })}${field('Insurance / mo', P + 'ins', grp(h.ins), { pre: '$' })}${field(type === 'commercial' ? 'CAM & operating / mo' : 'HOA / mo', P + 'hoa', grp(h.hoa), { pre: '$' })}
      <button class="chip link" data-go="settings">Vacancy ${g.vac}%</button><button class="chip link" data-go="settings">Mgmt ${g.mgmt}%</button><button class="chip link" data-go="settings">Repairs ${g.maint}%/yr</button>
      <p class="note">Net operating income ${$f(v.noi)}/mo: rent minus operating costs, before the loan.</p>`;
    const loanLines = `<div class="loanlines" data-testid="loan-lines"><div class="f"><span class="lb">${type === 'business' ? 'Owner profit' : 'Income after operating costs'}</span><b data-testid="rent-noi" data-k="rent-noi">${$s(v.noi)}</b></div>
      <div class="f"><span class="lb">Loan payment${v.mip > 0 ? ' (P&amp;I + mortgage insurance)' : h.io ? ' (interest only)' : ' (P&amp;I)'}</span><b data-testid="rent-loan" data-k="rent-loan">${v.P + v.mip > 0.5 ? '−' + $f(v.P + v.mip) : 'no loan'}</b></div>
      ${v.X > 0.5 ? `<div class="f"><span class="lb">Extra payment</span><b data-testid="rent-extra" data-k="rent-extra">−${$f(v.X)}</b></div>` : ''}
      <div class="f totl"><span class="lb">Cash flow after the loan</span><b data-testid="rent-cf" data-k="rent-cf" class="${v.cf < 0 ? 'bad' : ''}">${$s(v.cf)}</b></div>
      ${v.X > 0.5 ? `<div class="f"><span class="lb">After the extra payment too</span><b data-testid="rent-cf-x" data-k="rent-cf-x">${$s(v.cf - v.X)}</b></div>` : ''}
      <p class="note">Rent and costs alone are not what you keep: the loan payment comes out of them. These match Payment now and Cash flow now at the top of this page.</p></div>`;
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2><input class="t" data-p="${P}addr" type="text" value="${esc(h.addr)}" aria-label="Name or address" title="${esc(h.addr)}"></h2><span class="tag" style="margin:0">${TL[type]}</span></div>
    ${homeLoses}
    ${h.fresh && type === 'house' ? `<section class="card"><b>Have a Zillow listing?</b><p class="note">Fill in price, rent, taxes and insurance from a file.</p><button class="btn plain" data-go="import/${h.id}" data-testid="import-listing">Import from listing file</button></section>` : ''}
    <section class="card"><div class="kg">${kpi('h-payment', 'Payment now', $f(v.payment), (() => { const parts = []; if (v.P > 0) parts.push((h.io ? 'interest ' : 'P&amp;I ') + $f(v.P)); if (v.X > 0.5) parts.push('extra ' + $f(v.X)); if (v.escrow > 0) parts.push('costs ' + $f(v.escrow)); if (v.mip > 0) parts.push('insurance ' + $f(v.mip)); return parts.length > 1 ? parts.join(' + ') : ''; })())}${kpi('h-cf', 'Cash flow now', $s(v.cf), v.X > 0.5 ? `${$s(v.cf - v.X)} after extra` : '', v.cf < 0 ? 'bad' : '')}
      ${kpi('h-dscr', 'DSCR now', r(dscrH, 2), isFinite(dscrH) ? (dscrH >= 1.2 ? 'income covers the loan' : dscrH >= 1 ? 'thin cushion' : 'below 1.0') : 'no loan payment', isFinite(dscrH) && dscrH < 1 ? 'bad' : '', 1)}${kpi('h-coc', 'Cash-on-cash now', isFinite(coc) ? r(coc, 1) + '%' : '—', 'yearly cash flow ÷ cash invested', coc < 0 ? 'bad' : '', 1)}</div>
      <p class="note share" data-testid="asset-share">${(() => { const sp = pl.snap.find((x) => x.id === h.id), ex = pl.exits[h.id]; if (ex && pl.sellAt[h.id] <= pl.planM) return 'In your portfolio total: sold in ' + mm(pl.sellAt[h.id]) + ' for ' + $c(ex.proceeds) + ', counted as cash.'; if (!sp) return 'In your portfolio total: not bought in this plan yet.'; return 'Portfolio row (at plan end): ' + (sp.payment > 0.5 ? $f(sp.payment) + '/mo' : 'no loan') + ' · ' + $s(sp.cf) + '/mo cash flow · ' + $c(sp.equity) + ' equity'; })()}</p>
      <div class="f" style="border-top:0;min-height:36px"><span class="lb">Plan for this asset${infoBtn('exit')}</span></div><div class="seg" style="margin-top:0" role="tablist"><button data-exit="hold" class="${h.exit === 'hold' ? 'on' : ''}">Hold</button><button data-exit="sell" class="${h.exit === 'sell' ? 'on' : ''}" data-testid="exit-sell">Sell</button><button data-exit="merge" class="${h.exit === 'merge' ? 'on' : ''}">Merge</button></div>
      <div class="f" style="border-top:0;min-height:30px"><span class="lb">Status</span></div><div class="seg" style="margin-top:0"><button class="${h.status === 'owned' ? 'on' : ''}" data-status="owned">Owned</button><button class="${h.status === 'planned' ? 'on' : ''}" data-status="planned">Planned</button></div>${timing}</section>
    ${h.listingUrl ? `<p class="note" style="margin:10px 4px 0">Imported from a listing${h.info && h.info.beds ? ' · ' + h.info.beds + ' bd / ' + h.info.baths + ' ba · ' + (h.info.sqft || '?') + ' sqft' : ''}.</p>` : ''}
    <div class="sec"><span>Purchase · <i class="auto">auto</i> = calculated${infoBtn('auto')}</span></div><section class="card">${field(LB.price, P + 'price', grp(h.price), { pre: '$' })}${field('Down payment', P + 'dp', r(h.dp, 2), { suf: '%' })}${field('Down payment $', P + 'down', grp(v.down), { pre: '$', calc: 1 })}${field('Loan amount', P + 'loan', grp(v.L), { pre: '$', calc: 1, ro: 1 })}${field(LB.growth, P + 'growth', r(v.growth, 2), { suf: '%' })}
      ${type === 'commercial' ? field('Cap rate', P + 'caprate', r(v.capRate, 1), { suf: '%', calc: 1, ro: 1 }) : ''}${type === 'business' ? field('Price ÷ yearly profit', P + 'mult', r(v.multiple, 1), { suf: '×', calc: 1, ro: 1 }) : ''}</section>
    ${colSec('loan', 'Loan option', (lo ? lo.name.replace(/\s*\(.*\)/, '') : 'Custom') + ' · ' + r(h.rate, 2) + '% · ' + r(h.term / 12, 0) + ' yr' + (lo ? '' : ' · tap to pick a loan'), `<section class="card">${loanSel}${lo || h.io ? `<p class="note">${lo ? esc(lo.note) + ' ' : ''}${h.io ? 'Interest-only: extra payments reduce the balance. Balloon at maturity is not modeled.' : ''}</p>` : '<p class="note">Custom terms. Pick a loan option to auto-fill them.</p>'}${h.ownerOcc ? '<span class="chip warnchip" data-testid="owner-occ">You must live here (owner-occupied)</span>' : ''}${h.loanId === 'k203' && h.capex > 75000 ? '<p class="note" data-testid="k203-cap">⚠ Over the $75,000 Limited 203(k) cap. This rehab needs a Standard 203(k) with a HUD consultant.</p>' : ''}
      ${field('Interest rate', P + 'rate', r(h.rate, 3), { suf: '%' })}${field('Term (years)', P + 'termY', r(h.term / 12, 2))}${field('Closing costs', P + 'closingPct', r(h.closingPct == null ? g.closing : h.closingPct, 2), { suf: '%' })}${field('Extra / month', P + 'extra', grp(v.X), { pre: '$', calc: h.driver === 'months' && !!t })}${field('Paid off in (months)', P + 'payoff', isFinite(v.payoff) ? v.payoff : '', { calc: 1 })}${field('Other liens', P + 'liens', grp(h.liens), { pre: '$' })}
      <p class="note">${isFinite(v.payoff) ? `Paid off in ${mo(v.payoff)}. ` : h.io ? 'Not paid off until you refinance or sell. ' : 'Payment does not cover interest. '}${v.mip > 0 ? 'Includes ' + $f(v.mip) + '/mo mortgage insurance. ' : ''}Debt now: ${$f(debt)} (${r((debt / (v.valueNow || h.price)) * 100)}% of today's value).${v.cltvAtLoc != null ? ` When its line of credit opens: ${r(v.cltvAtLoc)}% (cap ${g.cap}%).` : ''}</p>${v.cltvAtLoc != null && v.cltvAtLoc > g.cap + 0.01 ? '<span class="chip warnchip">Over the debt cap</span>' : ''}</section>`, true)}
    ${colSec('rent', LB.sec, (type === 'business' ? 'profit ' + $f(h.rent) : 'rent ' + $f(h.rent)) + ' · loan ' + (v.P + v.mip > 0.5 ? '−' + $f(v.P + v.mip) : 'none'), `<section class="card">${income}${loanLines}</section>`, true)}
    ${colSec('loc', 'Line of credit strategy', t ? 'opens ' + (isFinite(p0 + v.locM) ? mm(p0 + v.locM) : 'never') : 'not set', `<section class="card"><div class="f stack"><span class="lb">Funds</span>${targetSel(h)}</div>
      ${t ? `${field('Cash needed', P + 'need', grp(v.D), { pre: '$', calc: 1, ro: 1 })}${field('Months until LOC', P + 'wait', isFinite(v.locM) ? v.locM : '', { calc: h.driver === 'extra' })}
      <div class="f"><span class="lb">Opens (from today)${infoBtn('nextdp')}</span><b>${isFinite(p0 + v.locM) ? mm(p0 + v.locM) : 'never'}</b></div>
      ${isFinite(v.locM) ? `<p class="note" data-testid="loc-split">Of the cash needed, ${$f(v.cashDP)} comes from this asset's own cash flow (${$f(v.cfSaved)}/mo saved while it waits) and ${$f(v.draw)} from the line of credit.</p>` : ''}
      ${v.infeasible ? '<p class="note">⚠ That wait is not reachable, even with the loan fully paid.</p>' : ''}${a.cls === 'warn' || a.cls === 'bad' ? `<span class="chip warnchip" title="${esc(a.why || '')}">Debt-to-income ${a.cls === 'bad' ? 'over' : 'near'} your limit when ${esc(t.addr)} closes</span>` : ''}${sooner > 0 ? `<span class="chip">+$100/mo → ${sooner} mo sooner</span>` : ''}` : '<p class="note">Pick the asset this line of credit will fund.</p>'}</section>`, true)}
    ${exitSec}
    ${colSec('impact', 'Impact on your plan', impactLines.length ? impactLines.length + ' changes to this plan' : 'no change', `<section class="card" data-testid="impact">${impactLines.length ? impactLines.join('') : '<p class="note" style="margin:0">Adding or removing this does not change the numbers below.</p>'}<p class="note">Portfolio totals without this asset → with it.</p></section>`, true)}
    ${ask === 'del:' + h.id ? confirmBox('Remove ' + esc(h.addr) + '? It is also cleared as a funding target.', 'data-del-yes="' + h.id + '"', 'Yes, remove') : `<button class="btn plain" data-dup="${h.id}" data-testid="h-duplicate">Duplicate this ${TL[type].toLowerCase()}</button><button class="btn ghost" data-del="${h.id}" data-testid="h-delete">Remove</button>`}`;
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
    const pl = E.plan(S), f = E.finance(S, pl), p = S.p, g = S.g, k = f.kpis, R = f.series;
    const icon = { ok: '✓', warn: '△', bad: '✗' };
    const listRow = (kind, it, label) => `<div class="lr" data-testid="${kind}-row"><input class="t2" data-p="${kind === 'pl' ? 'o' : 'c'}.${it.id}.name" type="text" value="${esc(it.name)}" aria-label="${label} name">
      ${field('Amount', (kind === 'pl' ? 'o' : 'c') + '.' + it.id + '.amount', grp(it.amount), { pre: '$' })}${field('Happens in (months)', (kind === 'pl' ? 'o' : 'c') + '.' + it.id + '.month', it.month)}
      ${ask === 'dp:' + kind + ':' + it.id ? confirmBox('Remove ' + esc(it.name || label) + '?', 'data-dp-yes="' + kind + ':' + it.id + '"', 'Yes, remove') : `<button class="rm" data-dp="${kind}:${it.id}" aria-label="Remove ${esc(it.name || label)}">Remove</button>`}</div>`;
    const jobs = p.jobs.map((j) => { const tp = E.taxPctFor(j), take = E.jobMonthly(j, 0) * (1 - tp / 100), more = UI.coll['jmo:' + j.id] === true, hourly = j.kind === 'hourly';
      return `<section class="card" data-testid="job-card"><input class="t2" data-p="j.${j.id}.name" type="text" value="${esc(j.name)}" aria-label="Job name">
      <div class="seg" role="tablist" aria-label="How you are paid"><button data-jobkind="${j.id}:salary" class="${!hourly ? 'on' : ''}">Salary</button><button data-jobkind="${j.id}:hourly" class="${hourly ? 'on' : ''}" data-testid="kind-hourly">Hourly</button></div>
      ${hourly ? `${field('Hourly wage', `j.${j.id}.wage`, r(j.wage, 2), { pre: '$' })}${field('Hours / week', `j.${j.id}.hours`, r(j.hours, 0))}${field('Tips per hour (optional)', `j.${j.id}.tips`, r(j.tips, 2), { pre: '$' })}` : `${field('Gross pay / year', `j.${j.id}.gross`, grp(j.gross), { pre: '$' })}${field('Hours / week', `j.${j.id}.hours`, r(j.hours, 0))}`}
      ${field('Ends in (months)', `j.${j.id}.end`, j.end === null ? '' : j.end, { ph: 'never' })}
      <p class="note" data-testid="job-take">About ${$f(take)}/mo take-home${hourly ? ' (' + $f(j.gross) + '/yr before tax)' : ''}. Tax ${j.tax === null ? 'estimated at ' + r(tp, 1) + '%' : 'set to ' + r(j.tax, 1) + '%'}.</p>
      <button class="chip link morebtn" data-coll="jmo:${j.id}" aria-expanded="${more}">${more ? 'Fewer details ▾' : 'More details (optional) ▸'}</button>
      ${more ? `${hourly ? field('Weeks worked / year', `j.${j.id}.weeks`, r(j.weeks, 0)) : ''}${field('Yearly raise', `j.${j.id}.raise`, r(j.raise, 1), { suf: '%' })}${field('Tax rate (blank = estimate)', `j.${j.id}.tax`, j.tax === null ? '' : r(j.tax, 1), { suf: '%', ph: 'auto ' + r(tp, 1) })}${field('Starts in (months)', `j.${j.id}.start`, j.start)}` : ''}
      ${ask === 'dp:job:' + j.id ? confirmBox('Remove ' + esc(j.name) + '?', 'data-dp-yes="job:' + j.id + '"', 'Yes, remove') : `<button class="rm" data-dp="job:${j.id}" aria-label="Remove ${esc(j.name)}">Remove job</button>`}</section>`; }).join('');
    const row = (label, v, cls, bold) => `<tr class="${bold ? 'tot' : ''}"><td>${label}</td><td class="${cls || ''}">${bold ? '<b>' + $s(v) + '</b>' : $s(v)}</td></tr>`;
    const picture = `<table class="cmp" data-testid="monthly-picture"><tbody>
      ${row('Your take-home pay', k.takeHome)}${row('Portfolio cash flow', k.portfolioAfterTax, k.portfolioAfterTax < 0 ? 'bad' : '')}${row('Managers (not you)', -k.managerCost0)}${row('Extra payments', -k.extra)}${row('Living costs', -k.living)}${row('Other debts', -k.debts)}${row('Left over each month', k.net0, k.net0 < 0 ? 'bad' : '', true)}</tbody></table>`;
    const calls = f.calls.slice(0, 3).map((c) => `<div class="drv"><span>Month ${c.month}${c.assets.length ? ' · ' + esc(c.assets.join(', ')) : ''}</span><span><b>${$f(c.amount)}</b></span></div>`).join('');
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2>Finances</h2></div>
    <section class="card vcard ${f.status}" data-testid="verdict-card"><div class="vrow" style="cursor:default"><span class="vchip ${f.status}" data-testid="verdict-chip">${VL[f.status]}</span><b data-testid="verdict-headline">${esc(f.headline)}</b></div>
      ${f.reasons.filter((x) => x.sev !== 'ok').map((x) => `<div class="rsn ${x.sev}"><span aria-hidden="true">${icon[x.sev]}</span><span>${esc(x.text)}</span></div>`).join('')}
      ${f.reasons.some((x) => x.sev === 'ok') ? `<div class="rsn ok" data-testid="reasons-ok"><span aria-hidden="true">✓</span><span>Looks fine: ${esc(f.reasons.filter((x) => x.sev === 'ok').map((x) => x.short || x.text).join(' · '))}</span></div>` : ''}
      ${f.fixes.length ? `<div class="fixes" data-testid="fixes"><b>What would fix it</b><ul>${f.fixes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</section>
    <div class="sec">Your income</div>${jobs}<button class="addrow cardbtn" data-addjob="salary" data-testid="add-job">+ Add a salaried job</button><button class="addrow cardbtn" data-addjob="hourly" data-testid="add-hourly-job">+ Add an hourly job (wage and tips)</button>
    <div class="sec">Your cash and expenses</div><section class="card">${field('Liquid cash you have', 'p.cash', grp(p.cash), { pre: '$' })}${field('Cash interest', 'p.cashApy', r(p.cashApy, 2), { suf: '%' })}${field('Cash cushion (months)', 'p.emergencyMonths', r(p.emergencyMonths, 1))}${field('Living costs / month', 'p.living', grp(p.living), { pre: '$' })}${field('Cost increases / year', 'p.inflation', r(p.inflation, 1), { suf: '%' })}${field('Other debts / month', 'g.otherDebt', grp(g.otherDebt), { pre: '$' })}</section>
    <div class="sec">Your month: now and at plan end</div><section class="card">${picture}
    ${(() => { const later = pl.extraLater, pe = k.planEnd; return `${later > 0.5 ? `<p class="note">Plus ${$f(later)}/mo of extra payments on assets you have not bought yet.</p>` : ''}
    <div data-testid="finances-sync" style="border-top:2px solid var(--line);margin-top:8px;padding-top:6px"><b>At plan end</b> <span class="note">(same as the Portfolio page)</span><div class="f"><span class="lb">Before tax</span><b data-testid="sync-cf">${$s(pe.cfBefore)}</b></div><div class="f"><span class="lb">After tax</span><b>${$s(pe.cfAfter)}</b></div><div class="f"><span class="lb">Left over each month</span><b>${$s(pe.net)}</b></div>
    </div>`; })()}</section>
    <div class="sec">Cash over time</div><section class="card" data-testid="cash-card">${finChart(f)}
      <div class="f"><span class="lb">Lowest cash</span><b data-testid="lowest-cash">${$f(k.minLiquid)} · month ${k.minLiquidMonth}</b></div>
      <div class="f stack"><span class="lb">Months you could last without a paycheck</span><b>${isFinite(k.minRunway) ? r(k.minRunway, 1) : 'No limit — portfolio income covers it'}</b></div>
      <p class="note" data-testid="funding-line">The plan needs ${$f(pl.outsideTotal)} of outside cash over time. Partners and investors cover ${$f(Math.min(k.totalOutside, k.capitalTotal))}; the rest comes out of your savings and monthly income.</p>
      ${calls ? `<p class="note" style="margin-top:8px">Biggest cash calls</p>${calls}` : ''}</section>
    ${colSec('fin-tax', 'Taxes', p.portfolioTaxPct + '% / ' + p.salesTaxPct + '%', `<section class="card">${field('Tax on portfolio income', 'p.portfolioTaxPct', r(p.portfolioTaxPct, 1), { suf: '%' })}${field('Tax on gains when you sell', 'p.salesTaxPct', r(p.salesTaxPct, 1), { suf: '%' })}<p class="note">Rough effective rates. Short-term gains from flips are taxed like ordinary income.</p></section>`, true)}
    ${colSec('fin-time', 'Time and managers', p.operating + ' run by you', `<section class="card">${field('Businesses you run yourself', 'p.operating', p.operating)}${field('Hours / week each takes', 'p.bizHours', r(p.bizHours, 0))}${field('Manager pay per other business / mo', 'p.gmMonthly', grp(p.gmMonthly), { pre: '$' })}<p class="note">A business profit figure assumes the owner does the work. Businesses beyond the ones you run need a paid manager.</p></section>`, true)}
    <div class="sec">Planned one-time expenses</div><section class="card">${p.planned.length ? p.planned.map((it) => listRow('pl', it, 'Expense')).join('') : '<p class="note" style="margin:0">Things like a wedding, a car or tuition. They come out of your cash.</p>'}<button class="addrow" data-addplanned data-testid="add-planned">+ Add an expense</button></section>
    <div class="sec">Outside capital you have lined up</div><section class="card">${p.capital.length ? p.capital.map((it) => listRow('cap', it, 'Capital')).join('') : '<p class="note" style="margin:0">Partners, investors or family who will put money in. It is added to your cash that month.</p>'}<button class="addrow" data-addcap data-testid="add-capital">+ Add capital</button></section>`;
  }

  /* ---------- add page: pick a type, then a loan option that auto-fills the terms ---------- */
  function addPage() {
    const tp = E.TYPES[UI.addType] ? UI.addType : 'house', list = E.loansFor(tp), sel = list.find((l) => l.id === UI.addLoan) ? UI.addLoan : list[0].id;
    const blurb = { house: 'A single-family rental or primary home.', commercial: 'Retail, office, storage or industrial. Valued on rent and cap rate.', business: 'An operating business you buy. Valued on owner profit and growth.' }[tp];
    return `<div class="top"><button class="ic" data-go="" aria-label="Cancel and go back">‹</button><h2>Add to portfolio</h2></div>
    <section class="card"><div class="seg" role="tablist">${['house', 'commercial', 'business'].map((x) => `<button data-addtype="${x}" class="${x === tp ? 'on' : ''}">${TL[x]}</button>`).join('')}</div><p class="note">${blurb} You will set the price and income on the next screen.</p>${tp === 'house' ? '<button class="linkbtn" data-go="import/new">Have a Zillow listing? Import it</button>' : ''}</section>
    <div class="sec">Pick a loan option</div><section class="card" data-testid="loan-options">${(() => { const one = (l) => `<div class="loanrow"><button class="loanopt ${l.id === sel ? 'on' : ''}" data-pickloan="${l.id}" aria-pressed="${l.id === sel}"><b>${esc(l.name.replace(/\s*\(you live there\)/i, ''))}</b><span>${l.dp >= 100 ? 'No loan · pay the full price' : l.dp + '% down · ' + l.rate + '% · ' + (l.io ? 'interest-only, ' : '') + r(l.term / 12, 1) + ' yr'}</span>${l.dp >= 100 ? '' : `<small>${esc(l.note.split(/(?<=\.)\s/)[0])}</small>`}</button>${infoBtn(GL.LOAN[l.id])}</div>`; const inv = list.filter((l) => !l.ownerOcc), live = list.filter((l) => l.ownerOcc); return inv.map(one).join('') + (live.length ? `<p class="note" style="margin:10px 4px 2px"><b>If you will live there</b><br>FHA and 203(k) loans need you to move in.</p>` + live.map(one).join('') : ''); })()}</section>
    <button class="btn" style="width:100%" data-confirm-add="${tp}|${sel}" data-testid="confirm-add">Add ${TL[tp].toLowerCase()}</button>`;
  }

  /* ---------- settings ---------- */
  function settings() {
    const g = S.g, F = (l, k, o) => field(l, 'g.' + k, o && o.pre === '$' ? grp(g[k]) : g[k], o);
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2>Assumptions</h2></div>
    <p class="note" style="margin:0 4px 6px">Defaults work for most people. Change them when you know your lender.</p>
    <div class="sec">Borrowing</div><section class="card">${F('Max loan vs value', 'cap', { suf: '%' })}${F('Appraisal cut', 'haircut', { suf: '%' })}${F('Closing costs', 'closing', { suf: '%' })}${F('Line of credit rate', 'hrate', { suf: '%' })}<p class="note">Appraisal cut: what lenders subtract from a home's value. Rent counted: the share of rent lenders accept as income.</p></section>
    <div class="sec">Who helps you qualify</div><section class="card">${F('Co-signer 1 / yr', 'p1', { pre: '$' })}${F('Co-signer 2 / yr', 'p2', { pre: '$' })}<p class="note">Leave 0 if none. Co-signers help you qualify for loans. Their income counts toward the lender's limit.</p>${F('Debt-to-income limit', 'dti', { suf: '%' })}${F('Rent counted', 'rentCount', { suf: '%' })}${F('Other monthly debts', 'otherDebt', { pre: '$' })}</section>
    <div class="sec">Operating costs</div><section class="card">${F('Vacancy', 'vac', { suf: '%' })}${F('Management (of rent)', 'mgmt', { suf: '%' })}${F('Repairs / yr', 'maint', { suf: '%' })}${F('Growth / yr', 'appr', { suf: '%' })}${F('Projection length (years)', 'planYears', {})}</section>
    ${colSec('backup', 'Backup and restore', 'copy or restore', `<section class="card">
      ${notice ? `<div class="warnbox">${esc(notice)}</div>` : ''}
      <button class="btn" data-export data-testid="export">${exportOpen ? 'Hide backup' : 'Show backup to copy'}</button>
      ${exportOpen ? `<textarea readonly rows="5" id="bkout" aria-label="Backup data" data-testid="backup-text">${esc(JSON.stringify(S))}</textarea><button class="btn plain" data-copybackup>Copy backup</button><p class="note" id="cbm">Save this text somewhere safe, such as a note or file. Paste it below to restore.</p>` : ''}
      <label class="btn plain filebtn">Restore from backup file<input type="file" accept="application/json,.json,text/plain" hidden id="imp" aria-label="Choose backup file" data-testid="import-file"></label>
      <textarea rows="2" id="bkin" aria-label="Or paste backup text" placeholder="…or paste backup text here"></textarea><button class="btn plain" data-restore-text>Restore from pasted text</button>
      ${pendingImport ? confirmBox('Replace all current data with this backup?', 'data-import-yes', 'Yes, replace') : ''}
      <p class="note">${(() => { try { const t = localStorage.getItem('rep-v4-backup'); return t ? 'Backup last shown: ' + new Date(+t).toLocaleDateString() : 'No backup yet. Copy one regularly.'; } catch (e) { return ''; } })()}</p></section>`, true)}
    ${colSec('samples', 'Sample portfolios', 'replace your assets', `<section class="card">${ask === 'reset' ? confirmBox('Replace your assets with the realistic sample?', 'data-reset-yes', 'Yes, replace') : '<button class="btn plain" style="color:var(--bad)" data-reset data-testid="load-realistic">Load realistic sample</button>'}
      ${ask === 'stretch' ? confirmBox('Replace your assets with the $540M stretch scenario?', 'data-stretch-yes', 'Yes, load it') : '<button class="btn plain" style="color:var(--bad)" data-stretch data-testid="load-stretch">Load $540M stretch scenario</button>'}
      ${ask === 'big' ? confirmBox('Replace your assets with the $130M scenario?', 'data-big-yes', 'Yes, load it') : '<button class="btn plain" style="color:var(--bad)" data-big data-testid="load-big">Load $130M scenario (affords a $35M house)</button>'}
      <p class="note">These replace your current assets. The realistic sample uses market-checked prices, loans and growth. The stretch scenario reaches about $540M and +$1.4M a month, but needs 21-25% yearly business growth for nearly 20 years and about $21M of outside cash. The $130M scenario keeps business growth at 8% a year, uses about $39M of outside money (partner capital early on), and its own cash buys a $35M waterfront estate in month 200.</p></section>`, true)}`;
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
    if (h) Object.assign(h, x.patch, extra); else { h = E.newHouse(Object.assign({}, x.patch, extra)); E.register(S, h); S.houses.push(h); E.relink(S); }
    imp = null; save(); goto('h/' + h.id);
  }

  function stageBackup(text) {
    try { const d = JSON.parse(text); if (!d || !Array.isArray(d.houses) || !d.g) throw 0; pendingImport = d; notice = ''; }
    catch (x) { pendingImport = null; notice = 'That is not a valid backup. Nothing was changed.'; }
    render();
  }
  /* ---------- router + render ---------- */
  let prev = {};
  function render() {
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
    const n = parseFloat(String(s).replace(/,/g, '').replace(/[^0-9.\-eE+]/g, '')); if (isNaN(n)) return false;
    if (t === 'g') { S.g[x] = n; return true; }
    if (t === 'p') { S.p[x] = n; S.p = E.normalizePersonal(S.p); return true; }
    if (list) { const it = S.p[list].find((q) => q.id === x); if (!it) return false; it[k] = n; S.p = E.normalizePersonal(S.p); return true; }
    const h = H(x), v = E.view(S, h); h.fresh = false;
    if (k === 'extra') { h.extra = Math.max(0, n); h.driver = 'extra'; }
    else if (k === 'wait') { h.wait = Math.max(0, Math.round(n)); h.driver = 'months'; }
    else if (k === 'down') { h.dp = Math.min(100, Math.max(0, (n / h.price) * 100)); }
    else if (k === 'dp') { h.dp = Math.min(100, Math.max(0, n)); }
    else if (k === 'termY') { h.term = Math.max(12, Math.round(n * 12)); }
    else if (k === 'payoff') { const B0 = E.balToday(h), i = h.rate / 1200, m = Math.max(1, Math.round(n)); h.extra = Math.max(0, E.pmt(B0, i, m) - v.P + 0.02); h.driver = 'extra'; /* +2 cents so rounding up never lands one month late */ }
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
  const app = document.getElementById('app');
  app.addEventListener('input', (e) => { const p = e.target.dataset.p; if (p && setField(p, e.target.value)) { save(); render(); } });
  /* section headers are role=button divs, so Enter and Space must open them like a real button */
  app.addEventListener('keydown', (e) => { const cs = e.target.closest && e.target.closest('[data-coll][role=button]'); if (cs && cs === e.target && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); cs.click(); } });
  app.addEventListener('pointermove', nwHover); app.addEventListener('pointerdown', nwHover);
  app.addEventListener('pointerleave', nwLeave, true); app.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') return; });
  app.addEventListener('focusout', (e) => { if (e.target.dataset && e.target.dataset.p && e.target.tagName === 'INPUT' && !e.relatedTarget) setTimeout(() => { const a = document.activeElement; if (!(a && a.dataset && (a.dataset.p || a.dataset.sel))) render(); }, 0); });
  app.addEventListener('change', (e) => {
    const ln = e.target.dataset.loan; if (ln) { const h = H(ln); if (e.target.value === 'custom') h.loanId = 'custom'; else E.applyLoan(h, e.target.value); save(); render(); return; }
    const mg = e.target.dataset.merge; if (mg) { H(mg).mergeInto = e.target.value; save(); render(); return; }
    const sel = e.target.dataset.sel; if (sel) { H(sel).target = e.target.value; save(); render(); return; }
    if (e.target.dataset.listingFile !== undefined && e.target.files[0]) { impName = e.target.files[0].name; const rd = new FileReader(); rd.onload = () => readListing(String(rd.result)); rd.readAsText(e.target.files[0]); return; }
    if (e.target.id === 'imp' && e.target.files[0]) { const rd = new FileReader(); rd.onload = () => stageBackup(String(rd.result)); rd.readAsText(e.target.files[0]); } });
  app.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('input,select,textarea,label.filebtn')) return;
    if (t.dataset.copyprompt !== undefined) { const m = document.getElementById('cpm'); try { navigator.clipboard.writeText(PROMPT).then(() => { m.textContent = '✓ Copied. Paste it into a Claude chat.'; }, () => { m.textContent = 'Could not copy — open “Show the prompt” and copy it by hand.'; }); } catch (x) { m.textContent = 'Could not copy — open “Show the prompt” and copy it by hand.'; } return; }
    if (t.dataset.readListing !== undefined) { const ta = document.querySelector('[data-listing-text]'); readListing(ta ? ta.value : ''); return; }
    if (t.dataset.applyListing) { applyListing(t.dataset.applyListing); return; }
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
    if (t.dataset.add !== undefined) { if (E.TYPES[t.dataset.add]) { UI.addType = t.dataset.add; UI.addLoan = ''; } goto('add'); return; }
    const at = t.closest('[data-addtype]'); if (at) { UI.addType = at.dataset.addtype; UI.addLoan = ''; render(); return; }
    const pk = t.closest('[data-pickloan]'); if (pk) { UI.addLoan = pk.dataset.pickloan; render(); return; }
    if (t.dataset.confirmAdd) { const [tp, lid] = t.dataset.confirmAdd.split('|'); const h = E.newAsset(tp, lid, { fresh: true }); E.register(S, h); S.houses.push(h); E.relink(S); UI.coll['cat-' + tp] = false; selId = null; save(); goto('h/' + h.id); return; }
    if (t.dataset.del) { ask = 'del:' + t.dataset.del; render(); return; }
    if (t.dataset.delYes) { const gone = H(t.dataset.delYes); undo = gone ? { label: gone.addr, snap: JSON.stringify(S) } : null; S = E.without(S, t.dataset.delYes); E.relink(S); if (selId === t.dataset.delYes) selId = null; ask = null; save(); goto(''); render(); return; }
    if (t.dataset.undo !== undefined) { if (undo) { S = E.normalize(JSON.parse(undo.snap)); S.v = DATA_V; undo = null; save(); render(); } return; }
    if (t.dataset.askCancel !== undefined) { ask = null; pendingImport = null; render(); return; }
    if (t.dataset.hidelegend !== undefined) { UI.hideLegend = true; save(); render(); return; }
    if (t.dataset.togglepaste !== undefined) { UI.paste = !UI.paste; render(); return; }
    const cs = t.closest('[data-coll]'); if (cs) { const id = cs.dataset.coll, cur = UI.coll[id] === undefined ? !!CDEF[id] : UI.coll[id], had = document.activeElement === cs; UI.coll[id] = !cur; save(); render(); if (had) { const n = app.querySelector(`[data-coll="${id}"]`); if (n) n.focus(); } return; }
    if (t.dataset.status) { const h = H(routeOf().slice(2)); h.status = t.dataset.status; save(); render(); return; }
    if (t.dataset.export !== undefined) { exportOpen = !exportOpen; if (exportOpen) { try { localStorage.setItem('rep-v4-backup', String(Date.now())); } catch (x) {} } render(); return; }
    if (t.dataset.copybackup !== undefined) { const m = document.getElementById('cbm'), ta = document.getElementById('bkout'); const fail = () => { ta.focus(); ta.select(); m.textContent = 'Select the text above and copy it by hand.'; };
      try { navigator.clipboard.writeText(ta.value).then(() => { m.textContent = 'Copied.'; }, fail); } catch (x) { fail(); } return; }
    if (t.dataset.restoreText !== undefined) { const ta = document.getElementById('bkin'); stageBackup(ta ? ta.value : ''); return; }
    if (t.dataset.importYes !== undefined) { S = E.normalize(pendingImport); if (!S.p) S.p = E.samplePersonal(); S.v = DATA_V; fixOrder(S); pendingImport = null; notice = ''; save(); goto(''); render(); return; }
    if (t.dataset.reset !== undefined) { ask = 'reset'; render(); return; }
    if (t.dataset.big !== undefined) { ask = 'big'; render(); return; }
    if (t.dataset.bigYes !== undefined) { S = E.seedBig(); S.v = DATA_V; fixOrder(S); ask = null; save(); render(); return; }
    if (t.dataset.stretch !== undefined) { ask = 'stretch'; render(); return; }
    if (t.dataset.stretchYes !== undefined) { S = E.seedStretch(); S.v = DATA_V; fixOrder(S); ask = null; save(); render(); return; }
    if (t.dataset.resetYes !== undefined) { S = E.seed(); S.v = DATA_V; fixOrder(S); ask = null; save(); render(); return; }
    const mvb = t.closest('[data-move]'); if (mvb) { const [id, d] = mvb.dataset.move.split(':'); moveBy(id, +d); return; }
    const dpb = t.closest('[data-dup]'); if (dpb) { const c = E.duplicate(S, dpb.dataset.dup); if (c) { ask = null; UI.coll['cat-' + (c.type || 'house')] = false; save(); if (routeOf().startsWith('h/')) { selId = null; goto('h/' + c.id); } else { selId = c.id; render(); } } return; }
    const rwEl = t.closest('[data-row]'); if (rwEl && !t.closest('[data-go]') && !t.closest('.panel')) { if (Date.now() - lastDragEnd < 350) return; if (t.closest('[data-panel]')) { selId = selId === rwEl.dataset.row ? null : rwEl.dataset.row; ask = null; render(); return; } if (!t.closest('select,input,textarea,a,[data-info],button:not(.addrbtn)')) { goto('h/' + rwEl.dataset.row); return; } }
    const go = t.closest('[data-go]'); if (go) goto(go.dataset.go);
  });
  /* ---------- reorder: Move up/down buttons and press-and-hold drag. List order = buy order; funding is relinked after every change. ---------- */
  let lastDragEnd = 0, drag = null, press = null, navSeen = 0;
  const visibleIds = (tp) => { const pl = E.plan(S); return S.houses.filter((x) => (x.type || 'house') === tp && !(pl.exits[x.id] && pl.sellAt[x.id] <= pl.planM)).map((x) => x.id); };
  function moveBy(id, d) {
    const h = H(id); if (!h) return; const vis = visibleIds(h.type || 'house'), i = vis.indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= vis.length) return;
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
    const c = top + d.h / 2; let to = 0; d.rects.forEach((r, j) => { if (j !== d.idx && r.top + r.h / 2 < c) to++; }); d.to = to;
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
  let sw = null, kb = null; const FIELD = 'input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=file]),textarea,select';
  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; sw = null; kb = null; if (!t || e.touches.length !== 1) return;
    if (t.clientX <= 24 && !drag && !(e.target.closest && e.target.closest('input,select,textarea,[type=range],.sheet'))) sw = { x: t.clientX, y: t.clientY };
    if (!(e.target.closest && e.target.closest(FIELD))) kb = { y: t.clientY };
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0]; if (!t) return;
    if (sw && (Math.abs(t.clientY - sw.y) > 45 || drag)) sw = null;
    const a = document.activeElement; if (kb && a && a.matches && a.matches(FIELD) && t.clientY - kb.y > 28 && !drag) { kb = null; a.blur(); }
  }, { passive: true });
  document.addEventListener('touchend', (e) => { const t = e.changedTouches[0]; if (sw && t && t.clientX - sw.x > 70 && Math.abs(t.clientY - sw.y) < 45 && !drag) swipeBack(); sw = null; kb = null; }, { passive: true });
  document.addEventListener('touchcancel', () => { sw = null; kb = null; }, { passive: true });
  app.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !/^(checkbox|radio|file|range)$/.test(e.target.type)) e.target.blur(); });

  render();
  /* local-first plumbing: ask the browser to keep our data, and cache the app for offline use */
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  /*SW*/if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});/*ENDSW*/
  window.__app = { get state() { return S; } };
})();
