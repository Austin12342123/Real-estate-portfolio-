/* Portfolio app v3 — UI layer. All math lives in engine.js. Data never leaves the device (localStorage; IndexedDB in the final build). */
(function () {
  const E = window.Engine, KEY = 'rep-v3', UIKEY = 'rep-v3-ui';
  let S, UI = { tab: 'timeline', open: false };
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !Array.isArray(S.houses) || !S.g) S = E.seed();
  S.g = Object.assign({}, E.GDEF, S.g);
  try { UI = Object.assign(UI, JSON.parse(localStorage.getItem(UIKEY)) || {}); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(UIKEY, JSON.stringify(UI)); } catch (e) {} };
  const H = (id) => E.H(S, id);

  /* ---------- formatting ---------- */
  const num = (n) => (isFinite(n) ? n : 0);
  const $f = (n) => (n < -0.5 ? '−' : '') + '$' + Math.round(Math.abs(num(n))).toLocaleString('en-US');
  const $s = (n) => (n < -0.5 ? '−' : '+') + '$' + Math.round(Math.abs(num(n))).toLocaleString('en-US');
  const grp = (n) => Math.round(num(n)).toLocaleString('en-US');
  const mo = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m < 24 ? m + ' mo' : Math.floor(m / 12) + 'y ' + (m % 12) + 'm');
  const r = (n, d = 0) => (isFinite(n) ? String(+n.toFixed(d)) : '—');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- reusable bits ---------- */
  const field = (label, p, val, o = {}) => `<label class="f ${o.calc ? 'calc' : ''}"><span class="lb">${label}${o.calc ? ' <i title="calculated — tap to override">~</i>' : ''}</span><span class="iw">${o.pre ? `<em>${o.pre}</em>` : ''}<input inputmode="decimal" data-p="${p}" data-k="${p}" aria-label="${esc(label)}" ${o.ro ? 'readonly tabindex="-1"' : ''} value="${val}">${o.suf ? `<em>${o.suf}</em>` : ''}</span></label>`;
  const targetSel = (h) => `<select data-sel="${h.id}" aria-label="Line of credit on ${esc(h.addr)} funds">${'<option value="">Choose target…</option>' + S.houses.filter((x) => x.id !== h.id).map((x) => `<option value="${x.id}" ${h.target === x.id ? 'selected' : ''}>→ ${esc(x.addr)}</option>`).join('')}</select>`;
  const kpi = (id, label, val, sub, cls) => `<div class="kpi"><small>${label}</small><b class="${cls || ''}" data-testid="${id}" data-k="${id}">${val}</b>${sub ? `<span class="sub">${sub}</span>` : ''}</div>`;

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
      <div class="tm">${x.ok ? `${x.start ? `starts ${mo(x.start)} · ` : ''}LOC ready <b>${mo(x.end)}</b>${x.funds ? '' : ' (not used — target bought sooner)'}` : startOk ? 'the debt cap leaves no room' : 'waiting on an earlier house'}</div></div>`; }).join('');
    return `<div class="tlw" data-testid="timeline">${rows}</div><p class="note">Bar = paying down until the line of credit opens · ● = buy the next house. Tap a row to edit.</p>`;
  }
  function nwChart(pl) {
    const T = Math.max(12, Math.min(pl.T, pl.lastBuy + 60)), s = pl.series.nw.slice(0, T + 1);
    const W = 340, Hh = 150, pad = 6, min = Math.min(0, ...s), max = Math.max(1, ...s);
    const x = (t) => pad + (t / T) * (W - 2 * pad), y = (v) => Hh - 22 - ((v - min) / (max - min || 1)) * (Hh - 40);
    const step = Math.max(1, Math.ceil(T / 160)); let d = '';
    for (let t = 0; t <= T; t += step) d += (d ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(s[t]).toFixed(1);
    d += 'L' + x(T).toFixed(1) + ' ' + y(s[T]).toFixed(1);
    const ys = T <= 60 ? 1 : T <= 120 ? 2 : T <= 240 ? 5 : 10; let ticks = '';
    for (let yr = 0; yr * 12 <= T; yr += ys) ticks += `<text x="${x(yr * 12)}" y="${Hh - 6}" text-anchor="middle">${yr ? yr + 'y' : 'Now'}</text>`;
    const buys = S.houses.filter((h) => isFinite(pl.purchase[h.id]) && pl.purchase[h.id] > 0 && pl.purchase[h.id] <= T).map((h) => `<circle cx="${x(pl.purchase[h.id])}" cy="${y(s[pl.purchase[h.id]])}" r="4.5"><title>${esc(h.addr)} bought ${mo(pl.purchase[h.id])}</title></circle>`).join('');
    return `<svg class="nw" data-testid="networth-chart" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Net worth over time, ${$f(s[0])} now to ${$f(s[T])} in ${mo(T)}"><line class="ax" x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}"/><path class="ar" d="${d}L${x(T)} ${y(0)}L${x(0)} ${y(0)}Z"/><path class="ln" d="${d}"/>${buys}${ticks}<text x="${pad}" y="12">${$f(max)}</text></svg><p class="note">Net worth = value − loans − other liens − lines of credit drawn. ● = a house is bought.</p>`;
  }

  /* ---------- main page ---------- */
  function main() {
    const pl = E.plan(S), t0 = pl.today, tf = pl.final, g = S.g, owned = S.houses.filter((h) => h.status === 'owned');
    if (!S.houses.length) return `<h1>Portfolio <button class="ic" data-go="settings" aria-label="Settings">⚙</button></h1><div class="card empty"><p><b>No houses yet</b></p><p>Add your first house to see your plan.</p></div><div class="bottom"><div><span></span><button class="btn" data-add data-testid="add-house">+ House</button></div></div>`;
    const tot = S.houses.reduce((s, h) => s + E.view(S, h).X, 0);
    const n = S.houses.length, sched = n - pl.unfunded.length;
    const rows = S.houses.map((h) => {
      const v = pl.V[h.id], a = E.afford(S, h, pl), t = H(h.target), p = pl.purchase[h.id];
      const tag = h.status === 'owned' ? 'owned' : isFinite(p) ? 'buy ' + mo(p) : 'unfunded';
      const loc = !t ? 'No line of credit yet' : `LOC ${isFinite(p + v.locM) ? 'opens ' + mo(p + v.locM) : 'not reachable'}`;
      return `<div class="row" data-go="h/${h.id}" data-testid="ledger-row"><div class="r1"><span><span class="addr">${esc(h.addr)}</span><span class="tag">${tag}</span><div class="pay" data-testid="row-payment" data-k="pay-${h.id}">${$f(v.payment)}/mo ${h.status === 'planned' ? 'when bought' : 'total'}</div></span>
        <span class="ex ${h.driver === 'months' ? 'calc' : ''}">Extra<span class="iw"><em>$</em><input inputmode="decimal" data-testid="extra-input" data-p="h.${h.id}.extra" data-k="x-${h.id}" aria-label="Extra monthly payment for ${esc(h.addr)}" value="${grp(v.X)}"></span></span></div>
        <div class="r2"><span data-testid="loc-line">${loc} ${targetSel(h)}</span><span class="st ${a.cls}" data-testid="afford-status">${a.cls === 'na' ? '' : a.txt}</span></div></div>`; }).join('');
    const cmp = (label, a, b, f, cls) => `<tr><td>${label}</td><td data-k="c-${label}-a">${f(a)}</td><td class="${cls || ''}" data-k="c-${label}-b"><b>${f(b)}</b></td></tr>`;
    const warn = pl.unfunded.length ? `<div class="warnbox">⚠ ${pl.unfunded.length} planned house${pl.unfunded.length > 1 ? 's are' : ' is'} never funded under the current numbers.</div>` : '';
    const health = pl.worst.dti > g.dti ? `<div class="warnbox">⚠ Debt-to-income peaks at ${r(pl.worst.dti)}% in ${mo(pl.worst.month)} (limit ${g.dti}%).</div>` : '';
    const tab = UI.tab;
    return `<h1>Portfolio <button class="ic" data-go="settings" aria-label="Settings" data-testid="settings-link">⚙</button></h1>
    <section class="card" data-testid="summary"><div class="kg">
      ${kpi('kpi-networth', 'Net worth', $f(t0.nw), `${owned.length} owned · ${$f(t0.value)} value`)}
      ${kpi('kpi-monthly', 'Total monthly payments', $f(t0.monthly), `incl. ${$f(t0.extra)} extra`)}
      ${kpi('kpi-cashflow', 'Cash flow / mo', $s(t0.cf), `${$s(t0.cfx)} after extra`, t0.cf < 0 ? 'bad' : '')}
      ${kpi('kpi-dscr', 'DSCR', r(t0.dscr, 2), t0.dscr >= 1.2 ? 'healthy' : t0.dscr >= 1 ? 'thin' : 'below 1.0', t0.dscr && t0.dscr < 1 ? 'bad' : '')}</div>
      <div class="bar"><i class="${t0.cltv > g.cap ? 'over' : ''}" style="width:${Math.min(100, (t0.cltv / g.cap) * 100)}%"></i></div>
      <div class="cap"><span data-k="cltv">Debt ${r(t0.cltv)}% of value</span><span>cap ${g.cap}%</span></div></section>
    <div class="sec">Extra monthly payments &amp; line of credit</div><section class="card" id="ledger" data-testid="ledger">${rows}</section>
    <section class="card" data-testid="plan-card"><b>Plan</b> <span class="note">${sched} of ${n} houses by ${mo(pl.lastBuy)}</span>
      <table class="cmp"><thead><tr><th></th><th>Today</th><th>Plan complete</th></tr></thead><tbody>
      ${cmp('Net worth', t0.nw, tf.nw, $f)}${cmp('Monthly payments', t0.monthly, tf.monthly, $f)}${cmp('Cash flow / mo', t0.cf, tf.cf, $s, tf.cf < 0 ? 'bad' : '')}${cmp('Debt', t0.debt, tf.debt, $f)}${cmp('Houses', t0.count, tf.count, (x) => x)}</tbody></table>
      ${warn}${health}
      <div class="seg" role="tablist"><button data-tab="timeline" class="${tab === 'timeline' && UI.open ? 'on' : ''}" data-testid="timeline-toggle">Timeline</button><button data-tab="nw" class="${tab === 'nw' && UI.open ? 'on' : ''}" data-testid="networth-toggle">Net worth</button><button data-tab="hide" class="${!UI.open ? 'on' : ''}">Hide</button></div>
      ${UI.open ? (tab === 'nw' ? nwChart(pl) : timeline(pl)) : ''}</section>
    <div class="bottom"><div><span>Total extra / mo <b data-testid="total-extra" data-k="tot">${$f(tot)}</b></span><button class="btn" data-add data-testid="add-house">+ House</button></div></div>`;
  }

  /* ---------- house page ---------- */
  function house(h) {
    const pl = E.plan(S), v = pl.V[h.id], g = S.g, a = E.afford(S, h, pl), t = H(h.target), P = `h.${h.id}.`;
    const wo = E.plan(E.without(S, h.id)), p0 = pl.purchase[h.id];
    const sooner = t && isFinite(v.locM) ? v.locM - E.locMonths(S, h, v.X + 100) : 0;
    const src = S.houses.filter((x) => x.target === h.id);
    const heloc = pl.funds[h.id] ? v.D : 0;
    const debt = v.debtNow, capPct = (debt / h.price) * 100;
    const timing = h.status === 'planned'
      ? (src.length ? `<p class="note">Bought when ${src.map((x) => esc(x.addr)).join(' or ')}'s line of credit opens — ${isFinite(p0) ? mo(p0) + ' from now' : 'not reachable'}.</p>` : field('Buy in (months)', P + 'buyIn', h.buyIn))
      : field('Months already paid', P + 'paid', h.paid);
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2><input class="t" data-p="${P}addr" type="text" value="${esc(h.addr)}" aria-label="Address"></h2></div>
    <section class="card"><div class="kg">${kpi('h-payment', 'Monthly payment', $f(v.payment), `P&amp;I ${$f(v.P)} + extra ${$f(v.X)} + escrow ${$f(v.escrow)}`)}${kpi('h-cf', 'Cash flow / mo', $s(v.cf), `${$s(v.cf - v.X)} after extra`, v.cf < 0 ? 'bad' : '')}</div>
      <div class="seg"><button class="${h.status === 'owned' ? 'on' : ''}" data-status="owned">Owned</button><button class="${h.status === 'planned' ? 'on' : ''}" data-status="planned">Planned</button></div>${timing}</section>
    <div class="sec">Purchase</div><section class="card">${field('Price', P + 'price', grp(h.price), { pre: '$' })}${field('Down payment', P + 'dp', r(h.dp, 2), { suf: '%' })}${field('Down payment $', P + 'down', grp(v.down), { pre: '$', calc: 1 })}${field('Loan amount', P + 'loan', grp(v.L), { pre: '$', calc: 1, ro: 1 })}</section>
    <div class="sec">Loan</div><section class="card">${field('Interest rate', P + 'rate', r(h.rate, 3), { suf: '%' })}${field('Term (years)', P + 'termY', h.term / 12)}${field('Extra / month', P + 'extra', grp(v.X), { pre: '$', calc: h.driver === 'months' })}${field('Paid off in (months)', P + 'payoff', isFinite(v.payoff) ? v.payoff : '', { calc: 1 })}${field('Other liens on this house', P + 'liens', grp(h.liens), { pre: '$' })}
      <p class="note">${isFinite(v.payoff) ? `Paid off in ${mo(v.payoff)}. ` : 'Payment does not cover interest. '}Debt on this house: ${$f(debt)}${heloc ? ' + ' + $f(heloc) + ' line of credit' : ''} = ${r(((debt + heloc) / h.price) * 100)}% of value (cap ${g.cap}%).</p></section>
    <div class="sec">Rent &amp; expenses</div><section class="card">${field('Monthly rent', P + 'rent', grp(h.rent), { pre: '$' })}${field('Property tax / mo', P + 'tax', grp(h.tax), { pre: '$' })}${field('Insurance / mo', P + 'ins', grp(h.ins), { pre: '$' })}${field('HOA / mo', P + 'hoa', grp(h.hoa), { pre: '$' })}
      <button class="chip link" data-go="settings">Vacancy ${g.vac}%</button><button class="chip link" data-go="settings">Mgmt ${g.mgmt}%</button><button class="chip link" data-go="settings">Repairs ${g.maint}%/yr</button>
      <p class="note">Net operating income ${$f(v.noi)}/mo · after P&amp;I ${$s(v.cf)}/mo</p></section>
    <div class="sec">Line of credit strategy</div><section class="card"><div class="f"><span class="lb">Funds</span>${targetSel(h)}</div>
      ${t ? `${field('Cash needed', P + 'need', grp(v.D), { pre: '$', calc: 1, ro: 1 })}${field('Months until LOC', P + 'wait', isFinite(v.locM) ? v.locM : '', { calc: h.driver === 'extra' })}
      <div class="f"><span class="lb">Opens (from today)</span><b>${isFinite(p0 + v.locM) ? mo(p0 + v.locM) : 'never'}</b></div>
      <div class="f"><span class="lb">Status</span><b class="st ${a.cls}">${a.txt}</b></div>
      <p class="note">${v.infeasible ? '⚠ That wait is not reachable, even with the loan fully paid. ' : ''}${esc(a.why || '')}</p>${sooner > 0 ? `<span class="chip">+$100/mo → ${sooner} mo sooner</span>` : ''}` : '<p class="note">Pick the house this line of credit will fund.</p>'}</section>
    <div class="sec">Impact on your plan</div><section class="card" data-testid="impact">
      <div class="f"><span class="lb">Net worth today</span><span>${$f(wo.today.nw)} → <b>${$f(pl.today.nw)}</b></span></div>
      <div class="f"><span class="lb">Net worth, plan complete</span><span>${$f(wo.final.nw)} → <b>${$f(pl.final.nw)}</b></span></div>
      <div class="f"><span class="lb">Monthly payments, plan complete</span><span>${$f(wo.final.monthly)} → <b>${$f(pl.final.monthly)}</b></span></div>
      <div class="f"><span class="lb">Cash flow today</span><span>${$s(wo.today.cf)} → <b>${$s(pl.today.cf)}</b></span></div>
      <p class="note">Your plan without this house → with it.</p></section>
    <button class="btn ghost" data-del="${h.id}" data-testid="h-delete">Remove house</button>`;
  }

  /* ---------- settings ---------- */
  function settings() {
    const g = S.g, F = (l, k, o) => field(l, 'g.' + k, o && o.pre === '$' ? grp(g[k]) : g[k], o);
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2>Assumptions</h2></div>
    <div class="sec">Borrowing</div><section class="card">${F('Max debt on a house (cap)', 'cap', { suf: '%' })}${F('Lender appraisal haircut', 'haircut', { suf: '%' })}${F('Closing costs (of price)', 'closing', { suf: '%' })}${F('Line of credit rate', 'hrate', { suf: '%' })}</section>
    <div class="sec">Co-signers &amp; qualifying</div><section class="card">${F('Parent 1 income / yr', 'p1', { pre: '$' })}${F('Parent 2 income / yr', 'p2', { pre: '$' })}${F('Debt-to-income limit', 'dti', { suf: '%' })}${F('Rent counted as income', 'rentCount', { suf: '%' })}${F('Other monthly debts', 'otherDebt', { pre: '$' })}</section>
    <div class="sec">Operating costs</div><section class="card">${F('Vacancy', 'vac', { suf: '%' })}${F('Management (of rent)', 'mgmt', { suf: '%' })}${F('Repairs reserve (of value / yr)', 'maint', { suf: '%' })}${F('Appreciation / yr', 'appr', { suf: '%' })}</section>
    <div class="sec">Data — stays on this device</div><section class="card"><button class="btn" data-export data-testid="export">Export backup (JSON)</button><button class="btn plain" data-import data-testid="import">Import backup…</button><input type="file" accept="application/json,.json" hidden id="imp" data-testid="import-file"><button class="btn plain" data-reset>Reset to sample data</button><p class="note" id="bk">${(() => { try { const t = localStorage.getItem('rep-v3-backup'); return t ? 'Last backup: ' + new Date(+t).toLocaleDateString() : 'No backup yet — export one regularly.'; } catch (e) { return ''; } })()}</p></section>`;
  }

  /* ---------- router + render ---------- */
  let prev = {};
  function render() {
    const route = location.hash.slice(2), a = document.activeElement, id = a && a.dataset && (a.dataset.p || a.dataset.sel), typed = a && a.value, pos = a && a.selectionStart;
    const app = document.getElementById('app');
    app.innerHTML = route === 'settings' ? settings() : route.startsWith('h/') && H(route.slice(2)) ? house(H(route.slice(2))) : main();
    if (id) { const el = app.querySelector(`[data-p="${id}"],[data-sel="${id}"]`); if (el) { el.focus(); if (a.dataset.p && !el.readOnly && document.hasFocus()) { el.value = typed; try { el.setSelectionRange(pos, pos); } catch (e) {} } } }
    const cur = {};
    app.querySelectorAll('[data-k]').forEach((el) => { const k = el.dataset.k, v = el.tagName === 'INPUT' ? el.value : el.textContent; cur[k] = v;
      if (k in prev && prev[k] !== v && el !== document.activeElement) (el.closest('label,.kpi,tr') || el).classList.add('flash'); });
    prev = cur;
  }
  window.addEventListener('hashchange', () => { prev = {}; window.scrollTo(0, 0); render(); });

  /* ---------- editing: every field is an input; derived fields back-solve ---------- */
  function setField(p, s) {
    const [t, x, k] = p.split('.');
    if (k === 'addr') { H(x).addr = s; return true; }
    const n = parseFloat(String(s).replace(/[^0-9.\-]/g, '')); if (isNaN(n)) return false;
    if (t === 'g') { S.g[x] = n; return true; }
    const h = H(x), v = E.view(S, h);
    if (k === 'extra') { h.extra = Math.max(0, n); h.driver = 'extra'; }
    else if (k === 'wait') { h.wait = Math.max(0, Math.round(n)); h.driver = 'months'; }
    else if (k === 'down') { h.dp = Math.min(100, Math.max(0, (n / h.price) * 100)); }
    else if (k === 'dp') { h.dp = Math.min(100, Math.max(0, n)); }
    else if (k === 'termY') { h.term = Math.max(12, Math.round(n * 12)); }
    else if (k === 'payoff') { const B0 = E.balToday(h), i = h.rate / 1200, m = Math.max(1, Math.round(n)); h.extra = Math.max(0, E.pmt(B0, i, m) - v.P); h.driver = 'extra'; }
    else if (k === 'price') { h.price = Math.max(0, n); }
    else if (k === 'rate') { h.rate = Math.min(30, Math.max(0, n)); }
    else if (k === 'loan' || k === 'need') return false;
    else h[k] = Math.max(0, n);
    return true;
  }
  const app = document.getElementById('app');
  app.addEventListener('input', (e) => { const p = e.target.dataset.p; if (p && setField(p, e.target.value)) { save(); render(); } });
  app.addEventListener('focusout', (e) => { if (e.target.dataset && e.target.dataset.p && e.target.tagName === 'INPUT' && !e.relatedTarget) setTimeout(render, 0); });
  app.addEventListener('change', (e) => {
    const sel = e.target.dataset.sel; if (sel) { H(sel).target = e.target.value; save(); render(); return; }
    if (e.target.id === 'imp' && e.target.files[0]) { const f = e.target.files[0], rd = new FileReader();
      rd.onload = () => { try { const d = JSON.parse(rd.result); if (!d.houses || !d.g) throw 0; if (confirm('Replace all current data with this backup?')) { S = d; S.g = Object.assign({}, E.GDEF, S.g); save(); location.hash = '#/'; render(); } } catch (x) { alert('That file is not a valid backup.'); } };
      rd.readAsText(f); } });
  app.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('input,select')) return;
    if (t.dataset.tab) { if (t.dataset.tab === 'hide') UI.open = false; else { UI.open = true; UI.tab = t.dataset.tab; } save(); render(); return; }
    if (t.dataset.add !== undefined) { const h = E.newHouse(); S.houses.push(h); save(); location.hash = '#/h/' + h.id; return; }
    if (t.dataset.del) { if (confirm('Remove this house from your portfolio?')) { S = E.without(S, t.dataset.del); save(); location.hash = '#/'; render(); } return; }
    if (t.dataset.status) { const h = H(location.hash.slice(4)); h.status = t.dataset.status; save(); render(); return; }
    if (t.dataset.export !== undefined) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })); a.download = 'portfolio-backup.json'; a.click();
      try { localStorage.setItem('rep-v3-backup', String(Date.now())); } catch (x) {} render(); return; }
    if (t.dataset.import !== undefined) { document.getElementById('imp').click(); return; }
    if (t.dataset.reset !== undefined) { if (confirm('Reset to sample data? This replaces your houses.')) { S = E.seed(); save(); render(); } return; }
    const go = t.closest('[data-go]'); if (go) location.hash = '#/' + go.dataset.go;
  });
  render();
  /* local-first plumbing: ask the browser to keep our data, and cache the app for offline use */
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__app = { get state() { return S; } };
})();
