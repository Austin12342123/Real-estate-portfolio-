/* Portfolio app v3 — UI layer. All math lives in engine.js. Data never leaves the device (localStorage; IndexedDB in the final build). */
(function () {
  const E = window.Engine, KEY = 'rep-v4', UIKEY = 'rep-v4-ui';
  let S, UI = { tab: 'timeline', open: false, coll: { drivers: true }, hideLegend: false, addType: 'house', addLoan: '' };
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  const DATA_V = 5; /* bump when the sample portfolio changes so old saved samples are replaced */
  if (!S || !Array.isArray(S.houses) || !S.g || S.v !== DATA_V) S = E.seed();
  E.normalize(S); S.v = DATA_V;
  try { UI = Object.assign(UI, JSON.parse(localStorage.getItem(UIKEY)) || {}); } catch (e) {}
  let storageOK = true, imp = null, ask = null, notice = '', pendingImport = null, exportOpen = false;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(UIKEY, JSON.stringify(UI)); storageOK = true; } catch (e) { storageOK = false; } };
  const H = (id) => E.H(S, id);
  /* viewer-safe routes: #house-<id>, #assumptions, #import-<id|new> */
  const hashOf = (p) => (!p ? '#' : p === 'settings' ? '#assumptions' : p.startsWith('h/') ? '#house-' + p.slice(2) : p.startsWith('import/') ? '#import-' + p.slice(7) : p === 'add' ? '#add' : '#');
  const routeOf = () => { const h = location.hash.slice(1); return h === 'assumptions' ? 'settings' : h.startsWith('house-') ? 'h/' + h.slice(6) : h.startsWith('import-') ? 'import/' + h.slice(7) : h === 'add' ? 'add' : ''; };
  const goto = (p) => { location.hash = hashOf(p); };

  /* ---------- formatting ---------- */
  const num = (n) => (isFinite(n) ? n : 0);
  const $f = (n) => { const a = Math.abs(num(n)), sg = n < -0.5 ? '−' : ''; return a >= 1e9 ? sg + '$' + (a / 1e9).toFixed(2) + 'B' : a >= 1e7 ? sg + '$' + (a / 1e6).toFixed(1) + 'M' : sg + '$' + Math.round(a).toLocaleString('en-US'); };
  const $s = (n) => (n < -0.5 ? '−' : '+') + $f(Math.abs(n));
  const $c = (n) => { const a = Math.abs(num(n)); return a >= 1e9 ? $f(n) : a >= 1e7 ? (n < 0 ? '−' : '') + '$' + (a / 1e6).toFixed(1) + 'M' : a >= 1e6 ? (n < 0 ? '−' : '') + '$' + (a / 1e6).toFixed(2) + 'M' : $f(n); };
  const $cs = (n) => (n < -0.5 ? '−' : '+') + $c(Math.abs(n));
  const TL = { house: 'Home', commercial: 'Commercial', business: 'Business' }, TPL = { house: 'Single-family homes', commercial: 'Commercial properties', business: 'Businesses' };
  const grp = (n) => Math.round(num(n)).toLocaleString('en-US');
  const mo = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m < 24 ? m + ' mo' : Math.floor(m / 12) + 'y ' + (m % 12) + 'm');
  const mm = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m + ' mo'); /* credit-line timing: plain months */
  const r = (n, d = 0) => (isFinite(n) ? String(+n.toFixed(d)) : '—');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- reusable bits ---------- */
  const field = (label, p, val, o = {}) => `<label class="f ${o.calc ? 'calc' : ''}"><span class="lb">${label}${o.calc ? ' <i class="auto" title="calculated from your other numbers — tap to override">auto</i>' : ''}</span><span class="iw">${o.pre ? `<em>${o.pre}</em>` : ''}<input inputmode="decimal" data-p="${p}" data-k="${p}" aria-label="${esc(label)}" ${o.ro ? 'readonly tabindex="-1"' : ''} value="${val}">${o.suf ? `<em>${o.suf}</em>` : ''}</span></label>`;
  const targetSel = (h) => `<select data-sel="${h.id}" aria-label="Line of credit on ${esc(h.addr)} funds">${'<option value="">Pick a house</option>' + S.houses.filter((x) => x.id !== h.id).map((x) => `<option value="${x.id}" ${h.target === x.id ? 'selected' : ''}>${esc(x.addr)}</option>`).join('')}</select>`;
  const kpi = (id, label, val, sub, cls, sm) => `<div class="kpi ${sm ? 'sm' : ''}"><small>${label}</small><b class="${cls || ''}" data-testid="${id}" data-k="${id}">${val}</b>${sub ? `<span class="sub">${sub}</span>` : ''}</div>`;

  const colSec = (id, title, sum, inner) => { const open = !UI.coll[id]; return `<div class="sec cs" data-coll="${id}" role="button" tabindex="0" aria-expanded="${open}"><span>${title}</span><span class="cx">${open ? 'Hide ▾' : esc(sum) + ' ▸'}</span></div>${open ? inner : ''}`; };
  const confirmBox = (msg, yesAttr, yesLabel) => `<div class="confirm" role="alertdialog"><p>${msg}</p><button class="btn danger" ${yesAttr}>${yesLabel}</button><button class="btn plain" data-ask-cancel>Cancel</button></div>`;

  /* ---------- plan visuals ---------- */
  function timeline(pl) {
    const steps = pl.rows;
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
    const T = Math.max(12, Math.min(pl.T, Math.max(pl.lastBuy + 60, pl.planM))), s = pl.series.nw.slice(0, T + 1);
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
    if (!S.houses.length) return `<h1>Portfolio <button class="ic" data-go="settings" aria-label="Settings">⚙</button></h1><div class="card empty"><p><b>Nothing here yet</b></p><p>Add a home, a commercial property or a business to see your plan.</p><button class="btn" data-add data-testid="add-house" style="margin-top:8px">+ Add property or business</button><button class="linkbtn" data-go="import/new">Or import a home from a listing file</button></div>`;
    const tot = S.houses.reduce((s, h) => s + E.view(S, h).X, 0);
    const n = S.houses.length, sched = n - pl.unfunded.length;
    const rowOf = (h) => {
      const v = pl.V[h.id], t = H(h.target), p = pl.purchase[h.id], type = h.type || 'house';
      const tag = h.status === 'owned' ? 'owned' : isFinite(p) ? 'buy ' + mo(p) : 'unfunded';
      const loc = !t ? '' : !isFinite(p + v.locM) ? 'not reachable' : p + v.locM <= 0 ? 'opens now' : 'opens in ' + mm(p + v.locM);
      const hi = v.X > 2000 && v.X > 3 * v.P ? '<span class="hi">unusually high extra</span>' : '';
      return `<div class="row" data-go="h/${h.id}" data-testid="ledger-row"><div class="r1"><span class="nm"><span class="addr">${esc(h.addr)}</span><div class="pay" data-testid="row-payment" data-k="pay-${h.id}"><span class="tag">${tag}</span> ${$f(v.payment)}/mo${h.status === 'planned' ? '' : ' total'} ${hi}</div></span>
        <span class="ex ${h.driver === 'months' ? 'calc' : ''}">Extra<span class="iw"><em>$</em><input inputmode="decimal" data-testid="extra-input" data-p="h.${h.id}.extra" data-k="x-${h.id}" aria-label="Extra monthly payment for ${esc(h.addr)}" value="${grp(v.X)}"></span></span></div>
        <div class="r2"><div class="fcol"><div class="frow"><span class="fund">Funds</span>${targetSel(h)}</div><span class="locline" data-testid="loc-line">${loc ? 'credit line ' + loc : ''}</span></div><span class="cfl ${v.cf < 0 ? 'bad' : 'ok'}" data-testid="row-cashflow" title="Income minus expenses and the loan payment, before extra payments"><b data-k="cf-${h.id}">${$s(v.cf)}/mo</b><small>cash flow</small></span></div></div>`; };
    const rows = ['house', 'commercial', 'business'].map((tp) => { const list = S.houses.filter((h) => (h.type || 'house') === tp); return list.length ? `<div class="grp">${TPL[tp]}</div>` + list.map(rowOf).join('') : ''; }).join('');
    const c3 = (label, a, b, c, f, cls) => `<tr><td>${label}</td><td data-k="c-${label}-a">${f(a)}</td><td data-k="c-${label}-b">${f(b)}</td><td class="${cls || ''}" data-k="c-${label}-c"><b>${f(c)}</b></td></tr>`;
    const warn = pl.unfunded.length ? `<div class="warnbox">⚠ ${pl.unfunded.length} planned asset${pl.unfunded.length > 1 ? 's are' : ' is'} never funded under the current numbers.</div>` : '';
    const health = pl.worst.dti > g.dti ? `<div class="warnbox">⚠ Debt-to-income peaks at ${r(pl.worst.dti)}% in ${mo(pl.worst.month)} (limit ${g.dti}%).</div>` : '';
    const outside = th.outside > 0 ? `<div class="warnbox" data-testid="outside-cash">Needs <b>${$f(th.outside)}</b> of outside cash for purchases a credit line doesn't fund (partners, investors, savings). The plan doesn't repay it.</div>` : '';
    const tab = UI.tab, nb = S.houses.filter((h) => h.status === 'planned' && isFinite(pl.purchase[h.id])).sort((a, b) => pl.purchase[a.id] - pl.purchase[b.id])[0];
    const headline = (nb ? `Next: buy <b>${esc(nb.addr)}</b> in <b>${mm(pl.purchase[nb.id])}</b>. ` : '') + (pl.unfunded.length ? `${pl.unfunded.length} not funded yet. ` : `All ${n} assets by <b>${mo(pl.lastBuy)}</b>. `) + `Net worth <b>${$f(th.nw)}</b> in ${yrs} years.`;
    const drv = pl.assetsAt(pl.planM).sort((a, b) => b.equity - a.equity), drvOpen = !UI.coll.drivers;
    const drivers = `<button class="linkbtn leftbtn" data-coll="drivers" aria-expanded="${drvOpen}">What drives the ${yrs}-year number ${drvOpen ? '▾' : '▸'}</button>${drvOpen ? `<div data-testid="drivers">${drv.slice(0, 6).map((d) => `<div class="drv"><span>${esc(d.addr)}</span><span><b>${$f(d.equity)}</b> <small>${th.nw > 0 ? r((d.equity / th.nw) * 100) : 0}%</small></span></div>`).join('')}<p class="note">Equity = value − loans − credit lines drawn. A sample like this leans on a few fast-growing businesses; check the growth rate on each.</p></div>` : ''}`;
    return `<h1>Portfolio <button class="ic" data-go="settings" aria-label="Settings" data-testid="settings-link">⚙</button></h1>
    ${storageOK ? '' : '<div class="warnbox">⚠ Storage is unavailable, so changes will not be saved. Export a backup from Assumptions.</div>'}
    <section class="card" data-testid="summary"><div class="kg">
      ${kpi('kpi-networth', 'Net worth', $f(t0.nw), `${owned.length} owned · ${$f(t0.value)} value`)}
      ${kpi('kpi-monthly', 'Total monthly payments', $f(t0.monthly), `incl. ${$f(t0.extra)} extra now`)}
      ${kpi('kpi-cashflow', 'Cash flow / mo', $s(t0.cf), `${$s(t0.cfx)} after extra`, t0.cf < 0 ? 'bad' : '', 1)}
      ${kpi('kpi-dscr', 'DSCR', r(t0.dscr, 2), t0.dscr >= 1.2 ? 'healthy' : t0.dscr >= 1 ? 'thin' : 'below 1.0', t0.dscr && t0.dscr < 1 ? 'bad' : '', 1)}</div>
      <div class="bar"><i class="${t0.cltv > g.cap ? 'over' : ''}" style="width:${Math.min(100, (t0.cltv / g.cap) * 100)}%"></i></div>
      <div class="cap"><span data-k="cltv">Debt ${r(t0.cltv)}% of value</span><span>cap ${g.cap}%</span></div>
      <p class="plan-line" data-testid="plan-headline">${headline}</p></section>
    <div class="sec">Extra payments &amp; credit lines<span class="tot" data-testid="total-extra" data-k="tot">${$f(tot)}/mo extra</span></div><section class="card" id="ledger" data-testid="ledger">${rows}<button class="addrow" data-add data-testid="add-house">+ Add property or business</button></section>
    <button class="linkbtn" data-go="import/new" data-testid="import-link">Import a home from a listing file</button>
    <section class="card" data-testid="plan-card"><b>Plan</b> <span class="note">${sched} of ${n} assets by ${mo(pl.lastBuy)}</span>
      <table class="cmp"><thead><tr><th></th><th>Today</th><th>Plan done</th><th>${yrs} yrs</th></tr></thead><tbody>
      ${c3('Net worth', t0.nw, tf.nw, th.nw, $c)}${c3('Monthly payments', t0.monthly, tf.monthly, th.monthly, $c)}${c3('Cash flow / mo', t0.cf, tf.cf, th.cf, $cs, th.cf < 0 ? 'bad' : '')}${c3('Debt', t0.debt, tf.debt, th.debt, $c)}${c3('Assets', t0.count, tf.count, th.count, (x) => x)}${c3('Outside cash', t0.outside, tf.outside, th.outside, $c)}</tbody></table>
      ${outside}${warn}${health}${drivers}
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
    const loanSel = `<div class="f"><span class="lb">Loan option</span><select class="loansel" data-loan="${h.id}" aria-label="Loan option">${E.loansFor(type).map((l) => `<option value="${l.id}" ${h.loanId === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}<option value="custom" ${lo ? '' : 'selected'}>Custom terms</option></select></div>`;
    const L = [['Net worth today', wo.today.nw, pl.today.nw, $f], [`Net worth, ${g.planYears} years`, wo.horizon.nw, pl.horizon.nw, $f], [`Monthly payments, ${g.planYears} years`, wo.horizon.monthly, pl.horizon.monthly, $f], ['Cash flow today', wo.today.cf, pl.today.cf, $s]];
    const impactLines = L.filter((x) => Math.abs(x[1] - x[2]) > 0.5).map((x) => `<div class="f"><span class="lb">${x[0]}</span><span>${x[3](x[1])} → <b>${x[3](x[2])}</b></span></div>`);
    const timing = h.status === 'planned'
      ? (src.length ? `<p class="note">Bought when ${src.map((x) => esc(x.addr)).join(' or ')}'s line of credit opens — ${isFinite(p0) ? mo(p0) + ' from now' : 'not reachable'}.</p>` : field('Buy in (months)', P + 'buyIn', h.buyIn))
      : field('Months already paid', P + 'paid', h.paid);
    const income = type === 'business'
      ? `${field(LB.rent, P + 'rent', grp(h.rent), { pre: '$' })}<p class="note">What the business pays you each month before this loan. Price ÷ yearly profit is ${r(v.multiple, 1)}×.</p>`
      : `${field(LB.rent, P + 'rent', grp(h.rent), { pre: '$' })}${field(type === 'commercial' ? 'Property tax / mo (your share)' : 'Property tax / mo', P + 'tax', grp(h.tax), { pre: '$' })}${field('Insurance / mo', P + 'ins', grp(h.ins), { pre: '$' })}${field(type === 'commercial' ? 'CAM & operating / mo' : 'HOA / mo', P + 'hoa', grp(h.hoa), { pre: '$' })}
      <button class="chip link" data-go="settings">Vacancy ${g.vac}%</button><button class="chip link" data-go="settings">Mgmt ${g.mgmt}%</button><button class="chip link" data-go="settings">Repairs ${g.maint}%/yr</button>
      <p class="note">Net operating income ${$f(v.noi)}/mo · after loan payment ${$s(v.cf)}/mo</p>`;
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2><input class="t" data-p="${P}addr" type="text" value="${esc(h.addr)}" aria-label="Name or address" title="${esc(h.addr)}"></h2><span class="tag" style="margin:0">${TL[type]}</span></div>
    ${h.fresh && type === 'house' ? `<section class="card"><b>Have a Zillow listing?</b><p class="note">Fill in price, rent, taxes and insurance from a file.</p><button class="btn plain" data-go="import/${h.id}" data-testid="import-listing">Import from listing file</button></section>` : ''}
    <section class="card"><div class="kg">${kpi('h-payment', 'Monthly payment', $f(v.payment), `${h.io ? 'interest ' : 'P&amp;I '}${$f(v.P)} + extra ${$f(v.X)}${v.escrow ? ' + costs ' + $f(v.escrow) : ''}`)}${kpi('h-cf', 'Cash flow / mo', $s(v.cf), `${$s(v.cf - v.X)} after extra`, v.cf < 0 ? 'bad' : '')}
      ${kpi('h-dscr', 'DSCR', r(dscrH, 2), isFinite(dscrH) ? (dscrH >= 1.2 ? 'income covers the loan' : dscrH >= 1 ? 'thin cushion' : 'below 1.0') : 'no loan payment', isFinite(dscrH) && dscrH < 1 ? 'bad' : '', 1)}${kpi('h-coc', 'Cash-on-cash return', isFinite(coc) ? r(coc, 1) + '%' : '—', 'yearly cash flow ÷ cash invested', coc < 0 ? 'bad' : '', 1)}</div>
      <div class="seg"><button class="${h.status === 'owned' ? 'on' : ''}" data-status="owned">Owned</button><button class="${h.status === 'planned' ? 'on' : ''}" data-status="planned">Planned</button></div>${timing}</section>
    ${UI.hideLegend && !h.listingUrl ? '' : `<p class="note" style="margin:10px 4px 0">${UI.hideLegend ? '' : '<i class="auto">auto</i> = calculated from your other numbers; tap to override. <button class="chip link" data-hidelegend>Got it</button> '}${h.listingUrl ? 'Imported from a listing' + (h.info && h.info.beds ? ' · ' + h.info.beds + ' bd / ' + h.info.baths + ' ba · ' + (h.info.sqft || '?') + ' sqft' : '') + '.' : ''}</p>`}
    <div class="sec">Purchase</div><section class="card">${field(LB.price, P + 'price', grp(h.price), { pre: '$' })}${field('Down payment', P + 'dp', r(h.dp, 2), { suf: '%' })}${field('Down payment $', P + 'down', grp(v.down), { pre: '$', calc: 1 })}${field('Loan amount', P + 'loan', grp(v.L), { pre: '$', calc: 1, ro: 1 })}${field(LB.growth, P + 'growth', r(v.growth, 2), { suf: '%' })}
      ${type === 'commercial' ? field('Cap rate', P + 'caprate', r(v.capRate, 1), { suf: '%', calc: 1, ro: 1 }) : ''}${type === 'business' ? field('Price ÷ yearly profit', P + 'mult', r(v.multiple, 1), { suf: '×', calc: 1, ro: 1 }) : ''}</section>
    <div class="sec">Loan</div><section class="card">${loanSel}${lo || h.io ? `<p class="note">${lo ? esc(lo.note) + ' ' : ''}${h.io ? 'Interest-only: extra payments reduce the balance. Balloon at maturity is not modeled.' : ''}</p>` : '<p class="note">Custom terms. Pick a loan option to auto-fill them.</p>'}
      ${field('Interest rate', P + 'rate', r(h.rate, 3), { suf: '%' })}${field('Term (years)', P + 'termY', r(h.term / 12, 2))}${field('Closing costs', P + 'closingPct', r(h.closingPct == null ? g.closing : h.closingPct, 2), { suf: '%' })}${field('Extra / month', P + 'extra', grp(v.X), { pre: '$', calc: h.driver === 'months' })}${field('Paid off in (months)', P + 'payoff', isFinite(v.payoff) ? v.payoff : '', { calc: 1 })}${field('Other liens', P + 'liens', grp(h.liens), { pre: '$' })}
      <p class="note">${isFinite(v.payoff) ? `Paid off in ${mo(v.payoff)}. ` : h.io ? 'Not paid off until you refinance or sell. ' : 'Payment does not cover interest. '}Debt now: ${$f(debt)} (${r((debt / h.price) * 100)}% of value).${v.cltvAtLoc != null ? ` When its line of credit opens: ${r(v.cltvAtLoc)}% (cap ${g.cap}%).` : ''}</p>${v.cltvAtLoc != null && v.cltvAtLoc > g.cap + 0.01 ? '<span class="chip warnchip">Over the debt cap</span>' : ''}</section>
    ${colSec('rent', LB.sec, type === 'business' ? 'profit ' + $f(h.rent) : 'rent ' + $f(h.rent) + ' · costs ' + $f(h.tax + h.ins + h.hoa), `<section class="card">${income}</section>`)}
    <div class="sec">Line of credit strategy</div><section class="card"><div class="f"><span class="lb">Funds</span>${targetSel(h)}</div>
      ${t ? `${field('Cash needed', P + 'need', grp(v.D), { pre: '$', calc: 1, ro: 1 })}${field('Months until LOC', P + 'wait', isFinite(v.locM) ? v.locM : '', { calc: h.driver === 'extra' })}
      <div class="f"><span class="lb">Opens (from today)</span><b>${isFinite(p0 + v.locM) ? mm(p0 + v.locM) : 'never'}</b></div>
      ${v.infeasible ? '<p class="note">⚠ That wait is not reachable, even with the loan fully paid.</p>' : ''}${a.cls === 'warn' || a.cls === 'bad' ? `<span class="chip warnchip" title="${esc(a.why || '')}">Debt-to-income ${a.cls === 'bad' ? 'over' : 'near'} your limit when ${esc(t.addr)} closes</span>` : ''}${sooner > 0 ? `<span class="chip">+$100/mo → ${sooner} mo sooner</span>` : ''}` : '<p class="note">Pick the asset this line of credit will fund.</p>'}</section>
    ${colSec('impact', 'Impact on your plan', impactLines.length ? impactLines.length + ' changes' : 'no change', `<section class="card" data-testid="impact">${impactLines.length ? impactLines.join('') : '<p class="note" style="margin:0">Adding or removing this does not change the numbers below.</p>'}<p class="note">Your plan without this asset → with it.</p></section>`)}
    ${ask === 'del:' + h.id ? confirmBox('Remove ' + esc(h.addr) + '? It is also cleared as a funding target.', 'data-del-yes="' + h.id + '"', 'Yes, remove') : `<button class="btn ghost" data-del="${h.id}" data-testid="h-delete">Remove</button>`}`;
  }

  /* ---------- add page: pick a type, then a loan option that auto-fills the terms ---------- */
  function addPage() {
    const tp = E.TYPES[UI.addType] ? UI.addType : 'house', list = E.loansFor(tp), sel = list.find((l) => l.id === UI.addLoan) ? UI.addLoan : list[0].id;
    const blurb = { house: 'A single-family rental or primary home.', commercial: 'Retail, office, storage or industrial. Valued on rent and cap rate.', business: 'An operating business you buy. Valued on owner profit and growth.' }[tp];
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2>Add to portfolio</h2></div>
    <section class="card"><div class="seg" role="tablist">${['house', 'commercial', 'business'].map((x) => `<button data-addtype="${x}" class="${x === tp ? 'on' : ''}">${TL[x]}</button>`).join('')}</div><p class="note">${blurb}</p></section>
    <div class="sec">Loan option</div><section class="card" data-testid="loan-options">${list.map((l) => `<button class="loanopt ${l.id === sel ? 'on' : ''}" data-pickloan="${l.id}" aria-pressed="${l.id === sel}"><b>${esc(l.name)}</b><span>${l.dp}% down · ${l.rate}% · ${l.io ? 'interest-only, ' : ''}${r(l.term / 12, 1)} yr</span><small>${esc(l.note)}</small></button>`).join('')}</section>
    <button class="btn" style="width:100%" data-confirm-add="${tp}|${sel}" data-testid="confirm-add">Add ${TL[tp].toLowerCase()}</button>
    ${tp === 'house' ? '<button class="linkbtn" data-go="import/new">Or import a home from a listing file</button>' : ''}`;
  }

  /* ---------- settings ---------- */
  function settings() {
    const g = S.g, F = (l, k, o) => field(l, 'g.' + k, o && o.pre === '$' ? grp(g[k]) : g[k], o);
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2>Assumptions</h2></div>
    <div class="sec">Borrowing</div><section class="card">${F('Max debt on a house (cap)', 'cap', { suf: '%' })}${F('Lender appraisal haircut', 'haircut', { suf: '%' })}${F('Closing costs (of price)', 'closing', { suf: '%' })}${F('Line of credit rate', 'hrate', { suf: '%' })}</section>
    <div class="sec">Co-signers &amp; qualifying</div><section class="card">${F('Parent 1 income / yr', 'p1', { pre: '$' })}${F('Parent 2 income / yr', 'p2', { pre: '$' })}${F('Debt-to-income limit', 'dti', { suf: '%' })}${F('Rent counted as income', 'rentCount', { suf: '%' })}${F('Other monthly debts', 'otherDebt', { pre: '$' })}</section>
    <div class="sec">Operating costs</div><section class="card">${F('Vacancy', 'vac', { suf: '%' })}${F('Management (of rent)', 'mgmt', { suf: '%' })}${F('Repairs reserve (of value / yr)', 'maint', { suf: '%' })}${F('Default growth / yr', 'appr', { suf: '%' })}${F('Plan horizon (years)', 'planYears', {})}</section>
    <div class="sec">Data — stays on this device</div><section class="card">
      ${notice ? `<div class="warnbox">${esc(notice)}</div>` : ''}
      <button class="btn" data-export data-testid="export">${exportOpen ? 'Hide backup' : 'Show backup to copy'}</button>
      ${exportOpen ? `<textarea readonly rows="5" id="bkout" aria-label="Backup data" data-testid="backup-text">${esc(JSON.stringify(S))}</textarea><button class="btn plain" data-copybackup>Copy backup</button><p class="note" id="cbm">Save this text somewhere safe, such as a note or file. Paste it below to restore.</p>` : ''}
      <label class="btn plain filebtn">Restore from backup file<input type="file" accept="application/json,.json,text/plain" hidden id="imp" aria-label="Choose backup file" data-testid="import-file"></label>
      <textarea rows="2" id="bkin" aria-label="Or paste backup text" placeholder="…or paste backup text here"></textarea><button class="btn plain" data-restore-text>Restore from pasted text</button>
      ${pendingImport ? confirmBox('Replace all current data with this backup?', 'data-import-yes', 'Yes, replace') : ''}
      ${ask === 'reset' ? confirmBox('Reset to the sample houses? This replaces your current houses.', 'data-reset-yes', 'Yes, reset') : '<button class="btn plain" data-reset>Reset to sample data</button>'}
      <p class="note">${(() => { try { const t = localStorage.getItem('rep-v4-backup'); return t ? 'Backup last shown: ' + new Date(+t).toLocaleDateString() : 'No backup yet. Copy one regularly.'; } catch (e) { return ''; } })()}</p></section>`;
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
    const preview = !res ? '' : res.ok ? `<section class="card" data-testid="import-preview"><b>Preview</b><table class="cmp">${res.rows.map((x) => `<tr><td>${x[0]}</td><td>${esc(x[1])}</td><td>${badge(x[2])}</td></tr>`).join('')}</table>
      ${res.rows.some((x) => x[2] === 'missing') ? '<p class="note">Missing values keep their defaults. You can edit everything afterward.</p>' : ''}${res.rows.some((x) => x[2] === 'estimate') ? '<p class="note">“estimate” means the listing page showed an estimate, not a fact. Double-check these.</p>' : ''}
      <button class="btn" style="width:100%;margin-top:8px" data-apply-listing="${id}" data-testid="import-apply">${target ? 'Fill this house' : 'Add to portfolio'}</button></section>` : `<div class="warnbox" data-testid="import-error">⚠ ${esc(res.error)}</div>`;
    return `<div class="top"><button class="ic" data-go="${target ? 'h/' + id : ''}" aria-label="Back">‹</button><h2>Import from listing</h2></div>${preview}
    <section class="card"><ol class="steps"><li>Copy the prompt.</li><li>Paste it into a Claude chat with your Zillow link. If Claude cannot open the page, paste the listing text or screenshots instead.</li><li>Save Claude's reply as a <code>.json</code> file and choose it below.</li></ol>
      <button class="btn plain" data-copyprompt data-testid="copy-prompt">Copy Claude prompt</button><p class="note" id="cpm"></p>
      <details><summary class="note">Show the prompt</summary><pre class="pre">${esc(PROMPT)}</pre></details>
      <label class="btn filebtn" style="margin-top:8px">Choose listing file<input type="file" accept=".json,application/json,text/plain" hidden data-listing-file data-testid="import-listing-file" aria-label="Choose listing file"></label>
      <button class="linkbtn" data-togglepaste>${UI.paste ? 'Hide pasted text' : 'Or paste the file contents'}</button>
      ${UI.paste ? `<textarea data-listing-text id="lt" rows="4" aria-label="Paste the listing file contents" placeholder="Paste the JSON Claude gave you"></textarea><button class="btn plain" data-read-listing>Read pasted text</button>` : ''}</section>`;
  }
  function readListing(text) {
    let o = null; try { o = JSON.parse(text); } catch (e) { o = null; }
    imp = { res: o === null ? { ok: false, error: 'That text is not valid JSON.' } : E.fromListing(o) }; render();
  }
  function applyListing(id) {
    if (!imp || !imp.res || !imp.res.ok) return;
    const x = imp.res, extra = { listingUrl: x.url || '', info: x.info || {}, fresh: false };
    let h = id === 'new' ? null : H(id);
    if (h) Object.assign(h, x.patch, extra); else { h = E.newHouse(Object.assign({}, x.patch, extra)); S.houses.push(h); }
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
    const app = document.getElementById('app');
    app.innerHTML = route === 'add' ? addPage() : route.startsWith('import/') ? importPage(route.slice(7)) : route === 'settings' ? settings() : route.startsWith('h/') && H(route.slice(2)) ? house(H(route.slice(2))) : main();
    if (id) { const el = app.querySelector(`[data-p="${id}"],[data-sel="${id}"]`); if (el) { el.focus(); if (a.dataset.p && !el.readOnly && document.hasFocus()) { el.value = typed; try { el.setSelectionRange(pos, pos); } catch (e) {} } } }
    const cur = {};
    app.querySelectorAll('[data-k]').forEach((el) => { const k = el.dataset.k, v = el.tagName === 'INPUT' ? el.value : el.textContent; cur[k] = v;
      if (k in prev && prev[k] !== v && el !== document.activeElement) (el.closest('label,.kpi,tr') || el).classList.add('flash'); });
    prev = cur;
  }
  window.addEventListener('hashchange', () => { prev = {}; ask = null; pendingImport = null; exportOpen = false; notice = ''; window.scrollTo(0, 0); render(); });

  /* ---------- editing: every field is an input; derived fields back-solve ---------- */
  function setField(p, s) {
    const [t, x, k] = p.split('.');
    if (k === 'addr') { H(x).addr = s; return true; }
    const n = parseFloat(String(s).replace(/,/g, '').replace(/[^0-9.\-eE+]/g, '')); if (isNaN(n)) return false;
    if (t === 'g') { S.g[x] = n; return true; }
    const h = H(x), v = E.view(S, h); h.fresh = false;
    if (k === 'extra') { h.extra = Math.max(0, n); h.driver = 'extra'; }
    else if (k === 'wait') { h.wait = Math.max(0, Math.round(n)); h.driver = 'months'; }
    else if (k === 'down') { h.dp = Math.min(100, Math.max(0, (n / h.price) * 100)); }
    else if (k === 'dp') { h.dp = Math.min(100, Math.max(0, n)); }
    else if (k === 'termY') { h.term = Math.max(12, Math.round(n * 12)); }
    else if (k === 'payoff') { const B0 = E.balToday(h), i = h.rate / 1200, m = Math.max(1, Math.round(n)); h.extra = Math.max(0, E.pmt(B0, i, m) - v.P); h.driver = 'extra'; }
    else if (k === 'price') { h.price = Math.max(0, n); }
    else if (k === 'rate') { h.rate = Math.min(30, Math.max(0, n)); }
    else if (k === 'loan' || k === 'need' || k === 'caprate' || k === 'mult') return false;
    else if (k === 'growth') h.growth = Math.min(100, Math.max(-50, n));
    else if (k === 'closingPct') h.closingPct = Math.min(20, Math.max(0, n));
    else h[k] = Math.max(0, n);
    if (['dp', 'down', 'rate', 'termY'].indexOf(k) >= 0) h.loanId = 'custom';
    return true;
  }
  const app = document.getElementById('app');
  app.addEventListener('input', (e) => { const p = e.target.dataset.p; if (p && setField(p, e.target.value)) { save(); render(); } });
  app.addEventListener('pointermove', nwHover); app.addEventListener('pointerdown', nwHover);
  app.addEventListener('pointerleave', nwLeave, true); app.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') return; });
  app.addEventListener('focusout', (e) => { if (e.target.dataset && e.target.dataset.p && e.target.tagName === 'INPUT' && !e.relatedTarget) setTimeout(() => { const a = document.activeElement; if (!(a && a.dataset && (a.dataset.p || a.dataset.sel))) render(); }, 0); });
  app.addEventListener('change', (e) => {
    const ln = e.target.dataset.loan; if (ln) { const h = H(ln); if (e.target.value === 'custom') h.loanId = 'custom'; else E.applyLoan(h, e.target.value); save(); render(); return; }
    const sel = e.target.dataset.sel; if (sel) { H(sel).target = e.target.value; save(); render(); return; }
    if (e.target.dataset.listingFile !== undefined && e.target.files[0]) { const rd = new FileReader(); rd.onload = () => readListing(String(rd.result)); rd.readAsText(e.target.files[0]); return; }
    if (e.target.id === 'imp' && e.target.files[0]) { const rd = new FileReader(); rd.onload = () => stageBackup(String(rd.result)); rd.readAsText(e.target.files[0]); } });
  app.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('input,select,textarea,label.filebtn')) return;
    if (t.dataset.copyprompt !== undefined) { const m = document.getElementById('cpm'); try { navigator.clipboard.writeText(PROMPT).then(() => { m.textContent = 'Copied. Paste it into a Claude chat.'; }, () => { m.textContent = 'Could not copy — open “Show the prompt” and copy it by hand.'; }); } catch (x) { m.textContent = 'Could not copy — open “Show the prompt” and copy it by hand.'; } return; }
    if (t.dataset.readListing !== undefined) { const ta = document.querySelector('[data-listing-text]'); readListing(ta ? ta.value : ''); return; }
    if (t.dataset.applyListing) { applyListing(t.dataset.applyListing); return; }
    if (t.dataset.tab) { if (t.dataset.tab === 'hide') UI.open = false; else { UI.open = true; UI.tab = t.dataset.tab; } save(); render(); return; }
    if (t.dataset.add !== undefined) { goto('add'); return; }
    const at = t.closest('[data-addtype]'); if (at) { UI.addType = at.dataset.addtype; UI.addLoan = ''; render(); return; }
    const pk = t.closest('[data-pickloan]'); if (pk) { UI.addLoan = pk.dataset.pickloan; render(); return; }
    if (t.dataset.confirmAdd) { const [tp, lid] = t.dataset.confirmAdd.split('|'); const h = E.newAsset(tp, lid, { fresh: true }); S.houses.push(h); save(); goto('h/' + h.id); return; }
    if (t.dataset.del) { ask = 'del:' + t.dataset.del; render(); return; }
    if (t.dataset.delYes) { S = E.without(S, t.dataset.delYes); ask = null; save(); goto(''); render(); return; }
    if (t.dataset.askCancel !== undefined) { ask = null; pendingImport = null; render(); return; }
    if (t.dataset.hidelegend !== undefined) { UI.hideLegend = true; save(); render(); return; }
    if (t.dataset.togglepaste !== undefined) { UI.paste = !UI.paste; render(); return; }
    const cs = t.closest('[data-coll]'); if (cs) { UI.coll[cs.dataset.coll] = !UI.coll[cs.dataset.coll]; save(); render(); return; }
    if (t.dataset.status) { const h = H(routeOf().slice(2)); h.status = t.dataset.status; save(); render(); return; }
    if (t.dataset.export !== undefined) { exportOpen = !exportOpen; if (exportOpen) { try { localStorage.setItem('rep-v4-backup', String(Date.now())); } catch (x) {} } render(); return; }
    if (t.dataset.copybackup !== undefined) { const m = document.getElementById('cbm'), ta = document.getElementById('bkout'); const fail = () => { ta.focus(); ta.select(); m.textContent = 'Select the text above and copy it by hand.'; };
      try { navigator.clipboard.writeText(ta.value).then(() => { m.textContent = 'Copied.'; }, fail); } catch (x) { fail(); } return; }
    if (t.dataset.restoreText !== undefined) { const ta = document.getElementById('bkin'); stageBackup(ta ? ta.value : ''); return; }
    if (t.dataset.importYes !== undefined) { S = E.normalize(pendingImport); S.v = DATA_V; pendingImport = null; notice = ''; save(); goto(''); render(); return; }
    if (t.dataset.reset !== undefined) { ask = 'reset'; render(); return; }
    if (t.dataset.resetYes !== undefined) { S = E.seed(); S.v = DATA_V; ask = null; save(); render(); return; }
    const go = t.closest('[data-go]'); if (go) goto(go.dataset.go);
  });
  render();
  /* local-first plumbing: ask the browser to keep our data, and cache the app for offline use */
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  /*SW*/if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});/*ENDSW*/
  window.__app = { get state() { return S; } };
})();
